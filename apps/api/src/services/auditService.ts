/**
 * Audit Trail Service
 * Records every significant action in the system for compliance and forensics.
 */

import { db, auditLog } from '@cfr/db'
import { eq, desc, and, gte } from 'drizzle-orm'
import type { FastifyRequest } from 'fastify'

export type AuditAction =
  | 'alert.acknowledge'
  | 'alert.resolve'
  | 'alert.reopen'
  | 'alert.create'
  | 'policy.update'
  | 'policy.enable'
  | 'policy.disable'
  | 'policy.rollout_change'
  | 'agent.deploy'
  | 'agent.pause'
  | 'agent.delete'
  | 'user.login'
  | 'user.logout'
  | 'user.role_change'
  | 'graph.sync'
  | 'export.pdf'
  | 'export.csv'
  | 'notification.configure'
  | 'settings.update'

export type AuditEntry = {
  tenantId: string
  userId: string
  userEmail: string
  action: AuditAction
  resourceType: string
  resourceId: string
  resourceName?: string
  detail?: string
  previousValue?: unknown
  newValue?: unknown
}

/**
 * Record an audit log entry
 */
export function recordAudit(entry: AuditEntry, request?: FastifyRequest) {
  const id = crypto.randomUUID()
  const timestamp = new Date().toISOString()

  db.insert(auditLog).values({
    id,
    tenantId: entry.tenantId,
    timestamp,
    userId: entry.userId,
    userEmail: entry.userEmail,
    action: entry.action,
    resourceType: entry.resourceType,
    resourceId: entry.resourceId,
    resourceName: entry.resourceName ?? null,
    detail: entry.detail ?? null,
    previousValue: entry.previousValue ? JSON.stringify(entry.previousValue) : null,
    newValue: entry.newValue ? JSON.stringify(entry.newValue) : null,
    ipAddress: request?.ip ?? null,
    userAgent: request?.headers['user-agent'] ?? null,
  }).run()

  return { id, timestamp }
}

/**
 * Query audit log with filters
 */
export function queryAuditLog(filters: {
  tenantId: string
  since?: string
  resourceType?: string
  userId?: string
  limit?: number
}) {
  const conditions = [eq(auditLog.tenantId, filters.tenantId)]

  if (filters.since) {
    conditions.push(gte(auditLog.timestamp, filters.since))
  }
  if (filters.resourceType) {
    conditions.push(eq(auditLog.resourceType, filters.resourceType))
  }
  if (filters.userId) {
    conditions.push(eq(auditLog.userId, filters.userId))
  }

  return db
    .select()
    .from(auditLog)
    .where(and(...conditions))
    .orderBy(desc(auditLog.timestamp))
    .limit(filters.limit ?? 200)
    .all()
}
