/**
 * Regions API - List and Create Regions
 *
 * GET /admin/regions - List all regions
 * POST /admin/regions - Create new region
 */

import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { Modules } from "@medusajs/framework/utils";
import { authenticateAdmin } from "../../middlewares";
import type { CreateRegionInput } from "../../../types/regions";

export const middlewares = [authenticateAdmin];

/**
 * GET /admin/regions
 * List all regions with their details
 */
export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
) {
  try {
    const regionService = req.scope.resolve(Modules.REGION);

    // Fetch all regions
    const regions = await regionService.listRegions({}, {
      relations: ['countries', 'payment_providers', 'fulfillment_providers'],
    });

    return res.status(200).json({
      regions,
      count: regions.length,
    });

  } catch (error: any) {
    console.error('[Regions API] Error fetching regions:', error);

    return res.status(500).json({
      error: 'Failed to fetch regions',
      details: error.message
    } as any);
  }
}

/**
 * POST /admin/regions
 * Create new region
 */
export async function POST(
  req: MedusaRequest<CreateRegionInput>,
  res: MedusaResponse
) {
  try {
    const regionService = req.scope.resolve(Modules.REGION);
    const { name, currency_code, tax_rate, countries, metadata } = req.body;

    // Validate required fields
    if (!name || !currency_code || !countries || countries.length === 0) {
      return res.status(400).json({
        error: 'Missing required fields: name, currency_code, countries'
      } as any);
    }

    // Create region
    const region = await regionService.createRegions({
      name,
      currency_code: currency_code.toLowerCase(),
      countries: countries.map(code => ({
        iso_2: code.toLowerCase(),
        iso_3: code.toLowerCase(),
        name: code,
      })),
      tax_rate: tax_rate || 0,
      metadata: metadata || {},
    });

    return res.status(201).json({
      region,
      message: `Region "${name}" created successfully`,
    });

  } catch (error: any) {
    console.error('[Regions API] Error creating region:', error);

    return res.status(500).json({
      error: 'Failed to create region',
      details: error.message
    } as any);
  }
}
