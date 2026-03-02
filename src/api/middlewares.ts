/**
 * API Middlewares
 *
 * Authentication and authorization middleware for admin routes
 */

import { MedusaRequest, MedusaResponse, MedusaNextFunction } from "@medusajs/framework/http";
import { getSessionByToken, getUserById } from "../lib/user-storage";

/**
 * Admin authentication middleware
 *
 * Validates Bearer token from Authorization header against user sessions
 * Uses the multi-user authentication system
 *
 * Usage in route files:
 *   import { authenticateAdmin } from "../../middlewares";
 *   export const middlewares = [authenticateAdmin];
 *
 * @param req Medusa request
 * @param res Medusa response
 * @param next Next middleware function
 */
export async function authenticateAdmin(
  req: MedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction
) {
  try {
    console.log('🔒 [Auth Middleware] Executing for:', req.method, req.url);

    // Extract token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      console.log('🔒 [Auth Middleware] Missing Authorization header');
      return res.status(401).json({
        error: 'Unauthorized',
        details: 'Missing Authorization header'
      });
    }

    console.log('🔒 [Auth Middleware] Token present:', authHeader.substring(0, 30) + '...');

    // Expect format: "Bearer <token>"
    const parts = authHeader.split(' ');

    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return res.status(401).json({
        error: 'Unauthorized',
        details: 'Invalid Authorization header format. Expected: Bearer <token>'
      });
    }

    const token = parts[1];

    // Validate session token
    const session = await getSessionByToken(token);

    if (!session) {
      return res.status(401).json({
        error: 'Unauthorized',
        details: 'Invalid or expired session'
      });
    }

    // Get user
    const user = await getUserById(session.user_id);

    if (!user) {
      return res.status(401).json({
        error: 'Unauthorized',
        details: 'User not found'
      });
    }

    // Check if user is active
    if (user.status !== 'active') {
      return res.status(403).json({
        error: 'Forbidden',
        details: 'User account is not active'
      });
    }

    // Attach user to request for use in route handlers
    (req as any).user = user;

    // Token valid, proceed to next middleware/route handler
    next();

  } catch (error: any) {
    console.error('[Auth Middleware] Error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
}
