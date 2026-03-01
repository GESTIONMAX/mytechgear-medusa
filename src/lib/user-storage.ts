/**
 * User & Session Storage Library
 *
 * Simple file-based storage for users and sessions.
 * TODO: Migrate to database table for production use.
 */

import fs from 'fs/promises'
import path from 'path'
import type { User, SafeUser, Session, CreateUserInput, UpdateUserInput } from '../types/auth'
import { UserStatus, UserRole } from '../types/auth'
import {
  hashPassword,
  verifyPassword,
  generateToken,
  generateSessionExpiry,
  generateUserId,
  generateSessionId,
  sanitizeUser,
  isSessionExpired,
  isSessionIdle,
} from './auth'

const STORAGE_DIR = path.join(process.cwd(), '.medusa', 'auth-storage')
const USERS_FILE = path.join(STORAGE_DIR, 'users.json')
const SESSIONS_FILE = path.join(STORAGE_DIR, 'sessions.json')

/**
 * Ensure storage directory exists
 */
async function ensureStorageDir(): Promise<void> {
  try {
    await fs.mkdir(STORAGE_DIR, { recursive: true })
  } catch (error) {
    console.error('[User Storage] Failed to create storage directory:', error)
  }
}

/**
 * Load users from file
 */
async function loadUsers(): Promise<User[]> {
  try {
    const data = await fs.readFile(USERS_FILE, 'utf-8')
    return JSON.parse(data)
  } catch (error) {
    // File doesn't exist or is empty, return default admin user
    return [
      {
        id: 'user_admin_default',
        email: 'admin@mytechgear.com',
        password_hash: hashPassword('admin123'),  // Default password
        first_name: 'Admin',
        last_name: 'MyTechGear',
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        metadata: {
          is_default: true,
        },
      },
    ]
  }
}

/**
 * Save users to file
 */
async function saveUsers(users: User[]): Promise<void> {
  await ensureStorageDir()
  await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8')
}

/**
 * Load sessions from file
 */
async function loadSessions(): Promise<Session[]> {
  try {
    const data = await fs.readFile(SESSIONS_FILE, 'utf-8')
    return JSON.parse(data)
  } catch (error) {
    return []
  }
}

/**
 * Save sessions to file
 */
async function saveSessions(sessions: Session[]): Promise<void> {
  await ensureStorageDir()
  await fs.writeFile(SESSIONS_FILE, JSON.stringify(sessions, null, 2), 'utf-8')
}

/**
 * Clean expired sessions
 */
async function cleanExpiredSessions(): Promise<void> {
  const sessions = await loadSessions()
  const activeSessions = sessions.filter(
    s => !isSessionExpired(s.expires_at) && !isSessionIdle(s.last_activity_at)
  )
  await saveSessions(activeSessions)
}

// ============================================================================
// USER OPERATIONS
// ============================================================================

/**
 * Create user
 */
export async function createUser(input: CreateUserInput): Promise<SafeUser> {
  const users = await loadUsers()

  // Check if email already exists
  if (users.some(u => u.email.toLowerCase() === input.email.toLowerCase())) {
    throw new Error(JSON.stringify({
      errors: [{ field: 'email', message: 'Email already exists' }]
    }))
  }

  const now = new Date().toISOString()
  const user: User = {
    id: generateUserId(),
    email: input.email.toLowerCase(),
    password_hash: hashPassword(input.password),
    first_name: input.first_name,
    last_name: input.last_name,
    role: input.role,
    status: input.status || UserStatus.ACTIVE,
    metadata: input.metadata || {},
    created_at: now,
    updated_at: now,
  }

  users.push(user)
  await saveUsers(users)

  console.log(`[User Storage] User created: ${user.email} (${user.role})`)

  return sanitizeUser(user)
}

/**
 * Get user by ID
 */
export async function getUserById(id: string): Promise<SafeUser | null> {
  const users = await loadUsers()
  const user = users.find(u => u.id === id)
  return user ? sanitizeUser(user) : null
}

/**
 * Get user by email
 */
export async function getUserByEmail(email: string): Promise<User | null> {
  const users = await loadUsers()
  return users.find(u => u.email.toLowerCase() === email.toLowerCase()) || null
}

/**
 * List users
 */
export async function listUsers(filters?: {
  role?: UserRole
  status?: UserStatus
  limit?: number
  offset?: number
}): Promise<SafeUser[]> {
  let users = await loadUsers()

  // Apply filters
  if (filters?.role) {
    users = users.filter(u => u.role === filters.role)
  }
  if (filters?.status) {
    users = users.filter(u => u.status === filters.status)
  }

  // Pagination
  const offset = filters?.offset || 0
  const limit = filters?.limit || 50
  users = users.slice(offset, offset + limit)

  return users.map(sanitizeUser)
}

/**
 * Update user
 */
