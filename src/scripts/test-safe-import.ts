import { ExecArgs } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  Modules,
} from "@medusajs/framework/utils"
import { preserveOpsFields, getOpsProtectedFieldsInMetadata, getOwnershipSummary } from "../lib/metadata-ownership"

/**
 * Test Safe Import Script
 *
 * Tests the safe merge logic on a single product before running full re-import.
 * This helps verify that OPS fields are preserved correctly.
 *
 * Usage:
 *   npm run medusa exec scripts/test-safe-import.ts -- --product-handle=shield
 *
 * Options:
 *   --product-handle=X    Product handle to test (required)
 *   --dry-run=true        Preview changes without applying (default: true)
 *
 * @see FIELD_OWNERSHIP.md - Section E: Safe Re-Import Strategy
 */

export default async function testSafeImport({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const productService = container.resolve(Modules.PRODUCT)

  // Parse arguments
  const args = process.argv.slice(2)
  const productHandle = args
    .find(arg => arg.startsWith("--product-handle="))
    ?.split("=")[1]
  const dryRun = args
    .find(arg => arg.startsWith("--dry-run="))
    ?.split("=")[1] !== "false" // Default to true

  if (!productHandle) {
    logger.error("❌ Missing required argument: --product-handle=X")
    logger.info("Usage: npm run medusa exec scripts/test-safe-import.ts -- --product-handle=shield")
    process.exit(1)
  }

  logger.info("🧪 Testing safe import on single product...")
  logger.info(`   Product: ${productHandle}`)
  logger.info(`   Mode: ${dryRun ? "DRY RUN (preview only)" : "LIVE (will apply changes)"}`)

  try {
    // Fetch the product
    const products = await productService.listProducts(
      { handle: productHandle },
      { select: ["id", "handle", "title", "metadata"], take: 1 }
    )

    if (products.length === 0) {
      logger.error(`❌ Product not found: ${productHandle}`)
      process.exit(1)
    }

    const product = products[0]
    const existingMetadata = product.metadata || {}

    logger.info(`\n✅ Product found: ${product.title}`)
    logger.info(`   ID: ${product.id}`)

    // Analyze current metadata
    logger.info("\n📊 Current Metadata Analysis:")
    const summary = getOwnershipSummary(existingMetadata)
    logger.info(`   Total fields: ${summary.totalFields}`)
    logger.info(`   PIM fields: ${summary.pimFields.length}`)
    logger.info(`   OPS fields: ${summary.opsFields.length}`)
    logger.info(`   Unknown fields: ${summary.unknownFields.length}`)

    // Show OPS fields
    const opsFields = getOpsProtectedFieldsInMetadata(existingMetadata)
    if (opsFields.length > 0) {
      logger.info("\n🎯 OPS-Protected Fields Found:")
      opsFields.forEach(field => {
        const value = existingMetadata[field]
        const preview = typeof value === 'object'
          ? `${Array.isArray(value) ? `Array(${value.length})` : 'Object'}`
          : JSON.stringify(value).substring(0, 50)
        logger.info(`   - ${field}: ${preview}`)
      })
    } else {
      logger.info("\n ℹ️  No OPS enrichment found (product has only PIM data)")
    }

    // Simulate new PIM data
    logger.info("\n🔧 Simulating PIM Re-Import...")
    const simulatedPimData = {
      // Keep existing PIM fields
      brand: existingMetadata.brand || "TestBrand",
      product_family: existingMetadata.product_family || "test",
      weight_grams: existingMetadata.weight_grams ? existingMetadata.weight_grams + 1 : 50, // Simulate change
      battery_mah: existingMetadata.battery_mah ? existingMetadata.battery_mah + 10 : 180, // Simulate change
      // Add some new PIM fields
      test_field: "This is a test field added by PIM",
    }

    logger.info("   Simulated PIM changes:")
    logger.info(`   - weight_grams: ${existingMetadata.weight_grams} → ${simulatedPimData.weight_grams}`)
    logger.info(`   - battery_mah: ${existingMetadata.battery_mah} → ${simulatedPimData.battery_mah}`)
    logger.info(`   - test_field: (new) → ${simulatedPimData.test_field}`)

    // Perform safe merge
    logger.info("\n🔀 Performing Safe Merge...")
    const mergedMetadata = preserveOpsFields(
      existingMetadata,
      simulatedPimData,
      "test-safe-import"
    )

    // Analyze merged metadata
    logger.info("\n📊 Merged Metadata Analysis:")
    const mergedSummary = getOwnershipSummary(mergedMetadata)
    logger.info(`   Total fields: ${mergedSummary.totalFields}`)
    logger.info(`   PIM fields: ${mergedSummary.pimFields.length}`)
    logger.info(`   OPS fields: ${mergedSummary.opsFields.length}`)

    // Verify OPS fields preserved
    logger.info("\n✅ Verification:")
    let allPreserved = true

    for (const field of opsFields) {
      const beforeValue = JSON.stringify(existingMetadata[field])
      const afterValue = JSON.stringify(mergedMetadata[field])

      if (beforeValue === afterValue) {
        logger.info(`   ✅ ${field}: Preserved`)
      } else {
        logger.error(`   ❌ ${field}: MODIFIED (DATA LOSS!)`)
        logger.error(`      Before: ${beforeValue.substring(0, 100)}`)
        logger.error(`      After: ${afterValue.substring(0, 100)}`)
        allPreserved = false
      }
    }

    // Show PIM tracking
    if (mergedMetadata.pim) {
      logger.info("\n📝 PIM Tracking Metadata:")
      logger.info(`   - import_source: ${mergedMetadata.pim.import_source}`)
      logger.info(`   - last_import: ${mergedMetadata.pim.last_import}`)
      if (mergedMetadata.pim.import_timestamp) {
        logger.info(`   - import_timestamp: ${mergedMetadata.pim.import_timestamp}`)
      }
    }

    // Apply changes if not dry run
    if (!dryRun) {
      logger.info("\n💾 Applying changes to database...")

      await productService.updateProducts(product.id, {
        metadata: mergedMetadata
      })

      logger.info("   ✅ Changes applied successfully")
    } else {
      logger.info("\n🔍 DRY RUN: No changes applied")
      logger.info("   To apply changes, run with: --dry-run=false")
    }

    // Final summary
    logger.info("\n" + "=".repeat(60))
    if (allPreserved) {
      logger.info("✅ TEST PASSED")
      logger.info("   All OPS fields would be preserved during re-import")
      logger.info("   Safe to proceed with full import")
    } else {
      logger.error("❌ TEST FAILED")
      logger.error("   Some OPS fields would be LOST during re-import")
      logger.error("   DO NOT proceed with full import until this is fixed")
    }

    return {
      success: allPreserved,
      product: {
        id: product.id,
        handle: product.handle,
        title: product.title
      },
      opsFieldsPreserved: allPreserved,
      opsFieldCount: opsFields.length,
      dryRun
    }
  } catch (error: any) {
    logger.error("❌ Test failed:", error)
    throw error
  }
}
