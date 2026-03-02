/**
 * Collection Detail API - GET/PUT/DELETE collection by ID
 *
 * GET /admin-api/collections/[id] - Get collection details
 * PUT /admin-api/collections/[id] - Update collection
 * DELETE /admin-api/collections/[id] - Delete collection
 */

import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { Modules } from "@medusajs/framework/utils";
import { authenticateAdmin } from "../../../middlewares";

export const middlewares = [authenticateAdmin];

/**
 * GET /admin-api/collections/[id]
 * Get collection details by ID
 */
export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
) {
  try {
    const productService = req.scope.resolve(Modules.PRODUCT);
    const { id } = req.params;

    const collection = await productService.retrieveProductCollection(id, {
      relations: ['products'],
    });

    if (!collection) {
      return res.status(404).json({
        error: 'Collection not found',
      });
    }

    return res.status(200).json({
      collection,
    });

  } catch (error: any) {
    console.error('[Collection Detail API] GET Error:', error);
    return res.status(500).json({
      error: 'Failed to fetch collection',
      details: error.message
    });
  }
}

/**
 * PUT /admin-api/collections/[id]
 * Update collection by ID
 */
export async function PUT(
  req: MedusaRequest,
  res: MedusaResponse
) {
  try {
    const productService = req.scope.resolve(Modules.PRODUCT);
    const { id } = req.params;

    const collection = await productService.updateProductCollections(id, req.body as any);

    return res.status(200).json({
      collection,
    });

  } catch (error: any) {
    console.error('[Collection Detail API] PUT Error:', error);
    return res.status(500).json({
      error: 'Failed to update collection',
      details: error.message
    });
  }
}

/**
 * DELETE /admin-api/collections/[id]
 * Delete collection by ID
 */
export async function DELETE(
  req: MedusaRequest,
  res: MedusaResponse
) {
  try {
    const productService = req.scope.resolve(Modules.PRODUCT);
    const { id } = req.params;

    await productService.deleteProductCollections([id]);

    return res.status(200).json({
      id,
      deleted: true,
    });

  } catch (error: any) {
    console.error('[Collection Detail API] DELETE Error:', error);
    return res.status(500).json({
      error: 'Failed to delete collection',
      details: error.message
    });
  }
}
