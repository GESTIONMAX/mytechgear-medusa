/**
 * Stores API - List and Create Stores
 *
 * GET /admin-api/stores - List all stores
 * POST /admin-api/stores - Create new store (typically only one exists)
 */

import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { Modules } from "@medusajs/framework/utils";
import { authenticateAdmin } from "../../middlewares";

export const middlewares = [authenticateAdmin];

/**
 * GET /admin-api/stores
 * List all stores with their details
 */
export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
) {
  try {
    const storeService = req.scope.resolve(Modules.STORE);

    // Fetch all stores
    const stores = await storeService.listStores({}, {
      relations: [],
    });

    // Medusa typically has one store, return both array and single
    return res.status(200).json({
      stores,
      store: stores[0] || null,
      count: stores.length,
    });

  } catch (error: any) {
    console.error('[Stores API] Error fetching stores:', error);

    return res.status(500).json({
      error: 'Failed to fetch stores',
      details: error.message
    } as any);
  }
}

/**
 * POST /admin-api/stores
 * Create new store (rarely used - typically only one store exists)
 */
export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
) {
  try {
    const storeService = req.scope.resolve(Modules.STORE);
    const { name, supported_currencies, default_currency_code, metadata } = req.body as any;

    // Validate required fields
    if (!name) {
      return res.status(400).json({
        error: 'Missing required field: name'
      } as any);
    }

    // Create store
    const store = await storeService.createStores({
      name,
      supported_currencies: supported_currencies || [],
      default_currency_code: default_currency_code || 'eur',
      metadata: metadata || {},
    } as any);

    return res.status(201).json({
      store,
      message: `Store "${name}" created successfully`,
    });

  } catch (error: any) {
    console.error('[Stores API] Error creating store:', error);

    return res.status(500).json({
      error: 'Failed to create store',
      details: error.message
    } as any);
  }
}
