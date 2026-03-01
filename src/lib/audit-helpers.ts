/**
 * Audit Log Helper Functions
 *
 * Utilities to easily add audit logs from route handlers.
 */

import type { MedusaRequest } from "@medusajs/framework/http";
import { createAuditLog } from "./audit-log-storage";
import { extractIpAddress, extractUserAgent } from "./auth";
import type { AuditAction, CreateAuditLogInput } from "../types/auth";

/**
 * Create audit log from request context
 *
 * Automatically extracts user_id, ip_address, user_agent from request
 */
export async function auditLog(
  req: MedusaRequest,
  action: AuditAction,
  resource_type: string,
  resource_id?: string,
  changes?: Record<string, any>,
  metadata?: Record<string, any>
): Promise<void> {
  try {
    const user = (req as any).user;

    if (!user) {
      console.warn('[Audit Helper] No user in request, skipping audit log');
      return;
    }

    const input: CreateAuditLogInput = {
      user_id: user.id,
      action,
      resource_type,
      resource_id,
      changes,
      metadata,
      ip_address: extractIpAddress(req),
      user_agent: extractUserAgent(req),
    };

    await createAuditLog(input);
  } catch (error) {
    // Don't throw - audit logging should not block operations
    console.error('[Audit Helper] Failed to create audit log:', error);
  }
}

/**
 * Create audit log for user login
 */
export async function auditLogin(
  req: MedusaRequest,
  userId: string,
  email: string,
  success: boolean = true
): Promise<void> {
  try {
    await createAuditLog({
      user_id: userId,
      action: 'user.login' as AuditAction,
      resource_type: 'session',
      metadata: {
        email,
        success,
      },
      ip_address: extractIpAddress(req),
      user_agent: extractUserAgent(req),
    });
  } catch (error) {
    console.error('[Audit Helper] Failed to audit login:', error);
  }
}

/**
 * Create audit log for user logout
 */
export async function auditLogout(
  req: MedusaRequest,
  userId: string
): Promise<void> {
  try {
    await createAuditLog({
      user_id: userId,
      action: 'user.logout' as AuditAction,
      resource_type: 'session',
      ip_address: extractIpAddress(req),
      user_agent: extractUserAgent(req),
    });
  } catch (error) {
    console.error('[Audit Helper] Failed to audit logout:', error);
  }
}

/**
 * Create audit log for user creation
 */
export async function auditUserCreate(
  req: MedusaRequest,
  newUserId: string,
  newUserEmail: string,
  newUserRole: string
): Promise<void> {
  await auditLog(
    req,
    'user.create' as AuditAction,
    'user',
    newUserId,
    {
      email: newUserEmail,
      role: newUserRole,
    }
  );
}

/**
 * Create audit log for user update
 */
export async function auditUserUpdate(
  req: MedusaRequest,
  userId: string,
  changes: Record<string, any>
): Promise<void> {
  await auditLog(
    req,
    'user.update' as AuditAction,
    'user',
    userId,
    changes
  );
}

/**
 * Create audit log for user deletion
 */
export async function auditUserDelete(
  req: MedusaRequest,
  userId: string,
  userEmail: string
): Promise<void> {
  await auditLog(
    req,
    'user.delete' as AuditAction,
    'user',
    userId,
    { email: userEmail }
  );
}

/**
 * Create audit log for price changes
 */
export async function auditPriceChange(
  req: MedusaRequest,
  variantId: string,
  currencyCode: string,
  oldAmount: number | null,
  newAmount: number
): Promise<void> {
  await auditLog(
    req,
    'price.update' as AuditAction,
    'price',
    variantId,
    {
      currency_code: currencyCode,
      old_amount: oldAmount,
      new_amount: newAmount,
    }
  );
}

/**
 * Create audit log for inventory adjustments
 */
export async function auditInventoryAdjust(
  req: MedusaRequest,
  variantId: string,
  locationId: string,
  oldQuantity: number,
  newQuantity: number,
  reason?: string
): Promise<void> {
  await auditLog(
    req,
    'inventory.adjust' as AuditAction,
    'inventory',
    variantId,
    {
      location_id: locationId,
      old_quantity: oldQuantity,
      new_quantity: newQuantity,
    },
    { reason }
  );
}

/**
 * Create audit log for order actions
 */
export async function auditOrderAction(
  req: MedusaRequest,
  action: 'order.create' | 'order.update' | 'order.cancel' | 'order.fulfill' | 'order.refund',
  orderId: string,
  changes?: Record<string, any>,
  metadata?: Record<string, any>
): Promise<void> {
  await auditLog(
    req,
    action as AuditAction,
    'order',
    orderId,
    changes,
    metadata
  );
}

/**
 * Create audit log for product/variant actions
 */
export async function auditProductAction(
  req: MedusaRequest,
  action: 'product.create' | 'product.update' | 'product.delete' | 'product.publish',
  productId: string,
  changes?: Record<string, any>
): Promise<void> {
  await auditLog(
    req,
    action as AuditAction,
    'product',
    productId,
    changes
  );
}

/**
 * Create audit log for settings changes
 */
export async function auditSettingsChange(
  req: MedusaRequest,
  settingKey: string,
  oldValue: any,
  newValue: any
): Promise<void> {
  await auditLog(
    req,
    'settings.update' as AuditAction,
    'settings',
    settingKey,
    {
      old_value: oldValue,
      new_value: newValue,
    }
  );
}
