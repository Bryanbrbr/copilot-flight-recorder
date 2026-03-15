# Copilot Flight Recorder

Copilot Flight Recorder is a product-style prototype for governing Microsoft-aligned AI agents.

## What it demonstrates

- A control-plane style dashboard for enterprise agents
- Agent replay with execution timeline and risk context
- Policy-driven alert center
- Governance layer with approval, block, and quarantine rules
- Seed data realistic enough to tell the product story without fake fluff

## Product concept

This app is intentionally positioned as the layer around Microsoft agents rather than another agent itself.

The product value is:

- observe what agents actually did
- replay risky chains of execution
- surface incidents before they become silent failures
- express governance rules in business language

## Current implementation

### Domain model

The app models:

- `Agent`
- `AgentEvent`
- `Policy`
- `Alert`
- `AgentInsight`

### Detection engine

The current engine derives:

- trust score per agent
- repeated tool loop incidents
- sensitive read violations
- low-confidence external response alerts
- workspace health metrics

### Screens

- Dashboard
- Timeline / replay
- Alert center
- Governance

## Tech stack

- React
- TypeScript
- Vite
- Pure CSS

The stack is intentionally lean so the product core stays clear.

## Why this shape makes sense

If this became a real company, the next integrations would be:

- Microsoft Graph
- Teams
- Copilot Studio telemetry
- Entra identity and policy context
- Purview or security metadata

The strongest long-term moat is not the UI. It is the event model, replay logic, policy engine, and enterprise workflow fit.

## Run locally

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Suggested next steps

1. Add a real event ingestion layer instead of static seed data.
2. Introduce organization and workspace switching.
3. Add replay session detail pages.
4. Add rule editing and simulation mode.
5. Connect the first Microsoft identity and telemetry surfaces.