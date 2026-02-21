import { ExecArgs } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  Modules,
} from "@medusajs/framework/utils"
import { COLLECTIONS } from "../config/taxonomy"

/**
 * Script: Peupler la collection "Best-sellers"
 *
 * LOGIQUE:
 * - Trouve tous les produits avec metadata.bestseller_rank ≤ 10
 * - Les assigne à la collection "Best-sellers" (handle: best-sellers)
 *
 * NOTES:
 * - Collection créée par migration SQL (ID: pcol_bestsellers)
 * - Ce script peut être run périodiquement (cron hebdomadaire)
 * - Les produits peuvent être dans PLUSIEURS collections (thématique + bestsellers)
 *
 * RUN: npm exec medusa exec ./src/scripts/populate-bestsellers-collection.ts
 */

export default async function populateBestsellersCollection({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const productModuleService = container.resolve(Modules.PRODUCT)

  logger.info("🏆 Populating Best-sellers collection...")

  try {
    // ============================================
    // FETCH tous les produits
    // ============================================
    const products = await productModuleService.listProducts({}, {
      relations: ["collection"]
    })

    logger.info(`📦 Found ${products.length} products in database\n`)

    // ============================================
    // FILTER: Produits avec bestseller_rank ≤ 10
    // ============================================
    const bestsellerProducts = products.filter(p => {
      const rank = p.metadata?.bestseller_rank as number | undefined
      return rank && rank <= 10
    })

    logger.info(`🏆 Found ${bestsellerProducts.length} bestseller products (rank ≤ 10)\n`)

    if (bestsellerProducts.length === 0) {
      logger.warn("⚠️  No products with bestseller_rank ≤ 10 found")
      logger.info("\nℹ️  To add bestsellers, set metadata.bestseller_rank in product:")
      logger.info('   metadata: { bestseller_rank: 1 }  // #1 bestseller')
      return
    }

    // ============================================
    // ASSIGN à collection Best-sellers
    // ============================================
    let successCount = 0
    let errorCount = 0

    for (const product of bestsellerProducts) {
      const rank = product.metadata?.bestseller_rank as number

      try {
        await productModuleService.updateProducts(product.id, {
          collection_id: COLLECTIONS.BESTSELLERS,
        })

        successCount++
        logger.info(`✅ #${rank.toString().padStart(2)} - ${product.title} → Best-sellers collection`)
      } catch (error) {
        errorCount++
        logger.error(`❌ Failed to update ${product.handle}: ${error.message}`)
      }
    }

    // ============================================
    // RÉSUMÉ
    // ============================================
    logger.info("\n" + "=".repeat(60))
    logger.info("📊 SUMMARY")
    logger.info("=".repeat(60))
    logger.info(`✅ Success:  ${successCount} products added to Best-sellers`)
    logger.info(`❌ Errors:   ${errorCount} products`)
    logger.info(`📦 Total:    ${bestsellerProducts.length} bestsellers processed`)
    logger.info("=".repeat(60))

    logger.info("\n✅ Best-sellers collection populated!")
    logger.info("\nNext steps:")
    logger.info("  1. Verify collection: GET /store/collections/best-sellers")
    logger.info("  2. Configure cron job for weekly re-sync")
    logger.info("  3. Update frontend to display Best-sellers landing page")

  } catch (error) {
    logger.error("❌ Fatal error:", error)
    throw error
  }
}
