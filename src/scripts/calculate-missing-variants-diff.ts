import { ExecArgs } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  Modules,
} from "@medusajs/framework/utils"
import * as fs from "fs"
import * as path from "path"

/**
 * PHASE 3 - Calcul du diff PIM vs Medusa pour variantes manquantes
 *
 * Objectif: Identifier précisément les variantes manquantes par produit
 * en comparant le PIM (source de vérité) avec l'état actuel Medusa
 */

// Définition PIM complète - SOURCE DE VÉRITÉ
const PIM_COMPLETE = {
  shield: {
    handle: "shield",
    expectedVariants: [
      { sku: "SH-MB-FIR", title: "Shield - Matte Black, Fire", options: { Monture: "Matte Black", Verres: "Fire" }, priceUSD: 199 },
      { sku: "SH-MB-SMK", title: "Shield - Matte Black, Smoke", options: { Monture: "Matte Black", Verres: "Smoke" }, priceUSD: 199 },
      { sku: "SH-WH-FIR", title: "Shield - White, Fire", options: { Monture: "White", Verres: "Fire" }, priceUSD: 199 },
      { sku: "SH-WH-SMK", title: "Shield - White, Smoke", options: { Monture: "White", Verres: "Smoke" }, priceUSD: 199 },
      { sku: "SH-NE-FIR", title: "Shield - Neon, Fire", options: { Monture: "Neon", Verres: "Fire" }, priceUSD: 199 },
      { sku: "SH-NE-SMK", title: "Shield - Neon, Smoke", options: { Monture: "Neon", Verres: "Smoke" }, priceUSD: 199 },
    ]
  },
  zurix: {
    handle: "zurix",
    expectedVariants: [
      { sku: "ZRX-FIR", title: "Zurix - Fire", options: { Verres: "Fire" }, priceUSD: 199 },
      { sku: "ZRX-SMK", title: "Zurix - Smoke", options: { Verres: "Smoke" }, priceUSD: 199 },
      { sku: "ZRX-CLR", title: "Zurix - Clear", options: { Verres: "Clear" }, priceUSD: 199 },
    ]
  },
  veil: {
    handle: "veil",
    expectedVariants: [
      { sku: "VEL-FIR", title: "Veil - Fire", options: { Verres: "Fire" }, priceUSD: 199 },
      { sku: "VEL-SMK", title: "Veil - Smoke", options: { Verres: "Smoke" }, priceUSD: 199 },
      { sku: "VEL-CLR", title: "Veil - Clear", options: { Verres: "Clear" }, priceUSD: 199 },
    ]
  },
  dusk: {
    handle: "dusk",
    expectedVariants: [
      { sku: "DSK-FIR", title: "Dusk Classic - Fire", options: { Verres: "Fire" }, priceUSD: 260 },
      { sku: "DSK-SMK", title: "Dusk Classic - Smoke", options: { Verres: "Smoke" }, priceUSD: 260 },
      { sku: "DSK-CLR", title: "Dusk Classic - Clear", options: { Verres: "Clear" }, priceUSD: 260 },
    ]
  },
  infinity: {
    handle: "infinity",
    expectedVariants: [
      { sku: "INF-FIR", title: "Infinity - Fire", options: { Verres: "Fire" }, priceUSD: 299 },
      { sku: "INF-SMK", title: "Infinity - Smoke", options: { Verres: "Smoke" }, priceUSD: 299 },
      { sku: "INF-CLR", title: "Infinity - Clear", options: { Verres: "Clear" }, priceUSD: 299 },
      { sku: "MR1-INF-FIR", title: "MR1 x Infinity - Fire", options: { Verres: "Fire" }, priceUSD: 299 },
    ]
  },
  aura: {
    handle: "aura",
    expectedVariants: [
      // Aura sans audio
      { sku: "AUR-BLK-ENE", title: "Aura - Black, Energy", options: { Monture: "Black", Verres: "Energy", Audio: "No" }, priceUSD: 385 },
      { sku: "AUR-BLK-CAL", title: "Aura - Black, Calm", options: { Monture: "Black", Verres: "Calm", Audio: "No" }, priceUSD: 385 },
      { sku: "AUR-WHT-ENE", title: "Aura - White, Energy", options: { Monture: "White", Verres: "Energy", Audio: "No" }, priceUSD: 385 },
      // Aura avec audio
      { sku: "AUR-AUD-BLK-ENE", title: "Aura Audio - Black, Energy", options: { Monture: "Black", Verres: "Energy", Audio: "Yes" }, priceUSD: 449 },
      { sku: "AUR-AUD-BLK-CAL", title: "Aura Audio - Black, Calm", options: { Monture: "Black", Verres: "Calm", Audio: "Yes" }, priceUSD: 449 },
      { sku: "AUR-AUD-WHT-ENE", title: "Aura Audio - White, Energy", options: { Monture: "White", Verres: "Energy", Audio: "Yes" }, priceUSD: 449 },
      { sku: "AUR-AUD-WHT-CAL", title: "Aura Audio - White, Calm", options: { Monture: "White", Verres: "Calm", Audio: "Yes" }, priceUSD: 449 },
      { sku: "AUR-WHT-CAL", title: "Aura - White, Calm", options: { Monture: "White", Verres: "Calm", Audio: "No" }, priceUSD: 385 },
    ]
  },
  dragon: {
    handle: "dragon",
    expectedVariants: [
      { sku: "LFS-DRA-BLKG-CAL", title: "Dragon - Black Gloss, Calm", options: { Monture: "Black Gloss", Verres: "Calm" }, priceEUR: 29990 },
      { sku: "DRG-SMK-GBGD", title: "Dragon Chamelo - Smoke, Green/Blue Gradient", options: { Monture: "Smoke", Verres: "Green/Blue Gradient" }, priceUSD: 260 },
    ]
  },
}

