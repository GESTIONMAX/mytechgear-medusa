import { ExecArgs } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  Modules,
} from "@medusajs/framework/utils"
import * as fs from "fs"
import * as path from "path"

/**
 * VALIDATION PRICING APRÈS FIX
 *
 * Vérifie que le fix pricing a fonctionné:
 * ✅ Tous les variants ont un price_set_id
 * ✅ calculatePrices() retourne des prix EUR valides
 * ✅ Les prix correspondent au mapping PIM
 * ✅ Le pricing est consommable par Medusa
 *
 * Génère des preuves concrètes avec payloads réels
 */

export default async function validatePricingFixed({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const productService = container.resolve(Modules.PRODUCT)
  const pricingService = container.resolve(Modules.PRICING)

  logger.info("✅ VALIDATION PRICING APRÈS FIX")
  logger.info("=" .repeat(70))

  // Mapping PIM pour vérification
  const pimPriceMapping: Record<string, number> = {
    "LFS-PRI-NBM-FIR": 29990,
    "LFS-DRA-BLKG-CAL": 29990,
    "SPR-FAL-OBS-BLU": 29990,
    "PRI-EUP-BLC-BLU": 19990,
    "PRI-EUP-GLD-ROS": 19990,
    "DUCK-CLASSIC-DEFAULT": 19990,
    "SH-MB-FIR": 21054,
    "MS-WHT-RED": 36924,
    "MSHIELD-W-R-AUD": 36924,
    "MSH-MB-SMK": 36924,
    "MS-WHT-BLU": 36924,
    "MS-BLK-FIR": 36924,
    "ZRX-FIR": 21054,
    "VEL-FIR": 21054,
    "DSK-FIR": 27508,
    "INF-FIR": 31634,
    "MR1-INF-FIR": 31634,
    "AUR-BLK-ENE": 40733,
    "AUR-AUD-BLK-CAL": 47504,
    "AUR-AUD-BLK-ENE": 47504,
    "AUR-AUD-WHT-CAL": 47504,
    "AUR-AUD-WHT-ENE": 47504,
    "ARZ-DEF": 36924,
    "DRG-SMK-GBGD": 27508,
  }

  logger.info(`\n📊 Validation contre ${Object.keys(pimPriceMapping).length} SKUs PIM\n`)

  // Récupérer tous les produits avec variants
  const products = await productService.listProducts({}, { take: 100, relations: ['variants'] })

  let totalVariantsPIM = 0
  let variantsWithPriceSetId = 0
  let variantsWithCalculatedPrice = 0
  let variantsWithCorrectPrice = 0
  let variantsFullyWorking = 0

  const workingVariants: Array<{
    sku: string
    variantId: string
    priceSetId: string
    calculatedAmount: number
    expectedAmount: number
    status: string
  }> = []

  const failedVariants: Array<{
    sku: string
    variantId: string
    reason: string
  }> = []

  const proofPayloads: Array<{
    sku: string
    variantData: any
    calculatePricesResult: any
  }> = []

  logger.info("🔍 TEST DE CHAQUE VARIANT...\n")

  for (const product of products) {
    for (const variant of product.variants || []) {
      const sku = variant.sku || "NO_SKU"
      const expectedPrice = pimPriceMapping[sku]

      if (!expectedPrice) {
        continue // Ignore les variants hors PIM
      }

      totalVariantsPIM++

      // TEST 1: Vérifier que price_set_id existe
      const variantData = variant as any
      const hasPriceSetId = !!variantData.price_set_id

      if (hasPriceSetId) {
        variantsWithPriceSetId++
      }

      // TEST 2: Tester calculatePrices()
      try {
        const [result] = await pricingService.calculatePrices(
          { id: [variant.id] },
          { context: { currency_code: "eur" } }
        )

        if (result?.calculated_price) {
          variantsWithCalculatedPrice++

          const calculatedAmount = result.calculated_price.calculated_amount
          const priceSetId = result.calculated_price.price_set_id

          // TEST 3: Vérifier que le prix correspond au PIM
          if (calculatedAmount === expectedPrice) {
            variantsWithCorrectPrice++

            // TEST 4: Vérifier que tout fonctionne ensemble
            if (hasPriceSetId && priceSetId) {
              variantsFullyWorking++

              workingVariants.push({
                sku,
                variantId: variant.id,
                priceSetId,
                calculatedAmount,
                expectedAmount: expectedPrice,
                status: "✅ FULLY_WORKING",
              })

              // Capturer payload pour preuve (premiers 5 seulement)
              if (proofPayloads.length < 5) {
                proofPayloads.push({
                  sku,
                  variantData: {
                    id: variant.id,
                    sku: variant.sku,
                    price_set_id: variantData.price_set_id,
                  },
                  calculatePricesResult: {
                    id: result.id,
                    calculated_price: {
                      price_set_id: result.calculated_price.price_set_id,
                      calculated_amount: result.calculated_price.calculated_amount,
                      currency_code: result.calculated_price.currency_code,
                    }
                  }
                })
              }

              logger.info(`   ✅ ${sku}: €${(calculatedAmount / 100).toFixed(2)} (price_set: ${priceSetId})`)
            } else {
              failedVariants.push({
                sku,
                variantId: variant.id,
                reason: "Prix correct mais price_set_id manquant",
              })
              logger.warn(`   ⚠️  ${sku}: Prix OK mais price_set_id manquant`)
            }
          } else {
            failedVariants.push({
              sku,
              variantId: variant.id,
              reason: `Prix incorrect: €${(calculatedAmount / 100).toFixed(2)} vs €${(expectedPrice / 100).toFixed(2)} attendu`,
            })
            logger.error(`   ❌ ${sku}: Prix incorrect ${calculatedAmount} vs ${expectedPrice}`)
          }
        } else {
          failedVariants.push({
            sku,
            variantId: variant.id,
            reason: "calculatePrices() ne retourne pas calculated_price",
          })
          logger.error(`   ❌ ${sku}: calculatePrices() vide`)
        }
      } catch (error: any) {
        failedVariants.push({
          sku,
          variantId: variant.id,
          reason: `Erreur: ${error.message}`,
        })
        logger.error(`   ❌ ${sku}: Erreur ${error.message}`)
      }
    }
  }

  // ====================================================================
  // RÉSUMÉ VALIDATION
  // ====================================================================

  logger.info("\n" + "=".repeat(70))
  logger.info("📊 RÉSUMÉ VALIDATION PRICING")
  logger.info("=".repeat(70))
  logger.info(`Total variants PIM:                    ${totalVariantsPIM}`)
  logger.info(`Variants avec price_set_id:            ${variantsWithPriceSetId} (${((variantsWithPriceSetId / totalVariantsPIM) * 100).toFixed(1)}%)`)
  logger.info(`Variants avec calculated_price:        ${variantsWithCalculatedPrice} (${((variantsWithCalculatedPrice / totalVariantsPIM) * 100).toFixed(1)}%)`)
  logger.info(`Variants avec prix correct (PIM):      ${variantsWithCorrectPrice} (${((variantsWithCorrectPrice / totalVariantsPIM) * 100).toFixed(1)}%)`)
  logger.info(`Variants 100% fonctionnels:            ${variantsFullyWorking} (${((variantsFullyWorking / totalVariantsPIM) * 100).toFixed(1)}%)`)
  logger.info("=".repeat(70))

  // ====================================================================
  // PREUVES CONCRÈTES AVEC PAYLOADS RÉELS
  // ====================================================================

  logger.info("\n🧪 PREUVES PAR PAYLOAD RÉEL\n")

  if (proofPayloads.length > 0) {
    proofPayloads.forEach((proof, idx) => {
      logger.info(`Preuve ${idx + 1}: ${proof.sku}`)
      logger.info(`   Variant Data:`)
      logger.info(`     - id: ${proof.variantData.id}`)
      logger.info(`     - sku: ${proof.variantData.sku}`)
      logger.info(`     - price_set_id: ${proof.variantData.price_set_id}`)
      logger.info(`   calculatePrices() Result:`)
      logger.info(`     - calculated_price.price_set_id: ${proof.calculatePricesResult.calculated_price.price_set_id}`)
      logger.info(`     - calculated_price.calculated_amount: ${proof.calculatePricesResult.calculated_price.calculated_amount}`)
      logger.info(`     - calculated_price.currency_code: ${proof.calculatePricesResult.calculated_price.currency_code}`)
      logger.info(`     - Prix EUR: €${(proof.calculatePricesResult.calculated_price.calculated_amount / 100).toFixed(2)}`)
      logger.info("")
    })
  }

  // ====================================================================
  // VÉRIFICATION RÈGLES EUR
  // ====================================================================

  logger.info("💶 VÉRIFICATION RÈGLES RÉGION EUR\n")

  let variantsWithEURCurrency = 0
  for (const variant of workingVariants) {
    const [result] = await pricingService.calculatePrices(
      { id: [variant.variantId] },
      { context: { currency_code: "eur" } }
    )

    if (result?.calculated_price?.currency_code === "eur") {
      variantsWithEURCurrency++
    }
  }

  logger.info(`   ✅ Variants avec currency_code EUR: ${variantsWithEURCurrency}/${variantsFullyWorking}`)
  logger.info(`   ${variantsWithEURCurrency === variantsFullyWorking ? '✅' : '❌'} CONFORMITÉ: ${variantsWithEURCurrency === variantsFullyWorking ? 'OUI' : 'NON'}`)

  // ====================================================================
  // VÉRIFICATION CONSOMMABILITÉ MEDUSA
  // ====================================================================

  logger.info(`\n🔌 VÉRIFICATION CONSOMMABILITÉ MEDUSA\n`)

  // Test: Est-ce que Medusa peut calculer un prix pour un contexte de panier?
  let medusaConsumable = false
  if (workingVariants.length > 0) {
    const testVariant = workingVariants[0]
    try {
      const [cartPriceTest] = await pricingService.calculatePrices(
        { id: [testVariant.variantId] },
        {
          context: {
            currency_code: "eur",
            region_id: undefined, // Pas de région spécifique
          }
        }
      )

      if (cartPriceTest?.calculated_price?.calculated_amount) {
        medusaConsumable = true
        logger.info(`   ✅ Test panier (${testVariant.sku}): €${(cartPriceTest.calculated_price.calculated_amount / 100).toFixed(2)}`)
        logger.info(`   ✅ CONSOMMABILITÉ: OUI`)
      } else {
        logger.error(`   ❌ CONSOMMABILITÉ: NON`)
      }
    } catch (error: any) {
      logger.error(`   ❌ Erreur test consommabilité: ${error.message}`)
    }
  }

  // ====================================================================
  // VARIANTS EN ÉCHEC
  // ====================================================================

  if (failedVariants.length > 0) {
    logger.info(`\n❌ VARIANTS EN ÉCHEC (${failedVariants.length}):\n`)
    failedVariants.forEach(v => {
      logger.warn(`   - ${v.sku}: ${v.reason}`)
    })
  }

  // ====================================================================
  // VERDICT FINAL
  // ====================================================================

  logger.info("\n" + "=".repeat(70))
  logger.info("🎯 VERDICT VALIDATION")
  logger.info("=".repeat(70))

  const isFullSuccess = variantsFullyWorking === totalVariantsPIM
  const isPartialSuccess = variantsFullyWorking > 0 && variantsFullyWorking >= totalVariantsPIM * 0.8

  if (isFullSuccess) {
    logger.info(`✅ SUCCÈS COMPLET`)
    logger.info(`   - ${variantsFullyWorking}/${totalVariantsPIM} variants avec pricing fonctionnel`)
    logger.info(`   - Tous les variants PIM ont un pricing exploitable`)
    logger.info(`   - Règles EUR présentes: ${variantsWithEURCurrency === variantsFullyWorking ? 'OUI' : 'NON'}`)
    logger.info(`   - Consommabilité Medusa: ${medusaConsumable ? 'OUI' : 'NON'}`)
  } else if (isPartialSuccess) {
    logger.warn(`⚠️  SUCCÈS PARTIEL`)
    logger.warn(`   - ${variantsFullyWorking}/${totalVariantsPIM} variants fonctionnels (${((variantsFullyWorking / totalVariantsPIM) * 100).toFixed(1)}%)`)
    logger.warn(`   - ${failedVariants.length} variants nécessitent encore une correction`)
  } else {
    logger.error(`❌ ÉCHEC`)
    logger.error(`   - Seulement ${variantsFullyWorking}/${totalVariantsPIM} variants fonctionnels`)
    logger.error(`   - Fix pricing incomplet`)
  }

  logger.info("=".repeat(70))

  // ====================================================================
  // EXPORT RAPPORT VALIDATION
  // ====================================================================

  const validationReport = {
    timestamp: new Date().toISOString(),
    verdict: isFullSuccess ? "SUCCESS" : isPartialSuccess ? "PARTIAL_SUCCESS" : "FAILURE",
    stats: {
      totalVariantsPIM,
      variantsWithPriceSetId,
      variantsWithCalculatedPrice,
      variantsWithCorrectPrice,
      variantsFullyWorking,
      variantsFailed: failedVariants.length,
      successRate: `${((variantsFullyWorking / totalVariantsPIM) * 100).toFixed(1)}%`,
    },
    rules: {
      eurCurrencyPresent: variantsWithEURCurrency === variantsFullyWorking,
      medusaConsumable,
    },
    proofPayloads: proofPayloads.slice(0, 3), // 3 preuves complètes
    workingVariants: workingVariants.map(v => ({
      sku: v.sku,
      priceEUR: `€${(v.calculatedAmount / 100).toFixed(2)}`,
    })),
    failedVariants,
  }

  const reportPath = path.join(process.cwd(), "reports", "pricing-fix-validation.json")
  fs.mkdirSync(path.dirname(reportPath), { recursive: true })
  fs.writeFileSync(reportPath, JSON.stringify(validationReport, null, 2))

  logger.info(`\n📁 Rapport validation sauvegardé: ${reportPath}`)
  logger.info("")

  return validationReport
}
