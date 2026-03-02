/**
 * Variant Metadata API - Update variant metadata
 *
 * PUT /admin-api/variants/[variantId]/metadata - Update variant metadata
 */

import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { Modules } from "@medusajs/framework/utils";
import { authenticateAdmin } from "../../../../middlewares";

export const middlewares = [authenticateAdmin];

/**
 * PUT /admin-api/variants/[variantId]/metadata
 * Update variant metadata
 */
export async function PUT(
  req: MedusaRequest,
  res: MedusaResponse
) {
  try {
    const productService = req.scope.resolve(Modules.PRODUCT);
    const { variantId } = req.params;
    const { metadata } = req.body as any;

    const variant = await productService.updateProductVariants(variantId, {
      metadata,
    });

    return res.status(200).json({
      variant,
    });

  } catch (error: any) {
    console.error('[Variant Metadata API] Error:', error);
    return res.status(500).json({
      error: 'Failed to update variant metadata',
      details: error.message
    });
  }
}
