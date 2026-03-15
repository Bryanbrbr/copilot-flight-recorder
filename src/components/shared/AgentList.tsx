import type { Alert } from '@/types'
import { useWorkspaceStore } from '@/hooks/useWorkspaceStore'
import { getInsight } from '@/engine'

type AgentListProps = {
  selectedAgentId: string
  onSelect: (agentId: string) => void
  searchQuery: string
  alerts: Alert[]
}

export function AgentList({ selectedAgentId, onSelect, searchQuery, alerts }: AgentListProps) {
  const workspace = useWorkspaceStore((s) => s.workspace)
  const filteredAgents = workspace.agents.filter((agent) => {
    const haystack = `${agent.name} ${agent.owner} ${agent.environment} ${agent.businessPurpose}`.toLowerCase()
    return haystack.includes(searchQuery.toLowerCase())
  })

  return (
    <section className="panel agent-list-panel">
      <div className="panel-header compact">
        <div>
          <p className="eyebrow">Fleet</p>
          <h2>Agent surface</h2>
        </div>
        <span className="subtle">{filteredAgents.length} of {workspace.agents.length} agents</span>
      </div>
      <div className="agent-list">
        {filteredAgents.length === 0 ? (
          <div className="agent-empty-state">No agents match the current search.</div>
        ) : filteredAgents.map((agent) => {
          const insight = getInsight(workspace, agent.id)
          const openFindings = alerts.filter((alert) => alert.agentId === agent.id && alert.status === 'open').length
          return (
            <button
              key={agent.id}
              className={`agent-row ${selectedAgentId === agent.id ? 'selected' : ''} ${openFindings > 0 ? 'risk' : ''}`}
              onClick={() => onSelect(agent.id)}
              type="button"
            >
              <div>
                <strong>{agent.name}</strong>
                <p>{agent.owner} / {agent.environment}</p>
              </div>
              <div className="agent-row-meta">
                {openFindings > 0 ? <span className="agent-alert-badge">{openFindings} open</span> : null}
                <span className={`pill ${agent.status}`}>{agent.status}</span>
                <span className="trust-chip">Trust {insight?.trustScore ?? '--'}</span>
              </div>
            </button>
          )
        })}
      </div>
    </section>
  )
}
