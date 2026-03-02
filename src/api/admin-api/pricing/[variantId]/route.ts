/**
 * Variant Pricing API - Get/Update variant pricing
 *
 * GET /admin-api/pricing/[variantId] - Get variant prices
 * PUT /admin-api/pricing/[variantId] - Update variant prices
 */

import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { Modules } from "@medusajs/framework/utils";
import { authenticateAdmin } from "../../../middlewares";

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
    const productService = req.scope.resolve(Modules.PRODUCT);
    const { variantId } = req.params;

    const variant = await productService.retrieveProductVariant(variantId, {
      relations: ['prices'],
    });

    if (!variant) {
      return res.status(404).json({
        error: 'Variant not found',
      });
    }

    return res.status(200).json({
      prices: (variant as any).prices || [],
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
    const productService = req.scope.resolve(Modules.PRODUCT);
    const { variantId } = req.params;
    const { prices } = req.body as any;

    const variant = await productService.updateProductVariants(variantId, {
      prices,
    } as any);

    return res.status(200).json({
      variant,
    });

  } catch (error: any) {
    console.error('[Variant Pricing API] PUT Error:', error);
    return res.status(500).json({
      error: 'Failed to update variant prices',
      details: error.message
    });
  }
}
