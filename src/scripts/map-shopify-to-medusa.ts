import { ExecArgs } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  Modules,
} from "@medusajs/framework/utils"
import fs from 'fs'

/**
 * Script de vérification du mapping Shopify → Medusa
 *
 * Analyse et affiche :
 * 1. Tous les produits Medusa avec leur handle
 * 2. Tous les produits Shopify (dans le mapping) avec images
 * 3. La correspondance automatique
 * 4. Les produits Medusa sans images disponibles
 * 5. Les images Shopify sans produit Medusa correspondant
 *
 * Utile pour vérifier AVANT d'exécuter upload-product-images.ts
 */

const MAPPING_FILE = './images/image-mapping.json'

// Mapping des handles Chamelo → handles Medusa
const HANDLE_MAPPING: Record<string, string> = {
  // Chamelo products (same handles)
  'aura': 'aura',
  'aura-audio': 'aura-audio',
  'shield': 'shield',
  'music-shield': 'music-shield',
  'zurix': 'zurix',
  'veil': 'veil',
  'dusk-classic': 'dusk-classic',
  'infinity': 'infinity',
  'mr1-infinity': 'mr1-infinity',
  'aroza': 'aroza',

  // Dragon Chamelo → dragon-chamelo
  'dragon': 'dragon-chamelo',
}

interface ImageMapping {
  [handle: string]: string[]
}

export default async function mapShopifyToMedusa({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const productModuleService = container.resolve(Modules.PRODUCT)

  logger.info("🗺️  Shopify → Medusa Mapping Verification\n")

  try {
    // 1. Charger le mapping Shopify
    if (!fs.existsSync(MAPPING_FILE)) {
      logger.warn(`⚠️  Mapping file not found: ${MAPPING_FILE}`)
      logger.info(`\nRun this first: node src/scripts/fetch-shopify-images.ts\n`)
      return
    }

    const shopifyMapping: ImageMapping = JSON.parse(fs.readFileSync(MAPPING_FILE, 'utf-8'))
    const shopifyHandles = Object.keys(shopifyMapping)

    logger.info(`📋 Shopify mapping loaded: ${shopifyHandles.length} products\n`)

    // 2. Récupérer tous les produits Medusa
    const products = await productModuleService.listProducts({})
    logger.info(`📦 Medusa products: ${products.length} products\n`)

    // 3. Analyser la correspondance
    logger.info('='.repeat(80))
    logger.info('MAPPING ANALYSIS')
    logger.info('='.repeat(80))

    const matched: Array<{ medusa: string, shopify: string, images: number }> = []
    const medusaWithoutImages: string[] = []
    const shopifyWithoutProduct: string[] = []

    // Pour chaque produit Medusa
    for (const product of products) {
      const medusaHandle = product.handle

      if (!medusaHandle) {
        logger.warn(`⚠️  Product "${product.title}" has no handle`)
        continue
      }

      // Trouver le handle Shopify correspondant
      let shopifyHandle = medusaHandle

      // Check si le handle Medusa est dans les valeurs du HANDLE_MAPPING
      const reverseMapping = Object.entries(HANDLE_MAPPING).find(
        ([_, mappedHandle]) => mappedHandle === medusaHandle
      )

      if (reverseMapping) {
        shopifyHandle = reverseMapping[0]
      }

      // Vérifier si des images existent
      const images = shopifyMapping[shopifyHandle]

      if (images && images.length > 0) {
        matched.push({
          medusa: medusaHandle,
          shopify: shopifyHandle,
          images: images.length
        })
      } else {
        medusaWithoutImages.push(medusaHandle)
      }
    }

    // Trouver les handles Shopify sans produit Medusa
    for (const shopifyHandle of shopifyHandles) {
      const medusaHandle = HANDLE_MAPPING[shopifyHandle] || shopifyHandle

      const productExists = products.some(p => p.handle === medusaHandle)

      if (!productExists) {
        shopifyWithoutProduct.push(shopifyHandle)
      }
    }

    // 4. Afficher les résultats
    logger.info('\n✅ MATCHED PRODUCTS (will be updated)')
    logger.info('-'.repeat(80))
    if (matched.length > 0) {
      matched.forEach(({ medusa, shopify, images }) => {
        const arrow = medusa === shopify ? '═' : '→'
        logger.info(`   ${shopify.padEnd(25)} ${arrow} ${medusa.padEnd(25)} (${images} images)`)
      })
    } else {
      logger.info('   None')
    }

    logger.info(`\n⚠️  MEDUSA PRODUCTS WITHOUT IMAGES (will be skipped)`)
    logger.info('-'.repeat(80))
    if (medusaWithoutImages.length > 0) {
      medusaWithoutImages.forEach(handle => {
        logger.info(`   ⏭️  ${handle}`)
      })
      logger.info(`\n   💡 These products are from Payload CMS or have different handles`)
    } else {
      logger.info('   None - All products have images!')
    }

    logger.info(`\n📦 SHOPIFY PRODUCTS WITHOUT MEDUSA MATCH (unused images)`)
    logger.info('-'.repeat(80))
    if (shopifyWithoutProduct.length > 0) {
      shopifyWithoutProduct.forEach(handle => {
        const imageCount = shopifyMapping[handle]?.length || 0
        logger.info(`   📸 ${handle} (${imageCount} images)`)
      })
      logger.info(`\n   💡 These are extra Shopify products not imported in Medusa`)
    } else {
      logger.info('   None - All Shopify images have matching products!')
    }

    // 5. Résumé
    logger.info('\n' + '='.repeat(80))
    logger.info('📊 SUMMARY')
    logger.info('='.repeat(80))
    logger.info(`\nMedusa products: ${products.length}`)
    logger.info(`   ✅ With images: ${matched.length}`)
    logger.info(`   ⏭️  Without images: ${medusaWithoutImages.length}`)

    logger.info(`\nShopify products: ${shopifyHandles.length}`)
    logger.info(`   ✅ Matched: ${matched.length}`)
    logger.info(`   📦 Unmatched: ${shopifyWithoutProduct.length}`)

    const totalImages = Object.values(shopifyMapping).flat().length
    logger.info(`\nTotal images ready: ${totalImages}`)

    // 6. Recommandations
    logger.info('\n' + '='.repeat(80))
    logger.info('💡 NEXT STEPS')
    logger.info('='.repeat(80))

    if (matched.length > 0) {
      logger.info(`\n✅ Ready to upload!`)
      logger.info(`   Run: npx medusa exec ./src/scripts/upload-product-images.ts`)
      logger.info(`   This will update ${matched.length} products with ${totalImages} images`)
    } else {
      logger.warn(`\n⚠️  No products matched!`)
      logger.info(`   Verify handle mapping in upload-product-images.ts`)
    }

    if (medusaWithoutImages.length > 0) {
      logger.info(`\n⚠️  ${medusaWithoutImages.length} products won't get images`)
      logger.info(`   These are likely Payload products or need manual images`)
    }

    if (shopifyWithoutProduct.length > 0) {
      logger.info(`\n📦 ${shopifyWithoutProduct.length} Shopify products not in catalog`)
      logger.info(`   Consider importing them if needed`)
    }

  } catch (error) {
    logger.error("\n❌ Error analyzing mapping:")
    logger.error(error)
    throw error
  }
}
