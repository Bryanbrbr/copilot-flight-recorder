import type { Policy } from '@/types'

type PolicyCardProps = {
  policy: Policy
  selected: boolean
  linked: boolean
  onSelect: (policyId: string) => void
  statusLabel: string
  liveState: boolean
}

export function PolicyCard({ policy, selected, linked, onSelect, statusLabel, liveState }: PolicyCardProps) {
  return (
    <button type="button" className={`policy-card policy-card-button ${selected ? 'selected' : ''} ${linked ? 'linked' : ''}`} onClick={() => onSelect(policy.id)}>
      <div className="policy-card-top">
        <div>
          <strong>{policy.name}</strong>
          <p>{policy.description}</p>
        </div>
        <span className={`pill small ${policy.severity}`}>{policy.severity}</span>
      </div>
      <dl>
        <div>
          <dt>Scope</dt>
          <dd>{policy.scope}</dd>
        </div>
        <div>
          <dt>Trigger</dt>
          <dd>{policy.trigger}</dd>
        </div>
        <div>
          <dt>Action</dt>
          <dd>{policy.action}</dd>
        </div>
      </dl>
      <div className="policy-footer">
        <span className={`toggle ${liveState ? 'enabled' : 'disabled'}`}>{statusLabel}</span>
        {linked ? <span className="context-chip small-chip">Incident-linked</span> : null}
      </div>
    </button>
  )
}
