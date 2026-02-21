/**
 * Script de nettoyage: Suppression des catégories Gaming et Vue Correctrice
 *
 * Ces catégories ont été créées par erreur - elles ne sont PAS présentes sur chamelo.com
 * Structure cible finale (alignée chamelo.com):
 *
 * Lunettes Connectées
 * ├── Sport & Performance
 * └── Lifestyle & Quotidien
 */

import { ExecArgs } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"

export default async function removeExtraCategories({ container }: ExecArgs) {
  const logger = container.resolve("logger")
  const productModuleService = container.resolve(Modules.PRODUCT)

  logger.info("🧹 NETTOYAGE: Suppression catégories non présentes sur chamelo.com")
  logger.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")

  try {
    const categoriesToDelete = ["pcat_gaming", "pcat_vue_correctrice"]

    for (const catId of categoriesToDelete) {
      try {
        const category = await productModuleService.retrieveProductCategory(catId)

        logger.info(`\n❌ Suppression: ${category.name} (${category.handle})`)
        logger.info(`   Raison: Catégorie inexistante sur chamelo.com (source de référence)`)

        await productModuleService.deleteProductCategories([catId])
        logger.info(`   ✅ Supprimée avec succès`)
      } catch (error: any) {
        if (error.message.includes("not found")) {
          logger.warn(`   ⚠️  Catégorie ${catId} déjà supprimée`)
        } else {
          logger.error(`   ❌ Erreur: ${error.message}`)
        }
      }
    }

    // Vérifier structure finale
    logger.info("\n📊 STRUCTURE FINALE:")
    const remainingCategories = await productModuleService.listProductCategories({})

    remainingCategories.forEach(cat => {
      const indent = cat.parent_category_id ? "   ├── " : "├── "
      logger.info(`${indent}${cat.name} (${cat.handle})`)
    })

    logger.info("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    logger.info("✅ NETTOYAGE TERMINÉ")
    logger.info(`   • Catégories restantes: ${remainingCategories.length}`)
    logger.info(`   • Structure alignée sur chamelo.com: Sport + Lifestyle uniquement`)

  } catch (error: any) {
    logger.error("\n❌ ERREUR CRITIQUE:")
    logger.error(error)
    throw error
  }
}
