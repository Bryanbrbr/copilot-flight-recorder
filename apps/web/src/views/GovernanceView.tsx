import { useState } from 'react'
import { PolicyCard, SurfaceCard } from '@/components/shared'
import { useWorkspaceStore } from '@/hooks/useWorkspaceStore'
import { getInsight, formatTimestamp } from '@cfr/shared'
import { connectedSurfaces, controlLayers } from '@/constants/surfaces'
import { simulationScenarios } from '@/constants/simulation'
import { agentAdminRecords } from '@/constants/agentRecords'
import { severityLabels, severityRank } from '@/constants/labels'
import { formatCaseAge } from '@/lib/formatCaseAge'
import { getEffectivePolicyRolloutMode, getEffectivePolicyStatusLabel } from '@/lib/policyHelpers'
import { getReviewState } from '@/lib/caseHelpers'
import type { Alert, Policy } from '@/types'
import type { CaseActivityEntry, PolicyRolloutMode } from '@/types'

export function GovernanceView({
  highlightedPolicyId,
  alerts,
  caseActivity,
  rolloutModes,
  onSelectAgent,
  onOpenIncident,
  onOpenQueue,
  onSetPolicyRollout,
  onFocusPolicy,
}: {
  highlightedPolicyId?: string
  alerts: Alert[]
  caseActivity: Record<string, CaseActivityEntry[]>
  rolloutModes: Record<string, PolicyRolloutMode>
  onSelectAgent: (agentId: string, openIncident?: boolean) => void
  onOpenIncident: (alertId?: string) => void
  onOpenQueue: (alertId?: string) => void
  onSetPolicyRollout: (policyId: string, mode: PolicyRolloutMode) => void
  onFocusPolicy: (policyId: string) => void
}) {
  const workspace = useWorkspaceStore((s) => s.workspace)
  const [selectedPolicyId, setSelectedPolicyId] = useState(workspace.policies[0]?.id ?? '')
  const [policyFilter, setPolicyFilter] = useState<'all' | 'live' | 'incident'>('all')
  const selectedPolicy =
    workspace.policies.find((policy) => policy.id === highlightedPolicyId) ??
    workspace.policies.find((policy) => policy.id === selectedPolicyId) ??
    workspace.policies[0]
  const getPolicyMode = (policy?: Policy) => getEffectivePolicyRolloutMode(policy, alerts, rolloutModes)
  const getPolicyStatusLabel = (policy?: Policy) => getEffectivePolicyStatusLabel(policy, alerts, rolloutModes)
  const visiblePolicies = workspace.policies.filter((policy) => {
    if (policyFilter === 'live') return getPolicyMode(policy) !== 'draft'
    if (policyFilter === 'incident') return alerts.some((alert) => alert.policyId === policy.id && alert.status !== 'resolved')
    return true
  })
  const selectedScenario = selectedPolicy ? simulationScenarios[selectedPolicy.id] : null
  const handleSelectPolicy = (policyId: string) => {
    setSelectedPolicyId(policyId)
    onFocusPolicy(policyId)
  }
  const linkedIncidentPolicy = highlightedPolicyId ? workspace.policies.find((policy) => policy.id === highlightedPolicyId) : null
  const selectedPolicyAlerts = selectedPolicy ? alerts.filter((alert) => alert.policyId === selectedPolicy.id) : []
  const selectedPolicyOpenAlerts = selectedPolicyAlerts.filter((alert) => alert.status !== 'resolved').length
  const selectedPolicyOwner =
    selectedPolicy?.scope === 'Finance'
      ? 'Finance controls'
      : selectedPolicy?.scope === 'Sales'
        ? 'Revenue operations'
        : 'Security and governance'
  const selectedPolicyMode = getPolicyMode(selectedPolicy)
  const selectedPolicyLive = selectedPolicyMode !== 'draft'
  const selectedPolicyBroad = selectedPolicyMode === 'live'
  const selectedPolicyRollout = getPolicyStatusLabel(selectedPolicy)
  const rolloutTrack =
    selectedPolicyOpenAlerts > 0 && selectedPolicyLive
      ? {
          stage: 'Stabilize live rollout',
          blocker: 'Active incidents still point to rule tuning or ownership gaps.',
          unlock: 'Close linked incidents and prove approval paths stay intact under load.',
        }
      : selectedPolicyBroad
        ? {
            stage: 'Expand governed coverage',
            blocker: 'Coverage is healthy, but connected surfaces still limit confidence.',
            unlock: 'Extend the model into planned surfaces and keep review latency low.',
          }
        : {
            stage: 'Promote from draft',
            blocker: 'This rule is still modeled, not trusted in live response behavior.',
            unlock: 'Validate the simulation path, then publish with a limited rollout ring.',
          }
  const rolloutBoard = [
    { label: 'Current stage', value: rolloutTrack.stage },
    { label: 'Main blocker', value: rolloutTrack.blocker },
    { label: 'Unlock condition', value: rolloutTrack.unlock },
  ]
  const controlMaturity = [
    {
      label: 'Identity binding',
      state: 'Healthy',
      detail: 'Tenant, owner, and approval context are visible in the current operating model.',
      tone: 'low',
    },
    {
      label: 'Approval integrity',
      state: selectedPolicyOpenAlerts > 0 ? 'Needs tuning' : 'Healthy',
      detail:
        selectedPolicyOpenAlerts > 0
          ? 'Linked incidents still suggest reviewer friction or rule tuning work.'
          : 'Approval outcomes are consistent enough to support broader publication.',
      tone: selectedPolicyOpenAlerts > 0 ? 'medium' : 'low',
    },
    {
      label: 'Data sensitivity context',
      state: connectedSurfaces.some((surface) => surface.name === 'Purview' && surface.status === 'connected') ? 'Live' : 'Partial',
      detail: 'Classification context is still incomplete until Purview becomes part of the live control surface.',
      tone: connectedSurfaces.some((surface) => surface.name === 'Purview' && surface.status === 'connected') ? 'low' : 'high',
    },
    {
      label: 'Rule deployment',
      state: selectedPolicyRollout,
      detail: 'Rollout maturity should move from draft to published only when incident pressure stays controlled.',
      tone: selectedPolicyLive ? 'medium' : 'high',
    },
  ]
  const rolloutRings = [
    {
      label: 'Ring 0',
      title: 'Control owners only',
      detail: 'Draft validation with policy owners and a single governed workflow.',
      active: selectedPolicyMode === 'draft',
    },
    {
      label: 'Ring 1',
      title: 'Limited production',
      detail: 'Publish to a small live slice with active review and approval tracing.',
      active: selectedPolicyMode === 'limited',
    },
    {
      label: 'Ring 2',
      title: 'Broad governed rollout',
      detail: 'Scale across connected surfaces once linked incidents stay contained.',
      active: selectedPolicyMode === 'live',
    },
  ]
  const recentPolicyActivity = selectedPolicy
    ? selectedPolicyAlerts
        .flatMap((alert) => (caseActivity[alert.id] ?? []).map((entry) => ({ ...entry, alertTitle: alert.title })))
        .sort((left, right) => right.timestamp.localeCompare(left.timestamp))
        .slice(0, 3)
    : []
  const linkedAgentCoverage = Object.values(
    selectedPolicyAlerts.reduce<Record<string, { id: string; name: string; surface: string; trustScore: number; lastReview: string; incidents: number }>>((acc, alert) => {
      const agent = workspace.agents.find((item) => item.id === alert.agentId)
      if (!agent) return acc

      const current = acc[agent.id] ?? {
        id: agent.id,
        name: agent.name,
        surface: agent.environment,
        trustScore: getInsight(workspace, agent.id)?.trustScore ?? 0,
        lastReview: agentAdminRecords[agent.id]?.lastReview ?? 'Not reviewed',
        incidents: 0,
      }

      current.incidents += 1
      acc[agent.id] = current
      return acc
    }, {}),
  ).sort((left, right) => right.incidents - left.incidents || left.trustScore - right.trustScore)
  const plannedSurfaceCount = connectedSurfaces.filter((surface) => surface.status === 'planned').length
  const controlSystem = [
    {
      label: 'Sharing controls',
      title: selectedPolicyOpenAlerts > 0 ? 'Keep sharing scoped to reviewed owners' : 'Sharing boundary is ready',
      detail:
        selectedPolicyOpenAlerts > 0
          ? 'Linked incidents still need review, so publishing and sharing should stay limited to managed owner groups.'
          : 'The current rule supports controlled sharing and coauthoring inside governed teams.',
      tone: selectedPolicyOpenAlerts > 0 ? 'high' as const : 'low' as const,
    },
    {
      label: 'Connector governance',
      title: `${connectedSurfaces.filter((surface) => surface.status === 'connected').length}/${connectedSurfaces.length} surfaces in the control model`,
      detail:
        plannedSurfaceCount > 0
          ? 'One or more surfaces still need connector-level governance before broader rollout.'
          : 'Connected surfaces already participate in replay, policy, and review context.',
      tone: plannedSurfaceCount > 0 ? 'medium' as const : 'low' as const,
    },
    {
      label: 'Publishing controls',
      title: selectedPolicyLive ? 'Policy-backed publishing is available' : 'Keep this rule in draft promotion',
      detail:
        selectedPolicyLive
          ? 'The rule can guard outbound or sensitive behavior, but publishing should stay tied to live incident outcomes.'
          : 'Validate the simulation path before moving this rule into tenant-wide publishing flows.',
      tone: selectedPolicyLive ? 'medium' as const : 'high' as const,
    },
    {
      label: 'Lifecycle approvals',
      title: selectedPolicyRollout,
      detail: rolloutTrack.unlock,
      tone: selectedPolicyOpenAlerts > 0 ? 'medium' as const : selectedPolicyLive ? 'low' as const : 'high' as const,
    },
  ]
  const connectedAdminControls = [
    {
      title: 'Identity and access',
      detail: 'Owner, scope, and approval context stay visible so policy decisions remain attributable.',
    },
    {
      title: 'Data protection',
      detail: connectedSurfaces.some((surface) => surface.name === 'Purview' && surface.status === 'connected')
        ? 'Classification context is already attached to the control system.'
        : 'Purview context is still planned, so data protection remains only partially modeled.',
    },
    {
      title: 'Review workflow',
      detail: selectedPolicyOpenAlerts > 0
        ? 'Linked incidents are still feeding review pressure back into this policy.'
        : 'Current review flow suggests the rule can support broader publication.',
    },
  ]
  const publishReadiness = [
    {
      title: 'Current gate',
      detail: selectedPolicyRollout,
    },
    {
      title: 'Next rollout step',
      detail: rolloutTrack.stage,
    },
    {
      title: 'Success condition',
      detail: rolloutTrack.unlock,
    },
  ]
  const catalogAccess = [
    {
      label: 'Catalog visibility',
      title: selectedPolicyBroad ? 'Eligible for governed request flow' : 'Keep hidden from broader request surfaces',
      detail: selectedPolicyBroad
        ? 'This rule is stable enough to support a controlled catalog or request experience.'
        : 'Leave the agent in limited visibility until incidents and rollout pressure drop.',
    },
    {
      label: 'Access model',
      title: selectedPolicyOpenAlerts > 0 ? 'Owner and reviewer groups only' : 'Scoped sharing is possible',
      detail: selectedPolicyOpenAlerts > 0
        ? 'Keep access limited to owning teams and reviewers while this rule is still under pressure.'
        : 'Sharing can expand to a larger reviewed audience without losing the approval boundary.',
    },
    {
      label: 'Admin dependency',
      title: plannedSurfaceCount > 0 ? 'Connector onboarding still required' : 'Core admin dependencies are in place',
      detail: plannedSurfaceCount > 0
        ? 'Do not widen access until the remaining planned surfaces are governed too.'
        : 'Current identity, replay, and policy controls are present for the selected rule.',
    },
  ]
  const policyChangeLog = [
    {
      title: 'Rollout state',
      detail: `${selectedPolicyRollout} for ${selectedPolicy?.name ?? 'selected policy'}`,
      timestamp: selectedPolicyOpenAlerts > 0 ? 'Now' : 'Current sample',
    },
    {
      title: 'Linked incident load',
      detail: `${selectedPolicyAlerts.length} incident${selectedPolicyAlerts.length === 1 ? '' : 's'} observed for this rule, ${selectedPolicyOpenAlerts} still active.`,
      timestamp: selectedPolicyAlerts[0] ? formatTimestamp(selectedPolicyAlerts[0].createdAt) : 'No recent incident',
    },
    ...(recentPolicyActivity.length > 0
      ? recentPolicyActivity.map((entry) => ({
          title: entry.action,
          detail: `${entry.alertTitle} - ${entry.detail}`,
          timestamp: formatTimestamp(entry.timestamp),
        }))
      : [
          {
            title: 'No recent operator action',
            detail: 'The selected rule does not yet have a recent decision recorded in this sample.',
            timestamp: 'Current sample',
          },
        ]),
  ].slice(0, 4)
  const requestCount = Object.values(agentAdminRecords).filter((record) => record.availability === 'Requested' || record.catalogState === 'Pending review').length
  const productionCount = Object.values(agentAdminRecords).filter((record) => record.lifecycleStage === 'Production').length
  const pilotCount = Object.values(agentAdminRecords).filter((record) => record.lifecycleStage === 'Pilot').length
  const validateCount = Object.values(agentAdminRecords).filter((record) => record.lifecycleStage === 'Validate').length
  const includedCount = Object.values(agentAdminRecords).filter((record) => record.metering === 'Included').length
  const paygoCount = Object.values(agentAdminRecords).filter((record) => record.metering === 'Pay-as-you-go').length
  const capacityCount = Object.values(agentAdminRecords).filter((record) => record.metering === 'Capacity pack').length
  const requiredConsentCount = Object.values(agentAdminRecords).filter((record) => record.adminConsent === 'Required').length
  const scopedConsentCount = Object.values(agentAdminRecords).filter((record) => record.adminConsent === 'Scoped').length
  const approvedConsentCount = Object.values(agentAdminRecords).filter((record) => record.adminConsent === 'Approved').length
  const lifecycleAdminSignals = [
    {
      label: 'Requested agents',
      title: requestCount > 0 ? `${requestCount} waiting for admin review` : 'No pending agent request',
      detail: requestCount > 0 ? 'Requested agents should stay outside broader discovery until sharing, compliance, and owner scope are approved.' : 'The request queue is clear in the current sample tenant.',
    },
    {
      label: 'Lifecycle control',
      title: `${productionCount} production / ${pilotCount} pilot / ${validateCount} validate`,
      detail: 'Keep develop, validate, pilot, and production separate so publishing can move ring by ring instead of all at once.',
    },
    {
      label: 'Metering model',
      title: `${includedCount} included / ${paygoCount} pay-as-you-go / ${capacityCount} capacity pack`,
      detail: 'Metering belongs in the same admin conversation as policy and publishing because cost risk and safety risk move together.',
    },
    {
      label: 'Connector consent',
      title: `${requiredConsentCount} required / ${scopedConsentCount} scoped / ${approvedConsentCount} approved`,
      detail: 'Permissions and consent should be reviewed before an agent moves from request or pilot into broader publication.',
    },
  ]

  const selectedPolicyRelatedAlerts = [...selectedPolicyAlerts]
    .sort((left, right) => severityRank[right.severity] - severityRank[left.severity] || right.createdAt.localeCompare(left.createdAt))
    .slice(0, 4)
  const selectedPolicyDetailCards = [
    {
      label: 'Rule owner',
      value: selectedPolicyOwner,
      detail: 'Primary admin team accountable for review, publication, and lifecycle decisions.',
    },
    {
      label: 'Rollout status',
      value: selectedPolicyRollout,
      detail: rolloutTrack.stage,
    },
    {
      label: 'Covered agents',
      value: String(linkedAgentCoverage.length),
      detail:
        linkedAgentCoverage.length > 0
          ? `${linkedAgentCoverage.length} agent${linkedAgentCoverage.length === 1 ? '' : 's'} currently inherit this rule in the sample tenant.`
          : 'No live agent is currently mapped to this rule in the sample tenant.',
    },
    {
      label: 'Incident pressure',
      value: selectedPolicyOpenAlerts > 0 ? `${selectedPolicyOpenAlerts} open` : 'Stable',
      detail:
        selectedPolicyOpenAlerts > 0
          ? 'Active incidents still point back to this rule and should shape rollout decisions.'
          : 'No unresolved case currently keeps this rule under active watch.',
    },
  ]
  const selectedPolicyRuleFacts = [
    { label: 'Scope', value: selectedPolicy?.scope ?? 'Global' },
    { label: 'Trigger', value: selectedPolicy?.trigger ?? 'No trigger' },
    { label: 'Action', value: selectedPolicy?.action ?? 'Monitor' },
    { label: 'Severity', value: selectedPolicy ? severityLabels[selectedPolicy.severity] : 'Low' },
  ]

  const approvalRequests = [
    {
      title: 'Share with reviewed owners',
      requester: selectedPolicyOwner,
      status: selectedPolicyOpenAlerts > 0 ? 'Pending review' : 'Approved',
      detail: selectedPolicyOpenAlerts > 0
        ? 'Keep sharing limited until linked incidents are resolved.'
        : 'Current rule state supports broader access inside reviewed owner groups.',
      tone: selectedPolicyOpenAlerts > 0 ? 'medium' as const : 'low' as const,
    },
    {
      title: 'Publish to next rollout ring',
      requester: 'Tenant admin',
      status: selectedPolicyLive ? (selectedPolicyOpenAlerts > 0 ? 'Blocked by incident load' : selectedPolicyBroad ? 'Published' : 'Ready for approval') : 'Draft only',
      detail: selectedPolicyLive
        ? selectedPolicyOpenAlerts > 0
          ? 'Leave the policy in its current ring until active review pressure drops.'
          : 'The current rule can move into the next governed rollout step.'
        : 'The rule still needs to leave draft before broader publishing is available.',
      tone: selectedPolicyLive ? (selectedPolicyOpenAlerts > 0 ? 'high' as const : 'low' as const) : 'medium' as const,
    },
    {
      title: 'Add to governed catalog',
      requester: 'Platform operations',
      status: plannedSurfaceCount > 0 ? 'Waiting on connector onboarding' : 'Eligible',
      detail: plannedSurfaceCount > 0
        ? 'Finish connector governance before surfacing this capability more widely.'
        : 'Control coverage is broad enough to support a governed discovery path.',
      tone: plannedSurfaceCount > 0 ? 'medium' as const : 'low' as const,
    },
  ]

  return (
    <section className="view-grid governance-grid">
      <article className="panel metrics-span-2">
        <div className="panel-header compact">
          <div>
            <p className="eyebrow">Policies</p>
            <h2>Governed rules and rollout state</h2>
          </div>
          <span className="subtle">Inspect the selected rule, see its live pressure, and decide whether it should stay draft, limited, or broadly published.</span>
        </div>
        <div className="policy-meta-strip">
          <div className="policy-meta-card">
            <span className="dossier-label">Active rules</span>
            <strong>{workspace.policies.filter((policy) => getPolicyMode(policy) !== 'draft').length}</strong>
            <p>Policies currently shaping live response behavior.</p>
          </div>
          <div className="policy-meta-card">
            <span className="dossier-label">Critical coverage</span>
            <strong>{workspace.policies.filter((policy) => policy.severity === 'critical').length}</strong>
            <p>Rules handling the highest-risk pathways.</p>
          </div>
          <div className="policy-meta-card">
            <span className="dossier-label">Selected rule scope</span>
            <strong>{selectedPolicy?.scope ?? 'Global'}</strong>
            <p>Scope currently attached to the active simulation context.</p>
          </div>
        </div>
        <div className="policy-admin-layout">
          <div className="policy-library-column">
            <div className="table-caption">
              <strong>Policy library</strong>
              <p>Choose a rule to inspect its rollout status, owner pressure, and the cases currently shaping it.</p>
            </div>
            <div className="triage-filter-bar" role="tablist" aria-label="Policy library filter">
              {[
                ['all', `All policies (${workspace.policies.length})`],
                ['live', `Live rules (${workspace.policies.filter((policy) => getPolicyMode(policy) !== 'draft').length})`],
                ['incident', `Incident-linked (${workspace.policies.filter((policy) => alerts.some((alert) => alert.policyId === policy.id && alert.status !== 'resolved')).length})`],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  className={`triage-filter-chip ${policyFilter === value ? 'active' : ''}`}
                  onClick={() => setPolicyFilter(value as 'all' | 'live' | 'incident')}
                >
                  {label}
                </button>
              ))}
            </div>
            {visiblePolicies.length === 0 ? (
              <div className="table-empty-state policy-empty-state">
                <strong>No rules match this library view.</strong>
                <p>Switch the filter to review live rules, draft rules, or rules currently under incident pressure.</p>
              </div>
            ) : (
              <div className="policy-library-list">
                {visiblePolicies.map((policy) => (
                  <PolicyCard
                    key={policy.id}
                    policy={policy}
                    selected={selectedPolicy?.id === policy.id}
                    linked={highlightedPolicyId === policy.id}
                    onSelect={handleSelectPolicy}
                    statusLabel={getPolicyStatusLabel(policy)}
                    liveState={getPolicyMode(policy) !== 'draft'}
                  />
                ))}
              </div>
            )}
          </div>
          <aside className="policy-detail-pane">
            <div className="policy-detail-top">
              <div>
                <p className="eyebrow">Selected policy</p>
                <h3>{selectedPolicy?.name ?? 'No selected rule'}</h3>
                <p className="subtle">{selectedPolicy?.description ?? 'Select a policy to inspect its trigger, containment path, and rollout readiness.'}</p>
              </div>
              <div className="policy-detail-badges">
                <span className={`pill small ${selectedPolicy?.severity ?? 'low'}`}>{selectedPolicy ? severityLabels[selectedPolicy.severity] : 'Low'}</span>
                <span className="context-chip small-chip">{selectedPolicyRollout}</span>
                {linkedIncidentPolicy?.id === selectedPolicy?.id ? <span className="context-chip small-chip">Linked to current case</span> : null}
              </div>
            </div>
            <div className="policy-detail-actions">
              <button
                type="button"
                className="action-button primary"
                onClick={() => onOpenQueue(selectedPolicyRelatedAlerts[0]?.id)}
                disabled={!selectedPolicyRelatedAlerts[0]}
              >
                Open queue
              </button>
              <button
                type="button"
                className="action-button"
                onClick={() => onOpenIncident(selectedPolicyRelatedAlerts[0]?.id)}
                disabled={!selectedPolicyRelatedAlerts[0]}
              >
                Open incident
              </button>
            </div>
            <div className="policy-rollout-bar" role="tablist" aria-label="Policy rollout state">
              {[
                ['draft', 'Keep draft'],
                ['limited', 'Limited publish'],
                ['live', 'Publish'],
              ].map(([mode, label]) => (
                <button
                  key={mode}
                  type="button"
                  className={`policy-rollout-button ${selectedPolicyMode === mode ? 'active' : ''}`}
                  onClick={() => selectedPolicy && onSetPolicyRollout(selectedPolicy.id, mode as PolicyRolloutMode)}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="policy-detail-grid">
              {selectedPolicyDetailCards.map((item) => (
                <div key={item.label} className="policy-summary-card">
                  <span className="dossier-label">{item.label}</span>
                  <strong>{item.value}</strong>
                  <p>{item.detail}</p>
                </div>
              ))}
            </div>
            <div className="policy-definition-card">
              <div className="panel-header compact">
                <div>
                  <p className="eyebrow">Rule definition</p>
                  <h3>Control boundary</h3>
                </div>
                <span className="subtle">The parts of the rule admins need most when they decide to publish, restrict, or tune it.</span>
              </div>
              <dl className="policy-definition-list">
                {selectedPolicyRuleFacts.map((item) => (
                  <div key={item.label}>
                    <dt>{item.label}</dt>
                    <dd>{item.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <div className="policy-related-card">
              <div className="panel-header compact">
                <div>
                  <p className="eyebrow">Related incidents</p>
                  <h3>Cases currently shaping this rule</h3>
                </div>
                <span className="subtle">Use live cases to see whether the rule is stabilizing or still needs tuning.</span>
              </div>
              {selectedPolicyRelatedAlerts.length === 0 ? (
                <div className="table-empty-state policy-empty-state">
                  <strong>No live case is currently attached to this rule.</strong>
                  <p>This rule is either quiet, draft-only, or not creating review pressure in the current sample.</p>
                </div>
              ) : (
                <div className="policy-related-list">
                  {selectedPolicyRelatedAlerts.map((alert) => {
                    const alertAgent = workspace.agents.find((agent) => agent.id === alert.agentId)
                    const reviewState = getReviewState(alert)
                    return (
                      <div key={alert.id} className="policy-related-item">
                        <div className="policy-related-top">
                          <div>
                            <span className="dossier-label">{alertAgent?.name ?? 'Unknown agent'}</span>
                            <strong>{alert.title}</strong>
                          </div>
                          <div className="policy-detail-badges">
                            <span className={`pill small ${alert.severity}`}>{severityLabels[alert.severity]}</span>
                            <span className={`pill small ${reviewState.tone}`}>{reviewState.label}</span>
                            <span className="context-chip small-chip">Age {formatCaseAge(alert.createdAt)}</span>
                          </div>
                        </div>
                        <p>{alert.description}</p>
                        <div className="policy-related-actions">
                          <button type="button" className="table-action-button" onClick={() => onSelectAgent(alert.agentId, false)}>Open asset</button>
                          <button type="button" className="table-action-button subtle" onClick={() => onOpenIncident(alert.id)}>Open incident</button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </aside>
        </div>
      </article>

      <article className="panel metrics-span-2">
        <div className="panel-header compact">
          <div>
            <p className="eyebrow">Control system</p>
            <h2>Admin guardrails for Copilot agents</h2>
          </div>
          <span className="subtle">Bring policy operations closer to the admin controls Microsoft teams expect: sharing, connectors, publishing, and lifecycle review.</span>
        </div>
        <div className="control-system-grid">
          {controlSystem.map((item) => (
            <div key={item.label} className="control-system-card">
              <div className="control-system-top">
                <span className="dossier-label">{item.label}</span>
                <span className={`pill small ${item.tone}`}>{item.tone === 'low' ? 'ready' : item.tone === 'medium' ? 'watch' : 'priority'}</span>
              </div>
              <strong>{item.title}</strong>
              <p>{item.detail}</p>
            </div>
          ))}
        </div>
      </article>

      <article className="panel metrics-span-2">
        <div className="panel-header compact">
          <div>
            <p className="eyebrow">Linked agent coverage</p>
            <h2>Which agents this rule is currently shaping</h2>
          </div>
          <span className="subtle">A rule becomes more believable when admins can see which governed agents it is actively affecting.</span>
        </div>
        {linkedAgentCoverage.length === 0 ? (
          <div className="table-empty-state policy-empty-state">
            <strong>No active agents are linked to this rule right now.</strong>
            <p>This usually means the rule is still quiet, still draft-only, or simply not under live incident pressure in the current sample.</p>
          </div>
        ) : (
          <div className="table-shell">
            <table>
              <thead>
                <tr>
                  <th>Agent</th>
                  <th>Surface</th>
                  <th>Trust</th>
                  <th>Last review</th>
                  <th>Incidents</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {linkedAgentCoverage.map((item) => {
                  const focusAlertId = selectedPolicyRelatedAlerts.find((alert) => alert.agentId === item.id)?.id

                  return (
                    <tr key={item.id}>
                      <td>
                        <div className="registry-primary">
                          <strong>{item.name}</strong>
                          <p>Governed by {selectedPolicy?.name ?? 'selected rule'}</p>
                        </div>
                      </td>
                      <td>{item.surface}</td>
                      <td><span className="trust-chip">Trust {item.trustScore}</span></td>
                      <td>{item.lastReview}</td>
                      <td>{item.incidents}</td>
                      <td>
                        <div className="table-actions">
                          <button type="button" className="table-action-button" onClick={() => onSelectAgent(item.id, false)}>Open asset</button>
                          <button
                            type="button"
                            className="table-action-button subtle"
                            onClick={() => {
                              onSelectAgent(item.id, true)
                              if (focusAlertId) onOpenIncident(focusAlertId)
                            }}
                          >
                            Open incident
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </article>

      <article className="panel metrics-span-2">
        <div className="panel-header compact">
          <div>
            <p className="eyebrow">Policy simulator</p>
            <h2>Expected response before rollout</h2>
          </div>
          <span className="subtle">Use a policy-shaped scenario to preview how the control layer would respond</span>
        </div>

        <div className="simulator-toolbar">
          {workspace.policies.map((policy) => (
            <button
              key={policy.id}
              type="button"
              className={`sim-chip ${selectedPolicy?.id === policy.id ? 'active' : ''}`}
              onClick={() => handleSelectPolicy(policy.id)}
            >
              {policy.name}
            </button>
          ))}
        </div>

        {selectedPolicy && selectedScenario ? (
          <div className="simulator-grid">
            <div className="simulator-card">
              <span className="dossier-label">Trigger</span>
              <strong>{selectedScenario.trigger}</strong>
              <p>{selectedPolicy.description}</p>
            </div>
            <div className="simulator-card">
              <span className="dossier-label">Expected action</span>
              <strong>{selectedPolicy.action}</strong>
              <p>{selectedScenario.expectedAction}</p>
            </div>
            <div className="simulator-card">
              <span className="dossier-label">Rationale</span>
              <strong>{selectedPolicy.scope} control boundary</strong>
              <p>{selectedScenario.rationale}</p>
            </div>
            <div className="simulator-card">
              <span className="dossier-label">Containment effect</span>
              <strong>{severityLabels[selectedPolicy.severity]} severity pathway</strong>
              <p>{selectedScenario.containmentEffect}</p>
            </div>
          </div>
        ) : null}
      </article>

      <article className="panel metrics-span-2">
        <div className="panel-header compact">
          <div>
            <p className="eyebrow">Deployment path</p>
            <h2>What unlocks broader rollout</h2>
          </div>
          <span className="subtle">Use this to decide whether the rule stays in draft, limited publish, or broader rollout.</span>
        </div>
        <div className="rollout-board">
          {rolloutBoard.map((item) => (
            <div key={item.label} className="rollout-card">
              <span className="dossier-label">{item.label}</span>
              <strong>{item.value}</strong>
            </div>
          ))}
        </div>
        <div className="rollout-rings">
          {rolloutRings.map((ring) => (
            <div key={ring.label} className={`rollout-ring-card ${ring.active ? 'active' : ''}`}>
              <div className="rollout-ring-top">
                <span className="dossier-label">{ring.label}</span>
                <span className={`pill small ${ring.active ? 'medium' : 'low'}`}>{ring.active ? 'current' : 'next'}</span>
              </div>
              <strong>{ring.title}</strong>
              <p>{ring.detail}</p>
            </div>
          ))}
        </div>
      </article>

      <article className="panel metrics-span-2">
        <div className="panel-header compact">
          <div>
            <p className="eyebrow">Control maturity</p>
            <h2>What still limits enterprise confidence</h2>
          </div>
          <span className="subtle">This is the shortest path from policy design to a credible enterprise rollout conversation.</span>
        </div>
        <div className="maturity-grid">
          {controlMaturity.map((item) => (
            <div key={item.label} className="maturity-card">
              <div className="maturity-card-top">
                <span className="dossier-label">{item.label}</span>
                <span className={`pill small ${item.tone}`}>{item.state}</span>
              </div>
              <p>{item.detail}</p>
            </div>
          ))}
        </div>
      </article>
      <article className="panel metrics-span-2">
        <div className="panel-header compact">
          <div>
            <p className="eyebrow">Field feedback</p>
            <h2>How this policy behaves in live review</h2>
          </div>
          <span className="subtle">A credible governance surface should show not just the rule, but the operator pressure and decisions it generates.</span>
        </div>
        <div className="policy-feedback-grid">
          <div className="policy-feedback-card">
            <span className="dossier-label">Linked incidents</span>
            <strong>{selectedPolicyAlerts.length}</strong>
            <p>{selectedPolicyOpenAlerts} still require active review or closure.</p>
          </div>
          <div className="policy-feedback-card">
            <span className="dossier-label">Operator pressure</span>
            <strong>{selectedPolicyOpenAlerts > 0 ? 'Tuning still active' : 'Stable control'}</strong>
            <p>{selectedPolicyOpenAlerts > 0 ? 'Recent cases still suggest review friction or rollout caution.' : 'Recent operator flow suggests the rule is behaving predictably.'}</p>
          </div>
        </div>
        <div className="decision-journal-list">
          {recentPolicyActivity.length === 0 ? (
            <div className="decision-journal-entry empty">
              <strong>No recent policy-linked decisions.</strong>
              <p>This rule does not have a recent operator action attached in the current sample.</p>
            </div>
          ) : (
            recentPolicyActivity.map((entry) => (
              <div key={entry.id} className="decision-journal-entry">
                <div className="decision-journal-top">
                  <div>
                    <span className="dossier-label">{entry.alertTitle}</span>
                    <strong>{entry.action}</strong>
                  </div>
                  <span className="context-chip small-chip">{formatTimestamp(entry.timestamp)}</span>
                </div>
                <p>{entry.detail}</p>
              </div>
            ))
          )}
        </div>
      </article>

      <article className="panel metrics-span-2">
        <div className="panel-header compact">
          <div>
            <p className="eyebrow">Operating model</p>
            <h2>Control layers and connected surfaces</h2>
          </div>
          <span className="subtle">Governance becomes believable when the control model and the integration map are visible in one place.</span>
        </div>
        <div className="governance-summary-grid">
          <div className="stack-list compact-stack">
            {controlLayers.map((layer) => (
              <div key={layer.title} className="stack-item">
                <strong>{layer.title}</strong>
                <p>{layer.detail}</p>
              </div>
            ))}
          </div>
          <div className="surface-grid compact-surface-grid">
            {connectedSurfaces.map((surface) => (
              <SurfaceCard key={surface.name} {...surface} />
            ))}
          </div>
        </div>
      </article>

      <article className="panel">
        <div className="panel-header compact">
          <div>
            <p className="eyebrow">Lifecycle and metering</p>
            <h2>Admin dependencies for broader use</h2>
          </div>
          <span className="subtle">Publishing confidence depends on request review, release stage separation, and visible metering guardrails.</span>
        </div>
        <div className="catalog-access-grid">
          {lifecycleAdminSignals.map((item) => (
            <div key={item.label} className="catalog-access-card">
              <span className="dossier-label">{item.label}</span>
              <strong>{item.title}</strong>
              <p>{item.detail}</p>
            </div>
          ))}
        </div>
      </article>

      <article className="panel">
        <div className="panel-header compact">
          <div>
            <p className="eyebrow">Catalog and access</p>
            <h2>Who can discover and use this rule</h2>
          </div>
        </div>
        <div className="catalog-access-grid">
          {catalogAccess.map((item) => (
            <div key={item.label} className="catalog-access-card">
              <span className="dossier-label">{item.label}</span>
              <strong>{item.title}</strong>
              <p>{item.detail}</p>
            </div>
          ))}
        </div>
        <div className="stack-list compact-stack policy-support-list">
          {connectedAdminControls.map((item) => (
            <div key={item.title} className="stack-item">
              <strong>{item.title}</strong>
              <p>{item.detail}</p>
            </div>
          ))}
        </div>
      </article>

      <article className="panel">
        <div className="panel-header compact">
          <div>
            <p className="eyebrow">Approval requests</p>
            <h2>Requests tied to this rule</h2>
          </div>
        </div>
        <div className="approval-request-list">
          {approvalRequests.map((item) => (
            <div key={item.title} className="approval-request-item">
              <div className="approval-request-top">
                <div>
                  <strong>{item.title}</strong>
                  <p>{item.requester}</p>
                </div>
                <span className={`pill small ${item.tone}`}>{item.status}</span>
              </div>
              <p>{item.detail}</p>
            </div>
          ))}
        </div>
      </article>

      <article className="panel">
        <div className="panel-header compact">
          <div>
            <p className="eyebrow">Recent changes</p>
            <h2>Rollout and review history</h2>
          </div>
        </div>
        <div className="policy-change-list">
          {policyChangeLog.map((item) => (
            <div key={`${item.title}-${item.timestamp}`} className="policy-change-item">
              <div className="policy-change-top">
                <strong>{item.title}</strong>
                <span className="context-chip small-chip">{item.timestamp}</span>
              </div>
              <p>{item.detail}</p>
            </div>
          ))}
        </div>
        <div className="stack-list compact-stack policy-support-list">
          {publishReadiness.map((item) => (
            <div key={item.title} className="stack-item">
              <strong>{item.title}</strong>
              <p>{item.detail}</p>
            </div>
          ))}
        </div>
      </article>
    </section>
  )
}
