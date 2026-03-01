/**
 * Regions & Shipping Type Definitions
 */

export interface Region {
  id: string
  name: string
  currency_code: string
  tax_rate: number  // Percentage (e.g., 20 for 20%)
  countries: string[]  // ISO codes (e.g., ['FR', 'BE'])
  metadata?: Record<string, any>
  created_at?: string
  updated_at?: string
}

export interface ShippingOption {
  id: string
  name: string
  region_id: string
  price_type: 'flat_rate' | 'calculated'
  amount: number  // In smallest unit (cents)
  min_subtotal?: number
  max_subtotal?: number
  metadata?: Record<string, any>
}

export interface ShippingProfile {
  id: string
  name: string
  type: 'default' | 'custom'
  metadata?: Record<string, any>
}

export interface CreateRegionInput {
  name: string
  currency_code: string
  tax_rate?: number
  countries: string[]
  metadata?: Record<string, any>
}

export interface UpdateRegionInput {
  name?: string
  currency_code?: string
  tax_rate?: number
  countries?: string[]
  metadata?: Record<string, any>
}

export interface CreateShippingOptionInput {
  name: string
  region_id: string
  price_type: 'flat_rate' | 'calculated'
  amount: number
  min_subtotal?: number
  max_subtotal?: number
  metadata?: Record<string, any>
}

export const SUPPORTED_COUNTRIES = [
  { code: 'FR', name: 'France', flag: '🇫🇷' },
  { code: 'US', name: 'United States', flag: '🇺🇸' },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧' },
  { code: 'DE', name: 'Germany', flag: '🇩🇪' },
  { code: 'ES', name: 'Spain', flag: '🇪🇸' },
  { code: 'IT', name: 'Italy', flag: '🇮🇹' },
  { code: 'BE', name: 'Belgium', flag: '🇧🇪' },
  { code: 'CH', name: 'Switzerland', flag: '🇨🇭' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦' },
] as const

export const DEFAULT_REGIONS = [
  {
    name: 'Europe',
    currency_code: 'eur',
    tax_rate: 20,
    countries: ['FR', 'BE', 'DE', 'ES', 'IT'],
  },
  {
    name: 'United States',
    currency_code: 'usd',
    tax_rate: 0,  // Varies by state
    countries: ['US'],
  },
  {
    name: 'United Kingdom',
    currency_code: 'gbp',
    tax_rate: 20,
    countries: ['GB'],
  },
] as const
