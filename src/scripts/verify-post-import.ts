import { ExecArgs } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  Modules,
} from "@medusajs/framework/utils"
import * as fs from "fs"
import * as path from "path"

/**
 * Verify Post-Import Metadata Script
 *
 * Verifies that OPS-protected fields were preserved after a PIM re-import.
 * Compares current metadata with a backup file to detect data loss.
 *
 * Usage:
 *   npm run medusa exec scripts/verify-post-import.ts -- --backup-file=backups/metadata/backup-2026-03-08.json
 *
 * Options:
 *   --backup-file=PATH    Path to backup file (required)
 *   --product-handle=X    Verify single product only (optional)
 *   --auto-restore=true   Auto-restore lost OPS fields (optional, dangerous)
 *
 * @see FIELD_OWNERSHIP.md - Section E: Safe Re-Import Strategy
 */

interface ProductMetadataBackup {
  id: string
  handle: string
  title: string
  metadata: Record<string, any>
}

interface BackupFile {
  exportDate: string
  exportTimestamp: number
  productCount: number
  products: ProductMetadataBackup[]
}

interface FieldViolation {
  productId: string
  productHandle: string
  field: string
  before: any
  after: any
  severity: "error" | "warning"
}

export default async function verifyPostImport({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const productService = container.resolve(Modules.PRODUCT)

  // Parse command-line arguments
  const args = process.argv.slice(2)
  const backupFilePath = args
    .find(arg => arg.startsWith("--backup-file="))
    ?.split("=")[1]
  const productHandle = args
    .find(arg => arg.startsWith("--product-handle="))
    ?.split("=")[1]
  const autoRestore = args
    .find(arg => arg.startsWith("--auto-restore="))
    ?.split("=")[1] === "true"

  // Validate arguments
  if (!backupFilePath) {
    logger.error("❌ Missing required argument: --backup-file=PATH")
    logger.info("Usage: npm run medusa exec scripts/verify-post-import.ts -- --backup-file=backups/metadata/backup-2026-03-08.json")
    process.exit(1)
  }

  // Resolve backup file path
  const resolvedBackupPath = path.isAbsolute(backupFilePath)
    ? backupFilePath
    : path.join(process.cwd(), backupFilePath)

  if (!fs.existsSync(resolvedBackupPath)) {
    logger.error(`❌ Backup file not found: ${resolvedBackupPath}`)
    process.exit(1)
  }

  logger.info("🔍 Verifying post-import metadata integrity...")
  logger.info(`   Backup: ${resolvedBackupPath}`)

  try {
    // Load backup file
    const backupData: BackupFile = JSON.parse(
      fs.readFileSync(resolvedBackupPath, "utf-8")
    )

    logger.info(`   Backup date: ${backupData.exportDate}`)
    logger.info(`   Products in backup: ${backupData.productCount}`)

    // Load ownership rules
    const { getOpsProtectedFieldsInMetadata, isOpsProtectedField } = await import("../lib/metadata-ownership")

    // Fetch current products
    const filter = productHandle ? { handle: productHandle } : {}
    const currentProducts = await productService.listProducts(filter, {
      select: ["id", "handle", "title", "metadata"],
      take: null
    })

    logger.info(`   Current products: ${currentProducts.length}`)

    // Build lookup map from backup
    const backupMap = new Map<string, ProductMetadataBackup>()
    backupData.products.forEach(p => {
      backupMap.set(p.id, p)
    })

    // Verify each product
    const violations: FieldViolation[] = []
    let productsChecked = 0
    let productsWithViolations = 0

    for (const currentProduct of currentProducts) {
      const backup = backupMap.get(currentProduct.id)

      if (!backup) {
        logger.info(`   ℹ️  Product ${currentProduct.handle} is new (not in backup)`)
        continue
      }

      productsChecked++

      const beforeMetadata = backup.metadata || {}
      const afterMetadata = currentProduct.metadata || {}

      // Get OPS fields from backup
      const opsFieldsInBackup = getOpsProtectedFieldsInMetadata(beforeMetadata)

      if (opsFieldsInBackup.length === 0) {
        // No OPS enrichment to preserve
        continue
      }

      // Check each OPS field
      let hasViolations = false

      for (const field of opsFieldsInBackup) {
        const beforeValue = beforeMetadata[field]
        const afterValue = afterMetadata[field]

        // Deep comparison
        const beforeJSON = JSON.stringify(beforeValue)
        const afterJSON = JSON.stringify(afterValue)

        if (beforeJSON !== afterJSON) {
          hasViolations = true
          violations.push({
            productId: currentProduct.id,
            productHandle: currentProduct.handle,
            field,
            before: beforeValue,
            after: afterValue,
            severity: afterValue === undefined ? "error" : "warning"
          })
        }
      }

      if (hasViolations) {
        productsWithViolations++
      }
    }

    // Report results
    logger.info("\n" + "=".repeat(60))

    if (violations.length === 0) {
      logger.info("✅ VERIFICATION PASSED")
      logger.info(`   ${productsChecked} products checked`)
      logger.info("   All OPS fields preserved successfully")
      logger.info("   No data loss detected")
      return { success: true, violations: [] }
    } else {
      logger.error("❌ VERIFICATION FAILED")
      logger.error(`   ${productsWithViolations} products have OPS field violations`)
      logger.error(`   ${violations.length} total field violations detected`)

      // Group violations by product
      const violationsByProduct = new Map<string, FieldViolation[]>()
      violations.forEach(v => {
        if (!violationsByProduct.has(v.productHandle)) {
          violationsByProduct.set(v.productHandle, [])
        }
        violationsByProduct.get(v.productHandle)!.push(v)
      })

      // Print violations
      logger.error("\nViolations:")
      violationsByProduct.forEach((productViolations, handle) => {
        logger.error(`\n  Product: ${handle}`)
        productViolations.forEach(v => {
          const severity = v.severity === "error" ? "❌" : "⚠️ "
          logger.error(`    ${severity} Field: ${v.field}`)
          if (v.after === undefined) {
            logger.error(`       LOST: Field was removed`)
            logger.error(`       Before: ${JSON.stringify(v.before).substring(0, 100)}`)
          } else {
            logger.error(`       MODIFIED: Value changed unexpectedly`)
            logger.error(`       Before: ${JSON.stringify(v.before).substring(0, 100)}`)
            logger.error(`       After:  ${JSON.stringify(v.after).substring(0, 100)}`)
          }
        })
      })

      // Auto-restore option
      if (autoRestore) {
        logger.warn("\n⚠️  AUTO-RESTORE mode enabled - restoring OPS fields...")

        for (const [handle, productViolations] of violationsByProduct) {
          const product = currentProducts.find(p => p.handle === handle)!
          const backup = backupMap.get(product.id)!

          // Restore OPS fields from backup
          const restoredMetadata = { ...product.metadata }
          productViolations.forEach(v => {
            restoredMetadata[v.field] = backup.metadata[v.field]
          })

          await productService.updateProducts(product.id, {
            metadata: restoredMetadata
          })

          logger.info(`   ✅ Restored ${productViolations.length} fields for: ${handle}`)
        }

        logger.info("\n✅ Auto-restore completed")
      } else {
        logger.error("\nTo restore from backup:")
        logger.error(`  npm run medusa exec scripts/verify-post-import.ts -- --backup-file=${backupFilePath} --auto-restore=true`)
      }

      return { success: false, violations }
    }
  } catch (error: any) {
    logger.error("❌ Verification failed:", error)
    throw error
  }
}
