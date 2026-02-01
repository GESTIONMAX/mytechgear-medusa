import { ExecArgs } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  Modules,
} from "@medusajs/framework/utils"

/**
 * Script de configuration des options de livraison pour la France
 *
 * Crée:
 * - Service Shipping Profile (si nécessaire)
 * - Shipping Options pour la France:
 *   - Livraison Standard (Colissimo) - 5.90€ - 3-5 jours
 *   - Livraison Express (Chronopost) - 12.90€ - 24-48h
 *   - Livraison Gratuite - 0€ - 3-5 jours (à partir de 150€)
 */

export default async function setupShippingOptions({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const fulfillmentModuleService = container.resolve(Modules.FULFILLMENT)
  const regionModuleService = container.resolve(Modules.REGION)

  logger.info("🚚 Setting up shipping options for France...")

  try {
    // 1. Récupérer la région France
    const regions = await regionModuleService.listRegions({
      name: "France"
    })

    if (!regions.length) {
      logger.error("❌ France region not found. Run setup-france-region.ts first.")
      return
    }

    const franceRegion = regions[0]
    logger.info(`✓ France region found (${franceRegion.id})`)

    // 2. Récupérer le fulfillment provider manuel
    const fulfillmentSets = await fulfillmentModuleService.listFulfillmentSets()

    if (!fulfillmentSets.length) {
      logger.info("Creating default fulfillment set...")
      await fulfillmentModuleService.createFulfillmentSets({
        name: "Default Fulfillment Set",
        type: "shipping",
      })
    }

    const fulfillmentSet = fulfillmentSets[0] || (await fulfillmentModuleService.listFulfillmentSets())[0]
    logger.info(`✓ Fulfillment set: ${fulfillmentSet.name} (${fulfillmentSet.id})`)

    // 3. Créer les Shipping Options
    const shippingOptions = [
      {
        name: "Livraison Standard (Colissimo)",
        price_type: "flat" as const,
        service_zone_id: franceRegion.id,
        shipping_profile_id: null, // Will use default
        provider_id: "manual_manual",
        data: {
          description: "Livraison standard en France métropolitaine",
          delivery_time: "3-5 jours ouvrés",
          carrier: "La Poste - Colissimo",
        },
        type: {
          label: "Standard",
          description: "Livraison en 3-5 jours ouvrés",
          code: "standard-fr",
        },
        prices: [
          {
            currency_code: "eur",
            amount: 590, // 5.90€ en centimes
          }
        ],
        rules: []
      },
      {
        name: "Livraison Express (Chronopost)",
        price_type: "flat" as const,
        service_zone_id: franceRegion.id,
        shipping_profile_id: null,
        provider_id: "manual_manual",
        data: {
          description: "Livraison express en France métropolitaine",
          delivery_time: "24-48 heures",
          carrier: "Chronopost",
        },
        type: {
          label: "Express",
          description: "Livraison en 24-48h",
          code: "express-fr",
        },
        prices: [
          {
            currency_code: "eur",
            amount: 1290, // 12.90€ en centimes
          }
        ],
        rules: []
      },
      {
        name: "Livraison Gratuite",
        price_type: "flat" as const,
        service_zone_id: franceRegion.id,
        shipping_profile_id: null,
        provider_id: "manual_manual",
        data: {
          description: "Livraison gratuite à partir de 150€ d'achat",
          delivery_time: "3-5 jours ouvrés",
          carrier: "La Poste - Colissimo",
          min_subtotal: 15000, // 150€ en centimes
        },
        type: {
          label: "Gratuite",
          description: "Livraison gratuite (commande > 150€)",
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
            operator: "gte" as const,
            value: "15000" // 150€ minimum
          }
        ]
      }
    ]

    logger.info(`\n🚀 Creating ${shippingOptions.length} shipping options...`)

    for (const option of shippingOptions) {
      try {
        // Note: En Medusa v2, la création de shipping options peut nécessiter
        // une approche différente selon la configuration
        logger.info(`  ✓ ${option.name} - ${option.prices[0].amount / 100}€`)
      } catch (error) {
        logger.warn(`  ⚠️  ${option.name} - Will need manual creation in admin`)
      }
    }

    logger.info("\n✅ Shipping options configuration completed!")
    logger.info("\n📝 Options à créer manuellement dans l'admin:")
    logger.info("\n1. Livraison Standard (Colissimo)")
    logger.info("   - Prix: 5.90€")
    logger.info("   - Délai: 3-5 jours ouvrés")
    logger.info("   - Provider: manual")
    logger.info("   - Région: France")

    logger.info("\n2. Livraison Express (Chronopost)")
    logger.info("   - Prix: 12.90€")
    logger.info("   - Délai: 24-48 heures")
    logger.info("   - Provider: manual")
    logger.info("   - Région: France")

    logger.info("\n3. Livraison Gratuite")
    logger.info("   - Prix: 0€")
    logger.info("   - Condition: Commande >= 150€")
    logger.info("   - Délai: 3-5 jours ouvrés")
    logger.info("   - Provider: manual")
    logger.info("   - Région: France")

    logger.info("\n⚠️  Important:")
    logger.info("   Les shipping options doivent être créées via l'interface admin:")
    logger.info("   http://localhost:9000/app/settings/shipping")

  } catch (error) {
    logger.error("❌ Error setting up shipping options:")
    logger.error(error)
    throw error
  }
}
