import { ExecArgs } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  Modules,
} from "@medusajs/framework/utils"
import { updateProductOptionsWorkflow } from "@medusajs/medusa/core-flows"

/**
 * Ajout de la valeur "Clear" à l'option "Verres"
 * pour les produits Zurix, Veil et Infinity
 */

export default async function addClearLensOptionValue({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const productService = container.resolve(Modules.PRODUCT)

  logger.info("➕ AJOUT VALEUR 'CLEAR' À L'OPTION VERRES")
  logger.info("=" .repeat(70))

  const productsToUpdate = ["zurix", "veil", "infinity"]

  for (const handle of productsToUpdate) {
    logger.info(`\n📦 Produit: ${handle.toUpperCase()}`)

    const products = await productService.listProducts(
      { handle: [handle] },
      { relations: ['options'] }
    )

    if (products.length === 0) {
      logger.warn(`   ⚠️  Produit non trouvé`)
      continue
    }

    const product = products[0]

    // Trouver l'option "Verres"
    const verresOption = product.options?.find((opt: any) => opt.title === "Verres")

    if (!verresOption) {
      logger.error(`   ❌ Option "Verres" non trouvée`)
      continue
    }

    const optionData = verresOption as any

    logger.info(`   Option "Verres" trouvée: ${optionData.id}`)
    logger.info(`   Valeurs actuelles: ${optionData.values || 'EMPTY'}`)

    // Vérifier les valeurs via le service
    const fullProduct = await productService.retrieveProduct(product.id, {
      relations: ['options.values']
    })

    const fullVerresOption = fullProduct.options?.find((opt: any) => opt.title === "Verres") as any

    if (!fullVerresOption) {
      logger.error(`   ❌ Option "Verres" non trouvée avec relations`)
      continue
    }

    const currentValues = fullVerresOption.values || []
    const hasClear = currentValues.some((v: any) => v.value === "Clear")

    if (hasClear) {
      logger.info(`   ✅ Valeur "Clear" existe déjà`)
      continue
    }

    try {
      logger.info(`   Ajout de la valeur "Clear"...`)

      await updateProductOptionsWorkflow(container).run({
        input: {
          selector: { id: fullVerresOption.id },
          update: {
            values: [
              ...currentValues.map((v: any) => ({ id: v.id, value: v.value })),
              { value: "Clear" }
            ]
          }
        }
      })

      logger.info(`   ✅ Valeur "Clear" ajoutée avec succès`)

    } catch (error: any) {
      logger.error(`   ❌ Erreur: ${error.message}`)
    }
  }

  logger.info("\n" + "=".repeat(70))
  logger.info("✅ Terminé. Relancer la création des variantes manquantes.")
  logger.info("=" .repeat(70))
  logger.info("")
}
