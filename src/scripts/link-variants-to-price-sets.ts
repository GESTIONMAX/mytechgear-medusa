import { ExecArgs } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  Modules,
  ModuleRegistrationName
} from "@medusajs/framework/utils"
import { createLinkDefinition } from "@medusajs/framework/links-definition"

/**
 * Script pour lier les variantes existantes à des price sets avec prix EUR
 *
 * Problème identifié:
 * - Les variantes ont été créées sans price_set_id
 * - Le script add-variant-prices-eur.ts a créé des price sets orphelins
 * - Il faut créer les price sets ET les lier aux variants via updateProductVariantsWorkflow
 */

export default async function linkVariantsToPriceSets({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const productService = container.resolve(Modules.PRODUCT)
  const pricingService = container.resolve(Modules.PRICING)
  const remoteLink = container.resolve("remoteLink")

  logger.info("🔗 Linking variants to price sets with EUR pricing...")

  // Fonction de conversion USD → EUR (même formule que les imports)
  const convertPrice = (usd: number): number => {
    return Math.round(usd * 0.92 * 1.15 * 100) // Prix en centimes EUR
  }

  // Price mapping (même que add-variant-prices-eur.ts)
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

  // Retrieve all products and their variants
  const products = await productService.listProducts({}, { take: 100 })

  let totalVariants = 0
  let variantsLinked = 0
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
        logger.warn(`   ⚠️  SKU ${sku} not found in price mapping, skipping`)
        errors.push(`SKU ${sku} not in price map`)
        continue
      }

      try {
        // 1. Create price set with EUR price
        const priceSet = await pricingService.createPriceSets({
          prices: [
            {
              amount: expectedPrice,
              currency_code: "eur",
            }
          ]
        })

        logger.info(`   ✅ Created price set ${priceSet.id} for ${sku}`)

        // 2. Link variant to price set via RemoteLink
        await remoteLink.create({
          [Modules.PRODUCT]: {
            variant_id: variant.id,
          },
          [Modules.PRICING]: {
            price_set_id: priceSet.id,
          },
        })

        logger.info(`   🔗 Linked variant ${sku} to price set €${(expectedPrice / 100).toFixed(2)}`)
        variantsLinked++

      } catch (error: any) {
        logger.error(`   ❌ Error processing ${sku}: ${error.message}`)
        errors.push(`${sku}: ${error.message}`)
      }
    }
  }

  // Summary
  logger.info("\n" + "=".repeat(70))
  logger.info("📊 PRICE SET LINKING SUMMARY")
  logger.info("=".repeat(70))
  logger.info(`Total variants processed:    ${totalVariants}`)
  logger.info(`Variants successfully linked: ${variantsLinked}`)
  logger.info(`Variants failed/skipped:     ${totalVariants - variantsLinked}`)
  logger.info("=".repeat(70))

  if (errors.length > 0) {
    logger.warn("\n⚠️  ERRORS:")
    errors.forEach(err => logger.warn(`   - ${err}`))
  }

  if (variantsLinked > 0) {
    logger.info(`\n✅ Successfully linked ${variantsLinked} variants to price sets!`)
  }

  logger.info("\n🔗 Linking completed!\n")
}
