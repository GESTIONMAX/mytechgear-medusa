/**
 * Product Categories API - Manage product categories
 *
 * POST /admin-api/products/[id]/categories - Link/unlink product categories
 */

import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { Modules } from "@medusajs/framework/utils";
import { authenticateAdmin } from "../../../../middlewares";

export const middlewares = [authenticateAdmin];

/**
 * POST /admin-api/products/[id]/categories
 * Link or unlink categories to/from a product
 */
export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
) {
  try {
    const productService = req.scope.resolve(Modules.PRODUCT);
    const { id } = req.params;
    const { category_ids } = req.body as any;

    // Update product with new categories
    const product = await productService.updateProducts(id, {
      category_ids: category_ids,
    });

    return res.status(200).json({
      product,
    });

  } catch (error: any) {
    console.error('[Product Categories API] Error:', error);
    return res.status(500).json({
      error: 'Failed to update product categories',
      details: error.message
    });
  }
}
