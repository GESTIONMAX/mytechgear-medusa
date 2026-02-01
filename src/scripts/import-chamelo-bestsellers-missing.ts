import { ExecArgs } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  ProductStatus,
} from "@medusajs/framework/utils"
import {
  createProductsWorkflow,
} from "@medusajs/medusa/core-flows"

/**
 * Script d'importation des bestsellers Chamelo manquants
 *
 * Source: https://chamelo.com/collections/best-sellers (analysé le 2026-02-01)
 *
 * Produits importés:
 * 1. Aroza ($349) - Next-gen goggles avec teinte électronique instantanée
 * 2. Dragon ($260) - Lunettes métal premium avec teinte électronique
 *
 * Ces deux produits sont dans le Top 10 des bestsellers Chamelo
 * mais étaient manquants dans notre catalogue initial.
 */

export default async function importChameloBestsellersMissing({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)

  logger.info("📦 Importing missing Chamelo bestsellers (Aroza, Dragon)...")

  // IDs de collections et catégories existantes
  const SPORT_COLLECTION_ID = "pcol_01KGBSKFHEFEZEE61CW8SESSSE"
  const LIFESTYLE_COLLECTION_ID = "pcol_01KGBSKFHEVTNXE9ZG2HBC4QZ8"
  const SPORT_CATEGORY_ID = "pcat_01KGBS24KG6YME924C8WKMV3X0"
  const LIFESTYLE_CATEGORY_ID = "pcat_01KGBS24KF2J4JKHEF7MZ2EGVN"

  // Taux de conversion USD → EUR
  const USD_TO_EUR = 0.92
  const MARGIN_MULTIPLIER = 1.15

  const convertPrice = (usd: number): number => {
    return Math.round(usd * USD_TO_EUR * MARGIN_MULTIPLIER * 100)
  }

  // Définition des produits
  const products = [
    {
      // ========================================
      // AROZA (Sport Goggles) - 349 USD
      // ========================================
      title: "Aroza",
      handle: "aroza",
      subtitle: "Next-gen goggles à teinte électronique instantanée",
      description: `Les premières lunettes-masque au monde avec technologie de teinte électronique instantanée.

Design goggle révolutionnaire combinant protection maximale et contrôle électronique de la teinte pour des performances optimales en toutes conditions.

Parfait pour les sports extrêmes : ski, snowboard, VTT, motocross. Teinte ajustable instantanément pour s'adapter à la luminosité.`,

      status: ProductStatus.PUBLISHED,
      collection_id: SPORT_COLLECTION_ID,
      category_ids: [SPORT_CATEGORY_ID],

      metadata: {
        // Identification
        brand: "Chamelo",
        product_family: "aroza",
        has_audio: false,
        bestseller: true,
        bestseller_rank: 5, // 5ème position dans bestsellers

        // Type de produit
        product_type: "Goggles",
        use_case: "Extreme sports, skiing, snowboarding, mountain biking",

        // Verres et technologie
        lens_technology: "Electrochromic Tint-Adjustable",
        tint_adjustment_speed_seconds: 0.1,
        uv_protection: "100%",

        // Design
        frame_style: "Sport goggles",
        design_notes: "First-of-its-kind goggle design with electronic tint",

        // Conformité UE
        warranty_years: 2,
        ce_certified: true,

        // SEO
        seo_keywords: "lunettes masque,goggles électroniques,ski,snowboard,VTT,teinte ajustable,sport extrême",
      },

      options: [
        {
          title: "Couleur",
          values: ["Default"]
        }
      ],

      variants: [
        {
          title: "Aroza - Default",
          sku: "ARZ-DEF",
          manage_inventory: true,
          inventory_quantity: 0,
          options: {
            "Couleur": "Default"
          },
          prices: [{ amount: convertPrice(349), currency_code: "eur" }],
        },
      ]
    },

    {
      // ========================================
      // DRAGON (Lifestyle Premium) - 260 USD
      // ========================================
      title: "Dragon",
      handle: "dragon-chamelo",
      subtitle: "Lunettes métal premium à teinte électronique",
      description: `Go bold. Go dark. Go Dragon.

Collection designer premium avec monture en métal haut de gamme et technologie de teinte électronique sophistiquée.

Style urbain affirm avec matériaux nobles et contrôle électronique de la teinte pour une élégance technique sans compromis.`,

      status: ProductStatus.PUBLISHED,
      collection_id: LIFESTYLE_COLLECTION_ID,
      category_ids: [LIFESTYLE_CATEGORY_ID],

      metadata: {
        // Identification
        brand: "Chamelo",
        product_family: "dragon",
        has_audio: false,
        bestseller: true,
        bestseller_rank: 7, // 7ème position dans bestsellers

        // Type de produit
        product_type: "Premium Designer Sunglasses",
        use_case: "Lifestyle, urban fashion, daily wear",

        // Verres et technologie
        lens_technology: "Electrochromic Tint-Adjustable",
        tint_adjustment_speed_seconds: 0.1,
        uv_protection: "100%",

        // Matériaux
        frame_material: "Premium metal",
        frame_finish: "Glossy Black/Gold",
        design_quality: "Designer collection",

        // Design
        frame_style: "Premium metal sunglasses",

        // Conformité UE
        warranty_years: 2,

        // SEO
        seo_keywords: "lunettes métal,designer,premium,teinte électronique,urbain,mode,Dragon",
      },

      options: [
        {
          title: "Finition",
          values: ["Glossy Black/Gold"]
        },
        {
          title: "Verres",
          values: ["Smoke"]
        }
      ],

      variants: [
        {
          title: "Dragon - Smoke, Glossy Black/Gold",
          sku: "DRG-SMK-GBGD",
          manage_inventory: true,
          inventory_quantity: 0,
          options: {
            "Finition": "Glossy Black/Gold",
            "Verres": "Smoke"
          },
          prices: [{ amount: convertPrice(260), currency_code: "eur" }],
        },
      ]
    }
  ]

  // Importation via workflow Medusa
  logger.info(`🚀 Importing ${products.length} bestseller products...`)

  await createProductsWorkflow(container).run({
    input: {
      products,
    },
  })

  logger.info("\n✅ Missing bestsellers import completed!")
  logger.info(`   Products created: ${products.length}`)
  logger.info(`   - Aroza (sport goggles): ${products[0].variants.length} variante`)
  logger.info(`   - Dragon (premium metal): ${products[1].variants.length} variante`)
  logger.info(`   Total variants: ${products.reduce((sum, p) => sum + p.variants.length, 0)}`)

  logger.info("\n📊 Bestsellers status:")
  logger.info("   ✅ Now imported: Aroza (#5), Dragon (#7)")
  logger.info("   ✅ Already imported: Aura (#1), Aura Audio (#8/#10), Music Shield (#2), Zurix (#3), Infinity (#4)")

  logger.info("\n🏷️  Next step:")
  logger.info("   Run assign-product-tags.ts to auto-tag these new products")
}
