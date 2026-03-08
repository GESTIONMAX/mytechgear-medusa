#!/usr/bin/env tsx
/**
 * Migrate Products - Direct Database Migration
 *
 * Updates product metadata directly in PostgreSQL.
 * Safer and simpler than using the API.
 *
 * Prerequisites:
 * 1. Run 01-backup-database.sh
 * 2. Run 02-analyze-current-state-db.ts and review report
 * 3. Have rollback plan ready
 *
 * Usage: npx tsx scripts/migrations/product-refactor-v2/03-migrate-products-db.ts
 */

import { config } from "dotenv"
import { readFileSync, writeFileSync } from "fs"
import { join } from "path"
import * as readline from "readline"
import pg from "pg"

const { Client } = pg

// ─── Configuration ───────────────────────────────────────────────────────────

config({ path: ".env" })

const LOG_DIR = "./backups"
const TIMESTAMP = new Date().toISOString().replace(/[:.]/g, "-").slice(0, -5)
const LOG_FILE = join(LOG_DIR, `migration-${TIMESTAMP}.log`)
const STATE_FILE = join(LOG_DIR, `migration-state-${TIMESTAMP}.json`)

// Database configuration
const DATABASE_URL = process.env.DATABASE_URL

if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL not found in .env file")
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

async function step1_updateMusicShieldMetadata(
  client: pg.Client,
  state: MigrationState
): Promise<void> {
  log("Step 1: Updating Music Shield metadata...")

  const step = state.steps[0]
  step.status = "in_progress"
  step.startedAt = new Date().toISOString()
  saveState(state)

  try {
    // Fetch current product
    const result = await client.query(
      `SELECT id, title, handle, metadata
       FROM product
       WHERE handle = 'music-shield' AND deleted_at IS NULL
       LIMIT 1`
    )

    const product = result.rows[0]

    if (!product) {
      throw new Error("Music Shield product not found")
    }

    log(`Found Music Shield: ${product.title} (ID: ${product.id})`)

    // Merge metadata (keep existing + add new v2.0 fields)
    const newMetadata = {
      ...product.metadata,
      family: "shield-platform",
      hasAudio: true,
      related: {
        withoutAudio: "shield",
        variant: "audio"
      },
      platform: {
        eclipse: true,
        category: "sport-smart-glasses",
        sharedFeatures: [
          "eclipse-tint",
          "impact-resistant",
          "sweatproof",
          "ultra-light",
          "uv-protection"
        ]
      },
      // Add features and specs from reference
      features: MUSIC_SHIELD_REF.product.metadata.features,
      specs: MUSIC_SHIELD_REF.product.metadata.specs,
    }

    // Update product metadata
    await client.query(
      `UPDATE product
       SET metadata = $1, updated_at = NOW()
       WHERE id = $2`,
      [JSON.stringify(newMetadata), product.id]
    )

    log("✅ Music Shield metadata updated successfully")
    log(`   - family: ${newMetadata.family}`)
    log(`   - hasAudio: ${newMetadata.hasAudio}`)
    log(`   - related.withoutAudio: ${newMetadata.related.withoutAudio}`)

    step.status = "completed"
    step.completedAt = new Date().toISOString()
    step.data = { productId: product.id }
    saveState(state)
  } catch (error: any) {
    step.status = "failed"
    step.error = error.message
    saveState(state)
    throw error
  }
}

