import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core'

export const tenants = sqliteTable('tenants', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  entraId: text('entra_id').unique(),
  plan: text('plan').notNull().default('free'),
  createdAt: text('created_at').notNull().default('now'),
})

export const agents = sqliteTable('agents', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull().references(() => tenants.id),
  name: text('name').notNull(),
  owner: text('owner').notNull(),
  environment: text('environment').notNull(),
  businessPurpose: text('business_purpose').notNull(),
  autonomyLevel: text('autonomy_level').notNull(),
  lastDeployment: text('last_deployment').notNull(),
  status: text('status').notNull().default('healthy'),
  events24h: integer('events_24h').notNull().default(0),
  openIncidents: integer('open_incidents').notNull().default(0),
})

export const agentEvents = sqliteTable('agent_events', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull().references(() => tenants.id),
  agentId: text('agent_id').notNull().references(() => agents.id),
  timestamp: text('timestamp').notNull(),
  type: text('type').notNull(),
  title: text('title').notNull(),
  summary: text('summary').notNull(),
  outcome: text('outcome').notNull(),
  riskScore: integer('risk_score').notNull().default(0),
  actor: text('actor').notNull(),
  target: text('target'),
  metadata: text('metadata'),
})

export const policies = sqliteTable('policies', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull().references(() => tenants.id),
  name: text('name').notNull(),
  description: text('description').notNull(),
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
  severity: text('severity').notNull(),
  scope: text('scope').notNull(),
  trigger: text('trigger').notNull(),
  action: text('action').notNull(),
})

export const alerts = sqliteTable('alerts', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull().references(() => tenants.id),
  agentId: text('agent_id').notNull().references(() => agents.id),
  policyId: text('policy_id').references(() => policies.id),
  title: text('title').notNull(),
  description: text('description').notNull(),
  severity: text('severity').notNull(),
  status: text('status').notNull().default('open'),
  createdAt: text('created_at').notNull(),
  recommendedAction: text('recommended_action').notNull(),
})

export const caseActivity = sqliteTable('case_activity', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull().references(() => tenants.id),
  alertId: text('alert_id').notNull().references(() => alerts.id),
  timestamp: text('timestamp').notNull(),
  actor: text('actor').notNull(),
  action: text('action').notNull(),
  detail: text('detail').notNull(),
})

// ─── Audit Trail ─────────────────────────────────────────────────────────

export const auditLog = sqliteTable('audit_log', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull().references(() => tenants.id),
  timestamp: text('timestamp').notNull(),
  userId: text('user_id').notNull(),
  userEmail: text('user_email').notNull(),
  action: text('action').notNull(),           // e.g. 'alert.acknowledge', 'policy.update', 'agent.deploy'
  resourceType: text('resource_type').notNull(), // e.g. 'alert', 'policy', 'agent'
  resourceId: text('resource_id').notNull(),
  resourceName: text('resource_name'),
  detail: text('detail'),
  previousValue: text('previous_value'),       // JSON string of old state
  newValue: text('new_value'),                 // JSON string of new state
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
})

// ─── Notification Settings ──────────────────────────────────────────────

export const notificationChannels = sqliteTable('notification_channels', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull().references(() => tenants.id),
  type: text('type').notNull(),                // 'teams_webhook' | 'email' | 'slack_webhook'
  name: text('name').notNull(),
  config: text('config').notNull(),            // JSON: { webhookUrl } or { smtpHost, from, to }
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull(),
})

export const notificationRules = sqliteTable('notification_rules', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull().references(() => tenants.id),
  channelId: text('channel_id').notNull().references(() => notificationChannels.id),
  event: text('event').notNull(),              // 'alert.created' | 'alert.critical' | 'policy.violation' | 'trust.drop'
  minSeverity: text('min_severity'),           // 'low' | 'medium' | 'high' | 'critical'
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
})

// ─── Graph Sync Tracking ─────────────────────────────────────────────────

export const graphSyncLog = sqliteTable('graph_sync_log', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull().references(() => tenants.id),
  startedAt: text('started_at').notNull(),
  completedAt: text('completed_at'),
  status: text('status').notNull().default('running'), // 'running' | 'success' | 'failed'
  agentCount: integer('agent_count'),
  alertCount: integer('alert_count'),
  eventCount: integer('event_count'),
  errorMessage: text('error_message'),
})

// ─── User Roles (RBAC) ──────────────────────────────────────────────────

export const userRoles = sqliteTable('user_roles', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull().references(() => tenants.id),
  userId: text('user_id').notNull(),
  userEmail: text('user_email').notNull(),
  role: text('role').notNull().default('viewer'), // 'admin' | 'operator' | 'viewer'
  assignedAt: text('assigned_at').notNull(),
  assignedBy: text('assigned_by').notNull(),
})
