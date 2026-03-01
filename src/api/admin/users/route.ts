/**
 * User Management API
 *
 * GET /admin/users - List users
 * POST /admin/users - Create user
 */

import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { authenticateAdmin } from "../../middlewares";
import { createUser, listUsers } from "../../../lib/user-storage";
import { validateUserInput } from "../../../lib/auth";
import { auditUserCreate } from "../../../lib/audit-helpers";
import type { SafeUser, CreateUserInput } from "../../../types/auth";
import { UserRole, UserStatus } from "../../../types/auth";

// Apply authentication middleware
export const middlewares = [authenticateAdmin];

interface ListUsersQueryParams {
  role?: UserRole;
  status?: UserStatus;
  limit?: string;
  offset?: string;
}

interface ListUsersResponse {
  users: SafeUser[];
  count: number;
}

interface CreateUserResponse {
  user: SafeUser;
  message: string;
}

/**
 * GET /admin/users
 *
 * List all users with optional filters
 */
export async function GET(
  req: MedusaRequest<never, ListUsersQueryParams>,
  res: MedusaResponse<ListUsersResponse>
) {
  try {
    const { role, status, limit, offset } = req.query;

    const users = await listUsers({
      role: role as UserRole | undefined,
      status: status as UserStatus | undefined,
      limit: limit ? parseInt(limit as string, 10) : undefined,
      offset: offset ? parseInt(offset as string, 10) : undefined,
    });

    return res.status(200).json({
      users,
      count: users.length,
    });
  } catch (error: any) {
    console.error('[Users API] Error listing users:', error);

    return res.status(500).json({
      error: 'Failed to list users',
      details: error.message,
    } as any);
  }
}

/**
 * POST /admin/users
 *
 * Create a new user
 */
export async function POST(
  req: MedusaRequest<CreateUserInput>,
  res: MedusaResponse<CreateUserResponse>
) {
  try {
    const input = req.body;

    // Validate input
    const validation = validateUserInput(input);
    if (!validation.valid) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validation.errors,
      } as any);
    }

    // Create user
    const user = await createUser(input);

    // Audit log
    await auditUserCreate(req, user.id, user.email, user.role);

    return res.status(201).json({
      user,
      message: `User ${user.email} created successfully`,
    });
  } catch (error: any) {
    console.error('[Users API] Error creating user:', error);

    // Check if it's a validation error (duplicate email)
    try {
      const parsed = JSON.parse(error.message);
      if (parsed.errors) {
        return res.status(400).json({
          error: 'Validation failed',
          details: parsed.errors,
        } as any);
      }
    } catch {}

    return res.status(500).json({
      error: 'Failed to create user',
      details: error.message,
    } as any);
  }
}
