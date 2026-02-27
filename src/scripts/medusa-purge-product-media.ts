import { ExecArgs } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  Modules,
} from "@medusajs/framework/utils"

/**
 * Script to purge all product and variant media references
 *
 * Removes:
 * - Product thumbnails and images
 * - Variant thumbnails and images (ManyToMany)
 * - Metadata fields: media, minioKeys, images
 *
 * SAFETY:
 * - DRY_RUN=true by default (requires explicit DRY_RUN=false to execute)
 * - 5-second countdown before live purge
 * - Error handling per product (continues on failure)
 *
 * Usage:
 *   npm exec medusa exec ./src/scripts/medusa-purge-product-media.ts  # Dry run
 *   DRY_RUN=false npm exec medusa exec ./src/scripts/medusa-purge-product-media.ts  # LIVE
 */

// ─── Statistics Interface ─────────────────────────────────────────────────────

interface PurgeStatistics {
  productThumbnailsCleared: number
  productImagesCleared: number
  variantThumbnailsCleared: number
  variantImagesCleared: number
  metadataFieldsRemoved: number
}

// ─── Helper Functions ─────────────────────────────────────────────────────────

/**
 * Purge variant media (thumbnails, images, metadata)
 */
async function purgeVariantMedia(
  productModuleService: any,
  variants: any[],
  stats: PurgeStatistics,
  dryRun: boolean,
  logger: any
): Promise<number> {
  let variantsModified = 0

  for (const variant of variants) {
    try {
      const variantUpdate: any = {}
      let hasChanges = false

      // 1. Clear variant thumbnail
      if (variant.thumbnail) {
        variantUpdate.thumbnail = null
        stats.variantThumbnailsCleared++
        hasChanges = true
      }

      // 2. Clear variant images (ManyToMany relationship v2.11.2+)
      if (variant.images && variant.images.length > 0) {
        variantUpdate.images = []
        stats.variantImagesCleared += variant.images.length
        hasChanges = true
      }

      // 3. Clean variant metadata
      const cleanedMetadata = { ...(variant.metadata || {}) }
      let metadataChanged = false

      for (const key of ['media', 'images', 'minioKeys']) {
        if (key in cleanedMetadata) {
          delete cleanedMetadata[key]
          metadataChanged = true
          stats.metadataFieldsRemoved++
        }
      }

      if (metadataChanged) {
        variantUpdate.metadata = cleanedMetadata
        hasChanges = true
      }

      // Update variant
      if (hasChanges) {
        if (!dryRun) {
          await productModuleService.updateProductVariants(variant.id, variantUpdate)
        }
        variantsModified++
      }

    } catch (error: any) {
      logger.error(`      ✗ Error purging variant ${variant.sku}: ${error.message}`)
    }
  }

  return variantsModified
}

// ─── Main Script ──────────────────────────────────────────────────────────────

