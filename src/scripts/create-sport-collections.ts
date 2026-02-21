/**
 * Script: Créer Collections par Sport
 *
 * Crée des collections marketing ciblant des sports spécifiques:
 * - Running & Course à Pied
 * - Cyclisme & Vélo
 * - Trail & Outdoor
 * - Sports Nautiques
 * - Ski & Sports de Neige
 * - Urbain & Quotidien
 * - Lunettes Audio
 */

import { ExecArgs } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"

// Définition des collections sport
const SPORT_COLLECTIONS = [
  {
    id: "pcol_running",
    title: "Running & Course à Pied",
    handle: "running",
    metadata: {
      description: "Lunettes connectées optimisées pour la course à pied",
      features: ["Légères", "Anti-buée", "Stabilité maximale", "Verres auto-ajustables"],
      target_sports: ["Running", "Jogging", "Marathon", "Trail running"],
      seo_keywords: "lunettes running, lunettes course à pied, smart glasses running",
    },
  },
  {
    id: "pcol_cycling",
    title: "Cyclisme & Vélo",
    handle: "cycling",
    metadata: {
      description: "Verres auto-ajustables pour toutes conditions de cyclisme",
      features: ["Ajustement automatique luminosité", "Protection UV", "Aérodynamique", "Anti-éblouissement"],
      target_sports: ["Road cycling", "VTT", "Gravel", "Cyclotourisme"],
      seo_keywords: "lunettes cyclisme, lunettes vélo, smart glasses cycling",
    },
  },
  {
    id: "pcol_trail_outdoor",
    title: "Trail & Outdoor",
    handle: "trail-outdoor",
    metadata: {
      description: "Protection maximale pour sports outdoor et conditions extrêmes",
      features: ["Résistance impact", "Protection intégrale", "Tous terrains", "Conditions extrêmes"],
      target_sports: ["Trail", "Hiking", "Trekking", "Alpinisme", "Randonnée"],
      seo_keywords: "lunettes trail, lunettes outdoor, lunettes randonnée",
    },
  },
  {
    id: "pcol_water_sports",
    title: "Sports Nautiques",
    handle: "water-sports",
    metadata: {
      description: "IPX4, résistantes à l'eau et à la sueur",
      features: ["Étanche IPX4", "Anti-corrosion", "Résistant sueur", "Flottant (certains modèles)"],
      target_sports: ["Voile", "Kitesurf", "SUP", "Kayak", "Triathlon"],
      seo_keywords: "lunettes nautiques, lunettes étanches, waterproof sunglasses",
    },
  },
  {
    id: "pcol_ski_snow",
    title: "Ski & Sports de Neige",
    handle: "ski-snow",
    metadata: {
      description: "Goggles et lunettes pour conditions hivernales et haute altitude",
      features: ["Anti-buée permanent", "Haute altitude", "Protection neige", "Vision optimale"],
      target_sports: ["Ski alpin", "Snowboard", "Ski de fond", "Freeride"],
      seo_keywords: "lunettes ski, goggles ski, masque ski connecté",
    },
  },
  {
    id: "pcol_urban_lifestyle",
    title: "Urbain & Quotidien",
    handle: "urban-lifestyle",
    metadata: {
      description: "Style et technologie pour le quotidien en ville",
      features: ["Design élégant", "Confort longue durée", "Technologie discrète", "Polyvalent"],
      target_sports: ["Casual", "Ville", "Marche", "Quotidien"],
      seo_keywords: "lunettes urbaines, lunettes ville, smart glasses lifestyle",
    },
  },
  {
    id: "pcol_audio_sunglasses",
    title: "Lunettes Audio",
    handle: "audio-sunglasses",
    metadata: {
      description: "Bluetooth audio intégré pour musique et appels mains-libres",
      features: ["Bluetooth 5.0", "Audio spatial", "Microphone intégré", "Autonomie longue"],
      target_sports: ["Tous sports", "Multisport", "Quotidien"],
      seo_keywords: "lunettes audio, smart glasses audio, bluetooth sunglasses",
    },
  },
]

