import { useState } from 'react'
import { MetricCard } from '@/components/shared'
import { useWorkspaceStore } from '@/hooks/useWorkspaceStore'
import { getAgentEvents, getInsight, formatTimestamp } from '@cfr/shared'
import { connectedSurfaces } from '@/constants/surfaces'
import { agentAdminRecords, agentOverviewSignals } from '@/constants/agentRecords'
import { formatCaseAge } from '@/lib/formatCaseAge'
import { getEffectivePolicyRolloutMode } from '@/lib/policyHelpers'
import type { Agent, Alert, Policy } from '@/types'
import type { PolicyRolloutMode } from '@/types'
import { computeWorkspaceMetrics } from '@cfr/shared'

export function DashboardView({
  selectedAgent,
  alerts,
  rolloutModes,
  onOpenIncident,
  onSelectAgent,
  onOpenPolicies,
}: {
  selectedAgent: Agent
  alerts: Alert[]
  rolloutModes: Record<string, PolicyRolloutMode>
  onOpenIncident: (alertId?: string) => void
  onSelectAgent: (agentId: string, openIncident?: boolean) => void
  onOpenPolicies: () => void
}) {
  const workspace = useWorkspaceStore((s) => s.workspace)
  const metrics = computeWorkspaceMetrics(workspace)
  const [registryFilter, setRegistryFilter] = useState<'all' | 'published' | 'requested' | 'restricted'>('all')
  const insight = getInsight(workspace, selectedAgent.id)
  const agentAlerts = alerts.filter((alert) => alert.agentId === selectedAgent.id && alert.status !== 'resolved')
  const selectedAgentEvents = getAgentEvents(workspace, selectedAgent.id)
  const weakestAgents = [...workspace.insights]
    .slice()
    .sort((left, right) => left.trustScore - right.trustScore)
    .slice(0, 3)
    .map((item) => ({
      ...item,
      agent: workspace.agents.find((agent) => agent.id === item.agentId),
    }))
  const connectedCount = connectedSurfaces.filter((surface) => surface.status === 'connected').length
  const watchCount = connectedSurfaces.filter((surface) => surface.status === 'watch').length
  const plannedCount = connectedSurfaces.filter((surface) => surface.status === 'planned').length
  const approvalRequested = workspace.events.filter((event) => event.type === 'approval.requested').length
  const approvalGranted = workspace.events.filter((event) => event.type === 'approval.granted').length
  const approvalSkipped = workspace.events.filter((event) => event.type === 'approval.skipped').length
  const approvalGap = Math.max(approvalRequested - approvalGranted, 0)
  const selectedRiskEvents = selectedAgentEvents.filter((event) => event.riskScore >= 70).length
  const selectedAgentRecord = agentAdminRecords[selectedAgent.id]
  const selectedAgentSignal = agentOverviewSignals[selectedAgent.id]
  const getPolicyMode = (policy: Policy) => getEffectivePolicyRolloutMode(policy, alerts, rolloutModes)
  const livePolicyCount = workspace.policies.filter((policy) => getPolicyMode(policy) !== 'draft').length
  const publishedPolicyCount = workspace.policies.filter((policy) => getPolicyMode(policy) === 'live').length
  const limitedPolicyCount = workspace.policies.filter((policy) => getPolicyMode(policy) === 'limited').length
  const requestQueue = Object.entries(agentAdminRecords)
    .map(([agentId, record]) => ({
      agent: workspace.agents.find((agent) => agent.id === agentId),
      record,
      linkedAlerts: alerts.filter((alert) => alert.agentId === agentId && alert.status !== 'resolved').length,
    }))
    .filter(({ record }) => record.availability === 'Requested' || record.catalogState === 'Pending review')
  const firstRequestedAgent = requestQueue[0]
  const orgPublishedCount = Object.values(agentOverviewSignals).filter((record) => record.publisherType === 'Organization').length
  const partnerPublishedCount = Object.values(agentOverviewSignals).filter((record) => record.publisherType === 'Partner').length
  const platformCount = new Set(Object.values(agentOverviewSignals).map((record) => record.platform)).size
  const ownerlessAgents = Object.entries(agentOverviewSignals)
    .map(([agentId, signal]) => ({
      agent: workspace.agents.find((agent) => agent.id === agentId),
      signal,
    }))
    .filter(({ signal }) => signal.ownerState === 'Ownerless')
  const activeUsers7d = Array.from({ length: 7 }, (_, index) =>
    Object.values(agentOverviewSignals).reduce((total, signal) => total + (signal.usage7d[index] ?? 0), 0),
  )
  const peakActiveUsers = Math.max(...activeUsers7d, 1)
  const guardedExecutionShare = Math.round((metrics.blockedActions / Math.max(workspace.events.length, 1)) * 100)
  const governedAgents = workspace.agents.filter((agent) => agent.status !== 'critical').length
  const controlDebt = approvalGap + approvalSkipped + plannedCount
  const highestExposureAgent = weakestAgents[0]
  const executiveSignals = [
    {
      label: 'Governed assets',
      value: `${governedAgents}/${workspace.agents.length}`,
      helper: 'Agents already operating inside an observable control boundary.',
    },
    {
      label: 'Protected execution share',
      value: `${guardedExecutionShare}%`,
      helper: 'Runs that ended with direct containment before crossing the boundary.',
    },
    {
      label: 'Control debt',
      value: controlDebt,
      helper: 'Approval gaps, skipped checks, and planned surfaces still diluting trust.',
    },
    {
      label: 'Highest exposure',
      value: highestExposureAgent?.agent?.name ?? selectedAgent.name,
      helper: 'The workflow that would justify immediate rollout expansion and deeper coverage.',
    },
  ]
  const boardSummary =
    metrics.blockedActions > 0
      ? `${metrics.blockedActions} blocked action${metrics.blockedActions > 1 ? 's' : ''} were contained before protected data or outbound behavior crossed a policy boundary.`
      : 'No blocked actions were recorded in the current sample, so the strongest value signal remains prevention readiness.'
  const executiveRecommendation =
    controlDebt >= 4
      ? {
          title: 'Close control debt before wider rollout',
          detail: 'Approval bypasses and unmodeled surfaces are still the main blockers to trusted expansion.',
          action: 'Close approval gaps and extend surface coverage first.',
        }
      : plannedCount > 0
        ? {
            title: 'Expand coverage into planned surfaces',
            detail: 'The current control model is working, but the tenant still has blind spots that limit executive trust.',
            action: 'Bring Purview and the remaining policy context into the live model.',
          }
        : {
            title: 'Scale governed autonomy',
            detail: 'The environment is demonstrating enough containment to support a broader controlled rollout.',
            action: 'Increase governed agent coverage and tighten review SLAs.',
          }
  const investmentSignals = [
    { label: 'Next move', value: executiveRecommendation.title },
    { label: 'Why now', value: executiveRecommendation.detail },
    { label: 'Do next', value: executiveRecommendation.action },
  ]
  const blindSpots = [
    plannedCount > 0
      ? 'Purview classification is still modeled as future context, so some data sensitivity decisions remain partially inferred.'
      : null,
    watchCount > 0
      ? 'Copilot Studio traces are flowing, but watch-state surfaces still need deeper approval and identity correlation.'
      : null,
    approvalSkipped > 0
      ? 'Approval bypasses exist in the event stream, which means control logic is not yet fully closed around sensitive paths.'
      : null,
  ].filter(Boolean) as string[]

  const rolloutReadiness = Math.max(
    18,
    Math.min(
      92,
      Math.round(
        (governedAgents / Math.max(workspace.agents.length, 1)) * 45 +
          guardedExecutionShare * 0.35 +
          (connectedCount / Math.max(connectedSurfaces.length, 1)) * 20 -
          controlDebt * 6,
      ),
    ),
  )
  const readinessState =
    rolloutReadiness >= 75
      ? { label: 'Ready for controlled expansion', tone: 'low' as const }
      : rolloutReadiness >= 55
        ? { label: 'Ready with conditions', tone: 'medium' as const }
        : { label: 'Expansion should stay restricted', tone: 'high' as const }
  const heroSignals = [
    {
      label: 'Rollout readiness',
      title: `${rolloutReadiness}/100`,
      detail: readinessState.label,
      tone: readinessState.tone,
    },
    {
      label: 'Primary blocker',
      title: blindSpots[0] ? 'Control debt still visible' : 'No major blocker exposed',
      detail: blindSpots[0] ?? 'The current tenant sample is not exposing a major control gap right now.',
      tone: blindSpots[0] ? 'high' : 'low',
    },
    {
      label: 'Recommended action',
      title: executiveRecommendation.title,
      detail: executiveRecommendation.action,
      tone: 'medium',
    },
  ]
  const activeReviewCount = alerts.filter((alert) => alert.status === 'acknowledged').length
  const adminActions = [
    {
      label: 'Pending requests',
      title: requestQueue.length > 0 ? `${requestQueue.length} agent request${requestQueue.length > 1 ? 's' : ''} need admin review` : 'Request queue is clear',
      detail:
        requestQueue.length > 0
          ? `${firstRequestedAgent?.agent?.name} is still waiting on sharing, consent, or owner review.`
          : 'No agent is currently blocked in request review.',
      tone: requestQueue.length > 0 ? 'medium' as const : 'low' as const,
      cta: 'Open policies',
      onClick: onOpenPolicies,
    },
    {
      label: 'Owner assignment',
      title: ownerlessAgents.length > 0 ? `${ownerlessAgents.length} agent${ownerlessAgents.length > 1 ? 's are' : ' is'} still ownerless` : 'Every agent has an owner',
      detail:
        ownerlessAgents.length > 0
          ? `${ownerlessAgents[0]?.agent?.name ?? 'One private agent'} still needs an accountable owner before broader use.`
          : 'Owner assignment is present across the current sample inventory.',
      tone: ownerlessAgents.length > 0 ? 'high' as const : 'low' as const,
      cta: ownerlessAgents.length > 0 && ownerlessAgents[0]?.agent ? 'Open incident' : 'Stay in overview',
      onClick: ownerlessAgents.length > 0 && ownerlessAgents[0]?.agent ? () => onSelectAgent(ownerlessAgents[0].agent!.id, true) : () => onSelectAgent(selectedAgent.id),
    },
    {
      label: 'Active review load',
      title: activeReviewCount > 0 ? `${activeReviewCount} case${activeReviewCount > 1 ? 's' : ''} still in active review` : 'Review load is under control',
      detail:
        activeReviewCount > 0
          ? 'Close active cases before moving more agents into a broader publish ring.'
          : 'The current review queue is light enough to support controlled publication decisions.',
      tone: activeReviewCount > 0 ? 'medium' as const : 'low' as const,
      cta: activeReviewCount > 0 ? 'Open queue' : 'Open policies',
      onClick: activeReviewCount > 0 ? () => onOpenIncident() : onOpenPolicies,
    },
  ]
  const programBoard = [
    {
      label: 'Immediate next step',
      owner: approvalSkipped > 0 ? 'Security and governance' : selectedAgent.owner,
      window: approvalSkipped > 0 ? 'This review cycle' : 'Before next publish',
      title: approvalSkipped > 0 ? 'Close approval bypasses before wider sharing' : 'Keep the selected workflow inside governed review',
      detail: approvalSkipped > 0 ? 'Skipped approvals still create the largest trust gap in the tenant.' : 'The current asset is stable enough to review for wider governed use, but only after its incident path is clean.',
      cta: approvalSkipped > 0 ? 'Open queue' : 'Open incident',
      onClick: approvalSkipped > 0 ? () => onOpenIncident() : () => onOpenIncident(),
    },
    {
      label: 'Coverage program',
      owner: 'Platform operations',
      window: plannedCount > 0 ? 'Next rollout ring' : 'Monitor weekly',
      title: plannedCount > 0 ? 'Bring planned surfaces into the live control model' : 'Keep connected surfaces healthy as rollout expands',
      detail: plannedCount > 0 ? 'Planned surfaces still limit how much of the tenant can be governed with confidence.' : 'Surface coverage is ahead of policy pressure, which supports cleaner publication decisions.',
      cta: 'Open policies',
      onClick: onOpenPolicies,
    },
    {
      label: 'Publishing decision',
      owner: 'Tenant admin',
      window: activeReviewCount > 0 ? 'After case closure' : 'Current ring',
      title: activeReviewCount > 0 ? 'Hold broader publication until review pressure drops' : 'Tenant is ready for the next controlled rollout step',
      detail: activeReviewCount > 0 ? 'Live review load is still active, so publication should stay gated.' : 'Review load is controlled enough to support a broader governed release motion.',
      cta: activeReviewCount > 0 ? 'Open queue' : 'Open policies',
      onClick: activeReviewCount > 0 ? () => onOpenIncident() : onOpenPolicies,
    },
  ]
  const publishingPipeline = [
    {
      label: 'Private use',
      title: 'Current owner workflows',
      detail: 'Agents stay limited to their current owning teams while policies and replay stay stable.',
      tone: 'low' as const,
    },
    {
      label: 'Shared with reviewers',
      title: approvalSkipped > 0 ? 'Do not expand sharing yet' : 'Sharing path is controlled',
      detail: approvalSkipped > 0 ? 'Approval bypasses still need to be closed before broader team access.' : 'Sharing can stay inside reviewed groups without losing the policy boundary.',
      tone: approvalSkipped > 0 ? 'high' as const : 'low' as const,
    },
    {
      label: 'Requested for catalog',
      title: plannedCount > 0 ? 'Hold request until coverage expands' : 'Ready for controlled request flow',
      detail: plannedCount > 0 ? 'Planned surfaces still need to join the control model before broader discoverability.' : 'Current surfaces and review flow are sufficient for a governed request step.',
      tone: plannedCount > 0 ? 'medium' as const : 'low' as const,
    },
    {
      label: 'Approved for wider rollout',
      title: activeReviewCount > 0 ? 'Keep rollout ring limited' : 'Eligible for next ring review',
      detail: activeReviewCount > 0 ? 'Active review load still argues for a narrower publish ring.' : 'The tenant is close to a broader governed rollout if current stability holds.',
      tone: activeReviewCount > 0 ? 'medium' as const : 'low' as const,
    },
  ]
  const agentRegistryRows = workspace.agents
    .map((agent) => {
      const record = agentAdminRecords[agent.id]
      const signal = agentOverviewSignals[agent.id]
      const linkedAlerts = alerts.filter((alert) => alert.agentId === agent.id && alert.status !== 'resolved')

      return {
        agent,
        record,
        signal,
        linkedAlerts,
      }
    })
    .sort((left, right) => right.linkedAlerts.length - left.linkedAlerts.length || left.agent.name.localeCompare(right.agent.name))
  const visibleRegistryRows = agentRegistryRows.filter((row) => {
    if (registryFilter === 'published') return row.record.availability === 'Published'
    if (registryFilter === 'requested') return row.record.availability === 'Requested' || row.record.catalogState === 'Pending review'
    if (registryFilter === 'restricted') return row.record.availability === 'Private' || row.record.availability === 'Limited release'
    return true
  })
  const recentAdminActivity = [
    ...requestQueue.map(({ agent, record }) => ({
      id: `request-${agent?.id ?? record.requestOwner}`,
      label: 'Request pending',
      title: agent?.name ?? 'Requested agent',
      detail: `${record.requestOwner} is reviewing ${record.accessPolicy.toLowerCase()}.`,
      meta: `${record.lifecycleStage} / ${record.lastReview}`,
      tone: 'medium' as const,
      onClick: agent ? () => onSelectAgent(agent.id) : onOpenPolicies,
    })),
    ...alerts
      .filter((alert) => alert.status !== 'resolved')
      .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
      .map((alert) => {
        const alertAgent = workspace.agents.find((agent) => agent.id === alert.agentId)
        return {
          id: `alert-${alert.id}`,
          label: alert.status === 'acknowledged' ? 'Case in review' : 'Open incident',
          title: alert.title,
          detail: `${alertAgent?.name ?? alert.agentId} / ${alert.recommendedAction}`,
          meta: `${formatCaseAge(alert.createdAt)} old`,
          tone: alert.severity === 'critical' || alert.severity === 'high' ? 'high' as const : 'medium' as const,
          onClick: () => onOpenIncident(alert.id),
        }
      }),
    ].slice(0, 6)
  const selectedAssetCards = [
    {
      label: 'Lifecycle',
      title: `${selectedAgentRecord.lifecycleStage} / ${selectedAgentRecord.availability}`,
      detail: `${selectedAgentRecord.catalogState} / ${selectedAgentRecord.assignment}`,
    },
    {
      label: 'Owner and review',
      title: selectedAgent.owner,
      detail: `Admin reviewer ${selectedAgentRecord.requestOwner} / Last review ${selectedAgentRecord.lastReview}`,
    },
    {
      label: 'Identity and consent',
      title: `${selectedAgentRecord.identityMode} / ${selectedAgentRecord.adminConsent}`,
      detail: selectedAgentRecord.permissions.join(' / '),
    },
    {
      label: 'Host products and metering',
      title: selectedAgentRecord.supportedApps.join(' / '),
      detail: `${selectedAgentSignal.platform} / ${selectedAgentRecord.metering}`,
    },
  ]
  const selectedAssetActions = [
    {
      label: 'Case load',
      title: agentAlerts.length > 0 ? `${agentAlerts.length} active incident${agentAlerts.length === 1 ? '' : 's'}` : 'No active incident',
      detail:
        agentAlerts.length > 0
          ? 'Keep this asset inside controlled review until the current incident path is closed.'
          : 'This asset currently has no active incident and can stay in standard admin review.',
      cta: agentAlerts.length > 0 ? 'Open incident' : 'Open policies',
      tone: agentAlerts.length > 0 ? 'medium' as const : 'low' as const,
      onClick: agentAlerts.length > 0 ? () => onOpenIncident(agentAlerts[0]?.id) : onOpenPolicies,
    },
    {
      label: 'Catalog and access',
      title: selectedAgentRecord.accessPolicy,
      detail: `${selectedAgentRecord.availability} / ${selectedAgentRecord.catalogState}`,
      cta: 'Open policies',
      tone: selectedAgentRecord.adminConsent === 'Required' ? 'high' as const : 'medium' as const,
      onClick: onOpenPolicies,
    },
  ]
  return (
    <section className="view-grid dashboard-grid">
      <article className="panel hero-panel metrics-span-2">
        <div className="hero-layout">
          <div className="hero-copy-block">
            <span className="eyebrow">Operations workspace</span>
            <h2>Admin center for monitored agents and policy-backed review.</h2>
            <p className="hero-copy">
              See which agents need attention, what control gaps remain, and which rollout decision is safe today.
            </p>

          </div>

          <div className="hero-sidecard">
            <div className="hero-sidecard-top">
              <p className="eyebrow">Current posture</p>
              <span className={`pill ${selectedAgent.status}`}>{selectedAgent.status}</span>
            </div>
            <strong className="hero-sidecard-title">{selectedAgent.name}</strong>
            <p>{selectedAgent.businessPurpose}</p>
            <div className="hero-sidecard-grid">
              <div>
                <span>Trust score</span>
                <strong>{insight?.trustScore ?? '--'}</strong>
              </div>
              <div>
                <span>Open findings</span>
                <strong>{agentAlerts.filter((alert) => alert.status === 'open').length}</strong>
              </div>
              <div>
                <span>Autonomy</span>
                <strong>{selectedAgent.autonomyLevel}</strong>
              </div>
              <div>
                <span>Last deploy</span>
                <strong>{formatTimestamp(selectedAgent.lastDeployment)}</strong>
              </div>
            </div>
          </div>
        </div>
      </article>
      <article className="panel metrics-span-2 hero-signals-panel">
        <div className="hero-callout-grid">
          {heroSignals.map((item) => (
            <div key={item.label} className="hero-callout-card">
              <div className="hero-callout-top">
                <span className="dossier-label">{item.label}</span>
                <span className={`pill small ${item.tone}`}>{item.tone === "low" ? "stable" : item.tone === "medium" ? "watch" : "priority"}</span>
              </div>
              <strong>{item.title}</strong>
              <p>{item.detail}</p>
            </div>
          ))}
        </div>
      </article>
      <article className="panel metrics-span-2 executive-panel">
        <div className="panel-header compact">
          <div>
            <p className="eyebrow">Recommendations</p>
            <h2>Recommended for this tenant</h2>
          </div>
          <span className="subtle">Use this section to understand the current recommendation, the reason behind it, and the next safe rollout move.</span>
        </div>
        <div className="executive-summary-card">
          <div>
            <span className="dossier-label">Protected outcome</span>
            <strong>{boardSummary}</strong>
          </div>
          <p>This summary explains what was protected, what is still blocking rollout, and where the next admin decision should land.</p>
        </div>
        <div className="executive-decision-strip">
          {investmentSignals.map((item) => (
            <div key={item.label} className="decision-card">
              <span className="dossier-label">{item.label}</span>
              <strong>{item.value}</strong>
            </div>
          ))}
        </div>
        <div className="executive-grid">
          {executiveSignals.map((item) => (
            <div key={item.label} className="executive-card">
              <span className="dossier-label">{item.label}</span>
              <strong>{item.value}</strong>
              <p>{item.helper}</p>
            </div>
          ))}
        </div>
      </article>

      <article className="panel metrics-span-2 program-board-panel">
        <div className="panel-header compact">
          <div>
            <p className="eyebrow">Program board</p>
            <h2>What should happen next</h2>
          </div>
          <span className="subtle">This is the operational board for the tenant: owner, window, and the next action that keeps rollout credible.</span>
        </div>
        <div className="program-board-grid">
          {programBoard.map((item) => (
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

      <article className="panel metrics-span-2 publishing-pipeline-panel">
        <div className="panel-header compact">
          <div>
            <p className="eyebrow">Publishing pipeline</p>
            <h2>From private use to broader rollout</h2>
          </div>
          <span className="subtle">Reflects a Microsoft-style path from owner-only use to controlled broader availability.</span>
        </div>
        <div className="publishing-pipeline-grid">
          {publishingPipeline.map((item) => (
            <div key={item.label} className="publishing-pipeline-card">
              <div className="publishing-pipeline-top">
                <span className="dossier-label">{item.label}</span>
                <span className={`pill small ${item.tone}`}>{item.tone === 'low' ? 'ready' : item.tone === 'medium' ? 'watch' : 'hold'}</span>
              </div>
              <strong>{item.title}</strong>
              <p>{item.detail}</p>
            </div>
          ))}
        </div>
      </article>

      <article className="panel metrics-span-2 admin-actions-panel">
        <div className="panel-header compact">
          <div>
            <p className="eyebrow">Top actions for you</p>
            <h2>What needs admin attention now</h2>
          </div>
          <span className="subtle">Keep this list short, actionable, and tied to the same lifecycle and sharing controls the admin center would expose.</span>
        </div>
        <div className="admin-actions-grid">
          {adminActions.map((item) => (
            <div key={item.label} className="admin-action-card">
              <div className="admin-action-top">
                <span className="dossier-label">{item.label}</span>
                <span className={`pill small ${item.tone}`}>{item.tone === 'low' ? 'ready' : item.tone === 'medium' ? 'watch' : 'priority'}</span>
              </div>
              <strong>{item.title}</strong>
              <p>{item.detail}</p>
              <button type="button" className="action-button subtle" onClick={item.onClick}>{item.cta}</button>
            </div>
          ))}
        </div>
      </article>

      <article className="panel metrics-span-2">
        <div className="panel-header compact">
          <div>
            <p className="eyebrow">Agent 365 overview</p>
            <h2>Inventory, publishers, and usage</h2>
          </div>
          <span className="subtle">This should read like a real admin summary: what exists, who publishes it, where it runs, and whether usage is actually growing inside governed boundaries.</span>
        </div>
        <div className="metric-grid metric-grid-wide">
          <MetricCard label="Agents from your org" value={orgPublishedCount} helper="Published or staged by internal publishers" />
          <MetricCard label="Partner-built agents" value={partnerPublishedCount} helper="External or platform-published inventory that still needs governance context" />
          <MetricCard label="Platforms in use" value={platformCount} helper="Distinct agent platforms currently visible in the inventory" />
          <MetricCard label="Live rules" value={livePolicyCount} helper={`${publishedPolicyCount} published and ${limitedPolicyCount} limited`} />
        </div>
        <div className="overview-insight-grid">
          <div className="overview-insight-card primary">
            <span className="dossier-label">7-day active users</span>
            <strong>{activeUsers7d[activeUsers7d.length - 1]}</strong>
            <p>Usage should be visible next to publication state so admins can tell whether a governed agent is actually adopted.</p>
            <div className="usage-sparkline" aria-hidden="true">
              {activeUsers7d.map((value, index) => (
                <span
                  key={`${value}-${index}`}
                  className="usage-bar"
                  style={{ height: `${Math.max(18, Math.round((value / peakActiveUsers) * 64))}px` }}
                />
              ))}
            </div>
          </div>
          <div className="overview-insight-card">
            <span className="dossier-label">Publisher and platform</span>
            <strong>{selectedAgentRecord.publisher}</strong>
            <p>{selectedAgentSignal.publisherType} publisher / {selectedAgentSignal.platform}</p>
            <div className="inventory-detail-meta">
              <span className="context-chip small-chip">{selectedAgentRecord.availability}</span>
              <span className="context-chip small-chip">{selectedAgentRecord.catalogState}</span>
              <span className="context-chip small-chip">{agentOverviewSignals[selectedAgent.id].platform}</span>
            </div>
          </div>
          <div className="overview-insight-card">
            <span className="dossier-label">Owner coverage</span>
            <strong>{ownerlessAgents.length > 0 ? `${ownerlessAgents.length} ownerless` : 'All assigned'}</strong>
            <p>{ownerlessAgents.length > 0 ? `${ownerlessAgents[0]?.agent?.name ?? 'One private agent'} still needs accountable ownership before broader use.` : 'Owner assignment is present across the current sample inventory.'}</p>
          </div>
        </div>
      </article>

      <article className="panel metrics-span-2 admin-home-panel">
        <div className="panel-header compact">
          <div>
            <p className="eyebrow">Admin home</p>
            <h2>Catalog and admin activity</h2>
          </div>
          <span className="subtle">Bring the managed catalog, recent requests, and current incident pressure into one operator view.</span>
        </div>
        <div className="admin-home-grid">
          <div className="registry-table-shell">
            <div className="table-caption">
              <strong>Agent registry</strong>
              <p>Modeled after a tenant admin list: publisher, host products, lifecycle, and linked incident pressure.</p>
            </div>
            <div className="triage-filter-bar" role="tablist" aria-label="Agent registry filter">
              {[
                ['all', `All agents (${agentRegistryRows.length})`],
                ['published', `Published (${agentRegistryRows.filter((row) => row.record.availability === 'Published').length})`],
                ['requested', `Requested (${agentRegistryRows.filter((row) => row.record.availability === 'Requested' || row.record.catalogState === 'Pending review').length})`],
                ['restricted', `Restricted (${agentRegistryRows.filter((row) => row.record.availability === 'Private' || row.record.availability === 'Limited release').length})`],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  className={`triage-filter-chip ${registryFilter === value ? 'active' : ''}`}
                  onClick={() => setRegistryFilter(value as 'all' | 'published' | 'requested' | 'restricted')}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="table-shell">
              <table>
                <thead>
                  <tr>
                    <th>Agent</th>
                    <th>Publisher</th>
                    <th>Host products</th>
                    <th>Availability</th>
                    <th>Last review</th>
                    <th>Pressure</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleRegistryRows.length === 0 ? (
                    <tr>
                      <td colSpan={7}>
                        <div className="table-empty-state">
                          <strong>No agents match this catalog view.</strong>
                          <p>Switch filters to review requested, published, or restricted agents.</p>
                        </div>
                      </td>
                    </tr>
                  ) : visibleRegistryRows.map((row) => (
                    <tr key={row.agent.id} className={row.agent.id === selectedAgent.id ? 'table-row-selected' : undefined}>
                      <td>
                        <div className="registry-primary">
                          <strong>{row.agent.name}</strong>
                          <p>{row.signal.platform} / {row.record.lifecycleStage}</p>
                        </div>
                      </td>
                      <td>
                        <div className="registry-primary">
                          <strong>{row.record.publisher}</strong>
                          <p>{row.signal.publisherType} publisher</p>
                        </div>
                      </td>
                      <td>
                        <div className="host-products">
                          {row.record.supportedApps.map((item) => (
                            <span key={item} className="context-chip small-chip">{item}</span>
                          ))}
                        </div>
                      </td>
                      <td>
                        <div className="host-products">
                          <span className="context-chip small-chip">{row.record.availability}</span>
                          <span className="context-chip small-chip">{row.record.catalogState}</span>
                        </div>
                      </td>
                      <td>
                        <div className="registry-primary">
                          <strong>{row.record.lastReview}</strong>
                          <p>{row.record.requestOwner}</p>
                        </div>
                      </td>
                      <td>
                        <div className="registry-primary">
                          <strong>{row.linkedAlerts.length}</strong>
                          <p>{row.linkedAlerts.length === 0 ? 'No active incidents' : 'Active incidents linked'}</p>
                        </div>
                      </td>
                      <td>
                        <div className="table-actions">
                          <button type="button" className="table-action-button" onClick={() => onSelectAgent(row.agent.id)}>Open asset</button>
                          <button type="button" className="table-action-button subtle" onClick={() => onSelectAgent(row.agent.id, true)}>Open incident</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="admin-activity-feed">
            <div className="table-caption">
              <strong>Recent admin activity</strong>
              <p>Recent requests, open cases, and review work that should stay visible from the home view.</p>
            </div>
            {recentAdminActivity.map((item) => (
              <button key={item.id} type="button" className="activity-feed-item" onClick={item.onClick}>
                <div className="activity-feed-top">
                  <span className="dossier-label">{item.label}</span>
                  <span className={`pill small ${item.tone}`}>{item.meta}</span>
                </div>
                <strong>{item.title}</strong>
                <p>{item.detail}</p>
              </button>
            ))}
          </div>
          </div>
      </article>

      <article className="panel metrics-span-2 selected-asset-panel">
        <div className="panel-header compact">
          <div>
            <p className="eyebrow">Selected asset admin state</p>
            <h2>Lifecycle, access, and accountability</h2>
          </div>
          <span className="subtle">Keep the active asset readable from one place: owner, lifecycle ring, consent state, and the next action.</span>
        </div>
        <div className="selected-asset-shell">
          <div className="selected-asset-overview">
            <div className="selected-asset-summary">
              <div className="selected-asset-summary-top">
                <span className="dossier-label">{selectedAgent.name}</span>
                <span className={`pill small ${selectedAgent.status}`}>{selectedAgent.status}</span>
              </div>
              <strong>{selectedAgent.businessPurpose}</strong>
              <p>{selectedAgentRecord.publisher} / {selectedAgentSignal.publisherType} publisher / {selectedAgentSignal.platform}</p>
              <div className="inventory-detail-meta">
                <span className="context-chip small-chip">{selectedAgentRecord.version}</span>
                <span className="context-chip small-chip">{selectedAgentRecord.availability}</span>
                <span className="context-chip small-chip">{selectedAgentRecord.catalogState}</span>
                <span className="context-chip small-chip">Trust {insight?.trustScore ?? '--'}</span>
              </div>
            </div>
            <div className="selected-asset-card-grid">
              {selectedAssetCards.map((item) => (
                <div key={item.label} className="selected-asset-card">
                  <span className="dossier-label">{item.label}</span>
                  <strong>{item.title}</strong>
                  <p>{item.detail}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="selected-asset-actions">
            {selectedAssetActions.map((item) => (
              <div key={item.label} className="selected-asset-action-card">
                <div className="selected-asset-summary-top">
                  <span className="dossier-label">{item.label}</span>
                  <span className={`pill small ${item.tone}`}>{item.tone === 'low' ? 'clear' : item.tone === 'medium' ? 'watch' : 'review'}</span>
                </div>
                <strong>{item.title}</strong>
                <p>{item.detail}</p>
                <button type="button" className="action-button subtle" onClick={item.onClick}>{item.cta}</button>
              </div>
            ))}
          </div>
        </div>
      </article>

      <article className="panel metrics-span-2">
        <div className="panel-header compact">
          <div>
            <p className="eyebrow">Coverage and blind spots</p>
            <h2>Tenant control coverage</h2>
          </div>
          <span className="subtle">Use this to verify which services are already inside the control model and which still need onboarding.</span>
        </div>
        <div className="coverage-strip">
          <div className="coverage-card">
            <span className="dossier-label">Connected surfaces</span>
            <strong>{connectedCount} of {connectedSurfaces.length}</strong>
            <p>Production-linked data and identity surfaces already inside the control model.</p>
          </div>
          <div className="coverage-card">
            <span className="dossier-label">Approval health</span>
            <strong>{approvalRequested - approvalSkipped}/{approvalRequested || 1}</strong>
            <p>Approval paths that remained inside governed flow rather than skipping or degrading.</p>
          </div>
          <div className="coverage-card">
            <span className="dossier-label">Selected agent risk</span>
            <strong>{selectedRiskEvents} elevated event{selectedRiskEvents > 1 ? 's' : ''}</strong>
            <p>High-risk nodes currently attached to the active investigation surface.</p>
          </div>
        </div>
        <div className="blindspot-list">
          {blindSpots.map((item) => (
            <div key={item} className="blindspot-item">
              <span className="severity-dot high" />
              <p>{item}</p>
            </div>
          ))}
          {blindSpots.length === 0 ? (
            <div className="blindspot-item">
              <span className="severity-dot low" />
              <p>No major modeling gap is currently exposed by the sample tenant.</p>
            </div>
          ) : null}
        </div>
      </article>

      <article className="panel metrics-span-2">
        <div className="panel-header compact">
          <div>
            <p className="eyebrow">Approval bottlenecks</p>
            <h2>Where governance slows or leaks</h2>
          </div>
          <span className="subtle">This is where operators see if review is healthy or if policy is creating friction without enough closure.</span>
        </div>
        <div className="approval-grid">
          <div className="approval-card">
            <span className="dossier-label">Requested</span>
            <strong>{approvalRequested}</strong>
            <p>Approval prompts raised by agents across the monitored workspace.</p>
          </div>
          <div className="approval-card">
            <span className="dossier-label">Granted</span>
            <strong>{approvalGranted}</strong>
            <p>Requests that completed the governed path and returned a usable approval signal.</p>
          </div>
          <div className="approval-card warning">
            <span className="dossier-label">Gap</span>
            <strong>{approvalGap}</strong>
            <p>Requests still waiting, degraded, or otherwise not closed by the review loop.</p>
          </div>
          <div className="approval-card risk">
            <span className="dossier-label">Skipped</span>
            <strong>{approvalSkipped}</strong>
            <p>Bypasses that indicate a control boundary is not yet fully enforced end to end.</p>
          </div>
        </div>
      </article>

      <article className="panel metrics-span-2">
        <div className="panel-header compact">
          <div>
            <p className="eyebrow">Needs attention</p>
            <h2>Current risk and exposed agents</h2>
          </div>
          <span className="subtle">Keep the dashboard focused on what an operator should review next, not everything the workspace knows.</span>
        </div>
        <div className="attention-grid">
          <div>
            <span className="dossier-label">Selected agent findings</span>
            <ul className="signal-list">
              {agentAlerts.length === 0 ? (
                <li className="signal-item empty">No active alerts for this agent.</li>
              ) : (
                agentAlerts.map((alert) => (
                  <li key={alert.id} className="signal-item actionable">
                    <button type="button" className="signal-button" onClick={() => onOpenIncident(alert.id)}>
                      <div>
                        <span className={`severity-dot ${alert.severity}`} />
                        <strong>{alert.title}</strong>
                      </div>
                      <p>{alert.recommendedAction}</p>
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>
          <div>
            <span className="dossier-label">Most exposed agents</span>
            <div className="weak-list">
              {weakestAgents.map((item) => (
                <button key={item.agentId} type="button" className="weak-item weak-item-button" onClick={() => onSelectAgent(item.agentId, true)}>
                  <div>
                    <strong>{item.agent?.name ?? item.agentId}</strong>
                    <p>{item.agent?.environment ?? 'Unknown surface'}</p>
                  </div>
                  <div className="weak-meta">
                    <span className="trust-chip">Trust {item.trustScore}</span>
                    <span>{item.riskyEvents} risky events</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </article>
    </section>
  )
}
