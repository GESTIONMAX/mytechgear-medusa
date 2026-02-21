/**
 * IDs centralisés de la taxonomie (categories + collections)
 *
 * Source de vérité unique pour éviter hardcoding dans chaque script d'import.
 *
 * VERSION: 2.0.0 - Structure par Technologie de Verre
 * Migré le: 2026-02-21
 * Script: src/scripts/migrate-to-tech-taxonomy.ts
 * Documentation: docs/taxonomy/CURRENT_STATE.md
 */

// ============================================
// CATEGORIES (v2.0.0 - Structure par Technologie)
// ============================================
export const CATEGORIES = {
  // Niveau 1: Racine
  ROOT: "pcat_root",  // "Lunettes Connectées"

  // Niveau 2: Classification par technologie de verre
  SMART_TECH: "pcat_smart_tech",  // Produits électroniques (Prismatic™, Eclipse™, HVL™, Electrochromic, LC)
  CLASSIC: "pcat_classic",         // Verres teintés standards (non-électroniques)
} as const

// ============================================
// CATEGORIES ANCIENNES (Pré-Migration v2.0.0 - DEPRECATED)
// ============================================
// Ces IDs ont été SUPPRIMÉS par migrate-to-tech-taxonomy.ts (2026-02-21)
// NE PLUS UTILISER! Conservés ici pour référence historique uniquement.
export const OLD_CATEGORIES = {
  PRISMATIC: "pcat_01KGBS24KFT0VW7DFZZT7R3K2Q",  // ❌ Supprimé (migré → SMART_TECH)
  LIFESTYLE: "pcat_01KGBS24KF2J4JKHEF7MZ2EGVN",  // ❌ Supprimé (migré → SMART_TECH ou CLASSIC)
  SPORT: "pcat_01KGBS24KG6YME924C8WKMV3X0",      // ❌ Supprimé (migré → SMART_TECH)
} as const

// ============================================
// COLLECTIONS (Thématiques + Marketing + Sport)
// ============================================
export const COLLECTIONS = {
  // === Thématiques (3) - Groupes de produits par famille ===
  PRISMATIC: "pcol_01KGBSKFHDDDKWYFQTJQ0HNK34",  // Collection Prismatic (Aura, Aura Audio)
  LIFESTYLE: "pcol_01KGBSKFHEVTNXE9ZG2HBC4QZ8",  // Collection Lifestyle (Zurix, Veil, Dusk, etc.)
  SPORT: "pcol_01KGBSKFHEFEZEE61CW8SESSSE",      // Collection Sport & Performance (Shield, Aroza, etc.)

  // === Marketing (3) - Collections promotionnelles ===
  BESTSELLERS: "pcol_bestsellers",   // Best-sellers
  NOUVEAUTES: "pcol_nouveautes",     // Nouveautés 2026
  SOLDES: "pcol_soldes",             // Soldes & Promotions

  // === Sport (7) - Collections par activité sportive ===
  RUNNING: "pcol_running",           // Running & Course à Pied
  CYCLING: "pcol_cycling",           // Cyclisme & Vélo
  TRAIL_OUTDOOR: "pcol_trail_outdoor",     // Trail & Outdoor
  WATER_SPORTS: "pcol_water_sports",       // Sports Nautiques
  SKI_SNOW: "pcol_ski_snow",               // Ski & Sports de Neige
  URBAN_LIFESTYLE: "pcol_urban_lifestyle", // Urbain & Quotidien
  AUDIO_SUNGLASSES: "pcol_audio_sunglasses", // Lunettes Audio
} as const

// ============================================
// TYPE EXPORTS
// ============================================
export type CategoryId = typeof CATEGORIES[keyof typeof CATEGORIES]
export type OldCategoryId = typeof OLD_CATEGORIES[keyof typeof OLD_CATEGORIES]
export type CollectionId = typeof COLLECTIONS[keyof typeof COLLECTIONS]

// ============================================
// HELPERS
// ============================================

/**
 * Vérifie si un ID de catégorie est ancien (pré-migration)
 */
export function isOldCategoryId(id: string): id is OldCategoryId {
  return Object.values(OLD_CATEGORIES).includes(id as OldCategoryId)
}

/**
 * Retourne le mapping OLD → NEW category IDs (référence historique)
 *
 * Utilisé par la migration v2.0.0 pour ré-assigner les produits.
 * Cette fonction est conservée pour documentation uniquement.
 */
export function getOldToNewCategoryMapping(): Record<OldCategoryId, CategoryId> {
  return {
    [OLD_CATEGORIES.PRISMATIC]: CATEGORIES.SMART_TECH,  // Prismatic™ → Smart Tech
    [OLD_CATEGORIES.LIFESTYLE]: CATEGORIES.CLASSIC,     // Lifestyle (mixte) → Classic ou Smart Tech
    [OLD_CATEGORIES.SPORT]: CATEGORIES.SMART_TECH,      // Sport → Smart Tech (Shield, Aroza)
  }
}

/**
 * Exemple d'usage dans scripts d'import:
 *
 * import { CATEGORIES, COLLECTIONS } from "../../config/taxonomy"
 *
 * // Produit Aura (Prismatic™, lifestyle)
 * const aura = {
 *   title: "Aura",
 *   collection_id: COLLECTIONS.PRISMATIC,
 *   category_ids: [CATEGORIES.SMART_TECH],  // Produit électronique avec Prismatic™
 *   // ...
 * }
 *
 * // Produit Zurix (lifestyle, non-électronique)
 * const zurix = {
 *   title: "Zurix",
 *   collection_id: COLLECTIONS.LIFESTYLE,
 *   category_ids: [CATEGORIES.CLASSIC],  // Verres teintés standards
 *   // ...
 * }
 */
