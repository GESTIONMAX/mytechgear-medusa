/**
 * Product Metadata API - Update product metadata
 *
 * PUT /admin-api/products/[id]/metadata - Update product metadata
 */

import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { Modules } from "@medusajs/framework/utils";
import { authenticateAdmin } from "../../../../middlewares";

export const middlewares = [authenticateAdmin];

/**
 * PUT /admin-api/products/[id]/metadata
 * Update product metadata
 */
export async function PUT(
  req: MedusaRequest,
  res: MedusaResponse
) {
  try {
    const productService = req.scope.resolve(Modules.PRODUCT);
    const { id } = req.params;
    const { metadata } = req.body as any;

    const product = await productService.updateProducts(id, {
      metadata,
    });

    return res.status(200).json({
      product,
    });

  } catch (error: any) {
    console.error('[Product Metadata API] Error:', error);
    return res.status(500).json({
      error: 'Failed to update product metadata',
      details: error.message
    });
  }
}
