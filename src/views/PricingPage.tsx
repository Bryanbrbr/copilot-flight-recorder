/**
 * Dedicated Pricing page with plan comparison and FAQ.
 */
import { useNavigate } from 'react-router-dom'
import { LandingLayout } from './LandingLayout'

const faqs = [
  {
    q: 'How does the free trial work?',
    a: 'Sign up and get instant access to all Professional features for 14 days. No credit card required. At the end of the trial, you can downgrade to Starter or subscribe.',
  },
  {
    q: 'What counts as an "agent"?',
    a: 'Any Copilot agent registered in your Microsoft 365 tenant — including Copilot Studio bots, SharePoint agents, Teams extensions, and custom Graph-connected agents.',
  },
  {
    q: 'Can I switch plans later?',
    a: 'Yes. You can upgrade or downgrade at any time. When upgrading, you get immediate access to new features. When downgrading, your current billing cycle completes first.',
  },
  {
    q: 'Is my data isolated from other tenants?',
    a: 'Absolutely. Every tenant gets a fully isolated data partition. We use row-level security and tenant-scoped API keys to ensure complete data separation.',
  },
  {
    q: 'Do you offer volume discounts?',
    a: 'Yes. Enterprise plans include custom pricing based on agent count and support requirements. Contact our sales team for a tailored quote.',
  },
]

export function PricingPage() {
  const navigate = useNavigate()
  const handleGetStarted = () => {
    navigate('/app')
  }

  return (
    <LandingLayout>
      {/* Hero */}
      <section className="features-hero">
        <span className="landing-section-badge">Pricing</span>
        <h1>Simple, transparent pricing.</h1>
        <p className="landing-section-sub">
          Start free with seed data. Upgrade when you connect your real Microsoft 365 tenant.
        </p>
      </section>

      {/* Pricing Cards */}
      <section className="landing-section">
        <div className="landing-pricing-grid">
          <div className="landing-pricing-card">
            <h3>Starter</h3>
            <div className="landing-price">Free</div>
            <p>For evaluation and small teams</p>
            <ul>
              <li>Up to 5 agents</li>
              <li>Seed data mode</li>
              <li>Basic dashboard</li>
              <li>Community support</li>
            </ul>
            <button type="button" className="landing-cta-secondary" onClick={handleGetStarted}>Get started</button>
          </div>
          <div className="landing-pricing-card featured">
            <span className="landing-pricing-badge">Most popular</span>
            <h3>Professional</h3>
            <div className="landing-price">$29<span>/agent/month</span></div>
            <p>For IT teams governing Copilot at scale</p>
            <ul>
              <li>Unlimited agents</li>
              <li>Graph API sync</li>
              <li>Full audit trail</li>
              <li>Teams & Slack alerts</li>
              <li>CSV/JSON exports</li>
              <li>RBAC roles</li>
              <li>Priority support</li>
            </ul>
            <button type="button" className="landing-cta" onClick={handleGetStarted}>Start free trial</button>
          </div>
          <div className="landing-pricing-card">
            <h3>Enterprise</h3>
            <div className="landing-price">Custom</div>
            <p>For large organizations with compliance needs</p>
            <ul>
              <li>Everything in Professional</li>
              <li>Dedicated Azure deployment</li>
              <li>SSO & SCIM provisioning</li>
              <li>Custom policies & connectors</li>
              <li>SLA & dedicated support</li>
            </ul>
            <a href="mailto:sales@copilotflightrecorder.com?subject=Enterprise%20inquiry" className="landing-cta-secondary">Contact sales</a>
          </div>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="landing-section landing-section-alt">
        <span className="landing-section-badge">Compare plans</span>
        <h2>Feature comparison</h2>
        <div className="pricing-comparison-table">
          <table>
            <thead>
              <tr>
                <th>Feature</th>
                <th>Starter</th>
                <th className="highlight-col">Professional</th>
                <th>Enterprise</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>Agent monitoring</td><td>5 agents</td><td className="highlight-col">Unlimited</td><td>Unlimited</td></tr>
              <tr><td>Dashboard</td><td>Basic</td><td className="highlight-col">Full</td><td>Full + custom</td></tr>
              <tr><td>Incident management</td><td>View only</td><td className="highlight-col">Full triage</td><td>Full triage</td></tr>
              <tr><td>Policy engine</td><td>3 policies</td><td className="highlight-col">Unlimited</td><td>Unlimited + custom</td></tr>
              <tr><td>Graph API integration</td><td>-</td><td className="highlight-col">Yes</td><td>Yes</td></tr>
              <tr><td>Trust scoring</td><td>Basic</td><td className="highlight-col">Advanced</td><td>Advanced + ML</td></tr>
              <tr><td>Compliance exports</td><td>-</td><td className="highlight-col">CSV / JSON</td><td>CSV / JSON / PDF</td></tr>
              <tr><td>Teams / Slack alerts</td><td>-</td><td className="highlight-col">Yes</td><td>Yes + custom</td></tr>
              <tr><td>SSO / SCIM</td><td>-</td><td className="highlight-col">-</td><td>Yes</td></tr>
              <tr><td>Dedicated deployment</td><td>-</td><td className="highlight-col">-</td><td>Yes</td></tr>
              <tr><td>SLA</td><td>-</td><td className="highlight-col">99.9%</td><td>99.99%</td></tr>
              <tr><td>Support</td><td>Community</td><td className="highlight-col">Priority</td><td>Dedicated</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* FAQ */}
      <section className="landing-section">
        <span className="landing-section-badge">FAQ</span>
        <h2>Frequently asked questions</h2>
        <div className="pricing-faq-grid">
          {faqs.map((faq) => (
            <div key={faq.q} className="pricing-faq-item">
              <h3>{faq.q}</h3>
              <p>{faq.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="landing-final-cta">
        <h2>Start your 14-day free trial today.</h2>
        <p>No credit card required. Full Professional features included.</p>
        <button type="button" className="landing-cta" onClick={handleGetStarted}>
          Start free trial
        </button>
      </section>
    </LandingLayout>
  )
}
