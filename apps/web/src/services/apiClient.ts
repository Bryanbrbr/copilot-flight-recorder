import type { Agent, AgentEvent, Alert, Policy } from '@/types'
import type { CaseActivityEntry } from '@/types'

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3001/api'

// Token provider — set by auth layer so API calls include the JWT
let tokenProvider: (() => Promise<string | null>) | null = null

export function setApiTokenProvider(provider: () => Promise<string | null>) {
  tokenProvider = provider
}

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }

  if (tokenProvider) {
    const token = await tokenProvider()
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
  }

  const res = await fetch(`${API_BASE}${path}`, {
    headers,
    ...init,
  })

  if (res.status === 401) {
    // Token expired or invalid — let the auth layer handle redirect
    window.location.href = '/'
    throw new Error('Unauthorized')
  }

  if (!res.ok) throw new Error(`API ${res.status}: ${res.statusText}`)
  return res.json()
}

// --- Raw API row types (snake_case from SQLite) ---

type ApiAgent = {
  id: string
  tenant_id: string
  name: string
  owner: string
  environment: string
  business_purpose: string
  autonomy_level: string
  last_deployment: string
  status: string
  events_24h: number
  open_incidents: number
}

type ApiEvent = {
  id: string
  tenant_id: string
  agent_id: string
  timestamp: string
  type: string
  title: string
  summary: string
  outcome: string
  risk_score: number
  actor: string
  target: string | null
  metadata: string | null
}

type ApiPolicy = {
  id: string
  tenant_id: string
  name: string
  description: string
  enabled: number | boolean
  severity: string
  scope: string
  trigger: string
  action: string
}

type ApiAlert = {
  id: string
  tenant_id: string
  agent_id: string
  policy_id: string | null
  title: string
  description: string
  severity: string
  status: string
  created_at: string
  recommended_action: string
}

type ApiCaseActivity = {
  id: string
  tenant_id: string
  alert_id: string
  timestamp: string
  actor: string
  action: string
  detail: string
}

type ApiWorkspace = {
  agents: ApiAgent[]
  events: ApiEvent[]
  policies: ApiPolicy[]
  alerts: ApiAlert[]
  caseActivity: Record<string, ApiCaseActivity[]>
}

// --- Mappers ---

function mapAgent(row: ApiAgent): Agent {
  return {
    id: row.id,
    name: row.name,
    owner: row.owner,
    environment: row.environment as Agent['environment'],
    businessPurpose: row.business_purpose,
    autonomyLevel: row.autonomy_level as Agent['autonomyLevel'],
    lastDeployment: row.last_deployment,
    status: row.status as Agent['status'],
    events24h: row.events_24h,
    openIncidents: row.open_incidents,
  }
}

function mapEvent(row: ApiEvent): AgentEvent {
  return {
    id: row.id,
    agentId: row.agent_id,
    timestamp: row.timestamp,
    type: row.type as AgentEvent['type'],
    title: row.title,
    summary: row.summary,
    outcome: row.outcome as AgentEvent['outcome'],
    riskScore: row.risk_score,
    actor: row.actor,
    target: row.target ?? undefined,
    metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
  }
}

function mapPolicy(row: ApiPolicy): Policy {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    enabled: Boolean(row.enabled),
    severity: row.severity as Policy['severity'],
    scope: row.scope as Policy['scope'],
    trigger: row.trigger,
    action: row.action as Policy['action'],
  }
}

function mapAlert(row: ApiAlert): Alert {
  return {
    id: row.id,
    agentId: row.agent_id,
    title: row.title,
    description: row.description,
    severity: row.severity as Alert['severity'],
    status: row.status as Alert['status'],
    createdAt: row.created_at,
    policyId: row.policy_id ?? undefined,
    recommendedAction: row.recommended_action,
  }
}

function mapCaseActivity(row: ApiCaseActivity): CaseActivityEntry {
  return {
    id: row.id,
    alertId: row.alert_id,
    timestamp: row.timestamp,
    actor: row.actor,
    action: row.action,
    detail: row.detail,
  }
}

// --- Public API ---

export type WorkspacePayload = {
  agents: Agent[]
  events: AgentEvent[]
  policies: Policy[]
  alerts: Alert[]
  caseActivity: Record<string, CaseActivityEntry[]>
}

export async function fetchWorkspace(): Promise<WorkspacePayload> {
  const raw = await fetchJson<ApiWorkspace>('/workspace')
  const caseActivity: Record<string, CaseActivityEntry[]> = {}
  for (const [alertId, entries] of Object.entries(raw.caseActivity)) {
    caseActivity[alertId] = entries.map(mapCaseActivity)
  }
  return {
    agents: raw.agents.map(mapAgent),
    events: raw.events.map(mapEvent),
    policies: raw.policies.map(mapPolicy),
    alerts: raw.alerts.map(mapAlert),
    caseActivity,
  }
}

export async function patchAlertStatus(alertId: string, status: Alert['status']): Promise<void> {
  await fetchJson(`/alerts/${alertId}`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  })
}

export async function postCaseActivity(
  alertId: string,
  entry: { actor: string; action: string; detail: string },
): Promise<CaseActivityEntry> {
  const raw = await fetchJson<ApiCaseActivity>(`/alerts/${alertId}/activity`, {
    method: 'POST',
    body: JSON.stringify(entry),
  })
  return mapCaseActivity(raw)
}
