/**
 * Script de migration: Réorganisation taxonomie Option C (Simple 2-niveaux)
 *
 * AVANT (incohérent):
 * Lunettes > Solaire > [Homme/Femme/Enfant/Sport] > [Classique/Aviateur/Sport/Fashion]
 *
 * APRÈS (cohérent):
 * Lunettes Connectées
 * ├── Sport
 * ├── Lifestyle
 * ├── Gaming & Écrans
 * └── Vue Correctrice
 *
 * Inspiré de: chamelo.com (use-case first, pas de genre)
 */

import { ExecArgs } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"

// Nouvelle structure (Option C)
const NEW_CATEGORIES = [
  {
    id: "pcat_root",
    name: "Lunettes Connectées",
    handle: "lunettes-connectees",
    description: "Toutes nos lunettes intelligentes et connectées",
    parent_category_id: null,
    rank: 0,
    is_active: true,
  },
  {
    id: "pcat_sport",
    name: "Sport & Performance",
    handle: "sport",
    description: "Lunettes connectées pour le sport et les activités outdoor",
    parent_category_id: "pcat_root",
    rank: 0,
    is_active: true,
  },
  {
    id: "pcat_lifestyle",
    name: "Lifestyle & Quotidien",
    handle: "lifestyle",
    description: "Lunettes connectées pour tous les jours",
    parent_category_id: "pcat_root",
    rank: 1,
    is_active: true,
  },
  {
    id: "pcat_gaming",
    name: "Gaming & Écrans",
    handle: "gaming-ecrans",
    description: "Protection pour écrans, gaming et travail numérique",
    parent_category_id: "pcat_root",
    rank: 2,
    is_active: true,
  },
  {
    id: "pcat_vue",
    name: "Vue Correctrice",
    handle: "vue-correctrice",
    description: "Lunettes de vue et solaires correctrices",
    parent_category_id: "pcat_root",
    rank: 3,
    is_active: true,
  },
]

// Mapping produits → nouvelles catégories
const PRODUCT_MAPPING: Record<string, string> = {
  // Sport (performance, outdoor, running, cycling)
  "shield": "pcat_sport",
  "music-shield": "pcat_sport",
  "aroza": "pcat_sport",
  "falcon": "pcat_sport",
  "prime": "pcat_sport",

  // Lifestyle (quotidien, urbain, casual)
  "aura": "pcat_lifestyle",
  "aura-audio": "pcat_lifestyle",
  "zurix": "pcat_lifestyle",
  "veil": "pcat_lifestyle",
  "dusk-classic": "pcat_lifestyle",
  "infinity": "pcat_lifestyle",
  "mr1-infinity": "pcat_lifestyle",
  "dragon-chamelo": "pcat_lifestyle",

  // Vue correctrice (si produits RX existent)
  // "aura-rx": "pcat_vue",
}

export default async function reorganizeTaxonomyOptionC({ container }: ExecArgs) {
  const logger = container.resolve("logger")
  const productModuleService = container.resolve(Modules.PRODUCT)

  logger.info("🔄 Migration taxonomie Option C - Démarrage")
  logger.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")

  try {
    // ============================================
    // ÉTAPE 1: Backup de sécurité (optionnel mais recommandé)
    // ============================================
    logger.info("\n📦 ÉTAPE 1/4: Backup des catégories actuelles")

    const existingCategories = await productModuleService.listProductCategories({})
    logger.info(`   ✅ ${existingCategories.length} catégories actuelles sauvegardées`)

    // ============================================
    // ÉTAPE 2: Supprimer anciennes catégories
    // ============================================
    logger.info("\n🗑️  ÉTAPE 2/4: Suppression anciennes catégories")

    for (const category of existingCategories) {
      try {
        await productModuleService.deleteProductCategories([category.id])
        logger.info(`   ✅ Supprimé: ${category.name} (${category.handle})`)
      } catch (error: any) {
        logger.warn(`   ⚠️  Erreur suppression ${category.name}: ${error.message}`)
      }
    }

    // ============================================
    // ÉTAPE 3: Créer nouvelle structure
    // ============================================
    logger.info("\n🆕 ÉTAPE 3/4: Création nouvelle structure (Option C)")

    for (const categoryData of NEW_CATEGORIES) {
      try {
        const created = await productModuleService.createProductCategories(categoryData)
        logger.info(`   ✅ Créé: ${categoryData.name} (${categoryData.handle})`)
      } catch (error: any) {
        logger.error(`   ❌ Erreur création ${categoryData.name}: ${error.message}`)
      }
    }

    // Vérifier la structure créée
    const newCategories = await productModuleService.listProductCategories({})
    logger.info(`\n   📊 Total catégories créées: ${newCategories.length}`)

    // ============================================
    // ÉTAPE 4: Ré-assigner produits
    // ============================================
    logger.info("\n🔗 ÉTAPE 4/4: Ré-assignation des produits")

    const allProducts = await productModuleService.listProducts({})
    let assignedCount = 0
    let skippedCount = 0

    for (const product of allProducts) {
      const newCategoryId = PRODUCT_MAPPING[product.handle]

      if (!newCategoryId) {
        logger.warn(`   ⚠️  Aucun mapping pour: ${product.handle} (${product.title})`)
        skippedCount++
        continue
      }

      try {
        await productModuleService.updateProducts(product.id, {
          categories: [{ id: newCategoryId }],
        })

        const categoryName = NEW_CATEGORIES.find(c => c.id === newCategoryId)?.name
        logger.info(`   ✅ ${product.title} → ${categoryName}`)
        assignedCount++
      } catch (error: any) {
        logger.error(`   ❌ Erreur assignation ${product.handle}: ${error.message}`)
      }
    }

    // ============================================
    // RÉSUMÉ
    // ============================================
    logger.info("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    logger.info("✅ MIGRATION TERMINÉE")
    logger.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    logger.info(`\n📊 Statistiques:`)
    logger.info(`   • Catégories supprimées: ${existingCategories.length}`)
    logger.info(`   • Catégories créées: ${newCategories.length}`)
    logger.info(`   • Produits ré-assignés: ${assignedCount}`)
    logger.info(`   • Produits ignorés: ${skippedCount}`)

    logger.info("\n🎯 Nouvelle structure:")
    for (const cat of NEW_CATEGORIES) {
      const indent = cat.parent_category_id ? "   ├── " : "├── "
      logger.info(`${indent}${cat.name} (${cat.handle})`)
    }

    logger.info("\n💡 Prochaines étapes:")
    logger.info("   1. Vérifier dans le dashboard admin")
    logger.info("   2. Tester la navigation frontend")
    logger.info("   3. Vérifier les URLs SEO")
    logger.info("   4. Mettre à jour sitemap.xml si nécessaire")

  } catch (error: any) {
    logger.error("\n❌ ERREUR CRITIQUE lors de la migration:")
    logger.error(error)
    logger.error("\n⚠️  La base de données peut être dans un état incohérent.")
    logger.error("⚠️  Vérifiez manuellement ou restaurez depuis le backup.")
    throw error
  }
}
