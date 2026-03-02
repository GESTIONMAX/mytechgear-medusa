/**
 * Order Status API - Update order status
 *
 * POST /admin-api/orders/[id]/status - Update order status
 */

import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { Modules } from "@medusajs/framework/utils";
import { authenticateAdmin } from "../../../../middlewares";

export const middlewares = [authenticateAdmin];

/**
 * POST /admin-api/orders/[id]/status
 * Update order status
 */
export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
) {
  try {
    const orderService = req.scope.resolve(Modules.ORDER);
    const { id } = req.params;
    const { status } = req.body as any;

    const order = await orderService.updateOrders(id, {
      status,
    });

    return res.status(200).json({
      order,
    });

  } catch (error: any) {
    console.error('[Order Status API] Error:', error);
    return res.status(500).json({
      error: 'Failed to update order status',
      details: error.message
    });
  }
}
