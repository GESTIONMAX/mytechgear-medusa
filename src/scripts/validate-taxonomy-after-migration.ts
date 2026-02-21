import { ExecArgs } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  Modules,
} from "@medusajs/framework/utils"
import { CATEGORIES, COLLECTIONS } from "../config/taxonomy"

/**
 * Script de Validation: Vérifier l'intégrité de la taxonomie après migration
 *
 * OBJECTIF:
 * - Détecter produits orphelins (sans catégorie)
 * - Vérifier unicité des handles (categories + collections)
 * - Valider structure hiérarchique (16 catégories, 6 collections)
 * - Comparer avant/après migration
 *
 * USAGE:
 * - Exécuter AVANT migration: collecter baseline
 * - Exécuter APRÈS migration: valider changements
 *
 * RUN: npm exec medusa exec ./src/scripts/validate-taxonomy-after-migration.ts
 */

interface ValidationReport {
  timestamp: string
  database: string

  // Counts
  totalProducts: number
  totalCategories: number
  totalCollections: number
  totalTags: number

  // Orphaned products
  orphanedProducts: Array<{
    id: string
    handle: string
    title: string
  }>

  // Handle uniqueness
  duplicateHandles: Array<{
    handle: string
    type: string
    count: number
  }>

  // Expected structure
  expectedCategories: {
    found: number
    expected: number
    missing: string[]
    extra: string[]
  }

  expectedCollections: {
    found: number
    expected: number
    missing: string[]
    extra: string[]
  }

  // Category distribution
  productsByCategory: Record<string, number>
  productsByCollection: Record<string, number>

  // Hierarchy validation
  hierarchyValid: boolean
  hierarchyIssues: string[]

  // Overall status
  isValid: boolean
  errors: string[]
  warnings: string[]
}

