import { ExecArgs } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  Modules,
} from "@medusajs/framework/utils"
import { RemoteLink } from "@medusajs/framework/modules-sdk"

/**
 * DIAGNOSTIC PROFOND - État réel des variants et liens
 *
 * Objectif: Comprendre la contradiction:
 * - Script 1 dit "lien existe déjà"
 * - Script 2 dit "pas de price_set_id"
 *
 * On va vérifier:
 * 1. Les champs directs sur les variants
 * 2. Les liens RemoteLink existants
 * 3. La structure complète retournée par calculatePrices()
 */

export default async function deepDiagnoseVariantLinks({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const productService = container.resolve(Modules.PRODUCT)
  const pricingService = container.resolve(Modules.PRICING)
  const remoteLink = container.resolve("remoteLink") as RemoteLink

  logger.info("🔬 DIAGNOSTIC PROFOND - ÉTAT VARIANTS & LIENS")
  logger.info("=" .repeat(70))

  // Test sur un variant spécifique
  const testSKU = "LFS-PRI-NBM-FIR"

  logger.info(`\n🧪 Test sur: ${testSKU}\n`)

  // Trouver le variant
  const products = await productService.listProducts({}, { take: 100, relations: ['variants'] })
  let testVariant: any = null
  let testProduct: any = null

  for (const product of products) {
    for (const variant of product.variants || []) {
      if (variant.sku === testSKU) {
        testVariant = variant
        testProduct = product
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

  // ====================================================================
  // TEST 1: Inspecter les champs directs du variant
  // ====================================================================

  logger.info(`\n📦 TEST 1: Champs directs sur variant (Product Service)\n`)

  const variantDirect = await productService.retrieveProductVariant(testVariant.id)

  logger.info(`   Variant ID: ${variantDirect.id}`)
  logger.info(`   SKU: ${variantDirect.sku}`)
  logger.info(`   Title: ${variantDirect.title}`)

  const variantData = variantDirect as any

  logger.info(`\n   📊 Champs pricing directs:`)
  logger.info(`      - variant.price_set_id: ${variantData.price_set_id || 'UNDEFINED'}`)
  logger.info(`      - variant.calculated_price: ${variantData.calculated_price || 'UNDEFINED'}`)
  logger.info(`      - variant.prices: ${variantData.prices ? JSON.stringify(variantData.prices).substring(0, 100) + '...' : 'UNDEFINED'}`)

  // Tous les champs du variant
  logger.info(`\n   🔍 Tous les champs du variant:`)
  Object.keys(variantData).forEach(key => {
    const value = variantData[key]
    if (typeof value === 'object' && value !== null) {
      logger.info(`      - ${key}: [Object/Array]`)
    } else {
      logger.info(`      - ${key}: ${value}`)
    }
  })

  // ====================================================================
  // TEST 2: Tester calculatePrices() en détail
  // ====================================================================

  logger.info(`\n💶 TEST 2: Pricing Service - calculatePrices()\n`)

  try {
    const pricesResult = await pricingService.calculatePrices(
      { id: [testVariant.id] },
      { context: { currency_code: "eur" } }
    )

    logger.info(`   📦 Résultat brut calculatePrices:`)
    logger.info(`      - Type: ${Array.isArray(pricesResult) ? 'Array' : typeof pricesResult}`)
    logger.info(`      - Longueur: ${Array.isArray(pricesResult) ? pricesResult.length : 'N/A'}`)

    if (Array.isArray(pricesResult) && pricesResult.length > 0) {
      const [result] = pricesResult
      logger.info(`\n   📊 Premier élément du résultat:`)
      logger.info(`      - result existe: ${result ? 'OUI' : 'NON'}`)

      if (result) {
        logger.info(`      - result.id: ${result.id}`)
        logger.info(`      - result.calculated_price existe: ${result.calculated_price ? 'OUI' : 'NON'}`)

        if (result.calculated_price) {
          logger.info(`\n   ✅ calculated_price présent:`)
          logger.info(`      - price_set_id: ${result.calculated_price.price_set_id}`)
          logger.info(`      - calculated_amount: ${result.calculated_price.calculated_amount}`)
          logger.info(`      - currency_code: ${result.calculated_price.currency_code}`)
          logger.info(`      - prix EUR: €${((result.calculated_price.calculated_amount || 0) / 100).toFixed(2)}`)
        } else {
          logger.error(`   ❌ calculated_price est undefined/null`)
        }

        // Afficher tous les champs du result
        logger.info(`\n   🔍 Tous les champs du result:`)
        Object.keys(result).forEach(key => {
          const value = result[key]
          if (typeof value === 'object' && value !== null) {
            logger.info(`      - ${key}: [Object]`)
            if (key === 'calculated_price') {
              Object.keys(value).forEach(subKey => {
                logger.info(`         - ${subKey}: ${value[subKey]}`)
              })
            }
          } else {
            logger.info(`      - ${key}: ${value}`)
          }
        })
      }
    } else {
      logger.error(`   ❌ calculatePrices() retourne un tableau vide ou undefined`)
    }
  } catch (error: any) {
    logger.error(`   ❌ Erreur calculatePrices(): ${error.message}`)
    logger.error(`   Stack: ${error.stack}`)
  }

  // ====================================================================
  // TEST 3: Interroger RemoteLink directement
  // ====================================================================

  logger.info(`\n🔗 TEST 3: RemoteLink - Liens existants\n`)

  try {
    // Essayer de lister les liens pour ce variant
    const links = await remoteLink.list({
      [Modules.PRODUCT]: {
        variant_id: testVariant.id,
      }
    })

    logger.info(`   📦 Liens RemoteLink trouvés: ${links ? links.length : 0}`)

    if (links && links.length > 0) {
      links.forEach((link: any, idx: number) => {
        logger.info(`\n   Lien ${idx + 1}:`)
        logger.info(`      ${JSON.stringify(link, null, 2)}`)
      })
    } else {
      logger.warn(`   ⚠️  Aucun lien RemoteLink trouvé pour ce variant`)
    }
  } catch (error: any) {
    logger.error(`   ❌ Erreur RemoteLink.list(): ${error.message}`)
  }

  // ====================================================================
  // TEST 4: Lister les price sets et voir lesquels ont des prix EUR
  // ====================================================================

  logger.info(`\n💶 TEST 4: Price Sets avec prix EUR\n`)

  const priceSets = await pricingService.listPriceSets({}, { take: 30, relations: ['prices'] })

  let priceSetsWithEUR = 0
  let examplePriceSet: any = null

  for (const ps of priceSets) {
    const eurPrice = ps.prices?.find((p: any) => p.currency_code === 'eur')
    if (eurPrice) {
      priceSetsWithEUR++
      if (!examplePriceSet) {
        examplePriceSet = { ps, eurPrice }
      }
    }
  }

  logger.info(`   📊 Total price sets: ${priceSets.length}`)
  logger.info(`   📊 Price sets avec prix EUR: ${priceSetsWithEUR}`)

  if (examplePriceSet) {
    logger.info(`\n   Exemple price set avec EUR:`)
    logger.info(`      - ID: ${examplePriceSet.ps.id}`)
    logger.info(`      - Prix EUR: ${examplePriceSet.eurPrice.amount} cents (€${(examplePriceSet.eurPrice.amount / 100).toFixed(2)})`)
  }

  // ====================================================================
  // TEST 5: Tester l'approche de création de lien
  // ====================================================================

  logger.info(`\n🔧 TEST 5: Test création lien RemoteLink\n`)

  if (examplePriceSet) {
    try {
      logger.info(`   Tentative de création lien: variant ${testVariant.id} → price_set ${examplePriceSet.ps.id}`)

      await remoteLink.create([
        {
          [Modules.PRODUCT]: {
            variant_id: testVariant.id,
          },
          [Modules.PRICING]: {
            price_set_id: examplePriceSet.ps.id,
          },
        }
      ])

      logger.info(`   ✅ Lien créé avec succès!`)

      // Retester calculatePrices
      logger.info(`\n   🧪 Re-test calculatePrices() après création lien:`)
      const [newResult] = await pricingService.calculatePrices(
        { id: [testVariant.id] },
        { context: { currency_code: "eur" } }
      )

      if (newResult?.calculated_price) {
        logger.info(`   ✅ calculatePrices() fonctionne maintenant!`)
        logger.info(`      - price_set_id: ${newResult.calculated_price.price_set_id}`)
        logger.info(`      - amount: €${(newResult.calculated_price.calculated_amount / 100).toFixed(2)}`)
      } else {
        logger.error(`   ❌ calculatePrices() toujours vide après création lien`)
      }

    } catch (error: any) {
      logger.warn(`   ⚠️  Erreur création lien: ${error.message}`)

      if (error.message?.includes("already exists") || error.message?.includes("multiple links")) {
        logger.info(`   ℹ️  Le message indique que le lien existe déjà`)
        logger.info(`   ❓ Mais pourquoi calculatePrices() ne fonctionne pas alors?`)
      }
    }
  }

  logger.info(`\n${"=".repeat(70)}`)
  logger.info("")
}
