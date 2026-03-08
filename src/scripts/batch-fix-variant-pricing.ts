import { ExecArgs } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  Modules,
} from "@medusajs/framework/utils"
import {
  updateProductVariantsWorkflow,
} from "@medusajs/medusa/core-flows"

/**
 * FIX PRICING - Batch update de tous les variants avec le workflow officiel
 *
 * Approche: Utiliser updateProductVariantsWorkflow avec le format prices[]
 * tel qu'utilisé dans import-chamelo-shield.ts
 */

export default async function batchFixVariantPricing({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const productService = container.resolve(Modules.PRODUCT)
  const pricingService = container.resolve(Modules.PRICING)

  logger.info("🔧 BATCH FIX VARIANT PRICING - Via Workflow Officiel")
  logger.info("=" .repeat(70))

  // Mapping PIM: SKU → Prix EUR en cents
  const pimPriceMapping: Record<string, number> = {
    "LFS-PRI-NBM-FIR": 29990,
    "LFS-DRA-BLKG-CAL": 29990,
    "SPR-FAL-OBS-BLU": 29990,
    "PRI-EUP-BLC-BLU": 19990,
    "PRI-EUP-GLD-ROS": 19990,
    "DUCK-CLASSIC-DEFAULT": 19990,
    "SH-MB-FIR": 21054,
    "MS-WHT-RED": 36924,
    "MSHIELD-W-R-AUD": 36924,
    "MSH-MB-SMK": 36924,
    "MS-WHT-BLU": 36924,
    "MS-BLK-FIR": 36924,
    "ZRX-FIR": 21054,
    "VEL-FIR": 21054,
    "DSK-FIR": 27508,
    "INF-FIR": 31634,
    "MR1-INF-FIR": 31634,
    "AUR-BLK-ENE": 40733,
    "AUR-AUD-BLK-CAL": 47504,
    "AUR-AUD-BLK-ENE": 47504,
    "AUR-AUD-WHT-CAL": 47504,
    "AUR-AUD-WHT-ENE": 47504,
    "ARZ-DEF": 36924,
    "DRG-SMK-GBGD": 27508,
  }

  logger.info(`\n📊 Mapping PIM: ${Object.keys(pimPriceMapping).length} SKUs\n`)

  const products = await productService.listProducts({}, { take: 100, relations: ['variants'] })

  let totalProcessed = 0
  let successCount = 0
  let failCount = 0

  const updates: Array<{
    sku: string
    variantId: string
    priceEUR: number
    status: string
  }> = []

  logger.info("🔄 Traitement batch des variants...\n")

  // Batch update: traiter chaque variant individuellement
  for (const product of products) {
    for (const variant of product.variants || []) {
      const sku = variant.sku || "NO_SKU"
      const priceEUR = pimPriceMapping[sku]

      if (!priceEUR) {
        continue // Skip variants hors PIM
      }

      totalProcessed++

      try {
        // Update avec le workflow officiel
        logger.info(`   Processing ${sku}...`)

        const workflow = updateProductVariantsWorkflow(container)

        const result = await workflow.run({
          input: {
            selector: { id: variant.id },
            update: {
              prices: [
                {
                  amount: priceEUR,
                  currency_code: "eur",
                }
              ]
            }
          }
        })

        logger.info(`   ✅ ${sku}: Workflow completed`)

        // Vérifier que le pricing fonctionne maintenant
        const [priceCheck] = await pricingService.calculatePrices(
          { variant_id: variant.id },
          { context: { currency_code: "eur" } }
        ) as any[]

        if (priceCheck?.calculated_price?.calculated_amount === priceEUR) {
          logger.info(`   ✅ ${sku}: Pricing vérifié OK (€${(priceEUR / 100).toFixed(2)})`)
          successCount++
          updates.push({
            sku,
            variantId: variant.id,
            priceEUR,
            status: "SUCCESS",
          })
        } else {
          logger.warn(`   ⚠️  ${sku}: Workflow OK mais pricing non vérifié`)
          updates.push({
            sku,
            variantId: variant.id,
            priceEUR,
            status: "PARTIAL",
          })
        }

      } catch (error: any) {
        logger.error(`   ❌ ${sku}: ${error.message}`)
        failCount++
        updates.push({
          sku,
          variantId: variant.id,
          priceEUR,
          status: `FAILED: ${error.message}`,
        })
      }
    }
  }

  // ====================================================================
  // RÉSUMÉ
  // ====================================================================

  logger.info("\n" + "=".repeat(70))
  logger.info("📊 RÉSUMÉ BATCH FIX")
  logger.info("=".repeat(70))
  logger.info(`Total variants traités:          ${totalProcessed}`)
  logger.info(`Succès complets:                 ${successCount}`)
  logger.info(`Échecs:                          ${failCount}`)
  logger.info(`Taux de succès:                  ${totalProcessed > 0 ? ((successCount / totalProcessed) * 100).toFixed(1) : 0}%`)
  logger.info("=".repeat(70))

  if (successCount > 0) {
    logger.info(`\n✅ VARIANTS FIXÉS (${successCount}):`)
    updates.filter(u => u.status === "SUCCESS").slice(0, 10).forEach(u => {
      logger.info(`   - ${u.sku}: €${(u.priceEUR / 100).toFixed(2)}`)
    })
    if (successCount > 10) {
      logger.info(`   ... et ${successCount - 10} autres`)
    }
  }

  logger.info("\n🎯 PROCHAINE ÉTAPE:")
  logger.info("   Exécuter: npx medusa exec ./src/scripts/validate-pricing-fixed.ts")
  logger.info("")

  return {
    totalProcessed,
    successCount,
    failCount,
    updates,
  }
}
