/**
 * Product Options API - Manage product options
 *
 * GET /admin-api/products/[id]/options - List product options
 * POST /admin-api/products/[id]/options - Add option to product
 */

import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { Modules } from "@medusajs/framework/utils";
import { authenticateAdmin } from "../../../../middlewares";

export const middlewares = [authenticateAdmin];

/**
 * GET /admin-api/products/[id]/options
 * List options for a product
 */
export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
) {
  try {
    const productService = req.scope.resolve(Modules.PRODUCT);
    const { id } = req.params;

    const product = await productService.retrieveProduct(id, {
      relations: ['options'],
    });

    if (!product) {
      return res.status(404).json({
        error: 'Product not found',
      });
    }

    return res.status(200).json({
      options: product.options || [],
    });

  } catch (error: any) {
    console.error('[Product Options API] GET Error:', error);
    return res.status(500).json({
      error: 'Failed to fetch product options',
      details: error.message
    });
  }
}

/**
 * POST /admin-api/products/[id]/options
 * Add an option to a product
 */
export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
) {
  try {
    const productService = req.scope.resolve(Modules.PRODUCT);
    const { id } = req.params;

    const option = await productService.createProductOptions({
      product_id: id,
      ...(req.body as any),
    });

    return res.status(201).json({
      option,
    });

  } catch (error: any) {
    console.error('[Product Options API] POST Error:', error);
    return res.status(500).json({
      error: 'Failed to create product option',
      details: error.message
    });
  }
}
