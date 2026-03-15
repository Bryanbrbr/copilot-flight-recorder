import { db } from './client'
import * as schema from './schema'

const TENANT_ID = 'tenant-northwind'

async function main() {
  console.log('[seed] Seeding database...')

  // Tenant
  db.insert(schema.tenants).values({
    id: TENANT_ID,
    name: 'Northwind Global',
    plan: 'enterprise',
    createdAt: new Date().toISOString(),
  }).onConflictDoNothing().run()

  // Agents
  db.insert(schema.agents).values([
    {
      id: 'agt-sales-triage',
      tenantId: TENANT_ID,
      name: 'Sales Triage Copilot',
      owner: 'Revenue Operations',
      environment: 'Copilot Studio',
      businessPurpose: 'Qualify inbound leads from Forms, Teams, and Outlook.',
      autonomyLevel: 'semi-autonomous',
      lastDeployment: '2026-03-09T07:40:00Z',
      status: 'watch',
      events24h: 142,
      openIncidents: 2,
    },
    {
      id: 'agt-fin-close',
      tenantId: TENANT_ID,
      name: 'Finance Close Agent',
      owner: 'Corporate Finance',
      environment: 'Power Platform',
      businessPurpose: 'Prepare close summaries and draft follow-up actions.',
      autonomyLevel: 'assisted',
      lastDeployment: '2026-03-10T19:25:00Z',
      status: 'healthy',
      events24h: 88,
      openIncidents: 1,
    },
    {
      id: 'agt-hr-onboard',
      tenantId: TENANT_ID,
      name: 'HR Onboarding Agent',
      owner: 'People Operations',
      environment: 'Teams',
      businessPurpose: 'Coordinate onboarding tasks and answer new hire questions.',
      autonomyLevel: 'semi-autonomous',
      lastDeployment: '2026-03-08T14:00:00Z',
      status: 'critical',
      events24h: 67,
      openIncidents: 3,
    },
    {
      id: 'agt-graph-sync',
      tenantId: TENANT_ID,
      name: 'Graph Sync Worker',
      owner: 'Platform Engineering',
      environment: 'Graph Worker',
      businessPurpose: 'Synchronize agent activity into the audit pipeline.',
      autonomyLevel: 'autonomous',
      lastDeployment: '2026-03-10T22:10:00Z',
      status: 'watch',
      events24h: 219,
      openIncidents: 1,
    },
  ]).onConflictDoNothing().run()

  // Policies
  db.insert(schema.policies).values([
    {
      id: 'pol-sensitive-read',
      tenantId: TENANT_ID,
      name: 'Sensitive record access requires approval',
      description: 'Any HR or Finance data read above the confidentiality threshold must request approval.',
      enabled: true,
      severity: 'critical',
      scope: 'Global',
      trigger: 'Sensitive dataset read without approval token',
      action: 'Block',
    },
    {
      id: 'pol-loop-detection',
      tenantId: TENANT_ID,
      name: 'Repeated tool loop detection',
      description: 'Flag repeated calls to the same tool within a short execution window.',
      enabled: true,
      severity: 'high',
      scope: 'Global',
      trigger: '3+ repeated tool invocations in 5 minutes',
      action: 'Alert',
    },
    {
      id: 'pol-external-send',
      tenantId: TENANT_ID,
      name: 'External send requires confidence threshold',
      description: 'When an agent drafts or sends an external message, confidence must remain above policy threshold.',
      enabled: true,
      severity: 'high',
      scope: 'Sales',
      trigger: 'External response generated with low confidence',
      action: 'Require approval',
    },
    {
      id: 'pol-bulk-write',
      tenantId: TENANT_ID,
      name: 'Bulk write protection',
      description: 'Prevent agents from modifying large batches of records without explicit human confirmation.',
      enabled: true,
      severity: 'critical',
      scope: 'Finance',
      trigger: 'Bulk write to more than 25 records',
      action: 'Quarantine',
    },
  ]).onConflictDoNothing().run()

  // Alerts
  db.insert(schema.alerts).values([
    {
      id: 'alrt-001',
      tenantId: TENANT_ID,
      agentId: 'agt-sales-triage',
      policyId: 'pol-external-send',
      title: 'Low-confidence external reply attempted',
      description: 'Sales Triage Copilot drafted an external pricing email while confidence was below the policy floor.',
      severity: 'high',
      status: 'open',
      createdAt: '2026-03-11T07:43:30Z',
      recommendedAction: 'Review the drafted response, verify pricing accuracy, and decide whether to release or revise.',
    },
    {
      id: 'alrt-002',
      tenantId: TENANT_ID,
      agentId: 'agt-sales-triage',
      policyId: 'pol-loop-detection',
      title: 'CRM enrichment loop flagged',
      description: 'Sales Triage Copilot called the CRM enrichment tool multiple times during a single lead workflow.',
      severity: 'medium',
      status: 'acknowledged',
      createdAt: '2026-03-11T07:42:30Z',
      recommendedAction: 'Inspect tool call logs, confirm the loop was not caused by stale cache, and tune retry policy if needed.',
    },
    {
      id: 'alrt-003',
      tenantId: TENANT_ID,
      agentId: 'agt-hr-onboard',
      policyId: 'pol-sensitive-read',
      title: 'Blocked: Compensation data access without approval',
      description: 'HR Onboarding Agent attempted to read employee compensation records before obtaining an approval token.',
      severity: 'critical',
      status: 'open',
      createdAt: '2026-03-11T08:10:05Z',
      recommendedAction: 'Confirm the block was correct, review agent permissions, and ensure the approval flow is properly configured.',
    },
    {
      id: 'alrt-004',
      tenantId: TENANT_ID,
      agentId: 'agt-hr-onboard',
      policyId: 'pol-sensitive-read',
      title: 'Missing approval token in onboarding flow',
      description: 'The onboarding workflow proceeded without attaching the required approval reference in the metadata chain.',
      severity: 'high',
      status: 'open',
      createdAt: '2026-03-11T08:11:15Z',
      recommendedAction: 'Audit the workflow configuration to ensure approval tokens are injected before any sensitive data operation.',
    },
    {
      id: 'alrt-005',
      tenantId: TENANT_ID,
      agentId: 'agt-hr-onboard',
      policyId: 'pol-loop-detection',
      title: 'Repeated identity lookup detected',
      description: 'HR Onboarding Agent queried the identity endpoint multiple times for the same new hire profile.',
      severity: 'medium',
      status: 'open',
      createdAt: '2026-03-11T08:13:00Z',
      recommendedAction: 'Check whether caching is disabled or the identity service returned transient errors causing retries.',
    },
    {
      id: 'alrt-006',
      tenantId: TENANT_ID,
      agentId: 'agt-fin-close',
      policyId: 'pol-bulk-write',
      title: 'Bulk variance notes write flagged',
      description: 'Finance Close Agent attempted to write variance notes across multiple ledger entries in a single batch.',
      severity: 'high',
      status: 'open',
      createdAt: '2026-03-11T06:06:30Z',
      recommendedAction: 'Verify that the batch size is within policy limits and that each write was individually validated.',
    },
    {
      id: 'alrt-007',
      tenantId: TENANT_ID,
      agentId: 'agt-graph-sync',
      policyId: 'pol-loop-detection',
      title: 'Sync retry loop exceeded threshold',
      description: 'Graph Sync Worker retried the same batch sync operation three times within the monitoring window.',
      severity: 'high',
      status: 'open',
      createdAt: '2026-03-11T05:38:10Z',
      recommendedAction: 'Investigate the connector timeout root cause and consider increasing batch intervals or adding circuit breakers.',
    },
  ]).onConflictDoNothing().run()

  // Events
  const eventValues = [
    { id: 'evt-001', tenantId: TENANT_ID, agentId: 'agt-sales-triage', timestamp: '2026-03-11T07:41:00Z', type: 'message.received', title: 'Inbound lead received', summary: 'Captured enterprise lead from website form requesting pricing for 250 seats.', outcome: 'success', riskScore: 12, actor: 'Sales Triage Copilot', target: 'Dynamics lead intake', metadata: JSON.stringify({ source: 'website-form', region: 'FR' }) },
    { id: 'evt-002', tenantId: TENANT_ID, agentId: 'agt-sales-triage', timestamp: '2026-03-11T07:42:10Z', type: 'tool.called', title: 'CRM enrichment called', summary: 'Requested CRM enrichment against lead domain and industry signals.', outcome: 'success', riskScore: 21, actor: 'Sales Triage Copilot', target: 'Dynamics connector', metadata: JSON.stringify({ tool: 'crm-enrich', confidence: 0.82 }) },
    { id: 'evt-003', tenantId: TENANT_ID, agentId: 'agt-sales-triage', timestamp: '2026-03-11T07:43:15Z', type: 'response.generated', title: 'External reply drafted', summary: 'Drafted follow-up email to prospect before confidence floor was met.', outcome: 'warning', riskScore: 74, actor: 'Sales Triage Copilot', target: 'external-email', metadata: JSON.stringify({ confidence: 0.44, audience: 'external' }) },
    { id: 'evt-004', tenantId: TENANT_ID, agentId: 'agt-sales-triage', timestamp: '2026-03-11T07:43:29Z', type: 'approval.requested', title: 'Manager approval requested', summary: 'Requested human approval before sending pricing response externally.', outcome: 'success', riskScore: 28, actor: 'Sales Triage Copilot', target: 'sales-manager', metadata: null },
    { id: 'evt-005', tenantId: TENANT_ID, agentId: 'agt-fin-close', timestamp: '2026-03-11T06:04:00Z', type: 'data.read', title: 'Quarterly ledger loaded', summary: 'Read close package data from finance workspace for variance analysis.', outcome: 'success', riskScore: 34, actor: 'Finance Close Agent', target: 'finance-ledger-q1', metadata: JSON.stringify({ records: 12, sensitivity: 'medium' }) },
    { id: 'evt-006', tenantId: TENANT_ID, agentId: 'agt-fin-close', timestamp: '2026-03-11T06:05:42Z', type: 'workflow.completed', title: 'Close summary generated', summary: 'Delivered close summary draft with 3 flagged anomalies for analyst review.', outcome: 'success', riskScore: 14, actor: 'Finance Close Agent', target: 'finance-summary', metadata: JSON.stringify({ anomalies: 3 }) },
    { id: 'evt-007', tenantId: TENANT_ID, agentId: 'agt-hr-onboard', timestamp: '2026-03-11T08:10:00Z', type: 'data.read', title: 'HR profile access attempted', summary: 'Agent attempted to read compensation profile before approval token was attached.', outcome: 'blocked', riskScore: 96, actor: 'HR Onboarding Agent', target: 'employee-compensation-profile', metadata: JSON.stringify({ sensitivity: 'high', dataset: 'HR-core' }) },
    { id: 'evt-008', tenantId: TENANT_ID, agentId: 'agt-hr-onboard', timestamp: '2026-03-11T08:10:03Z', type: 'action.blocked', title: 'Sensitive read blocked', summary: 'Policy engine stopped the agent before the compensation profile left the vault.', outcome: 'blocked', riskScore: 91, actor: 'Policy Engine', target: 'pol-sensitive-read', metadata: null },
    { id: 'evt-009', tenantId: TENANT_ID, agentId: 'agt-hr-onboard', timestamp: '2026-03-11T08:11:10Z', type: 'approval.skipped', title: 'Approval token missing', summary: 'Approval reference expected by policy was not present in workflow metadata.', outcome: 'failure', riskScore: 88, actor: 'HR Onboarding Agent', target: 'approval-token', metadata: null },
    { id: 'evt-010', tenantId: TENANT_ID, agentId: 'agt-graph-sync', timestamp: '2026-03-11T05:35:00Z', type: 'tool.called', title: 'Sync batch dispatched', summary: 'Started syncing telemetry from Copilot Studio into observability store.', outcome: 'success', riskScore: 19, actor: 'Graph Sync Worker', target: 'graph-batch-sync', metadata: JSON.stringify({ batch: 1 }) },
    { id: 'evt-011', tenantId: TENANT_ID, agentId: 'agt-graph-sync', timestamp: '2026-03-11T05:36:00Z', type: 'tool.called', title: 'Sync batch retried', summary: 'Repeated batch sync after partial timeout.', outcome: 'warning', riskScore: 61, actor: 'Graph Sync Worker', target: 'graph-batch-sync', metadata: JSON.stringify({ batch: 1 }) },
    { id: 'evt-012', tenantId: TENANT_ID, agentId: 'agt-graph-sync', timestamp: '2026-03-11T05:37:00Z', type: 'tool.called', title: 'Sync batch retried again', summary: 'Third call to the same sync tool within the control window.', outcome: 'warning', riskScore: 72, actor: 'Graph Sync Worker', target: 'graph-batch-sync', metadata: JSON.stringify({ batch: 1 }) },
    { id: 'evt-013', tenantId: TENANT_ID, agentId: 'agt-graph-sync', timestamp: '2026-03-11T05:38:00Z', type: 'tool.failed', title: 'Sync tool failed', summary: 'Connector exhausted retry budget while writing execution traces.', outcome: 'failure', riskScore: 79, actor: 'Graph Sync Worker', target: 'graph-batch-sync', metadata: JSON.stringify({ error: 'timeout' }) },
    { id: 'evt-014', tenantId: TENANT_ID, agentId: 'agt-sales-triage', timestamp: '2026-03-11T07:44:50Z', type: 'workflow.completed', title: 'Lead triage workflow completed', summary: 'Workflow paused pending manager review on outbound response.', outcome: 'success', riskScore: 18, actor: 'Sales Triage Copilot', target: 'lead-qualification', metadata: null },
    { id: 'evt-015', tenantId: TENANT_ID, agentId: 'agt-fin-close', timestamp: '2026-03-11T06:06:10Z', type: 'data.write', title: 'Variance notes written', summary: 'Saved analyst-ready notes back into the finance close workspace.', outcome: 'success', riskScore: 26, actor: 'Finance Close Agent', target: 'finance-close-notes', metadata: JSON.stringify({ records: 4 }) },
    { id: 'evt-016', tenantId: TENANT_ID, agentId: 'agt-hr-onboard', timestamp: '2026-03-11T08:12:20Z', type: 'message.received', title: 'New hire question received', summary: 'Received a new hire question asking for payroll schedule and benefits timing.', outcome: 'success', riskScore: 8, actor: 'HR Onboarding Agent', target: 'teams-chat', metadata: null },
    { id: 'evt-017', tenantId: TENANT_ID, agentId: 'agt-hr-onboard', timestamp: '2026-03-11T08:12:44Z', type: 'response.generated', title: 'HR answer generated', summary: 'Prepared an answer to the new hire with approved onboarding playbook content.', outcome: 'success', riskScore: 18, actor: 'HR Onboarding Agent', target: 'teams-chat', metadata: JSON.stringify({ confidence: 0.92 }) },
    { id: 'evt-018', tenantId: TENANT_ID, agentId: 'agt-sales-triage', timestamp: '2026-03-11T07:45:30Z', type: 'data.read', title: 'Account history loaded', summary: 'Loaded account notes from prior opportunities to improve routing recommendation.', outcome: 'success', riskScore: 17, actor: 'Sales Triage Copilot', target: 'crm-account-history', metadata: JSON.stringify({ records: 7, sensitivity: 'low' }) },
  ]
  db.insert(schema.agentEvents).values(eventValues).onConflictDoNothing().run()

  console.log('[seed] Done.')
  process.exit(0)
}

main().catch((err) => {
  console.error('[seed] Failed:', err)
  process.exit(1)
})
