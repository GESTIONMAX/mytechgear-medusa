#!/usr/bin/env tsx
/**
 * Analyze Current State - Direct Database Access
 *
 * READ-ONLY script that queries PostgreSQL directly
 * to analyze products without API authentication.
 *
 * Usage: npx tsx scripts/migrations/product-refactor-v2/02-analyze-current-state-db.ts
 *
 * Output: JSON report of current state and required changes
 */

import { config } from "dotenv"
import { writeFileSync } from "fs"
import { join } from "path"
import pg from "pg"

const { Client } = pg

// ─── Configuration ───────────────────────────────────────────────────────────

config({ path: ".env" })

const ANALYSIS_REPORT_DIR = "./backups"
const TIMESTAMP = new Date().toISOString().replace(/[:.]/g, "-").slice(0, -5)
const REPORT_FILE = join(ANALYSIS_REPORT_DIR, `analysis-${TIMESTAMP}.json`)
const REPORT_MD_FILE = join(ANALYSIS_REPORT_DIR, `analysis-${TIMESTAMP}.md`)

// Products to analyze
const TARGET_HANDLES = ["music-shield", "shield"]

// Database configuration
const DATABASE_URL = process.env.DATABASE_URL

if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL not found in .env file")
  process.exit(1)
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface ProductAnalysis {
  handle: string
  title: string
  id: string
  status: "exists" | "missing" | "needs_migration"
  optionsCount: number
  variantsCount: number
  options: Array<{
    id: string
    title: string
    valuesCount: number
    values: string[]
  }>
  hasAudioOption: boolean
  currentMetadata: {
    family?: string
    hasAudio?: boolean
    related?: any
    platform?: any
  }
  issues: string[]
  recommendations: string[]
}

interface AnalysisReport {
  timestamp: string
  databaseUrl: string
  productsAnalyzed: number
  summary: {
    existingProducts: number
    missingProducts: number
    needsMigration: number
    totalIssues: number
  }
  products: ProductAnalysis[]
  migrationPlan: {
    step: number
    action: string
    target: string
    risk: "low" | "medium" | "high"
    description: string
  }[]
}

// ─── Helper Functions ────────────────────────────────────────────────────────

function log(message: string, level: "info" | "warn" | "error" = "info") {
  const timestamp = new Date().toLocaleTimeString()
  const prefix = level === "error" ? "❌" : level === "warn" ? "⚠️" : "ℹ️"
  console.log(`[${timestamp}] ${prefix} ${message}`)
}

function detectIssues(product: any): string[] {
  const issues: string[] = []

  // Check for "Audio" option (should be separate product)
  const audioOption = product.options?.find((opt: any) =>
    opt.title.toLowerCase().includes("audio")
  )
  if (audioOption) {
    issues.push(
      `Has "Audio" option with ${audioOption.values?.length || 0} values - should be separate products`
    )
  }

  // Check metadata structure
  const metadata = product.metadata || {}

  if (!metadata.family) {
    issues.push('Missing metadata.family (should be "shield-platform")')
  }

  if (metadata.hasAudio === undefined) {
    issues.push("Missing metadata.hasAudio boolean flag")
  }

  if (!metadata.related) {
    issues.push("Missing metadata.related (links between products)")
  }

  if (!metadata.platform) {
    issues.push("Missing metadata.platform (shared features)")
  }

  // Check variants count
  const expectedVariants = 4 // 2 frames × 2 lenses
  if (product.variantsCount > expectedVariants) {
    issues.push(
      `Has ${product.variantsCount} variants (expected ${expectedVariants} for single product)`
    )
  }

  return issues
}

