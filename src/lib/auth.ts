/**
 * Authentication Utilities Library
 *
 * Core utilities for password hashing, validation, token generation, and session management.
 */

import crypto from 'crypto'
import type {
  User,
  SafeUser,
  CreateUserInput,
  AuthValidationError,
  Session,
} from '../types/auth'
import { AUTH_CONSTRAINTS, UserRole, UserStatus } from '../types/auth'

/**
 * Hash password using PBKDF2
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto
    .pbkdf2Sync(password, salt, 10000, 64, 'sha512')
    .toString('hex')

  return `${salt}:${hash}`
}

/**
 * Verify password against hash
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, hash] = storedHash.split(':')
  if (!salt || !hash) return false

  const verifyHash = crypto
    .pbkdf2Sync(password, salt, 10000, 64, 'sha512')
    .toString('hex')

  return hash === verifyHash
}

/**
 * Generate secure random token
 */
export function generateToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

/**
 * Generate session expiry date
 */
export function generateSessionExpiry(hours: number = AUTH_CONSTRAINTS.SESSION_DURATION_HOURS): string {
  const expiryDate = new Date()
  expiryDate.setHours(expiryDate.getHours() + hours)
  return expiryDate.toISOString()
}

/**
 * Check if session is expired
 */
export function isSessionExpired(expiresAt: string): boolean {
  return new Date(expiresAt) < new Date()
}

/**
 * Check if session is idle
 */
export function isSessionIdle(lastActivityAt: string): boolean {
  const idleLimit = new Date()
  idleLimit.setHours(idleLimit.getHours() - AUTH_CONSTRAINTS.SESSION_IDLE_TIMEOUT_HOURS)
  return new Date(lastActivityAt) < idleLimit
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return (
    emailRegex.test(email) &&
    email.length <= AUTH_CONSTRAINTS.EMAIL_MAX_LENGTH
  )
}

/**
 * Validate password strength
 */
export function validatePassword(password: string): {
  valid: boolean
  errors: AuthValidationError[]
} {
  const errors: AuthValidationError[] = []

  // Length check
  if (password.length < AUTH_CONSTRAINTS.PASSWORD_MIN_LENGTH) {
    errors.push({
      field: 'password',
      message: `Password must be at least ${AUTH_CONSTRAINTS.PASSWORD_MIN_LENGTH} characters`,
    })
  }

  if (password.length > AUTH_CONSTRAINTS.PASSWORD_MAX_LENGTH) {
    errors.push({
      field: 'password',
      message: `Password must not exceed ${AUTH_CONSTRAINTS.PASSWORD_MAX_LENGTH} characters`,
    })
  }

  // Uppercase check
  if (AUTH_CONSTRAINTS.PASSWORD_REQUIRE_UPPERCASE && !/[A-Z]/.test(password)) {
    errors.push({
      field: 'password',
      message: 'Password must contain at least one uppercase letter',
    })
  }

  // Lowercase check
  if (AUTH_CONSTRAINTS.PASSWORD_REQUIRE_LOWERCASE && !/[a-z]/.test(password)) {
    errors.push({
      field: 'password',
      message: 'Password must contain at least one lowercase letter',
    })
  }

  // Number check
  if (AUTH_CONSTRAINTS.PASSWORD_REQUIRE_NUMBER && !/[0-9]/.test(password)) {
    errors.push({
      field: 'password',
      message: 'Password must contain at least one number',
    })
  }

  // Special character check
  if (AUTH_CONSTRAINTS.PASSWORD_REQUIRE_SPECIAL && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push({
      field: 'password',
      message: 'Password must contain at least one special character',
    })
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Validate user input
 */
export function validateUserInput(input: CreateUserInput): {
  valid: boolean
  errors: AuthValidationError[]
} {
  const errors: AuthValidationError[] = []

  // Email validation
  if (!input.email) {
    errors.push({
      field: 'email',
      message: 'Email is required',
    })
  } else if (!isValidEmail(input.email)) {
    errors.push({
      field: 'email',
      message: 'Invalid email format',
    })
  }

  // Password validation
  if (!input.password) {
    errors.push({
      field: 'password',
      message: 'Password is required',
    })
  } else {
    const passwordValidation = validatePassword(input.password)
    if (!passwordValidation.valid) {
      errors.push(...passwordValidation.errors)
    }
  }

  // Role validation
  if (!input.role) {
    errors.push({
      field: 'role',
      message: 'Role is required',
    })
  } else if (!Object.values(UserRole).includes(input.role)) {
    errors.push({
      field: 'role',
      message: `Invalid role. Must be one of: ${Object.values(UserRole).join(', ')}`,
    })
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Remove password hash from user object
 */
export function sanitizeUser(user: User): SafeUser {
  const { password_hash, ...safeUser } = user
  return safeUser
}

/**
 * Create user metadata structure
 */
export function createUserMetadata(additionalMetadata?: Record<string, any>): Record<string, any> {
  return {
    created_by: 'system',
    created_via: 'admin_dashboard',
    ...additionalMetadata,
  }
}

/**
 * Format session for response
 */
export function formatSessionResponse(session: Session): {
  token: string
  expires_at: string
} {
  return {
    token: session.token,
    expires_at: session.expires_at,
  }
}

/**
 * Extract IP address from request
 */
export function extractIpAddress(req: any): string | undefined {
  return (
    req.headers['x-forwarded-for']?.split(',')[0] ||
    req.headers['x-real-ip'] ||
    req.socket?.remoteAddress ||
    undefined
  )
}

/**
 * Extract User-Agent from request
 */
export function extractUserAgent(req: any): string | undefined {
  return req.headers['user-agent'] || undefined
}

/**
 * Generate unique user ID
 */
export function generateUserId(): string {
  return `user_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`
}

/**
 * Generate unique session ID
 */
export function generateSessionId(): string {
  return `session_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`
}

/**
 * Validate session token format
 */
export function isValidTokenFormat(token: string): boolean {
  // Token should be 64 hex characters
  return /^[a-f0-9]{64}$/.test(token)
}
