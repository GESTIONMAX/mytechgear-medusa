import { ExecArgs } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  Modules,
} from "@medusajs/framework/utils"
import { CATEGORIES } from "../config/taxonomy"

/**
 * Script de migration: Ré-assigner produits aux nouvelles catégories hiérarchiques
 *
 * CONTEXTE:
 * - Migration SQL a supprimé les 3 catégories anciennes (PRISMATIC, LIFESTYLE, SPORT)
 * - 16 nouvelles catégories hiérarchiques créées (4 niveaux)
 * - Tous les produits doivent être ré-assignés aux nouvelles catégories
 *
 * MAPPING LOGIQUE:
 * - Aura/Aura Audio (prismatic, lifestyle) → pcat_solaire (unisex)
 * - Shield/Music Shield (sport, performance) → pcat_solaire_sport
 * - Zurix (lifestyle, homme) → pcat_sh_classique
 * - Veil (lifestyle, femme, cat-eye) → pcat_sf_fashion
 * - Aroza (sport, goggles) → pcat_solaire_sport
 * - Dusk Classic → pcat_solaire (unisex wayfarer)
 * - Infinity → pcat_sh_classique (rectangulaire urbain)
 * - MR1 x Infinity → pcat_sh_classique (édition limitée homme)
 * - Dragon → pcat_sh_classique (premium urbain)
 *
 * RUN: npm exec medusa exec ./src/scripts/migrate-products-to-new-categories.ts
 */

export default async function migrateProductsToNewCategories({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const productModuleService = container.resolve(Modules.PRODUCT)

  logger.info("🔄 Migrating products to new hierarchical categories...")

  try {
    // ============================================
    // MAPPING: handle produit → nouveaux category_ids
    // ============================================
    const categoryMapping: Record<string, string[]> = {
      // Prismatic Collection (unisex lifestyle)
      "aura": [CATEGORIES.SOLAIRE],
      "aura-audio": [CATEGORIES.SOLAIRE],

      // Sport Collection (performance sport)
      "shield": [CATEGORIES.SOLAIRE_SPORT],
      "music-shield": [CATEGORIES.SOLAIRE_SPORT],
      "aroza": [CATEGORIES.SOLAIRE_SPORT],  // Goggles sport extrêmes

      // Lifestyle Collection
      "zurix": [CATEGORIES.SH_CLASSIQUE],  // Homme lifestyle classique
      "veil": [CATEGORIES.SF_FASHION],      // Femme cat-eye fashion
      "dusk-classic": [CATEGORIES.SOLAIRE], // Unisex wayfarer
      "infinity": [CATEGORIES.SH_CLASSIQUE], // Homme rectangulaire urbain
      "mr1-infinity": [CATEGORIES.SH_CLASSIQUE], // Édition limitée MR1 (homme)
      "dragon-chamelo": [CATEGORIES.SH_CLASSIQUE], // Premium urbain homme
      "dragon": [CATEGORIES.SH_CLASSIQUE], // Alias (si handle différent)
    }

    logger.info(`\n📦 Category mapping defined for ${Object.keys(categoryMapping).length} products`)

    // ============================================
    // FETCH tous les produits
    // ============================================
    const products = await productModuleService.listProducts({}, {
      relations: ["categories"]
    })

    logger.info(`📦 Found ${products.length} products in database\n`)

    // ============================================
    // STATS
    // ============================================
    let successCount = 0
    let skipCount = 0
    let errorCount = 0
    const unmappedProducts: string[] = []

    // ============================================
    // MIGRATION LOOP
    // ============================================
    for (const product of products) {
      const newCategoryIds = categoryMapping[product.handle]

      if (!newCategoryIds) {
        logger.warn(`⚠️  No category mapping for: ${product.handle} (${product.title})`)
        unmappedProducts.push(product.handle)
        skipCount++
        continue
      }

      try {
        await productModuleService.updateProducts(product.id, {
          category_ids: newCategoryIds
        })

        successCount++
        logger.info(`✅ ${product.title.padEnd(25)} → ${newCategoryIds.join(", ")}`)
      } catch (error) {
        errorCount++
        logger.error(`❌ Failed to update ${product.handle}: ${error.message}`)
      }
    }

    // ============================================
    // RÉSUMÉ
    // ============================================
    logger.info("\n" + "=".repeat(60))
    logger.info("📊 MIGRATION SUMMARY")
    logger.info("=".repeat(60))
    logger.info(`✅ Success:  ${successCount} products`)
    logger.info(`⚠️  Skipped:  ${skipCount} products (no mapping)`)
    logger.info(`❌ Errors:   ${errorCount} products`)
    logger.info(`📦 Total:    ${products.length} products`)
    logger.info("=".repeat(60))

    if (unmappedProducts.length > 0) {
      logger.warn("\n⚠️  UNMAPPED PRODUCTS (need manual assignment):")
      unmappedProducts.forEach(handle => logger.warn(`   - ${handle}`))
    }

    // ============================================
    // VÉRIFICATION: Produits orphelins
    // ============================================
    logger.info("\n🔍 Checking for orphaned products (no category)...")

    const allProducts = await productModuleService.listProducts({}, {
      relations: ["categories"]
    })

    const orphanedProducts = allProducts.filter(p => {
      return !p.categories || p.categories.length === 0
    })

    if (orphanedProducts.length > 0) {
      logger.error(`\n❌ WARNING: ${orphanedProducts.length} ORPHANED PRODUCTS FOUND:`)
      orphanedProducts.forEach(p => {
        logger.error(`   - ${p.handle} (${p.title})`)
      })
      logger.error("\n⚠️  These products will NOT appear in category navigation!")
      logger.error("⚠️  Action required: Add manual category mapping above and re-run script")
    } else {
      logger.info("✅ No orphaned products - all products have categories!")
    }

    logger.info("\n✅ Migration completed!")
    logger.info("\nNext steps:")
    logger.info("  1. Run query to verify category assignments:")
    logger.info('     SELECT p.title, c.name, c.handle FROM product p')
    logger.info('     JOIN product_category_product pcp ON p.id = pcp.product_id')
    logger.info('     JOIN product_category c ON pcp.product_category_id = c.id;')
    logger.info("  2. Update import scripts to use new CATEGORIES constants")
    logger.info("  3. Test frontend breadcrumbs/navigation")

  } catch (error) {
    logger.error("❌ Fatal error during migration:", error)
    throw error
  }
}
