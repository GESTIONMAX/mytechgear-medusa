import { ExecArgs } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  Modules,
} from "@medusajs/framework/utils"

export default async function listAllPriceSets({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const pricingService = container.resolve(Modules.PRICING)

  logger.info("📋 Listing all price sets in database...\n")

  try {
    const priceSets = await pricingService.listPriceSets({}, {
      take: 200,
      relations: ['prices']
    })

    logger.info(`Found ${priceSets.length} price set(s) total\n`)

    // Group by empty/non-empty
    const emptyPriceSets = priceSets.filter((ps: any) => !ps.prices || ps.prices.length === 0)
    const nonEmptyPriceSets = priceSets.filter((ps: any) => ps.prices && ps.prices.length > 0)

    logger.info(`📊 Summary:`)
    logger.info(`   - Price sets with prices: ${nonEmptyPriceSets.length}`)
    logger.info(`   - Empty price sets: ${emptyPriceSets.length}\n`)

    if (nonEmptyPriceSets.length > 0) {
      logger.info(`✅ Price sets WITH prices:`)
      nonEmptyPriceSets.slice(0, 10).forEach((ps: any) => {
        logger.info(`   ${ps.id}: ${ps.prices.length} price(s)`)
        ps.prices.forEach((p: any) => {
          logger.info(`      - ${p.currency_code}: ${p.amount} cents (€${(p.amount / 100).toFixed(2)})`)
        })
      })
      if (nonEmptyPriceSets.length > 10) {
        logger.info(`   ... and ${nonEmptyPriceSets.length - 10} more`)
      }
      logger.info("")
    }

    if (emptyPriceSets.length > 0) {
      logger.info(`⚠️  EMPTY price sets (first 10):`)
      emptyPriceSets.slice(0, 10).forEach((ps: any) => {
        logger.info(`   ${ps.id}: NO PRICES`)
      })
      if (emptyPriceSets.length > 10) {
        logger.info(`   ... and ${emptyPriceSets.length - 10} more`)
      }
    }

  } catch (error: any) {
    logger.error("❌ Error:", error.message)
  }
}