export async function updateUser(id: string, input: UpdateUserInput): Promise<SafeUser> {
  const users = await loadUsers()
  const userIndex = users.findIndex(u => u.id === id)

  if (userIndex === -1) {
    throw new Error('User not found')
  }

  const user = users[userIndex]

  // Check if email is being changed and already exists
  if (input.email && input.email.toLowerCase() !== user.email.toLowerCase()) {
    if (users.some(u => u.email.toLowerCase() === input.email.toLowerCase())) {
      throw new Error(JSON.stringify({
        errors: [{ field: 'email', message: 'Email already exists' }]
      }))
    }
  }

  // Update user
  const updatedUser: User = {
    ...user,
    email: input.email?.toLowerCase() || user.email,
    password_hash: input.password ? hashPassword(input.password) : user.password_hash,
    first_name: input.first_name !== undefined ? input.first_name : user.first_name,
    last_name: input.last_name !== undefined ? input.last_name : user.last_name,
    role: input.role || user.role,
    status: input.status || user.status,
    avatar_url: input.avatar_url !== undefined ? input.avatar_url : user.avatar_url,
    metadata: input.metadata ? { ...user.metadata, ...input.metadata } : user.metadata,
    updated_at: new Date().toISOString(),
  }

  users[userIndex] = updatedUser
  await saveUsers(users)

  console.log(`[User Storage] User updated: ${updatedUser.email}`)

  return sanitizeUser(updatedUser)
}

/**
 * Delete user (soft delete)
 */
export async function deleteUser(id: string): Promise<void> {
  const users = await loadUsers()
  const userIndex = users.findIndex(u => u.id === id)

  if (userIndex === -1) {
    throw new Error('User not found')
  }

  users[userIndex].deleted_at = new Date().toISOString()
  users[userIndex].status = UserStatus.INACTIVE
  await saveUsers(users)

  // Revoke all sessions
  await revokeAllUserSessions(id)

  console.log(`[User Storage] User deleted: ${users[userIndex].email}`)
}

/**
 * Authenticate user
 */
export async function authenticateUser(
  email: string,
  password: string
): Promise<{ user: User; valid: boolean }> {
  const user = await getUserByEmail(email)

  if (!user) {
    return { user: null as any, valid: false }
  }

  if (user.status !== UserStatus.ACTIVE) {
    throw new Error('User account is not active')
  }

  const valid = verifyPassword(password, user.password_hash)

  return { user, valid }
}

// ============================================================================
// SESSION OPERATIONS
// ============================================================================

/**
 * Create session
 */
export async function createSession(
  userId: string,
  ipAddress?: string,
  userAgent?: string
): Promise<Session> {
  await cleanExpiredSessions()

  const now = new Date().toISOString()
  const session: Session = {
    id: generateSessionId(),
    user_id: userId,
    token: generateToken(),
    ip_address: ipAddress,
    user_agent: userAgent,
    expires_at: generateSessionExpiry(),
    created_at: now,
    last_activity_at: now,
  }

  const sessions = await loadSessions()
  sessions.push(session)
  await saveSessions(sessions)

  console.log(`[User Storage] Session created for user: ${userId}`)

  return session
}

/**
 * Get session by token
 */
export async function getSessionByToken(token: string): Promise<Session | null> {
  await cleanExpiredSessions()

  const sessions = await loadSessions()
  const session = sessions.find(s => s.token === token)

  if (!session) {
    return null
  }

  // Check if expired or idle
  if (isSessionExpired(session.expires_at) || isSessionIdle(session.last_activity_at)) {
    return null
  }

  return session
}

/**
 * Update session activity
 */
export async function updateSessionActivity(token: string): Promise<void> {
  const sessions = await loadSessions()
  const sessionIndex = sessions.findIndex(s => s.token === token)

  if (sessionIndex !== -1) {
    sessions[sessionIndex].last_activity_at = new Date().toISOString()
    await saveSessions(sessions)
  }
}

/**
 * Revoke session
 */
export async function revokeSession(token: string): Promise<void> {
  const sessions = await loadSessions()
  const filteredSessions = sessions.filter(s => s.token !== token)
  await saveSessions(filteredSessions)

  console.log(`[User Storage] Session revoked`)
}

/**
 * Revoke all user sessions
 */
export async function revokeAllUserSessions(userId: string): Promise<void> {
  const sessions = await loadSessions()
  const filteredSessions = sessions.filter(s => s.user_id !== userId)
  await saveSessions(filteredSessions)

  console.log(`[User Storage] All sessions revoked for user: ${userId}`)
}

/**
 * List user sessions
 */
export async function listUserSessions(userId: string): Promise<Session[]> {
  await cleanExpiredSessions()

  const sessions = await loadSessions()
  return sessions.filter(s => s.user_id === userId)
}

/**
 * Update user last login
 */
export async function updateUserLastLogin(userId: string): Promise<void> {
  const users = await loadUsers()
  const userIndex = users.findIndex(u => u.id === userId)

  if (userIndex !== -1) {
    users[userIndex].last_login_at = new Date().toISOString()
    await saveUsers(users)
  }
}
