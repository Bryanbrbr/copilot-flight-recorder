import { useState } from 'react'
import { MetricCard } from '@/components/shared'
import { useWorkspaceStore } from '@/hooks/useWorkspaceStore'
import { formatTimestamp } from '@cfr/shared'
import { severityLabels, severityRank } from '@/constants/labels'
import { formatCaseAge } from '@/lib/formatCaseAge'
import { getReviewState } from '@/lib/caseHelpers'
import type { Alert, CaseActivityEntry } from '@/types'

export function AlertsView({
  alerts,
  selectedAlertId,
  caseActivity,
  onSelectAlert,
  onUpdateAlertStatus,
  onOpenIncident,
  onOpenGovernance,
  onSelectAgent,
}: {
  alerts: Alert[]
  selectedAlertId?: string
  caseActivity: Record<string, CaseActivityEntry[]>
  onSelectAlert: (alertId: string) => void
  onUpdateAlertStatus: (alertId: string, status: Alert['status']) => void
  onOpenIncident: () => void
  onOpenGovernance: () => void
  onSelectAgent: (agentId: string, openIncident?: boolean) => void
}) {
  const workspace = useWorkspaceStore((s) => s.workspace)
  const [queueFilter, setQueueFilter] = useState<'open' | 'active' | 'all'>('open')
  const open = alerts.filter((alert) => alert.status === 'open').length
  const acknowledged = alerts.filter((alert) => alert.status === 'acknowledged').length
  const critical = alerts.filter((alert) => alert.severity === 'critical').length
  const resolved = alerts.filter((alert) => alert.status === 'resolved').length
  const filteredAlerts = alerts.filter((alert) => {
    if (queueFilter === 'open') return alert.status === 'open'
    if (queueFilter === 'active') return alert.status !== 'resolved'
    return true
  })
  const priorityAlert = alerts.find((alert) => alert.id === selectedAlertId) ?? [...alerts].sort((left, right) => {
    const severityDiff = severityRank[right.severity] - severityRank[left.severity]
    if (severityDiff !== 0) {
      return severityDiff
    }

    return left.status === 'open' && right.status !== 'open' ? -1 : 1
  })[0]
  const queueSummary = [
    { label: 'Critical open', value: alerts.filter((alert) => alert.status === 'open' && alert.severity === 'critical').length, tone: 'critical' },
    { label: 'High open', value: alerts.filter((alert) => alert.status === 'open' && alert.severity === 'high').length, tone: 'high' },
    { label: 'Acknowledged', value: acknowledged, tone: 'medium' },
    { label: 'Resolved', value: resolved, tone: 'low' },
  ]
  const oldestOpenAlert = [...alerts]
    .filter((alert) => alert.status === 'open')
    .sort((left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime())[0]
  const queueDiscipline = [
    {
      label: 'Active queue share',
      value: `${Math.round(((open + acknowledged) / Math.max(alerts.length, 1)) * 100)}%`,
      detail: 'How much of the observed queue still requires live operator handling.',
    },
    {
      label: 'Critical response posture',
      value: critical > 0 ? 'Escalated' : 'Stable',
      detail:
        critical > 0
          ? 'Critical cases are present, so the queue should stay centered on immediate containment.'
          : 'No critical case is currently dominating the triage flow.',
    },
    {
      label: 'Queue discipline',
      value: acknowledged > open ? 'Review-heavy' : open > 0 ? 'Needs first-pass triage' : 'Closed loop',
      detail: 'This indicates whether the queue is mostly waiting for triage, already in review, or largely resolved.',
    },
  ]
  const activeAlerts = alerts.filter((alert) => alert.status !== 'resolved')
  const ownerLoad = Object.values(
    activeAlerts.reduce<Record<string, { label: string; count: number; highest: Alert['severity']; oldest: string }>>((acc, alert) => {
      const owner = workspace.agents.find((agent) => agent.id === alert.agentId)?.owner ?? 'Unknown owner'
      const current = acc[owner] ?? { label: owner, count: 0, highest: alert.severity, oldest: alert.createdAt }
      current.count += 1
      if (severityRank[alert.severity] > severityRank[current.highest]) current.highest = alert.severity
      if (new Date(alert.createdAt).getTime() < new Date(current.oldest).getTime()) current.oldest = alert.createdAt
      acc[owner] = current
      return acc
    }, {}),
  )
    .sort((left, right) => right.count - left.count || severityRank[right.highest] - severityRank[left.highest])
    .slice(0, 4)
  const policyPressure = Object.values(
    activeAlerts.reduce<Record<string, { label: string; count: number; highest: Alert['severity']; oldest: string }>>((acc, alert) => {
      const policy = workspace.policies.find((item) => item.id === alert.policyId)?.name ?? 'Derived signal'
      const current = acc[policy] ?? { label: policy, count: 0, highest: alert.severity, oldest: alert.createdAt }
      current.count += 1
      if (severityRank[alert.severity] > severityRank[current.highest]) current.highest = alert.severity
      if (new Date(alert.createdAt).getTime() < new Date(current.oldest).getTime()) current.oldest = alert.createdAt
      acc[policy] = current
      return acc
    }, {}),
  )
    .sort((left, right) => right.count - left.count || severityRank[right.highest] - severityRank[left.highest])
    .slice(0, 4)
  const priorityAgent = priorityAlert ? workspace.agents.find((item) => item.id === priorityAlert.agentId) : undefined
  const priorityPolicy = priorityAlert ? workspace.policies.find((item) => item.id === priorityAlert.policyId) : undefined
  const ownerWorkloads = ownerLoad.map((item) => ({
    ...item,
    focusAlertId: activeAlerts
      .filter((alert) => (workspace.agents.find((agent) => agent.id === alert.agentId)?.owner ?? 'Unknown owner') === item.label)
      .sort((left, right) => severityRank[right.severity] - severityRank[left.severity] || new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime())[0]?.id,
  }))
  const policyWorkloads = policyPressure.map((item) => ({
    ...item,
    focusAlertId: activeAlerts
      .filter((alert) => (workspace.policies.find((policy) => policy.id === alert.policyId)?.name ?? 'Derived signal') === item.label)
      .sort((left, right) => severityRank[right.severity] - severityRank[left.severity] || new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime())[0]?.id,
  }))
  const selectedQueueAlert = alerts.find((alert) => alert.id === selectedAlertId) ?? priorityAlert
  const selectedQueueAgent = selectedQueueAlert ? workspace.agents.find((agent) => agent.id === selectedQueueAlert.agentId) : undefined
  const selectedQueuePolicy = selectedQueueAlert ? workspace.policies.find((policy) => policy.id === selectedQueueAlert.policyId) : undefined
  const selectedQueueActivity = selectedQueueAlert ? (caseActivity[selectedQueueAlert.id] ?? []).slice(0, 4) : []
  const selectedQueueReview = getReviewState(selectedQueueAlert)
  const selectedQueueWindow =
    selectedQueueAlert?.severity === 'critical'
      ? 'Escalate inside 15 minutes'
      : selectedQueueAlert?.severity === 'high'
        ? 'Review inside 1 hour'
        : selectedQueueAlert
          ? 'Handle in current work cycle'
          : 'No active case'
  const queueDetailCards = selectedQueueAlert
    ? [
        {
          label: 'Assigned owner',
          value: selectedQueueAgent?.owner ?? 'Owner pending',
          detail: 'The owning team remains accountable for containment and review closure.',
        },
        {
          label: 'Policy path',
          value: selectedQueuePolicy?.name ?? 'Derived signal',
          detail: selectedQueuePolicy?.action ?? 'No linked control action',
        },
        {
          label: 'Decision window',
          value: selectedQueueWindow,
          detail: 'Use age and severity together so queue order reflects actual response pressure.',
        },
        {
          label: 'Latest state',
          value: selectedQueueReview.label,
          detail: selectedQueueReview.nextStep,
        },
      ]
    : []

  const queueWorkboard = [
    {
      label: 'Current case owner',
      owner: priorityAgent?.owner ?? 'Owner pending',
      window: priorityAlert ? formatCaseAge(priorityAlert.createdAt) : 'No active case',
      title: priorityAgent?.owner ?? 'No incident owner selected',
      detail: priorityAlert
        ? `${priorityAlert.title} is currently ${getReviewState(priorityAlert).label.toLowerCase()} and should stay with the active owner until containment is confirmed.`
        : 'No incident is currently selected for queue review.',
      cta: 'Open incident',
      onClick: onOpenIncident,
    },
    {
      label: 'Policy follow-up',
      owner: selectedAlertId && priorityPolicy ? 'Policy operations' : 'Governance',
      window: priorityPolicy ? priorityPolicy.scope : 'No linked policy',
      title: priorityPolicy?.name ?? 'No linked policy selected',
      detail: priorityPolicy
        ? `${priorityPolicy.action} remains the active control path for this queue item.`
        : 'Open a policy-linked case to inspect the exact control boundary.',
      cta: 'Open policy',
      onClick: onOpenGovernance,
    },
    {
      label: 'Queue clock',
      owner: oldestOpenAlert ? 'Queue manager' : 'Queue stable',
      window: oldestOpenAlert ? formatCaseAge(oldestOpenAlert.createdAt) : 'Stable',
      title: oldestOpenAlert ? oldestOpenAlert.title : 'No aging open case',
      detail: oldestOpenAlert
        ? 'This is the oldest open case in the queue and is the strongest candidate for immediate first-pass triage.'
        : 'No unresolved case is currently aging beyond the normal queue window.',
      cta: oldestOpenAlert ? 'Focus oldest case' : 'Stay on queue',
      onClick: oldestOpenAlert ? (() => onSelectAlert(oldestOpenAlert.id)) : (() => {}),
    },
  ]

  return (
    <section className="view-grid alerts-layout">
      <article className="panel metrics-span-2">
        <div className="panel-header compact">
          <div>
            <p className="eyebrow">Queue</p>
            <h2>Incident queue</h2>
          </div>
          <span className="subtle">Designed for analyst triage, owner review, and policy follow-up.</span>
        </div>
        <div className="metric-grid metric-grid-compact">
          <MetricCard label="Open incidents" value={open} helper="Still waiting for action" />
          <MetricCard label="Acknowledged" value={acknowledged} helper="Known and being handled" />
          <MetricCard label="Critical" value={critical} helper="Highest governance severity" />
          <MetricCard label="Oldest open" value={oldestOpenAlert ? formatCaseAge(oldestOpenAlert.createdAt) : '0'} helper="How long the oldest untriaged case has been waiting" />
        </div>
      </article>

      <article className="panel metrics-span-2">
        <div className="panel-header compact">
          <div>
            <p className="eyebrow">Triage queue</p>
            <h2>What needs attention first</h2>
          </div>
          <span className="subtle">A tighter queue makes the alert center feel like an operating surface, not a report.</span>
        </div>
        <div className="triage-filter-bar" role="tablist" aria-label="Alert queue filter">
          {[
            ['open', `Open only (${open})`],
            ['active', `Active work (${open + acknowledged})`],
            ['all', `All incidents (${alerts.length})`],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={`triage-filter-chip ${queueFilter === value ? 'active' : ''}`}
              onClick={() => setQueueFilter(value as 'open' | 'active' | 'all')}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="triage-grid">
          {queueSummary.map((item) => (
            <div key={item.label} className="triage-card">
              <span className={`pill small ${item.tone}`}>{item.label}</span>
              <strong>{item.value}</strong>
            </div>
          ))}
        </div>
        <div className="queue-discipline-grid">
          {queueDiscipline.map((item) => (
            <div key={item.label} className="queue-discipline-card">
              <span className="dossier-label">{item.label}</span>
              <strong>{item.value}</strong>
              <p>{item.detail}</p>
            </div>
          ))}
        </div>
        {priorityAlert ? (
          <div className="priority-spotlight selected-spotlight">
            <div>
              <span className="dossier-label">Incident spotlight</span>
              <strong>{priorityAlert.title}</strong>
              <p>{priorityAlert.description}</p>
            </div>
            <div className="priority-spotlight-meta spotlight-actions">
              <span className={`pill small ${priorityAlert.severity}`}>{severityLabels[priorityAlert.severity]}</span>
              <span className="trust-chip">{workspace.agents.find((agent) => agent.id === priorityAlert.agentId)?.owner ?? 'Unknown owner'}</span>
              <span className="context-chip small-chip">Age {formatCaseAge(priorityAlert.createdAt)}</span>
              <span className={`pill small ${getReviewState(priorityAlert).tone}`}>{getReviewState(priorityAlert).label}</span>
              <button type="button" className="action-button subtle" onClick={onOpenIncident}>
                Open incident
              </button>
              <button type="button" className="action-button subtle" onClick={onOpenGovernance}>
                Open policy
              </button>
              <button type="button" className="action-button" onClick={() => onUpdateAlertStatus(priorityAlert.id, priorityAlert.status === 'acknowledged' ? 'open' : 'acknowledged')}>
                {priorityAlert.status === 'acknowledged' ? 'Return to open' : 'Acknowledge'}
              </button>
              <button type="button" className="action-button subtle" onClick={() => onUpdateAlertStatus(priorityAlert.id, priorityAlert.status === 'resolved' ? 'open' : 'resolved')}>
                {priorityAlert.status === 'resolved' ? 'Reopen' : 'Resolve'}
              </button>
            </div>
          </div>
        ) : null}
      </article>

      <article className="panel metrics-span-2">
        <div className="panel-header compact">
          <div>
            <p className="eyebrow">Queue workboard</p>
            <h2>Who should act next</h2>
          </div>
          <span className="subtle">Keep the queue tied to an owner, a policy path, and the next review move.</span>
        </div>
        <div className="program-board-grid">
          {queueWorkboard.map((item) => (
            <div key={item.label} className="program-board-card">
              <div className="program-board-top">
                <span className="dossier-label">{item.label}</span>
                <span className="context-chip small-chip">{item.window}</span>
              </div>
              <strong>{item.title}</strong>
              <p>{item.detail}</p>
              <div className="program-board-meta">
                <span className="trust-chip">Owner {item.owner}</span>
                <button type="button" className="action-button subtle" onClick={item.onClick}>{item.cta}</button>
              </div>
            </div>
          ))}
        </div>
      </article>

      <article className="panel metrics-span-2 operations-pressure-panel">
        <div className="panel-header compact">
          <div>
            <p className="eyebrow">Operations pressure</p>
            <h2>Who carries the queue</h2>
          </div>
          <span className="subtle">A strong queue shows which teams are under review load and which policies are generating the most pressure.</span>
        </div>
        <div className="operations-pressure-grid">
          <div className="pressure-column">
            <span className="dossier-label">Owner load</span>
            <div className="pressure-list">
              {ownerWorkloads.length === 0 ? (
                <div className="pressure-item empty">
                  <strong>No active owner load</strong>
                  <p>All visible incidents are currently resolved.</p>
                </div>
              ) : ownerWorkloads.map((item) => (
                <button key={item.label} type="button" className="pressure-item pressure-item-button" onClick={() => item.focusAlertId ? (onSelectAlert(item.focusAlertId), onOpenIncident()) : undefined}>
                  <div className="pressure-item-top">
                    <strong>{item.label}</strong>
                    <span className={`pill small ${item.highest}`}>{item.count} active</span>
                  </div>
                  <p>Oldest case age {formatCaseAge(item.oldest)}</p>
                </button>
              ))}
            </div>
          </div>
          <div className="pressure-column">
            <span className="dossier-label">Policy pressure</span>
            <div className="pressure-list">
              {policyWorkloads.length === 0 ? (
                <div className="pressure-item empty">
                  <strong>No active policy pressure</strong>
                  <p>The current queue does not show unresolved policy-linked cases.</p>
                </div>
              ) : policyWorkloads.map((item) => (
                <button key={item.label} type="button" className="pressure-item pressure-item-button" onClick={() => item.focusAlertId ? (onSelectAlert(item.focusAlertId), onOpenIncident()) : undefined}>
                  <div className="pressure-item-top">
                    <strong>{item.label}</strong>
                    <span className={`pill small ${item.highest}`}>{item.count} active</span>
                  </div>
                  <p>Oldest case age {formatCaseAge(item.oldest)}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </article>

      <article className="panel metrics-span-2 queue-split-panel">
        <div className="table-caption">
          <span className="dossier-label">Visible queue</span>
          <strong>{filteredAlerts.length} incidents</strong>
          <p>Review the queue as live work on the left, then use the selected case pane on the right to route, decide, and close with confidence.</p>
        </div>
        <div className="queue-split-layout">
          <div className="table-shell">
            <table>
              <thead>
                <tr>
                  <th>Severity</th>
                  <th>Agent</th>
                  <th>Owner</th>
                  <th>Issue</th>
                  <th>Policy</th>
                  <th>Age</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredAlerts.length === 0 ? (
                  <tr>
                    <td colSpan={8}>
                      <div className="table-empty-state">
                        <strong>No incidents match this filter.</strong>
                        <p>Try a broader queue view to inspect acknowledged or resolved work.</p>
                      </div>
                    </td>
                  </tr>
                ) : filteredAlerts.map((alert) => {
                  const agent = workspace.agents.find((item) => item.id === alert.agentId)
                  const policy = workspace.policies.find((item) => item.id === alert.policyId)

                  return (
                    <tr key={alert.id} className={selectedAlertId === alert.id ? 'table-row-selected' : ''} onClick={() => onSelectAlert(alert.id)}>
                      <td>
                        <span className={`pill small ${alert.severity}`}>{severityLabels[alert.severity]}</span>
                      </td>
                      <td>{agent?.name ?? alert.agentId}</td>
                      <td>{agent?.owner ?? 'Unknown owner'}</td>
                      <td>
                        <strong>{alert.title}</strong>
                        <p>{alert.description}</p>
                      </td>
                      <td>{policy?.name ?? 'Derived signal'}</td>
                      <td>{formatCaseAge(alert.createdAt)}</td>
                      <td>
                        <span className={`pill small ${alert.status === 'resolved' ? 'low' : alert.status === 'acknowledged' ? 'medium' : alert.severity}`}>{alert.status}</span>
                      </td>
                      <td>
                        <div className="table-actions">
                          <button
                            type="button"
                            className="table-action-button subtle"
                            onClick={(event) => {
                              event.stopPropagation()
                              onSelectAlert(alert.id)
                              onOpenIncident()
                            }}
                          >
                            Open incident
                          </button>
                          <button
                            type="button"
                            className="table-action-button subtle"
                            onClick={(event) => {
                              event.stopPropagation()
                              onSelectAlert(alert.id)
                              onOpenGovernance()
                            }}
                          >
                            Open policy
                          </button>
                          <button
                            type="button"
                            className="table-action-button"
                            onClick={(event) => {
                              event.stopPropagation()
                              onUpdateAlertStatus(alert.id, alert.status === 'acknowledged' ? 'open' : 'acknowledged')
                            }}
                          >
                            {alert.status === 'acknowledged' ? 'Reopen' : 'Acknowledge'}
                          </button>
                          <button
                            type="button"
                            className="table-action-button subtle"
                            onClick={(event) => {
                              event.stopPropagation()
                              onUpdateAlertStatus(alert.id, alert.status === 'resolved' ? 'open' : 'resolved')
                            }}
                          >
                            {alert.status === 'resolved' ? 'Restore' : 'Resolve'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <aside className="queue-detail-pane">
            <div className="queue-detail-top">
              <div>
                <p className="eyebrow">Selected incident</p>
                <h3>{selectedQueueAlert?.title ?? 'No selected incident'}</h3>
                <p className="subtle">{selectedQueueAlert?.description ?? 'Choose an incident from the queue to inspect its owner, policy path, and recent operator actions.'}</p>
              </div>
              <div className="policy-detail-badges">
                {selectedQueueAlert ? <span className={`pill small ${selectedQueueAlert.severity}`}>{severityLabels[selectedQueueAlert.severity]}</span> : null}
                {selectedQueueAlert ? <span className={`pill small ${selectedQueueReview.tone}`}>{selectedQueueReview.label}</span> : null}
                {selectedQueueAlert ? <span className="context-chip small-chip">Age {formatCaseAge(selectedQueueAlert.createdAt)}</span> : null}
              </div>
            </div>
            {selectedQueueAlert ? (
              <>
                <div className="queue-detail-actions">
                  <button type="button" className="action-button primary" onClick={onOpenIncident}>Open incident</button>
                  <button type="button" className="action-button" onClick={() => selectedQueueAgent && onSelectAgent(selectedQueueAgent.id, false)}>Open asset</button>
                  <button type="button" className="action-button" onClick={onOpenGovernance}>Open policy</button>
                  <button type="button" className="action-button subtle" onClick={() => onUpdateAlertStatus(selectedQueueAlert.id, selectedQueueAlert.status === 'acknowledged' ? 'open' : 'acknowledged')}>
                    {selectedQueueAlert.status === 'acknowledged' ? 'Return to open' : 'Acknowledge'}
                  </button>
                  <button type="button" className="action-button subtle" onClick={() => onUpdateAlertStatus(selectedQueueAlert.id, selectedQueueAlert.status === 'resolved' ? 'open' : 'resolved')}>
                    {selectedQueueAlert.status === 'resolved' ? 'Reopen' : 'Resolve'}
                  </button>
                </div>
                <div className="queue-detail-grid">
                  {queueDetailCards.map((item) => (
                    <div key={item.label} className="queue-summary-card">
                      <span className="dossier-label">{item.label}</span>
                      <strong>{item.value}</strong>
                      <p>{item.detail}</p>
                    </div>
                  ))}
                </div>
                <div className="queue-route-card">
                  <div className="panel-header compact">
                    <div>
                      <p className="eyebrow">Routing context</p>
                      <h3>Why this case belongs here</h3>
                    </div>
                  </div>
                  <dl className="policy-definition-list queue-route-list">
                    <div>
                      <dt>Asset</dt>
                      <dd>{selectedQueueAgent?.name ?? 'Unknown agent'}</dd>
                    </div>
                    <div>
                      <dt>Owner</dt>
                      <dd>{selectedQueueAgent?.owner ?? 'Owner pending'}</dd>
                    </div>
                    <div>
                      <dt>Policy</dt>
                      <dd>{selectedQueuePolicy?.name ?? 'Derived signal'}</dd>
                    </div>
                    <div>
                      <dt>Recommended action</dt>
                      <dd>{selectedQueueAlert.recommendedAction}</dd>
                    </div>
                  </dl>
                </div>
                <div className="queue-activity-card">
                  <div className="panel-header compact">
                    <div>
                      <p className="eyebrow">Recent activity</p>
                      <h3>Latest queue decisions</h3>
                    </div>
                  </div>
                  <div className="decision-journal-list compact-journal-list">
                    {selectedQueueActivity.length === 0 ? (
                      <div className="decision-journal-entry empty">
                        <strong>No decision has been logged yet.</strong>
                        <p>The case will start building history as operators acknowledge, resolve, or reopen it.</p>
                      </div>
                    ) : (
                      selectedQueueActivity.map((entry) => (
                        <div key={entry.id} className="decision-journal-entry">
                          <div className="decision-journal-top">
                            <div>
                              <span className="dossier-label">{entry.actor}</span>
                              <strong>{entry.action}</strong>
                            </div>
                            <span className="context-chip small-chip">{formatTimestamp(entry.timestamp)}</span>
                          </div>
                          <p>{entry.detail}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="table-empty-state policy-empty-state">
                <strong>No incident selected.</strong>
                <p>Choose a queue item to inspect the case routing, current owner, and recent operator actions.</p>
              </div>
            )}
          </aside>
        </div>
      </article>    </section>
  )
}
