import { ExecArgs } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  Modules,
} from "@medusajs/framework/utils"
import fs from 'fs'
import path from 'path'

/**
 * Script to export product media snapshot before purging
 *
 * Creates a JSON backup of all product and variant images, including:
 * - Product thumbnails and images
 * - Variant thumbnails and images (ManyToMany)
 * - Metadata.media, metadata.minioKeys, metadata.images if present
 *
 * Usage:
 *   DRY_RUN=true npm exec medusa exec ./src/scripts/medusa-export-product-media.ts
 *   npm exec medusa exec ./src/scripts/medusa-export-product-media.ts
 */

// ─── TypeScript Interfaces ───────────────────────────────────────────────────

interface MediaSnapshot {
  exportDate: string
  medusaVersion: string
  totalProducts: number
  totalImages: number
  products: ProductMediaSnapshot[]
}

interface ProductMediaSnapshot {
  id: string
  title: string
  handle: string
  status: string
  thumbnail: string | null
  images: ProductImageSnapshot[]
  variants: VariantMediaSnapshot[]
  metadata: {
    media?: any
    minioKeys?: string[]
    images?: any[]
    [key: string]: any
  }
}

interface ProductImageSnapshot {
  id: string
  url: string
  metadata: Record<string, any> | null
  rank: number | null
}

interface VariantMediaSnapshot {
  id: string
  title: string
  sku: string | null
  thumbnail: string | null
  images: ProductImageSnapshot[]
  metadata: {
    media?: any
    images?: any[]
    minioKeys?: string[]
    [key: string]: any
  }
}

// ─── Helper Functions ─────────────────────────────────────────────────────────

/**
 * Extract product media snapshot from product entity
 */
function extractProductMediaSnapshot(
  product: any,
  logger: any
): ProductMediaSnapshot {
  try {
    // Extract product images
    const images: ProductImageSnapshot[] = (product.images || []).map((img: any) => ({
      id: img.id,
      url: img.url,
      metadata: img.metadata || null,
      rank: img.rank || null,
    }))

    // Extract variant media (including ManyToMany image associations)
    const variants: VariantMediaSnapshot[] = (product.variants || []).map((variant: any) => ({
      id: variant.id,
      title: variant.title,
      sku: variant.sku || null,
      thumbnail: variant.thumbnail || null,

      // Variant-specific images (v2.11.2+ ManyToMany relationship)
      images: (variant.images || []).map((img: any) => ({
        id: img.id,
        url: img.url,
        metadata: img.metadata || null,
        rank: img.rank || null,
      })),

      metadata: {
        media: variant.metadata?.media,
        images: variant.metadata?.images,
        minioKeys: variant.metadata?.minioKeys,
        ...Object.fromEntries(
          Object.entries(variant.metadata || {}).filter(
            ([key]) => !['media', 'images', 'minioKeys'].includes(key)
          )
        )
      }
    }))

    return {
      id: product.id,
      title: product.title,
      handle: product.handle,
      status: product.status,
      thumbnail: product.thumbnail || null,
      images,
      variants,
      metadata: {
        media: product.metadata?.media,
        minioKeys: product.metadata?.minioKeys,
        images: product.metadata?.images,
        ...Object.fromEntries(
          Object.entries(product.metadata || {}).filter(
            ([key]) => !['media', 'images', 'minioKeys'].includes(key)
          )
        )
      }
    }
  } catch (error: any) {
    logger.error(`Error extracting snapshot for ${product.handle}: ${error.message}`)
    throw error
  }
}

/**
 * Generate timestamped filename
 */
function generateFilename(): string {
  const now = new Date()
  const date = now.toISOString().split('T')[0] // YYYY-MM-DD
  const time = now.toISOString().split('T')[1].split('.')[0].replace(/:/g, '-') // HH-MM-SS
  return `medusa-media-snapshot-${date}-${time}.json`
}

// ─── Main Script ──────────────────────────────────────────────────────────────

