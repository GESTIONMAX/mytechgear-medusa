import { ExecArgs } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  Modules,
} from "@medusajs/framework/utils"
import { exec } from "child_process"
import { promisify } from "util"
import * as fs from "fs"
import * as path from "path"

const execAsync = promisify(exec)

/**
 * POST-OPTION A COMPLETE AUDIT
 *
 * Objectif: Établir l'état RÉEL du catalogue Medusa après les corrections Option A
 *
 * Vérifications:
 * 1. État réel de la taxonomie (collections, catégories)
 * 2. État réel du catalogue (produits, variantes, pricing)
 * 3. Recherche données sport dans PIM/exports
 * 4. Architecture actuelle des sports (si existe)
 * 5. Recommandations architecture sport
 */

interface AuditResult {
  timestamp: string
  taxonomy: {
    collections: {
      count: number
      items: Array<{ id: string; title: string; handle: string; products_count: number }>
    }
    categories: {
      count: number
      items: Array<{ id: string; name: string; handle: string; parent_id: string | null; products_count: number }>
    }
  }
  catalog: {
    products: {
      count: number
      items: Array<{
        id: string
        title: string
        handle: string
        collection_id: string | null
        collection_title: string | null
        category_ids: string[]
        category_names: string[]
        variants_count: number
        metadata: Record<string, any>
      }>
    }
    variants: {
      count: number
      with_pricing: number
      without_pricing: number
    }
  }
  sportData: {
    found_in_metadata: boolean
    found_in_exports: boolean
    current_implementation: string
    sport_references: Array<{
      source: string
      data: any
    }>
  }
  recommendations: {
    sport_architecture: string
    reasoning: string
    implementation_steps: string[]
  }
}

