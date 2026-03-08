import { ExecArgs } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  Modules,
} from "@medusajs/framework/utils"

/**
 * Inspection de la structure d'options des produits
 * pour comprendre comment créer les variantes correctement
 */

export default async function inspectProductOptions({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const productService = container.resolve(Modules.PRODUCT)

  logger.info("🔍 INSPECTION STRUCTURE OPTIONS PRODUITS")
  logger.info("=" .repeat(70))

  const productsToInspect = ["shield", "zurix", "veil", "infinity", "aura", "dragon"]

  for (const handle of productsToInspect) {
    const products = await productService.listProducts(
      { handle: [handle] },
      { relations: ['options', 'variants'] }
    )

    if (products.length === 0) {
      logger.warn(`⚠️  Produit ${handle} non trouvé`)
      continue
    }

    const product = products[0]

    logger.info(`\n📦 ${handle.toUpperCase()}`)
    logger.info(`   Product ID: ${product.id}`)
    logger.info(`   Variants count: ${product.variants?.length || 0}`)
    logger.info(`   Options count: ${product.options?.length || 0}`)
    logger.info("")

    // Afficher toutes les options et leurs valeurs
    for (const option of product.options || []) {
      const optionData = option as any
      logger.info(`   Option: ${optionData.title}`)
      logger.info(`      - ID: ${optionData.id}`)
      logger.info(`      - Values: ${optionData.values ? JSON.stringify(optionData.values) : 'EMPTY'}`)
    }

    // Afficher un exemple de variant existant
    if (product.variants && product.variants.length > 0) {
      const exampleVariant = product.variants[0] as any
      logger.info(`\n   Exemple variant existant:`)
      logger.info(`      - SKU: ${exampleVariant.sku}`)
      logger.info(`      - Title: ${exampleVariant.title}`)
      logger.info(`      - Options: ${exampleVariant.options ? JSON.stringify(exampleVariant.options) : 'EMPTY'}`)
    }

    logger.info("")
  }

  logger.info("=" .repeat(70))
  logger.info("")
}
