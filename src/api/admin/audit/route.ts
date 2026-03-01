/**
 * Audit Log API
 *
 * GET /admin/audit - List audit logs
 * GET /admin/audit/stats - Get audit statistics
 */

import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { authenticateUser, requirePermission } from "../../middlewares-v2";
import { listAuditLogs, getAuditStats } from "../../../lib/audit-log-storage";
import type { AuditLog, AuditAction } from "../../../types/auth";
import { PermissionResource, PermissionAction } from "../../../types/auth";

// Apply authentication + permission check
export const middlewares = [
  authenticateUser,
  requirePermission(PermissionResource.AUDIT_LOGS, PermissionAction.READ)
];

interface ListAuditLogsQueryParams {
  user_id?: string;
  action?: AuditAction;
  resource_type?: string;
  resource_id?: string;
  from_date?: string;
  to_date?: string;
  limit?: string;
  offset?: string;
}

interface ListAuditLogsResponse {
  logs: AuditLog[];
  count: number;
  total: number;
}

/**
 * GET /admin/audit
 *
 * List audit logs with filters
 */
export async function GET(
  req: MedusaRequest<never, ListAuditLogsQueryParams>,
  res: MedusaResponse<ListAuditLogsResponse>
) {
  try {
    const {
      user_id,
      action,
      resource_type,
      resource_id,
      from_date,
      to_date,
      limit,
      offset,
    } = req.query;

    const result = await listAuditLogs({
      user_id: user_id as string | undefined,
      action: action as AuditAction | undefined,
      resource_type: resource_type as string | undefined,
      resource_id: resource_id as string | undefined,
      from_date: from_date as string | undefined,
      to_date: to_date as string | undefined,
      limit: limit ? parseInt(limit as string, 10) : undefined,
      offset: offset ? parseInt(offset as string, 10) : undefined,
    });

    return res.status(200).json(result);
  } catch (error: any) {
    console.error('[Audit API] Error listing audit logs:', error);

    return res.status(500).json({
      error: 'Failed to list audit logs',
      details: error.message,
    } as any);
  }
}
