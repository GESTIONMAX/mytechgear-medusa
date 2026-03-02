/**
 * Sales Channels API - Use Medusa services directly
 *
 * GET /admin-api/sales-channels - List sales channels using Medusa service
 */

import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { Modules } from "@medusajs/framework/utils";
import { authenticateAdmin } from "../../middlewares";

export const middlewares = [authenticateAdmin];

/**
 * GET /admin-api/sales-channels
 * List sales channels using Medusa service
 */
export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
) {
  try {
    const salesChannelService = req.scope.resolve(Modules.SALES_CHANNEL);

    // Parse query params
    const limit = req.query?.limit ? parseInt(req.query.limit as string) : 100;
    const offset = req.query?.offset ? parseInt(req.query.offset as string) : 0;

    // Fetch sales channels
    const [salesChannels, count] = await salesChannelService.listAndCountSalesChannels(
      {},
      {
        skip: offset,
        take: limit,
      }
    );

    return res.status(200).json({
      sales_channels: salesChannels,
      count,
      offset,
      limit,
    });

  } catch (error: any) {
    console.error('[Sales Channels API] Error:', error);
    return res.status(500).json({
      error: 'Failed to fetch sales channels',
      details: error.message
    } as any);
  }
}
