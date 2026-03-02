/**
 * Region Detail API - GET/PUT region by ID
 *
 * GET /admin-api/regions/[regionId] - Get region details
 * PUT /admin-api/regions/[regionId] - Update region
 */

import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { Modules } from "@medusajs/framework/utils";
import { authenticateAdmin } from "../../../middlewares";

export const middlewares = [authenticateAdmin];

/**
 * GET /admin-api/regions/[regionId]
 * Get region details by ID
 */
export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
) {
  try {
    const regionService = req.scope.resolve(Modules.REGION);
    const { regionId } = req.params;

    const region = await regionService.retrieveRegion(regionId, {
      relations: ['countries', 'payment_providers', 'fulfillment_providers'],
    });

    if (!region) {
      return res.status(404).json({
        error: 'Region not found',
      });
    }

    return res.status(200).json({
      region,
    });

  } catch (error: any) {
    console.error('[Region Detail API] GET Error:', error);
    return res.status(500).json({
      error: 'Failed to fetch region',
      details: error.message
    });
  }
}

/**
 * PUT /admin-api/regions/[regionId]
 * Update region by ID
 */
export async function PUT(
  req: MedusaRequest,
  res: MedusaResponse
) {
  try {
    const regionService = req.scope.resolve(Modules.REGION);
    const { regionId } = req.params;

    const region = await regionService.updateRegions(regionId, req.body as any);

    return res.status(200).json({
      region,
    });

  } catch (error: any) {
    console.error('[Region Detail API] PUT Error:', error);
    return res.status(500).json({
      error: 'Failed to update region',
      details: error.message
    });
  }
}
