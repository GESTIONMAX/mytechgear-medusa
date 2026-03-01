/**
 * Pricing Module Type Definitions
 *
 * Complete type system for pricing operations in MyTechGear Medusa backend.
 * Supports multi-currency pricing, tiered pricing, and context-aware calculations.
 */

export interface Price {
  id: string
  price_set_id: string
  currency_code: string  // 'eur', 'usd', 'gbp', 'chf'
  amount: number  // In smallest unit (cents)
  min_quantity?: number
  max_quantity?: number
  created_at?: string
  updated_at?: string
}

export interface PriceSet {
  id: string
  prices: Price[]
  created_at?: string
  updated_at?: string
}

export interface VariantWithPrice {
  id: string
  title: string
  sku?: string
  product_id: string
  product_title?: string
  prices: Price[]
  price_set_id?: string
}

export interface PriceCreateInput {
  currency_code: string
  amount: number
  min_quantity?: number
  max_quantity?: number
}

export interface PriceUpdateInput {
  amount?: number
  min_quantity?: number
  max_quantity?: number
}

export interface BulkPriceUpdateInput {
  variant_id: string
  prices: PriceCreateInput[]
}

export interface PriceCalculationContext {
  variant_id: string
  region_id?: string
  currency_code: string
  customer_group_id?: string
  quantity?: number
}

export interface CalculatedPrice {
  variant_id: string
  currency_code: string
  amount: number  // In smallest unit
  formatted_amount: string  // e.g., "29.99 €"
  original_amount?: number  // If discounted
  min_quantity?: number
  max_quantity?: number
}

export interface PriceValidationError {
  field: string
  message: string
}

/**
 * Pricing constraints and defaults
 */
export const PRICING_CONSTRAINTS = {
  MIN_PRICE: 0,
  MAX_PRICE: 1000000000,  // 10 million euros in cents
  SUPPORTED_CURRENCIES: ['eur', 'usd', 'gbp', 'chf'] as const,
  DEFAULT_CURRENCY: 'eur' as const,
  CURRENCY_DECIMALS: {
    eur: 2,
    usd: 2,
    gbp: 2,
    chf: 2,
  } as const,
  CURRENCY_SYMBOLS: {
    eur: '€',
    usd: '$',
    gbp: '£',
    chf: 'CHF',
  } as const,
} as const

export type SupportedCurrency = typeof PRICING_CONSTRAINTS.SUPPORTED_CURRENCIES[number]

/**
 * API Response types
 */
export interface PriceListResponse {
  variants: VariantWithPrice[]
  count: number
  offset: number
  limit: number
}

export interface BulkUpdateResponse {
  created: number
  updated: number
  errors: Array<{
    variant_id: string
    error: string
  }>
}

export interface PriceDeleteResponse {
  deleted: boolean
  variant_id: string
  count: number
}

/**
 * Phase 2: Regional Pricing & Audit Trail
 */

export interface RegionalPrice extends Price {
  region_id: string
  region_name?: string
  is_override: boolean  // true if overrides default price
}

export interface PriceHistory {
  id: string
  variant_id: string
  currency_code: string
  old_amount: number | null
  new_amount: number
  region_id?: string
  changed_by?: string  // Admin user ID
  changed_at: string
  reason?: string
}

export interface PriceAuditTrail {
  variant_id: string
  variant_title?: string
  history: PriceHistory[]
  total_changes: number
}

/**
 * CSV Import/Export
 */

export interface PriceImportRow {
  variant_id?: string
  sku?: string  // Alternative to variant_id
  currency_code: string
  amount: number
  region_id?: string
  min_quantity?: number
  max_quantity?: number
}

export interface PriceExportRow extends PriceImportRow {
  variant_id: string
  variant_title: string
  product_title: string
  current_amount?: number
}

export interface ImportResult {
  total_rows: number
  successful: number
  failed: number
  errors: Array<{
    row: number
    variant_id?: string
    sku?: string
    error: string
  }>
}
