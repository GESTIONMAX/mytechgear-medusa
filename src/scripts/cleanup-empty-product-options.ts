import { ExecArgs } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  Modules,
} from "@medusajs/framework/utils"
import { deleteProductOptionsWorkflow } from "@medusajs/medusa/core-flows"

/**
 * Nettoyage des options produit vides
 *
 * Contexte: Les produits ont des options "Frame Color" et "Lens Color" vides
 * héritées d'imports legacy qui bloquent la création de nouvelles variantes.
 *
 * Ces options:
 * - N'ont aucune valeur définie (values_count = 0)
 * - Ne sont utilisées par aucun variant (variants_using = 0)
 * - Peuvent être supprimées en toute sécurité
 */

export default async function cleanupEmptyProductOptions({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const productService = container.resolve(Modules.PRODUCT)

  logger.info("🧹 NETTOYAGE OPTIONS PRODUIT VIDES")
  logger.info("=" .repeat(70))

  const productsToClean = ["shield", "zurix", "veil", "infinity", "aura", "dragon"]
  const emptyOptionNames = ["Frame Color", "Lens Color"]

  let totalOptionsRemoved = 0
  let totalProducts = 0

  for (const handle of productsToClean) {
    const products = await productService.listProducts(
      { handle: [handle] },
      { relations: ['options'] }
    )

    if (products.length === 0) {
      logger.warn(`⚠️  Produit ${handle} non trouvé`)
      continue
    }

    const product = products[0]
    totalProducts++

    logger.info(`\n📦 ${handle.toUpperCase()}`)

    const emptyOptions = product.options?.filter((opt: any) =>
      emptyOptionNames.includes(opt.title)
    ) || []

    if (emptyOptions.length === 0) {
      logger.info(`   ✅ Aucune option vide à supprimer`)
      continue
    }

    logger.info(`   Options vides trouvées: ${emptyOptions.length}`)

    for (const option of emptyOptions) {
      try {
        logger.info(`   Suppression option "${(option as any).title}"...`)

        await deleteProductOptionsWorkflow(container).run({
          input: {
            ids: [(option as any).id]
          }
        })

        logger.info(`   ✅ Option "${(option as any).title}" supprimée`)
        totalOptionsRemoved++

      } catch (error: any) {
        logger.error(`   ❌ Erreur suppression "${(option as any).title}": ${error.message}`)
      }
    }
  }

  // ====================================================================
  // RÉSUMÉ NETTOYAGE
  // ====================================================================

  logger.info("\n" + "=".repeat(70))
  logger.info("📊 RÉSUMÉ NETTOYAGE")
  logger.info("=".repeat(70))
  logger.info(`Produits traités:        ${totalProducts}`)
  logger.info(`Options vides supprimées: ${totalOptionsRemoved}`)
  logger.info("=".repeat(70))

  if (totalOptionsRemoved > 0) {
    logger.info(`\n✅ Nettoyage terminé. Les produits sont maintenant prêts pour la création de variantes.`)
    logger.info(`   Relancer: npx medusa exec ./src/scripts/create-missing-variants.ts`)
  }

  logger.info("")

  return { productsProcessed: totalProducts, optionsRemoved: totalOptionsRemoved }
}
