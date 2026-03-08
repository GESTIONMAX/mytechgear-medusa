/**
 * Product Metadata Type Definitions
 *
 * Standard schema for enriched product metadata in MyTechGear catalog.
 * Based on Music Shield reference model.
 *
 * @version 1.0.0
 * @see music-shield-reference.json
 */

// ─── Product Option Value Metadata ───────────────────────────────────────────

export interface OptionValueMetadata {
  /** Hex color code for color options (e.g., "#1a1a1a") */
  hex?: string

  /** Visual Light Transmittance range for lens options (e.g., "63%-17%") */
  vlt?: string

  /** Short code for SKU generation (e.g., "MB", "FIR", "A") */
  code: string

  /** Human-readable description */
  description?: string

  /** Color family for grouping (e.g., "black", "red", "gray") */
  colorFamily?: string

  /** Battery life impact (for audio/tech options) */
  batteryLife?: string

  /** Weight addition in grams (for modular options) */
  weightAdd?: number

  /** Related features enabled by this option */
  features?: string[]

  /** Price modifier in cents (can be negative) */
  priceModifier?: number

  /** Additional notes or context */
  note?: string
}

// ─── Product Features ────────────────────────────────────────────────────────

export type FeatureCategory =
  | 'optical'
  | 'audio'
  | 'durability'
  | 'comfort'
  | 'connectivity'
  | 'technology'

export interface ProductFeature {
  /** Unique feature identifier (kebab-case) */
  id: string

  /** Display title (e.g., "Eclipse™ Tint-Adjustable") */
  title: string

  /** Detailed description (1-2 sentences) */
  description: string

  /** Icon name from lucide-react (e.g., "sun-dim", "volume-2") */
  icon: string

  /** Feature category for grouping */
  category: FeatureCategory

  /** Display priority (1 = highest) */
  priority: number

  /** Conditional display logic (e.g., "audio=With Audio") */
  conditional: string | null
}

// ─── Product Specifications ──────────────────────────────────────────────────

export type SpecType =
  | 'text'        // Free-form text
  | 'boolean'     // true/false
  | 'duration'    // Time-based (hours, minutes, seconds)
  | 'capacity'    // Energy capacity (mAh, Wh)
  | 'length'      // Distance (mm, cm, m)
  | 'weight'      // Mass (g, kg)
  | 'percentage'  // 0-100%
  | 'range'       // Range of values (e.g., "63%-17%")
  | 'rating'      // Standard rating (IPX4, IP67, etc.)

export interface SpecItem {
  /** Spec name (e.g., "Tint-adjustment", "Protection UV") */
  name: string

  /** Value (can be string, number, or boolean) */
  value: string | number | boolean

  /** Unit of measurement (e.g., "h", "mm", "%") */
  unit: string | null

  /** Type of specification */
  type: SpecType

  /** Conditional display logic */
  conditional?: string | null

  /** Additional note or context */
  note?: string
}

export interface SpecCategory {
  /** Display label for category */
  label: string

  /** Display priority (1 = highest) */
  priority: number

  /** List of spec items in this category */
  items: SpecItem[]
}

export type ProductSpecs = Record<string, SpecCategory>

// ─── Sizing Information ──────────────────────────────────────────────────────

export interface SizingInfo {
  /** Target gender (Unisex, Men, Women) */
  gender: 'Unisex' | 'Men' | 'Women'

  /** Head size fit (Small, Medium, Large, etc.) */
  headSize: string

  /** Compatible face shapes */
  faceShapes: string[]

  /** Additional fit notes */
  fitNotes?: string
}

// ─── Warranty Information ────────────────────────────────────────────────────

export interface WarrantyInfo {
  /** Money-back guarantee period */
  moneyBack: number

  /** Manufacturer warranty period */
  manufacturer: number

  /** Unit (days, months, years) */
  unit: 'days' | 'months' | 'years'
}

// ─── Technology Information ──────────────────────────────────────────────────

export interface TechnologyInfo {
  /** Technology name */
  name: string

  /** Technology description */
  description: string

  /** Patent information */
  patent?: string
}

// ─── Product Family & Platform ───────────────────────────────────────────────

export interface ProductRelated {
  /** Handle of product WITH audio (if this product doesn't have audio) */
  withAudio?: string

  /** Handle of product WITHOUT audio (if this product has audio) */
  withoutAudio?: string

  /** Variant type within family */
  variant: 'audio' | 'no-audio'
}

export interface ProductPlatform {
  /** Platform uses Eclipse™ technology */
  eclipse: boolean

