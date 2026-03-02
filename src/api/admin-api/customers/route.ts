/**
 * Customers API - Use Medusa services directly
 *
 * GET /admin-api/customers - List customers using Medusa service
 */

import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { Modules } from "@medusajs/framework/utils";
import { authenticateAdmin } from "../../middlewares";

export const middlewares = [authenticateAdmin];

/**
 * GET /admin-api/customers
 * List customers using Medusa service
 */
export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
) {
  try {
    const customerService = req.scope.resolve(Modules.CUSTOMER);

    // Parse query params
    const limit = req.query?.limit ? parseInt(req.query.limit as string) : 15;
    const offset = req.query?.offset ? parseInt(req.query.offset as string) : 0;

    // Fetch customers
    const [customers, count] = await customerService.listAndCountCustomers(
      {},
      {
        skip: offset,
        take: limit,
      }
    );

    return res.status(200).json({
      customers,
      count,
      offset,
      limit,
    });

  } catch (error: any) {
    console.error('[Customers API] Error:', error);
    return res.status(500).json({
      error: 'Failed to fetch customers',
      details: error.message
    } as any);
  }
}