export default async function validateTaxonomyAfterMigration({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const productModuleService = container.resolve(Modules.PRODUCT)

  logger.info("🔍 Validating Taxonomy Structure...")
  logger.info("=" .repeat(60))

  const report: ValidationReport = {
    timestamp: new Date().toISOString(),
    database: process.env.DATABASE_URL?.includes('test') ? 'TEST' : 'UNKNOWN',
    totalProducts: 0,
    totalCategories: 0,
    totalCollections: 0,
    totalTags: 0,
    orphanedProducts: [],
    duplicateHandles: [],
    expectedCategories: {
      found: 0,
      expected: 16,
      missing: [],
      extra: [],
    },
    expectedCollections: {
      found: 0,
      expected: 6,
      missing: [],
      extra: [],
    },
    productsByCategory: {},
    productsByCollection: {},
    hierarchyValid: true,
    hierarchyIssues: [],
    isValid: true,
    errors: [],
    warnings: [],
  }

  try {
    // ============================================
    // 1. FETCH ALL DATA
    // ============================================
    logger.info("\n📦 Fetching data...")

    const products = await productModuleService.listProducts(
      { deleted_at: null },
      { relations: ["categories", "collection", "tags"] }
    )

    const categories = await productModuleService.listProductCategories(
      { deleted_at: null },
      { relations: ["parent_category"] }
    )

    const collections = await productModuleService.listProductCollections(
      { deleted_at: null }
    )

    const tags = await productModuleService.listProductTags()

    report.totalProducts = products.length
    report.totalCategories = categories.length
    report.totalCollections = collections.length
    report.totalTags = tags.length

    logger.info(`  ✅ Products: ${products.length}`)
    logger.info(`  ✅ Categories: ${categories.length}`)
    logger.info(`  ✅ Collections: ${collections.length}`)
    logger.info(`  ✅ Tags: ${tags.length}`)

    // ============================================
    // 2. CHECK ORPHANED PRODUCTS
    // ============================================
    logger.info("\n🔍 Checking for orphaned products (no category)...")

    for (const product of products) {
      if (!product.categories || product.categories.length === 0) {
        report.orphanedProducts.push({
          id: product.id,
          handle: product.handle,
          title: product.title,
        })
        report.errors.push(`Orphaned product: ${product.handle} (${product.title})`)
      }
    }

    if (report.orphanedProducts.length > 0) {
      logger.error(`  ❌ CRITICAL: ${report.orphanedProducts.length} orphaned products found!`)
      report.orphanedProducts.forEach(p => {
        logger.error(`     - ${p.handle} (${p.title})`)
      })
      report.isValid = false
    } else {
      logger.info("  ✅ No orphaned products - all have categories")
    }

    // ============================================
    // 3. CHECK HANDLE UNIQUENESS
    // ============================================
    logger.info("\n🔍 Checking handle uniqueness (categories + collections)...")

    const handleMap = new Map<string, Array<{ type: string; id: string }>>()

    categories.forEach(cat => {
      const existing = handleMap.get(cat.handle) || []
      existing.push({ type: 'category', id: cat.id })
      handleMap.set(cat.handle, existing)
    })

    collections.forEach(col => {
      const existing = handleMap.get(col.handle) || []
      existing.push({ type: 'collection', id: col.id })
      handleMap.set(col.handle, existing)
    })

    for (const [handle, items] of handleMap.entries()) {
      if (items.length > 1) {
        report.duplicateHandles.push({
          handle,
          type: items.map(i => i.type).join(' + '),
          count: items.length,
        })
        report.errors.push(`Duplicate handle: ${handle} used by ${items.length} entities`)
      }
    }

    if (report.duplicateHandles.length > 0) {
      logger.error(`  ❌ CRITICAL: ${report.duplicateHandles.length} duplicate handles found!`)
      report.duplicateHandles.forEach(dup => {
        logger.error(`     - "${dup.handle}" (${dup.type}, count: ${dup.count})`)
      })
      report.isValid = false
    } else {
      logger.info("  ✅ All handles are unique")
    }

    // ============================================
    // 4. VALIDATE EXPECTED CATEGORIES (16)
    // ============================================
    logger.info("\n🔍 Validating expected categories (16 hierarchical)...")

    const expectedCategoryIds = Object.values(CATEGORIES)
    const foundCategoryIds = categories.map(c => c.id)

    report.expectedCategories.found = categories.length

    // Missing categories
    for (const expectedId of expectedCategoryIds) {
      if (!foundCategoryIds.includes(expectedId)) {
        report.expectedCategories.missing.push(expectedId)
        report.errors.push(`Missing expected category: ${expectedId}`)
      }
    }

    // Extra categories (not in CATEGORIES constant)
    for (const cat of categories) {
      if (!expectedCategoryIds.includes(cat.id)) {
        report.expectedCategories.extra.push(`${cat.handle} (${cat.id})`)
        report.warnings.push(`Extra category found: ${cat.handle} (not in CATEGORIES constant)`)
      }
    }

    if (report.expectedCategories.missing.length > 0) {
      logger.error(`  ❌ Missing ${report.expectedCategories.missing.length} expected categories:`)
      report.expectedCategories.missing.forEach(id => logger.error(`     - ${id}`))
      report.isValid = false
    } else {
      logger.info("  ✅ All 16 expected categories present")
    }

    if (report.expectedCategories.extra.length > 0) {
      logger.warn(`  ⚠️  Found ${report.expectedCategories.extra.length} extra categories:`)
      report.expectedCategories.extra.forEach(cat => logger.warn(`     - ${cat}`))
    }

    // ============================================
    // 5. VALIDATE EXPECTED COLLECTIONS (6)
    // ============================================
    logger.info("\n🔍 Validating expected collections (6 total)...")

    const expectedCollectionIds = Object.values(COLLECTIONS)
    const foundCollectionIds = collections.map(c => c.id)

    report.expectedCollections.found = collections.length

    // Missing collections
    for (const expectedId of expectedCollectionIds) {
      if (!foundCollectionIds.includes(expectedId)) {
        report.expectedCollections.missing.push(expectedId)
        report.errors.push(`Missing expected collection: ${expectedId}`)
      }
    }

    // Extra collections
    for (const col of collections) {
      if (!expectedCollectionIds.includes(col.id)) {
        report.expectedCollections.extra.push(`${col.handle} (${col.id})`)
        report.warnings.push(`Extra collection found: ${col.handle}`)
      }
    }

    if (report.expectedCollections.missing.length > 0) {
      logger.error(`  ❌ Missing ${report.expectedCollections.missing.length} expected collections:`)
      report.expectedCollections.missing.forEach(id => logger.error(`     - ${id}`))
      report.isValid = false
    } else {
      logger.info("  ✅ All 6 expected collections present")
    }

    if (report.expectedCollections.extra.length > 0) {
      logger.warn(`  ⚠️  Found ${report.expectedCollections.extra.length} extra collections:`)
      report.expectedCollections.extra.forEach(col => logger.warn(`     - ${col}`))
    }

    // ============================================
    // 6. VALIDATE HIERARCHY (mpath structure)
    // ============================================
    logger.info("\n🔍 Validating category hierarchy (mpath structure)...")

    for (const category of categories) {
      // Check mpath format: should end with category ID + dot
      if (!category.mpath.endsWith(`${category.id}.`)) {
        report.hierarchyIssues.push(`Category ${category.handle}: mpath doesn't end with own ID`)
        report.hierarchyValid = false
      }

      // Check parent_category_id consistency with mpath
      if (category.parent_category_id) {
        const parentId = category.parent_category_id
        if (!category.mpath.includes(`${parentId}.`)) {
          report.hierarchyIssues.push(
            `Category ${category.handle}: parent_category_id ${parentId} not in mpath ${category.mpath}`
          )
          report.hierarchyValid = false
        }
      } else {
        // Root category: mpath should only contain own ID
        const expectedMpath = `${category.id}.`
        if (category.mpath !== expectedMpath) {
          report.hierarchyIssues.push(
            `Root category ${category.handle}: expected mpath "${expectedMpath}" but got "${category.mpath}"`
          )
          report.hierarchyValid = false
        }
      }
    }

    if (!report.hierarchyValid) {
      logger.error(`  ❌ Hierarchy validation failed (${report.hierarchyIssues.length} issues):`)
      report.hierarchyIssues.forEach(issue => logger.error(`     - ${issue}`))
      report.errors.push(...report.hierarchyIssues)
      report.isValid = false
    } else {
      logger.info("  ✅ Category hierarchy structure valid")
    }

    // ============================================
    // 7. PRODUCT DISTRIBUTION
    // ============================================
    logger.info("\n📊 Product distribution by category...")

    for (const product of products) {
      if (product.categories && product.categories.length > 0) {
        for (const category of product.categories) {
          const key = `${category.handle} (${category.id})`
          report.productsByCategory[key] = (report.productsByCategory[key] || 0) + 1
        }
      }
    }

    const sortedByCategory = Object.entries(report.productsByCategory)
      .sort((a, b) => b[1] - a[1])

    if (sortedByCategory.length > 0) {
      sortedByCategory.forEach(([category, count]) => {
        logger.info(`  - ${category}: ${count} product(s)`)
      })
    } else {
      logger.warn("  ⚠️  No products assigned to any category!")
    }

    logger.info("\n📊 Product distribution by collection...")

    for (const product of products) {
      if (product.collection) {
        const key = `${product.collection.handle} (${product.collection.id})`
        report.productsByCollection[key] = (report.productsByCollection[key] || 0) + 1
      }
    }

    const sortedByCollection = Object.entries(report.productsByCollection)
      .sort((a, b) => b[1] - a[1])

    if (sortedByCollection.length > 0) {
      sortedByCollection.forEach(([collection, count]) => {
        logger.info(`  - ${collection}: ${count} product(s)`)
      })
    } else {
      logger.warn("  ⚠️  No products assigned to any collection!")
    }

    // ============================================
    // 8. FINAL SUMMARY
    // ============================================
    logger.info("\n" + "=".repeat(60))
    logger.info("📋 VALIDATION SUMMARY")
    logger.info("=".repeat(60))

    logger.info(`\n🕐 Timestamp: ${report.timestamp}`)
    logger.info(`🗄️  Database: ${report.database}`)

    logger.info("\n📊 COUNTS:")
    logger.info(`  Products:    ${report.totalProducts}`)
    logger.info(`  Categories:  ${report.totalCategories} (expected: 16)`)
    logger.info(`  Collections: ${report.totalCollections} (expected: 6)`)
    logger.info(`  Tags:        ${report.totalTags}`)

    logger.info("\n🔍 VALIDATIONS:")
    logger.info(`  Orphaned products:     ${report.orphanedProducts.length === 0 ? '✅ PASS (0)' : `❌ FAIL (${report.orphanedProducts.length})`}`)
    logger.info(`  Handle uniqueness:     ${report.duplicateHandles.length === 0 ? '✅ PASS' : `❌ FAIL (${report.duplicateHandles.length} duplicates)`}`)
    logger.info(`  Expected categories:   ${report.expectedCategories.missing.length === 0 ? '✅ PASS (16/16)' : `❌ FAIL (${report.expectedCategories.found - report.expectedCategories.missing.length}/16)`}`)
    logger.info(`  Expected collections:  ${report.expectedCollections.missing.length === 0 ? '✅ PASS (6/6)' : `❌ FAIL (${report.expectedCollections.found - report.expectedCollections.missing.length}/6)`}`)
    logger.info(`  Hierarchy structure:   ${report.hierarchyValid ? '✅ PASS' : `❌ FAIL (${report.hierarchyIssues.length} issues)`}`)

    if (report.errors.length > 0) {
      logger.info(`\n❌ ERRORS (${report.errors.length}):`)
      report.errors.slice(0, 10).forEach(err => logger.error(`  - ${err}`))
      if (report.errors.length > 10) {
        logger.error(`  ... and ${report.errors.length - 10} more`)
      }
    }

    if (report.warnings.length > 0) {
      logger.info(`\n⚠️  WARNINGS (${report.warnings.length}):`)
      report.warnings.slice(0, 5).forEach(warn => logger.warn(`  - ${warn}`))
      if (report.warnings.length > 5) {
        logger.warn(`  ... and ${report.warnings.length - 5} more`)
      }
    }

    logger.info("\n" + "=".repeat(60))

    if (report.isValid) {
      logger.info("✅ TAXONOMY VALIDATION: PASSED")
      logger.info("   All critical validations passed. Taxonomy is coherent.")
    } else {
      logger.error("❌ TAXONOMY VALIDATION: FAILED")
      logger.error(`   ${report.errors.length} critical error(s) found. Review required.`)
    }

    logger.info("=".repeat(60))

    // ============================================
    // 9. EXPORT REPORT AS JSON
    // ============================================
    logger.info("\n💾 Validation report saved in console output")
    logger.info("   To save to file, redirect output:")
    logger.info("   npm exec medusa exec ./src/scripts/validate-taxonomy-after-migration.ts > validation-report.json")

    // Return report as JSON for programmatic use
    return report

  } catch (error) {
    logger.error("❌ Fatal error during validation:", error)
    report.isValid = false
    report.errors.push(`Fatal error: ${error.message}`)
    throw error
  }
}
