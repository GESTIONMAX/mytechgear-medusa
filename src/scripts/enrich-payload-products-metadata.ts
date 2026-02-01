import { ExecArgs } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  Modules,
} from "@medusajs/framework/utils"

/**
 * Script d'enrichissement des metadata pour les produits Payload
 *
 * Les produits importés depuis Payload CMS ont des metadata minimales.
 * Ce script les enrichit avec des informations techniques pour permettre
 * l'auto-tagging et une meilleure catégorisation.
 *
 * Produits concernés (importés depuis Payload):
 * - Prime
 * - Dragon (⚠️ Différent du Dragon Chamelo)
 * - Falcon
 * - Euphoria
 * - Duck Classic
 */

export default async function enrichPayloadProductsMetadata({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const productModuleService = container.resolve(Modules.PRODUCT)

  logger.info("📝 Enriching metadata for Payload products...")

  try {
    // Mapping des enrichissements metadata par handle
    const metadataEnrichments: Record<string, any> = {
      // ========================================
      // PRIME
      // ========================================
      "prime": {
        brand: "Generic",
        product_family: "classic",
        has_audio: false,
        use_case: "Daily wear, casual",

        // Verres (estimations standard)
        uv_protection: "100%",
        lens_technology: "Standard tinted",

        // Design
        frame_style: "Classic",
        frame_material: "Plastic/Metal",

        // Specs basiques
        unisex: true,
        warranty_years: 1,

        // SEO
        seo_keywords: "lunettes classiques,prime,casual,protection UV",
      },

      // ========================================
      // DRAGON (Payload - ≠ Dragon Chamelo)
      // ========================================
      "dragon": {
        brand: "Generic",
        product_family: "classic",
        has_audio: false,
        use_case: "Daily wear, casual",

        // Note importante
        notes: "⚠️ Different from Chamelo Dragon (bestseller). This is a Payload import.",

        // Verres
        uv_protection: "100%",
        lens_technology: "Standard tinted",

        // Design
        frame_style: "Classic",
        frame_material: "Plastic/Metal",

        // Specs
        unisex: true,
        warranty_years: 1,

        // SEO
        seo_keywords: "lunettes dragon,classique,protection UV",
      },

      // ========================================
      // FALCON
      // ========================================
      "falcon": {
        brand: "Generic",
        product_family: "sport",
        has_audio: false,
        use_case: "Sport, outdoor activities",

        // Verres (sport)
        uv_protection: "100%",
        lens_technology: "Sport tinted",
        polarization: "Partial",

        // Design sport
        frame_style: "Sport wrap",
        frame_material: "Lightweight plastic",

        // Sport features
        sweatproof: true,
        impact_resistant: true,

        // Specs
        unisex: true,
        warranty_years: 1,

        // SEO
        seo_keywords: "lunettes sport,falcon,outdoor,running,protection UV",
      },

      // ========================================
      // EUPHORIA
      // ========================================
      "euphoria": {
        brand: "Generic",
        product_family: "lifestyle",
        has_audio: false,
        use_case: "Lifestyle, fashion, daily wear",

        // Verres
        uv_protection: "100%",
        lens_technology: "Fashion tinted",

        // Design lifestyle
        frame_style: "Fashion forward",
        frame_material: "Plastic",

        // Specs
        unisex: true,
        warranty_years: 1,

        // SEO
        seo_keywords: "lunettes mode,euphoria,lifestyle,tendance,protection UV",
      },

      // ========================================
      // DUCK CLASSIC
      // ========================================
      "duck-classic": {
        brand: "Generic",
        product_family: "classic",
        has_audio: false,
        use_case: "Daily wear, casual, classic style",

        // Verres
        uv_protection: "100%",
        lens_technology: "Classic tinted",

        // Design classique
        frame_style: "Classic timeless",
        frame_material: "Acetate",

        // Specs
        unisex: true,
        warranty_years: 1,

        // SEO
        seo_keywords: "lunettes classiques,duck,intemporel,protection UV,casual",
      },
    }

    let updatedCount = 0
    let notFoundCount = 0

    for (const [handle, enrichedMetadata] of Object.entries(metadataEnrichments)) {
      try {
        // Récupérer le produit
        const products = await productModuleService.listProducts({
          handle
        })

        if (products.length === 0) {
          logger.warn(`⏭️  Product "${handle}" not found, skipping`)
          notFoundCount++
          continue
        }

        const product = products[0]
        const currentMetadata = product.metadata || {}

        // Merger les metadata existantes avec les enrichissements
        const currentPrice = (currentMetadata as any).price
        const mergedMetadata = {
          ...currentMetadata,
          ...enrichedMetadata,
          // Garder les metadata importantes existantes
          ...(currentPrice && { price: currentPrice }),
          enriched_at: new Date().toISOString(),
        }

        // Mettre à jour le produit
        await productModuleService.updateProducts(product.id, {
          metadata: mergedMetadata
        })

        logger.info(`✓ ${product.title} - Metadata enriched`)
        logger.info(`   Added: ${Object.keys(enrichedMetadata).length} fields`)
        updatedCount++

      } catch (error: any) {
        logger.error(`✗ ${handle} - Error: ${error.message}`)
      }
    }

    // Résumé
    logger.info("\n" + "=".repeat(60))
    logger.info("✅ METADATA ENRICHMENT COMPLETED!")
    logger.info("=".repeat(60))
    logger.info(`\n📊 Statistics:`)
    logger.info(`   Products processed: ${Object.keys(metadataEnrichments).length}`)
    logger.info(`   Products updated: ${updatedCount}`)
    logger.info(`   Products not found: ${notFoundCount}`)

    logger.info("\n📝 Enriched products:")
    logger.info("   ✓ Prime - Classic daily wear")
    logger.info("   ✓ Dragon (Payload) - Classic (⚠️ ≠ Chamelo Dragon)")
    logger.info("   ✓ Falcon - Sport/outdoor")
    logger.info("   ✓ Euphoria - Lifestyle/fashion")
    logger.info("   ✓ Duck Classic - Classic timeless")

    logger.info("\n🏷️  Next step:")
    logger.info("   Run assign-product-tags.ts again to auto-tag with new metadata")

    logger.info("\n⚠️  Note:")
    logger.info("   Dragon (Payload) ≠ Dragon (Chamelo bestseller)")
    logger.info("   Chamelo Dragon will be imported as 'dragon-chamelo'")

  } catch (error) {
    logger.error("\n❌ Error enriching metadata:")
    logger.error(error)
    throw error
  }
}