export default async function purgeProductMedia({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const productModuleService = container.resolve(Modules.PRODUCT)

  // SAFETY: Default to dry run
  const DRY_RUN = process.env.DRY_RUN !== 'false'

  logger.info('='.repeat(70))
  if (DRY_RUN) {
    logger.warn('⚠️  DRY RUN MODE - No changes will be made')
    logger.warn('⚠️  Set DRY_RUN=false to execute real purge')
  } else {
    logger.warn('🔥 LIVE MODE - This will DELETE all product media!')
    logger.warn('Press Ctrl+C within 5 seconds to cancel...')
    await new Promise(resolve => setTimeout(resolve, 5000))
  }
  logger.info('='.repeat(70))
  logger.info('')

  const startTime = Date.now()
  let productsModified = 0
  let variantsModified = 0
  let errorCount = 0

  // Statistics
  const stats: PurgeStatistics = {
    productThumbnailsCleared: 0,
    productImagesCleared: 0,
    variantThumbnailsCleared: 0,
    variantImagesCleared: 0,
    metadataFieldsRemoved: 0,
  }

  try {
    // Fetch all products with relations
    logger.info('📦 Fetching all products with images and variants...')
    const products = await productModuleService.listProducts(
      {},
      {
        relations: ["images", "variants", "variants.images"],
      }
    )

    logger.info(`   Found ${products.length} products to process\n`)

    // Process each product
    for (const product of products) {
      try {
        logger.info(`📍 ${product.title} (${product.handle})`)

        // Build update payload
        const updateData: any = {}
        let hasChanges = false

        // 1. Clear product thumbnail
        if (product.thumbnail) {
          updateData.thumbnail = null
          stats.productThumbnailsCleared++
          hasChanges = true
          logger.info(`   - Clear thumbnail`)
        }

        // 2. Clear product images relationship
        if (product.images && product.images.length > 0) {
          updateData.images = []
          stats.productImagesCleared += product.images.length
          hasChanges = true
          logger.info(`   - Clear ${product.images.length} product images`)
        }

        // 3. Clean metadata
        const cleanedMetadata = { ...(product.metadata || {}) }
        let metadataChanged = false

        for (const key of ['media', 'minioKeys', 'images']) {
          if (key in cleanedMetadata) {
            delete cleanedMetadata[key]
            metadataChanged = true
            stats.metadataFieldsRemoved++
          }
        }

        if (metadataChanged) {
          updateData.metadata = cleanedMetadata
          hasChanges = true
          logger.info(`   - Clean metadata (removed media/minioKeys/images)`)
        }

        // 4. Update product
        if (hasChanges) {
          if (!DRY_RUN) {
            await productModuleService.updateProducts(product.id, updateData)
            logger.info(`   ✓ Product updated`)
          } else {
            logger.info(`   [DRY RUN] Would update product`)
          }
          productsModified++
        } else {
          logger.info(`   - No changes needed`)
        }

        // 5. Process variants
        if (product.variants && product.variants.length > 0) {
          logger.info(`   Processing ${product.variants.length} variants...`)

          const variantCount = await purgeVariantMedia(
            productModuleService,
            product.variants,
            stats,
            DRY_RUN,
            logger
          )

          if (variantCount > 0) {
            if (!DRY_RUN) {
              logger.info(`   ✓ ${variantCount} variants updated`)
            } else {
              logger.info(`   [DRY RUN] Would update ${variantCount} variants`)
            }
            variantsModified += variantCount
          } else {
            logger.info(`   - No variant changes needed`)
          }
        }

        logger.info('') // Blank line between products

      } catch (error: any) {
        logger.error(`❌ Error processing ${product.handle}: ${error.message}`)
        errorCount++
        // Continue with next product
      }
    }

    // Summary report
    const elapsed = Date.now() - startTime

    logger.info('\n' + '='.repeat(70))
    logger.info('📊 PURGE SUMMARY')
    logger.info('='.repeat(70))
    logger.info(`Mode: ${DRY_RUN ? 'DRY RUN (no changes made)' : 'LIVE (changes applied)'}`)
    logger.info(`\nProducts:`)
    logger.info(`  - Total: ${products.length}`)
    logger.info(`  - Modified: ${productsModified}`)
    logger.info(`  - Errors: ${errorCount}`)
    logger.info(`\nVariants:`)
    logger.info(`  - Modified: ${variantsModified}`)
    logger.info(`\nMedia Cleared:`)
    logger.info(`  - Product thumbnails: ${stats.productThumbnailsCleared}`)
    logger.info(`  - Product images: ${stats.productImagesCleared}`)
    logger.info(`  - Variant thumbnails: ${stats.variantThumbnailsCleared}`)
    logger.info(`  - Variant images: ${stats.variantImagesCleared}`)
    logger.info(`  - Metadata fields removed: ${stats.metadataFieldsRemoved}`)
    logger.info(`\nTime: ${(elapsed / 1000).toFixed(2)}s`)
    logger.info('='.repeat(70))

    if (DRY_RUN) {
      logger.info('\n💡 To execute real purge:')
      logger.info('   DRY_RUN=false npm exec medusa exec ./src/scripts/medusa-purge-product-media.ts')
    } else {
      logger.info('\n✅ Purge completed successfully!')
      logger.info('\n💡 Verify purge with SQL:')
      logger.info('   psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM product WHERE thumbnail IS NOT NULL"')
      logger.info('   psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM product_image"')
      logger.info('   psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM product_variant WHERE thumbnail IS NOT NULL"')
      logger.info('   psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM product_variant_product_image"')
    }

  } catch (error: any) {
    logger.error('\n❌ Error during purge:')
    logger.error(error)
    throw error
  }
}
