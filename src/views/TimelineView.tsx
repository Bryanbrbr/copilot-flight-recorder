import { MetricCard, SeverityMeter, ReviewStep } from '@/components/shared'
import { useWorkspaceStore } from '@/hooks/useWorkspaceStore'
import { getAgentEvents, formatTimestamp } from '@/engine'
import { agentAdminRecords, agentOverviewSignals } from '@/constants/agentRecords'
import { severityLabels, outcomeLabels, severityRank } from '@/constants/labels'
import type { Agent, Alert } from '@/types'
import type { CaseActivityEntry } from '@/types'

export function TimelineView({
  selectedAgent,
  agentAlerts,
  highlightedAlert,
  caseActivity,
  onOpenAlertCenter,
  onOpenGovernance,
}: {
  selectedAgent: Agent
  agentAlerts: Alert[]
  highlightedAlert?: Alert
  caseActivity: CaseActivityEntry[]
  onOpenAlertCenter: () => void
  onOpenGovernance: () => void
}) {
  const workspace = useWorkspaceStore((s) => s.workspace)
  const agentEvents = getAgentEvents(workspace, selectedAgent.id)
  const blockedEvents = agentEvents.filter((event) => event.outcome === 'blocked').length
  const highRiskEvents = agentEvents.filter((event) => event.riskScore >= 70).length
  const affectedSurfaces = new Set(agentEvents.map((event) => event.target).filter(Boolean)).size
  const dossierAlert = highlightedAlert ?? [...agentAlerts].sort((left, right) => severityRank[right.severity] - severityRank[left.severity])[0]
  const latestEvent = agentEvents[0]
  const highestRiskEvent = [...agentEvents].sort((left, right) => right.riskScore - left.riskScore)[0]
  const blockedEvidence = agentEvents.find((event) => event.outcome === 'blocked')
  const approvalEvidence =
    agentEvents.find((event) => event.type === 'approval.skipped') ??
    agentEvents.find((event) => event.type === 'approval.requested')
  const sensitiveEvidence = agentEvents.find((event) => event.metadata?.dataset || event.metadata?.audience)
  const blastRadius = [selectedAgent.environment, ...new Set(agentEvents.map((event) => event.target).filter(Boolean))].slice(0, 4)
  const selectedAgentRecord = agentAdminRecords[selectedAgent.id]
  const impactedDomains = [
    ...new Set(
      agentEvents
        .map((event) => {
          if (event.metadata?.dataset) return String(event.metadata.dataset)
          if (event.metadata?.audience) return String(event.metadata.audience)
          if (event.target) return String(event.target)
          return null
        })
        .filter(Boolean),
    ),
  ].slice(0, 4)
  const affectedCount = blastRadius.length + impactedDomains.length
  const policyLabel = dossierAlert
    ? workspace.policies.find((policy) => policy.id === dossierAlert.policyId)?.name ?? 'Derived signal'
    : 'No active policy breach'
  const responseMode = dossierAlert
    ? dossierAlert.severity === 'critical'
      ? 'Immediate containment'
      : dossierAlert.severity === 'high'
        ? 'Escalated review'
        : 'Standard review'
    : 'Monitor only'
  const likelyCause =
    dossierAlert?.policyId === 'pol-sensitive-read'
      ? 'Approval context was missing before a sensitive read was attempted.'
      : dossierAlert?.policyId === 'pol-loop-detection'
        ? 'The workflow retried the same connector until it crossed the loop threshold.'
        : dossierAlert?.policyId === 'pol-external-send'
          ? 'The agent generated an external action below the confidence floor.'
          : 'No active rule breach detected.'
  const incidentSummary = dossierAlert
    ? dossierAlert.severity === 'critical'
      ? 'A policy-enforced block stopped a sensitive action before it crossed a protected boundary.'
      : dossierAlert.severity === 'high'
        ? 'The agent stayed inside control, but the run now requires operator review before it can be trusted again.'
        : 'A lower-severity incident was recorded and should be reviewed during normal governance flow.'
    : 'No active incident is attached to this agent right now.'
  const incidentDecision = dossierAlert
    ? dossierAlert.severity === 'critical'
      ? 'Keep the workflow contained, confirm owner review, and inspect the missing approval path.'
      : dossierAlert.severity === 'high'
        ? 'Hold the affected action, review the replay, and confirm whether policy needs tuning.'
        : 'Document the signal and continue monitoring.'
    : 'No decision required.'
  const reviewSteps: Array<{
    title: string
    detail: string
    status: 'complete' | 'active' | 'waiting'
  }> = dossierAlert
    ? [
        {
          title: 'Incident detected',
          detail: `${severityLabels[dossierAlert.severity]} finding generated from replay and policy correlation.`,
          status: 'complete',
        },
        {
          title: 'Triage completed',
          detail: `${highRiskEvents} elevated replay step${highRiskEvents > 1 ? 's' : ''} identified for analyst review.`,
          status: 'complete',
        },
        {
          title: 'Owner review pending',
          detail: `Assigned to ${selectedAgent.owner} with ${responseMode.toLowerCase()} guidance.`,
          status: dossierAlert.status === 'open' ? 'active' : 'complete',
        },
        {
          title: 'Decision and policy follow-up',
          detail: 'Awaiting containment confirmation and rule tuning decision.',
          status: dossierAlert.status === 'open' ? 'waiting' : 'active',
        },
      ]
    : [
        {
          title: 'No active incident',
          detail: 'Replay is available, but nothing currently requires escalated handling.',
          status: 'active',
        },
      ]

  const evidenceItems = [
    highestRiskEvent
      ? {
          label: 'Highest risk step',
          title: highestRiskEvent.title,
          detail: `Risk ${highestRiskEvent.riskScore} / ${highestRiskEvent.summary}`,
        }
      : null,
    blockedEvidence
      ? {
          label: 'Policy intervention',
          title: blockedEvidence.title,
          detail: blockedEvidence.summary,
        }
      : null,
    approvalEvidence
      ? {
          label: 'Approval path',
          title: approvalEvidence.title,
          detail: approvalEvidence.summary,
        }
      : null,
    sensitiveEvidence
      ? {
          label: 'Sensitive context',
          title: sensitiveEvidence.target ?? 'Protected asset',
          detail:
            sensitiveEvidence.metadata?.dataset
              ? `Dataset ${String(sensitiveEvidence.metadata.dataset)} was involved in the replay path.`
              : sensitiveEvidence.metadata?.audience
                ? `Audience ${String(sensitiveEvidence.metadata.audience)} was attached to the execution path.`
                : sensitiveEvidence.summary,
        }
      : null,
  ].filter(Boolean) as Array<{ label: string; title: string; detail: string }>
  const responseWindow =
    dossierAlert?.severity === 'critical'
      ? 'Escalate within 15 min'
      : dossierAlert?.severity === 'high'
        ? 'Review within 1 hour'
        : 'Review this working cycle'
  const decisionPack = [
    { label: 'Priority', value: responseMode },
    { label: 'Owner', value: selectedAgent.owner },
    { label: 'Response window', value: responseWindow },
  ]
  const confidenceScore = Math.max(
    34,
    Math.min(96, Math.round(74 - highRiskEvents * 4 - Math.max(agentAlerts.length - blockedEvents, 0) * 5 + blockedEvents * 6)),
  )
  const confidenceState =
    confidenceScore >= 80 ? 'High operator confidence' : confidenceScore >= 60 ? 'Reviewable with caution' : 'Needs tighter proof'
  const rolloutEffect =
    dossierAlert?.severity === 'critical'
      ? 'Hold wider rollout until the policy path and approval boundary are confirmed.'
      : dossierAlert?.severity === 'high'
        ? 'Keep rollout gated while rule tuning and reviewer decisions stabilize.'
        : 'This case should inform policy tuning, but it does not block controlled expansion by itself.'
  const approvalDependency = approvalEvidence
    ? 'This case depends on a visible approval path, so reviewer latency and owner clarity still matter.'
    : 'This case is currently relying more on direct policy enforcement than on an approval handoff.'
  const caseReadiness = [
    {
      label: 'Case confidence',
      title: `${confidenceScore}/100`,
      detail: confidenceState,
    },
    {
      label: 'Rollout effect',
      title: dossierAlert?.severity === 'critical' ? 'Expansion gated' : dossierAlert?.severity === 'high' ? 'Rollout conditional' : 'Rollout watchpoint',
      detail: rolloutEffect,
    },
    {
      label: 'Approval dependency',
      title: approvalEvidence ? 'Human handoff visible' : 'Policy-led containment',
      detail: approvalDependency,
    },
  ]
  const policyOwner =
    dossierAlert?.policyId === 'pol-external-send'
      ? 'Revenue operations controls'
      : dossierAlert?.policyId === 'pol-bulk-write'
        ? 'Finance controls'
        : dossierAlert?.policyId === 'pol-loop-detection'
          ? 'Platform engineering'
          : 'Security and governance'
  const caseWorkboard = [
    {
      label: 'Containment owner',
      window: responseWindow,
      title: selectedAgent.owner,
      detail: 'Confirms the affected action stays paused and the case remains inside governed review.',
    },
    {
      label: 'Policy owner',
      window: policyLabel,
      title: policyOwner,
      detail: 'Reviews whether the active rule needs tuning before a wider publish ring is allowed.',
    },
    {
      label: 'Admin reviewer',
      window: selectedAgentRecord.adminConsent,
      title: selectedAgentRecord.requestOwner,
      detail: 'Validates sharing, identity, and permission scope before broader availability.',
    },
    {
      label: 'Publishing gate',
      window: selectedAgentRecord.lifecycleStage,
      title: selectedAgentRecord.availability,
      detail:
        selectedAgentRecord.lifecycleStage === 'Production'
          ? 'Publishing stays governed until the incident is closed and consent remains valid.'
          : 'Keep the agent in its current ring until review, consent, and replay are complete.',
    },
  ]
  const resolutionChecklist = [
    {
      title: 'Contain the affected action',
      detail: blockedEvents > 0 ? 'Containment already stopped the risky path.' : 'Confirm the action stays paused until review completes.',
      state: blockedEvents > 0 ? 'done' : dossierAlert ? 'action' : 'done',
    },
    {
      title: 'Confirm owner review',
      detail: `Assigned to ${selectedAgent.owner} for decision confirmation and sign-off.`,
      state: dossierAlert?.status === 'acknowledged' || dossierAlert?.status === 'resolved' ? 'done' : dossierAlert ? 'action' : 'done',
    },
    {
      title: 'Validate policy behavior',
      detail: `${policyLabel} should be confirmed against this replay path before wider publication.`,
      state: dossierAlert?.status === 'resolved' ? 'done' : dossierAlert ? 'action' : 'done',
    },
    {
      title: 'Record rollout guidance',
      detail: 'Feed the final decision back into rollout and policy operations.',
      state: dossierAlert?.status === 'resolved' ? 'done' : 'waiting',
    },
  ]

  return (
    <section className="view-grid timeline-layout">
      <article className="panel metrics-span-2 incident-hero-panel">
        <div className="panel-header compact">
          <div>
            <p className="eyebrow">Incident summary</p>
            <h2>Decision-ready case</h2>
          </div>
          <span className="subtle">A cleaner case summary makes the review path easier to trust than leading with raw telemetry.</span>
        </div>
        <div className="incident-hero-grid">
          <div className="incident-summary-card">
            <span className="dossier-label">What happened</span>
            <strong>{dossierAlert?.title ?? 'No active incident'}</strong>
            <p>{incidentSummary}</p>
          </div>
          <div className="incident-summary-card">
            <span className="dossier-label">Recommended decision</span>
            <strong>{responseMode}</strong>
            <p>{incidentDecision}</p>
          </div>
          <div className="incident-summary-card">
            <span className="dossier-label">Assigned owner</span>
            <strong>{selectedAgent.owner}</strong>
            <p>The owning team should confirm replay review and containment before the workflow is trusted again.</p>
          </div>
        </div>
        <div className="incident-kpi-strip">
          <MetricCard label="Replay nodes" value={agentEvents.length} helper="Events attached to the selected execution window" />
          <MetricCard label="High-risk steps" value={highRiskEvents} helper="Nodes with elevated risk score" />
          <MetricCard label="Blocked actions" value={blockedEvents} helper="Stopped before completion" />
          <MetricCard label="Impacted surfaces" value={affectedSurfaces} helper="Distinct targets and connected domains" />
        </div>
        <div className="incident-action-bar">
          <button type="button" className="action-button primary" onClick={onOpenAlertCenter}>Open alert center</button>
          <button type="button" className="action-button" onClick={onOpenGovernance}>Open policy</button>
          <span className="subtle action-helper">Case evidence, review state, and policy context stay in one workspace for faster decisions.</span>
        </div>
      </article>

      <article className="panel metrics-span-2 impact-panel">
        <div className="panel-header compact">
          <div>
            <p className="eyebrow">Business impact</p>
            <h2>Containment value</h2>
          </div>
          <span className="subtle">The case is easier to act on when it explains what was protected, what stayed contained, and what still needs review to close.</span>
        </div>
        <div className="impact-grid">
          <div className="impact-card primary">
            <span className="dossier-label">Protected boundary</span>
            <strong>{dossierAlert?.severity === 'critical' ? 'Sensitive access was stopped before disclosure.' : 'The workflow stayed inside a governed review path.'}</strong>
            <p>{incidentDecision}</p>
          </div>
          <div className="impact-card">
            <span className="dossier-label">Exposed business area</span>
            <strong>{selectedAgent.owner}</strong>
            <p>{selectedAgent.businessPurpose}</p>
          </div>
          <div className="impact-card">
            <span className="dossier-label">Control pressure</span>
            <strong>{affectedCount} linked points</strong>
            <p>{blockedEvents > 0 ? 'Containment already prevented expansion across connected surfaces.' : 'This run still depends on review discipline more than hard stops.'}</p>
          </div>
        </div>
      </article>

      <article className="panel metrics-span-2 decision-panel">
        <div className="panel-header compact">
          <div>
            <p className="eyebrow">Decision package</p>
            <h2>What the operator needs next</h2>
          </div>
          <span className="subtle">Short, explicit handling guidance makes the case feel operational instead of theoretical.</span>
        </div>
        <div className="decision-pack-grid">
          {decisionPack.map((item) => (
            <div key={item.label} className="decision-pack-card">
              <span className="dossier-label">{item.label}</span>
              <strong>{item.value}</strong>
            </div>
          ))}
        </div>
      </article>

      <article className="panel metrics-span-2 program-board-panel">
        <div className="panel-header compact">
          <div>
            <p className="eyebrow">Case workboard</p>
            <h2>Who owns the next moves</h2>
          </div>
          <span className="subtle">A credible case should show ownership, review gates, and publication blockers without forcing the operator to infer them.</span>
        </div>
        <div className="program-board-grid">
          {caseWorkboard.map((item) => (
            <div key={item.label} className="program-board-card">
              <div className="program-board-top">
                <span className="dossier-label">{item.label}</span>
                <span className="context-chip small-chip">{item.window}</span>
              </div>
              <strong>{item.title}</strong>
              <p>{item.detail}</p>
            </div>
          ))}
        </div>
      </article>

      <article className="panel metrics-span-2 resolution-checklist-panel">
        <div className="panel-header compact">
          <div>
            <p className="eyebrow">Resolution checklist</p>
            <h2>What closes this case cleanly</h2>
          </div>
          <span className="subtle">A real product should show what done looks like, not just the evidence.</span>
        </div>
        <div className="resolution-checklist-grid">
          {resolutionChecklist.map((item) => (
            <div key={item.title} className="resolution-checklist-card">
              <div className="resolution-checklist-top">
                <strong>{item.title}</strong>
                <span className={`pill small ${item.state === 'done' ? 'low' : item.state === 'action' ? 'medium' : 'watch'}`}>{item.state === 'done' ? 'done' : item.state === 'action' ? 'next' : 'pending'}</span>
              </div>
              <p>{item.detail}</p>
            </div>
          ))}
        </div>
      </article>

      <article className="panel metrics-span-2 decision-journal-panel">
        <div className="panel-header compact">
          <div>
            <p className="eyebrow">Decision journal</p>
            <h2>Operator memory for this case</h2>
          </div>
          <span className="subtle">This keeps the incident tied to actual operator decisions instead of making the case restart from scratch in every view.</span>
        </div>
        <div className="decision-journal-list">
          {caseActivity.length === 0 ? (
            <div className="decision-journal-entry empty">
              <strong>No operator activity yet.</strong>
              <p>The case has not recorded a review action in this workspace.</p>
            </div>
          ) : (
            caseActivity.map((entry) => (
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
      </article>

      <article className="panel metrics-span-2 case-readiness-panel">
        <div className="panel-header compact">
          <div>
            <p className="eyebrow">Case readiness</p>
            <h2>Can this incident support a rollout decision?</h2>
          </div>
          <span className="subtle">A strong investigation should explain whether the case is actionable enough to change rollout, policy, or ownership decisions.</span>
        </div>
        <div className="case-readiness-grid">
          {caseReadiness.map((item) => (
            <div key={item.label} className="case-readiness-card">
              <span className="dossier-label">{item.label}</span>
              <strong>{item.title}</strong>
              <p>{item.detail}</p>
            </div>
          ))}
        </div>
      </article>

      <article className="panel metrics-span-2 evidence-panel">
        <div className="panel-header compact">
          <div>
            <p className="eyebrow">Key evidence</p>
            <h2>Why this case exists</h2>
          </div>
          <span className="subtle">A short evidence trail makes the incident easier to trust than forcing the operator to infer the story from raw telemetry.</span>
        </div>
        <div className="evidence-grid">
          {evidenceItems.map((item) => (
            <div key={item.label} className="evidence-card">
              <span className="dossier-label">{item.label}</span>
              <strong>{item.title}</strong>
              <p>{item.detail}</p>
            </div>
          ))}
        </div>
      </article>

      <article className="panel metrics-span-2 execution-history-panel">
        <div className="panel-header compact">
          <div>
            <p className="eyebrow">Replay</p>
            <h2>Execution history</h2>
          </div>
          <span className="subtle">Ordered chain of events supporting the current case file</span>
        </div>
        <ol className="timeline">
          {agentEvents.map((event) => (
            <li key={event.id} className="timeline-item">
              <div className={`timeline-rail ${event.outcome}`} />
              <div className="timeline-body">
                <div className="timeline-topline">
                  <strong>{event.title}</strong>
                  <span>{formatTimestamp(event.timestamp)}</span>
                </div>
                <p>{event.summary}</p>
                <div className="timeline-meta">
                  <span className={`pill small ${event.outcome}`}>{outcomeLabels[event.outcome]}</span>
                  <span>Risk {event.riskScore}</span>
                  <span>{event.actor}</span>
                  {event.target ? <span>Target {event.target}</span> : null}
                </div>
              </div>
            </li>
          ))}
        </ol>
      </article>

      <article className="panel metrics-span-2 case-context-panel">
        <div className="panel-header compact">
          <div>
            <p className="eyebrow">Case overview</p>
            <h2>Decision context</h2>
          </div>
        </div>
        <div className="case-context-grid">
          <div className="context-card">
            <span className="dossier-label">Root cause signal</span>
            <strong>{likelyCause}</strong>
            <p>The replay is useful because it keeps policy, approvals, and tool activity inside one review path instead of fragmenting the story across multiple logs.</p>
          </div>
          <div className="context-card">
            <span className="dossier-label">Active policy</span>
            <strong>{policyLabel}</strong>
            <p>{dossierAlert?.recommendedAction ?? 'No current action is required beyond continued monitoring.'}</p>
          </div>
          <div className="context-card">
            <span className="dossier-label">Last observed activity</span>
            <strong>{latestEvent ? formatTimestamp(latestEvent.timestamp) : 'No recent event'}</strong>
            <p>{latestEvent?.summary ?? 'No execution node is attached to the current replay window.'}</p>
          </div>
        </div>
      </article>

      <article className="panel incident-dossier-panel">
        <div className="panel-header compact">
          <div>
            <p className="eyebrow">Incident dossier</p>
            <h2>Primary case file</h2>
          </div>
        </div>
        {dossierAlert ? (
          <div className="dossier-card">
            <div className="dossier-topline">
              <span className={`pill small ${dossierAlert.severity}`}>{severityLabels[dossierAlert.severity]}</span>
              <span className="subtle">{formatTimestamp(dossierAlert.createdAt)}</span>
            </div>
            <div className="dossier-headline">
              <div>
                <strong>{dossierAlert.title}</strong>
                <p>{dossierAlert.description}</p>
              </div>
              <SeverityMeter severity={dossierAlert.severity} />
            </div>
            <div className="dossier-summary-grid">
              <div className="dossier-stat">
                <span className="dossier-label">Response mode</span>
                <strong>{responseMode}</strong>
              </div>
              <div className="dossier-stat">
                <span className="dossier-label">Replay nodes</span>
                <strong>{agentEvents.length}</strong>
              </div>
              <div className="dossier-stat">
                <span className="dossier-label">Blast radius</span>
                <strong>{affectedCount} linked points</strong>
              </div>
              <div className="dossier-stat">
                <span className="dossier-label">Owner</span>
                <strong>{selectedAgent.owner}</strong>
              </div>
            </div>
            <div className="dossier-section">
              <span className="dossier-label">Recommended action</span>
              <p>{dossierAlert.recommendedAction}</p>
            </div>
            <div className="dossier-section">
              <span className="dossier-label">Likely cause</span>
              <p>{likelyCause}</p>
            </div>
          </div>
        ) : (
          <div className="dossier-card empty-state">
            <strong>No open dossier</strong>
            <p>No alert is currently attached to this agent.</p>
          </div>
        )}
      </article>

      <article className="panel blast-radius-panel">
        <div className="panel-header compact">
          <div>
            <p className="eyebrow">Blast radius</p>
            <h2>Potential spread</h2>
          </div>
        </div>
        <div className="blast-visual">
          <div className="blast-center">
            <span className={`blast-core ${dossierAlert?.severity ?? 'low'}`}>Agent</span>
            <strong>{selectedAgent.name}</strong>
          </div>
          <div className="blast-ring">
            {blastRadius.map((item) => (
              <div key={item} className="blast-node">
                <span className="blast-node-dot" />
                <strong>{item}</strong>
                <p>surface</p>
              </div>
            ))}
            {impactedDomains.map((item) => (
              <div key={item} className="blast-node secondary">
                <span className="blast-node-dot" />
                <strong>{item}</strong>
                <p>domain</p>
              </div>
            ))}
          </div>
        </div>
        <div className="blast-grid blast-grid-bottom">
          <div className="blast-card">
            <span className="dossier-label">Risk summary</span>
            <p>
              {highRiskEvents} high-risk step{highRiskEvents > 1 ? 's' : ''}, {blockedEvents} blocked action{blockedEvents > 1 ? 's' : ''}, and {agentAlerts.length} related alert{agentAlerts.length > 1 ? 's' : ''}.
            </p>
          </div>
          <div className="blast-card">
            <span className="dossier-label">Review guidance</span>
            <p>Prioritize impacted surfaces first, then validate whether linked domains need stricter policy coverage or approval rules.</p>
          </div>
        </div>
      </article>

      <article className="panel incident-review-panel">
        <div className="panel-header compact">
          <div>
            <p className="eyebrow">Incident review</p>
            <h2>Response flow</h2>
          </div>
        </div>
        <div className="review-flow">
          {reviewSteps.map((step) => (
            <ReviewStep key={step.title} title={step.title} detail={step.detail} status={step.status} />
          ))}
        </div>
      </article>

      <article className="panel agent-record-panel">
        <div className="panel-header compact">
          <div>
            <p className="eyebrow">Agent record</p>
            <h2>Details and compliance</h2>
          </div>
        </div>
        <div className="agent-record-grid">
          <div className="agent-record-card primary">
            <span className="dossier-label">Details</span>
            <strong>{selectedAgent.name}</strong>
            <p>{selectedAgentRecord.publisher} / {agentOverviewSignals[selectedAgent.id].publisherType}</p>
            <div className="agent-record-meta">
              <span className="context-chip small-chip">{selectedAgentRecord.version}</span>
              <span className="context-chip small-chip">{selectedAgentRecord.availability}</span>
              <span className="context-chip small-chip">{selectedAgentRecord.catalogState}</span>
              <span className="context-chip small-chip">{agentOverviewSignals[selectedAgent.id].platform}</span>
            </div>
          </div>
          <div className="agent-record-card">
            <span className="dossier-label">Security and compliance</span>
            <strong>{selectedAgentRecord.complianceState}</strong>
            <p>{selectedAgentRecord.assignment} / Consent {selectedAgentRecord.adminConsent}</p>
            <div className="agent-record-meta">
              {selectedAgentRecord.supportedApps.map((item) => (
                <span key={item} className="context-chip small-chip">{item}</span>
              ))}
            </div>
          </div>
          <div className="agent-record-card">
            <span className="dossier-label">Capabilities</span>
            <strong>{selectedAgentRecord.capabilities.join(' / ')}</strong>
            <p>{selectedAgentRecord.actions.join(' / ')}</p>
          </div>
          <div className="agent-record-card">
            <span className="dossier-label">Knowledge</span>
            <strong>{selectedAgentRecord.knowledgeSources.join(' / ')}</strong>
            <p>{selectedAgent.businessPurpose}</p>
          </div>
          <div className="agent-record-card">
            <span className="dossier-label">Lifecycle and access</span>
            <strong>{selectedAgentRecord.lifecycleStage}</strong>
            <p>{selectedAgentRecord.accessPolicy}</p>
            <div className="agent-record-meta">
              <span className="context-chip small-chip">{selectedAgentRecord.assignment}</span>
              <span className="context-chip small-chip">{selectedAgentRecord.requestOwner}</span>
            </div>
          </div>
          <div className="agent-record-card">
            <span className="dossier-label">Metering and review</span>
            <strong>{selectedAgentRecord.metering}</strong>
            <p>Last review {selectedAgentRecord.lastReview}</p>
            <div className="agent-record-meta">
              <span className="context-chip small-chip">{selectedAgentRecord.lifecycleStage}</span>
              <span className={`pill small ${selectedAgentRecord.complianceState === 'Passed' ? 'low' : selectedAgentRecord.complianceState === 'In review' ? 'medium' : 'high'}`}>{selectedAgentRecord.complianceState}</span>
            </div>
          </div>
          <div className="agent-record-card">
            <span className="dossier-label">Permissions and identity</span>
            <strong>{selectedAgentRecord.identityMode}</strong>
            <p>{selectedAgentRecord.permissions.join(' / ')}</p>
            <div className="agent-record-meta">
              <span className="context-chip small-chip">Consent {selectedAgentRecord.adminConsent}</span>
              {selectedAgentRecord.supportedApps.map((item) => (
                <span key={`${selectedAgentRecord.identityMode}-${item}`} className="context-chip small-chip">{item}</span>
              ))}
            </div>
          </div>
        </div>
      </article>
    </section>
  )
}
