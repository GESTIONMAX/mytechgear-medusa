/**
 * Audit Stats API
 *
 * GET /admin/audit/stats - Get audit statistics
 */

import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { authenticateUser, requirePermission } from "../../../middlewares-v2";
import { getAuditStats } from "../../../../lib/audit-log-storage";
import { PermissionResource, PermissionAction } from "../../../../types/auth";

export const middlewares = [
  authenticateUser,
  requirePermission(PermissionResource.AUDIT_LOGS, PermissionAction.READ)
];

/**
 * GET /admin/audit/stats
 */
export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
) {
  try {
    const stats = await getAuditStats();

    return res.status(200).json(stats);
  } catch (error: any) {
    console.error('[Audit API] Error getting audit stats:', error);

    return res.status(500).json({
      error: 'Failed to get audit stats',
      details: error.message,
    } as any);
  }
}
