import { ExecArgs } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  Modules,
} from "@medusajs/framework/utils"

export default async function diagnosePricing({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const productService = container.resolve(Modules.PRODUCT)
  const pricingService = container.resolve(Modules.PRICING)
  const remoteLink = container.resolve("remoteLink")

  logger.info("🔬 Diagnosing pricing setup...")

  const variantId = "variant_01KGBSKFM71QR13VMQ89FT2TK9"

  try {
    // 1. Get variant from product service
    logger.info("\n1️⃣ Checking variant in Product Service...")
    const variant = await productService.retrieveProductVariant(variantId)
    logger.info(`   Variant: ${variant.sku}`)
    logger.info(`   Has calculated_price field: ${variant.hasOwnProperty('calculated_price')}`)
    logger.info(`   Has price_set_id field: ${variant.hasOwnProperty('price_set_id')}`)

    // 2. Check for links
    logger.info("\n2️⃣ Checking RemoteLinks...")
    const links = await remoteLink.query({
      variant_id: { $in: [variantId] }
    }, {})
    logger.info(`   Found ${links.length} link(s):`, JSON.stringify(links, null, 2))

    // 3. List all price sets
    logger.info("\n3️⃣ Listing all price sets...")
    const priceSets = await pricingService.listPriceSets({}, { take: 100 })
    logger.info(`   Total price sets in database: ${priceSets.length}`)

    // Show first 5
    priceSets.slice(0, 5).forEach((ps: any, idx: number) => {
      logger.info(`   ${idx + 1}. Price Set ${ps.id}: ${ps.prices?.length || 0} prices`)
    })

    // 4. Try calculatePrices with different contexts
    logger.info("\n4️⃣ Testing calculatePrices with different contexts...")

    const contexts = [
      { currency_code: "eur" },
      { currency_code: "eur", region_id: "reg_01" },
      {}
    ]

    for (const ctx of contexts) {
      try {
        const [result] = await pricingService.calculatePrices(
          { id: [variantId] },
          { context: ctx }
        )
        logger.info(`   Context ${JSON.stringify(ctx)}:`)
        logger.info(`     - Has result: ${!!result}`)
        logger.info(`     - Has calculated_price: ${!!result?.calculated_price}`)
        logger.info(`     - price_set_id: ${result?.calculated_price?.price_set_id || 'N/A'}`)
      } catch (error: any) {
        logger.error(`     Error: ${error.message}`)
      }
    }

  } catch (error: any) {
    logger.error("❌ Error:", error.message)
    logger.error(error.stack)
  }
}
