/**
 * Sales Channel Products API - Use Medusa services directly
 *
 * GET /admin-api/sales-channels/:id/products - List products in channel
 * POST /admin-api/sales-channels/:id/products - Assign products to channel
 */

import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { Modules } from "@medusajs/framework/utils";
import { authenticateAdmin } from "../../../../middlewares";

export const middlewares = [authenticateAdmin];

/**
 * GET /admin-api/sales-channels/:id/products
 * List products in a sales channel
 */
export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
) {
  try {
    const { id } = req.params;

    // Parse query params
    const limit = req.query?.limit ? parseInt(req.query.limit as string) : 100;
    const offset = req.query?.offset ? parseInt(req.query.offset as string) : 0;

    // For now, return all products
    // TODO: Filter by sales channel using RemoteLink once syntax is corrected
    // In Medusa v2, sales channel filtering requires querying links,
    // which has a specific syntax that needs investigation

    const productService = req.scope.resolve(Modules.PRODUCT);
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
      _note: `Showing all products (sales channel filtering TODO)`,
    });

  } catch (error: any) {
    console.error('[Sales Channel Products API] Error:', error);
    return res.status(500).json({
      error: 'Failed to fetch products',
      details: error.message
    } as any);
  }
}

/**
 * POST /admin-api/sales-channels/:id/products
 * Assign products to a sales channel
 *
 * Body: { product_ids: string[] }
 */
export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
) {
  try {
    const { id } = req.params;
    const { product_ids } = req.body;

    if (!product_ids || !Array.isArray(product_ids)) {
      return res.status(400).json({
        error: 'product_ids is required and must be an array'
      } as any);
    }

    // Use RemoteLink to create links between products and sales channel
    const remoteLink = req.scope.resolve("remoteLink");

    // Create links for each product
    const links = product_ids.map((productId: string) => ({
      [Modules.SALES_CHANNEL]: {
        sales_channel_id: id
      },
      [Modules.PRODUCT]: {
        product_id: productId
      }
    }));

    await remoteLink.create(links);

    console.log(`✅ [Sales Channel Products API] Assigned ${product_ids.length} products to channel ${id}`);

    return res.status(200).json({
      success: true,
      message: `${product_ids.length} products assigned to sales channel`,
      assigned_count: product_ids.length,
    });

  } catch (error: any) {
    console.error('[Sales Channel Products API] Error assigning products:', error);
    return res.status(500).json({
      error: 'Failed to assign products',
      details: error.message
    } as any);
  }
}