export default async function calculateMissingVariantsDiff({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const productService = container.resolve(Modules.PRODUCT)

  logger.info("🔍 PHASE 3 - CALCUL DIFF PIM VS MEDUSA")
  logger.info("=" .repeat(70))

  // Fonction de conversion USD → EUR
  const convertPrice = (usd: number): number => {
    return Math.round(usd * 0.92 * 1.15 * 100)
  }

  const allProducts = await productService.listProducts({}, { take: 100, relations: ['variants', 'options'] })

  const diffReport: Array<{
    product: string
    handle: string
    currentCount: number
    expectedCount: number
    missingCount: number
    missingVariants: Array<{
      sku: string
      title: string
      options: Record<string, string>
      priceEUR: number
    }>
    existingSkus: string[]
  }> = []

  let totalMissing = 0
  let totalCurrent = 0
  let totalExpected = 0

  logger.info("\n📊 ANALYSE PAR PRODUIT\n")

  for (const [productKey, pimDef] of Object.entries(PIM_COMPLETE)) {
    const medusaProduct = allProducts.find(p => p.handle === pimDef.handle)

    if (!medusaProduct) {
      logger.warn(`⚠️  Produit ${pimDef.handle} n'existe pas dans Medusa, ignoré`)
      continue
    }

    const existingSkus = medusaProduct.variants?.map(v => v.sku) || []
    const existingSkusSet = new Set(existingSkus)

    const missingVariants = pimDef.expectedVariants.filter(
      expected => !existingSkusSet.has(expected.sku)
    ).map(v => ({
      ...v,
      priceEUR: 'priceEUR' in v ? v.priceEUR : convertPrice(v.priceUSD!)
    }))

    const currentCount = existingSkus.length
    const expectedCount = pimDef.expectedVariants.length
    const missingCount = missingVariants.length

    totalCurrent += currentCount
    totalExpected += expectedCount
    totalMissing += missingCount

    diffReport.push({
      product: productKey,
      handle: pimDef.handle,
      currentCount,
      expectedCount,
      missingCount,
      missingVariants,
      existingSkus,
    })

    if (missingCount > 0) {
      logger.info(`📦 ${pimDef.handle.toUpperCase()}`)
      logger.info(`   Attendu: ${expectedCount} variants`)
      logger.info(`   Actuel:  ${currentCount} variants`)
      logger.info(`   Manque:  ${missingCount} variants`)
      logger.info(`   Variantes manquantes:`)
      missingVariants.forEach(v => {
        logger.info(`      - ${v.sku}: ${v.title} (€${(v.priceEUR / 100).toFixed(2)})`)
      })
      logger.info("")
    } else {
      logger.info(`✅ ${pimDef.handle.toUpperCase()}: Complet (${currentCount}/${expectedCount} variants)`)
    }
  }

  // ====================================================================
  // RÉSUMÉ DIFF
  // ====================================================================

  logger.info("\n" + "=".repeat(70))
  logger.info("📊 RÉSUMÉ DIFF PIM VS MEDUSA")
  logger.info("=".repeat(70))
  logger.info(`Total variants actuels:   ${totalCurrent}`)
  logger.info(`Total variants attendus:  ${totalExpected}`)
  logger.info(`Total variants manquants: ${totalMissing}`)
  logger.info(`Taux de complétude:       ${((totalCurrent / totalExpected) * 100).toFixed(1)}%`)
  logger.info("=".repeat(70))

  // Liste détaillée des variantes à créer
  const allMissingVariants = diffReport.flatMap(d =>
    d.missingVariants.map(v => ({
      product: d.handle,
      ...v
    }))
  )

  if (allMissingVariants.length > 0) {
    logger.info(`\n📝 VARIANTES À CRÉER (${allMissingVariants.length}):\n`)
    allMissingVariants.forEach((v, idx) => {
      logger.info(`${idx + 1}. [${v.product}] ${v.sku}: ${v.title}`)
      logger.info(`   Options: ${JSON.stringify(v.options)}`)
      logger.info(`   Prix EUR: €${(v.priceEUR / 100).toFixed(2)}`)
      logger.info("")
    })
  }

  // Vérification doublons SKU
  logger.info("🔍 VÉRIFICATION UNICITÉ SKU\n")

  const allSkusInDb = allProducts.flatMap(p =>
    p.variants?.map(v => v.sku).filter(Boolean) || []
  )
  const allSkusSet = new Set(allSkusInDb)

  logger.info(`   SKUs existants en DB: ${allSkusSet.size}`)
  logger.info(`   Doublons détectés: ${allSkusInDb.length - allSkusSet.size}`)

  const newSkus = allMissingVariants.map(v => v.sku)
  const newSkusSet = new Set(newSkus)
  const duplicateNewSkus = newSkus.filter((sku, idx) => newSkus.indexOf(sku) !== idx)

  if (duplicateNewSkus.length > 0) {
    logger.error(`   ❌ DOUBLONS dans variantes à créer: ${duplicateNewSkus.join(', ')}`)
  } else {
    logger.info(`   ✅ Aucun doublon dans variantes à créer`)
  }

  const conflictsWithExisting = newSkus.filter(sku => allSkusSet.has(sku))
  if (conflictsWithExisting.length > 0) {
    logger.error(`   ❌ CONFLITS avec SKUs existants: ${conflictsWithExisting.join(', ')}`)
  } else {
    logger.info(`   ✅ Aucun conflit avec SKUs existants`)
  }

  // Export rapport JSON
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      totalCurrent,
      totalExpected,
      totalMissing,
      completionRate: `${((totalCurrent / totalExpected) * 100).toFixed(1)}%`,
    },
    byProduct: diffReport,
    allMissingVariants,
    validation: {
      existingSkusCount: allSkusSet.size,
      duplicatesInDb: allSkusInDb.length - allSkusSet.size,
      duplicatesInNew: duplicateNewSkus.length,
      conflictsWithExisting: conflictsWithExisting.length,
    }
  }

  const reportPath = path.join(process.cwd(), "reports", "missing-variants-diff.json")
  fs.mkdirSync(path.dirname(reportPath), { recursive: true })
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))

  logger.info(`\n📁 Rapport diff sauvegardé: ${reportPath}`)
  logger.info("")

  logger.info("🎯 PROCHAINE ÉTAPE:")
  logger.info(`   Créer les ${totalMissing} variantes manquantes`)
  logger.info(`   Script: npx medusa exec ./src/scripts/create-missing-variants.ts`)
  logger.info("")

  return report
}
