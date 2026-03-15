type SurfaceStatus = 'connected' | 'watch' | 'planned'

export const connectedSurfaces: readonly { name: string; status: SurfaceStatus; detail: string }[] = [
  { name: 'Microsoft Graph', status: 'connected', detail: 'Mail, file, and identity activity can be correlated with agent runs.' },
  { name: 'Teams', status: 'connected', detail: 'Conversation-triggered actions are linked back to review and approval paths.' },
  { name: 'Copilot Studio', status: 'watch', detail: 'Execution traces are flowing into the current monitoring model.' },
  { name: 'Purview', status: 'planned', detail: 'Data classification can be added as policy context in the next layer.' },
]

export const controlLayers = [
  {
    title: 'Identity boundary',
    detail: 'Map each run to tenant, owner, approval path, and policy scope before it is trusted.',
  },
  {
    title: 'Execution replay',
    detail: 'Reconstruct tool calls, data reads, approval steps, and blocked actions as a reviewable chain.',
  },
  {
    title: 'Governance enforcement',
    detail: 'Turn policy into approval, alert, block, or quarantine actions instead of passive logging.',
  },
] as const
