/**
 * Bulk Pricing API
 *
 * GET /admin/pricing - List all variants with prices
 * POST /admin/pricing/bulk - Bulk update prices for multiple variants
 */

import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { Modules } from "@medusajs/framework/utils";
import { authenticateAdmin } from "../../middlewares";
import {
  listVariantsWithPrices,
  bulkSetVariantPrices,
  formatPrice,
} from "../../../lib/pricing";
import type {
  VariantWithPrice,
  BulkPriceUpdateInput,
  BulkUpdateResponse,
  SupportedCurrency,
} from "../../../types/pricing";

// Apply authentication middleware
export const middlewares = [authenticateAdmin];

interface PriceListQueryParams {
  product_id?: string
  currency_code?: string
  offset?: string
  limit?: string
}

interface PriceListResponse {
  variants: Array<VariantWithPrice & {
    prices: Array<{
      id: string
      price_set_id: string
      currency_code: string
      amount: number
      formatted_amount: string
      min_quantity?: number
      max_quantity?: number
    }>
  }>
  count: number
  offset: number
  limit: number
}

/**
 * GET /admin/pricing
 *
 * List all variants with their prices
 *
 * Query params:
 * - product_id: Filter by product (optional)
 * - currency_code: Filter prices by currency (optional)
 * - offset: Pagination offset (default: 0)
 * - limit: Page size (default: 50, max: 100)
 */
export async function GET(
  req: MedusaRequest<never, PriceListQueryParams>,
  res: MedusaResponse<PriceListResponse>
) {
  try {
    const pricingService = req.scope.resolve(Modules.PRICING);
    const productService = req.scope.resolve(Modules.PRODUCT);

    const {
      product_id,
      currency_code,
      offset = '0',
      limit = '50',
    } = req.query;

    const offsetNum = parseInt(offset as string, 10) || 0;
    const limitNum = Math.min(parseInt(limit as string, 10) || 50, 100); // Max 100

    // Fetch variants with prices
    const variants = await listVariantsWithPrices(
      productService,
      pricingService,
      {
        product_id: product_id as string | undefined,
        currency_code: currency_code as string | undefined,
        offset: offsetNum,
        limit: limitNum,
      }
    );

    // Add formatted amounts to prices
    const formattedVariants = variants.map(variant => ({
      ...variant,
      prices: variant.prices.map(price => ({
        ...price,
        formatted_amount: formatPrice(price.amount, price.currency_code as SupportedCurrency),
      })),
    }));

    return res.status(200).json({
      variants: formattedVariants,
      count: variants.length,
      offset: offsetNum,
      limit: limitNum,
    });

  } catch (error: any) {
    console.error('[Pricing API] Error listing variants with prices:', error);

    return res.status(500).json({
      error: 'Failed to list variants with prices',
      details: error.message
    } as any);
  }
}

/**
 * POST /admin/pricing/bulk
 *
 * Bulk update prices for multiple variants
 *
 * Request body:
 * {
 *   "updates": [
 *     {
 *       "variant_id": "variant_123",
 *       "prices": [
 *         { "currency_code": "eur", "amount": 2999 },
 *         { "currency_code": "usd", "amount": 3299 }
 *       ]
 *     },
 *     {
 *       "variant_id": "variant_456",
 *       "prices": [
 *         { "currency_code": "eur", "amount": 3999 }
 *       ]
 *     }
 *   ]
 * }
 */
export async function POST(
  req: MedusaRequest<{ updates: BulkPriceUpdateInput[] }>,
  res: MedusaResponse<BulkUpdateResponse>
) {
  try {
    const pricingService = req.scope.resolve(Modules.PRICING);
    const productService = req.scope.resolve(Modules.PRODUCT);
    const { updates } = req.body;

    // Validate request
    if (!updates || !Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({
        error: 'Missing required field: updates (must be non-empty array)'
      } as any);
    }

    // Validate each update
    for (const update of updates) {
      if (!update.variant_id) {
        return res.status(400).json({
          error: 'Each update must have variant_id'
        } as any);
      }

      if (!update.prices || !Array.isArray(update.prices) || update.prices.length === 0) {
        return res.status(400).json({
          error: `Update for variant ${update.variant_id} must have prices array`
        } as any);
      }
    }

    let totalCreated = 0;
    let totalUpdated = 0;
    const errors: Array<{ variant_id: string; error: string }> = [];

    // Process each variant
    for (const update of updates) {
      try {
        // Bulk set prices
        const stats = await bulkSetVariantPrices(
          pricingService,
          update.variant_id,
          update.prices
        );

        totalCreated += stats.created;
        totalUpdated += stats.updated;

      } catch (error: any) {
        console.error(`[Pricing API] Error updating variant ${update.variant_id}:`, error);

        errors.push({
          variant_id: update.variant_id,
          error: error.message,
        });
      }
    }

    return res.status(200).json({
      created: totalCreated,
      updated: totalUpdated,
      errors,
    });

  } catch (error: any) {
    console.error('[Pricing API] Error in bulk price update:', error);

    return res.status(500).json({
      error: 'Failed to bulk update prices',
      details: error.message
    } as any);
  }
}
