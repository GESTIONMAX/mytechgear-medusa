/**
 * Store API - Individual Store Operations
 *
 * GET /admin-api/stores/:id - Get store details
 * POST /admin-api/stores/:id - Update store (including metadata)
 */

import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { Modules } from "@medusajs/framework/utils";
import { authenticateAdmin } from "../../../middlewares";

export const middlewares = [authenticateAdmin];

/**
 * GET /admin-api/stores/:id
 * Get store details by ID
 */
export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
) {
  try {
    const storeService = req.scope.resolve(Modules.STORE);
    const { id } = req.params;

    // Fetch store by ID
    const store = await storeService.retrieveStore(id, {
      relations: [],
    });

    if (!store) {
      return res.status(404).json({
        error: 'Store not found'
      } as any);
    }

    return res.status(200).json({
      store,
    });

  } catch (error: any) {
    console.error(`[Stores API] Error fetching store ${req.params.id}:`, error);

    return res.status(500).json({
      error: 'Failed to fetch store',
      details: error.message
    } as any);
  }
}

/**
 * POST /admin-api/stores/:id
 * Update store details (including metadata)
 */
export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
) {
  try {
    const storeService = req.scope.resolve(Modules.STORE);
    const { id } = req.params;

    // Update store
    const updatedStore = await storeService.updateStores(id, req.body as any);

    return res.status(200).json({
      store: updatedStore,
      message: 'Store updated successfully',
    });

  } catch (error: any) {
    console.error(`[Stores API] Error updating store ${req.params.id}:`, error);

    return res.status(500).json({
      error: 'Failed to update store',
      details: error.message
    } as any);
  }
}
