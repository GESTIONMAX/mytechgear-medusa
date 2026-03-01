/**
 * Auth & User Management Type Definitions
 *
 * Complete type system for user authentication, sessions, RBAC, and audit logging.
 */

/**
 * User Roles
 */
export enum UserRole {
  ADMIN = 'admin',        // Full access to everything
  EDITOR = 'editor',      // Can edit products, prices, inventory
  VIEWER = 'viewer',      // Read-only access
  SUPPORT = 'support',    // Can manage orders, customers
}

/**
 * User Status
 */
export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  PENDING = 'pending',
}

/**
 * User Entity
 */
export interface User {
  id: string
  email: string
  password_hash: string
  first_name?: string
  last_name?: string
  role: UserRole
  status: UserStatus
  avatar_url?: string
  last_login_at?: string
  metadata?: Record<string, any>
  created_at: string
  updated_at: string
  deleted_at?: string
}

/**
 * User creation input
 */
export interface CreateUserInput {
  email: string
  password: string
  first_name?: string
  last_name?: string
  role: UserRole
  status?: UserStatus
  metadata?: Record<string, any>
}

/**
 * User update input
 */
export interface UpdateUserInput {
  email?: string
  password?: string
  first_name?: string
  last_name?: string
  role?: UserRole
  status?: UserStatus
  avatar_url?: string
  metadata?: Record<string, any>
}

/**
 * User without sensitive data (for API responses)
 */
export type SafeUser = Omit<User, 'password_hash'>

/**
 * Session Entity
 */
export interface Session {
  id: string
  user_id: string
  token: string
  ip_address?: string
  user_agent?: string
  expires_at: string
  created_at: string
  last_activity_at: string
}

/**
 * Auth Response (login success)
 */
export interface AuthResponse {
  user: SafeUser
  session: {
    token: string
    expires_at: string
  }
  message: string
}

/**
 * Login Input
 */
export interface LoginInput {
  email: string
  password: string
}

/**
 * Password Change Input
 */
export interface ChangePasswordInput {
  current_password: string
  new_password: string
}

/**
 * Password Reset Input
 */
export interface ResetPasswordInput {
  email: string
}

/**
 * Permission Resource
 */
export enum PermissionResource {
  PRODUCTS = 'products',
  VARIANTS = 'variants',
  PRICING = 'pricing',
  INVENTORY = 'inventory',
  ORDERS = 'orders',
  CUSTOMERS = 'customers',
  COLLECTIONS = 'collections',
  CATEGORIES = 'categories',
  REGIONS = 'regions',
  SHIPPING = 'shipping',
  TAXES = 'taxes',
  USERS = 'users',
  SETTINGS = 'settings',
  API_KEYS = 'api_keys',
  AUDIT_LOGS = 'audit_logs',
  SALES_CHANNELS = 'sales_channels',
  WEBHOOKS = 'webhooks',
}

/**
 * Permission Action
 */
export enum PermissionAction {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  PUBLISH = 'publish',
  EXPORT = 'export',
  IMPORT = 'import',
}

/**
 * Permission
 */
export interface Permission {
  resource: PermissionResource
  actions: PermissionAction[]
}

/**
 * Role with Permissions
 */
export interface RolePermissions {
  role: UserRole
  permissions: Permission[]
}

/**
 * Default Role Permissions
 */
export const DEFAULT_ROLE_PERMISSIONS: RolePermissions[] = [
  // Admin - Full access
  {
    role: UserRole.ADMIN,
    permissions: Object.values(PermissionResource).map(resource => ({
      resource,
      actions: Object.values(PermissionAction),
    })),
  },
  // Editor - Can manage products, pricing, inventory
  {
    role: UserRole.EDITOR,
    permissions: [
      {
        resource: PermissionResource.PRODUCTS,
        actions: [PermissionAction.CREATE, PermissionAction.READ, PermissionAction.UPDATE, PermissionAction.DELETE],
      },
      {
        resource: PermissionResource.VARIANTS,
        actions: [PermissionAction.CREATE, PermissionAction.READ, PermissionAction.UPDATE, PermissionAction.DELETE],
      },
      {
        resource: PermissionResource.PRICING,
        actions: [PermissionAction.CREATE, PermissionAction.READ, PermissionAction.UPDATE, PermissionAction.EXPORT, PermissionAction.IMPORT],
      },
      {
        resource: PermissionResource.INVENTORY,
        actions: [PermissionAction.READ, PermissionAction.UPDATE],
      },
      {
        resource: PermissionResource.COLLECTIONS,
        actions: [PermissionAction.CREATE, PermissionAction.READ, PermissionAction.UPDATE],
      },
      {
        resource: PermissionResource.CATEGORIES,
        actions: [PermissionAction.CREATE, PermissionAction.READ, PermissionAction.UPDATE],
      },
      {
        resource: PermissionResource.ORDERS,
        actions: [PermissionAction.READ],
      },
      {
        resource: PermissionResource.CUSTOMERS,
        actions: [PermissionAction.READ],
      },
    ],
  },
  // Viewer - Read-only access
  {
    role: UserRole.VIEWER,
    permissions: Object.values(PermissionResource).map(resource => ({
      resource,
      actions: [PermissionAction.READ],
    })),
  },
  // Support - Can manage orders and customers
  {
    role: UserRole.SUPPORT,
    permissions: [
      {
        resource: PermissionResource.ORDERS,
        actions: [PermissionAction.CREATE, PermissionAction.READ, PermissionAction.UPDATE],
      },
      {
        resource: PermissionResource.CUSTOMERS,
        actions: [PermissionAction.CREATE, PermissionAction.READ, PermissionAction.UPDATE],
      },
      {
        resource: PermissionResource.PRODUCTS,
        actions: [PermissionAction.READ],
      },
      {
        resource: PermissionResource.VARIANTS,
        actions: [PermissionAction.READ],
      },
      {
        resource: PermissionResource.PRICING,
        actions: [PermissionAction.READ],
      },
      {
        resource: PermissionResource.INVENTORY,
        actions: [PermissionAction.READ],
      },
    ],
  },
]

