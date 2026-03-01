/**
 * Authentication - Logout API
 *
 * POST /admin/auth/logout - End user session
 */

import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { revokeSession, getSessionByToken } from "../../../lib/user-storage";
import { auditLogout } from "../../../lib/audit-helpers";

/**
 * POST /admin/auth/logout
 */
export async function POST(
  req: MedusaRequest,
  res: MedusaResponse<{ message: string }>
) {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'No session token provided',
      } as any);
    }

    const token = authHeader.substring(7);

    // Get session to audit log before revoking
    const session = await getSessionByToken(token);

    // Revoke session
    await revokeSession(token);

    // Audit log
    if (session) {
      await auditLogout(req, session.user_id);
    }

    console.log('[Auth] User logged out');

    return res.status(200).json({
      message: 'Logout successful',
    });
  } catch (error: any) {
    console.error('[Auth API] Logout error:', error);

    return res.status(500).json({
      error: 'Logout failed',
      details: error.message,
    } as any);
  }
}
