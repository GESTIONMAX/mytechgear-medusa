/**
 * Product Collections API - Manage product collections
 *
 * POST /admin-api/products/[id]/collections - Link product to collection
 */

import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { Modules } from "@medusajs/framework/utils";
import { authenticateAdmin } from "../../../../middlewares";

export const middlewares = [authenticateAdmin];

/**
 * POST /admin-api/products/[id]/collections
 * Link a product to a collection
 */
export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
) {
  try {
    const productService = req.scope.resolve(Modules.PRODUCT);
    const { id } = req.params;
    const { collection_id } = req.body as any;

    const product = await productService.updateProducts(id, {
      collection_id,
    });

    return res.status(200).json({
      product,
    });

  } catch (error: any) {
    console.error('[Product Collections API] Error:', error);
    return res.status(500).json({
      error: 'Failed to update product collection',
      details: error.message
    });
  }
}
