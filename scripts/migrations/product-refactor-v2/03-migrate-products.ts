#!/usr/bin/env tsx
/**
 * Migrate Products - Production Migration Script
 *
 * WRITES to production database. Use with extreme caution.
 * Migrates Music Shield and Shield to v2.0 architecture.
 *
 * Prerequisites:
 * 1. Run 01-backup-database.sh
 * 2. Run 02-analyze-current-state.ts and review report
 * 3. Have rollback plan ready
 *
 * Usage: npx tsx scripts/migrations/product-refactor-v2/03-migrate-products.ts
 */

import { config } from "dotenv"
import { readFileSync, writeFileSync } from "fs"
import { join } from "path"
import * as readline from "readline"

// ─── Configuration ───────────────────────────────────────────────────────────

config({ path: ".env" })

const LOG_DIR = "./backups"
const TIMESTAMP = new Date().toISOString().replace(/[:.]/g, "-").slice(0, -5)
const LOG_FILE = join(LOG_DIR, `migration-${TIMESTAMP}.log`)
const STATE_FILE = join(LOG_DIR, `migration-state-${TIMESTAMP}.json`)

// API Configuration
const MEDUSA_BACKEND_URL = process.env.MEDUSA_BACKEND_URL || "http://localhost:9000"
const ADMIN_API_TOKEN = process.env.ADMIN_API_TOKEN

if (!ADMIN_API_TOKEN) {
  console.error("❌ ADMIN_API_TOKEN not found in .env file")
  process.exit(1)
}

// Reference JSON files
const MUSIC_SHIELD_REF = JSON.parse(
  readFileSync("./docs/product-models/music-shield-reference.json", "utf-8")
)
const SHIELD_REF = JSON.parse(
  readFileSync("./docs/product-models/shield-reference.json", "utf-8")
)

// ─── Types ───────────────────────────────────────────────────────────────────

interface MigrationState {
  started: string
  completed: boolean
  steps: {
    step: number
    name: string
    status: "pending" | "in_progress" | "completed" | "failed"
    startedAt?: string
    completedAt?: string
    error?: string
    data?: any
  }[]
}

// ─── Helper Functions ────────────────────────────────────────────────────────

