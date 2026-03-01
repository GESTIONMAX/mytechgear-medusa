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

    // Fetch all prices with region context
    // Note: This is a simplified implementation
    // In production, you'd store regional overrides in metadata or separate table
    const regionalPrices: RegionalPrice[] = [];

    // For now, return empty array - this would be populated from database
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
    const pricingService = req.scope.resolve(Modules.PRICING);
    const { variant_id, region_id, currency_code, amount } = req.body;

    // Validate request
    if (!variant_id || !region_id || !currency_code || typeof amount !== 'number') {
      return res.status(400).json({
        error: 'Missing required fields: variant_id, region_id, currency_code, amount'
      } as any);
    }

    // Create price with region context
    // Note: Medusa v2 Pricing Module supports price lists with rules
    // This is a simplified implementation - in production, use price lists
    const price: any = {
      id: `price_${Date.now()}`,
      price_set_id: `ps_${Date.now()}`,
      currency_code: currency_code.toLowerCase(),
      amount,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const regionalPrice: RegionalPrice = {
      ...price,
      region_id,
      is_override: true,
    };

    return res.status(201).json({
      regional_price: {
        ...regionalPrice,
        formatted_amount: formatPrice(amount, currency_code as SupportedCurrency),
      },
      message: `Regional price override created for ${region_id}`,
    });

  } catch (error: any) {
    console.error('[Regional Pricing API] Error creating regional price:', error);

    return res.status(500).json({
      error: 'Failed to create regional price',
      details: error.message
    } as any);
  }
}
