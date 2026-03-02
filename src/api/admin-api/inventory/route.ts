/**
 * Inventory API - List inventory items
 *
 * GET /admin-api/inventory - List all inventory items
 */

import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { Modules } from "@medusajs/framework/utils";
import { authenticateAdmin } from "../../middlewares";

export const middlewares = [authenticateAdmin];

/**
 * GET /admin-api/inventory
 * List inventory items
 */
export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
) {
  try {
    const inventoryService = req.scope.resolve(Modules.INVENTORY);

    const limit = req.query?.limit ? parseInt(req.query.limit as string) : 50;
    const offset = req.query?.offset ? parseInt(req.query.offset as string) : 0;

    const items = await inventoryService.listInventoryItems(
      {},
      {
        skip: offset,
        take: limit,
      }
    );

    const count = items.length;

    return res.status(200).json({
      inventory_items: items,
      count,
      offset,
      limit,
    });

  } catch (error: any) {
    console.error('[Inventory API] Error:', error);
    return res.status(500).json({
      error: 'Failed to fetch inventory items',
      details: error.message
    });
  }
}
