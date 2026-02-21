import { ExecArgs } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  Modules,
} from "@medusajs/framework/utils"
import { COLLECTIONS } from "../config/taxonomy"

/**
 * Script: Peupler la collection "Nouveautés 2024"
 *
 * LOGIQUE:
 * - Trouve tous les produits créés à partir du 1er janvier 2024
 * - Les assigne à la collection "Nouveautés 2024" (handle: nouveautes-2024)
 *
 * NOTES:
 * - Collection créée par migration SQL (ID: pcol_nouveautes)
 * - Ce script peut être run périodiquement
 * - Les produits peuvent être dans PLUSIEURS collections
 * - IMPORTANT: Mettre à jour la date pour 2025, 2026, etc.
 *
 * RUN: npm exec medusa exec ./src/scripts/populate-nouveautes-collection.ts
 */

export default async function populateNouveautesCollection({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const productModuleService = container.resolve(Modules.PRODUCT)

  logger.info("🆕 Populating Nouveautés 2024 collection...")

  try {
    // ============================================
    // CONFIG: Date de début (ajuster selon l'année)
    // ============================================
    const START_DATE = new Date("2024-01-01")
    const currentYear = new Date().getFullYear()

    logger.info(`📅 Looking for products created since: ${START_DATE.toISOString().split('T')[0]}`)
    logger.info(`📅 Current year: ${currentYear}\n`)

    // ============================================
    // FETCH produits récents
    // ============================================
    const products = await productModuleService.listProducts({
      created_at: { $gte: START_DATE }
    }, {
      relations: ["collection"]
    })

    logger.info(`📦 Found ${products.length} products created since ${START_DATE.toISOString().split('T')[0]}\n`)

    if (products.length === 0) {
      logger.warn(`⚠️  No products created since ${START_DATE.toISOString().split('T')[0]}`)
      logger.info("\nℹ️  All products may have been created before 2024")
      logger.info("ℹ️  Or adjust START_DATE in script for different year")
      return
    }

    // ============================================
    // ASSIGN à collection Nouveautés 2024
    // ============================================
    let successCount = 0
    let errorCount = 0

    for (const product of products) {
      try {
        await productModuleService.updateProducts(product.id, {
          collection_id: COLLECTIONS.NOUVEAUTES,
        })

        const createdDate = new Date(product.created_at).toISOString().split('T')[0]
        successCount++
        logger.info(`✅ ${product.title.padEnd(25)} (created: ${createdDate}) → Nouveautés 2024`)
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
    logger.info(`✅ Success:  ${successCount} products added to Nouveautés 2024`)
    logger.info(`❌ Errors:   ${errorCount} products`)
    logger.info(`📦 Total:    ${products.length} products processed`)
    logger.info("=".repeat(60))

    logger.info("\n✅ Nouveautés 2024 collection populated!")
    logger.info("\nNext steps:")
    logger.info("  1. Verify collection: GET /store/collections/nouveautes-2024")
    logger.info("  2. Create similar script for 2025 when appropriate")
    logger.info("  3. Update frontend to display Nouveautés landing page")
    logger.info("  4. Add hero image/video to collection metadata")

  } catch (error) {
    logger.error("❌ Fatal error:", error)
    throw error
  }
}
