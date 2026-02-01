import { ExecArgs } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  Modules,
} from "@medusajs/framework/utils"
import fs from 'fs'
import path from 'path'

/**
 * Script d'upload des images produits vers Medusa
 *
 * Utilise le mapping généré par fetch-shopify-images.ts pour :
 * 1. Lire les images téléchargées localement
 * 2. Uploader chaque image via l'API Medusa File
 * 3. Associer thumbnail + galerie à chaque produit
 *
 * Prérequis: Avoir exécuté fetch-shopify-images.ts avant
 */

const IMAGES_DIR = './images/chamelo'
const MAPPING_FILE = './images/image-mapping.json'

// Mapping des handles Shopify → handles Medusa
// Les handles Shopify sont très longs (ex: music-shield-fire-lenses-sports-smart-glasses...)
// Les handles Medusa sont courts (ex: music-shield)
const HANDLE_MAPPING: Record<string, string> = {
  // AURA (Prismatic)
  'aura-energy-black-gold-instant-color-changing-glasses': 'aura',
  'aura-energy-white-silver-instant-color-changing-glasses': 'aura',
  'aura-calm-black-gold-instant-color-changing-sunglasses': 'aura',
  'aura-calm-white-silver-instant-color-changing-sunglasses': 'aura',

  // AURA AUDIO (Prismatic + Audio)
  'aura-audio-energy-black-gold-instant-color-changing-glasses': 'aura-audio',
  'aura-audio-energy-white-instant-color-changing-glasses': 'aura-audio',
  'aura-audio-calm-black-gold-instant-color-changing-sunglasses': 'aura-audio',
  'aura-audio-calm-white-silver-instant-color-changing-sunglasses': 'aura-audio',

  // SHIELD (Sport Electrochromic)
  'shield-fire-lenses-sports-smart-glasses-electrochromic-tint-adjustable-changing-sunglasses': 'shield',
  'shield-black': 'shield',

  // MUSIC SHIELD (Sport + Audio)
  'music-shield-fire-lenses-sports-smart-glasses-electrochromic-tint-adjustable-changing-audio-sunglasses': 'music-shield',
  'music-shield-smoke-lenses-sports-smart-glasses-electrochromic-tint-adjustable-changing-audio-sunglasses': 'music-shield',
  'music-shield-white-frame-fire-lenses-sports-smart-glasses-electrochromic-tint-adjustable-changing-audio-sunglasses': 'music-shield',

  // ZURIX (Lightweight)
  'zurix-lightweight-tap-to-tint-new-release': 'zurix',

  // VEIL (Cat-Eye)
  'veil-modern-tint-adjustable-cateye-sunglasses': 'veil',

  // DUSK CLASSIC (Lifestyle Audio)
  'dusk-lifestyle-smart-glasses-electrochromic-tint-adjustable-audio-sunglasses': 'dusk-classic',

  // INFINITY (Lifestyle + Audio)
  'infinity-sunglasses-instant-tint-bluetooth-audio-smart-glasses': 'infinity',

  // MR1 x INFINITY (Limited Edition)
  'mr1-infinity-sunglasses-instant-tint-bluetooth-audio-smart-glasses': 'mr1-infinity',

  // AROZA (Goggles)
  'aroza-first-goggles-with-instant-electronic-tint-control': 'aroza',

  // DRAGON CHAMELO (Premium Metal)
  'dragon-metal-sunglasses-electronic-tint-adjustable-premium-eyewear': 'dragon-chamelo',
}

interface ImageMapping {
  [handle: string]: string[]
}

/**
 * Trouve le handle Medusa correspondant à un handle Shopify
 * Utilise le mapping défini ou une recherche par préfixe
 */
function findMedusaHandle(shopifyHandle: string): string | null {
  // 1. Vérifier le mapping exact
  if (HANDLE_MAPPING[shopifyHandle]) {
    return HANDLE_MAPPING[shopifyHandle]
  }

  // 2. Fallback : extraire le préfixe (ex: "falcon-ice-frames..." → "falcon")
  // (pour gérer les cas non mappés)
  const prefix = shopifyHandle.split('-')[0]
  return prefix
}

