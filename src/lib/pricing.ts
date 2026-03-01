/**
 * Pricing Business Logic Library
 *
 * Core business logic for all pricing operations.
 * Handles validation, price set management, currency conversion, and calculations.
 */

import type {
  Price,
  PriceCreateInput,
  PriceValidationError,
  SupportedCurrency,
  CalculatedPrice,
  VariantWithPrice,
  PriceCalculationContext,
} from '../types/pricing'
import { PRICING_CONSTRAINTS } from '../types/pricing'

/**
 * Validate price amount and currency
 * @returns Object with validation result and any errors
 */
export function validatePrice(
  amount: number,
  currency: string
): { valid: boolean; errors: PriceValidationError[] } {
  const errors: PriceValidationError[] = []

  // Validate currency
  if (!PRICING_CONSTRAINTS.SUPPORTED_CURRENCIES.includes(currency as SupportedCurrency)) {
    errors.push({
      field: 'currency_code',
      message: `Unsupported currency: ${currency}. Supported: ${PRICING_CONSTRAINTS.SUPPORTED_CURRENCIES.join(', ')}`,
    })
  }

  // Validate amount
  if (typeof amount !== 'number' || isNaN(amount)) {
    errors.push({
      field: 'amount',
      message: 'Amount must be a valid number',
    })
  } else if (amount < PRICING_CONSTRAINTS.MIN_PRICE) {
    errors.push({
      field: 'amount',
      message: `Amount must be at least ${PRICING_CONSTRAINTS.MIN_PRICE}`,
    })
  } else if (amount > PRICING_CONSTRAINTS.MAX_PRICE) {
    errors.push({
      field: 'amount',
      message: `Amount cannot exceed ${PRICING_CONSTRAINTS.MAX_PRICE}`,
    })
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Convert decimal amount to smallest currency unit (cents)
 * @example toSmallestUnit(29.99, 'eur') => 2999
 */
export function toSmallestUnit(amount: number, currency: SupportedCurrency): number {
  const decimals = PRICING_CONSTRAINTS.CURRENCY_DECIMALS[currency]
  return Math.round(amount * Math.pow(10, decimals))
}

/**
 * Convert smallest unit to decimal amount
 * @example fromSmallestUnit(2999, 'eur') => 29.99
 */
export function fromSmallestUnit(amount: number, currency: SupportedCurrency): number {
  const decimals = PRICING_CONSTRAINTS.CURRENCY_DECIMALS[currency]
  return amount / Math.pow(10, decimals)
}

/**
 * Format price amount with currency symbol
 * @example formatPrice(2999, 'eur') => "29.99 €"
 */
export function formatPrice(amount: number, currency: SupportedCurrency): string {
  const decimal = fromSmallestUnit(amount, currency)
  const symbol = PRICING_CONSTRAINTS.CURRENCY_SYMBOLS[currency]

  if (currency === 'usd') {
    return `${symbol}${decimal.toFixed(2)}`
  }

  return `${decimal.toFixed(2)} ${symbol}`
}

/**
 * Ensure a price set exists for a variant
 * Creates one if it doesn't exist, returns the price_set_id
 */
export async function ensurePriceSet(
  pricingService: any,
  variantId: string
): Promise<string> {
  try {
    // Check if variant already has a price set
    const [variant] = await pricingService.calculatePrices(
      { id: [variantId] },
      { context: { currency_code: PRICING_CONSTRAINTS.DEFAULT_CURRENCY } }
    )

    if (variant?.calculated_price?.price_set_id) {
      return variant.calculated_price.price_set_id
    }

    // Create new price set
    const priceSet = await pricingService.createPriceSets({
      prices: [],
    })

    return priceSet.id
  } catch (error) {
    console.error('[Pricing] Error ensuring price set:', error)
    throw new Error('Failed to ensure price set for variant')
  }
}

/**
 * Get all prices for a variant
 */
export async function getVariantPrices(
  pricingService: any,
  variantId: string
): Promise<Price[]> {
  try {
    const [result] = await pricingService.calculatePrices(
      { id: [variantId] },
      {
        context: {
          currency_code: PRICING_CONSTRAINTS.DEFAULT_CURRENCY,
        },
      }
    )

    if (!result?.calculated_price?.price_set_id) {
      return []
    }

    const priceSet = await pricingService.retrievePriceSet(
      result.calculated_price.price_set_id,
      { relations: ['prices'] }
    )

    return priceSet?.prices || []
  } catch (error) {
    console.error('[Pricing] Error getting variant prices:', error)
    return []
  }
}

/**
 * Set or update a single price for a variant
 */
export async function setVariantPrice(
  pricingService: any,
  variantId: string,
  currency: string,
  amount: number
): Promise<Price> {
  const validation = validatePrice(amount, currency)
  if (!validation.valid) {
    throw new Error(JSON.stringify({ errors: validation.errors }))
  }

  const priceSetId = await ensurePriceSet(pricingService, variantId)

  // Check if price already exists for this currency
  const existingPrices = await getVariantPrices(pricingService, variantId)
  const existingPrice = existingPrices.find(p => p.currency_code === currency)

  if (existingPrice) {
    // Update existing price
    const updated = await pricingService.updatePrices({
      id: existingPrice.id,
      amount,
    })
    return updated
  }

  // Create new price
  const created = await pricingService.createPrices({
    price_set_id: priceSetId,
    currency_code: currency.toLowerCase(),
    amount,
  })

  return created
}

/**
 * Bulk set/update prices for a variant
 * @returns Statistics about created/updated prices
 */
export async function bulkSetVariantPrices(
  pricingService: any,
  variantId: string,
  prices: PriceCreateInput[]
): Promise<{ created: number; updated: number }> {
  let created = 0
  let updated = 0

  const priceSetId = await ensurePriceSet(pricingService, variantId)
  const existingPrices = await getVariantPrices(pricingService, variantId)

  for (const priceInput of prices) {
    const validation = validatePrice(priceInput.amount, priceInput.currency_code)
    if (!validation.valid) {
      throw new Error(JSON.stringify({ errors: validation.errors }))
    }

    const existing = existingPrices.find(
      p => p.currency_code === priceInput.currency_code.toLowerCase()
    )

    if (existing) {
      await pricingService.updatePrices({
        id: existing.id,
        amount: priceInput.amount,
        min_quantity: priceInput.min_quantity,
        max_quantity: priceInput.max_quantity,
      })
      updated++
    } else {
      await pricingService.createPrices({
        price_set_id: priceSetId,
        currency_code: priceInput.currency_code.toLowerCase(),
        amount: priceInput.amount,
        min_quantity: priceInput.min_quantity,
        max_quantity: priceInput.max_quantity,
      })
      created++
    }
  }

  return { created, updated }
}

/**
 * Delete all prices for a variant
 */
export async function deleteVariantPrices(
  pricingService: any,
  variantId: string
): Promise<number> {
  const prices = await getVariantPrices(pricingService, variantId)

  for (const price of prices) {
    await pricingService.deletePrices(price.id)
  }

  return prices.length
}

/**
 * Calculate price for a variant with context
 * Supports region, customer group, and quantity-based pricing
 */
export async function calculatePrice(
  pricingService: any,
  context: PriceCalculationContext
): Promise<CalculatedPrice | null> {
  try {
    const [result] = await pricingService.calculatePrices(
      { id: [context.variant_id] },
      {
        context: {
          currency_code: context.currency_code,
          region_id: context.region_id,
          customer_group_id: context.customer_group_id,
        },
      }
    )

    if (!result?.calculated_price) {
      return null
    }

    const { calculated_amount, currency_code } = result.calculated_price

    return {
      variant_id: context.variant_id,
      currency_code,
      amount: calculated_amount,
      formatted_amount: formatPrice(calculated_amount, currency_code as SupportedCurrency),
    }
  } catch (error) {
    console.error('[Pricing] Error calculating price:', error)
    return null
  }
}

/**
 * List all variants with their prices
 * Supports filtering by product, currency, etc.
 */
export async function listVariantsWithPrices(
  productService: any,
  pricingService: any,
  filters?: {
    product_id?: string
    currency_code?: string
    offset?: number
    limit?: number
  }
): Promise<VariantWithPrice[]> {
  const { offset = 0, limit = 50 } = filters || {}

  try {
    // Fetch variants
    const variants = await productService.listVariants(
      filters?.product_id ? { product_id: filters.product_id } : {},
      {
        skip: offset,
        take: limit,
        relations: ['product'],
      }
    )

    // Fetch prices for all variants
    const variantsWithPrices: VariantWithPrice[] = []

    for (const variant of variants) {
      const prices = await getVariantPrices(pricingService, variant.id)

      variantsWithPrices.push({
        id: variant.id,
        title: variant.title,
        sku: variant.sku,
        product_id: variant.product_id,
        product_title: variant.product?.title,
        prices: filters?.currency_code
          ? prices.filter(p => p.currency_code === filters.currency_code!.toLowerCase())
          : prices,
        price_set_id: prices[0]?.price_set_id,
      })
    }

    return variantsWithPrices
  } catch (error) {
    console.error('[Pricing] Error listing variants with prices:', error)
    return []
  }
}
