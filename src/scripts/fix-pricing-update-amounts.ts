import { ExecArgs } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  Modules,
} from "@medusajs/framework/utils"

/**
 * FIX PRICING BLOQUANT - Mise à jour des montants EUR dans les price sets existants
 *
 * NOUVELLE DÉCOUVERTE:
 * - Les liens variant → price_set EXISTENT déjà ✅
 * - MAIS les price sets ont des montants EUR INCORRECTS ❌
 * - calculatePrices() retourne des prix qui ne correspondent pas au PIM
 *
 * SOLUTION:
 * - Pour chaque variant, récupérer son price_set_id existant
 * - Mettre à jour ou créer le prix EUR avec le bon montant PIM
 * - Approche non-destructive: mise à jour uniquement
 */

export default async function fixPricingUpdateAmounts({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const productService = container.resolve(Modules.PRODUCT)
  const pricingService = container.resolve(Modules.PRICING)

  logger.info("🔧 FIX PRICING - MISE À JOUR MONTANTS EUR")
  logger.info("=" .repeat(70))

  // Mapping PIM: SKU → Prix EUR en cents
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

  logger.info(`\n📊 Mapping PIM: ${Object.keys(pimPriceMapping).length} SKUs\n`)

  // Récupérer tous les produits avec variants
  const products = await productService.listProducts({}, { take: 100, relations: ['variants'] })

  let totalVariants = 0
  let variantsFixed = 0
  let variantsSkipped = 0
  let errors: string[] = []

  const fixedVariants: Array<{
    sku: string
    variantId: string
    priceSetId: string
    oldAmount: number | null
    newAmount: number
  }> = []

  logger.info("🔍 Traitement des variants...\n")

  for (const product of products) {
    for (const variant of product.variants || []) {
      totalVariants++
      const sku = variant.sku || "NO_SKU"
      const expectedPriceEUR = pimPriceMapping[sku]

      if (!expectedPriceEUR) {
        logger.warn(`   ⚠️  SKU ${sku} non dans PIM mapping, ignoré`)
        variantsSkipped++
        continue
      }

      try {
        // Étape 1: Tester calculatePrices pour obtenir le price_set_id actuel
        const [priceResult] = await pricingService.calculatePrices(
          { id: [variant.id] },
          { context: { currency_code: "eur" } }
        )

        if (!priceResult?.calculated_price?.price_set_id) {
          logger.error(`   ❌ ${sku}: Pas de price_set_id trouvé`)
          errors.push(`${sku}: Pas de price_set_id`)
          continue
        }

        const priceSetId = priceResult.calculated_price.price_set_id
        const currentAmount = priceResult.calculated_price.calculated_amount || null

        // Étape 2: Vérifier si le montant est déjà correct
        if (currentAmount === expectedPriceEUR) {
          logger.info(`   ✅ ${sku}: Prix déjà correct (€${(expectedPriceEUR / 100).toFixed(2)})`)
          variantsFixed++
          continue
        }

        // Étape 3: Récupérer le price set complet
        const priceSet = await pricingService.retrievePriceSet(priceSetId, {
          relations: ['prices']
        })

        // Étape 4: Trouver ou créer le prix EUR
        const eurPrice = priceSet.prices?.find((p: any) => p.currency_code === 'eur')

        if (eurPrice) {
          // Mise à jour du prix EUR existant
          await pricingService.updatePrices({
            id: eurPrice.id,
            amount: expectedPriceEUR,
          })

          logger.info(`   ✅ ${sku}: Prix mis à jour €${(currentAmount || 0) / 100} → €${(expectedPriceEUR / 100).toFixed(2)}`)
        } else {
          // Ajout d'un nouveau prix EUR au price set
          await pricingService.addPrices({
            priceSetId: priceSetId,
            prices: [
              {
                amount: expectedPriceEUR,
                currency_code: "eur",
              }
            ]
          })

          logger.info(`   ✅ ${sku}: Prix EUR ajouté €${(expectedPriceEUR / 100).toFixed(2)}`)
        }

        fixedVariants.push({
          sku,
          variantId: variant.id,
          priceSetId,
          oldAmount: currentAmount,
          newAmount: expectedPriceEUR,
        })

        variantsFixed++

      } catch (error: any) {
        logger.error(`   ❌ Erreur ${sku}: ${error.message}`)
        errors.push(`${sku}: ${error.message}`)
      }
    }
  }

  // ====================================================================
  // RÉSUMÉ FIX
  // ====================================================================

  logger.info("\n" + "=".repeat(70))
  logger.info("📊 RÉSUMÉ FIX PRICING")
  logger.info("=".repeat(70))
  logger.info(`Total variants traités:      ${totalVariants}`)
  logger.info(`Variants fixés avec succès:  ${variantsFixed}`)
  logger.info(`Variants ignorés (hors PIM): ${variantsSkipped}`)
  logger.info(`Erreurs:                     ${errors.length}`)
  logger.info("=".repeat(70))

  if (errors.length > 0) {
    logger.warn("\n⚠️  ERREURS RENCONTRÉES:")
    errors.forEach(err => logger.warn(`   - ${err}`))
  }

  if (fixedVariants.length > 0) {
    logger.info(`\n✅ VARIANTS FIXÉS (${fixedVariants.length}):`)
    fixedVariants.slice(0, 10).forEach(v => {
      const oldPrice = v.oldAmount ? `€${(v.oldAmount / 100).toFixed(2)}` : 'N/A'
      const newPrice = `€${(v.newAmount / 100).toFixed(2)}`
      logger.info(`   - ${v.sku}: ${oldPrice} → ${newPrice}`)
    })
    if (fixedVariants.length > 10) {
      logger.info(`   ... et ${fixedVariants.length - 10} autres`)
    }
  }

  logger.info("\n🎯 PROCHAINE ÉTAPE:")
  logger.info("   Exécuter: npx medusa exec ./src/scripts/validate-pricing-fixed.ts")
  logger.info("")

  return {
    totalVariants,
    variantsFixed,
    variantsSkipped,
    errors: errors.length,
    fixedVariants,
  }
}
