import { ExecArgs } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  Modules,
} from "@medusajs/framework/utils"
import { setVariantPrice, getVariantPrices } from "../lib/pricing"

/**
 * Script pour peupler les prix EUR des variantes existantes
 *
 * Context:
 * - Les produits ont été importés mais les prix n'ont pas été créés correctement
 * - Ce script ajoute les prix EUR uniquement (pas de multi-devises pour le MVP)
 * - Prix basés sur les scripts d'import originaux (USD → EUR avec marge)
 *
 * Formule: EUR_cents = USD * 0.92 * 1.15 * 100
 */

export default async function addVariantPricesEur({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const pricingService = container.resolve(Modules.PRICING)
  const productService = container.resolve(Modules.PRODUCT)

  logger.info("💶 Starting EUR pricing population...")

  // Fonction de conversion USD → EUR (même formule que les imports)
  const convertPrice = (usd: number): number => {
    return Math.round(usd * 0.92 * 1.15 * 100) // Prix en centimes EUR
  }

  // ====================================================================
  // PRICE MAPPING - Basé sur les scripts d'import
  // ====================================================================

  const priceMap: Record<string, number> = {
    // ===== LEGACY PAYLOAD IMPORTS (Prime, Dragon, Falcon, Euphoria, Duck) =====
    // Ces produits n'ont pas de prix USD défini dans les imports, on utilise des prix moyens
    "LFS-PRI-NBM-FIR": 29990,     // Prime: ~€299.90 (produit premium baseline)
    "LFS-DRA-BLKG-CAL": 29990,    // Dragon (Payload): ~€299.90
    "SPR-FAL-OBS-BLU": 29990,     // Falcon: ~€299.90
    "PRI-EUP-BLC-BLU": 19990,     // Euphoria: ~€199.90 (lifestyle entry)
    "PRI-EUP-GLD-ROS": 19990,     // Euphoria Gold: ~€199.90
    "DUCK-CLASSIC-DEFAULT": 19990, // Duck Classic: ~€199.90

    // ===== CHAMELO SHIELD ($199 USD) =====
    "SH-MB-FIR": convertPrice(199),           // Shield - Matte Black, Fire: €210.54

    // ===== CHAMELO MUSIC SHIELD ($349 USD) =====
    "MS-WHT-RED": convertPrice(349),          // Music Shield variants: €369.27
    "MSHIELD-W-R-AUD": convertPrice(349),
    "MSH-MB-SMK": convertPrice(349),
    "MS-WHT-BLU": convertPrice(349),
    "MS-BLK-FIR": convertPrice(349),

    // ===== CHAMELO LIFESTYLE =====
    "ZRX-FIR": convertPrice(199),             // Zurix: €210.54
    "VEL-FIR": convertPrice(199),             // Veil: €210.54
    "DSK-FIR": convertPrice(260),             // Dusk Classic: €275.08
    "INF-FIR": convertPrice(299),             // Infinity: €316.27
    "MR1-INF-FIR": convertPrice(299),         // MR1 x Infinity: €316.27

    // ===== CHAMELO PRISMATIC =====
    "AUR-BLK-ENE": convertPrice(385),         // Aura: €407.33
    "AUR-AUD-BLK-CAL": convertPrice(449),     // Aura Audio: ~€475 (estimé audio +$64)
    "AUR-AUD-BLK-ENE": convertPrice(449),
    "AUR-AUD-WHT-CAL": convertPrice(449),
    "AUR-AUD-WHT-ENE": convertPrice(449),

    // ===== CHAMELO BESTSELLERS =====
    "ARZ-DEF": convertPrice(349),             // Aroza: €369.27
    "DRG-SMK-GBGD": convertPrice(260),        // Dragon Chamelo: €275.08
  }

  logger.info(`\n📊 Price mapping prepared for ${Object.keys(priceMap).length} variants`)
  logger.info(`   Conversion rate: $1 USD = €0.92 EUR + 15% margin`)
  logger.info(`   Example: $199 USD → €${(convertPrice(199) / 100).toFixed(2)} EUR\n`)

  // ====================================================================
  // RETRIEVE ALL VARIANTS
  // ====================================================================

  logger.info("🔍 Retrieving all product variants...")
  const products = await productService.listProducts({}, { take: 100 })

  let totalVariants = 0
  let variantsWithPrices = 0
  let variantsMissingPrices = 0
  let variantsUpdated = 0
  let errors: string[] = []

  for (const product of products) {
    const productWithVariants = await productService.retrieveProduct(product.id, {
      relations: ['variants']
    })

    for (const variant of productWithVariants.variants || []) {
      totalVariants++
      const sku = variant.sku || "NO_SKU"
      const expectedPrice = priceMap[sku]

      if (!expectedPrice) {
        logger.warn(`   ⚠️  SKU ${sku} not found in price mapping, skipping`)
        variantsMissingPrices++
        errors.push(`SKU ${sku} not in price map`)
        continue
      }

      try {
        // Vérifier si le variant a déjà un prix EUR
        const existingPrices = await getVariantPrices(pricingService, variant.id)
        const existingEurPrice = existingPrices.find(p => p.currency_code === 'eur')

        if (existingEurPrice && existingEurPrice.amount) {
          logger.info(`   ✓ ${sku}: Already has EUR price €${(existingEurPrice.amount / 100).toFixed(2)}`)
          variantsWithPrices++
          continue
        }

        // Créer ou mettre à jour le prix EUR
        await setVariantPrice(pricingService, variant.id, "eur", expectedPrice)

        logger.info(`   ✅ ${sku}: Added EUR price €${(expectedPrice / 100).toFixed(2)}`)
        variantsUpdated++

      } catch (error: any) {
        logger.error(`   ❌ Error processing ${sku}: ${error.message}`)
        variantsMissingPrices++
        errors.push(`${sku}: ${error.message}`)
      }
    }
  }

  // ====================================================================
  // SUMMARY REPORT
  // ====================================================================

  logger.info("\n" + "=".repeat(70))
  logger.info("📊 PRICING POPULATION SUMMARY")
  logger.info("=".repeat(70))
  logger.info(`Total variants processed:        ${totalVariants}`)
  logger.info(`Variants already with EUR price: ${variantsWithPrices}`)
  logger.info(`Variants updated with EUR price: ${variantsUpdated}`)
  logger.info(`Variants missing/failed:         ${variantsMissingPrices}`)
  logger.info("=".repeat(70))

  if (errors.length > 0) {
    logger.warn("\n⚠️  ERRORS ENCOUNTERED:")
    errors.forEach(err => logger.warn(`   - ${err}`))
  }

  if (variantsMissingPrices > 0) {
    logger.warn("\n⚠️  Some variants are missing prices!")
    logger.warn("   Action required: Review the price mapping and error log above")
  }

  if (variantsUpdated > 0) {
    logger.info(`\n✅ Successfully added EUR pricing to ${variantsUpdated} variants!`)
    logger.info(`   Next steps:`)
    logger.info(`   1. Test admin pricing page: http://localhost:3200/admin/products`)
    logger.info(`   2. Test storefront product pages`)
    logger.info(`   3. Verify price calculation with different contexts`)
  }

  logger.info("\n💶 EUR pricing population completed!\n")
}
