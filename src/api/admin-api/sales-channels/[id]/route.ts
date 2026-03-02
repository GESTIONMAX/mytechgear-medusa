/**
 * Single Sales Channel API - Use Medusa services directly
 *
 * GET /admin-api/sales-channels/:id - Get single sales channel
 * POST /admin-api/sales-channels/:id - Update sales channel
 * DELETE /admin-api/sales-channels/:id - Delete sales channel
 */

import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { Modules } from "@medusajs/framework/utils";
import { authenticateAdmin } from "../../../middlewares";

export const middlewares = [authenticateAdmin];

/**
 * GET /admin-api/sales-channels/:id
 * Get single sales channel
 */
export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
) {
  try {
    const salesChannelService = req.scope.resolve(Modules.SALES_CHANNEL);
    const { id } = req.params;

    // Fetch single sales channel
    const salesChannel = await salesChannelService.retrieveSalesChannel(id);

    return res.status(200).json({
      sales_channel: salesChannel,
    });

  } catch (error: any) {
    console.error('[Sales Channel API] Error fetching channel:', error);

    if (error.message?.includes('not found')) {
      return res.status(404).json({
        error: 'Sales channel not found'
      } as any);
    }

    return res.status(500).json({
      error: 'Failed to fetch sales channel',
      details: error.message
    } as any);
  }
}

/**
 * POST /admin-api/sales-channels/:id
 * Update sales channel
 */
export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
) {
  try {
    const salesChannelService = req.scope.resolve(Modules.SALES_CHANNEL);
    const { id } = req.params;
    const updateData = req.body;

    // Update sales channel
    const salesChannel = await salesChannelService.updateSalesChannels(id, updateData);

    return res.status(200).json({
      sales_channel: salesChannel,
      message: 'Sales channel updated successfully',
    });

  } catch (error: any) {
    console.error('[Sales Channel API] Error updating channel:', error);

    if (error.message?.includes('not found')) {
      return res.status(404).json({
        error: 'Sales channel not found'
      } as any);
    }

    return res.status(500).json({
      error: 'Failed to update sales channel',
      details: error.message
    } as any);
  }
}

/**
 * DELETE /admin-api/sales-channels/:id
 * Delete sales channel
 */
export async function DELETE(
  req: MedusaRequest,
  res: MedusaResponse
) {
  try {
    const salesChannelService = req.scope.resolve(Modules.SALES_CHANNEL);
    const { id } = req.params;

    // Delete sales channel
    await salesChannelService.deleteSalesChannels(id);

    return res.status(200).json({
      id,
      deleted: true,
      message: 'Sales channel deleted successfully',
    });

  } catch (error: any) {
    console.error('[Sales Channel API] Error deleting channel:', error);

    if (error.message?.includes('not found')) {
      return res.status(404).json({
        error: 'Sales channel not found'
      } as any);
    }

    return res.status(500).json({
      error: 'Failed to delete sales channel',
      details: error.message
    } as any);
  }
}
