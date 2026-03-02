/**
 * Order Detail API - GET/PUT order by ID
 *
 * GET /admin-api/orders/[id] - Get order details
 * PUT /admin-api/orders/[id] - Update order
 */

import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { Modules } from "@medusajs/framework/utils";
import { authenticateAdmin } from "../../../middlewares";

export const middlewares = [authenticateAdmin];

/**
 * GET /admin-api/orders/[id]
 * Get order details by ID
 */
export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
) {
  try {
    const orderService = req.scope.resolve(Modules.ORDER);
    const { id } = req.params;

    const order = await orderService.retrieveOrder(id, {
      relations: ['items', 'customer', 'shipping_address', 'billing_address', 'payment', 'fulfillment'],
    });

    if (!order) {
      return res.status(404).json({
        error: 'Order not found',
      });
    }

    return res.status(200).json({
      order,
    });

  } catch (error: any) {
    console.error('[Order Detail API] GET Error:', error);
    return res.status(500).json({
      error: 'Failed to fetch order',
      details: error.message
    });
  }
}

/**
 * PUT /admin-api/orders/[id]
 * Update order by ID
 */
export async function PUT(
  req: MedusaRequest,
  res: MedusaResponse
) {
  try {
    const orderService = req.scope.resolve(Modules.ORDER);
    const { id } = req.params;

    const order = await orderService.updateOrders(id, req.body as any);

    return res.status(200).json({
      order,
    });

  } catch (error: any) {
    console.error('[Order Detail API] PUT Error:', error);
    return res.status(500).json({
      error: 'Failed to update order',
      details: error.message
    });
  }
}