export default async function postOptionACompleteAudit({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const productService = container.resolve(Modules.PRODUCT)

  logger.info("🔍 POST-OPTION A COMPLETE AUDIT")
  logger.info("=" .repeat(70))
  logger.info("Objectif: Établir l'état RÉEL du catalogue Medusa\n")

  const auditResult: AuditResult = {
    timestamp: new Date().toISOString(),
    taxonomy: {
      collections: { count: 0, items: [] },
      categories: { count: 0, items: [] }
    },
    catalog: {
      products: { count: 0, items: [] },
      variants: { count: 0, with_pricing: 0, without_pricing: 0 }
    },
    sportData: {
      found_in_metadata: false,
      found_in_exports: false,
      current_implementation: "NONE",
      sport_references: []
    },
    recommendations: {
      sport_architecture: "",
      reasoning: "",
      implementation_steps: []
    }
  }

  // ====================================================================
  // 1. AUDIT TAXONOMIE - COLLECTIONS
  // ====================================================================

  logger.info("📚 ÉTAPE 1: Audit Collections\n")

  try {
    // Medusa v2: product has collection_id field directly
    const collectionsQuery = `
      SELECT
        c.id,
        c.title,
        c.handle,
        COUNT(DISTINCT p.id) as products_count
      FROM product_collection c
      LEFT JOIN product p ON p.collection_id = c.id AND p.deleted_at IS NULL
      WHERE c.deleted_at IS NULL
      GROUP BY c.id, c.title, c.handle
      ORDER BY c.title;
    `

    const { stdout: collectionsOutput } = await execAsync(
      `PGPASSWORD=medusa psql -h localhost -p 5433 -U medusa -d medusa -t -A -F'|' -c "${collectionsQuery}"`,
      { maxBuffer: 1024 * 1024 }
    )

    const collections = collectionsOutput.trim().split('\n').filter(l => l.trim()).map(line => {
      const [id, title, handle, products_count] = line.split('|')
      return { id, title, handle, products_count: parseInt(products_count) || 0 }
    })

    auditResult.taxonomy.collections.count = collections.length
    auditResult.taxonomy.collections.items = collections

    logger.info(`   Collections trouvées: ${collections.length}`)
    collections.forEach(c => {
      logger.info(`   - ${c.title} (${c.handle}): ${c.products_count} produits`)
    })

    // Détecter si des collections sont liées au sport
    const sportCollections = collections.filter(c =>
      c.title.toLowerCase().includes('cyclisme') ||
      c.title.toLowerCase().includes('running') ||
      c.title.toLowerCase().includes('trail') ||
      c.title.toLowerCase().includes('vélo') ||
      c.title.toLowerCase().includes('course')
    )

    if (sportCollections.length > 0) {
      logger.info(`\n   🏃 Collections sport détectées: ${sportCollections.length}`)
      sportCollections.forEach(c => {
        logger.info(`      - ${c.title}: ${c.products_count} produits`)
      })
      auditResult.sportData.found_in_metadata = true
      auditResult.sportData.current_implementation = "COLLECTIONS"
      auditResult.sportData.sport_references.push({
        source: "collections",
        data: sportCollections
      })
    }

  } catch (error: any) {
    logger.error(`   ❌ Erreur lors de l'audit collections: ${error.message}`)
  }

  // ====================================================================
  // 2. AUDIT TAXONOMIE - CATÉGORIES
  // ====================================================================

  logger.info("\n🏷️  ÉTAPE 2: Audit Catégories (Product Categories)\n")

  try {
    const categoriesQuery = `
      SELECT
        pc.id,
        pc.name,
        pc.handle,
        pc.parent_category_id,
        COUNT(DISTINCT pcp.product_id) as products_count
      FROM product_category pc
      LEFT JOIN product_category_product pcp ON pcp.product_category_id = pc.id
      WHERE pc.deleted_at IS NULL
      GROUP BY pc.id, pc.name, pc.handle, pc.parent_category_id
      ORDER BY pc.parent_category_id NULLS FIRST, pc.name;
    `

    const { stdout: categoriesOutput } = await execAsync(
      `PGPASSWORD=medusa psql -h localhost -p 5433 -U medusa -d medusa -t -A -F'|' -c "${categoriesQuery}"`,
      { maxBuffer: 1024 * 1024 }
    )

    const categories = categoriesOutput.trim().split('\n').filter(l => l.trim()).map(line => {
      const [id, name, handle, parent_id, products_count] = line.split('|')
      return {
        id,
        name,
        handle,
        parent_id: parent_id || null,
        products_count: parseInt(products_count) || 0
      }
    })

    auditResult.taxonomy.categories.count = categories.length
    auditResult.taxonomy.categories.items = categories

    logger.info(`   Catégories trouvées: ${categories.length}`)
    categories.forEach(c => {
      const indent = c.parent_id ? "     " : "   "
      logger.info(`${indent}- ${c.name} (${c.handle}): ${c.products_count} produits`)
    })

  } catch (error: any) {
    logger.error(`   ❌ Erreur lors de l'audit catégories: ${error.message}`)
  }

  // ====================================================================
  // 3. AUDIT CATALOGUE - PRODUITS
  // ====================================================================

  logger.info("\n📦 ÉTAPE 3: Audit Produits\n")

  const allProducts = await productService.listProducts({}, {
    take: 200,
    relations: ['variants', 'collection', 'categories']
  })

  auditResult.catalog.products.count = allProducts.length

  logger.info(`   Produits totaux: ${allProducts.length}\n`)

  for (const product of allProducts) {
    const productData: any = {
      id: product.id,
      title: product.title,
      handle: product.handle,
      collection_id: product.collection_id || null,
      collection_title: (product.collection as any)?.title || null,
      category_ids: product.categories?.map((c: any) => c.id) || [],
      category_names: product.categories?.map((c: any) => c.name) || [],
      variants_count: product.variants?.length || 0,
      metadata: product.metadata || {}
    }

    auditResult.catalog.products.items.push(productData)

    // Log avec informations taxonomie
    const collectionInfo = productData.collection_title ? `Collection: ${productData.collection_title}` : "Aucune collection"
    const categoriesInfo = productData.category_names.length > 0
      ? `Catégories: ${productData.category_names.join(', ')}`
      : "Aucune catégorie"

    logger.info(`   📦 ${product.title} (${product.handle})`)
    logger.info(`      ${collectionInfo}`)
    logger.info(`      ${categoriesInfo}`)
    logger.info(`      Variants: ${productData.variants_count}`)

    // Chercher données sport dans metadata
    if (productData.metadata) {
      const sportKeys = ['sport', 'sports', 'sportIds', 'discipline', 'disciplines', 'sportif', 'sport_cible']
      const foundSportData = Object.keys(productData.metadata).filter(key =>
        sportKeys.some(sportKey => key.toLowerCase().includes(sportKey.toLowerCase()))
      )

      if (foundSportData.length > 0) {
        auditResult.sportData.found_in_metadata = true
        logger.info(`      🏃 Metadata sport trouvée: ${foundSportData.join(', ')}`)

        auditResult.sportData.sport_references.push({
          source: `product:${product.handle}:metadata`,
          data: foundSportData.reduce((acc, key) => {
            acc[key] = productData.metadata[key]
            return acc
          }, {} as any)
        })
      }
    }

    logger.info("")
  }

  // ====================================================================
  // 4. AUDIT CATALOGUE - VARIANTES & PRICING
  // ====================================================================

  logger.info("💰 ÉTAPE 4: Audit Variantes & Pricing\n")

  try {
    const pricingQuery = `
      SELECT
        pv.sku,
        pv.id as variant_id,
        CASE
          WHEN vps.price_set_id IS NOT NULL AND p.id IS NOT NULL THEN 'OK'
          WHEN vps.price_set_id IS NULL THEN 'NO_LINK'
          WHEN p.id IS NULL THEN 'NO_EUR_PRICE'
          ELSE 'UNKNOWN'
        END as pricing_status,
        p.amount as eur_amount
      FROM product_variant pv
      LEFT JOIN product_variant_price_set vps ON vps.variant_id = pv.id
      LEFT JOIN price p ON p.price_set_id = vps.price_set_id AND p.currency_code = 'eur' AND p.deleted_at IS NULL
      WHERE pv.deleted_at IS NULL
      ORDER BY pv.sku;
    `

    const { stdout: pricingOutput } = await execAsync(
      `PGPASSWORD=medusa psql -h localhost -p 5433 -U medusa -d medusa -t -A -F'|' -c "${pricingQuery}"`,
      { maxBuffer: 1024 * 1024 }
    )

    const pricingResults = pricingOutput.trim().split('\n').filter(l => l.trim()).map(line => {
      const [sku, variant_id, pricing_status, eur_amount] = line.split('|')
      return {
        sku,
        variant_id,
        pricing_status,
        eur_amount: eur_amount ? parseInt(eur_amount) : null
      }
    })

    auditResult.catalog.variants.count = pricingResults.length
    auditResult.catalog.variants.with_pricing = pricingResults.filter(r => r.pricing_status === 'OK').length
    auditResult.catalog.variants.without_pricing = pricingResults.filter(r => r.pricing_status !== 'OK').length

    logger.info(`   Variants totaux: ${pricingResults.length}`)
    logger.info(`   Avec pricing EUR: ${auditResult.catalog.variants.with_pricing}/${pricingResults.length}`)
    logger.info(`   Sans pricing EUR: ${auditResult.catalog.variants.without_pricing}/${pricingResults.length}`)

    if (auditResult.catalog.variants.without_pricing > 0) {
      logger.warn(`\n   ⚠️  Variants sans pricing:`)
      pricingResults.filter(r => r.pricing_status !== 'OK').forEach(v => {
        logger.warn(`      - ${v.sku}: ${v.pricing_status}`)
      })
    } else {
      logger.info(`   ✅ Tous les variants ont un pricing EUR`)
    }

  } catch (error: any) {
    logger.error(`   ❌ Erreur lors de l'audit pricing: ${error.message}`)
  }

  // ====================================================================
  // 5. RECHERCHE DONNÉES SPORT DANS EXPORTS/PIM
  // ====================================================================

  logger.info("\n🏃 ÉTAPE 5: Recherche Données Sport dans PIM/Exports\n")

  // Chercher dans exports directory
  const exportsDir = path.join(process.cwd(), "exports")
  if (fs.existsSync(exportsDir)) {
    const exportFiles = fs.readdirSync(exportsDir).filter(f => f.endsWith('.json'))

    logger.info(`   Fichiers exports trouvés: ${exportFiles.length}`)

    for (const file of exportFiles) {
      try {
        const filePath = path.join(exportsDir, file)
        const content = fs.readFileSync(filePath, 'utf-8')
        const data = JSON.parse(content)

        // Chercher clés contenant "sport"
        const searchKeys = (obj: any, prefix = ''): any => {
          let found: any[] = []
          for (const [key, value] of Object.entries(obj)) {
            const fullKey = prefix ? `${prefix}.${key}` : key
            if (key.toLowerCase().includes('sport') || key.toLowerCase().includes('discipline')) {
              found.push({ key: fullKey, value })
            }
            if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
              found = [...found, ...searchKeys(value, fullKey)]
            }
          }
          return found
        }

        const sportKeys = searchKeys(data)
        if (sportKeys.length > 0) {
          auditResult.sportData.found_in_exports = true
          logger.info(`   📄 ${file}: ${sportKeys.length} références sport trouvées`)
          sportKeys.forEach(({ key, value }) => {
            logger.info(`      - ${key}: ${JSON.stringify(value).substring(0, 100)}...`)
          })

          auditResult.sportData.sport_references.push({
            source: `export:${file}`,
            data: sportKeys
          })
        }

      } catch (error: any) {
        logger.warn(`   ⚠️  Impossible de lire ${file}: ${error.message}`)
      }
    }
  } else {
    logger.info(`   ℹ️  Répertoire exports non trouvé`)
  }

  // Chercher dans scripts PIM
  const scriptsDir = path.join(process.cwd(), "src", "scripts")
  if (fs.existsSync(scriptsDir)) {
    const scriptFiles = fs.readdirSync(scriptsDir).filter(f => f.includes('import') && f.endsWith('.ts'))

    logger.info(`\n   Scripts d'import PIM trouvés: ${scriptFiles.length}`)

    for (const file of scriptFiles) {
      try {
        const filePath = path.join(scriptsDir, file)
        const content = fs.readFileSync(filePath, 'utf-8')

        // Chercher mentions de sport dans le code
        const sportMentions = content.match(/sport|discipline|cycliste|trail|running/gi)
        if (sportMentions && sportMentions.length > 0) {
          logger.info(`   📜 ${file}: ${sportMentions.length} mentions sport`)

          // Extraire lignes pertinentes
          const lines = content.split('\n')
          const relevantLines = lines.filter(line =>
            /sport|discipline|cycliste|trail|running/i.test(line)
          ).slice(0, 3)

          relevantLines.forEach(line => {
            logger.info(`      "${line.trim().substring(0, 80)}..."`)
          })

          auditResult.sportData.sport_references.push({
            source: `script:${file}`,
            data: { mentions: sportMentions.length, sample_lines: relevantLines }
          })
        }

      } catch (error: any) {
        // Ignorer erreurs lecture
      }
    }
  }

  // ====================================================================
  // 6. DÉTERMINER IMPLÉMENTATION ACTUELLE SPORT
  // ====================================================================

  logger.info("\n🔍 ÉTAPE 6: Détermination Implémentation Actuelle Sport\n")

  // Vérifier si des catégories sport existent
  const sportCategories = auditResult.taxonomy.categories.items.filter(c =>
    c.name.toLowerCase().includes('sport') ||
    c.name.toLowerCase().includes('cycliste') ||
    c.name.toLowerCase().includes('trail') ||
    c.name.toLowerCase().includes('running')
  )

  // Vérifier si des collections sport existent
  const sportCollections = auditResult.taxonomy.collections.items.filter(c =>
    c.title.toLowerCase().includes('sport') ||
    c.title.toLowerCase().includes('cycliste') ||
    c.title.toLowerCase().includes('trail') ||
    c.title.toLowerCase().includes('running')
  )

  if (sportCategories.length > 0) {
    auditResult.sportData.current_implementation = "CATEGORIES"
    logger.info(`   ✅ Implémentation: CATÉGORIES (${sportCategories.length} trouvées)`)
    sportCategories.forEach(c => logger.info(`      - ${c.name}`))
  } else if (sportCollections.length > 0) {
    auditResult.sportData.current_implementation = "COLLECTIONS"
    logger.info(`   ✅ Implémentation: COLLECTIONS (${sportCollections.length} trouvées)`)
    sportCollections.forEach(c => logger.info(`      - ${c.title}`))
  } else if (auditResult.sportData.found_in_metadata) {
    auditResult.sportData.current_implementation = "METADATA"
    logger.info(`   ⚠️  Implémentation: METADATA (données dans product.metadata)`)
  } else if (auditResult.sportData.found_in_exports) {
    auditResult.sportData.current_implementation = "PIM_ONLY"
    logger.info(`   ⚠️  Implémentation: PIM_ONLY (données dans exports PIM, non importées)`)
  } else {
    auditResult.sportData.current_implementation = "NONE"
    logger.info(`   ❌ Implémentation: AUCUNE (pas de données sport détectées)`)
  }

  // ====================================================================
  // 7. RECOMMANDATIONS ARCHITECTURE SPORT
  // ====================================================================

  logger.info("\n💡 ÉTAPE 7: Recommandations Architecture Sport\n")

  // Analyser contexte pour recommandation
  const hasCollections = auditResult.taxonomy.collections.count > 0
  const hasCategories = auditResult.taxonomy.categories.count > 0
  const hasSportData = auditResult.sportData.found_in_metadata || auditResult.sportData.found_in_exports

  // Vérifier si des collections sport existent
  const sportCollectionsInTaxonomy = auditResult.taxonomy.collections.items.filter(c =>
    c.title.toLowerCase().includes('cyclisme') ||
    c.title.toLowerCase().includes('running') ||
    c.title.toLowerCase().includes('trail') ||
    c.title.toLowerCase().includes('vélo') ||
    c.title.toLowerCase().includes('course')
  )

  let recommendation = ""
  let reasoning = ""
  let steps: string[] = []

  if (sportCollectionsInTaxonomy.length > 0) {
    recommendation = "SPORT DÉJÀ IMPLÉMENTÉ VIA COLLECTIONS"
    reasoning = `${sportCollectionsInTaxonomy.length} collections sport existent déjà et sont utilisées (${sportCollectionsInTaxonomy.map(c => c.title).join(', ')}). Architecture actuelle: Collections pour les usages sportifs. Pas besoin de créer des catégories sport supplémentaires.`
    steps = [
      "✅ Architecture actuelle validée: Collections pour usages sportifs",
      "Vérifier que tous les produits sont bien assignés à la bonne collection sport",
      "Configurer filtres storefront par collection (déjà disponible)",
      "Optionnel: Ajouter metadata discipline pour filtrage plus granulaire"
    ]
  } else if (!hasSportData) {
    recommendation = "NE PAS IMPLÉMENTER MAINTENANT"
    reasoning = "Aucune donnée sport détectée dans le PIM ou les exports. Attendre que les données sport soient définies dans le PIM avant d'implémenter la taxonomie."
    steps = [
      "Définir les sports cibles dans le PIM (Cycliste, Trail, Running, etc.)",
      "Mapper les produits aux sports dans le PIM",
      "Choisir l'architecture (catégories vs collections vs metadata)",
      "Implémenter l'import sport lors de la prochaine synchronisation PIM"
    ]
  } else if (auditResult.sportData.current_implementation === "METADATA") {
    recommendation = "PROMOUVOIR METADATA → CATÉGORIES"
    reasoning = "Les données sport existent en metadata mais ne sont pas exploitables pour la navigation/filtrage. Les catégories Medusa offrent une hiérarchie naturelle et des filtres natifs."
    steps = [
      "Créer catégorie racine 'Sports' sous 'Lunettes Connectées'",
      "Créer sous-catégories: Cycliste, Trail, Running",
      "Migrer product.metadata.sport → product.categories",
      "Tester filtres storefront par catégorie sport"
    ]
  } else if (auditResult.sportData.current_implementation === "PIM_ONLY") {
    recommendation = "IMPORTER SPORT COMME CATÉGORIES"
    reasoning = "Les données sport existent dans le PIM mais n'ont jamais été importées. Architecture recommandée: catégories Medusa pour hiérarchie et filtrage."
    steps = [
      "Créer script d'import sport: src/scripts/import-sport-categories.ts",
      "Créer hiérarchie: Lunettes Connectées > Sports > [Cycliste|Trail|Running]",
      "Mapper products → sport categories lors de l'import",
      "Valider liaison products ↔ categories dans Medusa"
    ]
  } else if (hasCategories) {
    recommendation = "UTILISER CATÉGORIES EXISTANTES"
    reasoning = "Une hiérarchie de catégories existe déjà. Ajouter les sports comme sous-catégories pour cohérence."
    steps = [
      "Identifier catégorie parent appropriée pour Sports",
      "Créer sous-catégories sport via workflow Medusa",
      "Lier produits aux catégories sport",
      "Configurer filtres storefront"
    ]
  } else {
    recommendation = "CRÉER CATÉGORIES SPORT"
    reasoning = "Aucune structure existante. Créer hiérarchie simple pour les sports."
    steps = [
      "Créer catégorie racine 'Sports'",
      "Créer catégories enfants: Cycliste, Trail, Running",
      "Mapper produits selon leur usage sportif",
      "Activer filtres par catégorie dans le storefront"
    ]
  }

  auditResult.recommendations.sport_architecture = recommendation
  auditResult.recommendations.reasoning = reasoning
  auditResult.recommendations.implementation_steps = steps

  logger.info(`   Recommandation: ${recommendation}`)
  logger.info(`   Justification: ${reasoning}`)
  logger.info(`\n   Étapes d'implémentation:`)
  steps.forEach((step, idx) => {
    logger.info(`      ${idx + 1}. ${step}`)
  })

  // ====================================================================
  // 8. RÉSUMÉ GLOBAL
  // ====================================================================

  logger.info("\n" + "=".repeat(70))
  logger.info("📊 RÉSUMÉ GLOBAL POST-OPTION A")
  logger.info("=".repeat(70))

  logger.info("\n🏗️  TAXONOMIE:")
  logger.info(`   Collections: ${auditResult.taxonomy.collections.count}`)
  auditResult.taxonomy.collections.items.forEach(c => {
    logger.info(`      - ${c.title}: ${c.products_count} produits`)
  })
  logger.info(`   Catégories: ${auditResult.taxonomy.categories.count}`)
  auditResult.taxonomy.categories.items.forEach(c => {
    const indent = c.parent_id ? "        " : "      "
    logger.info(`${indent}- ${c.name}: ${c.products_count} produits`)
  })

  logger.info("\n📦 CATALOGUE:")
  logger.info(`   Produits: ${auditResult.catalog.products.count}`)
  logger.info(`   Variants: ${auditResult.catalog.variants.count}`)
  logger.info(`   Pricing: ${auditResult.catalog.variants.with_pricing}/${auditResult.catalog.variants.count} OK (${((auditResult.catalog.variants.with_pricing / auditResult.catalog.variants.count) * 100).toFixed(1)}%)`)

  logger.info("\n🏃 DONNÉES SPORT:")
  logger.info(`   Trouvées en metadata: ${auditResult.sportData.found_in_metadata ? 'OUI' : 'NON'}`)
  logger.info(`   Trouvées en exports: ${auditResult.sportData.found_in_exports ? 'OUI' : 'NON'}`)
  logger.info(`   Implémentation actuelle: ${auditResult.sportData.current_implementation}`)
  logger.info(`   Références sport: ${auditResult.sportData.sport_references.length}`)

  logger.info("\n💡 RECOMMANDATION:")
  logger.info(`   ${recommendation}`)

  logger.info("\n" + "=".repeat(70))

  // ====================================================================
  // 9. EXPORT RAPPORT
  // ====================================================================

  const reportPath = path.join(process.cwd(), "reports", "post-option-a-complete-audit.json")
  fs.mkdirSync(path.dirname(reportPath), { recursive: true })
  fs.writeFileSync(reportPath, JSON.stringify(auditResult, null, 2))

  logger.info(`\n📁 Rapport complet sauvegardé: ${reportPath}`)
  logger.info("")

  // ====================================================================
  // 10. VERDICT FINAL
  // ====================================================================

  logger.info("🎯 VERDICT FINAL POST-OPTION A")
  logger.info("=".repeat(70))

  const pricingOK = auditResult.catalog.variants.with_pricing === auditResult.catalog.variants.count
  const catalogOK = auditResult.catalog.products.count > 0 && auditResult.catalog.variants.count > 0

  if (pricingOK && catalogOK) {
    logger.info("✅ CATALOGUE OPÉRATIONNEL")
    logger.info(`   - ${auditResult.catalog.products.count} produits`)
    logger.info(`   - ${auditResult.catalog.variants.count} variants`)
    logger.info(`   - 100% pricing EUR`)
    logger.info(`   - ${auditResult.taxonomy.collections.count} collections`)
    logger.info(`   - ${auditResult.taxonomy.categories.count} catégories`)
  } else {
    logger.warn("⚠️  CATALOGUE PARTIELLEMENT OPÉRATIONNEL")
    if (!pricingOK) {
      logger.warn(`   ⚠️  ${auditResult.catalog.variants.without_pricing} variants sans pricing`)
    }
    if (!catalogOK) {
      logger.warn(`   ⚠️  Catalogue vide ou incomplet`)
    }
  }

  logger.info("\n🏃 SPORT:")
  if (auditResult.sportData.current_implementation === "NONE") {
    logger.info("   ℹ️  Pas de données sport actuellement")
    logger.info(`   → Recommandation: ${recommendation}`)
  } else {
    logger.info(`   ℹ️  Implémentation: ${auditResult.sportData.current_implementation}`)
    logger.info(`   → Recommandation: ${recommendation}`)
  }

  logger.info("\n=".repeat(70))
  logger.info("")

  return auditResult
}
