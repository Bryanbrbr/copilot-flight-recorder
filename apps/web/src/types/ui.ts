export type ViewId = 'dashboard' | 'timeline' | 'alerts' | 'governance'

export type CaseActivityEntry = {
  id: string
  alertId: string
  timestamp: string
  actor: string
  action: string
  detail: string
}

export type PolicyRolloutMode = 'draft' | 'limited' | 'live'

export type AgentAdminRecord = {
  publisher: string
  availability: 'Published' | 'Limited release' | 'Private' | 'Requested'
  catalogState: 'Approved' | 'Requestable' | 'Hidden' | 'Pending review'
  assignment: string
  supportedApps: string[]
  complianceState: 'Passed' | 'In review' | 'Restricted'
  version: string
  capabilities: string[]
  knowledgeSources: string[]
  actions: string[]
  lifecycleStage: 'Develop' | 'Validate' | 'Pilot' | 'Production'
  metering: 'Included' | 'Pay-as-you-go' | 'Capacity pack'
  requestOwner: string
  accessPolicy: string
  lastReview: string
  identityMode: 'Delegated' | 'App-only' | 'Mixed'
  adminConsent: 'Required' | 'Scoped' | 'Approved'
  permissions: string[]
}

export type OverviewSignal = {
  publisherType: 'Organization' | 'Partner'
  platform: 'Copilot Studio' | 'Microsoft 365 Agent Builder' | 'Azure AI Foundry'
  ownerState: 'Assigned' | 'Ownerless'
  usage7d: number[]
}

export type SearchResult = {
  kind: 'agent' | 'alert' | 'policy'
  id: string
  title: string
  subtitle: string
  detail: string
}
