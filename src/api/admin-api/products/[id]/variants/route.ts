/**
 * Product Variants API - Manage product variants
 *
 * GET /admin-api/products/[id]/variants - List product variants
 * POST /admin-api/products/[id]/variants - Create variant for product
 */

import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { Modules } from "@medusajs/framework/utils";
import { authenticateAdmin } from "../../../../middlewares";

export const middlewares = [authenticateAdmin];

/**
 * GET /admin-api/products/[id]/variants
 * List variants for a product
 */
export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
) {
  try {
    const productService = req.scope.resolve(Modules.PRODUCT);
    const { id } = req.params;

    const product = await productService.retrieveProduct(id, {
      relations: ['variants', 'variants.options'],
    });

    if (!product) {
      return res.status(404).json({
        error: 'Product not found',
      });
    }

    return res.status(200).json({
      variants: product.variants || [],
    });

  } catch (error: any) {
    console.error('[Product Variants API] GET Error:', error);
    return res.status(500).json({
      error: 'Failed to fetch product variants',
      details: error.message
    });
  }
}

/**
 * POST /admin-api/products/[id]/variants
 * Create a variant for a product
 */
export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
) {
  try {
    const productService = req.scope.resolve(Modules.PRODUCT);
    const { id } = req.params;

    const variant = await productService.createProductVariants({
      product_id: id,
      ...(req.body as any),
    });

    return res.status(201).json({
      variant,
    });

  } catch (error: any) {
    console.error('[Product Variants API] POST Error:', error);
    return res.status(500).json({
      error: 'Failed to create product variant',
      details: error.message
    });
  }
}
