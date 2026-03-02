/**
 * Customer Addresses API - Manage customer addresses
 *
 * GET /admin-api/customers/[id]/addresses - List customer addresses
 * POST /admin-api/customers/[id]/addresses - Add address to customer
 */

import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { Modules } from "@medusajs/framework/utils";
import { authenticateAdmin } from "../../../../middlewares";

export const middlewares = [authenticateAdmin];

/**
 * GET /admin-api/customers/[id]/addresses
 * List addresses for a customer
 */
export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
) {
  try {
    const customerService = req.scope.resolve(Modules.CUSTOMER);
    const { id } = req.params;

    const customer = await customerService.retrieveCustomer(id, {
      relations: ['addresses'],
    });

    if (!customer) {
      return res.status(404).json({
        error: 'Customer not found',
      });
    }

    return res.status(200).json({
      addresses: customer.addresses || [],
    });

  } catch (error: any) {
    console.error('[Customer Addresses API] GET Error:', error);
    return res.status(500).json({
      error: 'Failed to fetch customer addresses',
      details: error.message
    });
  }
}

/**
 * POST /admin-api/customers/[id]/addresses
 * Add an address to a customer
 */
export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
) {
  try {
    const customerService = req.scope.resolve(Modules.CUSTOMER);
    const { id } = req.params;

    const address = await customerService.createCustomerAddresses({
      customer_id: id,
      ...(req.body as any),
    });

    return res.status(201).json({
      address,
    });

  } catch (error: any) {
    console.error('[Customer Addresses API] POST Error:', error);
    return res.status(500).json({
      error: 'Failed to create customer address',
      details: error.message
    });
  }
}
