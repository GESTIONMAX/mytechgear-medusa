/**
 * Product Detail API - GET/PUT/DELETE product by ID
 *
 * GET /admin-api/products/[id] - Get product details
 * PUT /admin-api/products/[id] - Update product
 * DELETE /admin-api/products/[id] - Delete product
 */

import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { Modules } from "@medusajs/framework/utils";
import { authenticateAdmin } from "../../../middlewares";

export const middlewares = [authenticateAdmin];

/**
 * GET /admin-api/products/[id]
 * Get product details by ID
 */
export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
) {
  try {
    const productService = req.scope.resolve(Modules.PRODUCT);
    const { id } = req.params;

    const product = await productService.retrieveProduct(id, {
      relations: ['variants', 'options', 'images', 'categories', 'collection'],
    });

    if (!product) {
      return res.status(404).json({
        error: 'Product not found',
      });
    }

    return res.status(200).json({
      product,
    });

  } catch (error: any) {
    console.error('[Product Detail API] GET Error:', error);
    return res.status(500).json({
      error: 'Failed to fetch product',
      details: error.message
    });
  }
}

/**
 * PUT /admin-api/products/[id]
 * Update product by ID
 */
export async function PUT(
  req: MedusaRequest,
  res: MedusaResponse
) {
  try {
    const productService = req.scope.resolve(Modules.PRODUCT);
    const { id } = req.params;

    const product = await productService.updateProducts(id, req.body as any);

    return res.status(200).json({
      product,
    });

  } catch (error: any) {
    console.error('[Product Detail API] PUT Error:', error);
    return res.status(500).json({
      error: 'Failed to update product',
      details: error.message
    });
  }
}

/**
 * DELETE /admin-api/products/[id]
 * Delete product by ID
 */
export async function DELETE(
  req: MedusaRequest,
  res: MedusaResponse
) {
  try {
    const productService = req.scope.resolve(Modules.PRODUCT);
    const { id } = req.params;

    await productService.deleteProducts([id]);

    return res.status(200).json({
      id,
      deleted: true,
    });

  } catch (error: any) {
    console.error('[Product Detail API] DELETE Error:', error);
    return res.status(500).json({
      error: 'Failed to delete product',
      details: error.message
    });
  }
}