async function step2_updateShieldMetadata(
  client: pg.Client,
  state: MigrationState
): Promise<void> {
  log("Step 2: Updating Shield metadata...")

  const step = state.steps[1]
  step.status = "in_progress"
  step.startedAt = new Date().toISOString()
  saveState(state)

  try {
    // Fetch current product
    const result = await client.query(
      `SELECT id, title, handle, metadata
       FROM product
       WHERE handle = 'shield' AND deleted_at IS NULL
       LIMIT 1`
    )

    const product = result.rows[0]

    if (!product) {
      throw new Error("Shield product not found")
    }

    log(`Found Shield: ${product.title} (ID: ${product.id})`)

    // Merge metadata (keep existing + add new v2.0 fields)
    const newMetadata = {
      ...product.metadata,
      family: "shield-platform",
      hasAudio: false,
      related: {
        withAudio: "music-shield",
        variant: "no-audio"
      },
      platform: {
        eclipse: true,
        category: "sport-smart-glasses",
        sharedFeatures: [
          "eclipse-tint",
          "impact-resistant",
          "sweatproof",
          "ultra-light",
          "uv-protection"
        ]
      },
      // Add features and specs from reference
      features: SHIELD_REF.product.metadata.features,
      specs: SHIELD_REF.product.metadata.specs,
    }

    // Update product metadata
    await client.query(
      `UPDATE product
       SET metadata = $1, updated_at = NOW()
       WHERE id = $2`,
      [JSON.stringify(newMetadata), product.id]
    )

    log("✅ Shield metadata updated successfully")
    log(`   - family: ${newMetadata.family}`)
    log(`   - hasAudio: ${newMetadata.hasAudio}`)
    log(`   - related.withAudio: ${newMetadata.related.withAudio}`)

    step.status = "completed"
    step.completedAt = new Date().toISOString()
    step.data = { productId: product.id }
    saveState(state)
  } catch (error: any) {
    step.status = "failed"
    step.error = error.message
    saveState(state)
    throw error
  }
}

