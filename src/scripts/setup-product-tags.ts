import { ExecArgs } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  Modules,
} from "@medusajs/framework/utils"

/**
 * Script de configuration des Product Tags pour MyTechGear
 *
 * Les Product Tags permettent un étiquetage flexible et multi-valeurs.
 * Différence avec Types et Categories:
 * - Types: Une seule valeur (Sport, Lifestyle, Color-Changing)
 * - Categories: Organisation hiérarchique (SPORT > LIFESTYLE > PRISMATIC)
 * - Tags: Multiples valeurs, filtrage, recherche (Bluetooth, Audio, New, etc.)
 *
 * Catégories de tags:
 * 1. Technologie (Bluetooth, Prismatic, Electrochromic, LC)
 * 2. Fonctionnalités (Audio, Touch Control, App Control, Auto Tint)
 * 3. Usage (Sport, Running, Cycling, Lifestyle, Daily Wear)
 * 4. Caractéristiques (UV400, Polarized, IPX4, Sweatproof)
 * 5. Collections (Shield, Aura, Infinity, Chamelo)
 * 6. Marketing (New Arrival, Bestseller, Limited Edition, Premium)
 *
 * Avantages des tags:
 * - Filtrage produits dans le frontend
 * - SEO (mots-clés)
 * - Recherche facettée
 * - Promotions ciblées
 */