function generateRecommendations(
  handle: string,
  issues: string[]
): string[] {
  const recommendations: string[] = []

  if (handle === "music-shield") {
    recommendations.push("Remove 'Audio' option if present")
    recommendations.push("Keep only 'Monture' and 'Verres' options")
    recommendations.push("Reduce to 4 variants (2×2)")
    recommendations.push('Add metadata.family = "shield-platform"')
    recommendations.push("Add metadata.hasAudio = true")
    recommendations.push(
      'Add metadata.related.withoutAudio = "shield"'
    )
    recommendations.push("Add audio-specific features and specs")
    recommendations.push("Set price to $260 (26000 cents)")
    recommendations.push("Set weight to 49g")
  } else if (handle === "shield") {
    recommendations.push("Create as new product (if missing)")
    recommendations.push("Add 'Monture' and 'Verres' options")
    recommendations.push("Create 4 variants (2×2)")
    recommendations.push('Add metadata.family = "shield-platform"')
    recommendations.push("Add metadata.hasAudio = false")
    recommendations.push(
      'Add metadata.related.withAudio = "music-shield"'
    )
    recommendations.push("Exclude audio features and specs")
    recommendations.push("Set price to $240 (24000 cents)")
    recommendations.push("Set weight to 44g")
  }

  return recommendations
}

// ─── Main Analysis Function ──────────────────────────────────────────────────

async function analyzeCurrentState(): Promise<AnalysisReport> {
  log("🔍 Starting dry-run analysis (READ-ONLY - Direct DB access)...")

  // Connect to PostgreSQL
  const client = new Client({ connectionString: DATABASE_URL })
  await client.connect()

  log(`Connected to database`)

  const productsAnalysis: ProductAnalysis[] = []

  try {
    // Analyze each target product
    for (const handle of TARGET_HANDLES) {
      log(`Analyzing product: ${handle}...`)

      try {
        // Fetch product
        const productResult = await client.query(
          `SELECT id, title, handle, status, metadata
           FROM product
           WHERE handle = $1 AND deleted_at IS NULL
           LIMIT 1`,
          [handle]
        )

        const product = productResult.rows[0]

        if (!product) {
          // Product doesn't exist
          productsAnalysis.push({
            handle,
            title: handle === "shield" ? "Shield" : "Music Shield",
            id: "N/A",
            status: "missing",
            optionsCount: 0,
            variantsCount: 0,
            options: [],
            hasAudioOption: false,
            currentMetadata: {},
            issues: ["Product does not exist in database"],
            recommendations: generateRecommendations(handle, [
              "Product does not exist",
            ]),
          })
          continue
        }

        // Fetch product options
        const optionsResult = await client.query(
          `SELECT id, title
           FROM product_option
           WHERE product_id = $1 AND deleted_at IS NULL`,
          [product.id]
        )

        // Fetch option values for each option
        const options = []
        for (const opt of optionsResult.rows) {
          const valuesResult = await client.query(
            `SELECT id, value
             FROM product_option_value
             WHERE option_id = $1 AND deleted_at IS NULL`,
            [opt.id]
          )

          options.push({
            id: opt.id,
            title: opt.title,
            valuesCount: valuesResult.rows.length,
            values: valuesResult.rows.map((v: any) => v.value),
          })
        }

        // Count variants
        const variantsResult = await client.query(
          `SELECT COUNT(*) as count
           FROM product_variant
           WHERE product_id = $1 AND deleted_at IS NULL`,
          [product.id]
        )

        const variantsCount = parseInt(variantsResult.rows[0].count)

        const hasAudioOption = options.some((opt) =>
          opt.title.toLowerCase().includes("audio")
        )

        const productData = {
          ...product,
          options,
          variantsCount,
        }

        const issues = detectIssues(productData)

        productsAnalysis.push({
          handle,
          title: product.title,
          id: product.id,
          status: issues.length > 0 ? "needs_migration" : "exists",
          optionsCount: options.length,
          variantsCount,
          options,
          hasAudioOption,
          currentMetadata: product.metadata || {},
          issues,
          recommendations: generateRecommendations(handle, issues),
        })

        log(`✅ Analyzed: ${product.title} (${variantsCount} variants)`)
      } catch (error: any) {
        log(`Error analyzing ${handle}: ${error.message}`, "error")
        productsAnalysis.push({
          handle,
          title: "Error",
          id: "N/A",
          status: "missing",
          optionsCount: 0,
          variantsCount: 0,
          options: [],
          hasAudioOption: false,
          currentMetadata: {},
          issues: [`Error fetching product: ${error.message}`],
          recommendations: [],
        })
      }
    }
  } finally {
    await client.end()
  }

  // Generate summary
  const summary = {
    existingProducts: productsAnalysis.filter((p) => p.status === "exists")
      .length,
    missingProducts: productsAnalysis.filter((p) => p.status === "missing")
      .length,
    needsMigration: productsAnalysis.filter(
      (p) => p.status === "needs_migration"
    ).length,
    totalIssues: productsAnalysis.reduce(
      (sum, p) => sum + p.issues.length,
      0
    ),
  }

  // Generate migration plan
  const migrationPlan = [
    {
      step: 1,
      action: "BACKUP",
      target: "Database",
      risk: "low" as const,
      description:
        "Create full database backup using 01-backup-database.sh",
    },
    {
      step: 2,
      action: "MIGRATE",
      target: "music-shield",
      risk: "high" as const,
      description:
        "Update Music Shield: remove Audio option, add family metadata, reduce to 4 variants",
    },
    {
      step: 3,
      action: "VERIFY",
      target: "music-shield",
      risk: "low" as const,
      description: "Verify Music Shield structure matches reference JSON",
    },
    {
      step: 4,
      action: "CREATE",
      target: "shield",
      risk: "medium" as const,
      description:
        "Create new Shield product with 4 variants (if missing)",
    },
    {
      step: 5,
      action: "VERIFY",
      target: "shield",
      risk: "low" as const,
      description: "Verify Shield structure matches reference JSON",
    },
    {
      step: 6,
      action: "TEST",
      target: "Both products",
      risk: "low" as const,
      description:
        "Test product navigation, family links, and metadata.related",
    },
  ]

  const report: AnalysisReport = {
    timestamp: new Date().toISOString(),
    databaseUrl: DATABASE_URL.replace(/:[^:@]+@/, ":***@"), // Hide password
    productsAnalyzed: productsAnalysis.length,
    summary,
    products: productsAnalysis,
    migrationPlan,
  }

  return report
}

