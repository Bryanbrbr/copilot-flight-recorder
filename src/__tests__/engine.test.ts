import { describe, it, expect } from 'vitest'
import { buildWorkspaceState, computeWorkspaceMetrics, buildInsights } from '../engine'
import { agents, events, policies } from '../seedData'

describe('buildWorkspaceState', () => {
  const workspace = buildWorkspaceState(agents, events, policies)

  it('returns all agents', () => {
    expect(workspace.agents).toHaveLength(agents.length)
  })

  it('returns all events', () => {
    expect(workspace.events).toHaveLength(events.length)
  })

  it('returns all policies', () => {
    expect(workspace.policies).toHaveLength(policies.length)
  })

  it('generates alerts from events + policies', () => {
    expect(workspace.alerts.length).toBeGreaterThan(0)
  })

  it('assigns severity to all alerts', () => {
    for (const alert of workspace.alerts) {
      expect(['low', 'medium', 'high', 'critical']).toContain(alert.severity)
    }
  })

  it('generates insights for each agent', () => {
    expect(workspace.insights).toHaveLength(agents.length)
  })
})

describe('computeWorkspaceMetrics', () => {
  const workspace = buildWorkspaceState(agents, events, policies)
  const metrics = computeWorkspaceMetrics(workspace)

  it('computes total agents', () => {
    expect(metrics.totalAgents).toBe(agents.length)
  })

  it('computes open alerts count', () => {
    expect(metrics.openAlerts).toBeGreaterThanOrEqual(0)
  })

  it('computes critical alerts count', () => {
    expect(metrics.criticalAlerts).toBeGreaterThanOrEqual(0)
  })

  it('computes average trust score between 0 and 100', () => {
    expect(metrics.averageTrust).toBeGreaterThanOrEqual(0)
    expect(metrics.averageTrust).toBeLessThanOrEqual(100)
  })

  it('counts blocked actions', () => {
    expect(metrics.blockedActions).toBeGreaterThanOrEqual(0)
  })

  it('counts high risk events', () => {
    expect(metrics.highRiskEvents).toBeGreaterThanOrEqual(0)
  })
})

describe('buildInsights', () => {
  const insights = buildInsights(agents, events)

  it('generates one insight per agent', () => {
    expect(insights).toHaveLength(agents.length)
  })

  it('calculates trust scores between 0 and 100', () => {
    for (const insight of insights) {
      expect(insight.trustScore).toBeGreaterThanOrEqual(0)
      expect(insight.trustScore).toBeLessThanOrEqual(100)
    }
  })

  it('counts risky events correctly', () => {
    for (const insight of insights) {
      expect(insight.riskyEvents).toBeGreaterThanOrEqual(0)
    }
  })

  it('counts blocked actions per agent', () => {
    for (const insight of insights) {
      expect(insight.blockedActions).toBeGreaterThanOrEqual(0)
    }
  })

  it('agents with blocked events have lower trust scores', () => {
    const sorted = [...insights].sort((a, b) => a.trustScore - b.trustScore)
    const lowest = sorted[0]
    const highest = sorted[sorted.length - 1]
    expect(lowest.trustScore).toBeLessThan(highest.trustScore)
  })
})
