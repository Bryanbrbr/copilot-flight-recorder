/**
 * Dedicated Features page — expanded version of the features section.
 */
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/auth'
import { LandingLayout } from './LandingLayout'

export function FeaturesPage() {
  const navigate = useNavigate()
  const { isAuthenticated, login } = useAuth()

  const handleGetStarted = () => {
    if (isAuthenticated) navigate('/app')
    else login()
  }

  return (
    <LandingLayout>
      {/* Hero */}
      <section className="features-hero">
        <span className="landing-section-badge">Features</span>
        <h1>Everything you need to govern AI agents at scale.</h1>
        <p className="landing-section-sub">
          From real-time monitoring to compliance exports, Copilot Flight Recorder gives IT admins
          full visibility and control over every AI agent in their Microsoft 365 tenant.
        </p>
      </section>

      {/* Core Features Grid */}
      <section className="landing-section">
        <span className="landing-section-badge">Core capabilities</span>
        <h2>Six pillars of AI governance</h2>
        <div className="landing-features-grid">
          <div className="landing-feature">
            <div className="landing-feature-number">01</div>
            <h3>Incident command center</h3>
            <p>Triage AI incidents by severity, see blast radius across agents and surfaces, and resolve with auditable decision trails.</p>
            <ul className="feature-details">
              <li>Severity-based triage (Critical / High / Medium / Low)</li>
              <li>Case activity timeline with full audit trail</li>
              <li>One-click acknowledge, resolve, and reopen workflows</li>
              <li>Auto-linked to responsible agent and triggering policy</li>
            </ul>
          </div>
          <div className="landing-feature">
            <div className="landing-feature-number">02</div>
            <h3>Policy engine</h3>
            <p>Define sharing, publishing, and autonomy policies. Roll them out gradually with draft, limited, and live controls.</p>
            <ul className="feature-details">
              <li>Granular scope: per-agent, per-surface, or tenant-wide</li>
              <li>Graduated rollout: Draft → Limited → Active</li>
              <li>Block, audit, or notify enforcement actions</li>
              <li>Policy impact analysis before activation</li>
            </ul>
          </div>
          <div className="landing-feature">
            <div className="landing-feature-number">03</div>
            <h3>Trust scoring</h3>
            <p>Every agent gets a dynamic trust score based on event history, policy compliance, and incident frequency.</p>
            <ul className="feature-details">
              <li>Real-time score updates on every event</li>
              <li>Risk factor breakdown per agent</li>
              <li>Historical trend visualization</li>
              <li>Threshold-based alerting when trust drops</li>
            </ul>
          </div>
          <div className="landing-feature">
            <div className="landing-feature-number">04</div>
            <h3>Microsoft Graph integration</h3>
            <p>Pull real agent data, security alerts, and audit logs directly from your M365 tenant via Graph API.</p>
            <ul className="feature-details">
              <li>OAuth 2.0 with Microsoft Entra ID</li>
              <li>Real-time sync with Graph Security API</li>
              <li>Service principal-based automation</li>
              <li>Delegated and app-only permission models</li>
            </ul>
          </div>
          <div className="landing-feature">
            <div className="landing-feature-number">05</div>
            <h3>Compliance exports</h3>
            <p>One-click CSV and JSON exports for SOC 2, ISO 27001, and internal audit requirements.</p>
            <ul className="feature-details">
              <li>Pre-formatted reports for SOC 2 Type II</li>
              <li>ISO 27001 control mapping</li>
              <li>Scheduled export automation</li>
              <li>Custom report builder for internal audits</li>
            </ul>
          </div>
          <div className="landing-feature">
            <div className="landing-feature-number">06</div>
            <h3>Teams & Slack alerts</h3>
            <p>Instant notifications when critical incidents fire, trust scores drop, or policy violations occur.</p>
            <ul className="feature-details">
              <li>Microsoft Teams adaptive cards</li>
              <li>Slack webhook integration</li>
              <li>Customizable alert thresholds</li>
              <li>Escalation chains with on-call routing</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Architecture */}
      <section className="landing-section landing-section-alt">
        <span className="landing-section-badge">Architecture</span>
        <h2>Built for enterprise. Deployed on Azure.</h2>
        <p className="landing-section-sub">
          Tenant-isolated, MSAL-authenticated, and designed to run as a first-party Azure Container App.
        </p>
        <div className="landing-arch-grid">
          <div className="landing-arch-card">
            <strong>Frontend</strong>
            <p>React 19 + TypeScript + Vite</p>
          </div>
          <div className="landing-arch-card">
            <strong>API</strong>
            <p>Fastify + Drizzle ORM</p>
          </div>
          <div className="landing-arch-card">
            <strong>Auth</strong>
            <p>Microsoft Entra ID (MSAL)</p>
          </div>
          <div className="landing-arch-card">
            <strong>Data</strong>
            <p>SQLite (dev) / Azure SQL (prod)</p>
          </div>
          <div className="landing-arch-card">
            <strong>Integration</strong>
            <p>Microsoft Graph API</p>
          </div>
          <div className="landing-arch-card">
            <strong>Deploy</strong>
            <p>Azure Container Apps + CI/CD</p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="landing-final-cta">
        <h2>Ready to take control of your AI agents?</h2>
        <p>Start monitoring, governing, and securing your Copilot deployment in under 5 minutes.</p>
        <button type="button" className="landing-cta" onClick={handleGetStarted}>
          Start your free trial
        </button>
      </section>
    </LandingLayout>
  )
}