// ─── Generate Markdown Report ────────────────────────────────────────────────

function generateMarkdownReport(report: AnalysisReport): string {
  let md = `# Product Refactoring v2.0 - Analysis Report\n\n`
  md += `**Generated**: ${new Date(report.timestamp).toLocaleString()}\n`
  md += `**Database**: ${report.databaseUrl}\n\n`
  md += `---\n\n`

  md += `## 📊 Summary\n\n`
  md += `- **Products Analyzed**: ${report.productsAnalyzed}\n`
  md += `- **Existing Products**: ${report.summary.existingProducts}\n`
  md += `- **Missing Products**: ${report.summary.missingProducts}\n`
  md += `- **Needs Migration**: ${report.summary.needsMigration}\n`
  md += `- **Total Issues**: ${report.summary.totalIssues}\n\n`

  md += `---\n\n`

  md += `## 🔍 Product Analysis\n\n`

  for (const product of report.products) {
    const statusEmoji =
      product.status === "exists"
        ? "✅"
        : product.status === "missing"
        ? "❌"
        : "⚠️"

    md += `### ${statusEmoji} ${product.title || product.handle}\n\n`
    md += `- **Handle**: \`${product.handle}\`\n`
    md += `- **ID**: \`${product.id}\`\n`
    md += `- **Status**: ${product.status.toUpperCase()}\n`
    md += `- **Options**: ${product.optionsCount}\n`
    md += `- **Variants**: ${product.variantsCount}\n`
    md += `- **Has Audio Option**: ${product.hasAudioOption ? "❌ YES (should be removed)" : "✅ NO"}\n\n`

    if (product.options.length > 0) {
      md += `**Options Structure**:\n`
      for (const opt of product.options) {
        md += `- **${opt.title}**: ${opt.valuesCount} values (${opt.values.join(", ")})\n`
      }
      md += `\n`
    }

    md += `**Current Metadata**:\n`
    md += `\`\`\`json\n${JSON.stringify(product.currentMetadata, null, 2)}\n\`\`\`\n\n`

    if (product.issues.length > 0) {
      md += `**Issues (${product.issues.length})**:\n`
      for (const issue of product.issues) {
        md += `- 🔴 ${issue}\n`
      }
      md += `\n`
    }

    if (product.recommendations.length > 0) {
      md += `**Recommendations**:\n`
      for (const rec of product.recommendations) {
        md += `- ✅ ${rec}\n`
      }
      md += `\n`
    }

    md += `---\n\n`
  }

  md += `## 🛠️ Migration Plan\n\n`
  for (const step of report.migrationPlan) {
    const riskColor =
      step.risk === "low" ? "🟢" : step.risk === "medium" ? "🟡" : "🔴"
    md += `### Step ${step.step}: ${step.action} - ${step.target}\n`
    md += `- **Risk**: ${riskColor} ${step.risk.toUpperCase()}\n`
    md += `- **Description**: ${step.description}\n\n`
  }

  md += `---\n\n`
  md += `## ⚠️ Important Notes\n\n`
  md += `- This is a **READ-ONLY** analysis. No changes have been made.\n`
  md += `- **Backup your database** before running migration scripts.\n`
  md += `- Migration should be done in **production off-peak hours**.\n`
  md += `- Have **rollback plan** ready before starting migration.\n`
  md += `- Test each step before proceeding to the next.\n\n`

  md += `---\n\n`
  md += `**Next Step**: Review this report and run \`01-backup-database.sh\` before migration.\n`

  return md
}