export default async function exportProductMedia({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const productModuleService = container.resolve(Modules.PRODUCT)

  // Environment variables
  const DRY_RUN = process.env.DRY_RUN === 'true'
  const BATCH_SIZE = parseInt(process.env.BATCH_SIZE || '50', 10)

  logger.info('='.repeat(70))
  logger.info(`📸 Product Media Snapshot Export${DRY_RUN ? ' [DRY RUN]' : ''}`)
  logger.info('='.repeat(70))
  logger.info(`Batch size: ${BATCH_SIZE}`)
  logger.info('')

  const startTime = Date.now()
  const allProductSnapshots: ProductMediaSnapshot[] = []
  let totalProductsProcessed = 0
  let totalImagesFound = 0
  let errorCount = 0

  try {
    // Pagination loop
    let offset = 0
    const limit = BATCH_SIZE

    while (true) {
      logger.info(`📦 Fetching products ${offset + 1}-${offset + limit}...`)

      const products = await productModuleService.listProducts(
        {},
        {
          relations: ["images", "variants", "variants.images"],
          take: limit,
          skip: offset
        }
      )

      if (products.length === 0) {
        logger.info('✓ No more products to process')
        break
      }

      logger.info(`   Found ${products.length} products in this batch\n`)

      // Process each product in the batch
      for (const product of products) {
        try {
          const snapshot = extractProductMediaSnapshot(product, logger)
          allProductSnapshots.push(snapshot)

          // Count images
          const productImageCount = snapshot.images.length
          const variantImageCount = snapshot.variants.reduce(
            (sum, v) => sum + v.images.length,
            0
          )
          const totalImages = productImageCount + variantImageCount

          totalImagesFound += totalImages
          totalProductsProcessed++

          // Log product details
          logger.info(`   ✓ ${snapshot.title} (${snapshot.handle})`)
          if (snapshot.thumbnail) {
            logger.info(`      - Thumbnail: ${snapshot.thumbnail.substring(0, 60)}...`)
          }
          if (productImageCount > 0) {
            logger.info(`      - Product images: ${productImageCount}`)
          }
          if (snapshot.variants.length > 0) {
            logger.info(`      - Variants: ${snapshot.variants.length}`)
            const variantsWithThumbs = snapshot.variants.filter(v => v.thumbnail).length
            if (variantsWithThumbs > 0) {
              logger.info(`      - Variant thumbnails: ${variantsWithThumbs}`)
            }
            if (variantImageCount > 0) {
              logger.info(`      - Variant images: ${variantImageCount}`)
            }
          }

        } catch (error: any) {
          logger.error(`   ✗ Failed to snapshot ${product.handle}: ${error.message}`)
          errorCount++
          // Continue with next product (don't fail entire batch)
        }
      }

      logger.info('') // Blank line between batches

      offset += products.length

      // Stop if we got less than requested (last page)
      if (products.length < limit) break
    }

    // Build final snapshot
    const snapshot: MediaSnapshot = {
      exportDate: new Date().toISOString(),
      medusaVersion: '2.13.1',
      totalProducts: allProductSnapshots.length,
      totalImages: totalImagesFound,
      products: allProductSnapshots
    }

    // Export to file
    const filename = generateFilename()
    const exportDir = path.join(process.cwd(), 'exports')
    const exportPath = path.join(exportDir, filename)

    if (!DRY_RUN) {
      // Create exports directory if needed
      if (!fs.existsSync(exportDir)) {
        fs.mkdirSync(exportDir, { recursive: true })
        logger.info(`📁 Created exports directory: ${exportDir}\n`)
      }

      // Write JSON file
      fs.writeFileSync(exportPath, JSON.stringify(snapshot, null, 2), 'utf-8')
      logger.info(`✅ Snapshot saved: ${exportPath}`)

      // Log file size
      const stats = fs.statSync(exportPath)
      const fileSizeMB = (stats.size / 1024 / 1024).toFixed(2)
      logger.info(`   File size: ${fileSizeMB} MB`)
    } else {
      logger.info(`[DRY RUN] Would save snapshot to: ${exportPath}`)
    }

    // Summary
    const elapsed = Date.now() - startTime
    logger.info('\n' + '='.repeat(70))
    logger.info('📊 SNAPSHOT SUMMARY')
    logger.info('='.repeat(70))
    logger.info(`Products processed: ${totalProductsProcessed}`)
    logger.info(`Total images found: ${totalImagesFound}`)
    logger.info(`  - Product images: ${allProductSnapshots.reduce((sum, p) => sum + p.images.length, 0)}`)
    logger.info(`  - Variant images: ${allProductSnapshots.reduce(
      (sum, p) => sum + p.variants.reduce((vSum, v) => vSum + v.images.length, 0),
      0
    )}`)
    logger.info(`Variants total: ${allProductSnapshots.reduce((sum, p) => sum + p.variants.length, 0)}`)
    logger.info(`Errors: ${errorCount}`)
    logger.info(`Time: ${(elapsed / 1000).toFixed(2)}s`)
    logger.info('='.repeat(70))

    if (!DRY_RUN) {
      logger.info(`\n💾 Snapshot saved successfully!`)
      logger.info(`\n💡 Next steps:`)
      logger.info(`   1. Verify snapshot: cat ${exportPath} | jq '.totalProducts, .totalImages'`)
      logger.info(`   2. Proceed with purge: npm exec medusa exec ./src/scripts/medusa-purge-product-media.ts`)
    } else {
      logger.info(`\n💡 To export for real:`)
      logger.info(`   npm exec medusa exec ./src/scripts/medusa-export-product-media.ts`)
    }

  } catch (error: any) {
    logger.error('\n❌ Error during snapshot export:')
    logger.error(error)
    throw error
  }
}
