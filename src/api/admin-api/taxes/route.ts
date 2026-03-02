/**
 * Taxes API - Use Medusa services directly
 *
 * GET /admin-api/taxes - List tax rates
 * POST /admin-api/taxes - Create tax rate
 */

import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { Modules } from "@medusajs/framework/utils";
import { authenticateAdmin } from "../../middlewares";

export const middlewares = [authenticateAdmin];

/**
 * GET /admin-api/taxes
 * List all tax rates/regions
 */
export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
) {
  try {
    // In Medusa v2, taxes are managed through tax regions and rates
    // For now, return basic structure - may need to be enhanced based on actual usage

    // Try to get tax regions if available
    const taxModule = req.scope.resolve(Modules.TAX);

    if (taxModule && typeof taxModule.listTaxRegions === 'function') {
      const taxRegions = await taxModule.listTaxRegions();
      return res.status(200).json({
        tax_regions: taxRegions,
        count: taxRegions?.length || 0,
      });
    }

    // Fallback: return empty structure
    return res.status(200).json({
      tax_regions: [],
      tax_rates: [],
      count: 0,
    });

  } catch (error: any) {
    console.error('[Taxes API] Error:', error);
    return res.status(500).json({
      error: 'Failed to fetch taxes',
      details: error.message
    } as any);
  }
}

/**
 * POST /admin-api/taxes
 * Create a new tax rate/region
 */
export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
) {
  try {
    const data = req.body as any;
    const taxModule = req.scope.resolve(Modules.TAX);

    if (taxModule && typeof taxModule.createTaxRegions === 'function') {
      const taxRegion = await taxModule.createTaxRegions(data);

      console.log(`✅ [Taxes API] Created tax region`);

      return res.status(201).json({
        tax_region: taxRegion,
      });
    }

    return res.status(501).json({
      error: 'Tax creation not implemented',
      message: 'Tax module API may need configuration'
    } as any);

  } catch (error: any) {
    console.error('[Taxes API] Error creating:', error);
    return res.status(500).json({
      error: 'Failed to create tax',
      details: error.message
    } as any);
  }
}