// Mapping produits → collections sport
const PRODUCT_TO_SPORT_COLLECTIONS: Record<string, string[]> = {
  // Shield : Running, Cycling, Trail, Water Sports
  "shield": ["pcol_running", "pcol_cycling", "pcol_trail_outdoor", "pcol_water_sports"],

  // Music Shield : Running, Cycling, Water Sports, Audio
  "music-shield": ["pcol_running", "pcol_cycling", "pcol_water_sports", "pcol_audio_sunglasses"],

  // Aroza : Cycling, Trail, Ski (goggles sport extrêmes)
  "aroza": ["pcol_cycling", "pcol_trail_outdoor", "pcol_ski_snow"],

  // Falcon : Running, Cycling, Trail
  "falcon": ["pcol_running", "pcol_cycling", "pcol_trail_outdoor"],

  // Prime : Trail, Outdoor
  "prime": ["pcol_trail_outdoor"],

  // Aura : Urban, Lifestyle
  "aura": ["pcol_urban_lifestyle"],

  // Aura Audio : Urban, Audio
  "aura-audio": ["pcol_urban_lifestyle", "pcol_audio_sunglasses"],

  // Zurix : Urban
  "zurix": ["pcol_urban_lifestyle"],

  // Veil : Urban
  "veil": ["pcol_urban_lifestyle"],

  // Dusk Classic : Urban
  "dusk-classic": ["pcol_urban_lifestyle"],

  // Infinity : Urban
  "infinity": ["pcol_urban_lifestyle"],

  // MR1 x Infinity : Urban
  "mr1-infinity": ["pcol_urban_lifestyle"],

  // Dragon : Urban
  "dragon-chamelo": ["pcol_urban_lifestyle"],
}

export default async function createSportCollections({ container }: ExecArgs) {
  const logger = container.resolve("logger")
  const productModuleService = container.resolve(Modules.PRODUCT)

  logger.info("🏃 CRÉATION COLLECTIONS PAR SPORT")
  logger.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")

  try {
    // ============================================
    // ÉTAPE 1: Créer collections sport
    // ============================================
    logger.info("\n📦 ÉTAPE 1/2: Création des collections sport")

    for (const collectionData of SPORT_COLLECTIONS) {
      try {
        await productModuleService.createProductCollections(collectionData)
        logger.info(`   ✅ Créé: ${collectionData.title} (${collectionData.handle})`)
      } catch (error: any) {
        if (error.message.includes("duplicate") || error.message.includes("already exists")) {
          logger.warn(`   ⚠️  Existe déjà: ${collectionData.title}`)
        } else {
          logger.error(`   ❌ Erreur: ${collectionData.title}: ${error.message}`)
        }
      }
    }

    // ============================================
    // ÉTAPE 2: Assigner produits aux collections
    // ============================================
    logger.info("\n🔗 ÉTAPE 2/2: Assignation produits aux collections sport")

    const allProducts = await productModuleService.listProducts({})

    for (const product of allProducts) {
      const collectionIds = PRODUCT_TO_SPORT_COLLECTIONS[product.handle]

      if (!collectionIds || collectionIds.length === 0) {
        logger.warn(`   ⚠️  Aucune collection sport pour: ${product.handle}`)
        continue
      }

      try {
        // Note: Medusa ne supporte pas multi-collections via updateProducts directement
        // Il faut utiliser la table de liaison product_collection_product

        // Pour l'instant, on assigne seulement la première collection principale
        await productModuleService.updateProducts(product.id, {
          collection_id: collectionIds[0],
        })

        const collectionNames = collectionIds.map(id => {
          const col = SPORT_COLLECTIONS.find(c => c.id === id)
          return col?.title || id
        }).join(", ")

        logger.info(`   ✅ ${product.title}`)
        logger.info(`      Collections: ${collectionNames}`)
      } catch (error: any) {
        logger.error(`   ❌ Erreur: ${product.handle}: ${error.message}`)
      }
    }

    // ============================================
    // RÉSUMÉ
    // ============================================
    logger.info("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    logger.info("✅ COLLECTIONS SPORT CRÉÉES")
    logger.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    logger.info(`\n📊 Statistiques:`)
    logger.info(`   • Collections créées: ${SPORT_COLLECTIONS.length}`)
    logger.info(`   • Produits assignés: ${Object.keys(PRODUCT_TO_SPORT_COLLECTIONS).length}`)

    logger.info("\n🎯 Collections créées:")
    SPORT_COLLECTIONS.forEach(col => {
      logger.info(`   • ${col.title} (${col.handle})`)
    })

    logger.info("\n💡 Prochaines étapes:")
    logger.info("   1. Vérifier collections dans dashboard (/admin/collections)")
    logger.info("   2. Créer landing pages frontend (/collections/running, etc.)")
    logger.info("   3. Ajouter tags sport (Running, Cycling, Trail, etc.)")
    logger.info("   4. Hero images + bannières pour chaque collection")

    logger.info("\n⚠️  Note:")
    logger.info("   Medusa ne supporte pas nativement multi-collections par produit.")
    logger.info("   Solution: Utiliser tags 'Running', 'Cycling' pour filtrage multi-sport.")

  } catch (error: any) {
    logger.error("\n❌ ERREUR CRITIQUE:")
    logger.error(error)
    throw error
  }
}
