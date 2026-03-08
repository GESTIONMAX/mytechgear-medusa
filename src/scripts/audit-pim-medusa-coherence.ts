import { ExecArgs } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  Modules,
} from "@medusajs/framework/utils"
import * as fs from "fs"
import * as path from "path"

/**
 * Audit de cohérence PIM vs Medusa
 *
 * Compare les données attendues (scripts d'import = PIM) avec les données réelles dans Medusa
 * Détecte les reliquats legacy, divergences, et anomalies
 */

export default async function auditPimMedusaCoherence({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const productService = container.resolve(Modules.PRODUCT)
  const pricingService = container.resolve(Modules.PRICING)

  logger.info("🔍 AUDIT DE COHÉRENCE PIM vs MEDUSA")
  logger.info("=" .repeat(70))

  // ====================================================================
  // 1. DÉFINIR LA SOURCE PIM (scripts d'import)
  // ====================================================================

  logger.info("\n📋 ÉTAPE 1: Définition du référentiel PIM\n")

  // Produits attendus selon les scripts d'import PIM
  const pimExpectedProducts = {
    // Import Chamelo Shield
    shield: {
      handle: "shield",
      title: "Shield",
      variantCount: 6, // 3 montures × 2 verres
      skuPattern: /^SH-/,
      priceUSD: 199,
      priceEUR: 21054, // cents
      hasAudio: false,
      brand: "Chamelo",
      family: "shield"
    },
    musicShield: {
      handle: "music-shield",
      title: "Music Shield",
      variantCount: 6,
      skuPattern: /^(MS-|MSH-|MSHIELD-)/,
      priceUSD: 349,
      priceEUR: 36924,
      hasAudio: true,
      brand: "Chamelo",
      family: "shield"
    },

    // Import Chamelo Lifestyle
    zurix: {
      handle: "zurix",
      title: "Zurix",
      variantCount: 3,
      skuPattern: /^ZRX-/,
      priceUSD: 199,
      priceEUR: 21054,
      hasAudio: false,
      brand: "Chamelo",
      family: "lifestyle"
    },
    veil: {
      handle: "veil",
      title: "Veil",
      variantCount: 3,
      skuPattern: /^VEL-/,
      priceUSD: 199,
      priceEUR: 21054,
      hasAudio: false,
      brand: "Chamelo",
      family: "lifestyle"
    },
    duskClassic: {
      handle: "dusk-classic",
      title: "Dusk Classic",
      variantCount: 3,
      skuPattern: /^DSK-/,
      priceUSD: 260,
      priceEUR: 27508,
      hasAudio: true,
      brand: "Chamelo",
      family: "lifestyle"
    },
    infinity: {
      handle: "infinity",
      title: "Infinity",
      variantCount: 3,
      skuPattern: /^INF-/,
      priceUSD: 299,
      priceEUR: 31634,
      hasAudio: true,
      brand: "Chamelo",
      family: "lifestyle"
    },
    mr1Infinity: {
      handle: "mr1-infinity",
      title: "MR1 x Chamelo Infinity",
      variantCount: 1,
      skuPattern: /^MR1-/,
      priceUSD: 299,
      priceEUR: 31634,
      hasAudio: true,
      brand: "Chamelo x MR1",
      family: "lifestyle"
    },

    // Import Chamelo Prismatic
    aura: {
      handle: "aura",
      title: "Aura",
      variantCount: 4,
      skuPattern: /^AUR-(?!AUD)/,
      priceUSD: 385,
      priceEUR: 40733,
      hasAudio: false,
      brand: "Chamelo",
      family: "aura"
    },
    auraAudio: {
      handle: "aura-audio",
      title: "Aura Audio",
      variantCount: 4,
      skuPattern: /^AUR-AUD-/,
      priceUSD: 449,
      priceEUR: 47504,
      hasAudio: true,
      brand: "Chamelo",
      family: "aura"
    },

    // Import Chamelo Bestsellers
    aroza: {
      handle: "aroza",
      title: "Aroza",
      variantCount: 1,
      skuPattern: /^ARZ-/,
      priceUSD: 349,
      priceEUR: 36924,
      hasAudio: false,
      brand: "Chamelo",
      family: "aroza"
    },
    dragonChamelo: {
      handle: "dragon-chamelo",
      title: "Dragon",
      variantCount: 1,
      skuPattern: /^DRG-/,
      priceUSD: 260,
      priceEUR: 27508,
      hasAudio: false,
      brand: "Chamelo",
      family: "dragon"
    },

    // Import from Payload (legacy empirique)
    prime: {
      handle: "prime",
      title: "Prime",
      variantCount: 1,
      skuPattern: /^LFS-PRI-/,
      priceUSD: null, // Pas de prix USD défini
      priceEUR: 29990, // Prix EUR arbitraire
      hasAudio: false,
      brand: "Generic",
      family: "classic",
      source: "LEGACY_PAYLOAD"
    },
    dragonPayload: {
      handle: "dragon",
      title: "Dragon",
      variantCount: 1,
      skuPattern: /^LFS-DRA-/,
      priceUSD: null,
      priceEUR: 29990,
      hasAudio: false,
      brand: "Generic",
      family: "classic",
      source: "LEGACY_PAYLOAD"
    },
    falcon: {
      handle: "falcon",
      title: "Falcon",
      variantCount: 1,
      skuPattern: /^SPR-FAL-/,
      priceUSD: null,
      priceEUR: 29990,
      hasAudio: false,
      brand: "Generic",
      family: "sport",
      source: "LEGACY_PAYLOAD"
    },
    euphoria: {
      handle: "euphoria",
      title: "Euphoria",
      variantCount: 2,
      skuPattern: /^PRI-EUP-/,
      priceUSD: null,
      priceEUR: 19990,
      hasAudio: false,
      brand: "Generic",
      family: "lifestyle",
      source: "LEGACY_PAYLOAD"
    },
    duckClassic: {
      handle: "duck-classic",
      title: "Duck Classic",
      variantCount: 1,
      skuPattern: /^DUCK-/,
      priceUSD: null,
      priceEUR: 19990,
      hasAudio: false,
      brand: "Generic",
      family: "classic",
      source: "LEGACY_PAYLOAD"
    },
  }

  logger.info(`   ✓ Référentiel PIM défini: ${Object.keys(pimExpectedProducts).length} produits attendus`)
  logger.info(`   ✓ Dont ${Object.values(pimExpectedProducts).filter(p => p.source === 'LEGACY_PAYLOAD').length} produits LEGACY_PAYLOAD\n`)

  // ====================================================================
  // 2. RÉCUPÉRER LES DONNÉES ACTUELLES DE MEDUSA
  // ====================================================================

  logger.info("📦 ÉTAPE 2: Récupération des données Medusa actuelles\n")

  const medusaProducts = await productService.listProducts({}, { take: 100, relations: ['variants'] })

  logger.info(`   ✓ Récupéré ${medusaProducts.length} produits depuis Medusa\n`)

  // ====================================================================
  // 3. ANALYSE PRODUIT PAR PRODUIT
  // ====================================================================

  logger.info("🔬 ÉTAPE 3: Analyse détaillée produit par produit\n")

  const issues: any[] = []
  const conformProducts: string[] = []
  const divergentProducts: string[] = []
  const orphanProducts: string[] = []
  const missingProducts: string[] = []

  // Vérifier chaque produit PIM
  for (const [key, pimProduct] of Object.entries(pimExpectedProducts)) {
    const medusaProduct = medusaProducts.find(p => p.handle === pimProduct.handle)

    if (!medusaProduct) {
      missingProducts.push(pimProduct.handle)
      issues.push({
        severity: "BLOQUANT",
        type: "MISSING_IN_MEDUSA",
        product: pimProduct.handle,
        details: `Produit PIM "${pimProduct.title}" absent de Medusa`
      })
      logger.warn(`   ❌ [MISSING] ${pimProduct.handle}: Absent de Medusa`)
      continue
    }

    // Vérifier la cohérence
    let divergences: string[] = []

    // Title
    if (medusaProduct.title !== pimProduct.title) {
      divergences.push(`Title: "${medusaProduct.title}" vs PIM "${pimProduct.title}"`)
    }

    // Variant count
    const actualVariantCount = medusaProduct.variants?.length || 0
    if (actualVariantCount !== pimProduct.variantCount) {
      divergences.push(`Variants: ${actualVariantCount} vs PIM ${pimProduct.variantCount}`)
    }

    // Metadata
    const metadata = medusaProduct.metadata || {}
    if (metadata.brand !== pimProduct.brand) {
      divergences.push(`Brand metadata: "${metadata.brand}" vs PIM "${pimProduct.brand}"`)
    }
    if (metadata.product_family !== pimProduct.family) {
      divergences.push(`Family metadata: "${metadata.product_family}" vs PIM "${pimProduct.family}"`)
    }
    if (metadata.has_audio !== pimProduct.hasAudio) {
      divergences.push(`Audio metadata: ${metadata.has_audio} vs PIM ${pimProduct.hasAudio}`)
    }

    // SKU pattern
    const variants = medusaProduct.variants || []
    for (const variant of variants) {
      if (variant.sku && !pimProduct.skuPattern.test(variant.sku)) {
        divergences.push(`SKU pattern mismatch: "${variant.sku}" ne correspond pas à ${pimProduct.skuPattern}`)
      }
    }

    if (divergences.length > 0) {
      divergentProducts.push(pimProduct.handle)
      issues.push({
        severity: pimProduct.source === "LEGACY_PAYLOAD" ? "COSMÉTIQUE" : "GÊNANT",
        type: "DIVERGENCE",
        product: pimProduct.handle,
        divergences
      })
      logger.warn(`   ⚠️  [DIVERGENT] ${pimProduct.handle}:`)
      divergences.forEach(d => logger.warn(`       - ${d}`))
    } else {
      conformProducts.push(pimProduct.handle)
      logger.info(`   ✅ [CONFORM] ${pimProduct.handle}: Conforme au PIM`)
    }
  }

  // Vérifier les produits orphelins (dans Medusa mais pas dans PIM)
  for (const medusaProduct of medusaProducts) {
    const isPimProduct = Object.values(pimExpectedProducts).some(p => p.handle === medusaProduct.handle)
    if (!isPimProduct) {
      orphanProducts.push(medusaProduct.handle)
      issues.push({
        severity: "GÊNANT",
        type: "ORPHAN_IN_MEDUSA",
        product: medusaProduct.handle,
        details: `Produit "${medusaProduct.title}" présent dans Medusa mais absent du référentiel PIM`
      })
      logger.warn(`   🔶 [ORPHAN] ${medusaProduct.handle}: Présent dans Medusa mais absent du PIM`)
    }
  }

  // ====================================================================
  // 4. VÉRIFICATION DU PRICING
  // ====================================================================

  logger.info("\n💶 ÉTAPE 4: Vérification du pricing EUR\n")

  let pricingIssues = 0
  let pricingOk = 0

  for (const medusaProduct of medusaProducts) {
    const pimProduct = Object.values(pimExpectedProducts).find(p => p.handle === medusaProduct.handle)
    if (!pimProduct) continue // Orphan, déjà signalé

    const variants = medusaProduct.variants || []
    for (const variant of variants) {
      try {
        const [priceResult] = await pricingService.calculatePrices(
          { id: [variant.id] },
          { context: { currency_code: "eur" } }
        )

        if (!priceResult?.calculated_price?.price_set_id) {
          issues.push({
            severity: "BLOQUANT",
            type: "NO_PRICE_SET",
            product: medusaProduct.handle,
            variant: variant.sku,
            details: "Aucun price_set_id trouvé pour cette variante"
          })
          logger.error(`   ❌ [NO_PRICE] ${variant.sku}: Aucun price set`)
          pricingIssues++
          continue
        }

        const priceSetId = priceResult.calculated_price.price_set_id
        const priceSet = await pricingService.retrievePriceSet(priceSetId, { relations: ['prices'] })
        const eurPrice = priceSet.prices?.find((p: any) => p.currency_code === 'eur')

        if (!eurPrice) {
          issues.push({
            severity: "BLOQUANT",
            type: "NO_EUR_PRICE",
            product: medusaProduct.handle,
            variant: variant.sku,
            details: "Aucun prix EUR trouvé"
          })
          logger.error(`   ❌ [NO_EUR] ${variant.sku}: Aucun prix EUR`)
          pricingIssues++
          continue
        }

        // Vérifier montant
        if (pimProduct.priceEUR && eurPrice.amount !== pimProduct.priceEUR) {
          issues.push({
            severity: "GÊNANT",
            type: "PRICE_MISMATCH",
            product: medusaProduct.handle,
            variant: variant.sku,
            actual: eurPrice.amount,
            expected: pimProduct.priceEUR,
            details: `Prix EUR divergent: €${(eurPrice.amount / 100).toFixed(2)} vs PIM €${(pimProduct.priceEUR / 100).toFixed(2)}`
          })
          logger.warn(`   ⚠️  [PRICE_DIFF] ${variant.sku}: €${(eurPrice.amount / 100).toFixed(2)} vs PIM €${(pimProduct.priceEUR / 100).toFixed(2)}`)
          pricingIssues++
        } else {
          logger.info(`   ✅ ${variant.sku}: Prix EUR conforme €${(eurPrice.amount / 100).toFixed(2)}`)
          pricingOk++
        }

      } catch (error: any) {
        issues.push({
          severity: "BLOQUANT",
          type: "PRICING_ERROR",
          product: medusaProduct.handle,
          variant: variant.sku,
          details: error.message
        })
        logger.error(`   ❌ [ERROR] ${variant.sku}: ${error.message}`)
        pricingIssues++
      }
    }
  }

  // ====================================================================
  // 5. DÉTECTION RELIQUATS LEGACY
  // ====================================================================

  logger.info("\n🔍 ÉTAPE 5: Détection des reliquats legacy\n")

  const legacyProducts = medusaProducts.filter(p => {
    const pim = Object.values(pimExpectedProducts).find(pim => pim.handle === p.handle)
    return pim?.source === "LEGACY_PAYLOAD"
  })

  logger.info(`   Produits LEGACY_PAYLOAD détectés: ${legacyProducts.length}`)
  legacyProducts.forEach(p => {
    logger.info(`   - ${p.handle} (${p.title})`)
  })

  // ====================================================================
  // 6. GÉNÉRATION DU RAPPORT
  // ====================================================================

  logger.info("\n📊 GÉNÉRATION DU RAPPORT DE COHÉRENCE...\n")

  const report = {
    auditDate: new Date().toISOString(),
    summary: {
      totalPimProducts: Object.keys(pimExpectedProducts).length,
      totalMedusaProducts: medusaProducts.length,
      conformProducts: conformProducts.length,
      divergentProducts: divergentProducts.length,
      missingInMedusa: missingProducts.length,
      orphanInMedusa: orphanProducts.length,
      legacyPayloadProducts: legacyProducts.length,
      totalIssues: issues.length,
      issuesBloquantes: issues.filter(i => i.severity === "BLOQUANT").length,
      issuesGênantes: issues.filter(i => i.severity === "GÊNANT").length,
      issuesCosmetiques: issues.filter(i => i.severity === "COSMÉTIQUE").length,
      pricingOk,
      pricingIssues,
    },
    verdict: "",
    issues,
    conformProducts,
    divergentProducts,
    missingProducts,
    orphanProducts,
    legacyProducts: legacyProducts.map(p => ({
      handle: p.handle,
      title: p.title,
      variants: p.variants?.length || 0
    }))
  }

  // Déterminer le verdict
  if (report.summary.issuesBloquantes > 0) {
    report.verdict = "SIGNIFICANT_DIVERGENCE"
  } else if (report.summary.legacyPayloadProducts > 5 || report.summary.issuesGênantes > 10) {
    report.verdict = "CLEANUP_REQUIRED"
  } else if (report.summary.divergentProducts > 0 || report.summary.orphanInMedusa > 0) {
    report.verdict = "MOSTLY_ALIGNED_WITH_LEGACY_RESIDUE"
  } else {
    report.verdict = "PIM_AND_MEDUSA_ALIGNED"
  }

  // Sauvegarder le rapport
  const reportPath = path.join(process.cwd(), "reports", "pim-medusa-coherence.json")
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))

  logger.info(`   ✅ Rapport JSON sauvegardé: ${reportPath}\n`)

  // ====================================================================
  // 7. AFFICHAGE DU VERDICT
  // ====================================================================

  logger.info("=" .repeat(70))
  logger.info("🎯 VERDICT DE COHÉRENCE CATALOGUE")
  logger.info("=" .repeat(70))
  logger.info(`Produits PIM présents dans Medusa: ${missingProducts.length === 0 ? 'OUI ✅' : 'NON ❌'}`)
  logger.info(`Variants PIM présents dans Medusa: ${divergentProducts.length === 0 ? 'OUI ✅' : 'PARTIELLEMENT ⚠️'}`)
  logger.info(`Prix PIM alignés avec Medusa: ${pricingIssues === 0 ? 'OUI ✅' : 'NON ❌'}`)
  logger.info(`Reliquats legacy détectés: ${legacyProducts.length > 0 ? 'OUI ⚠️' : 'NON ✅'}`)
  logger.info(`Reliquats legacy bloquants: ${issues.filter(i => i.severity === "BLOQUANT" && i.type.includes("LEGACY")).length > 0 ? 'OUI ❌' : 'NON ✅'}`)
  logger.info(``)
  logger.info(`Verdict final: ${report.verdict}`)
  logger.info("=" .repeat(70))

  logger.info(`\n✅ Audit terminé. Rapport disponible dans reports/pim-medusa-coherence.json\n`)
}
