import { ExecArgs } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  Modules,
} from "@medusajs/framework/utils"

/**
 * Script de configuration de la région France avec TVA 20%
 *
 * Crée:
 * - Région France (EUR)
 * - Pays: France (FR)
 * - Taux de TVA: 20% (taux standard français)
 */

export default async function setupFranceRegion({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const regionModuleService = container.resolve(Modules.REGION)

  logger.info("🇫🇷 Setting up France region with 20% VAT...")

  try {
    // Vérifier si la région France existe déjà
    const existingRegions = await regionModuleService.listRegions({
      name: "France"
    })

    if (existingRegions.length > 0) {
      logger.info("✅ France region already exists")
      logger.info(`   Region ID: ${existingRegions[0].id}`)
      logger.info(`   Currency: ${existingRegions[0].currency_code}`)
      return
    }

    // Créer la région France
    const region = await regionModuleService.createRegions({
      name: "France",
      currency_code: "eur",
      countries: ["fr"],
      automatic_taxes: true,
      tax_rate: 20, // TVA standard française 20%
      metadata: {
        tax_type: "VAT",
        tax_description: "TVA France (taux standard)",
      }
    })

    logger.info("\n✅ France region created successfully!")
    logger.info(`   Region ID: ${region.id}`)
    logger.info(`   Name: ${region.name}`)
    logger.info(`   Currency: ${region.currency_code.toUpperCase()}`)
    logger.info(`   Country: France (FR)`)
    logger.info(`   Tax Rate: 20% (VAT)`)
    logger.info(`   Automatic Taxes: Enabled`)

    logger.info("\n📝 Note:")
    logger.info("   - Les prix produits sont HT (hors taxes)")
    logger.info("   - La TVA de 20% sera automatiquement ajoutée au checkout")
    logger.info("   - Prix TTC = Prix HT × 1.20")

  } catch (error) {
    logger.error("❌ Error setting up France region:")
    logger.error(error)
    throw error
  }
}
