/**
 * Pricing Export API - Export pricing data
 *
 * GET /admin-api/pricing/export - Export all pricing data as CSV
 */

import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { Modules } from "@medusajs/framework/utils";
import { authenticateAdmin } from "../../../middlewares";

export const middlewares = [authenticateAdmin];

/**
 * GET /admin-api/pricing/export
 * Export pricing data as CSV
 */
export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
) {
  try {
    const productService = req.scope.resolve(Modules.PRODUCT);

    // Fetch all products with variants and prices
    const products = await productService.listProducts(
      {},
      {
        relations: ['variants', 'variants.prices'],
      }
    );

    // Build CSV
    const csvRows = ['Product ID,Product Title,Variant ID,Variant Title,Currency,Amount'];

    for (const product of products) {
      for (const variant of product.variants || []) {
        for (const price of (variant as any).prices || []) {
          csvRows.push([
            product.id,
            `"${product.title}"`,
            variant.id,
            `"${variant.title}"`,
            price.currency_code,
            price.amount,
          ].join(','));
        }
      }
    }

    const csv = csvRows.join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=pricing-export.csv');
    return res.status(200).send(csv);

  } catch (error: any) {
    console.error('[Pricing Export API] Error:', error);
    return res.status(500).json({
      error: 'Failed to export pricing data',
      details: error.message
    });
  }
}
