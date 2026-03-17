/**
 * Script: Enrichir les option values Music Shield avec metadata
 *
 * Ajoute des metadata techniques aux option values pour activer les tooltips
 * (hex colors, VLT, lens category, UV protection, etc.)
 *
 * Usage: npm run medusa exec ./scripts/add-music-shield-option-metadata.ts
 */

import { ExecArgs } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  Modules,
} from "@medusajs/framework/utils"
import { updateProductOptionsWorkflow } from "@medusajs/medusa/core-flows"

const MUSIC_SHIELD_HANDLE = 'music-shield';

// Metadata pour chaque option value
const FRAME_COLOR_METADATA: Record<string, any> = {
  'White': {
    hex: '#F5F5F5',
    finish: 'Glossy',
    display_name: 'Blanc brillant'
  },
  'Noir Mat': {
    hex: '#1a1a1a',
    finish: 'Matte',
    display_name: 'Noir mat'
  },
  'Black': {
    hex: '#000000',
    finish: 'Glossy',
    display_name: 'Noir brillant'
  },
  'Gold': {
    hex: '#D4AF37',
    finish: 'Glossy',
    display_name: 'Or brillant'
  }
};

const LENS_COLOR_METADATA: Record<string, any> = {
  'Fire (Red mirror)': {
    hex: '#DC143C',
    vlt: '15%',
    lens_category: 'Cat 3',
    uv_protection: 'UV 400',
    polarized: false,
    mirror_coating: true,
    lens_technology: 'HVL Prismatic Mirror - Rouge feu',
    display_name: 'Rouge feu miroir'
  },
  'Blue': {
    hex: '#1E90FF',
    vlt: '18%',
    lens_category: 'Cat 3',
    uv_protection: 'UV 400',
    polarized: false,
    mirror_coating: true,
    lens_technology: 'HVL Prismatic Mirror - Bleu océan',
    display_name: 'Bleu océan miroir'
  },
  'Gold': {
    hex: '#FFD700',
    vlt: '20%',
    lens_category: 'Cat 3',
    uv_protection: 'UV 400',
    polarized: false,
    mirror_coating: true,
    lens_technology: 'HVL Prismatic Mirror - Or',
    display_name: 'Or miroir'
  },
  'Smoke': {
    hex: '#696969',
    vlt: '12%',
    lens_category: 'Cat 3',
    uv_protection: 'UV 400',
    polarized: true,
    mirror_coating: false,
    lens_technology: 'Polarized Eclipse™ - Fumé',
    display_name: 'Fumé polarisé'
  }
};

export default async function enrichOptionValues({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const productService = container.resolve(Modules.PRODUCT)

  logger.info("🎨 ENRICHISSEMENT DES OPTION VALUES - MUSIC SHIELD")
  logger.info("=".repeat(70))

  // 1. Récupérer le produit Music Shield
  const products = await productService.listProducts(
    { handle: [MUSIC_SHIELD_HANDLE] },
    { relations: ['options', 'options.values'] }
  )

  if (products.length === 0) {
    logger.error('❌ Produit Music Shield non trouvé')
    return
  }

  const product = products[0] as any
  logger.info(`✅ Produit trouvé: ${product.title}`)
  logger.info(`📋 Options: ${product.options?.length || 0}`)

  // 2. Enrichir chaque option
  for (const option of product.options || []) {
    logger.info(`\n🔧 Option: "${option.title}" (${option.id})`)

    const metadataMap = option.title === 'Couleur monture'
      ? FRAME_COLOR_METADATA
      : LENS_COLOR_METADATA

    const currentValues = option.values || []
    logger.info(`   Valeurs actuelles: ${currentValues.length}`)

    // Enrichir les valeurs avec metadata
    const enrichedValues = currentValues.map((v: any) => {
      const metadata = metadataMap[v.value]

      if (!metadata) {
        logger.warn(`   ⚠️  Pas de metadata pour: ${v.value}`)
        return { id: v.id, value: v.value }
      }

      logger.info(`   📝 Enrichissement: ${v.value}`)
      if (metadata.vlt) {
        logger.info(`      - VLT: ${metadata.vlt}, Category: ${metadata.lensCategory}`)
        logger.info(`      - Technology: ${metadata.lensTechnology}`)
      } else {
        logger.info(`      - Finish: ${metadata.finish}, Hex: ${metadata.hex}`)
      }

      return {
        id: v.id,
        value: v.value,
        metadata: metadata
      }
    })

    // 3. Mettre à jour l'option avec les valeurs enrichies
    try {
      await updateProductOptionsWorkflow(container).run({
        input: {
          selector: { id: option.id },
          update: {
            values: enrichedValues
          }
        }
      })

      logger.info(`   ✅ Option mise à jour avec succès`)
    } catch (error: any) {
      logger.error(`   ❌ Erreur: ${error.message}`)
    }
  }

  logger.info("\n" + "=".repeat(70))
  logger.info("✅ ENRICHISSEMENT TERMINÉ")

  // 4. Vérification finale
  logger.info("\n📊 VÉRIFICATION FINALE")
  logger.info("=".repeat(70))

  const updatedProduct = await productService.retrieveProduct(product.id, {
    relations: ['options', 'options.values']
  }) as any

  for (const option of updatedProduct.options || []) {
    logger.info(`\n📋 ${option.title}:`)
    for (const value of option.values || []) {
      const hasMetadata = value.metadata && Object.keys(value.metadata).length > 0
      const metadataCount = hasMetadata ? Object.keys(value.metadata).length : 0
      logger.info(`   ${hasMetadata ? '✅' : '❌'} ${value.value} - ${hasMetadata ? `${metadataCount} metadata fields` : 'No metadata'}`)
    }
  }

  logger.info("\n" + "=".repeat(70))
  logger.info("✅ Script terminé. Rechargez le frontend pour voir les tooltips!")
  logger.info("=".repeat(70))
}
