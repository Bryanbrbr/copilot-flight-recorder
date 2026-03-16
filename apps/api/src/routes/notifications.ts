import type { FastifyPluginAsync } from 'fastify'
import { db, notificationChannels, notificationRules } from '@cfr/db'
import { eq, and } from 'drizzle-orm'
import { recordAudit } from '../services/auditService'

// Allowed channel types
const ALLOWED_CHANNEL_TYPES = ['teams_webhook', 'slack_webhook', 'email']

export const notificationRoutes: FastifyPluginAsync = async (app) => {
  // GET /api/notifications/channels
  app.get('/channels', async (req) => {
    const tenantId = req.auth!.tenantId
    return db.select().from(notificationChannels).where(eq(notificationChannels.tenantId, tenantId)).all()
  })

  // POST /api/notifications/channels — with input validation
  app.post<{
    Body: {
      type: string
      name: string
      config: Record<string, string>
    }
  }>('/channels', async (req, reply) => {
    const tenantId = req.auth!.tenantId

    // Validate type
    if (!ALLOWED_CHANNEL_TYPES.includes(req.body.type)) {
      return reply.code(400).send({ error: `Invalid channel type. Must be one of: ${ALLOWED_CHANNEL_TYPES.join(', ')}` })
    }
    // Validate name
    if (!req.body.name || typeof req.body.name !== 'string' || req.body.name.length > 200) {
      return reply.code(400).send({ error: 'Name is required and must be under 200 characters' })
    }

    // Validate config structure based on channel type
    const config = req.body.config
    if (!config || typeof config !== 'object' || Array.isArray(config)) {
      return reply.code(400).send({ error: 'Config must be a valid object' })
    }
    if ((req.body.type === 'teams_webhook' || req.body.type === 'slack_webhook') && (!config.webhookUrl || typeof config.webhookUrl !== 'string')) {
      return reply.code(400).send({ error: 'Webhook channels require a webhookUrl in config' })
    }
    if (req.body.type === 'email' && (!config.to || typeof config.to !== 'string')) {
      return reply.code(400).send({ error: 'Email channels require a "to" address in config' })
    }
    // Limit config size to prevent abuse
    const configStr = JSON.stringify(config)
    if (configStr.length > 5000) {
      return reply.code(400).send({ error: 'Config is too large (max 5KB)' })
    }

    const id = crypto.randomUUID()

    db.insert(notificationChannels).values({
      id,
      tenantId,
      type: req.body.type,
      name: req.body.name.trim(),
      config: configStr,
      enabled: true,
      createdAt: new Date().toISOString(),
    }).run()

    recordAudit({
      tenantId,
      userId: req.auth!.userId,
      userEmail: req.auth!.email,
      action: 'notification.configure',
      resourceType: 'notification_channel',
      resourceId: id,
      resourceName: req.body.name,
      detail: `Created ${req.body.type} channel: ${req.body.name}`,
    }, req)

    return { id, status: 'created' }
  })

  // DELETE /api/notifications/channels/:id
  app.delete<{ Params: { id: string } }>('/channels/:id', async (req, reply) => {
    const tenantId = req.auth!.tenantId

    const channel = db.select().from(notificationChannels)
      .where(and(eq(notificationChannels.id, req.params.id), eq(notificationChannels.tenantId, tenantId)))
      .get()

    if (!channel) return reply.code(404).send({ error: 'Channel not found' })

    // Delete rules for this channel first
    db.delete(notificationRules).where(eq(notificationRules.channelId, req.params.id)).run()
    db.delete(notificationChannels).where(eq(notificationChannels.id, req.params.id)).run()

    return { status: 'deleted' }
  })

  // GET /api/notifications/rules
  app.get('/rules', async (req) => {
    const tenantId = req.auth!.tenantId
    return db.select().from(notificationRules).where(eq(notificationRules.tenantId, tenantId)).all()
  })

  // POST /api/notifications/rules
  app.post<{
    Body: {
      channelId: string
      event: string
      minSeverity?: string
    }
  }>('/rules', async (req) => {
    const tenantId = req.auth!.tenantId
    const id = crypto.randomUUID()

    db.insert(notificationRules).values({
      id,
      tenantId,
      channelId: req.body.channelId,
      event: req.body.event,
      minSeverity: req.body.minSeverity ?? null,
      enabled: true,
    }).run()

    return { id, status: 'created' }
  })

  // POST /api/notifications/test — send a test notification
  app.post<{
    Body: { channelId: string }
  }>('/test', async (req, reply) => {
    const tenantId = req.auth!.tenantId
    const { dispatchNotification } = await import('../services/notificationService')

    const channel = db.select().from(notificationChannels)
      .where(and(eq(notificationChannels.id, req.body.channelId), eq(notificationChannels.tenantId, tenantId)))
      .get()

    if (!channel) return reply.code(404).send({ error: 'Channel not found' })

    // Create a temporary rule for testing
    const testRuleId = crypto.randomUUID()
    db.insert(notificationRules).values({
      id: testRuleId,
      tenantId,
      channelId: channel.id,
      event: 'alert.created',
      enabled: true,
    }).run()

    try {
      const results = await dispatchNotification({
        tenantId,
        event: 'alert.created',
        severity: 'medium',
        title: 'Test notification from Copilot Flight Recorder',
        body: 'This is a test notification to verify your channel configuration is working correctly.',
        metadata: { Source: 'Notification test', Timestamp: new Date().toISOString() },
      })

      return { status: 'sent', results }
    } finally {
      // Clean up test rule
      db.delete(notificationRules).where(eq(notificationRules.id, testRuleId)).run()
    }
  })
}
