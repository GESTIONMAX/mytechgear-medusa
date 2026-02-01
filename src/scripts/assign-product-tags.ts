import { ExecArgs } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  Modules,
} from "@medusajs/framework/utils"

/**
 * Script d'assignation automatique des tags aux produits
 *
 * Analyse les metadata de chaque produit et assigne automatiquement
 * les tags pertinents basés sur:
 * - Caractéristiques techniques (has_audio, bluetooth, water_resistance)
 * - Type de verres (lens_technology, polarization)
 * - Famille de produit (product_family, brand)
 * - Utilisation (sport, lifestyle, prismatic)
 * - Bestsellers identifiés sur chamelo.com/collections/best-sellers
 *
 * Source bestsellers: https://chamelo.com/collections/best-sellers (analysé le 2026-02-01)
 * Bestsellers: Aura, Aura Audio, Music Shield, Zurix, Infinity
 */

export default async function assignProductTags({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const productModuleService = container.resolve(Modules.PRODUCT)

  logger.info("🏷️  Auto-assigning tags to products based on metadata...")

  try {
    // Récupérer tous les produits
    const products = await productModuleService.listProducts({}, {
      relations: ["tags"]
    })

    logger.info(`\n📦 Found ${products.length} products to process`)

    // Récupérer tous les tags disponibles
    const allTags = await productModuleService.listProductTags()
    const tagMap = new Map(allTags.map(tag => [tag.value, tag.id]))

    logger.info(`🏷️  Available tags: ${allTags.length}`)

    // Liste des bestsellers identifiés (handle du produit)
    const BESTSELLERS = [
      "aura",           // Aura (Black/White variantes)
      "aura-audio",     // Aura Audio (Black/White variantes)
      "music-shield",   // Music Shield
      "zurix",          // Zurix
      "infinity",       // Infinity
    ]

    let totalTagsAssigned = 0
    const productUpdates: Array<{
      product: any
      tagIds: string[]
      tagNames: string[]
    }> = []

    for (const product of products) {
      const tagsToAssign: string[] = []
      const metadata = product.metadata || {}

      logger.info(`\n📦 Processing: ${product.title} (${product.handle})`)

      // ========================================
      // BRAND & COLLECTIONS
      // ========================================
      if (metadata.brand === "Chamelo" || metadata.brand === "Chamelo x MR1") {
        tagsToAssign.push("Chamelo")
      }

      if (metadata.product_family === "shield") {
        tagsToAssign.push("Shield Collection")
      } else if (metadata.product_family === "aura") {
        tagsToAssign.push("Aura Collection")
      } else if (product.handle?.includes("infinity")) {
        tagsToAssign.push("Infinity Collection")
      }

      // ========================================
      // TECHNOLOGY
      // ========================================
      if (metadata.bluetooth === true || metadata.has_audio === true) {
        tagsToAssign.push("Bluetooth")
      }

      const lensTech = typeof metadata.lens_technology === 'string' ? metadata.lens_technology : ''

      if (lensTech.includes("Prismatic")) {
        tagsToAssign.push("Prismatic")
      }

      if (lensTech.includes("Electrochromic") || lensTech.includes("Eclipse")) {
        tagsToAssign.push("Electrochromic")
      }

      if (lensTech.includes("LC") || lensTech.includes("Liquid Crystal")) {
        tagsToAssign.push("Liquid Crystal")
      }

      // ========================================
      // FEATURES
      // ========================================
      if (metadata.has_audio === true) {
        tagsToAssign.push("Audio")
      }

      const controlType = typeof metadata.control_type === 'string' ? metadata.control_type.toLowerCase() : ''

      if (controlType.includes("touch") || controlType.includes("tap")) {
        tagsToAssign.push("Touch Control")
      }

      if (controlType.includes("app")) {
        tagsToAssign.push("App Control")
      }

      if (metadata.autopilot_mode === true ||
          metadata.ambient_light_sensor === true) {
        tagsToAssign.push("Auto Tint")
      }

      if (metadata.ambient_light_sensor === true) {
        tagsToAssign.push("Ambient Sensor")
      }

      if (lensTech.includes("Color-changing")) {
        tagsToAssign.push("Color Changing")
      }

      // ========================================
      // USE CASE (basé sur category_ids ou metadata)
      // ========================================
      // Sport
      if (metadata.product_family === "shield" ||
          product.handle?.includes("shield")) {
        tagsToAssign.push("Sport", "Running", "Cycling", "Outdoor")
      }

      // Lifestyle
      if (metadata.product_family === "lifestyle" ||
          ["zurix", "veil", "dusk", "infinity"].some(name => product.handle?.includes(name))) {
        tagsToAssign.push("Lifestyle", "Fashion", "Daily Wear")
      }

      // Prismatic (usage can be both)
      if (metadata.product_family === "aura") {
        tagsToAssign.push("Lifestyle", "Daily Wear", "Fashion")
      }

      // ========================================
      // SPECS
      // ========================================
      if (metadata.uv_protection === "100%" ||
          metadata.uv_protection === "UV400") {
        tagsToAssign.push("UV Protection")
      }

      if (metadata.polarization === "Full" ||
          metadata.polarization === "Partial") {
        tagsToAssign.push("Polarized")
      }

      if (metadata.water_resistance === "IPX4" ||
          metadata.water_resistance === "IPX-4") {
        tagsToAssign.push("IPX4")
      }

      if (metadata.sweatproof === true) {
        tagsToAssign.push("Sweatproof")
      }

      if (metadata.impact_resistant === true) {
        tagsToAssign.push("Impact Resistant")
      }

      const weightGrams = typeof metadata.weight_grams === 'number' ? metadata.weight_grams : 0

      if (weightGrams > 0 && weightGrams <= 40) {
        tagsToAssign.push("Lightweight")
      }

      // ========================================
      // DESIGN
      // ========================================
      const frameStyle = typeof metadata.frame_style === 'string' ? metadata.frame_style.toLowerCase() : ''

      if (frameStyle.includes("rimless")) {
        tagsToAssign.push("Rimless")
      }

      if (frameStyle.includes("cat-eye")) {
        tagsToAssign.push("Cat-Eye")
      }

      if (frameStyle.includes("wayfarer")) {
        tagsToAssign.push("Wayfarer")
      }

      if (frameStyle.includes("square") || frameStyle.includes("rectangular")) {
        tagsToAssign.push("Square")
      }

      // Unisex par défaut pour tous
      tagsToAssign.push("Unisex")

      // ========================================
      // MARKETING
      // ========================================
      // Bestsellers (basé sur analyse chamelo.com)
      if (BESTSELLERS.includes(product.handle || "")) {
        tagsToAssign.push("Bestseller")
        logger.info(`  🌟 Bestseller identified!`)
      }

      // Premium (prix > 400€)
      if (product.variants && product.variants.length > 0) {
        const firstVariant: any = product.variants[0]
        if (firstVariant.calculated_price?.calculated_amount) {
          const price = firstVariant.calculated_price.calculated_amount
          if (price >= 40000) { // >= 400€
            tagsToAssign.push("Premium")
          }
        }
      }

      // Limited Edition
      if (metadata.limited_edition === true ||
          product.handle?.includes("mr1")) {
        tagsToAssign.push("Limited Edition")
      }

      // Exclusive (tous nos produits pour l'instant)
      tagsToAssign.push("Exclusive")

      // New Arrival (optionnel, à ajuster selon vos besoins)
      // tagsToAssign.push("New Arrival")

      // ========================================
      // Dédupliquer et convertir en IDs
      // ========================================
      const uniqueTags = [...new Set(tagsToAssign)]
      const tagIds = uniqueTags
        .map(tagValue => tagMap.get(tagValue))
        .filter((id): id is string => id !== undefined)

      logger.info(`  📌 Tags to assign (${uniqueTags.length}):`)
      uniqueTags.forEach(tag => {
        const exists = tagMap.has(tag)
        logger.info(`     ${exists ? '✓' : '✗'} ${tag}`)
      })

      if (tagIds.length > 0) {
        productUpdates.push({
          product,
          tagIds,
          tagNames: uniqueTags
        })
        totalTagsAssigned += tagIds.length
      }
    }

    // ========================================
    // APPLIQUER LES MISES À JOUR
    // ========================================
    logger.info("\n" + "=".repeat(60))
    logger.info("📝 Applying tag assignments...")
    logger.info("=".repeat(60))

    for (const { product, tagIds } of productUpdates) {
      try {
        // Note: UpdateProductDTO doesn't officially support tags, but the API accepts it
        await productModuleService.updateProducts(product.id, {
          tags: tagIds.map((id: string) => ({ id }))
        } as any)
        logger.info(`✓ ${product.title} - ${tagIds.length} tags assigned`)
      } catch (error: any) {
        logger.error(`✗ ${product.title} - Error: ${error.message}`)
      }
    }

    // ========================================
    // RÉSUMÉ
    // ========================================
    logger.info("\n" + "=".repeat(60))
    logger.info("✅ TAG ASSIGNMENT COMPLETED!")
    logger.info("=".repeat(60))
    logger.info(`\n📊 Statistics:`)
    logger.info(`   Products processed: ${products.length}`)
    logger.info(`   Products updated: ${productUpdates.length}`)
    logger.info(`   Total tags assigned: ${totalTagsAssigned}`)
    logger.info(`   Average tags per product: ${(totalTagsAssigned / productUpdates.length).toFixed(1)}`)

    logger.info(`\n🌟 Bestsellers marked:`)
    const bestsellerProducts = productUpdates.filter(p =>
      p.tagNames.includes("Bestseller")
    )
    bestsellerProducts.forEach(({ product }) => {
      logger.info(`   ⭐ ${product.title}`)
    })

    logger.info("\n🌐 Admin URL:")
    logger.info("   Products: http://localhost:9000/app/products")
    logger.info("   Tags: http://localhost:9000/app/settings/product-tags")

    logger.info("\n💡 Next Steps:")
    logger.info("   1. Review tag assignments in admin")
    logger.info("   2. Manually adjust tags if needed")
    logger.info("   3. Consider importing missing bestsellers (Aroza, Dragon)")

  } catch (error) {
    logger.error("\n❌ Error assigning tags:")
    logger.error(error)
    throw error
  }
}
