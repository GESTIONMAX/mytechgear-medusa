/**
 * Regional Pricing Management Library
 *
 * Stores regional price overrides in product variant metadata.
 * Uses metadata.regional_prices object to store region-specific pricing.
 */

import type { RegionalPrice } from '../types/pricing';
import { validatePrice, toSmallestUnit } from './pricing';

export interface RegionalPriceOverride {
  region_id: string;
  currency_code: string;
  amount: number;
  created_at: string;
  updated_at: string;
}

/**
 * Get regional price overrides for a variant
 */
export async function getRegionalPrices(
  productService: any,
  variantId: string,
  options?: {
    region_id?: string;
    currency_code?: string;
  }
): Promise<RegionalPrice[]> {
  try {
    const variants = await productService.listVariants(
      { id: variantId },
      { select: ['id', 'metadata'] }
    );

    if (!variants || variants.length === 0) {
      return [];
    }

    const variant = variants[0];
    const metadata = variant.metadata || {};
    const regionalPricesObj: Record<string, RegionalPriceOverride> = metadata.regional_prices || {};

    // Convert object to array
    let regionalPrices: RegionalPrice[] = Object.entries(regionalPricesObj).map(
      ([key, override]) => ({
        id: `regional_${variantId}_${key}`,
        price_set_id: '', // Not applicable for metadata-based storage
        currency_code: override.currency_code,
        amount: override.amount,
        region_id: override.region_id,
        is_override: true,
        created_at: override.created_at,
        updated_at: override.updated_at,
      })
    );

    // Filter by region if specified
    if (options?.region_id) {
      regionalPrices = regionalPrices.filter(
        p => p.region_id === options.region_id
      );
    }

    // Filter by currency if specified
    if (options?.currency_code) {
      regionalPrices = regionalPrices.filter(
        p => p.currency_code === options.currency_code.toLowerCase()
      );
    }

    return regionalPrices;
  } catch (error) {
    console.error('[Regional Pricing] Failed to get regional prices:', error);
    return [];
  }
}

/**
 * Set regional price override for a variant
 */
export async function setRegionalPrice(
  productService: any,
  variantId: string,
  region_id: string,
  currency_code: string,
  amount: number
): Promise<RegionalPrice> {
  try {
    // Validate price
    const validation = validatePrice(amount, currency_code);
    if (!validation.valid) {
      throw new Error(JSON.stringify({ errors: validation.errors }));
    }

    // Fetch variant with metadata
    const variants = await productService.listVariants(
      { id: variantId },
      { select: ['id', 'metadata'] }
    );

    if (!variants || variants.length === 0) {
      throw new Error(`Variant not found: ${variantId}`);
    }

    const variant = variants[0];
    const metadata = variant.metadata || {};
    const regionalPrices: Record<string, RegionalPriceOverride> =
      metadata.regional_prices || {};

    // Create unique key for this regional override
    const key = `${region_id}_${currency_code.toLowerCase()}`;

    const now = new Date().toISOString();
    const existingOverride = regionalPrices[key];

    // Update or create override
    regionalPrices[key] = {
      region_id,
      currency_code: currency_code.toLowerCase(),
      amount,
      created_at: existingOverride?.created_at || now,
      updated_at: now,
    };

    // Update variant metadata
    await productService.updateVariants(variantId, {
      metadata: {
        ...metadata,
        regional_prices: regionalPrices,
      },
    });

    console.log(
      `[Regional Pricing] Set price override for variant ${variantId}, region ${region_id}, currency ${currency_code}: ${amount}`
    );

    return {
      id: `regional_${variantId}_${key}`,
      price_set_id: '',
      currency_code: currency_code.toLowerCase(),
      amount,
      region_id,
      is_override: true,
      created_at: regionalPrices[key].created_at,
      updated_at: regionalPrices[key].updated_at,
    };
  } catch (error) {
    console.error('[Regional Pricing] Failed to set regional price:', error);
    throw error;
  }
}

/**
 * Delete regional price override
 */
export async function deleteRegionalPrice(
  productService: any,
  variantId: string,
  region_id: string,
  currency_code: string
): Promise<boolean> {
  try {
    // Fetch variant with metadata
    const variants = await productService.listVariants(
      { id: variantId },
      { select: ['id', 'metadata'] }
    );

    if (!variants || variants.length === 0) {
      return false;
    }

    const variant = variants[0];
    const metadata = variant.metadata || {};
    const regionalPrices: Record<string, RegionalPriceOverride> =
      metadata.regional_prices || {};

    const key = `${region_id}_${currency_code.toLowerCase()}`;

    if (!regionalPrices[key]) {
      return false; // Override doesn't exist
    }

    // Remove the override
    delete regionalPrices[key];

    // Update variant metadata
    await productService.updateVariants(variantId, {
      metadata: {
        ...metadata,
        regional_prices: regionalPrices,
      },
    });

    console.log(
      `[Regional Pricing] Deleted price override for variant ${variantId}, region ${region_id}, currency ${currency_code}`
    );

    return true;
  } catch (error) {
    console.error('[Regional Pricing] Failed to delete regional price:', error);
    return false;
  }
}

/**
 * Get regional prices for multiple variants in a region
 */
export async function getBulkRegionalPrices(
  productService: any,
  region_id: string,
  options?: {
    currency_code?: string;
    limit?: number;
  }
): Promise<Array<RegionalPrice & { variant_id: string; variant_title?: string }>> {
  try {
    // Fetch all variants with metadata
    const variants = await productService.listVariants(
      {},
      {
        select: ['id', 'title', 'metadata'],
        take: options?.limit || 1000,
      }
    );

    const allRegionalPrices: Array<
      RegionalPrice & { variant_id: string; variant_title?: string }
    > = [];

    for (const variant of variants) {
      const metadata = variant.metadata || {};
      const regionalPricesObj: Record<string, RegionalPriceOverride> =
        metadata.regional_prices || {};

      // Convert object to array and filter by region
      for (const [key, override] of Object.entries(regionalPricesObj)) {
        if (override.region_id !== region_id) {
          continue;
        }

        // Filter by currency if specified
        if (
          options?.currency_code &&
          override.currency_code !== options.currency_code.toLowerCase()
        ) {
          continue;
        }

        allRegionalPrices.push({
          id: `regional_${variant.id}_${key}`,
          price_set_id: '',
          currency_code: override.currency_code,
          amount: override.amount,
          region_id: override.region_id,
          is_override: true,
          created_at: override.created_at,
          updated_at: override.updated_at,
          variant_id: variant.id,
          variant_title: variant.title,
        });
      }
    }

    // Sort by updated_at (most recent first)
    allRegionalPrices.sort(
      (a, b) =>
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    );

    return allRegionalPrices;
  } catch (error) {
    console.error('[Regional Pricing] Failed to get bulk regional prices:', error);
    return [];
  }
}
