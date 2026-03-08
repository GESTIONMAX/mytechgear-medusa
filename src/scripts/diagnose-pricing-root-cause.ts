import { ExecArgs } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  Modules,
} from "@medusajs/framework/utils"

/**
 * Diagnostic approfondi de la cause racine du pricing cassé
 *
 * Objectif: Comprendre pourquoi calculatePrices() retourne undefined
 * alors que update-variants-with-pricing.ts a indiqué un succès
 */

export default async function diagnosePricingRootCause({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const productService = container.resolve(Modules.PRODUCT)
  const pricingService = container.resolve(Modules.PRICING)

  logger.info("🔬 DIAGNOSTIC PROFOND - CAUSE RACINE PRICING CASSÉ")
  logger.info("=" .repeat(70))

  // Test sur une variante spécifique: Prime
  const testVariantId = "variant_01KGBSKFM71QR13VMQ89FT2TK9"
  const testSKU = "LFS-PRI-NBM-FIR"

  logger.info(`\n🧪 Test sur variante: ${testSKU} (${testVariantId})\n`)

  // ====================================================================
  // ÉTAPE 1: Vérifier la variante existe dans Product Service
  // ====================================================================

  logger.info("📦 ÉTAPE 1: Product Service - Récupération variante\n")

  try {
    const variant = await productService.retrieveProductVariant(testVariantId)

    logger.info(`   ✅ Variante trouvée:`)
    logger.info(`      - ID: ${variant.id}`)
    logger.info(`      - SKU: ${variant.sku}`)
    logger.info(`      - Title: ${variant.title}`)
    logger.info(`      - product_id: ${variant.product_id}`)

    // Vérifier les champs pricing
    const variantData = variant as any
    logger.info(`\n   📊 Champs pricing directs sur variant:`)
    logger.info(`      - variant.price_set_id: ${variantData.price_set_id || 'UNDEFINED'}`)
    logger.info(`      - variant.calculated_price: ${variantData.calculated_price || 'UNDEFINED'}`)
    logger.info(`      - variant.prices: ${variantData.prices ? JSON.stringify(variantData.prices) : 'UNDEFINED'}`)

  } catch (error: any) {
    logger.error(`   ❌ Erreur récupération variante: ${error.message}`)
    return
  }

  // ====================================================================
  // ÉTAPE 2: Tester calculatePrices (le problème identifié)
  // ====================================================================

  logger.info(`\n💶 ÉTAPE 2: Pricing Service - calculatePrices()\n`)

  try {
    const [result] = await pricingService.calculatePrices(
      { id: [testVariantId] },
      { context: { currency_code: "eur" } }
    )

    logger.info(`   📦 Résultat calculatePrices:`)
    logger.info(`      - result: ${result ? 'PRÉSENT' : 'UNDEFINED'}`)

    if (result) {
      logger.info(`      - result.id: ${result.id}`)
      logger.info(`      - result.calculated_price: ${result.calculated_price ? 'PRÉSENT' : 'UNDEFINED'}`)

      if (result.calculated_price) {
        logger.info(`      - result.calculated_price.price_set_id: ${result.calculated_price.price_set_id || 'UNDEFINED'}`)
        logger.info(`      - result.calculated_price.calculated_amount: ${result.calculated_price.calculated_amount || 'UNDEFINED'}`)
      } else {
        logger.error(`   ❌ PROBLÈME: calculated_price est undefined`)
      }
    } else {
      logger.error(`   ❌ PROBLÈME CRITIQUE: calculatePrices retourne undefined`)
    }

  } catch (error: any) {
    logger.error(`   ❌ Erreur calculatePrices: ${error.message}`)
  }

  // ====================================================================
  // ÉTAPE 3: Lister tous les price sets existants
  // ====================================================================

  logger.info(`\n📋 ÉTAPE 3: Pricing Service - Liste des price sets\n`)

  try {
    const priceSets = await pricingService.listPriceSets({}, { take: 30 })

    logger.info(`   ✅ Total price sets: ${priceSets.length}`)

    if (priceSets.length > 0) {
      logger.info(`\n   Premiers price sets:`)
      priceSets.slice(0, 5).forEach((ps: any, idx: number) => {
        logger.info(`   ${idx + 1}. ${ps.id}`)
      })
    }

    // Chercher si un price set a des prix EUR
    let priceSetsWithEUR = 0
    for (const ps of priceSets) {
      const fullPriceSet = await pricingService.retrievePriceSet(ps.id, { relations: ['prices'] })
      const eurPrice = fullPriceSet.prices?.find((p: any) => p.currency_code === 'eur')
      if (eurPrice) {
        priceSetsWithEUR++
        if (priceSetsWithEUR <= 3) {
          logger.info(`\n   ✅ Price set ${ps.id} a un prix EUR:`)
          logger.info(`      - amount: ${eurPrice.amount} cents (€${(eurPrice.amount / 100).toFixed(2)})`)
        }
      }
    }

    logger.info(`\n   📊 Price sets avec prix EUR: ${priceSetsWithEUR}/${priceSets.length}`)

  } catch (error: any) {
    logger.error(`   ❌ Erreur listPriceSets: ${error.message}`)
  }

  // ====================================================================
  // ÉTAPE 4: Vérifier les liens variant ↔ price_set
  // ====================================================================

  logger.info(`\n🔗 ÉTAPE 4: Vérification des liens variant ↔ price_set\n`)

  try {
    // Tenter de récupérer le product avec relations
    const product = await productService.retrieveProduct("prod_01KGBSKFJ065B5KGPFTXDAD2K0", {
      relations: ['variants']
    })

    const variant = product.variants?.find((v: any) => v.id === testVariantId)

    if (variant) {
      logger.info(`   ✅ Variante trouvée via product.variants`)

      const variantData = variant as any
      logger.info(`   📊 Données variant depuis product:`)
      logger.info(`      - id: ${variantData.id}`)
      logger.info(`      - sku: ${variantData.sku}`)
      logger.info(`      - price_set_id: ${variantData.price_set_id || 'UNDEFINED'}`)

      // Tester avec différentes approches
      logger.info(`\n   🧪 Test calculatePrices avec variant.id depuis product:`)
      const [testResult] = await pricingService.calculatePrices(
        { id: [variantData.id] },
        { context: { currency_code: "eur" } }
      )

      logger.info(`      - Résultat: ${testResult ? 'PRÉSENT' : 'UNDEFINED'}`)
      if (testResult?.calculated_price) {
        logger.info(`      - price_set_id: ${testResult.calculated_price.price_set_id}`)
      }

    } else {
      logger.warn(`   ⚠️  Variante non trouvée via product.variants`)
    }

  } catch (error: any) {
    logger.error(`   ❌ Erreur vérification liens: ${error.message}`)
  }

  // ====================================================================
  // ÉTAPE 5: Lister TOUS les variants et leur statut pricing
  // ====================================================================

  logger.info(`\n📊 ÉTAPE 5: Statut pricing de TOUTES les variantes\n`)

  try {
    const products = await productService.listProducts({}, { take: 100, relations: ['variants'] })

    let totalVariants = 0
    let variantsWithPriceSetId = 0
    let variantsWithCalculatedPrice = 0
    let variantsWorkingPricing = 0

    for (const product of products) {
      for (const variant of product.variants || []) {
        totalVariants++

        const variantData = variant as any
        const hasPriceSetId = !!variantData.price_set_id

        if (hasPriceSetId) {
          variantsWithPriceSetId++
        }

        // Tester calculatePrices
        try {
          const [result] = await pricingService.calculatePrices(
            { id: [variant.id] },
            { context: { currency_code: "eur" } }
          )

          if (result?.calculated_price) {
            variantsWithCalculatedPrice++

            if (result.calculated_price.price_set_id) {
              variantsWorkingPricing++
            }
          }
        } catch (e) {
          // Silently continue
        }
      }
    }

    logger.info(`   📊 Résultats globaux:`)
    logger.info(`      - Total variantes: ${totalVariants}`)
    logger.info(`      - Variantes avec price_set_id: ${variantsWithPriceSetId}`)
    logger.info(`      - Variantes avec calculated_price: ${variantsWithCalculatedPrice}`)
    logger.info(`      - Variantes avec pricing fonctionnel: ${variantsWorkingPricing}`)
    logger.info(``)
    logger.info(`   📈 Pourcentages:`)
    logger.info(`      - % avec price_set_id: ${((variantsWithPriceSetId / totalVariants) * 100).toFixed(1)}%`)
    logger.info(`      - % avec calculated_price: ${((variantsWithCalculatedPrice / totalVariants) * 100).toFixed(1)}%`)
    logger.info(`      - % pricing fonctionnel: ${((variantsWorkingPricing / totalVariants) * 100).toFixed(1)}%`)

  } catch (error: any) {
    logger.error(`   ❌ Erreur scan global: ${error.message}`)
  }

  // ====================================================================
  // CONCLUSION: CAUSE RACINE
  // ====================================================================

  logger.info(`\n${"=".repeat(70)}`)
  logger.info(`🎯 DIAGNOSTIC CAUSE RACINE`)
  logger.info(`${"=".repeat(70)}`)
  logger.info(``)
  logger.info(`Hypothèses à vérifier:`)
  logger.info(``)
  logger.info(`1. ❓ Les variants n'ont PAS de price_set_id dans leur données`)
  logger.info(`2. ❓ Les price sets existent mais ne sont PAS liés aux variants`)
  logger.info(`3. ❓ Le Link Module Medusa v2 n'a pas créé les liens variant→pricing`)
  logger.info(`4. ❓ calculatePrices() nécessite un contexte spécifique (region, sales_channel)`)
  logger.info(`5. ❓ Les variants ont été créés SANS pricing initial (workflows incomplets)`)
  logger.info(``)
  logger.info(`Prochaine action recommandée:`)
  logger.info(`- Si price_set_id manque: Recréer liens via RemoteLink`)
  logger.info(`- Si price sets absents: Recréer price sets ET liens`)
  logger.info(`- Si workflows incomplets: Refaire import produits avec pricing`)
  logger.info(`${"=".repeat(70)}`)
  logger.info(``)
}
