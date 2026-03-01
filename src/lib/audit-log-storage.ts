/**
 * Audit Log Storage Library
 *
 * Simple file-based storage for audit logs.
 * Tracks all important changes with who/what/when details.
 */

import fs from 'fs/promises'
import path from 'path'
import type { AuditLog, CreateAuditLogInput, AuditAction } from '../types/auth'

const STORAGE_DIR = path.join(process.cwd(), '.medusa', 'auth-storage')
const AUDIT_LOGS_FILE = path.join(STORAGE_DIR, 'audit_logs.json')

const MAX_LOGS = 10000 // Keep last 10k logs

/**
 * Ensure storage directory exists
 */
async function ensureStorageDir(): Promise<void> {
  try {
    await fs.mkdir(STORAGE_DIR, { recursive: true })
  } catch (error) {
    console.error('[Audit Log Storage] Failed to create storage directory:', error)
  }
}

/**
 * Load audit logs from file
 */
async function loadAuditLogs(): Promise<AuditLog[]> {
  try {
    const data = await fs.readFile(AUDIT_LOGS_FILE, 'utf-8')
    return JSON.parse(data)
  } catch (error) {
    return []
  }
}

/**
 * Save audit logs to file
 */
async function saveAuditLogs(logs: AuditLog[]): Promise<void> {
  await ensureStorageDir()

  // Trim to max logs (keep most recent)
  if (logs.length > MAX_LOGS) {
    logs = logs.slice(logs.length - MAX_LOGS)
  }

  await fs.writeFile(AUDIT_LOGS_FILE, JSON.stringify(logs, null, 2), 'utf-8')
}

/**
 * Generate unique audit log ID
 */
function generateAuditLogId(): string {
  return `audit_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

/**
 * Create audit log entry
 */
export async function createAuditLog(input: CreateAuditLogInput): Promise<AuditLog> {
  const logs = await loadAuditLogs()

  const auditLog: AuditLog = {
    id: generateAuditLogId(),
    user_id: input.user_id,
    action: input.action,
    resource_type: input.resource_type,
    resource_id: input.resource_id,
    changes: input.changes,
    metadata: input.metadata,
    ip_address: input.ip_address,
    user_agent: input.user_agent,
    created_at: new Date().toISOString(),
  }

  logs.push(auditLog)
  await saveAuditLogs(logs)

  console.log(`[Audit Log] ${input.action} on ${input.resource_type}${input.resource_id ? ':' + input.resource_id : ''} by user ${input.user_id}`)

  return auditLog
}

/**
 * List audit logs with filters
 */
export async function listAuditLogs(filters?: {
  user_id?: string
  action?: AuditAction
  resource_type?: string
  resource_id?: string
  from_date?: string
  to_date?: string
  limit?: number
  offset?: number
}): Promise<{ logs: AuditLog[]; count: number; total: number }> {
  let logs = await loadAuditLogs()
  const total = logs.length

  // Apply filters
  if (filters?.user_id) {
    logs = logs.filter(log => log.user_id === filters.user_id)
  }

  if (filters?.action) {
    logs = logs.filter(log => log.action === filters.action)
  }

  if (filters?.resource_type) {
    logs = logs.filter(log => log.resource_type === filters.resource_type)
  }

  if (filters?.resource_id) {
    logs = logs.filter(log => log.resource_id === filters.resource_id)
  }

  if (filters?.from_date) {
    logs = logs.filter(log => log.created_at >= filters.from_date!)
  }

  if (filters?.to_date) {
    logs = logs.filter(log => log.created_at <= filters.to_date!)
  }

  // Sort by created_at DESC (most recent first)
  logs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  const count = logs.length

  // Pagination
  const offset = filters?.offset || 0
  const limit = filters?.limit || 50
  logs = logs.slice(offset, offset + limit)

  return { logs, count, total }
}

/**
 * Get audit log by ID
 */
export async function getAuditLogById(id: string): Promise<AuditLog | null> {
  const logs = await loadAuditLogs()
  return logs.find(log => log.id === id) || null
}

/**
 * Delete old audit logs (cleanup)
 */
export async function cleanupOldAuditLogs(daysToKeep: number = 90): Promise<number> {
  const logs = await loadAuditLogs()
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep)

  const filteredLogs = logs.filter(log => new Date(log.created_at) >= cutoffDate)
  const deletedCount = logs.length - filteredLogs.length

  await saveAuditLogs(filteredLogs)

  console.log(`[Audit Log] Cleaned up ${deletedCount} old audit logs (kept last ${daysToKeep} days)`)

  return deletedCount
}

/**
 * Get audit stats
 */
export async function getAuditStats(): Promise<{
  total_logs: number
  actions_breakdown: Record<string, number>
  resources_breakdown: Record<string, number>
  users_breakdown: Record<string, number>
  oldest_log?: string
  newest_log?: string
}> {
  const logs = await loadAuditLogs()

  const stats = {
    total_logs: logs.length,
    actions_breakdown: {} as Record<string, number>,
    resources_breakdown: {} as Record<string, number>,
    users_breakdown: {} as Record<string, number>,
    oldest_log: logs.length > 0 ? logs[0].created_at : undefined,
    newest_log: logs.length > 0 ? logs[logs.length - 1].created_at : undefined,
  }

  for (const log of logs) {
    // Count actions
    stats.actions_breakdown[log.action] = (stats.actions_breakdown[log.action] || 0) + 1

    // Count resources
    stats.resources_breakdown[log.resource_type] = (stats.resources_breakdown[log.resource_type] || 0) + 1

    // Count users
    stats.users_breakdown[log.user_id] = (stats.users_breakdown[log.user_id] || 0) + 1
  }

  return stats
}