// ─── Main Execution ──────────────────────────────────────────────────────────

async function main() {
  console.log("═══════════════════════════════════════════════════════════════")
  console.log("  Product Refactoring v2.0 - Dry Run Analysis")
  console.log("  READ-ONLY - Direct Database Access")
  console.log("═══════════════════════════════════════════════════════════════")
  console.log("")

  try {
    // Run analysis
    const report = await analyzeCurrentState()

    // Save JSON report
    writeFileSync(REPORT_FILE, JSON.stringify(report, null, 2))
    log(`✅ JSON report saved: ${REPORT_FILE}`)

    // Save Markdown report
    const markdown = generateMarkdownReport(report)
    writeFileSync(REPORT_MD_FILE, markdown)
    log(`✅ Markdown report saved: ${REPORT_MD_FILE}`)

    // Print summary
    console.log("")
    console.log("═══════════════════════════════════════════════════════════════")
    console.log("  ANALYSIS COMPLETE")
    console.log("═══════════════════════════════════════════════════════════════")
    console.log("")
    console.log(`📊 Products Analyzed: ${report.productsAnalyzed}`)
    console.log(`✅ Existing: ${report.summary.existingProducts}`)
    console.log(`❌ Missing: ${report.summary.missingProducts}`)
    console.log(`⚠️  Needs Migration: ${report.summary.needsMigration}`)
    console.log(`🔴 Total Issues: ${report.summary.totalIssues}`)
    console.log("")
    console.log(`📄 Reports saved:`)
    console.log(`   - ${REPORT_FILE}`)
    console.log(`   - ${REPORT_MD_FILE}`)
    console.log("")

    if (report.summary.totalIssues > 0) {
      console.log("⚠️  Issues found. Review reports before proceeding.")
      console.log("")
      console.log("Next steps:")
      console.log("1. Review analysis reports")
      console.log("2. Run ./01-backup-database.sh")
      console.log("3. Run migration script (to be created)")
    } else {
      console.log("✅ No issues found. Products are already in v2.0 format.")
    }

    console.log("")
    console.log("═══════════════════════════════════════════════════════════════")

    process.exit(0)
  } catch (error: any) {
    log(`Fatal error: ${error.message}`, "error")
    console.error(error)
    process.exit(1)
  }
}

// Run if executed directly
if (require.main === module) {
  main()
}

export { analyzeCurrentState, generateMarkdownReport }