  /** Platform category */
  category: string

  /** IDs of features shared across platform products */
  sharedFeatures: string[]
}

// ─── Complete Product Metadata ───────────────────────────────────────────────

export interface ProductMetadata {
  /** Brand name */
  brand?: string

  /** Original source URL (for dropshipping) */
  sourceUrl?: string

  /** Collection identifier */
  collection?: string

  /** Category identifier */
  category?: string

  /** Product family identifier (e.g., "shield-platform") */
  family?: string

  /** Whether this product has audio capabilities */
  hasAudio?: boolean

  /** Related products in same family (for audio toggle) */
  related?: ProductRelated

  /** Platform information for shared specs/features */
  platform?: ProductPlatform

  /** Product features list */
  features: ProductFeature[]

  /** Technical specifications grouped by category */
  specs: ProductSpecs

  /** Sizing and fit information */
  sizing?: SizingInfo

  /** Included accessories */
  includes?: string[]

  /** Warranty information */
  warranty?: WarrantyInfo

  /** Technology information */
  technology?: Record<string, TechnologyInfo>

  /** Additional custom metadata */
  [key: string]: any
}

// ─── Variant Metadata ────────────────────────────────────────────────────────

export interface VariantMetadata {
  /** Actual weight for this specific variant (may differ from base) */
  actualWeight?: number

  /** Battery life for this variant configuration */
  batteryLife?: string

  /** Variant code for SKU generation */
  variantCode?: string

  /** Variant-specific images */
  images?: string[]

  /** Reference to alternate model name */
  alternateModel?: string

  /** Additional custom metadata */
  [key: string]: any
}

// ─── Helper Types ────────────────────────────────────────────────────────────

/**
 * Extract conditional display logic from string
 * @example parseConditional("audio=With Audio") => { option: "audio", value: "With Audio" }
 */
export function parseConditional(conditional: string | null): {
  option: string
  value: string
} | null {
  if (!conditional || !conditional.includes('=')) return null

  const [option, value] = conditional.split('=')
  return { option: option.trim(), value: value.trim() }
}

/**
 * Check if feature/spec should be displayed based on variant options
 */
export function shouldDisplay(
  conditional: string | null,
  variantOptions: Record<string, string>
): boolean {
  if (!conditional) return true

  const parsed = parseConditional(conditional)
  if (!parsed) return true

  return variantOptions[parsed.option] === parsed.value
}

/**
 * Get metadata from option value
 */
export function getOptionMetadata(
  productOptions: Array<{ title: string; values: Array<{ value: string; metadata?: OptionValueMetadata }> }>,
  optionTitle: string,
  optionValue: string
): OptionValueMetadata | undefined {
  const option = productOptions.find(opt => opt.title === optionTitle)
  if (!option) return undefined

  const value = option.values.find(val => val.value === optionValue)
  return value?.metadata
}

/**
 * Get related product handle for audio toggle
 */
export function getRelatedProductHandle(
  product: { metadata: ProductMetadata },
  toggleAudio: 'add' | 'remove'
): string | null {
  if (!product.metadata.related) return null

  if (toggleAudio === 'add') {
    return product.metadata.related.withAudio || null
  } else {
    return product.metadata.related.withoutAudio || null
  }
}

/**
 * Check if product is part of a platform family
 */
export function isInPlatformFamily(
  product: { metadata: ProductMetadata },
  family: string
): boolean {
  return product.metadata.family === family
}

/**
 * Get shared features from platform
 */
export function getPlatformSharedFeatures(
  product: { metadata: ProductMetadata }
): ProductFeature[] {
  if (!product.metadata.platform?.sharedFeatures) return []

  return product.metadata.features.filter(feature =>
    product.metadata.platform!.sharedFeatures.includes(feature.id)
  )
}

/**
 * Get product-specific features (not shared)
 */
export function getProductSpecificFeatures(
  product: { metadata: ProductMetadata }
): ProductFeature[] {
  if (!product.metadata.platform?.sharedFeatures) return product.metadata.features

  return product.metadata.features.filter(feature =>
    !product.metadata.platform!.sharedFeatures.includes(feature.id)
  )
}

// ─── Export All ──────────────────────────────────────────────────────────────

export type {
  OptionValueMetadata,
  ProductFeature,
  FeatureCategory,
  SpecItem,
  SpecCategory,
  SpecType,
  ProductSpecs,
  SizingInfo,
  WarrantyInfo,
  TechnologyInfo,
  ProductMetadata,
  VariantMetadata,
}
