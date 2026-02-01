import { ExecArgs } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  Modules,
} from "@medusajs/framework/utils"

/**
 * Script de configuration de la TVA française à 20%
 *
 * Crée:
 * - Tax Region pour la France (FR)
 * - Tax Rate: TVA 20% (taux standard)
 */

export default async function setupFranceTax({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const taxModuleService = container.resolve(Modules.TAX)

  logger.info("🇫🇷 Setting up France VAT (20%)...")

  try {
    // Vérifier si une tax region France existe déjà
    const existingTaxRegions = await taxModuleService.listTaxRegions({
      country_code: "fr"
    })

    let taxRegion
    if (existingTaxRegions.length > 0) {
      taxRegion = existingTaxRegions[0]
      logger.info(`✓ Tax region for France already exists (${taxRegion.id})`)
    } else {
      // Créer la tax region pour la France
      taxRegion = await taxModuleService.createTaxRegions({
        country_code: "fr",
        metadata: {
          country_name: "France"
        }
      })
      logger.info(`✓ Tax region created for France (${taxRegion.id})`)
    }

    // Vérifier si un tax rate existe déjà
    const existingTaxRates = await taxModuleService.listTaxRates({
      tax_region_id: taxRegion.id
    })

    if (existingTaxRates.length > 0) {
      logger.info(`✓ Tax rate already exists:`)
      logger.info(`   - Rate: ${existingTaxRates[0].rate}%`)
      logger.info(`   - Name: ${existingTaxRates[0].name}`)
      return
    }

    // Créer le tax rate de 20%
    const taxRate = await taxModuleService.createTaxRates({
      tax_region_id: taxRegion.id,
      name: "TVA France",
      code: "FR_VAT_STANDARD",
      rate: 20, // 20%
      is_default: true,
      is_combinable: false,
      metadata: {
        description: "Taux de TVA standard français",
        type: "VAT"
      }
    })

    logger.info("\n✅ France VAT configured successfully!")
    logger.info(`   Tax Region ID: ${taxRegion.id}`)
    logger.info(`   Tax Rate ID: ${taxRate.id}`)
    logger.info(`   Rate: ${taxRate.rate}% (TVA)`)
    logger.info(`   Code: ${taxRate.code}`)
    logger.info(`   Default: ${taxRate.is_default ? 'Yes' : 'No'}`)

    logger.info("\n📝 Important:")
    logger.info("   - Les prix produits sont HT (hors taxes)")
    logger.info("   - La TVA de 20% sera calculée automatiquement")
    logger.info("   - Exemple: 100€ HT → 120€ TTC")

  } catch (error) {
    logger.error("❌ Error setting up France VAT:")
    logger.error(error)
    throw error
  }
}
