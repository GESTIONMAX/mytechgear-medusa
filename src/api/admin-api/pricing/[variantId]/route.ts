/**
 * Variant Pricing API - Get/Update variant pricing
 *
 * GET /admin-api/pricing/[variantId] - Get variant prices
 * PUT /admin-api/pricing/[variantId] - Update variant prices
 */

import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { Modules } from "@medusajs/framework/utils";
import { authenticateAdmin } from "../../../middlewares";
import { getVariantPrices, bulkSetVariantPrices } from "../../../../lib/pricing";

export const middlewares = [authenticateAdmin];

/**
 * GET /admin-api/pricing/[variantId]
 * Get variant prices
 */
export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
) {
  try {
    const pricingService = req.scope.resolve(Modules.PRICING);
    const { variantId } = req.params;

    const prices = await getVariantPrices(pricingService, variantId);

    return res.status(200).json({
      prices,
    });

  } catch (error: any) {
    console.error('[Variant Pricing API] GET Error:', error);
    return res.status(500).json({
      error: 'Failed to fetch variant prices',
      details: error.message
    });
  }
}

/**
 * PUT /admin-api/pricing/[variantId]
 * Update variant prices
 */
export async function PUT(
  req: MedusaRequest,
  res: MedusaResponse
) {
  try {
    const pricingService = req.scope.resolve(Modules.PRICING);
    const { variantId } = req.params;
    const { prices } = req.body as any;

    const result = await bulkSetVariantPrices(pricingService, variantId, prices);

    return res.status(200).json({
      success: true,
      created: result.created,
      updated: result.updated,
    });

  } catch (error: any) {
    console.error('[Variant Pricing API] PUT Error:', error);
    return res.status(500).json({
      error: 'Failed to update variant prices',
      details: error.message
    });
  }
}
