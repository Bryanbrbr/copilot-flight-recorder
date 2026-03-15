import { describe, it, expect } from 'vitest'
import { agents, events, policies } from '../seedData'

describe('seedData', () => {
  describe('agents', () => {
    it('has at least 3 agents', () => {
      expect(agents.length).toBeGreaterThanOrEqual(3)
    })

    it('all agents have required fields', () => {
      for (const agent of agents) {
        expect(agent.id).toBeTruthy()
        expect(agent.name).toBeTruthy()
        expect(agent.owner).toBeTruthy()
        expect(agent.environment).toBeTruthy()
        expect(agent.businessPurpose).toBeTruthy()
        expect(['autonomous', 'semi-autonomous', 'assisted', 'supervised']).toContain(agent.autonomyLevel)
      }
    })

    it('all agent IDs are unique', () => {
      const ids = agents.map((a) => a.id)
      expect(new Set(ids).size).toBe(ids.length)
    })
  })

  describe('events', () => {
    it('has at least 10 events', () => {
      expect(events.length).toBeGreaterThanOrEqual(10)
    })

    it('all events reference valid agents', () => {
      const agentIds = new Set(agents.map((a) => a.id))
      for (const event of events) {
        expect(agentIds.has(event.agentId)).toBe(true)
      }
    })

    it('all events have valid outcomes', () => {
      for (const event of events) {
        expect(['success', 'warning', 'failure', 'blocked']).toContain(event.outcome)
      }
    })

    it('all events have risk scores between 0 and 100', () => {
      for (const event of events) {
        expect(event.riskScore).toBeGreaterThanOrEqual(0)
        expect(event.riskScore).toBeLessThanOrEqual(100)
      }
    })
  })

  describe('policies', () => {
    it('has at least 3 policies', () => {
      expect(policies.length).toBeGreaterThanOrEqual(3)
    })

    it('all policies have required fields', () => {
      for (const policy of policies) {
        expect(policy.id).toBeTruthy()
        expect(policy.name).toBeTruthy()
        expect(policy.description).toBeTruthy()
        expect(['low', 'medium', 'high', 'critical']).toContain(policy.severity)
      }
    })
  })
})
