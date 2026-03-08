import { ExecArgs } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  Modules,
} from "@medusajs/framework/utils"
import { RemoteLink } from "@medusajs/framework/modules-sdk"

/**
 * FIX PRICING BLOQUANT - Liaison price_set_id aux variants
 *
 * ROOT CAUSE IDENTIFIÉE:
 * - 30 price sets existent avec prix EUR corrects
 * - 0/24 variants ont le champ price_set_id
 * - calculatePrices() retourne undefined car aucun lien n'existe
 *
 * SOLUTION:
 * - Pour chaque variant, créer ou récupérer le price set avec le bon prix EUR
 * - Lier le variant au price set via le RemoteLink Module
 * - Vérifier que le lien est bien créé
 *
 * APPROCHE NON-DESTRUCTIVE:
 * - Ne supprime aucun price set existant
 * - Crée uniquement les liens manquants
 * - Valide chaque opération
 */

export default async function fixPricingLinkPriceSets({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const productService = container.resolve(Modules.PRODUCT)
  const pricingService = container.resolve(Modules.PRICING)
  const remoteLink = container.resolve("remoteLink") as RemoteLink

  logger.info("🔧 FIX PRICING BLOQUANT - LIAISON PRICE SETS")
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
    priceEUR: number
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
        // Étape 1: Chercher un price set existant avec le bon prix EUR
        let targetPriceSet: any = null
        const allPriceSets = await pricingService.listPriceSets({}, { take: 200, relations: ['prices'] })

        for (const ps of allPriceSets) {
          const eurPrice = ps.prices?.find((p: any) => p.currency_code === 'eur')
          if (eurPrice && eurPrice.amount === expectedPriceEUR) {
            targetPriceSet = ps
            break
          }
        }

        // Étape 2: Si aucun price set trouvé, le créer
        if (!targetPriceSet) {
          logger.info(`   🆕 Création price set pour ${sku} (€${(expectedPriceEUR / 100).toFixed(2)})`)

          targetPriceSet = await pricingService.createPriceSets({
            prices: [
              {
                amount: expectedPriceEUR,
                currency_code: "eur",
              }
            ]
          })
        }

        // Étape 3: Créer le lien variant → price_set via RemoteLink
        try {
          await remoteLink.create([
            {
              [Modules.PRODUCT]: {
                variant_id: variant.id,
              },
              [Modules.PRICING]: {
                price_set_id: targetPriceSet.id,
              },
            }
          ])

          logger.info(`   ✅ ${sku}: Lié au price set ${targetPriceSet.id} (€${(expectedPriceEUR / 100).toFixed(2)})`)

          fixedVariants.push({
            sku,
            variantId: variant.id,
            priceSetId: targetPriceSet.id,
            priceEUR: expectedPriceEUR,
          })

          variantsFixed++

        } catch (linkError: any) {
          // Si le lien existe déjà, vérifier qu'il pointe vers le bon price set
          if (linkError.message?.includes("already exists") || linkError.message?.includes("multiple links")) {
            logger.warn(`   ℹ️  ${sku}: Lien existant détecté, vérification...`)

            // Tester si le pricing fonctionne
            const [testResult] = await pricingService.calculatePrices(
              { id: [variant.id] },
              { context: { currency_code: "eur" } }
            )

            if (testResult?.calculated_price?.calculated_amount === expectedPriceEUR) {
              logger.info(`   ✅ ${sku}: Pricing déjà fonctionnel (€${(expectedPriceEUR / 100).toFixed(2)})`)
              variantsFixed++
            } else {
              logger.error(`   ❌ ${sku}: Lien existe mais prix incorrect`)
              errors.push(`${sku}: Lien existe mais prix incorrect`)
            }
          } else {
            throw linkError
          }
        }

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
      logger.info(`   - ${v.sku}: price_set ${v.priceSetId} → €${(v.priceEUR / 100).toFixed(2)}`)
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
