export const simulationScenarios: Record<
  string,
  {
    trigger: string
    expectedAction: string
    rationale: string
    containmentEffect: string
  }
> = {
  'pol-sensitive-read': {
    trigger: 'HR or Finance record is requested without an approval token in the execution context.',
    expectedAction: 'Block the read and open a critical incident for review.',
    rationale: 'Sensitive datasets should never rely on implied approvals or prompt-level intent alone.',
    containmentEffect: 'Stops the data path before a protected record is disclosed to the agent workflow.',
  },
  'pol-loop-detection': {
    trigger: 'The same connector is called repeatedly inside a short execution window.',
    expectedAction: 'Raise a high-severity incident and mark the run for operator review.',
    rationale: 'Repeated retries often signal a broken connector path or runaway execution branch.',
    containmentEffect: 'Contains cost, noisy telemetry, and hidden workflow degradation before it spreads.',
  },
  'pol-external-send': {
    trigger: 'An external-facing response is generated below the required confidence threshold.',
    expectedAction: 'Pause external send and require human approval.',
    rationale: 'Outbound communication should not leave the tenant when the model confidence is below policy.',
    containmentEffect: 'Keeps external messaging inside a human-controlled approval boundary.',
  },
  'pol-bulk-write': {
    trigger: 'An agent attempts to modify a large batch of records without explicit sign-off.',
    expectedAction: 'Quarantine the run and lock downstream writes until reviewed.',
    rationale: 'Bulk mutations create a large blast radius and deserve stricter control than normal updates.',
    containmentEffect: 'Prevents cascading record corruption across finance and reporting systems.',
  },
}
