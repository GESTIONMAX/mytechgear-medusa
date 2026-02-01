import { ExecArgs } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  Modules,
} from "@medusajs/framework/utils"

/**
 * Script de configuration des Product Types pour MyTechGear
 *
 * Les Product Types permettent de catégoriser les produits par type/genre.
 * Différence avec les Categories:
 * - Categories: Organisation hiérarchique (SPORT > LIFESTYLE > PRISMATIC)
 * - Types: Classification fonctionnelle (ce que c'est)
 *
 * Product Types pour MyTechGear:
 * 1. Smart Glasses (Lunettes Connectées) - Toutes les lunettes avec électronique
 * 2. Sport Performance - Lunettes optimisées pour le sport
 * 3. Lifestyle Fashion - Lunettes pour usage quotidien
 * 4. Audio Glasses - Lunettes avec Bluetooth audio intégré
 * 5. Color-Changing - Technologie Prismatic™ de changement de couleur
 *
 * Note: Un produit ne peut avoir qu'UN SEUL type dans Medusa
 */

export default async function setupProductTypes({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const productModuleService = container.resolve(Modules.PRODUCT)

  logger.info("🏷️  Setting up Product Types for MyTechGear...")

  try {
    // Définition des Product Types
    const productTypes = [
      {
        value: "Smart Glasses",
        metadata: {
          value_fr: "Lunettes Connectées",
          description: "Lunettes équipées de technologie électronique et connectée",
          icon: "🕶️",
          display_order: 1,
        }
      },
      {
        value: "Sport Performance",
        metadata: {
          value_fr: "Lunettes Sport",
          description: "Lunettes optimisées pour les activités sportives et outdoor",
          use_cases: "Running, cycling, hiking, water sports",
          icon: "🏃",
          display_order: 2,
        }
      },
      {
        value: "Lifestyle Fashion",
        metadata: {
          value_fr: "Lunettes Lifestyle",
          description: "Lunettes tendance pour usage quotidien et urbain",
          use_cases: "Daily wear, urban fashion, casual",
          icon: "😎",
          display_order: 3,
        }
      },
      {
        value: "Audio Glasses",
        metadata: {
          value_fr: "Lunettes Audio",
          description: "Lunettes avec haut-parleurs Bluetooth intégrés",
          features: "Music playback, phone calls, open-ear audio",
          icon: "🎵",
          display_order: 4,
        }
      },
      {
        value: "Color-Changing",
        metadata: {
          value_fr: "Technologie Prismatic",
          description: "Lunettes à changement de couleur instantané (Prismatic™)",
          technology: "Prismatic™ Color-changing technology",
          icon: "🌈",
          display_order: 5,
        }
      },
      {
        value: "Tint-Adjustable",
        metadata: {
          value_fr: "Teinte Ajustable",
          description: "Lunettes à teinte électronique ajustable",
          technology: "Electrochromic / LC (Liquid Crystal) tint control",
          icon: "🔆",
          display_order: 6,
        }
      }
    ]

    logger.info(`\n📋 Creating ${productTypes.length} product types...`)

    const createdTypes = []
    const existingTypes = []
    const errors = []

    for (const typeData of productTypes) {
      try {
        // Vérifier si le type existe déjà
        const existing = await productModuleService.listProductTypes({
          value: typeData.value
        })

        if (existing.length > 0) {
          existingTypes.push(typeData.value)
          logger.info(`  ⏭️  ${typeData.value} - Already exists`)
        } else {
          // Créer le type
          const createdType = await productModuleService.createProductTypes(typeData)
          createdTypes.push(typeData.value)
          logger.info(`  ✓ ${typeData.value} - Created (${typeData.metadata.value_fr})`)
        }
      } catch (error: any) {
        errors.push({ type: typeData.value, error: error.message })
        logger.warn(`  ⚠️  ${typeData.value} - Error: ${error.message}`)
      }
    }

    // Résumé
    logger.info("\n" + "=".repeat(60))
    logger.info("✅ PRODUCT TYPES SETUP COMPLETED!")
    logger.info("=".repeat(60))

    if (createdTypes.length > 0) {
      logger.info(`\n✓ Created: ${createdTypes.length} types`)
      createdTypes.forEach(type => logger.info(`  - ${type}`))
    }

    if (existingTypes.length > 0) {
      logger.info(`\n⏭️  Already existed: ${existingTypes.length} types`)
      existingTypes.forEach(type => logger.info(`  - ${type}`))
    }

    if (errors.length > 0) {
      logger.info(`\n⚠️  Errors: ${errors.length}`)
      errors.forEach(({ type, error }) => logger.info(`  - ${type}: ${error}`))
    }

    logger.info("\n📝 Product Type Assignments (guide):")
    logger.info("\n🏃 Sport Performance:")
    logger.info("   - Shield (Chamelo)")
    logger.info("   - Music Shield (Chamelo)")

    logger.info("\n😎 Lifestyle Fashion:")
    logger.info("   - Zurix (Chamelo)")
    logger.info("   - Veil (Chamelo)")
    logger.info("   - Dusk Classic (Chamelo)")
    logger.info("   - Infinity (Chamelo)")
    logger.info("   - MR1 x Infinity (Chamelo)")

    logger.info("\n🌈 Color-Changing:")
    logger.info("   - Aura (Chamelo Prismatic)")
    logger.info("   - Aura Audio (Chamelo Prismatic)")

    logger.info("\n🎵 Audio Glasses (secondary type, for reference):")
    logger.info("   - Music Shield")
    logger.info("   - Aura Audio")
    logger.info("   - Dusk Classic")
    logger.info("   - Infinity")
    logger.info("   - MR1 x Infinity")

    logger.info("\n📌 Note:")
    logger.info("   Dans Medusa, un produit ne peut avoir qu'UN SEUL type.")
    logger.info("   Utilisez le type PRINCIPAL du produit (Sport, Lifestyle, ou Color-Changing).")
    logger.info("   Les autres caractéristiques (audio, teinte) sont dans les metadata.")

    logger.info("\n🌐 Admin URL:")
    logger.info("   Product Types: http://localhost:9000/app/settings/product-types")

    logger.info("\n🔄 Next Step:")
    logger.info("   Assign types to existing products via admin or script")

  } catch (error) {
    logger.error("\n❌ Error setting up product types:")
    logger.error(error)
    throw error
  }
}
