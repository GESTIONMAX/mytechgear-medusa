import { ExecArgs } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  Modules,
} from "@medusajs/framework/utils"

export default async function checkVariantPricing({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const pricingService = container.resolve(Modules.PRICING)

  logger.info("🔍 Checking variant pricing...")

  const variantId = "variant_01KGBSKFM71QR13VMQ89FT2TK9" // Prime

  try {
    // Test 1: calculatePrices
    logger.info("\n1️⃣ Testing calculatePrices()...")
    const [result] = await pricingService.calculatePrices(
      { id: [variantId] },
      { context: { currency_code: "eur" } }
    )

    logger.info("Result:", JSON.stringify(result, null, 2))

    if (!result?.calculated_price) {
      logger.error("❌ No calculated_price found")
      return
    }

    const priceSetId = result.calculated_price.price_set_id
    logger.info(`✅ Price set ID: ${priceSetId}`)

    // Test 2: retrievePriceSet
    logger.info("\n2️⃣ Testing retrievePriceSet()...")
    const priceSet = await pricingService.retrievePriceSet(priceSetId, {
      relations: ['prices']
    })

    logger.info("Price Set:", JSON.stringify(priceSet, null, 2))

    if (!priceSet.prices || priceSet.prices.length === 0) {
      logger.error("❌ No prices in price set")
      return
    }

    logger.info(`✅ Found ${priceSet.prices.length} price(s)`)
    priceSet.prices.forEach((price: any) => {
      logger.info(`   - ${price.currency_code}: €${(price.amount / 100).toFixed(2)}`)
    })

  } catch (error: any) {
    logger.error("❌ Error:", error.message)
  }
}