export default async function setupProductTags({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const productModuleService = container.resolve(Modules.PRODUCT)

  logger.info("🏷️  Setting up Product Tags for MyTechGear...")

  try {
    // Définition des Product Tags par catégorie
    const productTags = [
      // ========================================
      // TECHNOLOGIE
      // ========================================
      {
        value: "Bluetooth",
        metadata: {
          category: "Technology",
          description: "Connexion Bluetooth pour audio ou app",
          icon: "📶",
        }
      },
      {
        value: "Prismatic",
        metadata: {
          category: "Technology",
          description: "Technologie Prismatic™ de changement de couleur",
          icon: "🌈",
        }
      },
      {
        value: "Electrochromic",
        metadata: {
          category: "Technology",
          description: "Verres électrochromiques à teinte ajustable",
          icon: "🔆",
        }
      },
      {
        value: "Liquid Crystal",
        metadata: {
          category: "Technology",
          description: "Technologie LC (Liquid Crystal) pour teinte",
          icon: "💧",
        }
      },

      // ========================================
      // FONCTIONNALITÉS
      // ========================================
      {
        value: "Audio",
        metadata: {
          category: "Features",
          description: "Haut-parleurs intégrés pour musique et appels",
          icon: "🎵",
        }
      },
      {
        value: "Touch Control",
        metadata: {
          category: "Features",
          description: "Contrôle tactile sur les branches",
          icon: "👆",
        }
      },
      {
        value: "App Control",
        metadata: {
          category: "Features",
          description: "Contrôle via application mobile",
          icon: "📱",
        }
      },
      {
        value: "Auto Tint",
        metadata: {
          category: "Features",
          description: "Ajustement automatique de la teinte (Autopilot)",
          icon: "🤖",
        }
      },
      {
        value: "Ambient Sensor",
        metadata: {
          category: "Features",
          description: "Capteur de luminosité ambiante",
          icon: "☀️",
        }
      },
      {
        value: "Color Changing",
        metadata: {
          category: "Features",
          description: "Changement de couleur instantané",
          icon: "🎨",
        }
      },

      // ========================================
      // USAGE & ACTIVITÉS
      // ========================================
      {
        value: "Sport",
        metadata: {
          category: "Use Case",
          description: "Optimisé pour activités sportives",
          icon: "🏃",
        }
      },
      {
        value: "Running",
        metadata: {
          category: "Use Case",
          description: "Idéal pour la course à pied",
          icon: "🏃‍♂️",
        }
      },
      {
        value: "Cycling",
        metadata: {
          category: "Use Case",
          description: "Parfait pour le vélo",
          icon: "🚴",
        }
      },
      {
        value: "Outdoor",
        metadata: {
          category: "Use Case",
          description: "Activités extérieures",
          icon: "🏔️",
        }
      },
      {
        value: "Lifestyle",
        metadata: {
          category: "Use Case",
          description: "Usage quotidien et urbain",
          icon: "😎",
        }
      },
      {
        value: "Fashion",
        metadata: {
          category: "Use Case",
          description: "Style et tendance",
          icon: "👓",
        }
      },
      {
        value: "Daily Wear",
        metadata: {
          category: "Use Case",
          description: "Port quotidien",
          icon: "📅",
        }
      },

      // ========================================
      // CARACTÉRISTIQUES TECHNIQUES
      // ========================================
      {
        value: "UV Protection",
        metadata: {
          category: "Specs",
          description: "Protection UV 100% ou UV400",
          icon: "🛡️",
        }
      },
      {
        value: "Polarized",
        metadata: {
          category: "Specs",
          description: "Verres polarisés anti-reflets",
          icon: "✨",
        }
      },
      {
        value: "IPX4",
        metadata: {
          category: "Specs",
          description: "Résistance à l'eau IPX4",
          icon: "💧",
        }
      },
      {
        value: "Sweatproof",
        metadata: {
          category: "Specs",
          description: "Résistant à la transpiration",
          icon: "💦",
        }
      },
      {
        value: "Impact Resistant",
        metadata: {
          category: "Specs",
          description: "Verres résistants aux chocs",
          icon: "💪",
        }
      },
      {
        value: "Lightweight",
        metadata: {
          category: "Specs",
          description: "Ultra-léger (< 40g)",
          icon: "🪶",
        }
      },

      // ========================================
      // COLLECTIONS & MARQUES
      // ========================================
      {
        value: "Chamelo",
        metadata: {
          category: "Brand",
          description: "Marque Chamelo",
          icon: "🦎",
        }
      },
      {
        value: "Shield Collection",
        metadata: {
          category: "Collection",
          description: "Collection Shield (Sport)",
          icon: "🛡️",
        }
      },
      {
        value: "Aura Collection",
        metadata: {
          category: "Collection",
          description: "Collection Aura (Prismatic)",
          icon: "✨",
        }
      },
      {
        value: "Infinity Collection",
        metadata: {
          category: "Collection",
          description: "Collection Infinity (Lifestyle)",
          icon: "♾️",
        }
      },

      // ========================================
      // MARKETING & PROMOTIONS
      // ========================================
      {
        value: "New Arrival",
        metadata: {
          category: "Marketing",
          description: "Nouvelle arrivée",
          icon: "🆕",
          highlight: true,
        }
      },
      {
        value: "Bestseller",
        metadata: {
          category: "Marketing",
          description: "Meilleure vente",
          icon: "⭐",
          highlight: true,
        }
      },
      {
        value: "Limited Edition",
        metadata: {
          category: "Marketing",
          description: "Édition limitée",
          icon: "💎",
          highlight: true,
        }
      },
      {
        value: "Premium",
        metadata: {
          category: "Marketing",
          description: "Gamme premium",
          icon: "👑",
        }
      },
      {
        value: "Exclusive",
        metadata: {
          category: "Marketing",
          description: "Exclusivité MyTechGear",
          icon: "🌟",
        }
      },

      // ========================================
      // DESIGN & STYLE
      // ========================================
      {
        value: "Rimless",
        metadata: {
          category: "Design",
          description: "Design sans monture",
          icon: "🔲",
        }
      },
      {
        value: "Cat-Eye",
        metadata: {
          category: "Design",
          description: "Style cat-eye",
          icon: "😺",
        }
      },
      {
        value: "Wayfarer",
        metadata: {
          category: "Design",
          description: "Style wayfarer classique",
          icon: "🕶️",
        }
      },
      {
        value: "Square",
        metadata: {
          category: "Design",
          description: "Monture rectangulaire/carrée",
          icon: "⬜",
        }
      },
      {
        value: "Unisex",
        metadata: {
          category: "Design",
          description: "Design unisexe",
          icon: "👫",
        }
      },
    ]

    logger.info(`\n📋 Creating ${productTags.length} product tags...`)

    const createdTags: string[] = []
    const existingTags: string[] = []
    const errors: Array<{ tag: string; error: string }> = []

    for (const tagData of productTags) {
      try {
        // Vérifier si le tag existe déjà
        const existing = await productModuleService.listProductTags({
          value: tagData.value
        })

        if (existing.length > 0) {
          existingTags.push(tagData.value)
          logger.info(`  ⏭️  ${tagData.value}`)
        } else {
          // Créer le tag
          await productModuleService.createProductTags(tagData)
          createdTags.push(tagData.value)
          logger.info(`  ✓ ${tagData.value} (${tagData.metadata.category})`)
        }
      } catch (error: any) {
        errors.push({ tag: tagData.value, error: error.message })
        logger.warn(`  ⚠️  ${tagData.value} - Error: ${error.message}`)
      }
    }

    // Résumé par catégorie
    logger.info("\n" + "=".repeat(60))
    logger.info("✅ PRODUCT TAGS SETUP COMPLETED!")
    logger.info("=".repeat(60))

    if (createdTags.length > 0) {
      logger.info(`\n✓ Created: ${createdTags.length} tags`)
    }

    if (existingTags.length > 0) {
      logger.info(`\n⏭️  Already existed: ${existingTags.length} tags`)
    }

    if (errors.length > 0) {
      logger.info(`\n⚠️  Errors: ${errors.length}`)
      errors.forEach(({ tag, error }) => logger.info(`  - ${tag}: ${error}`))
    }

    // Guide d'utilisation
    logger.info("\n📝 Tags créés par catégorie:")
    logger.info("\n🔬 Technology:")
    logger.info("   Bluetooth, Prismatic, Electrochromic, Liquid Crystal")

    logger.info("\n⚙️  Features:")
    logger.info("   Audio, Touch Control, App Control, Auto Tint, Ambient Sensor, Color Changing")

    logger.info("\n🏃 Use Case:")
    logger.info("   Sport, Running, Cycling, Outdoor, Lifestyle, Fashion, Daily Wear")

    logger.info("\n🔧 Specs:")
    logger.info("   UV Protection, Polarized, IPX4, Sweatproof, Impact Resistant, Lightweight")

    logger.info("\n🦎 Brand & Collections:")
    logger.info("   Chamelo, Shield Collection, Aura Collection, Infinity Collection")

    logger.info("\n🌟 Marketing:")
    logger.info("   New Arrival, Bestseller, Limited Edition, Premium, Exclusive")

    logger.info("\n👓 Design:")
    logger.info("   Rimless, Cat-Eye, Wayfarer, Square, Unisex")

    logger.info("\n📌 Exemples d'assignation:")
    logger.info("\n   Shield:")
    logger.info("   - Sport, Running, Cycling, Outdoor")
    logger.info("   - Electrochromic, Auto Tint, Ambient Sensor")
    logger.info("   - UV Protection, IPX4, Sweatproof, Impact Resistant")
    logger.info("   - Chamelo, Shield Collection")

    logger.info("\n   Aura Audio:")
    logger.info("   - Lifestyle, Daily Wear, Fashion")
    logger.info("   - Bluetooth, Audio, Prismatic, Color Changing, Touch Control")
    logger.info("   - UV Protection, Lightweight, Rimless")
    logger.info("   - Chamelo, Aura Collection, Premium")

    logger.info("\n   MR1 x Infinity:")
    logger.info("   - Lifestyle, Fashion, Daily Wear")
    logger.info("   - Bluetooth, Audio, Electrochromic, Touch Control, App Control")
    logger.info("   - UV Protection, IPX4")
    logger.info("   - Chamelo, Infinity Collection, Limited Edition, Exclusive")

    logger.info("\n🌐 Admin URL:")
    logger.info("   Product Tags: http://localhost:9000/app/settings/product-tags")

    logger.info("\n💡 Avantages des tags:")
    logger.info("   - Filtrage multi-critères dans le frontend")
    logger.info("   - SEO et recherche optimisés")
    logger.info("   - Promotions ciblées (ex: tous les produits 'Bluetooth')")
    logger.info("   - Collections dynamiques")

    logger.info("\n🔄 Next Step:")
    logger.info("   Assign tags to existing products (multiple tags per product)")

  } catch (error) {
    logger.error("\n❌ Error setting up product tags:")
    logger.error(error)
    throw error
  }
}
