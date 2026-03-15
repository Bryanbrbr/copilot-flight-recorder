/**
 * Notification Service
 * Sends alerts to Teams webhooks, email, or Slack when significant events occur.
 */

import { db, notificationChannels, notificationRules } from '@cfr/db'
import { eq, and } from 'drizzle-orm'

type SeverityLevel = 'low' | 'medium' | 'high' | 'critical'

const severityOrder: Record<SeverityLevel, number> = {
  low: 0,
  medium: 1,
  high: 2,
  critical: 3,
}

export type NotificationEvent = {
  tenantId: string
  event: string         // 'alert.created' | 'alert.critical' | 'policy.violation' | 'trust.drop'
  severity: SeverityLevel
  title: string
  body: string
  url?: string          // Deep link back to the Flight Recorder UI
  metadata?: Record<string, string>
}

// ─── Channel Dispatchers ─────────────────────────────────────────────────

async function sendTeamsWebhook(webhookUrl: string, notification: NotificationEvent) {
  const card = {
    '@type': 'MessageCard',
    '@context': 'http://schema.org/extensions',
    themeColor: notification.severity === 'critical' ? 'FF0000'
      : notification.severity === 'high' ? 'FF8C00'
      : notification.severity === 'medium' ? 'FFD700'
      : '00AA00',
    summary: notification.title,
    sections: [
      {
        activityTitle: `🛡️ ${notification.title}`,
        activitySubtitle: `Copilot Flight Recorder — ${notification.severity.toUpperCase()} severity`,
        text: notification.body,
        facts: Object.entries(notification.metadata ?? {}).map(([name, value]) => ({ name, value })),
      },
    ],
    potentialAction: notification.url
      ? [
          {
            '@type': 'OpenUri',
            name: 'Open in Flight Recorder',
            targets: [{ os: 'default', uri: notification.url }],
          },
        ]
      : [],
  }

  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(card),
  })

  if (!res.ok) {
    throw new Error(`Teams webhook failed: ${res.status} ${res.statusText}`)
  }
}

async function sendSlackWebhook(webhookUrl: string, notification: NotificationEvent) {
  const emoji = notification.severity === 'critical' ? '🚨'
    : notification.severity === 'high' ? '⚠️'
    : notification.severity === 'medium' ? '🔔'
    : 'ℹ️'

  const payload = {
    blocks: [
      {
        type: 'header',
        text: { type: 'plain_text', text: `${emoji} ${notification.title}` },
      },
      {
        type: 'section',
        text: { type: 'mrkdwn', text: notification.body },
      },
      ...(notification.metadata
        ? [
            {
              type: 'section',
              fields: Object.entries(notification.metadata).map(([key, value]) => ({
                type: 'mrkdwn',
                text: `*${key}:*\n${value}`,
              })),
            },
          ]
        : []),
      ...(notification.url
        ? [
            {
              type: 'actions',
              elements: [
                {
                  type: 'button',
                  text: { type: 'plain_text', text: 'Open in Flight Recorder' },
                  url: notification.url,
                },
              ],
            },
          ]
        : []),
    ],
  }

  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    throw new Error(`Slack webhook failed: ${res.status} ${res.statusText}`)
  }
}

async function sendEmail(config: { smtpHost: string; port: number; from: string; to: string[] }, notification: NotificationEvent) {
  // For now, log the email that would be sent
  // In production, use nodemailer or Azure Communication Services
  console.log(`[notification] Email would be sent to ${config.to.join(', ')}:`, {
    subject: `[${notification.severity.toUpperCase()}] ${notification.title}`,
    body: notification.body,
  })
}

// ─── Dispatcher ──────────────────────────────────────────────────────────

/**
 * Dispatch a notification event to all matching channels
 */
export async function dispatchNotification(notification: NotificationEvent) {
  // Find matching rules
  const rules = db
    .select()
    .from(notificationRules)
    .where(
      and(
        eq(notificationRules.tenantId, notification.tenantId),
        eq(notificationRules.event, notification.event),
        eq(notificationRules.enabled, true),
      ),
    )
    .all()

  const results: Array<{ channelId: string; success: boolean; error?: string }> = []

  for (const rule of rules) {
    // Check severity threshold
    if (rule.minSeverity && severityOrder[notification.severity] < severityOrder[rule.minSeverity as SeverityLevel]) {
      continue
    }

    const channel = db
      .select()
      .from(notificationChannels)
      .where(
        and(
          eq(notificationChannels.id, rule.channelId),
          eq(notificationChannels.enabled, true),
        ),
      )
      .get()

    if (!channel) continue

    try {
      const config = JSON.parse(channel.config)

      switch (channel.type) {
        case 'teams_webhook':
          await sendTeamsWebhook(config.webhookUrl, notification)
          break
        case 'slack_webhook':
          await sendSlackWebhook(config.webhookUrl, notification)
          break
        case 'email':
          await sendEmail(config, notification)
          break
        default:
          console.warn(`[notification] Unknown channel type: ${channel.type}`)
      }

      results.push({ channelId: channel.id, success: true })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.error(`[notification] Failed to send to channel ${channel.id}:`, message)
      results.push({ channelId: channel.id, success: false, error: message })
    }
  }

  return results
}

/**
 * Helper: fire notification when an alert is created
 */
export async function notifyAlertCreated(tenantId: string, alert: {
  id: string
  title: string
  description: string
  severity: SeverityLevel
  agentName?: string
}) {
  return dispatchNotification({
    tenantId,
    event: alert.severity === 'critical' ? 'alert.critical' : 'alert.created',
    severity: alert.severity,
    title: alert.title,
    body: alert.description,
    metadata: {
      Severity: alert.severity,
      Agent: alert.agentName ?? 'Unknown',
      'Alert ID': alert.id,
    },
  })
}
