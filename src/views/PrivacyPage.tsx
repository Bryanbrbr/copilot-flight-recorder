import { LandingLayout } from './LandingLayout'

export function PrivacyPage() {
  return (
    <LandingLayout>
      <section className="features-hero">
        <span className="landing-section-badge">Legal</span>
        <h1>Privacy Policy</h1>
        <p className="landing-section-sub">Last updated: March 15, 2026</p>
      </section>

      <section className="landing-section" style={{ textAlign: 'left', maxWidth: 800, margin: '0 auto' }}>
        <h2>1. Information we collect</h2>
        <p className="landing-section-sub" style={{ maxWidth: 'none', textAlign: 'left' }}>
          When you use Copilot Flight Recorder, we collect the following information through your Microsoft 365 tenant connection:
        </p>
        <ul className="feature-details">
          <li>Microsoft Entra ID profile (name, email, tenant ID)</li>
          <li>Copilot agent metadata (agent names, types, owners)</li>
          <li>Agent activity events (actions, timestamps, policy evaluations)</li>
          <li>Policy configurations you define within the platform</li>
        </ul>

        <h2 style={{ marginTop: 48 }}>2. How we use your data</h2>
        <p className="landing-section-sub" style={{ maxWidth: 'none', textAlign: 'left' }}>
          Your data is used exclusively to provide the Copilot Flight Recorder service:
        </p>
        <ul className="feature-details">
          <li>Display agent monitoring dashboards and analytics</li>
          <li>Evaluate policy compliance and generate trust scores</li>
          <li>Generate incident alerts and audit trail records</li>
          <li>Produce compliance reports and data exports</li>
        </ul>

        <h2 style={{ marginTop: 48 }}>3. Data isolation</h2>
        <p className="landing-section-sub" style={{ maxWidth: 'none', textAlign: 'left' }}>
          Each Microsoft 365 tenant's data is fully isolated. We use row-level security and tenant-scoped access controls to ensure no cross-tenant data exposure. Your data is never shared with other customers or third parties.
        </p>

        <h2 style={{ marginTop: 48 }}>4. Data storage and security</h2>
        <ul className="feature-details">
          <li>Data is encrypted at rest (AES-256) and in transit (TLS 1.3)</li>
          <li>Hosted on Microsoft Azure with SOC 2 Type II compliance</li>
          <li>Access logs are retained for 90 days</li>
          <li>Regular third-party security audits</li>
        </ul>

        <h2 style={{ marginTop: 48 }}>5. Your rights</h2>
        <p className="landing-section-sub" style={{ maxWidth: 'none', textAlign: 'left' }}>
          You can request data export or deletion at any time by contacting privacy@copilotflightrecorder.com.
          Disconnecting your Microsoft 365 tenant removes all synced data within 30 days.
        </p>

        <h2 style={{ marginTop: 48 }}>6. Contact</h2>
        <p className="landing-section-sub" style={{ maxWidth: 'none', textAlign: 'left' }}>
          For privacy-related questions, contact us at privacy@copilotflightrecorder.com.
        </p>
      </section>
    </LandingLayout>
  )
}