export default async function uploadProductImages({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const productModuleService = container.resolve(Modules.PRODUCT)
  const fileModuleService = container.resolve(Modules.FILE)

  logger.info("📤 Uploading product images to Medusa...\n")

  try {
    // 1. Vérifier que les fichiers existent
    if (!fs.existsSync(MAPPING_FILE)) {
      throw new Error(`Mapping file not found: ${MAPPING_FILE}\n\nRun fetch-shopify-images.ts first!`)
    }

    if (!fs.existsSync(IMAGES_DIR)) {
      throw new Error(`Images directory not found: ${IMAGES_DIR}\n\nRun fetch-shopify-images.ts first!`)
    }

    // 2. Charger le mapping
    const mapping: ImageMapping = JSON.parse(fs.readFileSync(MAPPING_FILE, 'utf-8'))
    logger.info(`📋 Loaded mapping for ${Object.keys(mapping).length} products\n`)

    // 3. Récupérer tous les produits Medusa
    const products = await productModuleService.listProducts({})
    logger.info(`📦 Found ${products.length} products in Medusa\n`)

    let productsUpdated = 0
    let imagesUploaded = 0
    let productsSkipped = 0

    // 4. Pour chaque produit Medusa
    for (const product of products) {
      const handle = product.handle

      if (!handle) {
        logger.warn(`⏭️  Product "${product.title}" has no handle, skipping`)
        productsSkipped++
        continue
      }

      // Trouver TOUS les handles Shopify qui correspondent à ce produit Medusa
      const matchingShopifyHandles: string[] = []
      const allImageFiles: string[] = []

      for (const shopifyHandle of Object.keys(mapping)) {
        const medusaHandle = findMedusaHandle(shopifyHandle)

        if (medusaHandle === handle) {
          matchingShopifyHandles.push(shopifyHandle)
          allImageFiles.push(...mapping[shopifyHandle])
        }
      }

      if (allImageFiles.length === 0) {
        logger.warn(`⏭️  ${product.title} (${handle}) - No images in mapping`)
        productsSkipped++
        continue
      }

      logger.info(`📦 ${product.title} (${handle})`)
      logger.info(`   Matching Shopify handles: ${matchingShopifyHandles.length}`)
      matchingShopifyHandles.forEach(h => logger.info(`      - ${h}`))
      logger.info(`   Total images to upload: ${allImageFiles.length}`)

      const uploadedImageUrls: string[] = []

      // 5. Uploader chaque image
      for (let i = 0; i < allImageFiles.length; i++) {
        const filename = allImageFiles[i]
        const filepath = path.join(IMAGES_DIR, filename)

        if (!fs.existsSync(filepath)) {
          logger.warn(`   ✗ ${filename} - File not found`)
          continue
        }

        try {
          // Lire le fichier
          const fileBuffer = fs.readFileSync(filepath)

          // Créer le fichier dans Medusa File Module
          const createdFile = await fileModuleService.createFiles({
            filename: filename,
            mimeType: `image/${path.extname(filename).substring(1).toLowerCase()}`,
            content: fileBuffer.toString('base64'),
          })

          if (createdFile && createdFile.url) {
            uploadedImageUrls.push(createdFile.url)
            logger.info(`   ✓ ${filename} → ${createdFile.url}`)
            imagesUploaded++
          }

        } catch (error: any) {
          logger.error(`   ✗ ${filename} - Upload error: ${error.message}`)
        }
      }

      // 6. Associer les images au produit
      if (uploadedImageUrls.length > 0) {
        try {
          await productModuleService.updateProducts(product.id, {
            thumbnail: uploadedImageUrls[0], // Première image = thumbnail
            images: uploadedImageUrls.map((url, index) => ({
              url,
              metadata: {
                alt: `${product.title} - Image ${index + 1}`,
                order: index,
              }
            }))
          })

          logger.info(`   ✅ Product updated: thumbnail + ${uploadedImageUrls.length} images`)
          productsUpdated++

        } catch (error: any) {
          logger.error(`   ✗ Error updating product: ${error.message}`)
        }
      } else {
        logger.warn(`   ⚠️  No images uploaded for this product`)
      }

      logger.info('') // Blank line
    }

    // 7. Résumé
    logger.info('='.repeat(60))
    logger.info('✅ IMAGE UPLOAD COMPLETED!')
    logger.info('='.repeat(60))
    logger.info(`\n📊 Statistics:`)
    logger.info(`   Products processed: ${products.length}`)
    logger.info(`   Products updated: ${productsUpdated}`)
    logger.info(`   Products skipped: ${productsSkipped}`)
    logger.info(`   Images uploaded: ${imagesUploaded}`)

    logger.info(`\n🌐 Admin URL:`)
    logger.info(`   Products: http://localhost:9000/app/products`)

    logger.info(`\n💡 Next steps:`)
    logger.info(`   1. Verify images in admin`)
    logger.info(`   2. Adjust thumbnails if needed`)
    logger.info(`   3. Add alt text for SEO (optional)`)

  } catch (error) {
    logger.error("\n❌ Error uploading images:")
    logger.error(error)
    throw error
  }
}
