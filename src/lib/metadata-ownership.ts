/**
 * Metadata Ownership Library
 *
 * Defines clear field ownership between:
 * - PIM (Product Information Management) - Technical specifications
 * - OPS (Operations Backend) - Marketing & UI enrichment
 *
 * @see FIELD_OWNERSHIP.md for complete documentation
 */

/**
 * Fields that OPS owns and PIM must NEVER overwrite
 *
 * These fields are managed by the marketing team via the OPS endpoint
 * and should be preserved during PIM re-imports.
 */
export const OPS_PROTECTED_FIELDS = [
  // UI Enrichment
  'features',
  'specs',

  // Social Proof & Marketing
  'rating',
  'badges',
  'usps',

  // Product Content
  'inTheBox',
  'warranty',        // Object form (not warranty_years)
  'related',         // ProductRelated object
  'faq',
  'pdp',

  // SEO & Media (after migration)
  'seo_description',
  'seo_keywords',    // OPS owns after migration
  'lensTechnology',  // Formatted display name
  'videoUrl',
  'sizeGuideUrl',

  // UI-Specific
  'fallback_emoji',
  'badge',           // Legacy singular badge
  'badge_color',
  'badge_position'
] as const

/**
 * Fields that PIM owns and OPS should avoid modifying
 *
 * These are technical specifications from manufacturer data.
 * Includes both exact field names and patterns.
 */
export const PIM_TECHNICAL_FIELDS = [
  // Core Identity
  'brand',
  'product_family',
  'has_audio',
  'bluetooth',
  'related_product_audio',
  'related_product_no_audio',

  // Physical Specs (exact matches)
  'weight_grams',
  'frame_material',
  'frame_style',
  'frame_integration',
  'design_style',
  'unisex',

  // Optical/Lens
  'lens_technology',
  'light_transmission_range',
  'tint_adjustment_speed_seconds',
  'tint_levels',
  'color_change_speed_seconds',
  'color_count',
  'calm_colors',
  'energy_colors',
  'uv_protection',
  'polarization',

  // Electronics & Battery
  'battery_mah',
  'control_type',
  'autopilot_mode',
  'ambient_light_sensor',
  'manual_tint_control',
  'enhanced_grip',
  'audio_type',
  'audio_bluetooth_version',

  // Durability & Compliance
  'water_resistance',
  'sweatproof',
  'impact_resistant',
  'warranty_years',    // Simple number
  'ce_certified',
  'weee_compliant',

  // Categorization
  'use_case',
  'color_options',
  'bestseller',
  'bestseller_rank',
  'limited_edition'
] as const

/**
 * Field name patterns for PIM-owned fields
 *
 * These patterns match multiple fields using wildcards.
 * Order matters: more specific patterns should come first.
 */
export const PIM_FIELD_PATTERNS = [
  /^frame_.*_mm$/,        // frame_height_mm, bridge_width_mm, arm_length_mm, temple_width_mm
  /^battery_.*_hours$/,   // battery_tint_hours, battery_audio_hours, battery_color_hours
  /^charge_.*_minutes$/,  // charge_time_minutes, charge_80_percent_minutes
  /^pim\./                // All pim.* namespace fields
] as const

/**
 * Type guard for OPS-protected fields
 */
export type OpsProtectedField = typeof OPS_PROTECTED_FIELDS[number]

/**
 * Type guard for PIM technical fields
 */
export type PimTechnicalField = typeof PIM_TECHNICAL_FIELDS[number]

/**
 * Validation result for ownership checks
 */
export interface OwnershipValidationResult {
  valid: boolean
  conflicts: string[]
  warnings: string[]
}

/**
 * Check if a field key is owned by PIM
 *
 * @param key - Metadata field key to check
 * @returns true if field is PIM-owned (exact match or pattern match)
 *
 * @example
 * isPimOwnedField('weight_grams') // true
 * isPimOwnedField('frame_height_mm') // true (matches pattern)
 * isPimOwnedField('features') // false (OPS-owned)
 */
export function isPimOwnedField(key: string): boolean {
  // Check exact matches
  if ((PIM_TECHNICAL_FIELDS as readonly string[]).includes(key)) {
    return true
  }

  // Check pattern matches
  return PIM_FIELD_PATTERNS.some(pattern => pattern.test(key))
}

/**
 * Check if a field key is protected by OPS
 *
 * @param key - Metadata field key to check
 * @returns true if field is OPS-protected
 *
 * @example
 * isOpsProtectedField('features') // true
 * isOpsProtectedField('rating') // true
 * isOpsProtectedField('weight_grams') // false (PIM-owned)
 */
export function isOpsProtectedField(key: string): boolean {
  return (OPS_PROTECTED_FIELDS as readonly string[]).includes(key)
}

/**
 * Preserve OPS-owned fields when merging PIM data
 *
 * This function implements the safe merge pattern:
 * 1. Extract OPS-protected fields from existing metadata
 * 2. Merge with new PIM data, giving priority to OPS fields
 * 3. Add PIM tracking metadata
 *
 * @param existingMetadata - Current product metadata (may contain OPS fields)
 * @param newPimMetadata - New PIM data to merge
 * @param importSource - Source identifier for PIM import
 * @returns Safely merged metadata with OPS fields preserved
 *
 * @example
 * const existing = { features: [...], weight_grams: 49 }
 * const newPim = { weight_grams: 50, battery_mah: 180 }
 * const merged = preserveOpsFields(existing, newPim, 'chamelo-shopify')
 * // Result: { features: [...], weight_grams: 50, battery_mah: 180, pim: {...} }
 */
