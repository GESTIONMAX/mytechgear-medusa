/**
 * Shipping Options API
 *
 * GET /admin/shipping - List all shipping options
 * POST /admin/shipping - Create shipping option
 */

import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { Modules } from "@medusajs/framework/utils";
import { authenticateAdmin } from "../../middlewares";
import type { CreateShippingOptionInput } from "../../../types/regions";

export const middlewares = [authenticateAdmin];

/**
 * GET /admin/shipping
 * List all shipping options
 */
export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
) {
  try {
    const fulfillmentService = req.scope.resolve(Modules.FULFILLMENT);

    // Fetch all shipping options
    const shippingOptions = await fulfillmentService.listShippingOptions({}, {
      relations: ['region', 'shipping_profile'],
    });

    return res.status(200).json({
      shipping_options: shippingOptions,
      count: shippingOptions.length,
    });

  } catch (error: any) {
    console.error('[Shipping API] Error fetching shipping options:', error);

    return res.status(500).json({
      error: 'Failed to fetch shipping options',
      details: error.message
    } as any);
  }
}

/**
 * POST /admin/shipping
 * Create new shipping option
 */
export async function POST(
  req: MedusaRequest<CreateShippingOptionInput>,
  res: MedusaResponse
) {
  try {
    const fulfillmentService = req.scope.resolve(Modules.FULFILLMENT);
    const { name, region_id, price_type, amount, metadata } = req.body;

    // Validate required fields
    if (!name || !region_id || !price_type) {
      return res.status(400).json({
        error: 'Missing required fields: name, region_id, price_type'
      } as any);
    }

    // Create shipping option
    const shippingOption = await fulfillmentService.createShippingOptions({
      name,
      region_id,
      price_type,
      amount: amount || 0,
      metadata: metadata || {},
    });

    return res.status(201).json({
      shipping_option: shippingOption,
      message: `Shipping option "${name}" created successfully`,
    });

  } catch (error: any) {
    console.error('[Shipping API] Error creating shipping option:', error);

    return res.status(500).json({
      error: 'Failed to create shipping option',
      details: error.message
    } as any);
  }
}
