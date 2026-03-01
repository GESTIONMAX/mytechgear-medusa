/**
 * Single User Management API
 *
 * GET /admin/users/:userId - Get user
 * PUT /admin/users/:userId - Update user
 * DELETE /admin/users/:userId - Delete user
 */

import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { authenticateAdmin } from "../../../middlewares";
import { getUserById, updateUser, deleteUser } from "../../../../lib/user-storage";
import { auditUserUpdate, auditUserDelete } from "../../../../lib/audit-helpers";
import type { SafeUser, UpdateUserInput } from "../../../../types/auth";

export const middlewares = [authenticateAdmin];

/**
 * GET /admin/users/:userId
 */
export async function GET(
  req: MedusaRequest,
  res: MedusaResponse<{ user: SafeUser }>
) {
  try {
    const { userId } = req.params;

    const user = await getUserById(userId);

    if (!user) {
      return res.status(404).json({
        error: 'User not found',
      } as any);
    }

    return res.status(200).json({ user });
  } catch (error: any) {
    console.error('[Users API] Error getting user:', error);

    return res.status(500).json({
      error: 'Failed to get user',
      details: error.message,
    } as any);
  }
}

/**
 * PUT /admin/users/:userId
 */
export async function PUT(
  req: MedusaRequest<UpdateUserInput>,
  res: MedusaResponse<{ user: SafeUser; message: string }>
) {
  try {
    const { userId } = req.params;
    const input = req.body;

    const user = await updateUser(userId, input);

    // Audit log
    await auditUserUpdate(req, userId, input);

    return res.status(200).json({
      user,
      message: 'User updated successfully',
    });
  } catch (error: any) {
    console.error('[Users API] Error updating user:', error);

    // Check for validation errors
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
      error: 'Failed to update user',
      details: error.message,
    } as any);
  }
}

/**
 * DELETE /admin/users/:userId
 */
export async function DELETE(
  req: MedusaRequest,
  res: MedusaResponse<{ message: string }>
) {
  try {
    const { userId } = req.params;

    // Get user info before deleting (for audit)
    const user = await getUserById(userId);
    const userEmail = user?.email || 'unknown';

    await deleteUser(userId);

    // Audit log
    await auditUserDelete(req, userId, userEmail);

    return res.status(200).json({
      message: 'User deleted successfully',
    });
  } catch (error: any) {
    console.error('[Users API] Error deleting user:', error);

    return res.status(500).json({
      error: 'Failed to delete user',
      details: error.message,
    } as any);
  }
}
