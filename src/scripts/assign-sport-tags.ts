/**
 * Script: Assigner Tags Sport
 *
 * Assigne des tags sport aux produits pour permettre le filtrage multi-sport
 * (solution au fait que Medusa ne supporte qu'une collection par produit)
 */

import { ExecArgs } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"

// Mapping produits → tags sport
const PRODUCT_SPORT_TAGS: Record<string, string[]> = {
  // Shield : Multi-sport performance
  "shield": ["Running", "Cycling", "Trail", "Water Sports"],

  // Music Shield : Multi-sport + Audio
  "music-shield": ["Running", "Cycling", "Water Sports", "Audio"],

  // Aroza : Sports extrêmes
  "aroza": ["Cycling", "Trail", "Ski & Snow"],

  // Falcon : Endurance
  "falcon": ["Running", "Cycling", "Trail"],

  // Prime : Outdoor
  "prime": ["Trail", "Outdoor"],

  // Lifestyle urbain
  "aura": ["Urban", "Lifestyle"],
  "aura-audio": ["Urban", "Lifestyle", "Audio"],
  "zurix": ["Urban", "Lifestyle"],
  "veil": ["Urban", "Lifestyle"],
  "dusk-classic": ["Urban", "Lifestyle"],
  "infinity": ["Urban", "Lifestyle"],
  "mr1-infinity": ["Urban", "Lifestyle"],
  "dragon-chamelo": ["Urban", "Lifestyle"],

  // Classic (pas de tags sport spécifiques)
  "dragon": ["Casual"],
  "duck-classic": ["Casual"],
  "euphoria": ["Fashion"],
}

export default async function assignSportTags({ container }: ExecArgs) {
  const logger = container.resolve("logger")
  const productModuleService = container.resolve(Modules.PRODUCT)

  logger.info("🏷️  ASSIGNATION TAGS SPORT")
  logger.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")

  try {
    const allProducts = await productModuleService.listProducts({})
    let assignedCount = 0

    for (const product of allProducts) {
      const sportTags = PRODUCT_SPORT_TAGS[product.handle]

      if (!sportTags || sportTags.length === 0) {
        logger.warn(`   ⚠️  Aucun tag sport pour: ${product.handle}`)
        continue
      }

      // Créer ou récupérer les tags
      const tagRecords = []
      for (const tagValue of sportTags) {
        try {
          // Chercher si tag existe déjà
          const existingTags = await productModuleService.listProductTags({
            value: tagValue,
          })

          let tag
          if (existingTags.length > 0) {
            tag = existingTags[0]
          } else {
            // Créer le tag
            const created = await productModuleService.createProductTags({
              value: tagValue,
            })
            tag = created
          }

          tagRecords.push(tag)
        } catch (error: any) {
          logger.error(`     ❌ Erreur création tag ${tagValue}: ${error.message}`)
        }
      }

      // Assigner les tags au produit
      try {
        await productModuleService.updateProducts(product.id, {
          tags: tagRecords.map(t => ({ id: t.id })),
        })

        logger.info(`   ✅ ${product.title}`)
        logger.info(`      Tags sport: ${sportTags.join(", ")}`)
        assignedCount++
      } catch (error: any) {
        logger.error(`   ❌ Erreur assignation ${product.handle}: ${error.message}`)
      }
    }

    // ============================================
    // RÉSUMÉ
    // ============================================
    logger.info("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    logger.info("✅ TAGS SPORT ASSIGNÉS")
    logger.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    logger.info(`\n📊 Statistiques:`)
    logger.info(`   • Produits taggés: ${assignedCount}`)

    logger.info("\n🏷️  Tags sport créés:")
    const uniqueTags = new Set<string>()
    Object.values(PRODUCT_SPORT_TAGS).forEach(tags => {
      tags.forEach(tag => uniqueTags.add(tag))
    })
    uniqueTags.forEach(tag => logger.info(`   • ${tag}`))

    logger.info("\n💡 Utilisation frontend:")
    logger.info("   • PLP: Filtrer par tag 'Running' → tous produits running")
    logger.info("   • PDP: Afficher badges sport (ex: 'Idéal pour Running, Cycling')")
    logger.info("   • Search: ?sport=running → Shield, Music Shield, Falcon")

    logger.info("\n🎯 Exemples:")
    logger.info("   • Shield → Running, Cycling, Trail, Water Sports")
    logger.info("   • Music Shield → Running, Cycling, Water Sports, Audio")
    logger.info("   • Aroza → Cycling, Trail, Ski & Snow")

  } catch (error: any) {
    logger.error("\n❌ ERREUR CRITIQUE:")
    logger.error(error)
    throw error
  }
}
