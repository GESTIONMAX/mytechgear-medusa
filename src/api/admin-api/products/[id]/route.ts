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
 *
 * Query params:
 * - fields: Comma-separated list of relations to include (e.g., "*options,*options.values,*variants")
 *   Format: *relationName includes that relation
 */
export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
) {
  try {
    const productService = req.scope.resolve(Modules.PRODUCT);
    const { id } = req.params;

    // Parse fields parameter to determine relations
    const fieldsParam = req.query?.fields as string | undefined;
    let relations: string[] = ['variants', 'options', 'options.values', 'images', 'categories', 'collection'];

    if (fieldsParam) {
      // Parse fields like "*options,*options.values,*variants,*variants.options"
      const fields = fieldsParam.split(',');
      const customRelations: string[] = [];

      for (const field of fields) {
        if (field.startsWith('*')) {
          // *options.values -> "options.values"
          const relationPath = field.substring(1);
          customRelations.push(relationPath);
        }
      }

      if (customRelations.length > 0) {
        // Use custom relations if provided
        relations = customRelations;
      }
    }

    const product = await productService.retrieveProduct(id, {
      relations,
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
