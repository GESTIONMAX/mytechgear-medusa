/**
 * Customer Detail API - GET/PUT/DELETE customer by ID
 *
 * GET /admin-api/customers/[id] - Get customer details
 * PUT /admin-api/customers/[id] - Update customer
 * DELETE /admin-api/customers/[id] - Delete customer
 */

import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { Modules } from "@medusajs/framework/utils";
import { authenticateAdmin } from "../../../middlewares";

export const middlewares = [authenticateAdmin];

/**
 * GET /admin-api/customers/[id]
 * Get customer details by ID
 */
export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
) {
  try {
    const customerService = req.scope.resolve(Modules.CUSTOMER);
    const { id } = req.params;

    const customer = await customerService.retrieveCustomer(id, {
      relations: ['addresses', 'orders'],
    });

    if (!customer) {
      return res.status(404).json({
        error: 'Customer not found',
      });
    }

    return res.status(200).json({
      customer,
    });

  } catch (error: any) {
    console.error('[Customer Detail API] GET Error:', error);
    return res.status(500).json({
      error: 'Failed to fetch customer',
      details: error.message
    });
  }
}

/**
 * PUT /admin-api/customers/[id]
 * Update customer by ID
 */
export async function PUT(
  req: MedusaRequest,
  res: MedusaResponse
) {
  try {
    const customerService = req.scope.resolve(Modules.CUSTOMER);
    const { id } = req.params;

    const customer = await customerService.updateCustomers(id, req.body as any);

    return res.status(200).json({
      customer,
    });

  } catch (error: any) {
    console.error('[Customer Detail API] PUT Error:', error);
    return res.status(500).json({
      error: 'Failed to update customer',
      details: error.message
    });
  }
}

/**
 * DELETE /admin-api/customers/[id]
 * Delete customer by ID
 */
export async function DELETE(
  req: MedusaRequest,
  res: MedusaResponse
) {
  try {
    const customerService = req.scope.resolve(Modules.CUSTOMER);
    const { id } = req.params;

    await customerService.deleteCustomers([id]);

    return res.status(200).json({
      id,
      deleted: true,
    });

  } catch (error: any) {
    console.error('[Customer Detail API] DELETE Error:', error);
    return res.status(500).json({
      error: 'Failed to delete customer',
      details: error.message
    });
  }
}
