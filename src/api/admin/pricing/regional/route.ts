/**
 * Regional Pricing API
 *
 * GET /admin/pricing/regional?region_id=reg_france - List regional prices
 * POST /admin/pricing/regional - Set region-specific price override
 * DELETE /admin/pricing/regional/:priceId - Remove regional override
 */

import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { Modules } from "@medusajs/framework/utils";
import { authenticateAdmin } from "../../../middlewares";
import { formatPrice } from "../../../../lib/pricing";
import {
  getRegionalPrices,
  setRegionalPrice,
  deleteRegionalPrice,
  getBulkRegionalPrices,
} from "../../../../lib/regional-pricing";
import type { SupportedCurrency, RegionalPrice } from "../../../../types/pricing";

// Apply authentication middleware
export const middlewares = [authenticateAdmin];

interface RegionalPriceRequest {
  variant_id: string
  region_id: string
  currency_code: string
  amount: number
}

interface RegionalPriceResponse {
  regional_price: RegionalPrice & { formatted_amount: string }
  message: string
}

interface RegionalPriceListResponse {
  regional_prices: Array<RegionalPrice & { formatted_amount: string; variant_title?: string }>
  count: number
}

/**
 * GET /admin/pricing/regional
 *
 * List all regional price overrides
 * Query params:
 * - region_id: Filter by region (required)
 * - variant_id: Filter by variant (optional)
 */
export async function GET(
  req: MedusaRequest,
  res: MedusaResponse<RegionalPriceListResponse>
) {
  try {
    const pricingService = req.scope.resolve(Modules.PRICING);
    const productService = req.scope.resolve(Modules.PRODUCT);
    const { region_id, variant_id } = req.query;

    if (!region_id) {
      return res.status(400).json({
        error: 'Missing required query parameter: region_id'
      } as any);
    }

    // Fetch regional price overrides
    let regionalPrices: Array<RegionalPrice & { variant_title?: string }>;

    if (variant_id) {
      // Get regional prices for specific variant
      regionalPrices = await getRegionalPrices(productService, variant_id as string, {
        region_id: region_id as string,
      });
    } else {
      // Get all regional prices for the region
      regionalPrices = await getBulkRegionalPrices(productService, region_id as string);
    }

    const formattedPrices = regionalPrices.map(price => ({
      ...price,
      formatted_amount: formatPrice(price.amount, price.currency_code as SupportedCurrency),
    }));

    return res.status(200).json({
      regional_prices: formattedPrices,
      count: regionalPrices.length,
    });

  } catch (error: any) {
    console.error('[Regional Pricing API] Error fetching regional prices:', error);

    return res.status(500).json({
      error: 'Failed to fetch regional prices',
      details: error.message
    } as any);
  }
}

/**
 * POST /admin/pricing/regional
 *
 * Set region-specific price override
 *
 * Request body:
 * {
 *   "variant_id": "variant_123",
 *   "region_id": "reg_france",
 *   "currency_code": "eur",
 *   "amount": 3499  // Override price for this region
 * }
 */
export async function POST(
  req: MedusaRequest<RegionalPriceRequest>,
  res: MedusaResponse<RegionalPriceResponse>
) {
  try {
    const productService = req.scope.resolve(Modules.PRODUCT);
    const { variant_id, region_id, currency_code, amount } = req.body;

    // Validate request
    if (!variant_id || !region_id || !currency_code || typeof amount !== 'number') {
      return res.status(400).json({
        error: 'Missing required fields: variant_id, region_id, currency_code, amount'
      } as any);
    }

    // Set regional price override
    const regionalPrice = await setRegionalPrice(
      productService,
      variant_id,
      region_id,
      currency_code,
      amount
    );

    return res.status(201).json({
      regional_price: {
        ...regionalPrice,
        formatted_amount: formatPrice(amount, currency_code as SupportedCurrency),
      },
      message: `Regional price override created for ${region_id}`,
    });

  } catch (error: any) {
    console.error('[Regional Pricing API] Error creating regional price:', error);

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
      error: 'Failed to create regional price',
      details: error.message
    } as any);
  }
}

/**
 * DELETE /admin/pricing/regional
 *
 * Delete region-specific price override
 *
 * Request body:
 * {
 *   "variant_id": "variant_123",
 *   "region_id": "reg_france",
 *   "currency_code": "eur"
 * }
 */
export async function DELETE(
  req: MedusaRequest<Omit<RegionalPriceRequest, 'amount'>>,
  res: MedusaResponse<{ message: string; deleted: boolean }>
) {
  try {
    const productService = req.scope.resolve(Modules.PRODUCT);
    const { variant_id, region_id, currency_code } = req.body;

    // Validate request
    if (!variant_id || !region_id || !currency_code) {
      return res.status(400).json({
        error: 'Missing required fields: variant_id, region_id, currency_code'
      } as any);
    }

    // Delete regional price override
    const deleted = await deleteRegionalPrice(
      productService,
      variant_id,
      region_id,
      currency_code
    );

    if (!deleted) {
      return res.status(404).json({
        error: 'Regional price override not found'
      } as any);
    }

    return res.status(200).json({
      message: `Regional price override deleted for region ${region_id}`,
      deleted: true,
    });

  } catch (error: any) {
    console.error('[Regional Pricing API] Error deleting regional price:', error);

    return res.status(500).json({
      error: 'Failed to delete regional price',
      details: error.message
    } as any);
  }
}
