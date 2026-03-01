/**
 * Tax Rates API
 *
 * GET /admin/taxes - List all tax rates
 * POST /admin/taxes - Create tax rate
 */

import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { Modules } from "@medusajs/framework/utils";
import { authenticateAdmin } from "../../middlewares";
import type { CreateTaxRateInput } from "../../../types/taxes";

export const middlewares = [authenticateAdmin];

/**
 * GET /admin/taxes
 * List all tax rates
 */
export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
) {
  try {
    const taxService = req.scope.resolve(Modules.TAX);

    // Fetch all tax rates
    const taxRates = await taxService.listTaxRates({}, {
      relations: ['region'],
    });

    return res.status(200).json({
      tax_rates: taxRates,
      count: taxRates.length,
    });

  } catch (error: any) {
    console.error('[Tax API] Error fetching tax rates:', error);

    return res.status(500).json({
      error: 'Failed to fetch tax rates',
      details: error.message
    } as any);
  }
}

/**
 * POST /admin/taxes
 * Create new tax rate
 */
export async function POST(
  req: MedusaRequest<CreateTaxRateInput>,
  res: MedusaResponse
) {
  try {
    const taxService = req.scope.resolve(Modules.TAX);
    const { rate, name, code, region_id, metadata } = req.body;

    // Validate required fields
    if (typeof rate !== 'number' || !name) {
      return res.status(400).json({
        error: 'Missing required fields: rate (number), name'
      } as any);
    }

    // Validate rate range
    if (rate < 0 || rate > 100) {
      return res.status(400).json({
        error: 'Tax rate must be between 0 and 100'
      } as any);
    }

    // Create tax rate
    const taxRate = await taxService.createTaxRates({
      rate,
      name,
      code: code || name.toUpperCase().replace(/\s+/g, '-'),
      region_id,
      metadata: metadata || {},
    });

    return res.status(201).json({
      tax_rate: taxRate,
      message: `Tax rate "${name}" created successfully`,
    });

  } catch (error: any) {
    console.error('[Tax API] Error creating tax rate:', error);

    return res.status(500).json({
      error: 'Failed to create tax rate',
      details: error.message
    } as any);
  }
}
