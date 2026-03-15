/**
 * Microsoft Graph API connector
 * Fetches real Copilot agent data, compliance signals, and user activity
 * from a Microsoft 365 tenant via Graph API.
 *
 * Requires an Azure AD app registration with these API permissions:
 *  - DeviceManagementConfiguration.Read.All (Copilot configurations)
 *  - SecurityEvents.Read.All (security signals)
 *  - AuditLog.Read.All (audit events)
 *  - User.Read.All (user context)
 *  - Reports.Read.All (usage reports)
 */

const GRAPH_BASE = 'https://graph.microsoft.com/v1.0'
const GRAPH_BETA = 'https://graph.microsoft.com/beta'

export type GraphToken = {
  accessToken: string
  tenantId: string
}

async function graphFetch<T>(token: GraphToken, path: string, useBeta = false): Promise<T> {
  const base = useBeta ? GRAPH_BETA : GRAPH_BASE
  const res = await fetch(`${base}${path}`, {
    headers: {
      Authorization: `Bearer ${token.accessToken}`,
      'Content-Type': 'application/json',
    },
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Graph API ${res.status}: ${res.statusText} — ${body}`)
  }

  return res.json()
}

// Paginate through Graph API @odata.nextLink
async function graphFetchAll<T>(token: GraphToken, path: string, useBeta = false): Promise<T[]> {
  const items: T[] = []
  let url: string | null = path

  while (url) {
    const fetchPath = url.startsWith('http') ? url.replace(useBeta ? GRAPH_BETA : GRAPH_BASE, '') : url
    const data: { value: T[]; '@odata.nextLink'?: string } = await graphFetch(token, fetchPath, useBeta)
    items.push(...data.value)
    url = data['@odata.nextLink'] ?? null
  }

  return items
}

// ─── Copilot Agents / Bots ────────────────────────────────────────────────

export type GraphBot = {
  id: string
  displayName: string
  description?: string
  publishedDateTime?: string
  createdDateTime: string
  configuration?: {
    autonomyLevel?: string
  }
}

/**
 * Fetch registered Copilot agents / bots from the tenant
 * Uses the /bots endpoint in beta (Copilot Studio agents)
 */
export async function fetchCopilotAgents(token: GraphToken): Promise<GraphBot[]> {
  try {
    return await graphFetchAll<GraphBot>(token, '/teamwork/bots', true)
  } catch {
    // Fallback: try app registrations that look like Copilot agents
    const apps = await graphFetchAll<{
      id: string
      displayName: string
      description?: string
      createdDateTime: string
      publisherDomain?: string
      tags?: string[]
    }>(token, "/applications?$filter=startswith(displayName,'Copilot') or tags/any(t:t eq 'copilot-agent')")
    return apps.map((app) => ({
      id: app.id,
      displayName: app.displayName,
      description: app.description,
      createdDateTime: app.createdDateTime,
    }))
  }
}

// ─── Security Alerts ──────────────────────────────────────────────────────

export type GraphSecurityAlert = {
  id: string
  title: string
  description: string
  severity: 'low' | 'medium' | 'high' | 'critical' | 'informational' | 'unknown'
  status: 'new' | 'inProgress' | 'resolved' | 'unknownFutureValue'
  createdDateTime: string
  category: string
  source?: {
    provider: string
  }
  recommendedActions?: Array<{
    actionType: string
    description: string
  }>
}

/**
 * Fetch security alerts from Microsoft Defender / Sentinel
 */
export async function fetchSecurityAlerts(token: GraphToken): Promise<GraphSecurityAlert[]> {
  return graphFetchAll<GraphSecurityAlert>(
    token,
    "/security/alerts_v2?$top=100&$orderby=createdDateTime desc&$filter=category eq 'AIPlatform' or category eq 'CustomDetection'",
  )
}

// ─── Audit Logs ──────────────────────────────────────────────────────────

export type GraphAuditEvent = {
  id: string
  activityDateTime: string
  activityDisplayName: string
  category: string
  result: string
  initiatedBy: {
    user?: {
      displayName: string
      userPrincipalName: string
    }
    app?: {
      displayName: string
    }
  }
  targetResources: Array<{
    displayName: string
    type: string
    modifiedProperties?: Array<{
      displayName: string
      oldValue: string
      newValue: string
    }>
  }>
}

/**
 * Fetch audit log events related to Copilot / AI activity
 */
export async function fetchAuditLogs(token: GraphToken, since?: string): Promise<GraphAuditEvent[]> {
  const sinceDate = since ?? new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  return graphFetchAll<GraphAuditEvent>(
    token,
    `/auditLogs/directoryAudits?$filter=activityDateTime ge ${sinceDate}&$top=200&$orderby=activityDateTime desc`,
  )
}

// ─── Copilot Usage Reports ───────────────────────────────────────────────

export type CopilotUsageReport = {
  reportDate: string
  totalActiveUsers: number
  totalRequests: number
  totalBlockedRequests: number
  productName: string
}

/**
 * Fetch Copilot usage reports (requires Reports.Read.All)
 */
export async function fetchCopilotUsageReports(token: GraphToken): Promise<CopilotUsageReport[]> {
  try {
    return await graphFetchAll<CopilotUsageReport>(
      token,
      "/reports/getMicrosoft365CopilotUsageReport(period='D7')",
      true,
    )
  } catch {
    return []
  }
}

// ─── DLP Policy Status ──────────────────────────────────────────────────

export type GraphDlpPolicy = {
  id: string
  name: string
  mode: string
  state: string
  createdDateTime: string
  lastModifiedDateTime: string
}

/**
 * Fetch DLP policies from Purview compliance
 */
export async function fetchDlpPolicies(token: GraphToken): Promise<GraphDlpPolicy[]> {
  try {
    return await graphFetchAll<GraphDlpPolicy>(
      token,
      '/security/informationProtection/dlpPolicies',
      true,
    )
  } catch {
    return []
  }
}

// ─── Unified Sync: Pull everything from Graph ────────────────────────────

export type GraphSyncResult = {
  agents: GraphBot[]
  securityAlerts: GraphSecurityAlert[]
  auditEvents: GraphAuditEvent[]
  usageReports: CopilotUsageReport[]
  dlpPolicies: GraphDlpPolicy[]
  syncedAt: string
  tenantId: string
}

/**
 * Full sync: fetch all data from Graph API in parallel
 * This is called periodically (e.g. every 5 minutes) or on-demand
 */
export async function syncFromGraph(token: GraphToken): Promise<GraphSyncResult> {
  const [agents, securityAlerts, auditEvents, usageReports, dlpPolicies] = await Promise.allSettled([
    fetchCopilotAgents(token),
    fetchSecurityAlerts(token),
    fetchAuditLogs(token),
    fetchCopilotUsageReports(token),
    fetchDlpPolicies(token),
  ])

  return {
    agents: agents.status === 'fulfilled' ? agents.value : [],
    securityAlerts: securityAlerts.status === 'fulfilled' ? securityAlerts.value : [],
    auditEvents: auditEvents.status === 'fulfilled' ? auditEvents.value : [],
    usageReports: usageReports.status === 'fulfilled' ? usageReports.value : [],
    dlpPolicies: dlpPolicies.status === 'fulfilled' ? dlpPolicies.value : [],
    syncedAt: new Date().toISOString(),
    tenantId: token.tenantId,
  }
}

// ─── Map Graph data into our domain model ─────────────────────────────────

function mapGraphSeverity(severity: string): 'critical' | 'high' | 'medium' | 'low' {
  switch (severity) {
    case 'critical': return 'critical'
    case 'high': return 'high'
    case 'medium': return 'medium'
    default: return 'low'
  }
}

function mapGraphAlertStatus(status: string): 'open' | 'acknowledged' | 'resolved' {
  switch (status) {
    case 'resolved': return 'resolved'
    case 'inProgress': return 'acknowledged'
    default: return 'open'
  }
}

export type DomainAgent = {
  id: string
  tenantId: string
  name: string
  owner: string
  environment: string
  businessPurpose: string
  autonomyLevel: string
  lastDeployment: string
  status: string
  events24h: number
  openIncidents: number
}

export type DomainAlert = {
  id: string
  tenantId: string
  agentId: string
  policyId: string | null
  title: string
  description: string
  severity: string
  status: string
  createdAt: string
  recommendedAction: string
}

export type DomainEvent = {
  id: string
  tenantId: string
  agentId: string
  timestamp: string
  type: string
  title: string
  summary: string
  outcome: string
  riskScore: number
  actor: string
  target: string | null
  metadata: string | null
}

/**
 * Transform Graph sync results into domain model objects
 * ready to be upserted into the database
 */
export function mapGraphToDomain(sync: GraphSyncResult) {
  const tenantId = sync.tenantId

  const agents: DomainAgent[] = sync.agents.map((bot) => ({
    id: `graph-${bot.id}`,
    tenantId,
    name: bot.displayName,
    owner: 'Microsoft 365',
    environment: 'Copilot Studio' as const,
    businessPurpose: bot.description ?? 'Copilot agent registered in tenant',
    autonomyLevel: bot.configuration?.autonomyLevel ?? 'supervised',
    lastDeployment: bot.publishedDateTime ?? bot.createdDateTime,
    status: 'healthy',
    events24h: 0,
    openIncidents: 0,
  }))

  const alerts: DomainAlert[] = sync.securityAlerts.map((sa) => ({
    id: `graph-alert-${sa.id}`,
    tenantId,
    agentId: agents[0]?.id ?? '',
    policyId: null,
    title: sa.title,
    description: sa.description,
    severity: mapGraphSeverity(sa.severity),
    status: mapGraphAlertStatus(sa.status),
    createdAt: sa.createdDateTime,
    recommendedAction: sa.recommendedActions?.[0]?.description ?? 'Review the alert in the security center.',
  }))

  const events: DomainEvent[] = sync.auditEvents.map((ae) => ({
    id: `graph-event-${ae.id}`,
    tenantId,
    agentId: agents[0]?.id ?? '',
    timestamp: ae.activityDateTime,
    type: ae.category.toLowerCase().includes('policy') ? 'policy_change' : 'api_call',
    title: ae.activityDisplayName,
    summary: `${ae.initiatedBy.user?.displayName ?? ae.initiatedBy.app?.displayName ?? 'System'} performed ${ae.activityDisplayName}`,
    outcome: ae.result === 'success' ? 'success' : 'blocked',
    riskScore: ae.result === 'success' ? 10 : 60,
    actor: ae.initiatedBy.user?.userPrincipalName ?? ae.initiatedBy.app?.displayName ?? 'system',
    target: ae.targetResources[0]?.displayName ?? null,
    metadata: JSON.stringify({
      category: ae.category,
      modifiedProperties: ae.targetResources[0]?.modifiedProperties,
    }),
  }))

  // Update agent stats
  for (const agent of agents) {
    agent.events24h = events.filter((e) => e.agentId === agent.id).length
    agent.openIncidents = alerts.filter((a) => a.agentId === agent.id && a.status === 'open').length
    agent.status = agent.openIncidents > 0 ? 'risk' : 'healthy'
  }

  return { agents, alerts, events }
}