/**
 * Audit Log Action Type
 */
export enum AuditAction {
  // User actions
  USER_LOGIN = 'user.login',
  USER_LOGOUT = 'user.logout',
  USER_CREATE = 'user.create',
  USER_UPDATE = 'user.update',
  USER_DELETE = 'user.delete',
  USER_PASSWORD_CHANGE = 'user.password_change',

  // Product actions
  PRODUCT_CREATE = 'product.create',
  PRODUCT_UPDATE = 'product.update',
  PRODUCT_DELETE = 'product.delete',
  PRODUCT_PUBLISH = 'product.publish',

  // Variant actions
  VARIANT_CREATE = 'variant.create',
  VARIANT_UPDATE = 'variant.update',
  VARIANT_DELETE = 'variant.delete',

  // Pricing actions
  PRICE_CREATE = 'price.create',
  PRICE_UPDATE = 'price.update',
  PRICE_DELETE = 'price.delete',
  PRICE_IMPORT = 'price.import',
  PRICE_EXPORT = 'price.export',

  // Inventory actions
  INVENTORY_ADJUST = 'inventory.adjust',
  INVENTORY_TRANSFER = 'inventory.transfer',

  // Order actions
  ORDER_CREATE = 'order.create',
  ORDER_UPDATE = 'order.update',
  ORDER_CANCEL = 'order.cancel',
  ORDER_FULFILL = 'order.fulfill',
  ORDER_REFUND = 'order.refund',

  // Settings actions
  SETTINGS_UPDATE = 'settings.update',
  WEBHOOK_CREATE = 'webhook.create',
  WEBHOOK_UPDATE = 'webhook.update',
  WEBHOOK_DELETE = 'webhook.delete',
  API_KEY_CREATE = 'api_key.create',
  API_KEY_REVOKE = 'api_key.revoke',
}

/**
 * Audit Log Entry
 */
export interface AuditLog {
  id: string
  user_id: string
  user_email?: string
  action: AuditAction
  resource_type: string
  resource_id?: string
  changes?: Record<string, any>
  metadata?: Record<string, any>
  ip_address?: string
  user_agent?: string
  created_at: string
}

/**
 * Create Audit Log Input
 */
export interface CreateAuditLogInput {
  user_id: string
  action: AuditAction
  resource_type: string
  resource_id?: string
  changes?: Record<string, any>
  metadata?: Record<string, any>
  ip_address?: string
  user_agent?: string
}

/**
 * Auth Validation Error
 */
export interface AuthValidationError {
  field: string
  message: string
}

/**
 * Auth Constraints
 */
export const AUTH_CONSTRAINTS = {
  PASSWORD_MIN_LENGTH: 8,
  PASSWORD_MAX_LENGTH: 128,
  PASSWORD_REQUIRE_UPPERCASE: true,
  PASSWORD_REQUIRE_LOWERCASE: true,
  PASSWORD_REQUIRE_NUMBER: true,
  PASSWORD_REQUIRE_SPECIAL: false,

  EMAIL_MAX_LENGTH: 255,

  SESSION_DURATION_HOURS: 24,
  SESSION_IDLE_TIMEOUT_HOURS: 4,

  MAX_LOGIN_ATTEMPTS: 5,
  LOGIN_LOCKOUT_MINUTES: 15,
} as const

/**
 * Helper: Check if user has permission
 */
export function hasPermission(
  userRole: UserRole,
  resource: PermissionResource,
  action: PermissionAction
): boolean {
  const rolePermissions = DEFAULT_ROLE_PERMISSIONS.find(rp => rp.role === userRole)
  if (!rolePermissions) return false

  const resourcePermission = rolePermissions.permissions.find(p => p.resource === resource)
  if (!resourcePermission) return false

  return resourcePermission.actions.includes(action)
}

/**
 * Helper: Get all permissions for a role
 */
export function getRolePermissions(role: UserRole): Permission[] {
  const rolePermissions = DEFAULT_ROLE_PERMISSIONS.find(rp => rp.role === role)
  return rolePermissions?.permissions || []
}
