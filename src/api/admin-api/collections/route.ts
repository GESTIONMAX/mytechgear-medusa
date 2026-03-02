/**
 * Collections API - Use Medusa services directly
 *
 * GET /admin-api/collections - List collections
 * POST /admin-api/collections - Create collection
 */

import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { Modules } from "@medusajs/framework/utils";
import { authenticateAdmin } from "../../middlewares";

export const middlewares = [authenticateAdmin];

/**
 * GET /admin-api/collections
 * List product collections
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

    // Fetch collections
    const [collections, count] = await productService.listAndCountProductCollections(
      {},
      {
        skip: offset,
        take: limit,
      }
    );

    return res.status(200).json({
      collections,
      product_collections: collections, // Alias pour compatibilité
      count,
      offset,
      limit,
    });

  } catch (error: any) {
    console.error('[Collections API] Error:', error);
    return res.status(500).json({
      error: 'Failed to fetch collections',
      details: error.message
    } as any);
  }
}

/**
 * POST /admin-api/collections
 * Create a product collection
 */
export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
) {
  try {
    const productService = req.scope.resolve(Modules.PRODUCT);
    const { title, handle, metadata } = req.body as any;

    // Validate required fields
    if (!title) {
      return res.status(400).json({
        error: 'Missing required field: title'
      } as any);
    }

    // Create collection
    const collection = await productService.createProductCollections({
      title,
      handle: handle || title.toLowerCase().replace(/\s+/g, '-'),
      metadata: metadata || {},
    });

    return res.status(201).json({
      collection,
      product_collection: collection, // Alias pour compatibilité
      message: `Collection "${title}" created successfully`,
    });

  } catch (error: any) {
    console.error('[Collections API] Error creating collection:', error);
    return res.status(500).json({
      error: 'Failed to create collection',
      details: error.message
    } as any);
  }
}
