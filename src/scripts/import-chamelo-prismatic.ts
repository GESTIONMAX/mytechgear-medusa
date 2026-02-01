import { ExecArgs } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  ProductStatus,
} from "@medusajs/framework/utils"
import {
  createProductsWorkflow,
} from "@medusajs/medusa/core-flows"

/**
 * Script d'importation des produits Chamelo Prismatic (Aura)
 *
 * Contexte:
 * - Aura et Aura Audio sont DEUX PRODUITS DISTINCTS (pas des variantes)
 * - Architecture électronique différente (sans/avec audio Bluetooth)
 * - Différence d'autonomie et de prix
 *
 * Modélisation:
 * - Deux fiches produit séparées
 * - Cross-linking via metadata (related_product_*)
 * - Technologie Prismatic™ unique: changement de couleur instantané
 */

export default async function importChameloPrismatic({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)

  logger.info("📦 Importing Chamelo Prismatic products...")

  // IDs de collections et catégories existantes
  const PRISMATIC_COLLECTION_ID = "pcol_01KGBSKFHDDDKWYFQTJQ0HNK34"
  const PRISMATIC_CATEGORY_ID = "pcat_01KGBS24KFT0VW7DFZZT7R3K2Q"

  // Taux de conversion USD → EUR
  const USD_TO_EUR = 0.92
  const MARGIN_MULTIPLIER = 1.15

  const convertPrice = (usd: number): number => {
    return Math.round(usd * USD_TO_EUR * MARGIN_MULTIPLIER * 100) // Prix en centimes EUR
  }

  // Définition des produits
  const products = [
    {
      // ========================================
      // AURA (Sans Audio) - 385 USD
      // ========================================
      title: "Aura",
      handle: "aura",
      subtitle: "Lunettes Prismatic™ à changement de couleur instantané",
      description: `Les seules lunettes au monde avec technologie Prismatic™ de changement de couleur instantané.

Design rimless raffiné en acier inoxydable avec 4 couleurs changeables par simple tap en 0.1 seconde.

47 heures d'autonomie, ultra-légères (35g), résistance IPX4 pour un style qui s'adapte à votre humeur.`,

      status: ProductStatus.PUBLISHED,
      collection_id: PRISMATIC_COLLECTION_ID,
      category_ids: [PRISMATIC_CATEGORY_ID],

      metadata: {
        // Identification
        brand: "Chamelo",
        product_family: "aura",
        has_audio: false,
        related_product_audio: "aura-audio",

        // Spécifications physiques
        weight_grams: 35,
        frame_height_mm: 35,
        temple_width_mm: 143,
        arm_length_mm: 156.5,

        // Batterie et autonomie
        battery_mah: 220,
        battery_color_hours: 47,
        charge_time_minutes: 30, // 80%

        // Verres et technologie
        lens_technology: "Prismatic™ Color-changing",
        color_change_speed_seconds: 0.1,
        light_transmission_range: "40-70%",
        uv_protection: "100%",
        polarization: "No",

        // Couleurs disponibles
        color_count: 4,
        calm_colors: "blue, purple, ruby, clear",
        energy_colors: "red, orange, yellow, clear",

        // Résistance
        water_resistance: "IPX4",

        // Matériaux
        frame_material: "Stainless steel, TR-90, Titanium",
        frame_style: "Rimless square",

        // Contrôle
        control_type: "Tap to change color",

        // Conformité UE
        warranty_years: 1,

        // SEO
        seo_keywords: "lunettes prismatic,changement couleur,rimless,tap control,ultra-légères,35g",
      },

      options: [
        {
          title: "Monture",
          values: ["Black", "White"]
        },
        {
          title: "Verres",
          values: ["Calm", "Energy"]
        }
      ],

      variants: [
        {
          title: "Aura - Black, Calm",
          sku: "AUR-BLK-CAL",
          manage_inventory: true,
          inventory_quantity: 0,
          options: {
            "Monture": "Black",
            "Verres": "Calm"
          },
          prices: [{ amount: convertPrice(385), currency_code: "eur" }],
        },
        {
          title: "Aura - Black, Energy",
          sku: "AUR-BLK-ENE",
          manage_inventory: true,
          inventory_quantity: 0,
          options: {
            "Monture": "Black",
            "Verres": "Energy"
          },
          prices: [{ amount: convertPrice(385), currency_code: "eur" }],
        },
        {
          title: "Aura - White, Calm",
          sku: "AUR-WHT-CAL",
          manage_inventory: true,
          inventory_quantity: 0,
          options: {
            "Monture": "White",
            "Verres": "Calm"
          },
          prices: [{ amount: convertPrice(385), currency_code: "eur" }],
        },
        {
          title: "Aura - White, Energy",
          sku: "AUR-WHT-ENE",
          manage_inventory: true,
          inventory_quantity: 0,
          options: {
            "Monture": "White",
            "Verres": "Energy"
          },
          prices: [{ amount: convertPrice(385), currency_code: "eur" }],
        },
      ]
    },

    {
      // ========================================
      // AURA AUDIO (Avec Audio) - 485 USD
      // ========================================
      title: "Aura Audio",
      handle: "aura-audio",
      subtitle: "Lunettes Prismatic™ avec audio Bluetooth premium",
      description: `Lunettes Prismatic™ à changement de couleur instantané avec audio Bluetooth premium intégré.

Dual speakers et microphones open-ear pour musique et appels, tout en gardant conscience de votre environnement.

4 couleurs par tap en 0.1s, 11h autonomie couleur / 5h audio, ultra-légères (35g), résistance IPX4.`,

      status: ProductStatus.PUBLISHED,
      collection_id: PRISMATIC_COLLECTION_ID,
      category_ids: [PRISMATIC_CATEGORY_ID],

      metadata: {
        // Identification
        brand: "Chamelo",
        product_family: "aura",
        has_audio: true,
        bluetooth: true,
        related_product_no_audio: "aura",

        // Spécifications physiques
        weight_grams: 35,
        frame_height_mm: 35,
        temple_width_mm: 143,
        arm_length_mm: 156.5,

        // Batterie et autonomie
        battery_color_hours: 11,
        battery_audio_hours: 5,

        // Verres et technologie
        lens_technology: "Prismatic™ Color-changing",
        color_change_speed_seconds: 0.1,
        light_transmission_range: "20-65%",
        uv_protection: "UV400",

        // Couleurs disponibles
        color_count: 4,
        calm_colors: "crystal, ruby, indigo, violet",
        energy_colors: "red, orange, yellow, clear",

        // Audio
        audio_type: "Dual speakers and microphones",
        audio_description: "Open-ear premium audio",
        audio_features: "Music and calls",

        // Résistance
        water_resistance: "IPX4",

        // Matériaux
        frame_material: "Stainless steel, TR-90, Titanium",
        frame_style: "Rimless square",

        // Contrôle
        control_type: "Dual touch (Right: color, Left: audio)",

        // Conformité UE
        warranty_years: 1,
        weee_compliant: true,

        // SEO
        seo_keywords: "lunettes prismatic,audio Bluetooth,changement couleur,rimless,dual speakers,35g",
      },

      options: [
        {
          title: "Monture",
          values: ["Black", "White"]
        },
        {
          title: "Verres",
          values: ["Calm", "Energy"]
        }
      ],

      variants: [
        {
          title: "Aura Audio - Black, Calm",
          sku: "AUR-AUD-BLK-CAL",
          manage_inventory: true,
          inventory_quantity: 0,
          options: {
            "Monture": "Black",
            "Verres": "Calm"
          },
          prices: [{ amount: convertPrice(485), currency_code: "eur" }],
        },
        {
          title: "Aura Audio - Black, Energy",
          sku: "AUR-AUD-BLK-ENE",
          manage_inventory: true,
          inventory_quantity: 0,
          options: {
            "Monture": "Black",
            "Verres": "Energy"
          },
          prices: [{ amount: convertPrice(485), currency_code: "eur" }],
        },
        {
          title: "Aura Audio - White, Calm",
          sku: "AUR-AUD-WHT-CAL",
          manage_inventory: true,
          inventory_quantity: 0,
          options: {
            "Monture": "White",
            "Verres": "Calm"
          },
          prices: [{ amount: convertPrice(485), currency_code: "eur" }],
        },
        {
          title: "Aura Audio - White, Energy",
          sku: "AUR-AUD-WHT-ENE",
          manage_inventory: true,
          inventory_quantity: 0,
          options: {
            "Monture": "White",
            "Verres": "Energy"
          },
          prices: [{ amount: convertPrice(485), currency_code: "eur" }],
        },
      ]
    }
  ]

  // Importation via workflow Medusa
  logger.info(`🚀 Importing ${products.length} products...`)

  await createProductsWorkflow(container).run({
    input: {
      products,
    },
  })

  logger.info("\n✅ Chamelo Prismatic import completed!")
  logger.info(`   Products created: ${products.length}`)
  logger.info(`   - Aura (sans audio): ${products[0].variants.length} variantes`)
  logger.info(`   - Aura Audio (avec audio): ${products[1].variants.length} variantes`)
  logger.info(`   Total variants: ${products.reduce((sum, p) => sum + p.variants.length, 0)}`)
}
