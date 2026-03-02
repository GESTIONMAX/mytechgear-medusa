/**
 * Product Categories API - Use Medusa services directly
 *
 * GET /admin-api/product-categories - List categories
 * POST /admin-api/product-categories - Create category
 */

import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { Modules } from "@medusajs/framework/utils";
import { authenticateAdmin } from "../../middlewares";

export const middlewares = [authenticateAdmin];

/**
 * GET /admin-api/product-categories
 * List all product categories
 */
export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
) {
  try {
    const productService = req.scope.resolve(Modules.PRODUCT);

    // Parse query params
    const limit = req.query?.limit ? parseInt(req.query.limit as string) : 100;
    const offset = req.query?.offset ? parseInt(req.query.offset as string) : 0;

    const [categories, count] = await productService.listAndCountProductCategories(
      {},
      {
        skip: offset,
        take: limit,
      }
    );

    return res.status(200).json({
      product_categories: categories,
      count,
      offset,
      limit,
    });

  } catch (error: any) {
    console.error('[Product Categories API] Error:', error);
    return res.status(500).json({
      error: 'Failed to fetch product categories',
      details: error.message
    } as any);
  }
}

/**
 * POST /admin-api/product-categories
 * Create a new product category
 */
export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
) {
  try {
    const productService = req.scope.resolve(Modules.PRODUCT);
    const data = req.body as any;

    const category = await productService.createProductCategories(data);

    console.log(`✅ [Product Categories API] Created category: ${(category as any).name}`);

    return res.status(201).json({
      product_category: category,
    });

  } catch (error: any) {
    console.error('[Product Categories API] Error creating category:', error);
    return res.status(500).json({
      error: 'Failed to create product category',
      details: error.message
    } as any);
  }
}
