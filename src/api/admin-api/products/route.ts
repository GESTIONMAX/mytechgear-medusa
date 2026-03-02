/**
 * Products API - Use Medusa services directly
 *
 * GET /admin-api/products - List products using Medusa service
 */

import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { Modules } from "@medusajs/framework/utils";
import { authenticateAdmin } from "../../middlewares";

export const middlewares = [authenticateAdmin];

/**
 * GET /admin-api/products
 * List products using Medusa service
 */
export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
) {
  try {
    const productService = req.scope.resolve(Modules.PRODUCT);

    // Parse query params
    const limit = req.query?.limit ? parseInt(req.query.limit as string) : 15;
    const offset = req.query?.offset ? parseInt(req.query.offset as string) : 0;

    // Fetch products
    const [products, count] = await productService.listAndCountProducts(
      {},
      {
        skip: offset,
        take: limit,
        relations: ['variants'],
      }
    );

    return res.status(200).json({
      products,
      count,
      offset,
      limit,
    });

  } catch (error: any) {
    console.error('[Products API] Error:', error);
    return res.status(500).json({
      error: 'Failed to fetch products',
      details: error.message
    } as any);
  }
}
