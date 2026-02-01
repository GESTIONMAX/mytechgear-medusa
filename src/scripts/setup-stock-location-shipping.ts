import { ExecArgs } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  Modules,
} from "@medusajs/framework/utils"

/**
 * Script de configuration complète de la livraison
 *
 * Crée automatiquement:
 * 1. Stock Location (Entrepôt MyTechGear)
 * 2. Fulfillment Set (lien avec la région France)
 * 3. Service Zone (Zone France métropolitaine)
 * 4. Shipping Options:
 *    - Livraison Standard (Colissimo) - 5.90€ - 3-5 jours
 *    - Livraison Express (Chronopost) - 12.90€ - 24-48h
 *    - Livraison Gratuite - 0€ - 3-5 jours (commande >= 150€)
 */

export default async function setupStockLocationShipping({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const stockLocationModule = container.resolve(Modules.STOCK_LOCATION)
  const fulfillmentModule = container.resolve(Modules.FULFILLMENT)
  const regionModule = container.resolve(Modules.REGION)

  logger.info("🏭 Setting up complete shipping configuration...")

  try {
    // ============================================
    // 1. STOCK LOCATION (Emplacement de stock)
    // ============================================
    logger.info("\n📍 Step 1: Creating Stock Location...")

    // Vérifier si un stock location existe déjà
    const existingLocations = await stockLocationModule.listStockLocations({})

    let stockLocation
    if (existingLocations.length > 0) {
      stockLocation = existingLocations[0]
      logger.info(`  ✓ Stock Location already exists: ${stockLocation.name} (${stockLocation.id})`)
    } else {
      stockLocation = await stockLocationModule.createStockLocations({
        name: "Entrepôt MyTechGear",
        address: {
          address_1: "Adresse principale",
          city: "Paris",
          country_code: "fr",
          postal_code: "75001",
        },
        metadata: {
          type: "warehouse",
          description: "Entrepôt principal MyTechGear - France",
        }
      })
      logger.info(`  ✓ Stock Location created: ${stockLocation.name} (${stockLocation.id})`)
    }

    // ============================================
    // 2. RÉGION FRANCE
    // ============================================
    logger.info("\n🇫🇷 Step 2: Retrieving France region...")

    const regions = await regionModule.listRegions({
      name: "France"
    })

    if (!regions.length) {
      logger.error("  ❌ France region not found. Run setup-france-region.ts first.")
      return
    }

    const franceRegion = regions[0]
    logger.info(`  ✓ France region found (${franceRegion.id})`)

    // ============================================
    // 3. FULFILLMENT SET
    // ============================================
    logger.info("\n📦 Step 3: Creating Fulfillment Set...")

    let fulfillmentSet
    const existingSets = await fulfillmentModule.listFulfillmentSets()

    if (existingSets.length > 0) {
      fulfillmentSet = existingSets[0]
      logger.info(`  ✓ Fulfillment Set already exists: ${fulfillmentSet.name} (${fulfillmentSet.id})`)
    } else {
      fulfillmentSet = await fulfillmentModule.createFulfillmentSets({
        name: "Default Fulfillment Set",
        type: "shipping",
        service_zones: []
      })
      logger.info(`  ✓ Fulfillment Set created: ${fulfillmentSet.name} (${fulfillmentSet.id})`)
    }

    // ============================================
    // 4. SERVICE ZONE FRANCE
    // ============================================
    logger.info("\n🗺️  Step 4: Creating Service Zone for France...")

    const serviceZones = await fulfillmentModule.createServiceZones({
      name: "Zone France Métropolitaine",
      fulfillment_set_id: fulfillmentSet.id,
      geo_zones: [
        {
          type: "country",
          country_code: "fr",
          metadata: {
            description: "France métropolitaine"
          }
        }
      ],
      metadata: {
        description: "Zone de livraison France métropolitaine",
      }
    } as any)

    const serviceZone = Array.isArray(serviceZones) ? serviceZones[0] : serviceZones

    logger.info(`  ✓ Service Zone created: ${serviceZone.name} (${serviceZone.id})`)

    // ============================================
    // 5. SHIPPING OPTIONS
    // ============================================
    logger.info("\n🚚 Step 5: Creating Shipping Options...")

    const shippingOptions = [
      {
        name: "Livraison Standard (Colissimo)",
        service_zone_id: serviceZone.id,
        shipping_profile_id: null, // Use default profile
        provider_id: "manual_manual",
        price_type: "flat",
        type: {
          label: "Standard",
          description: "Livraison standard en 3-5 jours ouvrés",
          code: "standard-fr",
        },
        prices: [
          {
            currency_code: "eur",
            amount: 590, // 5.90€ en centimes
          }
        ],
        rules: [],
        data: {
          description: "Livraison standard en France métropolitaine par Colissimo",
          delivery_time: "3-5 jours ouvrés",
          carrier: "La Poste - Colissimo",
        },
      },
      {
        name: "Livraison Express (Chronopost)",
        service_zone_id: serviceZone.id,
        shipping_profile_id: null,
        provider_id: "manual_manual",
        price_type: "flat",
        type: {
          label: "Express",
          description: "Livraison express en 24-48h",
          code: "express-fr",
        },
        prices: [
          {
            currency_code: "eur",
            amount: 1290, // 12.90€ en centimes
          }
        ],
        rules: [],
        data: {
          description: "Livraison express en France métropolitaine par Chronopost",
          delivery_time: "24-48 heures",
          carrier: "Chronopost",
        },
      },
      {
        name: "Livraison Gratuite",
        service_zone_id: serviceZone.id,
        shipping_profile_id: null,
        provider_id: "manual_manual",
        price_type: "flat",
        type: {
          label: "Gratuite",
          description: "Livraison gratuite (commande >= 150€)",
          code: "free-fr",
        },
        prices: [
          {
            currency_code: "eur",
            amount: 0, // Gratuit
          }
        ],
        rules: [
          {
            attribute: "total",
            operator: "gte",
            value: "15000", // 150€ minimum (en centimes)
          }
        ],
        data: {
          description: "Livraison gratuite à partir de 150€ d'achat",
          delivery_time: "3-5 jours ouvrés",
          carrier: "La Poste - Colissimo",
          min_subtotal: 15000,
        },
      }
    ]

    for (const optionData of shippingOptions) {
      try {
        const shippingOptions = await fulfillmentModule.createShippingOptions(optionData as any)
        const shippingOption = Array.isArray(shippingOptions) ? shippingOptions[0] : shippingOptions
        const price = optionData.prices[0].amount / 100
        logger.info(`  ✓ ${optionData.name} - ${price}€`)
        logger.info(`    ID: ${shippingOption.id}`)
      } catch (error: any) {
        logger.warn(`  ⚠️  ${optionData.name} - Error: ${error.message}`)
        logger.warn(`      This may need to be created manually in admin`)
      }
    }

    // ============================================
    // RÉSUMÉ
    // ============================================
    logger.info("\n" + "=".repeat(60))
    logger.info("✅ SHIPPING CONFIGURATION COMPLETED!")
    logger.info("=".repeat(60))
    logger.info(`\n📍 Stock Location: ${stockLocation.name}`)
    logger.info(`   ID: ${stockLocation.id}`)
    logger.info(`\n📦 Fulfillment Set: ${fulfillmentSet.name}`)
    logger.info(`   ID: ${fulfillmentSet.id}`)
    logger.info(`\n🗺️  Service Zone: ${serviceZone.name}`)
    logger.info(`   ID: ${serviceZone.id}`)
    logger.info(`   Country: France (fr)`)
    logger.info(`\n🚚 Shipping Options created: ${shippingOptions.length}`)
    logger.info(`   1. Livraison Standard - 5.90€`)
    logger.info(`   2. Livraison Express - 12.90€`)
    logger.info(`   3. Livraison Gratuite - 0€ (>= 150€)`)

    logger.info("\n📝 Next Steps:")
    logger.info("   1. Verify in admin: Settings → Locations")
    logger.info("   2. Test checkout with different cart amounts")
    logger.info("   3. Configure payment provider (Stripe recommended)")
    logger.info("   4. Upload product images")
    logger.info("   5. Set inventory levels")

    logger.info("\n🌐 Admin URLs:")
    logger.info("   Locations: http://localhost:9000/app/settings/locations")
    logger.info("   Regions: http://localhost:9000/app/settings/regions")

  } catch (error) {
    logger.error("\n❌ Error during shipping configuration:")
    logger.error(error)
    throw error
  }
}
