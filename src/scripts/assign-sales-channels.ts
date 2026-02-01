import { ExecArgs } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  Modules,
} from "@medusajs/framework/utils"

/**
 * Script pour assigner tous les produits au Default Sales Channel
 *
 * Usage: npx medusa exec ./src/scripts/assign-sales-channels.ts
 */

export default async function assignSalesChannels({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const productModuleService = container.resolve(Modules.PRODUCT)
  const salesChannelModuleService = container.resolve(Modules.SALES_CHANNEL)
  const link = container.resolve(ContainerRegistrationKeys.LINK)

  logger.info("🔗 Assigning products to Default Sales Channel...")

  // 1. Récupérer le Default Sales Channel
  const salesChannels = await salesChannelModuleService.listSalesChannels({
    name: "Default Sales Channel",
  })

  if (!salesChannels.length) {
    logger.error("❌ Default Sales Channel not found!")
    logger.info("💡 Creating Default Sales Channel...")

    const newChannel = await salesChannelModuleService.createSalesChannels({
      name: "Default Sales Channel",
      description: "Canal de vente principal (site web B2C)",
    })

    logger.info(`✅ Created Default Sales Channel: ${newChannel.id}`)
    salesChannels.push(newChannel)
  }

  const defaultChannel = salesChannels[0]
  logger.info(`📍 Using Sales Channel: ${defaultChannel.name} (${defaultChannel.id})`)

  // 2. Récupérer tous les produits
  const products = await productModuleService.listProducts()
  logger.info(`📦 Found ${products.length} products`)

  // 3. Assigner chaque produit au canal
  let assigned = 0
  let skipped = 0

  for (const product of products) {
    try {
      // Vérifier si déjà assigné
      const existingLinks = await link.list({
        [Modules.PRODUCT]: {
          product_id: product.id,
        },
        [Modules.SALES_CHANNEL]: {
          sales_channel_id: defaultChannel.id,
        },
      })

      if (existingLinks.length > 0) {
        logger.info(`  ⏭️  ${product.title} - Already assigned`)
        skipped++
        continue
      }

      // Créer le lien produit <-> sales channel
      await link.create({
        [Modules.PRODUCT]: {
          product_id: product.id,
        },
        [Modules.SALES_CHANNEL]: {
          sales_channel_id: defaultChannel.id,
        },
      })

      logger.info(`  ✅ ${product.title} - Assigned`)
      assigned++
    } catch (error) {
      logger.error(`  ❌ ${product.title} - Error: ${error.message}`)
    }
  }

  logger.info("\n✅ Assignment completed!")
  logger.info(`   Products assigned: ${assigned}`)
  logger.info(`   Already assigned: ${skipped}`)
  logger.info(`   Total products: ${products.length}`)
}
