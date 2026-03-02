/**
 * Variant Detail API - GET/PUT variant by ID
 *
 * GET /admin-api/variants/[variantId] - Get variant details
 * PUT /admin-api/variants/[variantId] - Update variant
 */

import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { Modules } from "@medusajs/framework/utils";
import { authenticateAdmin } from "../../../middlewares";

export const middlewares = [authenticateAdmin];

/**
 * GET /admin-api/variants/[variantId]
 * Get variant details by ID
 */
export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
) {
  try {
    const productService = req.scope.resolve(Modules.PRODUCT);
    const { variantId } = req.params;

    const variant = await productService.retrieveProductVariant(variantId, {
      relations: ['options', 'prices', 'product'],
    });

    if (!variant) {
      return res.status(404).json({
        error: 'Variant not found',
      });
    }

    return res.status(200).json({
      variant,
    });

  } catch (error: any) {
    console.error('[Variant Detail API] GET Error:', error);
    return res.status(500).json({
      error: 'Failed to fetch variant',
      details: error.message
    });
  }
}

/**
 * PUT /admin-api/variants/[variantId]
 * Update variant by ID
 */
export async function PUT(
  req: MedusaRequest,
  res: MedusaResponse
) {
  try {
    const productService = req.scope.resolve(Modules.PRODUCT);
    const { variantId } = req.params;

    const variant = await productService.updateProductVariants(variantId, req.body as any);

    return res.status(200).json({
      variant,
    });

  } catch (error: any) {
    console.error('[Variant Detail API] PUT Error:', error);
    return res.status(500).json({
      error: 'Failed to update variant',
      details: error.message
    });
  }
}
