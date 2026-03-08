import { ExecArgs } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  Modules,
} from "@medusajs/framework/utils"

/**
 * Diagnostic simplifié pour comprendre l'état réel du pricing
 */

export default async function simplePricingDiagnostic({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const productService = container.resolve(Modules.PRODUCT)
  const pricingService = container.resolve(Modules.PRICING)

  logger.info("🔬 DIAGNOSTIC SIMPLIFIÉ PRICING")
  logger.info("=" .repeat(70))

  // Test sur un variant spécifique
  const testSKU = "LFS-PRI-NBM-FIR"
  const expectedPrice = 29990

  logger.info(`\n🧪 Test sur: ${testSKU} (attendu: €${(expectedPrice / 100).toFixed(2)})\n`)

  // Trouver le variant
  const products = await productService.listProducts({}, { take: 100, relations: ['variants'] })
  let testVariant: any = null

  for (const product of products) {
    for (const variant of product.variants || []) {
      if (variant.sku === testSKU) {
        testVariant = variant
        break
      }
    }
    if (testVariant) break
  }

  if (!testVariant) {
    logger.error(`❌ Variant ${testSKU} non trouvé`)
    return
  }

  logger.info(`✅ Variant trouvé: ${testVariant.id}`)

  // TEST 1: Inspecter les champs du variant
  logger.info(`\n📦 TEST 1: Champs du variant\n`)

  const variantData = testVariant as any
  logger.info(`   ID: ${testVariant.id}`)
  logger.info(`   SKU: ${testVariant.sku}`)
  logger.info(`   Title: ${testVariant.title}`)
  logger.info(`   Champs disponibles: ${Object.keys(variantData).join(', ')}`)

  // TEST 2: calculatePrices()
  logger.info(`\n💶 TEST 2: calculatePrices()\n`)

  try {
    const result = await pricingService.calculatePrices(
      { id: [testVariant.id] },
      { context: { currency_code: "eur" } }
    )

    logger.info(`   Type résultat: ${Array.isArray(result) ? 'Array' : typeof result}`)
    logger.info(`   Longueur: ${Array.isArray(result) ? result.length : 'N/A'}`)

    if (Array.isArray(result) && result.length > 0) {
      const firstResult = result[0] as any
      logger.info(`\n   Premier résultat:`)
      logger.info(`   ${JSON.stringify(firstResult, null, 2)}`)

      if (firstResult?.calculated_price) {
        logger.info(`\n   ✅ calculated_price présent`)
      } else {
        logger.error(`\n   ❌ calculated_price absent`)
      }
    } else {
      logger.error(`   ❌ Résultat vide`)
    }
  } catch (error: any) {
    logger.error(`   ❌ Erreur: ${error.message}`)
  }

  // TEST 3: Lister price sets
  logger.info(`\n📋 TEST 3: Price sets disponibles\n`)

  const priceSets = await pricingService.listPriceSets({}, { take: 10, relations: ['prices'] })
  logger.info(`   Total price sets: ${priceSets.length}`)

  let foundWithEUR = 0
  for (const ps of priceSets) {
    const prices = ps.prices || []
    const eurPrice = prices.find((p: any) => p.currency_code === 'eur')
    if (eurPrice) {
      foundWithEUR++
      if (foundWithEUR <= 3) {
        logger.info(`   - ${ps.id}: €${((eurPrice as any).amount / 100).toFixed(2)}`)
      }
    }
  }

  logger.info(`\n   Price sets avec EUR: ${foundWithEUR}/${priceSets.length}`)

  // TEST 4: Essayer de créer un price set et le lier
  logger.info(`\n🔧 TEST 4: Création et liaison d'un price set\n`)

  try {
    // Créer un price set avec le bon prix
    logger.info(`   Création price set avec €${(expectedPrice / 100).toFixed(2)}...`)

    const newPriceSet = await pricingService.createPriceSets({
      prices: [
        {
          amount: expectedPrice,
          currency_code: "eur",
        }
      ]
    })

    logger.info(`   ✅ Price set créé: ${newPriceSet.id}`)

    // Utiliser le workflow pour lier
    logger.info(`   Tentative de liaison via updateProductVariantsWorkflow...`)

    const { updateProductVariantsWorkflow } = await import("@medusajs/medusa/core-flows")

    await updateProductVariantsWorkflow(container).run({
      input: {
        selector: { id: testVariant.id },
        update: {
          prices: [
            {
              amount: expectedPrice,
              currency_code: "eur",
            }
          ]
        }
      }
    })

    logger.info(`   ✅ Workflow exécuté`)

    // Re-tester calculatePrices
    logger.info(`\n   🧪 Re-test calculatePrices() après liaison:\n`)

    const [newResult] = await pricingService.calculatePrices(
      { id: [testVariant.id] },
      { context: { currency_code: "eur" } }
    ) as any[]

    if (newResult?.calculated_price) {
      const calcPrice = newResult.calculated_price as any
      logger.info(`   ✅ SUCCESS! calculatePrices() fonctionne!`)
      logger.info(`   Prix calculé: €${(calcPrice.calculated_amount / 100).toFixed(2)}`)
      logger.info(`   Price set ID: ${calcPrice.price_set_id}`)
      logger.info(`\n   🎯 LA SOLUTION FONCTIONNE! Appliquer à tous les variants.`)
    } else {
      logger.error(`   ❌ calculatePrices() toujours vide`)
      logger.error(`   Résultat complet: ${JSON.stringify(newResult, null, 2)}`)
    }

  } catch (error: any) {
    logger.error(`   ❌ Erreur test liaison: ${error.message}`)
    logger.error(`   Stack: ${error.stack?.substring(0, 500)}`)
  }

  logger.info(`\n${"=".repeat(70)}`)
  logger.info("")
}
