import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../auth'

type SettingsTab = 'audit' | 'notifications' | 'roles' | 'export' | 'graph'

type AuditEntry = {
  id: string
  timestamp: string
  userId: string
  userEmail: string
  action: string
  resourceType: string
  resourceId: string
  resourceName: string | null
  detail: string | null
  ipAddress: string | null
}

type NotificationChannel = {
  id: string
  type: string
  name: string
  enabled: boolean
}

type UserRole = {
  id: string
  userId: string
  userEmail: string
  role: string
  assignedAt: string
  assignedBy: string
}

type SyncEntry = {
  id: string
  startedAt: string
  completedAt: string | null
  status: string
  agentCount: number | null
  alertCount: number | null
  eventCount: number | null
  errorMessage: string | null
}

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3001/api'

export function SettingsView() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('audit')

  const tabs: Array<{ id: SettingsTab; label: string; description: string }> = [
    { id: 'audit', label: 'Audit trail', description: 'Every action, every user, every change' },
    { id: 'notifications', label: 'Notifications', description: 'Teams, Slack, and email alerts' },
    { id: 'roles', label: 'Access control', description: 'Who can do what' },
    { id: 'export', label: 'Export', description: 'CSV and compliance reports' },
    { id: 'graph', label: 'Graph sync', description: 'Microsoft 365 data connector' },
  ]

  return (
    <div className="settings-view">
      <div className="settings-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`settings-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <strong>{tab.label}</strong>
            <span>{tab.description}</span>
          </button>
        ))}
      </div>

      <div className="settings-content">
        {activeTab === 'audit' && <AuditTrailPanel />}
        {activeTab === 'notifications' && <NotificationsPanel />}
        {activeTab === 'roles' && <RolesPanel />}
        {activeTab === 'export' && <ExportPanel />}
        {activeTab === 'graph' && <GraphSyncPanel />}
      </div>
    </div>
  )
}

// ─── Audit Trail Panel ──────────────────────────────────────────────────

