/**
 * Inventory Export API - Export inventory data
 *
 * GET /admin-api/inventory/export - Export all inventory data as CSV
 */

import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { Modules } from "@medusajs/framework/utils";
import { authenticateAdmin } from "../../../middlewares";

export const middlewares = [authenticateAdmin];

/**
 * GET /admin-api/inventory/export
 * Export inventory data as CSV
 */
export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
) {
  try {
    const inventoryService = req.scope.resolve(Modules.INVENTORY);

    const items = await inventoryService.listInventoryItems({}, {});

    // Build CSV
    const csvRows = ['Inventory Item ID,SKU,Quantity,Location'];

    for (const item of items) {
      csvRows.push([
        item.id,
        `"${(item as any).sku || ''}"`,
        (item as any).quantity || 0,
        `"${(item as any).location_id || ''}"`,
      ].join(','));
    }

    const csv = csvRows.join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=inventory-export.csv');
    return res.status(200).send(csv);

  } catch (error: any) {
    console.error('[Inventory Export API] Error:', error);
    return res.status(500).json({
      error: 'Failed to export inventory data',
      details: error.message
    });
  }
}
