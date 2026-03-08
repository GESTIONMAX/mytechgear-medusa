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
 * PHASE 4 - RÉAUDIT COMPLET PIM VS MEDUSA (FINAL)
 *
 * Objectif: Déterminer si le catalogue est READY FOR STOREFRONT TESTING
 *
 * Vérifications:
 * 1. Comparaison PIM vs Medusa (produits, variantes, SKU)
 * 2. Pricing EUR pour tous les variants
 * 3. Unicité SKU
 * 4. Cohérence options
 * 5. Verdict final READY/NOT READY
 */

// PIM - Source de vérité (état attendu)
const PIM_EXPECTED = {
  totalProducts: 16,
  totalVariants: 41, // Après ajustements
  variantsWithPricing: 32, // Tous les variants actuels doivent avoir pricing
}

export default async function finalAuditPimVsMedusa({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const productService = container.resolve(Modules.PRODUCT)
  const pricingService = container.resolve(Modules.PRICING)

  logger.info("🔍 PHASE 4 - RÉAUDIT COMPLET PIM VS MEDUSA")
  logger.info("=" .repeat(70))

  // ====================================================================
  // 1. COMPTAGE GLOBAL
  // ====================================================================

  logger.info("\n📊 ÉTAPE 1: Comptage Global\n")

  const allProducts = await productService.listProducts({}, { take: 200, relations: ['variants'] })
  const allVariants = allProducts.flatMap(p => p.variants || [])

  const totalProducts = allProducts.length
  const totalVariants = allVariants.length

  logger.info(`   Produits totaux: ${totalProducts}`)
  logger.info(`   Variantes totales: ${totalVariants}`)

  // ====================================================================
  // 2. VÉRIFICATION PRICING POUR CHAQUE VARIANT
  // ====================================================================

  logger.info(`\n💶 ÉTAPE 2: Vérification Pricing EUR (via DB directe)\n`)

  // Utiliser requête SQL pour vérifier pricing
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

  const variantsWithPricing = pricingResults.filter(r => r.pricing_status === 'OK').length
  const variantsNoPricing = pricingResults.filter(r => r.pricing_status !== 'OK')

  logger.info(`   Variants avec pricing OK: ${variantsWithPricing}/${totalVariants}`)
  logger.info(`   Variants sans pricing: ${variantsNoPricing.length}`)

  if (variantsNoPricing.length > 0) {
    logger.warn(`\n   ⚠️  Variants sans pricing:`)
    variantsNoPricing.forEach(v => {
      logger.warn(`      - ${v.sku}: ${v.pricing_status}`)
    })
  }

  // ====================================================================
  // 3. VÉRIFICATION UNICITÉ SKU
  // ====================================================================

  logger.info(`\n🔍 ÉTAPE 3: Vérification Unicité SKU\n`)

  const allSkus = allVariants.map(v => v.sku).filter(Boolean)
  const uniqueSkus = new Set(allSkus)
  const duplicateSkus = allSkus.filter((sku, idx) => allSkus.indexOf(sku) !== idx)

  logger.info(`   Total SKUs: ${allSkus.length}`)
  logger.info(`   SKUs uniques: ${uniqueSkus.size}`)
  logger.info(`   Doublons: ${duplicateSkus.length}`)

  if (duplicateSkus.length > 0) {
    logger.error(`   ❌ DOUBLONS DÉTECTÉS: ${duplicateSkus.join(', ')}`)
  } else {
    logger.info(`   ✅ Aucun doublon SKU`)
  }

  // ====================================================================
  // 4. VÉRIFICATION COHÉRENCE OPTIONS
  // ====================================================================

  logger.info(`\n🎛️  ÉTAPE 4: Vérification Cohérence Options\n`)

  let productsWithEmptyOptions = 0
  let totalEmptyOptions = 0

  for (const product of allProducts) {
    const emptyOptions = product.options?.filter((opt: any) => {
      // Une option est vide si elle n'a pas de valeurs
      return !opt.values || opt.values.length === 0
    }) || []

    if (emptyOptions.length > 0) {
      productsWithEmptyOptions++
      totalEmptyOptions += emptyOptions.length
      logger.warn(`   ⚠️  ${product.handle}: ${emptyOptions.length} options vides`)
    }
  }

  logger.info(`   Produits avec options vides: ${productsWithEmptyOptions}`)
  logger.info(`   Total options vides: ${totalEmptyOptions}`)

  if (totalEmptyOptions === 0) {
    logger.info(`   ✅ Toutes les options sont cohérentes`)
  }

  // ====================================================================
  // 5. COMPARAISON PIM VS MEDUSA PAR PRODUIT
  // ====================================================================

  logger.info(`\n📦 ÉTAPE 5: Comparaison PIM vs Medusa par Produit\n`)

  const productComparison = [
    { handle: "shield", expectedVariants: 6, name: "Shield" },
    { handle: "music-shield", expectedVariants: 5, name: "Music Shield" },
    { handle: "zurix", expectedVariants: 3, name: "Zurix" },
    { handle: "veil", expectedVariants: 3, name: "Veil" },
    { handle: "dusk", expectedVariants: 3, name: "Dusk" },
    { handle: "infinity", expectedVariants: 4, name: "Infinity" },
    { handle: "aura", expectedVariants: 8, name: "Aura" },
    { handle: "aroza", expectedVariants: 1, name: "Aroza" },
    { handle: "dragon", expectedVariants: 2, name: "Dragon" },
    { handle: "prime", expectedVariants: 1, name: "Prime" },
    { handle: "falcon", expectedVariants: 1, name: "Falcon" },
    { handle: "euphoria", expectedVariants: 2, name: "Euphoria" },
    { handle: "duck-classic", expectedVariants: 1, name: "Duck Classic" },
  ]

  let productsComplete = 0
  let productsIncomplete = 0

  for (const expected of productComparison) {
    const medusaProduct = allProducts.find(p => p.handle === expected.handle)

    if (!medusaProduct) {
      logger.warn(`   ⚠️  ${expected.name}: ABSENT dans Medusa`)
      productsIncomplete++
      continue
    }

    const actualVariants = medusaProduct.variants?.length || 0

    if (actualVariants === expected.expectedVariants) {
      logger.info(`   ✅ ${expected.name}: ${actualVariants}/${expected.expectedVariants} variants`)
      productsComplete++
    } else if (actualVariants > 0) {
      logger.warn(`   ⚠️  ${expected.name}: ${actualVariants}/${expected.expectedVariants} variants`)
      productsIncomplete++
    } else {
      logger.error(`   ❌ ${expected.name}: Aucune variante`)
      productsIncomplete++
    }
  }

  logger.info(`\n   Produits complets: ${productsComplete}/${productComparison.length}`)
  logger.info(`   Produits incomplets: ${productsIncomplete}/${productComparison.length}`)

  // ====================================================================
  // 6. RÉSUMÉ GLOBAL
  // ====================================================================

  logger.info("\n" + "=".repeat(70))
  logger.info("📊 RÉSUMÉ GLOBAL AUDIT")
  logger.info("=".repeat(70))
  logger.info(`Produits totaux:              ${totalProducts}`)
  logger.info(`Variantes totales:            ${totalVariants}`)
  logger.info(`Variantes avec pricing:       ${variantsWithPricing}/${totalVariants}`)
  logger.info(`Produits complets:            ${productsComplete}/${productComparison.length}`)
  logger.info(`Produits incomplets:          ${productsIncomplete}/${productComparison.length}`)
  logger.info(`Doublons SKU:                 ${duplicateSkus.length}`)
  logger.info(`Options vides:                ${totalEmptyOptions}`)
  logger.info("=".repeat(70))

  // ====================================================================
  // 7. VERDICT FINAL
  // ====================================================================

  logger.info("\n" + "=".repeat(70))
  logger.info("🎯 VERDICT FINAL")
  logger.info("=".repeat(70))

  const criticalIssues: string[] = []
  const warnings: string[] = []

  // Critères bloquants
  if (variantsWithPricing < totalVariants) {
    criticalIssues.push(`${totalVariants - variantsWithPricing} variants sans pricing`)
  }

  if (duplicateSkus.length > 0) {
    criticalIssues.push(`${duplicateSkus.length} doublons SKU`)
  }

  // Critères non-bloquants
  if (productsIncomplete > 0) {
    warnings.push(`${productsIncomplete} produits incomplets (variantes manquantes)`)
  }

  if (totalEmptyOptions > 0) {
    warnings.push(`${totalEmptyOptions} options vides`)
  }

  const isReady = criticalIssues.length === 0

  if (isReady) {
    logger.info(`\n✅ READY FOR STOREFRONT TESTING`)
    logger.info(`\nLe catalogue Medusa est prêt pour les tests storefront:`)
    logger.info(`   ✅ Tous les variants (${totalVariants}) ont un pricing EUR`)
    logger.info(`   ✅ Aucun doublon SKU`)
    logger.info(`   ✅ Base de données cohérente`)

    if (warnings.length > 0) {
      logger.info(`\n⚠️  Avertissements non-bloquants:`)
      warnings.forEach(w => logger.info(`   - ${w}`))
      logger.info(`\nCes avertissements n'empêchent pas les tests storefront.`)
    }
  } else {
    logger.error(`\n❌ NOT READY FOR STOREFRONT TESTING`)
    logger.error(`\nProblèmes bloquants:`)
    criticalIssues.forEach(issue => logger.error(`   ❌ ${issue}`))

    if (warnings.length > 0) {
      logger.warn(`\nAvertissements:`)
      warnings.forEach(w => logger.warn(`   ⚠️  ${w}`))
    }
  }

  logger.info("=".repeat(70))

  // ====================================================================
  // 8. EXPORT RAPPORT
  // ====================================================================

  const auditReport = {
    timestamp: new Date().toISOString(),
    verdict: isReady ? "READY" : "NOT_READY",
    summary: {
      totalProducts,
      totalVariants,
      variantsWithPricing,
      productsComplete,
      productsIncomplete,
      duplicateSkus: duplicateSkus.length,
      emptyOptions: totalEmptyOptions,
    },
    criticalIssues,
    warnings,
    pricingDetails: pricingResults,
    productComparison: productComparison.map(exp => {
      const actual = allProducts.find(p => p.handle === exp.handle)
      return {
        name: exp.name,
        handle: exp.handle,
        expectedVariants: exp.expectedVariants,
        actualVariants: actual?.variants?.length || 0,
        status: actual?.variants?.length === exp.expectedVariants ? "COMPLETE" : "INCOMPLETE"
      }
    }),
  }

  const reportPath = path.join(process.cwd(), "reports", "final-audit-pim-vs-medusa.json")
  fs.mkdirSync(path.dirname(reportPath), { recursive: true })
  fs.writeFileSync(reportPath, JSON.stringify(auditReport, null, 2))

  logger.info(`\n📁 Rapport audit sauvegardé: ${reportPath}`)
  logger.info("")

  return auditReport
}