async function fetchMedusaAPI(path: string, options: RequestInit = {}): Promise<any> {
  const url = `${MEDUSA_BACKEND_URL}${path}`

  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "x-medusa-access-token": ADMIN_API_TOKEN!,
      ...options.headers,
    },
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorText}`)
  }

  return response.json()
}

function log(message: string, level: "info" | "warn" | "error" = "info") {
  const timestamp = new Date().toISOString()
  const prefix = level === "error" ? "❌" : level === "warn" ? "⚠️" : "ℹ️"
  const logMessage = `[${timestamp}] ${prefix} ${message}`

  console.log(logMessage)

  // Append to log file
  try {
    writeFileSync(LOG_FILE, logMessage + "\n", { flag: "a" })
  } catch (err) {
    console.error("Failed to write to log file:", err)
  }
}

function saveState(state: MigrationState) {
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2))
}

async function confirm(question: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  return new Promise((resolve) => {
    rl.question(`\n⚠️  ${question} (yes/no): `, (answer) => {
      rl.close()
      resolve(answer.toLowerCase() === "yes")
    })
  })
}

// ─── Migration Steps ─────────────────────────────────────────────────────────

async function step1_analyzeMusicShield(
  state: MigrationState
): Promise<any> {
  log("Step 1: Analyzing Music Shield product...")

  const step = state.steps[0]
  step.status = "in_progress"
  step.startedAt = new Date().toISOString()
  saveState(state)

  try {
    const { products } = await fetchMedusaAPI(
      "/admin/products?handle=music-shield&fields=*options,*options.values,*variants,*variants.options"
    )

    const product = products?.[0]

    if (!product) {
      throw new Error("Music Shield product not found in database")
    }

    log(`Found Music Shield: ${product.title} (ID: ${product.id})`)
    log(`Current options: ${product.options?.length || 0}`)
    log(`Current variants: ${product.variants?.length || 0}`)

    step.status = "completed"
    step.completedAt = new Date().toISOString()
    step.data = {
      productId: product.id,
      title: product.title,
      optionsCount: product.options?.length || 0,
      variantsCount: product.variants?.length || 0,
    }
    saveState(state)

    return product
  } catch (error: any) {
    step.status = "failed"
    step.error = error.message
    saveState(state)
    throw error
  }
}

async function step2_updateMusicShieldMetadata(
  state: MigrationState,
  product: any
): Promise<void> {
  log("Step 2: Updating Music Shield metadata...")

  const step = state.steps[1]
  step.status = "in_progress"
  step.startedAt = new Date().toISOString()
  saveState(state)

  try {
    const newMetadata = {
      ...product.metadata,
      ...MUSIC_SHIELD_REF.product.metadata,
    }

    await fetchMedusaAPI(`/admin/products/${product.id}`, {
      method: "POST",
      body: JSON.stringify({ metadata: newMetadata }),
    })

    log("✅ Metadata updated successfully")
    log(`   - family: ${newMetadata.family}`)
    log(`   - hasAudio: ${newMetadata.hasAudio}`)
    log(`   - related.withoutAudio: ${newMetadata.related?.withoutAudio}`)

    step.status = "completed"
    step.completedAt = new Date().toISOString()
    saveState(state)
  } catch (error: any) {
    step.status = "failed"
    step.error = error.message
    saveState(state)
    throw error
  }
}

async function step3_removeAudioOption(
  state: MigrationState,
  product: any
): Promise<void> {
  log("Step 3: Checking for Audio option...")

  const step = state.steps[2]
  step.status = "in_progress"
  step.startedAt = new Date().toISOString()
  saveState(state)

  try {
    const audioOption = product.options?.find((opt: any) =>
      opt.title.toLowerCase().includes("audio")
    )

    if (!audioOption) {
      log("✅ No Audio option found - skipping")
      step.status = "completed"
      step.completedAt = new Date().toISOString()
      saveState(state)
      return
    }

    log(`⚠️  Found Audio option: ${audioOption.title} (ID: ${audioOption.id})`)
    log("⚠️  This step requires MANUAL intervention:")
    log("   1. Audio option cannot be automatically removed if variants exist")
    log("   2. You must manually delete variants with 'Audio=Without Audio'")
    log("   3. Keep only variants with desired Monture+Verres combinations")
    log("   4. Then manually delete the Audio option from product")

    const proceed = await confirm(
      "Have you manually removed the Audio option and unwanted variants?"
    )

    if (!proceed) {
      throw new Error("User cancelled - Audio option removal not completed")
    }

    log("✅ User confirmed Audio option removal")

    step.status = "completed"
    step.completedAt = new Date().toISOString()
    saveState(state)
  } catch (error: any) {
    step.status = "failed"
    step.error = error.message
    saveState(state)
    throw error
  }
}

async function step4_verifyMusicShield(
  state: MigrationState,
  productId: string
): Promise<void> {
  log("Step 4: Verifying Music Shield structure...")

  const step = state.steps[3]
  step.status = "in_progress"
  step.startedAt = new Date().toISOString()
  saveState(state)

  try {
    const { products } = await fetchMedusaAPI(
      `/admin/products?id=${productId}&fields=*options,*variants`
    )

    const product = products?.[0]

    if (!product) {
      throw new Error("Music Shield not found after update")
    }

    // Verify structure
    const issues: string[] = []

    if (!product.metadata?.family) {
      issues.push("Missing metadata.family")
    }
    if (product.metadata?.hasAudio !== true) {
      issues.push("metadata.hasAudio should be true")
    }
    if (!product.metadata?.related?.withoutAudio) {
      issues.push("Missing metadata.related.withoutAudio")
    }

    const audioOption = product.options?.find((opt: any) =>
      opt.title.toLowerCase().includes("audio")
    )
    if (audioOption) {
      issues.push("Audio option still exists")
    }

    if (product.variants?.length > 4) {
      issues.push(
        `Too many variants (${product.variants.length}), expected 4`
      )
    }

    if (issues.length > 0) {
      log("⚠️  Verification issues:")
      issues.forEach((issue) => log(`   - ${issue}`))

      const proceed = await confirm(
        "Continue despite verification issues?"
      )
      if (!proceed) {
        throw new Error("Verification failed")
      }
    } else {
      log("✅ Music Shield structure verified successfully")
    }

    step.status = "completed"
    step.completedAt = new Date().toISOString()
    step.data = {
      optionsCount: product.options?.length || 0,
      variantsCount: product.variants?.length || 0,
      issues,
    }
    saveState(state)
  } catch (error: any) {
    step.status = "failed"
    step.error = error.message
    saveState(state)
    throw error
  }
}

async function step5_checkShieldExists(
  state: MigrationState
): Promise<any | null> {
  log("Step 5: Checking if Shield product exists...")

  const step = state.steps[4]
  step.status = "in_progress"
  step.startedAt = new Date().toISOString()
  saveState(state)

  try {
    const { products } = await fetchMedusaAPI(
      "/admin/products?handle=shield&fields=*options,*variants"
    )

    const product = products?.[0]

    if (product) {
      log(`✅ Shield product exists: ${product.title} (ID: ${product.id})`)
      step.data = { exists: true, productId: product.id }
    } else {
      log("ℹ️  Shield product does NOT exist - will create")
      step.data = { exists: false }
    }

    step.status = "completed"
    step.completedAt = new Date().toISOString()
    saveState(state)

    return product || null
  } catch (error: any) {
    step.status = "failed"
    step.error = error.message
    saveState(state)
    throw error
  }
}

async function step6_createOrUpdateShield(
  state: MigrationState,
  existingProduct: any | null
): Promise<void> {
  log("Step 6: Creating or updating Shield product...")

  const step = state.steps[5]
  step.status = "in_progress"
  step.startedAt = new Date().toISOString()
  saveState(state)

  try {
    if (existingProduct) {
      log("Updating existing Shield product...")

      // Update metadata
      await fetchMedusaAPI(`/admin/products/${existingProduct.id}`, {
        method: "POST",
        body: JSON.stringify({ metadata: SHIELD_REF.product.metadata }),
      })

      log("✅ Shield metadata updated")
    } else {
      log("⚠️  Shield product creation requires MANUAL intervention:")
      log("   Medusa v2 product creation via API is complex and requires:")
      log("   1. Create product with basic info")
      log("   2. Create options (Monture, Verres)")
      log("   3. Create option values with metadata")
      log("   4. Create 4 variants with proper option mappings")
      log("   5. Set prices, SKUs, inventory")
      log("")
      log("   Recommended: Use Medusa Admin UI or refer to:")
      log("   - ./docs/product-models/shield-reference.json")
      log("")

      const proceed = await confirm(
        "Have you manually created Shield product using the reference JSON?"
      )

      if (!proceed) {
        throw new Error("User cancelled - Shield product not created")
      }

      log("✅ User confirmed Shield product creation")
    }

    step.status = "completed"
    step.completedAt = new Date().toISOString()
    saveState(state)
  } catch (error: any) {
    step.status = "failed"
    step.error = error.message
    saveState(state)
    throw error
  }
}

async function step7_verifyFinalState(
  state: MigrationState
): Promise<void> {
  log("Step 7: Verifying final migration state...")

  const step = state.steps[6]
  step.status = "in_progress"
  step.startedAt = new Date().toISOString()
  saveState(state)

  try {
    // Check Music Shield
    const { products: musicShieldProducts } = await fetchMedusaAPI(
      "/admin/products?handle=music-shield&fields=*options,*variants,metadata"
    )
    const musicShield = musicShieldProducts?.[0]

    // Check Shield
    const { products: shieldProducts } = await fetchMedusaAPI(
      "/admin/products?handle=shield&fields=*options,*variants,metadata"
    )
    const shield = shieldProducts?.[0]

    const report = {
      musicShield: musicShield
        ? {
            exists: true,
            id: musicShield.id,
            variantsCount: musicShield.variants?.length || 0,
            hasFamily: !!musicShield.metadata?.family,
            hasAudio: musicShield.metadata?.hasAudio,
            relatedProduct: musicShield.metadata?.related?.withoutAudio,
          }
        : { exists: false },
      shield: shield
        ? {
            exists: true,
            id: shield.id,
            variantsCount: shield.variants?.length || 0,
            hasFamily: !!shield.metadata?.family,
            hasAudio: shield.metadata?.hasAudio,
            relatedProduct: shield.metadata?.related?.withAudio,
          }
        : { exists: false },
    }

    log("Final State Report:")
    log(JSON.stringify(report, null, 2))

    const allGood =
      musicShield &&
      shield &&
      musicShield.metadata?.family === "shield-platform" &&
      shield.metadata?.family === "shield-platform" &&
      musicShield.metadata?.hasAudio === true &&
      shield.metadata?.hasAudio === false

    if (allGood) {
      log("✅ Migration completed successfully!")
    } else {
      log("⚠️  Migration completed with warnings - review report above")
    }

    step.status = "completed"
    step.completedAt = new Date().toISOString()
    step.data = report
    saveState(state)
  } catch (error: any) {
    step.status = "failed"
    step.error = error.message
    saveState(state)
    throw error
  }
}

// ─── Main Migration Function ─────────────────────────────────────────────────

async function migrate(): Promise<void> {
  console.log("═══════════════════════════════════════════════════════════════")
  console.log("  Product Refactoring v2.0 - Migration Script")
  console.log("  ⚠️  THIS WILL MODIFY PRODUCTION DATABASE")
  console.log("═══════════════════════════════════════════════════════════════")
  console.log("")

  // Initialize state
  const state: MigrationState = {
    started: new Date().toISOString(),
    completed: false,
    steps: [
      { step: 1, name: "Analyze Music Shield", status: "pending" },
      { step: 2, name: "Update Music Shield metadata", status: "pending" },
      { step: 3, name: "Remove Audio option", status: "pending" },
      { step: 4, name: "Verify Music Shield", status: "pending" },
      { step: 5, name: "Check Shield exists", status: "pending" },
      { step: 6, name: "Create/Update Shield", status: "pending" },
      { step: 7, name: "Verify final state", status: "pending" },
    ],
  }

  saveState(state)

  // Pre-flight checks
  log("Pre-flight checks...")
  log(`Database: ${MEDUSA_BACKEND_URL}`)
  log(`Log file: ${LOG_FILE}`)
  log(`State file: ${STATE_FILE}`)

  // Confirm start
  console.log("")
  console.log("⚠️  CRITICAL WARNINGS:")
  console.log("   1. This script will MODIFY your production database")
  console.log("   2. Have you created a backup? (01-backup-database.sh)")
  console.log("   3. Have you reviewed the analysis report? (02-analyze-current-state.ts)")
  console.log("   4. Do you have a rollback plan ready?")
  console.log("")

  const confirmStart = await confirm(
    "Are you ABSOLUTELY SURE you want to proceed with migration?"
  )

  if (!confirmStart) {
    log("Migration cancelled by user", "warn")
    process.exit(0)
  }

  try {
    log("Starting migration...")
    console.log("")

    // Execute steps
    const musicShield = await step1_analyzeMusicShield(state)
    console.log("")

    await step2_updateMusicShieldMetadata(state, musicShield)
    console.log("")

    await step3_removeAudioOption(state, musicShield)
    console.log("")

    await step4_verifyMusicShield(state, musicShield.id)
    console.log("")

    const existingShield = await step5_checkShieldExists(state)
    console.log("")

    await step6_createOrUpdateShield(state, existingShield)
    console.log("")

    await step7_verifyFinalState(state)
    console.log("")

    // Mark as completed
    state.completed = true
    saveState(state)

    console.log("═══════════════════════════════════════════════════════════════")
    console.log("  ✅ MIGRATION COMPLETED")
    console.log("═══════════════════════════════════════════════════════════════")
    console.log("")
    console.log(`Migration log: ${LOG_FILE}`)
    console.log(`Migration state: ${STATE_FILE}`)
    console.log("")
    console.log("Next steps:")
    console.log("1. Run 02-analyze-current-state.ts to verify final state")
    console.log("2. Test products in frontend")
    console.log("3. Keep backup for at least 30 days")
    console.log("")
  } catch (error: any) {
    log(`Migration failed: ${error.message}`, "error")
    console.error(error)

    console.log("")
    console.log("═══════════════════════════════════════════════════════════════")
    console.log("  ❌ MIGRATION FAILED")
    console.log("═══════════════════════════════════════════════════════════════")
    console.log("")
    console.log(`Error: ${error.message}`)
    console.log(`Log file: ${LOG_FILE}`)
    console.log(`State file: ${STATE_FILE}`)
    console.log("")
    console.log("To rollback:")
    console.log("1. Review error in log file")
    console.log("2. Run 04-rollback.ts script")
    console.log("3. Or manually restore backup")
    console.log("")

    process.exit(1)
  }
}

// ─── Execute ─────────────────────────────────────────────────────────────────

if (require.main === module) {
  migrate()
}

export { migrate }
