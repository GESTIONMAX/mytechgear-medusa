/**
 * Taxes Type Definitions
 */

export interface TaxRate {
  id: string
  rate: number  // Percentage (e.g., 20 for 20%)
  name: string
  code?: string
  region_id?: string
  metadata?: Record<string, any>
  created_at?: string
  updated_at?: string
}

export interface TaxProvider {
  id: string
  is_installed: boolean
}

export interface CreateTaxRateInput {
  rate: number
  name: string
  code?: string
  region_id?: string
  metadata?: Record<string, any>
}

export interface UpdateTaxRateInput {
  rate?: number
  name?: string
  code?: string
  metadata?: Record<string, any>
}

export const DEFAULT_TAX_RATES = [
  { name: 'TVA France', code: 'FR-VAT', rate: 20, region_name: 'Europe' },
  { name: 'TVA Réduite France', code: 'FR-VAT-R', rate: 5.5, region_name: 'Europe' },
  { name: 'UK VAT', code: 'GB-VAT', rate: 20, region_name: 'United Kingdom' },
  { name: 'US Sales Tax', code: 'US-SALES', rate: 0, region_name: 'United States' },  // Varies by state
] as const

export const TAX_RATE_CONSTRAINTS = {
  MIN_RATE: 0,
  MAX_RATE: 100,
} as const
