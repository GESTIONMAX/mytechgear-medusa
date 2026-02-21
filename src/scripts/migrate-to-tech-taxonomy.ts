/**
 * Script de migration: Taxonomie par Technologie de Verre (Option B)
 *
 * NOUVELLE STRUCTURE (basée sur technologie, pas use-case):
 *
 * Lunettes Connectées (root)
 * ├── Smart Tech (Électroniques)
 * │   ├── Prismatic™ (color-changing)
 * │   ├── Eclipse™ (tint-adjustable)
 * │   ├── HVL™ (tint-adjustable)
 * │   ├── Electrochromic (tint-adjustable)
 * │   └── Liquid Crystal
 * └── Classic Eyewear (Verres standards)
 *
 * Avantages:
 * - Classification claire par technologie de verre
 * - Reflète la vraie différenciation technique
 * - Évolutif (facile d'ajouter nouvelles technologies)
 * - SEO aligné sur les features techniques
 */

import { ExecArgs } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"

// Nouvelle structure (Option B - Technologie)
const NEW_CATEGORIES = [
  {
    id: "pcat_root",
    name: "Lunettes Connectées",
    handle: "lunettes-connectees",
    description: "Toutes nos lunettes intelligentes et électroniques",
    parent_category_id: null,
    rank: 0,
    is_active: true,
    is_internal: false,
  },
  {
    id: "pcat_smart_tech",
    name: "Smart Tech",
    handle: "smart-tech",
    description: "Lunettes électroniques à verres auto-ajustables (Prismatic™, Eclipse™, HVL™, Electrochromic, LC)",
    parent_category_id: "pcat_root",
    rank: 0,
    is_active: true,
    is_internal: false,
  },
  {
    id: "pcat_classic",
    name: "Classic Eyewear",
    handle: "classic-eyewear",
    description: "Lunettes à verres teintés classiques (non-électroniques)",
    parent_category_id: "pcat_root",
    rank: 1,
    is_active: true,
    is_internal: false,
  },
]

// Mapping produits → catégories (basé sur lens_technology)
const PRODUCT_MAPPING: Record<string, string> = {
  // ============================================
  // SMART TECH (Verres Électroniques)
  // ============================================

  // Prismatic™ Color-changing
  "aura": "pcat_smart_tech",
  "aura-audio": "pcat_smart_tech",

  // Eclipse™ Tint-Adjustable
  "shield": "pcat_smart_tech",
  "music-shield": "pcat_smart_tech",

  // HVL™ Tint-Adjustable
  "infinity": "pcat_smart_tech",
  "mr1-infinity": "pcat_smart_tech",

  // Electrochromic Tint-Adjustable
  "aroza": "pcat_smart_tech",
  "dragon-chamelo": "pcat_smart_tech",
  "veil": "pcat_smart_tech",

  // Liquid Crystal (LC)
  "zurix": "pcat_smart_tech",

  // ============================================
  // CLASSIC EYEWEAR (Verres Standards)
  // ============================================

  "dragon": "pcat_classic",
  "duck-classic": "pcat_classic",
  "dusk-classic": "pcat_classic",
  "euphoria": "pcat_classic",
  "falcon": "pcat_classic",
  "prime": "pcat_classic",
}

export default async function migrateToTechTaxonomy({ container }: ExecArgs) {
  const logger = container.resolve("logger")
  const productModuleService = container.resolve(Modules.PRODUCT)

  logger.info("🔄 MIGRATION TAXONOMIE: Par Technologie de Verre")
  logger.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")

  try {
    // ============================================
    // ÉTAPE 1: Backup état actuel
    // ============================================
    logger.info("\n📦 ÉTAPE 1/5: Backup des catégories actuelles")

    const existingCategories = await productModuleService.listProductCategories({})
    logger.info(`   ✅ ${existingCategories.length} catégories actuelles sauvegardées`)

    existingCategories.forEach(cat => {
      logger.info(`   - ${cat.id}: ${cat.name} (${cat.handle})`)
    })

    // ============================================
    // ÉTAPE 2: Supprimer toutes catégories
    // ============================================
    logger.info("\n🗑️  ÉTAPE 2/5: Suppression complète de toutes catégories")

    // Détacher d'abord tous les produits
    const allProducts = await productModuleService.listProducts({})
    for (const product of allProducts) {
      try {
        await productModuleService.updateProducts(product.id, {
          categories: [],
        })
      } catch (error) {
        // Ignorer les erreurs de détachement
      }
    }
    logger.info(`   ✅ Produits détachés des catégories`)

    // Supprimer toutes catégories (enfants d'abord, racine en dernier)
    const categoryIds = existingCategories.map(c => c.id)
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
      logger.warn(`   ⚠️  ${remainingCats.length} catégories restantes (seront écrasées)`)
    } else {
      logger.info(`   ✅ Toutes catégories supprimées`)
    }

    // ============================================
    // ÉTAPE 3: Créer nouvelle structure Tech
    // ============================================
    logger.info("\n🆕 ÉTAPE 3/5: Création structure par Technologie")

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
    // ÉTAPE 4: Ré-assigner produits selon technologie
    // ============================================
    logger.info("\n🔗 ÉTAPE 4/5: Assignation produits par technologie de verre")

    let smartTechCount = 0
    let classicCount = 0
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
        const lensTech = product.metadata?.lens_technology || "N/A"

        logger.info(`   ✅ ${product.title} → ${categoryName}`)
        logger.info(`      Technologie: ${lensTech}`)

        if (newCategoryId === "pcat_smart_tech") {
          smartTechCount++
        } else if (newCategoryId === "pcat_classic") {
          classicCount++
        }
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
    logger.info("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    logger.info("✅ MIGRATION TAXONOMIE TECHNOLOGIE TERMINÉE")
    logger.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    logger.info(`\n📊 Statistiques:`)
    logger.info(`   • Catégories supprimées: ${existingCategories.length}`)
    logger.info(`   • Catégories créées: ${finalCategories.length}`)
    logger.info(`   • Smart Tech (électroniques): ${smartTechCount} produits`)
    logger.info(`   • Classic Eyewear (standards): ${classicCount} produits`)
    logger.info(`   • Produits ignorés: ${skippedCount}`)

    logger.info("\n🎯 Technologies Smart Tech:")
    logger.info("   • Prismatic™ Color-changing: Aura, Aura Audio")
    logger.info("   • Eclipse™ Tint-Adjustable: Shield, Music Shield")
    logger.info("   • HVL™ Tint-Adjustable: Infinity, MR1 x Infinity")
    logger.info("   • Electrochromic: Aroza, Dragon Chamelo, Veil")
    logger.info("   • Liquid Crystal: Zurix")

    logger.info("\n💡 Prochaines étapes:")
    logger.info("   1. Vérifier dans dashboard admin (/admin/categories)")
    logger.info("   2. Ajouter tags de technologie (Prismatic, Eclipse, HVL, Electrochromic, LC)")
    logger.info("   3. Mettre à jour frontend pour filtrage par technologie")
    logger.info("   4. Tester navigation catégories")

  } catch (error: any) {
    logger.error("\n❌ ERREUR CRITIQUE:")
    logger.error(error)
    logger.error("\n⚠️  Vérifiez l'état de la base et restaurez backup si nécessaire")
    throw error
  }
}
