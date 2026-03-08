import { ExecArgs } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  Modules,
  ProductStatus,
} from "@medusajs/framework/utils"
import {
  createProductsWorkflow,
} from "@medusajs/medusa/core-flows"
import { preserveOpsFields, getOpsProtectedFieldsInMetadata } from "../lib/metadata-ownership"

/**
 * Script d'importation des produits Shield et Music Shield de Chamelo
 *
 * Contexte :
 * - Shield et Music Shield sont DEUX PRODUITS DISTINCTS (pas des variantes)
 * - Architecture électronique différente (batterie x7 plus grosse pour Music)
 * - Châssis modifié (branches +26mm pour loger les haut-parleurs)
 * - BOM non interchangeable
 *
 * Modélisation :
 * - Deux fiches produit séparées
 * - Cross-linking via metadata (related_product_*)
 * - Metadata technique pour comparaison (weight, battery, has_audio)
 */

export default async function importChameloShield({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)

  logger.info("📦 Importing Chamelo Shield products...")

  // IDs de collections existantes
  const SPORT_COLLECTION_ID = "pcol_01KGBSKFHEFEZEE61CW8SESSSE"
  const SPORT_CATEGORY_ID = "pcat_01KGBS24KG6YME924C8WKMV3X0"

  // Taux de conversion USD → EUR (à ajuster selon le taux réel + marge)
  const USD_TO_EUR = 0.92 // Exemple : 1 USD = 0.92 EUR
  const MARGIN_MULTIPLIER = 1.15 // Marge revendeur 15%

  const convertPrice = (usd: number): number => {
    return Math.round(usd * USD_TO_EUR * MARGIN_MULTIPLIER * 100) // Prix en centimes EUR
  }

  // Définition des produits
  const products = [
    {
      // ========================================
      // SHIELD (Sans Audio) - 199 USD
      // ========================================
      title: "Shield",
      handle: "shield",
      subtitle: "Lunettes sport Eclipse™ à teinte ajustable",
      description: `Lunettes de sport équipées de verres électrochromiques Eclipse™ à ajustement instantané (0,1s).

Construction ultra-légère (37g) avec traitement anti-transpiration et verres résistants aux chocs.

Contrôle manuel via slider + mode Autopilot avec capteur de luminosité ambiante pour un ajustement automatique parfait dans toutes les conditions.`,

      status: ProductStatus.PUBLISHED,
      collection_id: SPORT_COLLECTION_ID,
      category_ids: [SPORT_CATEGORY_ID],

      // Metadata technique
      metadata: {
        // Identification
        brand: "Chamelo",
        product_family: "shield",
        has_audio: false,
        related_product_audio: "music-shield",

        // Spécifications physiques
        weight_grams: 37,
        frame_height_mm: 61,
        bridge_width_mm: 160,
        arm_length_mm: 140,

        // Batterie et autonomie
        battery_mah: 25,
        battery_tint_hours: 52,
        charge_time_minutes: 60,
        charge_80_percent_minutes: 30,

        // Verres
        lens_technology: "Eclipse™ Tint-Adjustable",
        light_transmission_range: "54-17%",
        tint_adjustment_speed_seconds: 0.1,
        uv_protection: "100%",
        polarization: "Partial",

        // Résistance
        water_resistance: "IPX4",
        sweatproof: true,
        impact_resistant: true,

        // Fonctionnalités
        manual_tint_control: true,
        autopilot_mode: true,
        ambient_light_sensor: true,

        // Conformité UE
        warranty_years: 2,
        ce_certified: true,

        // SEO
        seo_keywords: "lunettes sport,verres électrochromiques,teinte ajustable,Eclipse,IPX4,légères",
      },

      // Options produit
      options: [
        {
          title: "Monture",
          values: ["Matte Black", "White", "Neon"]
        },
        {
          title: "Verres",
          values: ["Fire", "Smoke"]
        }
      ],

      // Variantes
      variants: [
        {
          title: "Shield - Matte Black, Fire",
          sku: "SH-MB-FIR",
          manage_inventory: true,
          inventory_quantity: 0, // À mettre à jour
          options: {
            "Monture": "Matte Black",
            "Verres": "Fire"
          },
          prices: [
            {
              amount: convertPrice(199),
              currency_code: "eur",
            }
          ],
        },
        {
          title: "Shield - Matte Black, Smoke",
          sku: "SH-MB-SMK",
          manage_inventory: true,
          inventory_quantity: 0,
          options: {
            "Monture": "Matte Black",
            "Verres": "Smoke"
          },
          prices: [
            {
              amount: convertPrice(199),
              currency_code: "eur",
            }
          ],
        },
        {
          title: "Shield - White, Fire",
          sku: "SH-WH-FIR",
          manage_inventory: true,
          inventory_quantity: 0,
          options: {
            "Monture": "White",
            "Verres": "Fire"
          },
          prices: [
            {
              amount: convertPrice(199),
              currency_code: "eur",
            }
          ],
        },
        {
          title: "Shield - White, Smoke",
          sku: "SH-WH-SMK",
          manage_inventory: true,
          inventory_quantity: 0,
          options: {
            "Monture": "White",
            "Verres": "Smoke"
          },
          prices: [
            {
              amount: convertPrice(199),
              currency_code: "eur",
            }
          ],
        },
        {
          title: "Shield - Neon, Fire",
          sku: "SH-NE-FIR",
          manage_inventory: true,
          inventory_quantity: 0,
          options: {
            "Monture": "Neon",
            "Verres": "Fire"
          },
          prices: [
            {
              amount: convertPrice(199),
              currency_code: "eur",
            }
          ],
        },
        {
          title: "Shield - Neon, Smoke",
          sku: "SH-NE-SMK",
          manage_inventory: true,
          inventory_quantity: 0,
          options: {
            "Monture": "Neon",
            "Verres": "Smoke"
          },
          prices: [
            {
              amount: convertPrice(199),
              currency_code: "eur",
            }
          ],
        },
      ]
    },

    {
      // ========================================
      // MUSIC SHIELD (Avec Audio) - 260 USD
      // ========================================
      title: "Music Shield",
      handle: "music-shield",
      subtitle: "Lunettes sport Eclipse™ avec audio Bluetooth",
      description: `Lunettes de sport connectées équipées de verres électrochromiques Eclipse™ à ajustement instantané (0,1s) et de haut-parleurs Bluetooth intégrés.

Design ultra-performant avec construction légère (49g), haut-parleurs open-ear, résistance IPX4 et double autonomie : 100h pour la teinte électrochromique, 6,5h pour l'audio.

Contrôle manuel via slider pour une vision optimale pendant l'effort, avec audio immersif sans bloquer les sons environnants.`,

      status: ProductStatus.PUBLISHED,
      collection_id: SPORT_COLLECTION_ID,
      category_ids: [SPORT_CATEGORY_ID],

      // Metadata technique
      metadata: {
        // Identification
        brand: "Chamelo",
        product_family: "shield",
        has_audio: true,
        bluetooth: true,
        related_product_no_audio: "shield",

        // Spécifications physiques
        weight_grams: 49,
        frame_height_mm: 61,
        bridge_width_mm: 160,
        arm_length_mm: 166, // Plus long pour loger les haut-parleurs

        // Batterie et autonomie
        battery_mah: 180, // x7 plus grosse que Shield
        battery_tint_hours: 100,
        battery_audio_hours: 6.5,
        charge_time_minutes: 60,
        charge_80_percent_minutes: 30,

        // Verres
        lens_technology: "Eclipse™ Tint-Adjustable",
        light_transmission_range: "63-17%",
        tint_adjustment_speed_seconds: 0.1,
        uv_protection: "100%",
        polarization: "Partial",

        // Audio
        audio_type: "Open-ear speakers",
        audio_bluetooth_version: "5.0", // À vérifier avec Chamelo

        // Résistance
        water_resistance: "IPX4",
        sweatproof: true,
        impact_resistant: true,

        // Fonctionnalités
        manual_tint_control: true,
        enhanced_grip: true,

        // Conformité UE
        warranty_years: 2,
        ce_certified: true,
        weee_compliant: true, // Recyclage électronique

        // SEO
        seo_keywords: "lunettes audio,Bluetooth,sport,verres électrochromiques,Eclipse,open-ear,IPX4",
      },

      // Options produit
      options: [
        {
          title: "Monture",
          values: ["Matte Black", "White", "La Melaza"]
        },
        {
          title: "Verres",
          values: ["Fire", "Smoke"]
        }
      ],

      // Variantes
      variants: [
        {
          title: "Music Shield - Matte Black, Fire",
          sku: "MSH-MB-FIR",
          manage_inventory: true,
          inventory_quantity: 0,
          options: {
            "Monture": "Matte Black",
            "Verres": "Fire"
          },
          prices: [
            {
              amount: convertPrice(260),
              currency_code: "eur",
            }
          ],
        },
        {
          title: "Music Shield - Matte Black, Smoke",
          sku: "MSH-MB-SMK",
          manage_inventory: true,
          inventory_quantity: 0,
          options: {
            "Monture": "Matte Black",
            "Verres": "Smoke"
          },
          prices: [
            {
              amount: convertPrice(260),
              currency_code: "eur",
            }
          ],
        },
        {
          title: "Music Shield - White, Fire",
          sku: "MSH-WH-FIR",
          manage_inventory: true,
          inventory_quantity: 0,
          options: {
            "Monture": "White",
            "Verres": "Fire"
          },
          prices: [
            {
              amount: convertPrice(260),
              currency_code: "eur",
            }
          ],
        },
        {
          title: "Music Shield - White, Smoke",
          sku: "MSH-WH-SMK",
          manage_inventory: true,
          inventory_quantity: 0,
          options: {
            "Monture": "White",
            "Verres": "Smoke"
          },
          prices: [
            {
              amount: convertPrice(260),
              currency_code: "eur",
            }
          ],
        },
        {
          title: "Music Shield - La Melaza, Fire",
          sku: "MSH-LM-FIR",
          manage_inventory: true,
          inventory_quantity: 0,
          options: {
            "Monture": "La Melaza",
            "Verres": "Fire"
          },
          prices: [
            {
              amount: convertPrice(260), // À ajuster si prix premium
              currency_code: "eur",
            }
          ],
          metadata: {
            limited_edition: true,
          }
        },
      ]
    }
  ]

  // ========================================
  // SAFE MERGE: Preserve OPS fields
  // ========================================
  const productService = container.resolve(Modules.PRODUCT)

  logger.info(`🔍 Checking for existing products...`)

  const productsToImport = []

  for (const productDef of products) {
    // Check if product already exists
    const existing = await productService.listProducts(
      { handle: productDef.handle },
      { select: ["id", "handle", "title", "metadata"], take: 1 }
    )

    if (existing.length > 0) {
      // Product exists - use SAFE MERGE
      const existingProduct = existing[0]
      const existingMetadata = existingProduct.metadata || {}

      logger.info(`   ✏️  Updating existing: ${productDef.handle}`)

      // Check for OPS enrichment
      const opsFields = getOpsProtectedFieldsInMetadata(existingMetadata)

      if (opsFields.length > 0) {
        logger.info(`      Preserving ${opsFields.length} OPS fields: ${opsFields.join(", ")}`)

        // Safe merge: PIM data + preserved OPS data
        productDef.metadata = preserveOpsFields(
          existingMetadata,
          productDef.metadata,
          "chamelo-shield-import"
        ) as any
      } else {
        // No OPS enrichment, just add PIM tracking
        productDef.metadata = {
          ...productDef.metadata,
          pim: {
            last_import: new Date().toISOString(),
            import_source: "chamelo-shield-import"
          }
        } as any
      }

      // Note: We still pass the product to the workflow for update
      // The workflow will handle product update logic
      productsToImport.push(productDef)
    } else {
      // New product - add PIM tracking
      logger.info(`   ➕ Creating new: ${productDef.handle}`)

      productDef.metadata = {
        ...productDef.metadata,
        pim: {
          import_timestamp: new Date().toISOString(),
          import_source: "chamelo-shield-import"
        }
      } as any

      productsToImport.push(productDef)
    }
  }

  // Importation via workflow Medusa
  logger.info(`\n🚀 Importing ${productsToImport.length} products with safe merge...`)

  await createProductsWorkflow(container).run({
    input: {
      products: productsToImport,
    },
  })

  logger.info("\n✅ Chamelo Shield import completed!")
  logger.info(`   Products processed: ${productsToImport.length}`)
  logger.info(`   - Shield (sans audio): ${products[0].variants.length} variantes`)
  logger.info(`   - Music Shield (avec audio): ${products[1].variants.length} variantes`)
  logger.info(`   Total variants: ${products[0].variants.length + products[1].variants.length}`)
  logger.info("\n⚠️  Important: Verify OPS fields preserved by running:")
  logger.info("   npm run medusa exec scripts/verify-post-import.ts -- --backup-file=<path>")
}
