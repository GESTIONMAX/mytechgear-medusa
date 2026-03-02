/**
 * Order Fulfillment API - Manage order fulfillment
 *
 * POST /admin-api/orders/[id]/fulfillment - Create fulfillment for order
 */

import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { Modules } from "@medusajs/framework/utils";
import { authenticateAdmin } from "../../../../middlewares";

export const middlewares = [authenticateAdmin];

/**
 * POST /admin-api/orders/[id]/fulfillment
 * Create fulfillment for an order
 */
export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
) {
  try {
    const fulfillmentService = req.scope.resolve(Modules.FULFILLMENT);
    const { id } = req.params;

    const fulfillment = await fulfillmentService.createFulfillment({
      order_id: id,
      ...(req.body as any),
    });

    return res.status(201).json({
      fulfillment,
    });

  } catch (error: any) {
    console.error('[Order Fulfillment API] Error:', error);
    return res.status(500).json({
      error: 'Failed to create order fulfillment',
      details: error.message
    });
  }
}
