/**
 * Region CRUD API - Single Region Operations
 *
 * GET /admin/regions/:regionId - Get region details
 * POST /admin/regions/:regionId - Update region
 * DELETE /admin/regions/:regionId - Delete region
 */

import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { Modules } from "@medusajs/framework/utils";
import { authenticateAdmin } from "../../../middlewares";
import type { UpdateRegionInput } from "../../../../types/regions";

export const middlewares = [authenticateAdmin];

/**
 * GET /admin/regions/:regionId
 * Get single region with details
 */
export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
) {
  try {
    const regionService = req.scope.resolve(Modules.REGION);
    const { regionId } = req.params;

    if (!regionId) {
      return res.status(400).json({
        error: 'Missing required parameter: regionId'
      } as any);
    }

    const region = await regionService.retrieveRegion(regionId, {
      relations: ['countries', 'payment_providers', 'fulfillment_providers'],
    });

    if (!region) {
      return res.status(404).json({
        error: 'Region not found',
        details: `No region with ID: ${regionId}`
      } as any);
    }

    return res.status(200).json({ region });

  } catch (error: any) {
    console.error('[Regions API] Error fetching region:', error);

    return res.status(500).json({
      error: 'Failed to fetch region',
      details: error.message
    } as any);
  }
}

/**
 * POST /admin/regions/:regionId
 * Update region
 */
export async function POST(
  req: MedusaRequest<UpdateRegionInput>,
  res: MedusaResponse
) {
  try {
    const regionService = req.scope.resolve(Modules.REGION);
    const { regionId } = req.params;
    const updates = req.body;

    if (!regionId) {
      return res.status(400).json({
        error: 'Missing required parameter: regionId'
      } as any);
    }

    // Update region
    const region = await regionService.updateRegions(regionId, updates);

    return res.status(200).json({
      region,
      message: 'Region updated successfully',
    });

  } catch (error: any) {
    console.error('[Regions API] Error updating region:', error);

    return res.status(500).json({
      error: 'Failed to update region',
      details: error.message
    } as any);
  }
}

/**
 * DELETE /admin/regions/:regionId
 * Delete region
 */
export async function DELETE(
  req: MedusaRequest,
  res: MedusaResponse
) {
  try {
    const regionService = req.scope.resolve(Modules.REGION);
    const { regionId } = req.params;

    if (!regionId) {
      return res.status(400).json({
        error: 'Missing required parameter: regionId'
      } as any);
    }

    await regionService.deleteRegions(regionId);

    return res.status(200).json({
      deleted: true,
      region_id: regionId,
      message: 'Region deleted successfully',
    });

  } catch (error: any) {
    console.error('[Regions API] Error deleting region:', error);

    return res.status(500).json({
      error: 'Failed to delete region',
      details: error.message
    } as any);
  }
}
