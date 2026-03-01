/**
 * Price Calculation API
 *
 * POST /admin/pricing/calculate - Calculate context-aware price for a variant
 */

import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { Modules } from "@medusajs/framework/utils";
import { authenticateAdmin } from "../../../middlewares";
import { calculatePrice } from "../../../../lib/pricing";
import type {
  PriceCalculationContext,
  CalculatedPrice,
} from "../../../../types/pricing";

// Apply authentication middleware
export const middlewares = [authenticateAdmin];

interface CalculatePriceRequest {
  variant_id: string
  currency_code: string
  region_id?: string
  customer_group_id?: string
  quantity?: number
}

interface CalculatePriceResponse {
  price: CalculatedPrice | null
}

/**
 * POST /admin/pricing/calculate
 *
 * Calculate context-aware price for a variant
 *
 * Takes into account:
 * - Currency
 * - Region (if provided)
 * - Customer group (if provided)
 * - Quantity (for tiered pricing, if provided)
 *
 * Request body:
 * {
 *   "variant_id": "variant_123",
 *   "currency_code": "eur",
 *   "region_id": "reg_france",  // optional
 *   "customer_group_id": "cgrp_vip",  // optional
 *   "quantity": 5  // optional, for tiered pricing
 * }
 */
export async function POST(
  req: MedusaRequest<CalculatePriceRequest>,
  res: MedusaResponse<CalculatePriceResponse>
) {
  try {
    const pricingService = req.scope.resolve(Modules.PRICING);
    const productService = req.scope.resolve(Modules.PRODUCT);

    const {
      variant_id,
      currency_code,
      region_id,
      customer_group_id,
      quantity,
    } = req.body;

    // Validate required fields
    if (!variant_id) {
      return res.status(400).json({
        error: 'Missing required field: variant_id'
      } as any);
    }

    if (!currency_code) {
      return res.status(400).json({
        error: 'Missing required field: currency_code'
      } as any);
    }

    // Calculate price with context
    const context: PriceCalculationContext = {
      variant_id,
      currency_code: currency_code.toLowerCase(),
      region_id,
      customer_group_id,
      quantity,
    };

    const calculatedPrice = await calculatePrice(pricingService, context);

    if (!calculatedPrice) {
      return res.status(404).json({
        error: 'No price found for this context',
        details: 'Variant may not have a price set for the specified currency/region'
      } as any);
    }

    return res.status(200).json({
      price: calculatedPrice,
    });

  } catch (error: any) {
    console.error('[Pricing API] Error calculating price:', error);

    return res.status(500).json({
      error: 'Failed to calculate price',
      details: error.message
    } as any);
  }
}
