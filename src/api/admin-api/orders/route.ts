/**
 * Orders API - Use Medusa services directly
 *
 * GET /admin-api/orders - List orders using Medusa service
 */

import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { Modules } from "@medusajs/framework/utils";
import { authenticateAdmin } from "../../middlewares";

export const middlewares = [authenticateAdmin];

/**
 * GET /admin-api/orders
 * List orders using Medusa service
 */
export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
) {
  try {
    const orderService = req.scope.resolve(Modules.ORDER);

    // Parse query params
    const limit = req.query?.limit ? parseInt(req.query.limit as string) : 15;
    const offset = req.query?.offset ? parseInt(req.query.offset as string) : 0;
    const status = req.query?.status as string | undefined;

    // Build filters
    const filters: any = {};
    if (status) {
      filters.status = status;
    }

    // Fetch orders
    const [orders, count] = await orderService.listAndCountOrders(
      filters,
      {
        skip: offset,
        take: limit,
      }
    );

    return res.status(200).json({
      orders,
      count,
      offset,
      limit,
    });

  } catch (error: any) {
    console.error('[Orders API] Error:', error);
    return res.status(500).json({
      error: 'Failed to fetch orders',
      details: error.message
    } as any);
  }
}
