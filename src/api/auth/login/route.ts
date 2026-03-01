/**
 * Authentication - Login API
 *
 * POST /admin/auth/login - Authenticate user
 */

import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import {
  authenticateUser,
  createSession,
  updateUserLastLogin,
} from "../../../lib/user-storage";
import { sanitizeUser, extractIpAddress, extractUserAgent } from "../../../lib/auth";
import { auditLogin } from "../../../lib/audit-helpers";
import type { LoginInput, AuthResponse } from "../../../types/auth";

/**
 * POST /admin/auth/login
 */
export async function POST(
  req: MedusaRequest<LoginInput>,
  res: MedusaResponse<AuthResponse>
) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: 'Email and password are required',
      } as any);
    }

    // Authenticate user
    const { user, valid } = await authenticateUser(email, password);

    if (!valid || !user) {
      return res.status(401).json({
        error: 'Invalid email or password',
      } as any);
    }

    // Create session
    const ipAddress = extractIpAddress(req);
    const userAgent = extractUserAgent(req);
    const session = await createSession(user.id, ipAddress, userAgent);

    // Update last login
    await updateUserLastLogin(user.id);

    // Audit log
    await auditLogin(req, user.id, user.email, true);

    console.log(`[Auth] User logged in: ${user.email}`);

    return res.status(200).json({
      user: sanitizeUser(user),
      session: {
        token: session.token,
        expires_at: session.expires_at,
      },
      message: 'Login successful',
    });
  } catch (error: any) {
    console.error('[Auth API] Login error:', error);

    return res.status(500).json({
      error: 'Login failed',
      details: error.message,
    } as any);
  }
}
