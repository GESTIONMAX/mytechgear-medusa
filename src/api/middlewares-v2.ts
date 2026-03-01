/**
 * Authentication Middlewares V2
 *
 * New multi-user authentication system with sessions and RBAC.
 */

import type { MedusaRequest, MedusaResponse, MedusaNextFunction } from "@medusajs/framework/http";
import {
  getSessionByToken,
  getUserById,
  updateSessionActivity,
} from "../lib/user-storage";
import { hasPermission } from "../types/auth";
import type { PermissionResource, PermissionAction, UserRole } from "../types/auth";

/**
 * Authenticate user via session token
 *
 * Adds req.user to request object if authentication succeeds
 */
export async function authenticateUser(
  req: MedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction
) {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'No authentication token provided',
      } as any);
    }

    const token = authHeader.substring(7);

    // Get session
    const session = await getSessionByToken(token);

    if (!session) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid or expired session',
      } as any);
    }

    // Get user
    const user = await getUserById(session.user_id);

    if (!user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'User not found',
      } as any);
    }

    // Attach user to request
    (req as any).user = user;
    (req as any).session = session;

    // Update session activity
    await updateSessionActivity(token);

    next();
  } catch (error: any) {
    console.error('[Auth Middleware] Error:', error);

    return res.status(500).json({
      error: 'Authentication error',
      details: error.message,
    } as any);
  }
}

/**
 * Check if user has required permission
 *
 * Usage: requirePermission(PermissionResource.PRODUCTS, PermissionAction.CREATE)
 */
export function requirePermission(
  resource: PermissionResource,
  action: PermissionAction
) {
  return async (
    req: MedusaRequest,
    res: MedusaResponse,
    next: MedusaNextFunction
  ) => {
    const user = (req as any).user;

    if (!user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'User not authenticated',
      } as any);
    }

    const allowed = hasPermission(user.role as UserRole, resource, action);

    if (!allowed) {
      return res.status(403).json({
        error: 'Forbidden',
        message: `You don't have permission to ${action} ${resource}`,
      } as any);
    }

    next();
  };
}

/**
 * Check if user has required role
 *
 * Usage: requireRole(UserRole.ADMIN)
 */
export function requireRole(...roles: UserRole[]) {
  return async (
    req: MedusaRequest,
    res: MedusaResponse,
    next: MedusaNextFunction
  ) => {
    const user = (req as any).user;

    if (!user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'User not authenticated',
      } as any);
    }

    const allowed = roles.includes(user.role as UserRole);

    if (!allowed) {
      return res.status(403).json({
        error: 'Forbidden',
        message: `This action requires one of these roles: ${roles.join(', ')}`,
      } as any);
    }

    next();
  };
}
