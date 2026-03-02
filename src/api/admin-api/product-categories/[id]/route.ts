/**
 * Product Category Detail API - Use Medusa services directly
 *
 * GET /admin-api/product-categories/:id - Get category
 * PUT /admin-api/product-categories/:id - Update category
 * DELETE /admin-api/product-categories/:id - Delete category
 */

import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { Modules } from "@medusajs/framework/utils";
import { authenticateAdmin } from "../../../middlewares";

export const middlewares = [authenticateAdmin];

/**
 * GET /admin-api/product-categories/:id
 */
export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
) {
  try {
    const { id } = req.params;
    const productService = req.scope.resolve(Modules.PRODUCT);

    const category = await productService.retrieveProductCategory(id);

    if (!category) {
      return res.status(404).json({
        error: 'Product category not found',
      } as any);
    }

    return res.status(200).json({
      product_category: category,
    });

  } catch (error: any) {
    console.error('[Product Category API] Error:', error);

    if (error.message?.includes('not found')) {
      return res.status(404).json({
        error: 'Product category not found',
      } as any);
    }

    return res.status(500).json({
      error: 'Failed to fetch product category',
      details: error.message
    } as any);
  }
}

/**
 * PUT /admin-api/product-categories/:id
 */
export async function PUT(
  req: MedusaRequest,
  res: MedusaResponse
) {
  try {
    const { id } = req.params;
    const data = req.body as any;
    const productService = req.scope.resolve(Modules.PRODUCT);

    const category = await productService.updateProductCategories(id, data);

    console.log(`✅ [Product Category API] Updated category: ${id}`);

    return res.status(200).json({
      product_category: category,
    });

  } catch (error: any) {
    console.error('[Product Category API] Error updating:', error);

    if (error.message?.includes('not found')) {
      return res.status(404).json({
        error: 'Product category not found',
      } as any);
    }

    return res.status(500).json({
      error: 'Failed to update product category',
      details: error.message
    } as any);
  }
}

/**
 * DELETE /admin-api/product-categories/:id
 */
export async function DELETE(
  req: MedusaRequest,
  res: MedusaResponse
) {
  try {
    const { id } = req.params;
    const productService = req.scope.resolve(Modules.PRODUCT);

    await productService.deleteProductCategories([id]);

    console.log(`✅ [Product Category API] Deleted category: ${id}`);

    return res.status(200).json({
      id,
      deleted: true,
    });

  } catch (error: any) {
    console.error('[Product Category API] Error deleting:', error);

    if (error.message?.includes('not found')) {
      return res.status(404).json({
        error: 'Product category not found',
      } as any);
    }

    return res.status(500).json({
      error: 'Failed to delete product category',
      details: error.message
    } as any);
  }
}
