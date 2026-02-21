/**
 * Script de nettoyage et migration: Taxonomie Option C (Clean)
 *
 * Nettoie complètement l'ancien système et crée proprement la nouvelle structure
 */

import { ExecArgs } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"

// IDs des anciennes catégories à SUPPRIMER
const OLD_CATEGORIES_TO_DELETE = [
  "pcat_lunettes",      // Ancienne racine
  "pcat_solaire",       // Ancienne: Lunettes de soleil
  "pcat_vue",           // Ancienne: Lunettes de vue (sera recréée)
  "pcat_solaire_homme",
  "pcat_solaire_femme",
  "pcat_solaire_enfant",
  "pcat_solaire_sport",
  "pcat_sf_fashion",
  "pcat_sf_classique",
  "pcat_sf_sport",
  "pcat_sh_classique",
  "pcat_sh_aviateur",
  "pcat_sh_sport",
  "pcat_vue_homme",
  "pcat_vue_femme",
  "pcat_vue_gaming",
]

// Nouvelle structure complète (Option C)
const NEW_CATEGORIES = [
  {
    id: "pcat_root",
    name: "Lunettes Connectées",
    handle: "lunettes-connectees",
    description: "Toutes nos lunettes intelligentes et connectées",
    parent_category_id: null,
    rank: 0,
    is_active: true,
    is_internal: false,
  },
  {
    id: "pcat_sport",
    name: "Sport & Performance",
    handle: "sport",
    description: "Lunettes connectées pour le sport et les activités outdoor",
    parent_category_id: "pcat_root",
    rank: 0,
    is_active: true,
    is_internal: false,
  },
  {
    id: "pcat_lifestyle",
    name: "Lifestyle & Quotidien",
    handle: "lifestyle",
    description: "Lunettes connectées pour tous les jours",
    parent_category_id: "pcat_root",
    rank: 1,
    is_active: true,
    is_internal: false,
  },
  {
    id: "pcat_gaming",
    name: "Gaming & Écrans",
    handle: "gaming-ecrans",
    description: "Protection pour écrans, gaming et travail numérique",
    parent_category_id: "pcat_root",
    rank: 2,
    is_active: true,
    is_internal: false,
  },
  {
    id: "pcat_vue_correctrice",
    name: "Vue Correctrice",
    handle: "vue-correctrice",
    description: "Lunettes de vue et solaires correctrices",
    parent_category_id: "pcat_root",
    rank: 3,
    is_active: true,
    is_internal: false,
  },
]

// Mapping produits → nouvelles catégories
const PRODUCT_MAPPING: Record<string, string> = {
  // Sport
  "shield": "pcat_sport",
  "music-shield": "pcat_sport",
  "aroza": "pcat_sport",
  "falcon": "pcat_sport",
  "prime": "pcat_sport",

  // Lifestyle
  "aura": "pcat_lifestyle",
  "aura-audio": "pcat_lifestyle",
  "zurix": "pcat_lifestyle",
  "veil": "pcat_lifestyle",
  "dusk-classic": "pcat_lifestyle",
  "infinity": "pcat_lifestyle",
  "mr1-infinity": "pcat_lifestyle",
  "dragon-chamelo": "pcat_lifestyle",
}