function AuditTrailPanel() {
  const [entries, setEntries] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`${API_BASE}/audit`)
      .then((r) => r.json())
      .then(setEntries)
      .catch(() => setEntries(demoAuditEntries))
      .finally(() => setLoading(false))
  }, [])

  const formatTime = (ts: string) => {
    const d = new Date(ts)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  const actionLabels: Record<string, string> = {
    'alert.acknowledge': 'Acknowledged alert',
    'alert.resolve': 'Resolved alert',
    'alert.reopen': 'Reopened alert',
    'policy.update': 'Updated policy',
    'policy.rollout_change': 'Changed rollout mode',
    'user.login': 'Signed in',
    'user.role_change': 'Changed user role',
    'graph.sync': 'Synced from Graph',
    'export.csv': 'Exported CSV',
    'export.pdf': 'Generated report',
    'notification.configure': 'Configured notification',
  }

  return (
    <section className="settings-panel">
      <div className="panel-header compact">
        <div>
          <p className="eyebrow">Compliance</p>
          <h3>Audit trail</h3>
          <p>Complete record of every action taken in this workspace. Immutable, timestamped, and exportable for compliance reviews.</p>
        </div>
        <button type="button" className="action-button" onClick={() => window.open(`${API_BASE}/export/csv/audit`, '_blank')}>
          Export CSV
        </button>
      </div>

      {loading ? (
        <p className="settings-empty">Loading audit trail...</p>
      ) : entries.length === 0 ? (
        <p className="settings-empty">No audit entries yet. Actions will appear here as users interact with the workspace.</p>
      ) : (
        <div className="audit-list">
          {entries.map((entry) => (
            <div key={entry.id} className="audit-entry">
              <div className="audit-entry-time">{formatTime(entry.timestamp)}</div>
              <div className="audit-entry-body">
                <strong>{actionLabels[entry.action] ?? entry.action}</strong>
                <span className="audit-entry-user">{entry.userEmail}</span>
                {entry.resourceName && <span className="context-chip small-chip">{entry.resourceName}</span>}
                {entry.detail && <p>{entry.detail}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

// ─── Notifications Panel ─────────────────────────────────────────────────

function NotificationsPanel() {
  const [channels, setChannels] = useState<NotificationChannel[]>([])
  const [showForm, setShowForm] = useState(false)
  const [formType, setFormType] = useState<'teams_webhook' | 'slack_webhook' | 'email'>('teams_webhook')
  const [formName, setFormName] = useState('')
  const [formUrl, setFormUrl] = useState('')

  useEffect(() => {
    fetch(`${API_BASE}/notifications/channels`)
      .then((r) => r.json())
      .then(setChannels)
      .catch(() => setChannels([]))
  }, [])

  const handleCreate = async () => {
    const config = formType === 'email'
      ? { smtpHost: 'smtp.office365.com', port: 587, from: 'noreply@company.com', to: [formUrl] }
      : { webhookUrl: formUrl }

    const res = await fetch(`${API_BASE}/notifications/channels`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: formType, name: formName, config }),
    })

    if (res.ok) {
      const { id } = await res.json()
      setChannels([...channels, { id, type: formType, name: formName, enabled: true }])
      setShowForm(false)
      setFormName('')
      setFormUrl('')
    }
  }

  return (
    <section className="settings-panel">
      <div className="panel-header compact">
        <div>
          <p className="eyebrow">Integrations</p>
          <h3>Notification channels</h3>
          <p>Get alerted in Microsoft Teams, Slack, or email when critical incidents occur or trust scores drop.</p>
        </div>
        <button type="button" className="action-button primary" onClick={() => setShowForm(true)}>
          Add channel
        </button>
      </div>

      {showForm && (
        <div className="settings-form-card">
          <h4>New notification channel</h4>
          <div className="settings-form-row">
            <label>
              Type
              <select value={formType} onChange={(e) => setFormType(e.target.value as typeof formType)}>
                <option value="teams_webhook">Microsoft Teams webhook</option>
                <option value="slack_webhook">Slack webhook</option>
                <option value="email">Email</option>
              </select>
            </label>
            <label>
              Name
              <input type="text" placeholder="e.g. Security Team" value={formName} onChange={(e) => setFormName(e.target.value)} />
            </label>
          </div>
          <label>
            {formType === 'email' ? 'Recipient email' : 'Webhook URL'}
            <input type="text" placeholder={formType === 'email' ? 'security@company.com' : 'https://...'} value={formUrl} onChange={(e) => setFormUrl(e.target.value)} />
          </label>
          <div className="settings-form-actions">
            <button type="button" className="action-button primary" onClick={handleCreate} disabled={!formName || !formUrl}>Create</button>
            <button type="button" className="action-button subtle" onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </div>
      )}

      {channels.length === 0 && !showForm ? (
        <p className="settings-empty">No notification channels configured. Add a Teams or Slack webhook to get started.</p>
      ) : (
        <div className="settings-card-grid">
          {channels.map((ch) => (
            <div key={ch.id} className="settings-card">
              <div className="settings-card-header">
                <span className={`pill ${ch.enabled ? 'healthy' : ''}`}>{ch.enabled ? 'Active' : 'Disabled'}</span>
                <span className="context-chip small-chip">{ch.type.replace('_', ' ')}</span>
              </div>
              <strong>{ch.name}</strong>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

// ─── Roles Panel ─────────────────────────────────────────────────────────

function RolesPanel() {
  const [roles, setRoles] = useState<UserRole[]>([])

  useEffect(() => {
    fetch(`${API_BASE}/roles`)
      .then((r) => r.json())
      .then(setRoles)
      .catch(() => setRoles([]))
  }, [])

  const roleDescriptions: Record<string, string> = {
    admin: 'Full access. Can manage settings, assign roles, and configure integrations.',
    operator: 'Can acknowledge, resolve, and manage incidents. Cannot change settings.',
    viewer: 'Read-only access to dashboards, incidents, and policies.',
  }

  return (
    <section className="settings-panel">
      <div className="panel-header compact">
        <div>
          <p className="eyebrow">Access control</p>
          <h3>User roles</h3>
          <p>Control who can view, operate, and administer this workspace. Roles are enforced across the API and UI.</p>
        </div>
      </div>

      <div className="role-grid">
        {['admin', 'operator', 'viewer'].map((role) => (
          <div key={role} className="role-card">
            <div className="role-card-header">
              <strong>{role.charAt(0).toUpperCase() + role.slice(1)}</strong>
              <span className="context-chip small-chip">{roles.filter((r) => r.role === role).length} users</span>
            </div>
            <p>{roleDescriptions[role]}</p>
            {roles.filter((r) => r.role === role).map((r) => (
              <div key={r.id} className="role-user">
                <span className="user-avatar small">{r.userEmail.charAt(0).toUpperCase()}</span>
                <span>{r.userEmail}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </section>
  )
}

// ─── Export Panel ─────────────────────────────────────────────────────────

function ExportPanel() {
  const exports = [
    {
      label: 'Alerts CSV',
      description: 'All incidents with severity, status, and timestamps',
      url: `${API_BASE}/export/csv/alerts`,
      icon: '📋',
    },
    {
      label: 'Agents CSV',
      description: 'Agent inventory with trust scores and deployment status',
      url: `${API_BASE}/export/csv/agents`,
      icon: '🤖',
    },
    {
      label: 'Audit trail CSV',
      description: 'Complete audit log for compliance review',
      url: `${API_BASE}/export/csv/audit`,
      icon: '🔍',
    },
    {
      label: 'Full compliance report',
      description: 'JSON report with agents, alerts, policies, and audit trail',
      url: `${API_BASE}/export/json/report`,
      icon: '📊',
    },
  ]

  return (
    <section className="settings-panel">
      <div className="panel-header compact">
        <div>
          <p className="eyebrow">Compliance</p>
          <h3>Data export</h3>
          <p>Download workspace data for offline analysis, compliance audits, or integration with external tools.</p>
        </div>
      </div>

      <div className="export-grid">
        {exports.map((exp) => (
          <button key={exp.label} type="button" className="export-card" onClick={() => window.open(exp.url, '_blank')}>
            <span className="export-icon">{exp.icon}</span>
            <div>
              <strong>{exp.label}</strong>
              <p>{exp.description}</p>
            </div>
            <span className="export-arrow">↓</span>
          </button>
        ))}
      </div>
    </section>
  )
}

// ─── Graph Sync Panel ────────────────────────────────────────────────────

function GraphSyncPanel() {
  const [history, setHistory] = useState<SyncEntry[]>([])
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<{ status: string; message: string } | null>(null)
  const { getAccessToken } = useAuth()

  const loadHistory = useCallback(() => {
    fetch(`${API_BASE}/graph/sync/history`)
      .then((r) => r.json())
      .then(setHistory)
      .catch(() => setHistory([]))
  }, [])

  useEffect(() => { loadHistory() }, [loadHistory])

  const handleSync = async () => {
    setSyncing(true)
    setSyncResult(null)
    try {
      const token = await getAccessToken()
      if (!token) {
        setSyncResult({ status: 'error', message: 'No access token — sign in with Microsoft Entra ID first.' })
        return
      }

      const res = await fetch(`${API_BASE}/graph/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ accessToken: token }),
      })

      if (res.ok) {
        const data = await res.json()
        setSyncResult({ status: 'success', message: `Synced ${data.agents} agents, ${data.alerts} alerts, ${data.events} events` })
        loadHistory()
      } else {
        const err = await res.json().catch(() => ({ error: 'Unknown error' }))
        setSyncResult({ status: 'error', message: err.detail ?? err.error ?? 'Sync failed' })
      }
    } catch (err) {
      setSyncResult({ status: 'error', message: err instanceof Error ? err.message : 'Network error — is the API running?' })
    } finally {
      setSyncing(false)
    }
  }

  const formatTime = (ts: string) => {
    const d = new Date(ts)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  return (
    <section className="settings-panel">
      <div className="panel-header compact">
        <div>
          <p className="eyebrow">Integration</p>
          <h3>Microsoft Graph connector</h3>
          <p>Sync Copilot agents, security alerts, and audit events from your Microsoft 365 tenant via the Graph API.</p>
        </div>
        <button type="button" className="action-button primary" disabled={syncing} onClick={handleSync}>
          {syncing ? 'Syncing...' : 'Sync now'}
        </button>
      </div>

      {syncResult && (
        <div className={`sync-result-banner ${syncResult.status}`}>
          <span>{syncResult.status === 'success' ? '✓' : '!'}</span>
          <p>{syncResult.message}</p>
        </div>
      )}

      <div className="graph-setup-card">
        <h4>Setup requirements</h4>
        <div className="graph-checklist">
          <div className="graph-check-item">
            <span className="check-icon">1</span>
            <div>
              <strong>Azure AD app registration</strong>
              <p>Create an app in Entra ID with API permissions for Graph</p>
            </div>
          </div>
          <div className="graph-check-item">
            <span className="check-icon">2</span>
            <div>
              <strong>Grant API permissions</strong>
              <p>SecurityEvents.Read.All, AuditLog.Read.All, User.Read.All</p>
            </div>
          </div>
          <div className="graph-check-item">
            <span className="check-icon">3</span>
            <div>
              <strong>Configure environment</strong>
              <p>Set VITE_MSAL_CLIENT_ID and VITE_MSAL_TENANT_ID</p>
            </div>
          </div>
        </div>
      </div>

      {history.length > 0 && (
        <>
          <h4 className="settings-section-title">Sync history</h4>
          <div className="sync-history">
            {history.map((entry) => (
              <div key={entry.id} className={`sync-entry ${entry.status}`}>
                <div className="sync-entry-status">
                  <span className={`pill ${entry.status === 'success' ? 'healthy' : entry.status === 'failed' ? 'critical' : 'watch'}`}>
                    {entry.status}
                  </span>
                  <span>{formatTime(entry.startedAt)}</span>
                </div>
                {entry.status === 'success' && (
                  <p>{entry.agentCount} agents, {entry.alertCount} alerts, {entry.eventCount} events synced</p>
                )}
                {entry.errorMessage && <p className="sync-error">{entry.errorMessage}</p>}
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  )
}

// ─── Demo data (when API is not connected) ──────────────────────────────

const demoAuditEntries: AuditEntry[] = [
  {
    id: '1', timestamp: new Date(Date.now() - 3600000).toISOString(),
    userId: 'dev-user', userEmail: 'admin@northwind.com',
    action: 'alert.acknowledge', resourceType: 'alert', resourceId: 'alert-1',
    resourceName: 'PII exposure in external draft', detail: 'Moved incident to active review',
    ipAddress: '10.0.0.1',
  },
  {
    id: '2', timestamp: new Date(Date.now() - 7200000).toISOString(),
    userId: 'dev-user', userEmail: 'admin@northwind.com',
    action: 'policy.rollout_change', resourceType: 'policy', resourceId: 'policy-1',
    resourceName: 'External send threshold', detail: 'Changed from draft to limited rollout',
    ipAddress: '10.0.0.1',
  },
  {
    id: '3', timestamp: new Date(Date.now() - 14400000).toISOString(),
    userId: 'operator-1', userEmail: 'sarah@northwind.com',
    action: 'export.csv', resourceType: 'alerts', resourceId: 'bulk-export',
    resourceName: null, detail: 'Exported 12 alerts to CSV',
    ipAddress: '10.0.0.5',
  },
  {
    id: '4', timestamp: new Date(Date.now() - 28800000).toISOString(),
    userId: 'dev-user', userEmail: 'admin@northwind.com',
    action: 'user.login', resourceType: 'session', resourceId: 'session-1',
    resourceName: null, detail: 'Signed in via Microsoft Entra ID',
    ipAddress: '10.0.0.1',
  },
]
