import { ExecArgs } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  ProductStatus,
} from "@medusajs/framework/utils"
import {
  createProductsWorkflow,
} from "@medusajs/medusa/core-flows"

/**
 * Script d'importation des produits Chamelo Lifestyle
 *
 * Produits:
 * - Zurix (199 USD) - Sans audio, tap control, 60h autonomie
 * - Veil (199 USD) - Sans audio, cat-eye design
 * - Dusk Classic (260 USD) - Avec audio Bluetooth
 * - Infinity (299 USD) - Avec audio Bluetooth, design urbain
 * - MR1 x Infinity (299 USD) - Édition limitée avec audio
 */

export default async function importChameloLifestyle({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)

  logger.info("📦 Importing Chamelo Lifestyle products...")

  // IDs de collections et catégories existantes
  const LIFESTYLE_COLLECTION_ID = "pcol_01KGBSKFHEVTNXE9ZG2HBC4QZ8"
  const LIFESTYLE_CATEGORY_ID = "pcat_01KGBS24KF2J4JKHEF7MZ2EGVN"

  // Taux de conversion USD → EUR (même que Shield)
  const USD_TO_EUR = 0.92
  const MARGIN_MULTIPLIER = 1.15

  const convertPrice = (usd: number): number => {
    return Math.round(usd * USD_TO_EUR * MARGIN_MULTIPLIER * 100) // Prix en centimes EUR
  }

  // Définition des produits
  const products = [
    {
      // ========================================
      // ZURIX (Sans Audio) - 199 USD
      // ========================================
      title: "Zurix",
      handle: "zurix",
      subtitle: "Lunettes lifestyle à teinte ajustable par tap",
      description: `Lunettes lifestyle ultra-slim avec technologie de teinte ajustable par simple tap.

Design minimaliste avec composants électroniques intégrés dans la monture pour un look épuré et moderne.

Contrôle tactile intuitif sur 4 niveaux de teinte (50% à 10% VLT) avec 60 heures d'autonomie record.`,

      status: ProductStatus.PUBLISHED,
      collection_id: LIFESTYLE_COLLECTION_ID,
      category_ids: [LIFESTYLE_CATEGORY_ID],

      metadata: {
        // Identification
        brand: "Chamelo",
        product_family: "lifestyle",
        has_audio: false,

        // Contrôle et autonomie
        control_type: "Tap (tactile)",
        battery_tint_hours: 60,

        // Verres
        lens_technology: "LC (Liquid Crystal)",
        light_transmission_range: "50-10%",
        tint_levels: 4,
        tint_adjustment_speed_seconds: 0.1,
        uv_protection: "100%",

        // Design
        frame_integration: "Components in frame",
        design_style: "Ultra-slim minimalist",

        // Conformité UE
        warranty_years: 1,

        // SEO
        seo_keywords: "lunettes lifestyle,tap control,teinte ajustable,design slim,autonomie longue",
      },

      options: [
        {
          title: "Verres",
          values: ["Fire", "Smoke", "Calm"]
        }
      ],

      variants: [
        {
          title: "Zurix - Fire",
          sku: "ZRX-FIR",
          manage_inventory: true,
          inventory_quantity: 0,
          options: { "Verres": "Fire" },
          prices: [{ amount: convertPrice(199), currency_code: "eur" }],
        },
        {
          title: "Zurix - Smoke",
          sku: "ZRX-SMK",
          manage_inventory: true,
          inventory_quantity: 0,
          options: { "Verres": "Smoke" },
          prices: [{ amount: convertPrice(199), currency_code: "eur" }],
        },
        {
          title: "Zurix - Calm",
          sku: "ZRX-CAL",
          manage_inventory: true,
          inventory_quantity: 0,
          options: { "Verres": "Calm" },
          prices: [{ amount: convertPrice(199), currency_code: "eur" }],
        },
      ]
    },

    {
      // ========================================
      // VEIL (Sans Audio) - 199 USD
      // ========================================
      title: "Veil",
      handle: "veil",
      subtitle: "Lunettes cat-eye à teinte ajustable",
      description: `Lunettes lifestyle au design cat-eye intemporel avec technologie de teinte électrochromique.

Construction légère et résistante à l'eau (IPX4) avec verres polarisés et protection UV400.

Contrôle par slider pour un ajustement instantané de la teinte de 37% à 8% VLT.`,

      status: ProductStatus.PUBLISHED,
      collection_id: LIFESTYLE_COLLECTION_ID,
      category_ids: [LIFESTYLE_CATEGORY_ID],

      metadata: {
        // Identification
        brand: "Chamelo",
        product_family: "lifestyle",
        has_audio: false,

        // Verres
        lens_technology: "Electrochromic",
        light_transmission_range: "37-8%",
        tint_adjustment_speed_seconds: 0.1,
        uv_protection: "UV400",
        polarization: "Full",

        // Résistance
        water_resistance: "IPX4",

        // Design
        frame_style: "Cat-eye",
        adjustable_nose_pads: true,
        adjustable_arms: true,

        // Connectivité
        charging_port: "USB-C",

        // Conformité UE
        warranty_years: 1,

        // SEO
        seo_keywords: "lunettes cat-eye,teinte ajustable,polarisé,IPX4,design intemporel",
      },

      options: [
        {
          title: "Verres",
          values: ["Fire", "Smoke", "Calm"]
        }
      ],

      variants: [
        {
          title: "Veil - Fire",
          sku: "VEL-FIR",
          manage_inventory: true,
          inventory_quantity: 0,
          options: { "Verres": "Fire" },
          prices: [{ amount: convertPrice(199), currency_code: "eur" }],
        },
        {
          title: "Veil - Smoke",
          sku: "VEL-SMK",
          manage_inventory: true,
          inventory_quantity: 0,
          options: { "Verres": "Smoke" },
          prices: [{ amount: convertPrice(199), currency_code: "eur" }],
        },
        {
          title: "Veil - Calm",
          sku: "VEL-CAL",
          manage_inventory: true,
          inventory_quantity: 0,
          options: { "Verres": "Calm" },
          prices: [{ amount: convertPrice(199), currency_code: "eur" }],
        },
      ]
    },

    {
      // ========================================
      // DUSK CLASSIC (Avec Audio) - 260 USD
      // ========================================
      title: "Dusk Classic",
      handle: "dusk-classic",
      subtitle: "Lunettes wayfarer avec teinte ajustable et audio Bluetooth",
      description: `Les premières lunettes électrochromiques au monde avec design wayfarer classique et audio Bluetooth intégré.

Ultra-légères (26g) avec verres Dusk™ Alpha polarisés ajustables de 38% à 4% VLT en moins de 0.1 seconde.

Haut-parleurs et microphones cachés pour musique et appels, résistance IPX-4.`,

      status: ProductStatus.PUBLISHED,
      collection_id: LIFESTYLE_COLLECTION_ID,
      category_ids: [LIFESTYLE_CATEGORY_ID],

      metadata: {
        // Identification
        brand: "Chamelo",
        product_family: "lifestyle",
        has_audio: true,
        bluetooth: true,

        // Spécifications physiques
        weight_grams: 26,

        // Verres
        lens_technology: "Dusk™ Alpha",
        light_transmission_range: "38-4%",
        tint_adjustment_speed_seconds: 0.1,
        polarization: "Full",

        // Audio
        audio_type: "Hidden speakers and microphones",
        audio_features: "Music and calls",

        // Résistance
        water_resistance: "IPX-4",

        // Contrôle
        control_type: "Button + App",

        // Design
        frame_style: "Wayfarer classic",

        // Conformité UE
        warranty_years: 1,
        weee_compliant: true,

        // SEO
        seo_keywords: "lunettes audio,wayfarer,Bluetooth,teinte ajustable,ultra-légères,26g",
      },

      options: [
        {
          title: "Verres",
          values: ["Fire", "Smoke", "Calm"]
        }
      ],

      variants: [
        {
          title: "Dusk Classic - Fire",
          sku: "DSK-FIR",
          manage_inventory: true,
          inventory_quantity: 0,
          options: { "Verres": "Fire" },
          prices: [{ amount: convertPrice(260), currency_code: "eur" }],
        },
        {
          title: "Dusk Classic - Smoke",
          sku: "DSK-SMK",
          manage_inventory: true,
          inventory_quantity: 0,
          options: { "Verres": "Smoke" },
          prices: [{ amount: convertPrice(260), currency_code: "eur" }],
        },
        {
          title: "Dusk Classic - Calm",
          sku: "DSK-CAL",
          manage_inventory: true,
          inventory_quantity: 0,
          options: { "Verres": "Calm" },
          prices: [{ amount: convertPrice(260), currency_code: "eur" }],
        },
      ]
    },

    {
      // ========================================
      // INFINITY (Avec Audio) - 299 USD
      // ========================================
      title: "Infinity",
      handle: "infinity",
      subtitle: "Lunettes urbaines avec teinte ajustable et audio Bluetooth premium",
      description: `Lunettes lifestyle au design rectangulaire urbain avec teinte HVL™ ajustable instantanément (48%-8% VLT) et audio open-ear premium.

Construction durable en TR90 avec double haut-parleurs et microphones pour une expérience audio immersive.

5.2 heures de lecture audio ou 11 heures d'autonomie teinte, résistance IPX4.`,

      status: ProductStatus.PUBLISHED,
      collection_id: LIFESTYLE_COLLECTION_ID,
      category_ids: [LIFESTYLE_CATEGORY_ID],

      metadata: {
        // Identification
        brand: "Chamelo",
        product_family: "lifestyle",
        has_audio: true,
        bluetooth: true,

        // Verres
        lens_technology: "HVL™ Tint-Adjustable",
        light_transmission_range: "48-8%",
        tint_adjustment_speed_seconds: 0.1,

        // Batterie et autonomie
        battery_tint_hours: 11,
        battery_audio_hours: 5.2,
        charge_time_hours: 1.5,

        // Audio
        audio_type: "Dual speakers and microphones",
        audio_description: "Open-ear premium audio",

        // Résistance
        water_resistance: "IPX4",

        // Matériaux et design
        frame_material: "TR90",
        frame_style: "Rectangular urban",
        frame_finish: "Glossy black",

        // Contrôle
        control_type: "Touch slider + App",
        tint_levels: 4,

        // Conformité UE
        warranty_years: 1,
        weee_compliant: true,

        // SEO
        seo_keywords: "lunettes audio,Bluetooth,design urbain,TR90,open-ear,teinte HVL",
      },

      options: [
        {
          title: "Verres",
          values: ["Fire", "Smoke", "Calm"]
        }
      ],

      variants: [
        {
          title: "Infinity - Fire",
          sku: "INF-FIR",
          manage_inventory: true,
          inventory_quantity: 0,
          options: { "Verres": "Fire" },
          prices: [{ amount: convertPrice(299), currency_code: "eur" }],
        },
        {
          title: "Infinity - Smoke",
          sku: "INF-SMK",
          manage_inventory: true,
          inventory_quantity: 0,
          options: { "Verres": "Smoke" },
          prices: [{ amount: convertPrice(299), currency_code: "eur" }],
        },
        {
          title: "Infinity - Calm",
          sku: "INF-CAL",
          manage_inventory: true,
          inventory_quantity: 0,
          options: { "Verres": "Calm" },
          prices: [{ amount: convertPrice(299), currency_code: "eur" }],
        },
      ]
    },

    {
      // ========================================
      // MR1 x CHAMELO INFINITY (Édition Limitée) - 299 USD
      // ========================================
      title: "MR1 x Chamelo Infinity",
      handle: "mr1-infinity",
      subtitle: "Édition limitée Mohamed Ramadan avec teinte ajustable et audio Bluetooth",
      description: `Collaboration exclusive avec Mohamed Ramadan - Design rectangulaire urbain avec détails gold MR1 signature.

Technologie HVL™ de teinte instantanée (48%-8% VLT) et audio Bluetooth premium avec double haut-parleurs.

Construction TR90 durable, 11 heures d'autonomie teinte ou 5+ heures audio, résistance IPX4.`,

      status: ProductStatus.PUBLISHED,
      collection_id: LIFESTYLE_COLLECTION_ID,
      category_ids: [LIFESTYLE_CATEGORY_ID],

      metadata: {
        // Identification
        brand: "Chamelo x MR1",
        product_family: "lifestyle",
        has_audio: true,
        bluetooth: true,
        limited_edition: true,
        collaboration: "Mohamed Ramadan",

        // Verres
        lens_technology: "HVL™ Tint-Adjustable",
        light_transmission_range: "48-8%",
        tint_adjustment_speed_seconds: 0.1,

        // Batterie et autonomie
        battery_tint_hours: 11,
        battery_audio_hours: 5,
        charge_time_hours: 1.5,

        // Audio
        audio_type: "Dual speakers and microphones",
        audio_description: "Open-ear premium audio",

        // Résistance
        water_resistance: "IPX4",

        // Matériaux et design
        frame_material: "TR90",
        frame_style: "Rectangular urban",
        frame_finish: "Glossy black with gold MR1 details",

        // Contrôle
        control_type: "Touch slider + App",
        tint_levels: 4,

        // Édition limitée
        edition_type: "Limited Edition",

        // Conformité UE
        warranty_years: 1,
        weee_compliant: true,

        // SEO
        seo_keywords: "MR1,Mohamed Ramadan,édition limitée,lunettes audio,Bluetooth,design urbain,gold details",
      },

      options: [
        {
          title: "Verres",
          values: ["Fire", "Smoke", "Calm"]
        }
      ],

      variants: [
        {
          title: "MR1 x Infinity - Fire",
          sku: "MR1-INF-FIR",
          manage_inventory: true,
          inventory_quantity: 0,
          options: { "Verres": "Fire" },
          prices: [{ amount: convertPrice(299), currency_code: "eur" }],
          metadata: {
            limited_edition: true,
          }
        },
        {
          title: "MR1 x Infinity - Smoke",
          sku: "MR1-INF-SMK",
          manage_inventory: true,
          inventory_quantity: 0,
          options: { "Verres": "Smoke" },
          prices: [{ amount: convertPrice(299), currency_code: "eur" }],
          metadata: {
            limited_edition: true,
          }
        },
        {
          title: "MR1 x Infinity - Calm",
          sku: "MR1-INF-CAL",
          manage_inventory: true,
          inventory_quantity: 0,
          options: { "Verres": "Calm" },
          prices: [{ amount: convertPrice(299), currency_code: "eur" }],
          metadata: {
            limited_edition: true,
          }
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

  logger.info("\n✅ Chamelo Lifestyle import completed!")
  logger.info(`   Products created: ${products.length}`)
  logger.info(`   - Zurix (sans audio): ${products[0].variants.length} variantes`)
  logger.info(`   - Veil (sans audio): ${products[1].variants.length} variantes`)
  logger.info(`   - Dusk Classic (avec audio): ${products[2].variants.length} variantes`)
  logger.info(`   - Infinity (avec audio): ${products[3].variants.length} variantes`)
  logger.info(`   - MR1 x Infinity (édition limitée): ${products[4].variants.length} variantes`)
  logger.info(`   Total variants: ${products.reduce((sum, p) => sum + p.variants.length, 0)}`)
}
