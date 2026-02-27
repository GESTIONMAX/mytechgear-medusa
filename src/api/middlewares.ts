/**
 * API Middlewares
 *
 * Authentication and authorization middleware for admin routes
 */

import { MedusaRequest, MedusaResponse, MedusaNextFunction } from "@medusajs/framework/http";

/**
 * Admin authentication middleware
 *
 * Validates Bearer token from Authorization header
 * Token should match ADMIN_API_TOKEN environment variable
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
    const adminToken = process.env.ADMIN_API_TOKEN;

    // Check if token is configured
    if (!adminToken || adminToken.trim() === '') {
      return res.status(500).json({
        error: 'Admin API token not configured',
        details: 'Set ADMIN_API_TOKEN environment variable'
      });
    }

    // Extract token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        error: 'Unauthorized',
        details: 'Missing Authorization header'
      });
    }

    // Expect format: "Bearer <token>"
    const parts = authHeader.split(' ');

    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return res.status(401).json({
        error: 'Unauthorized',
        details: 'Invalid Authorization header format. Expected: Bearer <token>'
      });
    }

    const providedToken = parts[1];

    // Validate token
    if (providedToken !== adminToken) {
      return res.status(401).json({
        error: 'Unauthorized',
        details: 'Invalid token'
      });
    }

    // Token valid, proceed to next middleware/route handler
    next();

  } catch (error: any) {
    return res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
}