export function preserveOpsFields(
  existingMetadata: Record<string, any>,
  newPimMetadata: Record<string, any>,
  importSource: string
): Record<string, any> {
  // Extract OPS-protected fields from existing metadata
  const opsProtected: Record<string, any> = {}

  OPS_PROTECTED_FIELDS.forEach(field => {
    if (existingMetadata[field] !== undefined) {
      opsProtected[field] = existingMetadata[field]
    }
  })

  // Preserve existing pim.* tracking data
  const existingPimData = existingMetadata.pim || {}

  // Merge: PIM data + preserved OPS data
  const mergedMetadata = {
    ...newPimMetadata,      // New PIM technical data
    ...opsProtected,        // Preserved OPS enrichment (takes priority)
    pim: {
      ...existingPimData,   // Preserve existing PIM tracking
      last_import: new Date().toISOString(),
      import_source: importSource
    }
  }

  return mergedMetadata
}

/**
 * Detect OPS conflicts when writing metadata via OPS endpoint
 *
 * This function checks if an OPS write attempt includes PIM-owned fields,
 * which should be avoided to maintain clear ownership boundaries.
 *
 * @param metadata - Metadata payload from OPS endpoint
 * @returns Validation result with conflicts and warnings
 *
 * @example
 * const result = detectOpsConflicts({ features: [...], weight_grams: 49 })
 * // Result: { valid: false, conflicts: ['weight_grams'], warnings: [...] }
 */
export function detectOpsConflicts(
  metadata: Record<string, any>
): OwnershipValidationResult {
  const conflicts: string[] = []
  const warnings: string[] = []

  for (const key of Object.keys(metadata)) {
    if (isPimOwnedField(key)) {
      conflicts.push(key)
    }
  }

  // Add warnings for specific fields
  if (metadata.seo_keywords && typeof metadata.seo_keywords === 'string') {
    warnings.push(
      'seo_keywords is being migrated to OPS ownership - this write is allowed but PIM should stop writing this field'
    )
  }

  if (metadata.warranty && typeof metadata.warranty === 'object') {
    warnings.push(
      'warranty object is OPS-owned, but PIM may write warranty_years (simple number) - ensure no conflict'
    )
  }

  return {
    valid: conflicts.length === 0,
    conflicts,
    warnings
  }
}

/**
 * Get list of OPS-protected fields found in metadata
 *
 * Useful for logging and reporting which OPS fields will be preserved.
 *
 * @param metadata - Metadata object to scan
 * @returns Array of OPS-protected field names found
 *
 * @example
 * const metadata = { features: [...], rating: {...}, weight_grams: 49 }
 * const opsFields = getOpsProtectedFieldsInMetadata(metadata)
 * // Result: ['features', 'rating']
 */
export function getOpsProtectedFieldsInMetadata(
  metadata: Record<string, any>
): string[] {
  const found: string[] = []

  OPS_PROTECTED_FIELDS.forEach(field => {
    if (metadata[field] !== undefined) {
      found.push(field)
    }
  })

  return found
}

/**
 * Get detailed ownership summary for metadata object
 *
 * Analyzes a metadata object and categorizes fields by ownership.
 * Useful for debugging and reporting.
 *
 * @param metadata - Metadata object to analyze
 * @returns Summary of field ownership
 *
 * @example
 * const summary = getOwnershipSummary(product.metadata)
 * console.log(`PIM fields: ${summary.pimFields.length}`)
 * console.log(`OPS fields: ${summary.opsFields.length}`)
 */
export function getOwnershipSummary(metadata: Record<string, any>): {
  pimFields: string[]
  opsFields: string[]
  unknownFields: string[]
  totalFields: number
} {
  const pimFields: string[] = []
  const opsFields: string[] = []
  const unknownFields: string[] = []

  for (const key of Object.keys(metadata)) {
    if (isPimOwnedField(key)) {
      pimFields.push(key)
    } else if (isOpsProtectedField(key)) {
      opsFields.push(key)
    } else {
      unknownFields.push(key)
    }
  }

  return {
    pimFields,
    opsFields,
    unknownFields,
    totalFields: Object.keys(metadata).length
  }
}

/**
 * Validate that a PIM import won't overwrite OPS fields
 *
 * Use this before executing a PIM import to ensure safety.
 *
 * @param existingMetadata - Current product metadata
 * @param newPimMetadata - New PIM data to import
 * @returns Validation result
 *
 * @example
 * const result = validatePimImport(product.metadata, newPimData)
 * if (!result.valid) {
 *   console.error('PIM import would overwrite OPS fields:', result.conflicts)
 * }
 */
export function validatePimImport(
  existingMetadata: Record<string, any>,
  newPimMetadata: Record<string, any>
): OwnershipValidationResult {
  const conflicts: string[] = []
  const warnings: string[] = []

  // Check if new PIM data contains any OPS-protected fields
  for (const key of Object.keys(newPimMetadata)) {
    if (isOpsProtectedField(key)) {
      conflicts.push(key)
    }
  }

  // Check if existing OPS fields would be lost
  const existingOpsFields = getOpsProtectedFieldsInMetadata(existingMetadata)
  if (existingOpsFields.length > 0) {
    warnings.push(
      `Product has ${existingOpsFields.length} OPS-enriched fields that must be preserved: ${existingOpsFields.join(', ')}`
    )
  }

  return {
    valid: conflicts.length === 0,
    conflicts,
    warnings
  }
}

/**
 * Export all ownership rules for external use
 *
 * Useful for generating documentation or API responses.
 */
export const OWNERSHIP_RULES = {
  ops: {
    protected: OPS_PROTECTED_FIELDS,
    description: 'Fields owned by OPS backend - PIM must not overwrite'
  },
  pim: {
    technical: PIM_TECHNICAL_FIELDS,
    patterns: PIM_FIELD_PATTERNS.map(p => p.source),
    description: 'Fields owned by PIM - OPS should avoid modifying'
  }
} as const
