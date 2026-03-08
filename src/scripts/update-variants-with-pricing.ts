import { ExecArgs } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  Modules,
} from "@medusajs/framework/utils"
import {
  updateProductVariantsWorkflow,
} from "@medusajs/medusa/core-flows"

/**
 * Script pour mettre à jour les variantes avec leurs prix EUR
 * en utilisant le workflow officiel Medusa
 *
 * Approche: Utiliser updateProductVariantsWorkflow qui gère automatiquement
 * la création/mise à jour des price sets et leurs liens
 */

export default async function updateVariantsWithPricing({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const productService = container.resolve(Modules.PRODUCT)

  logger.info("🔄 Updating variants with EUR pricing via workflow...")

  // Fonction de conversion USD → EUR
  const convertPrice = (usd: number): number => {
    return Math.round(usd * 0.92 * 1.15 * 100)
  }

  // Price mapping
  const priceMap: Record<string, number> = {
    "LFS-PRI-NBM-FIR": 29990,
    "LFS-DRA-BLKG-CAL": 29990,
    "SPR-FAL-OBS-BLU": 29990,
    "PRI-EUP-BLC-BLU": 19990,
    "PRI-EUP-GLD-ROS": 19990,
    "DUCK-CLASSIC-DEFAULT": 19990,
    "SH-MB-FIR": convertPrice(199),
    "MS-WHT-RED": convertPrice(349),
    "MSHIELD-W-R-AUD": convertPrice(349),
    "MSH-MB-SMK": convertPrice(349),
    "MS-WHT-BLU": convertPrice(349),
    "MS-BLK-FIR": convertPrice(349),
    "ZRX-FIR": convertPrice(199),
    "VEL-FIR": convertPrice(199),
    "DSK-FIR": convertPrice(260),
    "INF-FIR": convertPrice(299),
    "MR1-INF-FIR": convertPrice(299),
    "AUR-BLK-ENE": convertPrice(385),
    "AUR-AUD-BLK-CAL": convertPrice(449),
    "AUR-AUD-BLK-ENE": convertPrice(449),
    "AUR-AUD-WHT-CAL": convertPrice(449),
    "AUR-AUD-WHT-ENE": convertPrice(449),
    "ARZ-DEF": convertPrice(349),
    "DRG-SMK-GBGD": convertPrice(260),
  }

  logger.info(`\n📊 Price mapping prepared for ${Object.keys(priceMap).length} variants\n`)

  // Retrieve all products
  const products = await productService.listProducts({}, { take: 100 })

  let totalVariants = 0
  let variantsUpdated = 0
  let errors: string[] = []

  for (const product of products) {
    const productWithVariants = await productService.retrieveProduct(product.id, {
      relations: ['variants']
    })

    for (const variant of productWithVariants.variants || []) {
      totalVariants++
      const sku = variant.sku || "NO_SKU"
      const expectedPrice = priceMap[sku]

      if (!expectedPrice) {
        logger.warn(`   ⚠️  SKU ${sku} not in price map, skipping`)
        continue
      }

      try {
        // Update variant with pricing using official workflow
        await updateProductVariantsWorkflow(container).run({
          input: {
            selector: { id: variant.id },
            update: {
              prices: [
                {
                  amount: expectedPrice,
                  currency_code: "eur",
                }
              ]
            }
          }
        })

        logger.info(`   ✅ ${sku}: Updated with EUR price €${(expectedPrice / 100).toFixed(2)}`)
        variantsUpdated++

      } catch (error: any) {
        logger.error(`   ❌ Error updating ${sku}: ${error.message}`)
        errors.push(`${sku}: ${error.message}`)
      }
    }
  }

  // Summary
  logger.info("\n" + "=".repeat(70))
  logger.info("📊 VARIANT UPDATE SUMMARY")
  logger.info("=".repeat(70))
  logger.info(`Total variants processed:  ${totalVariants}`)
  logger.info(`Variants successfully updated: ${variantsUpdated}`)
  logger.info(`Variants failed/skipped:   ${totalVariants - variantsUpdated}`)
  logger.info("=".repeat(70))

  if (errors.length > 0) {
    logger.warn("\n⚠️  ERRORS:")
    errors.forEach(err => logger.warn(`   - ${err}`))
  }

  if (variantsUpdated > 0) {
    logger.info(`\n✅ Successfully updated ${variantsUpdated} variants with EUR pricing!`)
    logger.info(`   Test with: npx medusa exec ./src/scripts/check-variant-pricing.ts`)
  }

  logger.info("\n🔄 Update completed!\n")
}
