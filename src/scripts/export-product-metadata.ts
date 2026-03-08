import { ExecArgs } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  Modules,
} from "@medusajs/framework/utils"
import * as fs from "fs"
import * as path from "path"

/**
 * Export Product Metadata Backup Script
 *
 * Exports all product metadata to a JSON file for backup purposes.
 * Use this before running PIM re-imports to ensure data can be restored.
 *
 * Usage:
 *   npm run medusa exec scripts/export-product-metadata.ts
 *
 * Output:
 *   backups/metadata/backup-YYYYMMDD-HHMMSS.json
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

export default async function exportProductMetadata({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const productService = container.resolve(Modules.PRODUCT)

  logger.info("📦 Exporting product metadata for backup...")

  try {
    // Fetch all products with metadata
    const products = await productService.listProducts(
      {},
      {
        select: ["id", "handle", "title", "metadata"],
        take: null // Get all products
      }
    )

    logger.info(`Found ${products.length} products to export`)

    // Build backup data structure
    const backup: BackupFile = {
      exportDate: new Date().toISOString(),
      exportTimestamp: Date.now(),
      productCount: products.length,
      products: products.map(product => ({
        id: product.id,
        handle: product.handle,
        title: product.title,
        metadata: product.metadata || {}
      }))
    }

    // Create backups directory if it doesn't exist
    const backupsDir = path.join(process.cwd(), "backups", "metadata")
    if (!fs.existsSync(backupsDir)) {
      fs.mkdirSync(backupsDir, { recursive: true })
      logger.info(`Created backups directory: ${backupsDir}`)
    }

    // Generate filename with timestamp
    const timestamp = new Date()
      .toISOString()
      .replace(/:/g, "-")
      .replace(/\..+/, "")
    const filename = `backup-${timestamp}.json`
    const filepath = path.join(backupsDir, filename)

    // Write backup file
    fs.writeFileSync(filepath, JSON.stringify(backup, null, 2), "utf-8")

    // Calculate file size
    const stats = fs.statSync(filepath)
    const fileSizeMB = (stats.size / 1024 / 1024).toFixed(2)

    logger.info("✅ Metadata backup completed successfully")
    logger.info(`   File: ${filepath}`)
    logger.info(`   Size: ${fileSizeMB} MB`)
    logger.info(`   Products: ${products.length}`)

    // Print summary of OPS-enriched products
    const { getOpsProtectedFieldsInMetadata } = await import("../lib/metadata-ownership")

    const enrichedProducts = products.filter(p =>
      getOpsProtectedFieldsInMetadata(p.metadata || {}).length > 0
    )

    if (enrichedProducts.length > 0) {
      logger.info(`   OPS-enriched products: ${enrichedProducts.length}`)
      logger.warn("⚠️  These products have OPS enrichment that must be preserved during re-import")

      // Show examples
      const examples = enrichedProducts.slice(0, 3)
      examples.forEach(p => {
        const opsFields = getOpsProtectedFieldsInMetadata(p.metadata || {})
        logger.info(`      - ${p.handle}: ${opsFields.join(", ")}`)
      })

      if (enrichedProducts.length > 3) {
        logger.info(`      ... and ${enrichedProducts.length - 3} more`)
      }
    }

    // Output to stdout for piping
    console.log(JSON.stringify(backup, null, 2))

    return {
      success: true,
      filepath,
      productCount: products.length,
      enrichedProductCount: enrichedProducts.length
    }
  } catch (error: any) {
    logger.error("❌ Failed to export product metadata:", error)
    throw error
  }
}
