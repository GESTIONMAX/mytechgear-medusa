/**
 * Authentication - Current User API
 *
 * GET /admin/auth/me - Get current user info
 */

import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import {
  getSessionByToken,
  getUserById,
  updateSessionActivity,
} from "../../../../lib/user-storage";
import type { SafeUser } from "../../../../types/auth";

/**
 * GET /admin/auth/me
 */
export async function GET(
  req: MedusaRequest,
  res: MedusaResponse<{ user: SafeUser }>
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

    // Get session
    const session = await getSessionByToken(token);
    if (!session) {
      return res.status(401).json({
        error: 'Invalid or expired session',
      } as any);
    }

    // Get user
    const user = await getUserById(session.user_id);
    if (!user) {
      return res.status(401).json({
        error: 'User not found',
      } as any);
    }

    // Update session activity
    await updateSessionActivity(token);

    return res.status(200).json({ user });
  } catch (error: any) {
    console.error('[Auth API] Get current user error:', error);

    return res.status(500).json({
      error: 'Failed to get current user',
      details: error.message,
    } as any);
  }
}