async function step3_verifyMigration(
  client: pg.Client,
  state: MigrationState
): Promise<void> {
  log("Step 3: Verifying migration...")

  const step = state.steps[2]
  step.status = "in_progress"
  step.startedAt = new Date().toISOString()
  saveState(state)

  try {
    // Check Music Shield
    const musicShieldResult = await client.query(
      `SELECT id, title, metadata
       FROM product
       WHERE handle = 'music-shield' AND deleted_at IS NULL
       LIMIT 1`
    )

    const musicShield = musicShieldResult.rows[0]

    // Check Shield
    const shieldResult = await client.query(
      `SELECT id, title, metadata
       FROM product
       WHERE handle = 'shield' AND deleted_at IS NULL
       LIMIT 1`
    )

    const shield = shieldResult.rows[0]

    // Verify metadata
    const issues: string[] = []

    if (!musicShield) {
      issues.push("Music Shield not found after migration")
    } else {
      const metadata = musicShield.metadata || {}
      if (metadata.family !== "shield-platform") {
        issues.push("Music Shield: family not set correctly")
      }
      if (metadata.hasAudio !== true) {
        issues.push("Music Shield: hasAudio not set to true")
      }
      if (!metadata.related?.withoutAudio) {
        issues.push("Music Shield: related.withoutAudio not set")
      }
      if (!metadata.platform) {
        issues.push("Music Shield: platform not set")
      }
    }

    if (!shield) {
      issues.push("Shield not found after migration")
    } else {
      const metadata = shield.metadata || {}
      if (metadata.family !== "shield-platform") {
        issues.push("Shield: family not set correctly")
      }
      if (metadata.hasAudio !== false) {
        issues.push("Shield: hasAudio not set to false")
      }
      if (!metadata.related?.withAudio) {
        issues.push("Shield: related.withAudio not set")
      }
      if (!metadata.platform) {
        issues.push("Shield: platform not set")
      }
    }

    if (issues.length > 0) {
      log("⚠️  Verification found issues:")
      issues.forEach((issue) => log(`   - ${issue}`, "warn"))

      const proceed = await confirm(
        "Continue despite verification issues?"
      )
      if (!proceed) {
        throw new Error("Verification failed: " + issues.join(", "))
      }
    } else {
      log("✅ Verification passed - all metadata correctly set")
    }

    const report = {
      musicShield: musicShield
        ? {
            id: musicShield.id,
            family: musicShield.metadata?.family,
            hasAudio: musicShield.metadata?.hasAudio,
            relatedProduct: musicShield.metadata?.related?.withoutAudio,
          }
        : null,
      shield: shield
        ? {
            id: shield.id,
            family: shield.metadata?.family,
            hasAudio: shield.metadata?.hasAudio,
            relatedProduct: shield.metadata?.related?.withAudio,
          }
        : null,
      issues,
    }

    log("Final state:")
    log(JSON.stringify(report, null, 2))

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
  console.log("  Product Refactoring v2.0 - Metadata Migration")
  console.log("  ⚠️  THIS WILL MODIFY PRODUCTION DATABASE")
  console.log("═══════════════════════════════════════════════════════════════")
  console.log("")

  // Initialize state
  const state: MigrationState = {
    started: new Date().toISOString(),
    completed: false,
    steps: [
      { step: 1, name: "Update Music Shield metadata", status: "pending" },
      { step: 2, name: "Update Shield metadata", status: "pending" },
      { step: 3, name: "Verify migration", status: "pending" },
    ],
  }

  saveState(state)

  // Pre-flight checks
  log("Pre-flight checks...")
  log(`Database: ${DATABASE_URL.replace(/:[^:@]+@/, ":***@")}`)
  log(`Log file: ${LOG_FILE}`)
  log(`State file: ${STATE_FILE}`)

  // Confirm start
  console.log("")
  console.log("⚠️  CRITICAL WARNINGS:")
  console.log("   1. This script will MODIFY your production database")
  console.log("   2. Have you created a backup? (01-backup-database.sh)")
  console.log("   3. Have you reviewed the analysis report? (02-analyze-current-state-db.ts)")
  console.log("   4. Do you have a rollback plan ready?")
  console.log("")
  console.log("This migration will:")
  console.log("   - Add metadata.family = 'shield-platform'")
  console.log("   - Add metadata.hasAudio (true for Music Shield, false for Shield)")
  console.log("   - Add metadata.related (product links)")
  console.log("   - Add metadata.platform (shared features)")
  console.log("   - Add metadata.features and metadata.specs")
  console.log("")

  const confirmStart = await confirm(
    "Are you ABSOLUTELY SURE you want to proceed with migration?"
  )

  if (!confirmStart) {
    log("Migration cancelled by user", "warn")
    process.exit(0)
  }

  // Connect to database
  const client = new Client({ connectionString: DATABASE_URL })
  await client.connect()

  try {
    log("Starting migration...")
    console.log("")

    // Begin transaction
    await client.query("BEGIN")
    log("✅ Transaction started")

    try {
      // Execute migration steps
      await step1_updateMusicShieldMetadata(client, state)
      console.log("")

      await step2_updateShieldMetadata(client, state)
      console.log("")

      await step3_verifyMigration(client, state)
      console.log("")

      // Commit transaction
      await client.query("COMMIT")
      log("✅ Transaction committed")

      // Mark as completed
      state.completed = true
      saveState(state)

      console.log("═══════════════════════════════════════════════════════════════")
      console.log("  ✅ MIGRATION COMPLETED SUCCESSFULLY")
      console.log("═══════════════════════════════════════════════════════════════")
      console.log("")
      console.log(`Migration log: ${LOG_FILE}`)
      console.log(`Migration state: ${STATE_FILE}`)
      console.log("")
      console.log("Next steps:")
      console.log("1. Run 02-analyze-current-state-db.ts to verify final state")
      console.log("2. Test products in frontend")
      console.log("3. Keep backup for at least 30 days")
      console.log("")
    } catch (error: any) {
      // Rollback transaction on error
      await client.query("ROLLBACK")
      log("❌ Transaction rolled back", "error")
      throw error
    }
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
    console.log("Database has been ROLLED BACK to previous state.")
    console.log("No changes were committed.")
    console.log("")

    process.exit(1)
  } finally {
    await client.end()
  }
}

// ─── Execute ─────────────────────────────────────────────────────────────────

if (require.main === module) {
  migrate()
}

export { migrate }