export default async function cleanupAndMigrateTaxonomy({ container }: ExecArgs) {
  const logger = container.resolve("logger")
  const productModuleService = container.resolve(Modules.PRODUCT)

  logger.info("🧹 NETTOYAGE ET MIGRATION TAXONOMIE OPTION C")
  logger.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")

  try {
    // ============================================
    // ÉTAPE 1: État actuel
    // ============================================
    logger.info("\n📊 ÉTAPE 1/5: Analyse de l'état actuel")

    const allCategories = await productModuleService.listProductCategories({})
    logger.info(`   Total catégories actuelles: ${allCategories.length}`)

    allCategories.forEach(cat => {
      logger.info(`   - ${cat.id}: ${cat.name} (parent: ${cat.parent_category_id || 'NULL'})`)
    })

    // ============================================
    // ÉTAPE 2: Supprimer TOUTES les catégories existantes
    // ============================================
    logger.info("\n🗑️  ÉTAPE 2/5: Suppression COMPLÈTE de toutes catégories")

    // Supprimer d'abord les relations produits-catégories
    const allProducts = await productModuleService.listProducts({})
    for (const product of allProducts) {
      try {
        await productModuleService.updateProducts(product.id, {
          categories: [],
        })
      } catch (error) {
        // Ignorer les erreurs
      }
    }
    logger.info(`   ✅ Relations produits-catégories supprimées`)

    // Supprimer toutes les catégories (de la plus profonde à la racine)
    const categoryIds = allCategories.map(c => c.id)
    for (const catId of categoryIds) {
      try {
        await productModuleService.deleteProductCategories([catId])
        logger.info(`   ✅ Supprimé: ${catId}`)
      } catch (error: any) {
        logger.warn(`   ⚠️  Impossible de supprimer ${catId}: ${error.message}`)
      }
    }

    // Vérifier suppression complète
    const remainingCats = await productModuleService.listProductCategories({})
    if (remainingCats.length > 0) {
      logger.warn(`   ⚠️  ${remainingCats.length} catégories restantes:`)
      remainingCats.forEach(cat => logger.warn(`      - ${cat.id}: ${cat.name}`))
    } else {
      logger.info(`   ✅ Toutes les catégories supprimées`)
    }

    // ============================================
    // ÉTAPE 3: Créer nouvelle structure propre
    // ============================================
    logger.info("\n🆕 ÉTAPE 3/5: Création nouvelle structure Option C")

    for (const categoryData of NEW_CATEGORIES) {
      try {
        await productModuleService.createProductCategories(categoryData)
        const parent = categoryData.parent_category_id ? ` (parent: ${categoryData.parent_category_id})` : " (racine)"
        logger.info(`   ✅ Créé: ${categoryData.name}${parent}`)
      } catch (error: any) {
        logger.error(`   ❌ Erreur création ${categoryData.name}: ${error.message}`)
      }
    }

    // Vérifier structure créée
    const newCategories = await productModuleService.listProductCategories({})
    logger.info(`\n   📊 Total catégories créées: ${newCategories.length}`)
    logger.info(`   Attendu: ${NEW_CATEGORIES.length}`)

    if (newCategories.length !== NEW_CATEGORIES.length) {
      logger.warn(`   ⚠️  Nombre de catégories incorrect!`)
    }

    // ============================================
    // ÉTAPE 4: Ré-assigner produits
    // ============================================
    logger.info("\n🔗 ÉTAPE 4/5: Ré-assignation des produits")

    let assignedCount = 0
    let skippedCount = 0

    for (const product of allProducts) {
      const newCategoryId = PRODUCT_MAPPING[product.handle]

      if (!newCategoryId) {
        logger.warn(`   ⚠️  Aucun mapping pour: ${product.handle}`)
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
        logger.error(`   ❌ Erreur: ${product.handle}: ${error.message}`)
      }
    }

    // ============================================
    // ÉTAPE 5: Vérification finale
    // ============================================
    logger.info("\n✅ ÉTAPE 5/5: Vérification finale")

    const finalCategories = await productModuleService.listProductCategories({})

    logger.info("\n📊 Structure finale:")
    for (const cat of finalCategories) {
      const indent = cat.parent_category_id ? "   ├── " : "├── "
      const parent = cat.parent_category_id ? ` (parent: ${cat.parent_category_id})` : ""
      logger.info(`${indent}${cat.name} (${cat.handle})${parent}`)
    }

    // ============================================
    // RÉSUMÉ
    // ============================================
    logger.info("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    logger.info("✅ MIGRATION TERMINÉE")
    logger.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    logger.info(`\n📊 Statistiques:`)
    logger.info(`   • Catégories supprimées: ${allCategories.length}`)
    logger.info(`   • Catégories créées: ${finalCategories.length}`)
    logger.info(`   • Produits ré-assignés: ${assignedCount}`)
    logger.info(`   • Produits ignorés: ${skippedCount}`)

    logger.info("\n💡 Prochaines étapes:")
    logger.info("   1. Vérifier dans dashboard admin (/admin/categories)")
    logger.info("   2. Redémarrer frontend Next.js")
    logger.info("   3. Tester navigation")

  } catch (error: any) {
    logger.error("\n❌ ERREUR CRITIQUE:")
    logger.error(error)
    throw error
  }
}
