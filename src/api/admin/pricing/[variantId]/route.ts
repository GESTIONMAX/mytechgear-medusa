/**
 * Variant Pricing API - CRUD Operations
 *
 * GET /admin/pricing/:variantId - Get all prices for a variant
 * POST /admin/pricing/:variantId - Create/update prices for a variant
 * DELETE /admin/pricing/:variantId - Delete all prices for a variant
 */

import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { Modules } from "@medusajs/framework/utils";
import { authenticateAdmin } from "../../../middlewares";
import {
  getVariantPrices,
  bulkSetVariantPrices,
  deleteVariantPrices,
  formatPrice,
} from "../../../../lib/pricing";
import { addPriceHistory } from "../../../../lib/price-history";
import type {
  Price,
  PriceCreateInput,
  SupportedCurrency,
} from "../../../../types/pricing";

// Apply authentication middleware
export const middlewares = [authenticateAdmin];

interface VariantPricesResponse {
  variant_id: string
  prices: Array<Price & { formatted_amount: string }>
  count: number
}

interface UpdatePricesRequest {
  prices: PriceCreateInput[]
}

interface UpdatePricesResponse {
  variant_id: string
  created: number
  updated: number
  prices: Array<Price & { formatted_amount: string }>
}

interface DeletePricesResponse {
  variant_id: string
  deleted: boolean
  count: number
}

/**
 * GET /admin/pricing/:variantId
 *
 * Get all prices for a variant
 */
export async function GET(
  req: MedusaRequest,
  res: MedusaResponse<VariantPricesResponse>
) {
  try {
    const pricingService = req.scope.resolve(Modules.PRICING);
    const productService = req.scope.resolve(Modules.PRODUCT);
    const { variantId } = req.params;

    if (!variantId) {
      return res.status(400).json({
        error: 'Missing required parameter: variantId'
      } as any);
    }

    // Fetch prices
    const prices = await getVariantPrices(pricingService, variantId);

    // Add formatted amounts
    const formattedPrices = prices.map(price => ({
      ...price,
      formatted_amount: formatPrice(price.amount, price.currency_code as SupportedCurrency),
    }));

    return res.status(200).json({
      variant_id: variantId,
      prices: formattedPrices,
      count: prices.length,
    });

  } catch (error: any) {
    console.error('[Pricing API] Error fetching variant prices:', error);

    return res.status(500).json({
      error: 'Failed to fetch variant prices',
      details: error.message
    } as any);
  }
}

/**
 * POST /admin/pricing/:variantId
 *
 * Create or update prices for a variant
 *
 * Request body:
 * {
 *   "prices": [
 *     {
 *       "currency_code": "eur",
 *       "amount": 2999,  // In cents
 *       "min_quantity": 1,
 *       "max_quantity": null
 *     },
 *     {
 *       "currency_code": "usd",
 *       "amount": 3299
 *     }
 *   ]
 * }
 */
export async function POST(
  req: MedusaRequest<UpdatePricesRequest>,
  res: MedusaResponse<UpdatePricesResponse>
) {
  try {
    const pricingService = req.scope.resolve(Modules.PRICING);
    const productService = req.scope.resolve(Modules.PRODUCT);
    const { variantId } = req.params;
    const { prices } = req.body;

    // Validate request
    if (!variantId) {
      return res.status(400).json({
        error: 'Missing required parameter: variantId'
      } as any);
    }

    if (!prices || !Array.isArray(prices) || prices.length === 0) {
      return res.status(400).json({
        error: 'Missing required field: prices (must be non-empty array)'
      } as any);
    }

    // Validate each price
    for (const price of prices) {
      if (!price.currency_code) {
        return res.status(400).json({
          error: 'Each price must have currency_code'
        } as any);
      }

      if (typeof price.amount !== 'number') {
        return res.status(400).json({
          error: 'Each price must have amount (number in smallest unit)'
        } as any);
      }
    }

    // Fetch old prices before updating (for history tracking)
    const oldPrices = await getVariantPrices(pricingService, variantId);
    const oldPricesMap = new Map(
      oldPrices.map(p => [p.currency_code, p.amount])
    );

    // Bulk set prices
    const stats = await bulkSetVariantPrices(pricingService, variantId, prices);

    // Fetch updated prices
    const updatedPrices = await getVariantPrices(pricingService, variantId);

    // Record price history for each changed price
    for (const price of prices) {
      const oldAmount = oldPricesMap.get(price.currency_code) || null;

      // Only record if price actually changed
      if (oldAmount !== price.amount) {
        await addPriceHistory(productService, variantId, {
          currency_code: price.currency_code,
          old_amount: oldAmount,
          new_amount: price.amount,
          changed_by: (req as any).user?.id || 'admin',
          reason: 'Price updated via admin dashboard',
        });
      }
    }

    // Add formatted amounts
    const formattedPrices = updatedPrices.map(price => ({
      ...price,
      formatted_amount: formatPrice(price.amount, price.currency_code as SupportedCurrency),
    }));

    return res.status(200).json({
      variant_id: variantId,
      created: stats.created,
      updated: stats.updated,
      prices: formattedPrices,
    });

  } catch (error: any) {
    console.error('[Pricing API] Error updating variant prices:', error);

    // Check if it's a validation error
    try {
      const parsed = JSON.parse(error.message);
      if (parsed.errors) {
        return res.status(400).json({
          error: 'Validation failed',
          details: parsed.errors
        } as any);
      }
    } catch {}

    return res.status(500).json({
      error: 'Failed to update variant prices',
      details: error.message
    } as any);
  }
}

/**
 * DELETE /admin/pricing/:variantId
 *
 * Delete all prices for a variant
 */
export async function DELETE(
  req: MedusaRequest,
  res: MedusaResponse<DeletePricesResponse>
) {
  try {
    const pricingService = req.scope.resolve(Modules.PRICING);
    const productService = req.scope.resolve(Modules.PRODUCT);
    const { variantId } = req.params;

    if (!variantId) {
      return res.status(400).json({
        error: 'Missing required parameter: variantId'
      } as any);
    }

    // Delete all prices
    const count = await deleteVariantPrices(pricingService, variantId);

    return res.status(200).json({
      variant_id: variantId,
      deleted: true,
      count,
    });

  } catch (error: any) {
    console.error('[Pricing API] Error deleting variant prices:', error);

    return res.status(500).json({
      error: 'Failed to delete variant prices',
      details: error.message
    } as any);
  }
}
