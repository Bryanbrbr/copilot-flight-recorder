import { LandingLayout } from './LandingLayout'

export function TermsPage() {
  return (
    <LandingLayout>
      <section className="features-hero">
        <span className="landing-section-badge">Legal</span>
        <h1>Terms of Service</h1>
        <p className="landing-section-sub">Last updated: March 15, 2026</p>
      </section>

      <section className="landing-section" style={{ textAlign: 'left', maxWidth: 800, margin: '0 auto' }}>
        <h2>1. Acceptance of terms</h2>
        <p className="landing-section-sub" style={{ maxWidth: 'none', textAlign: 'left' }}>
          By accessing or using Copilot Flight Recorder ("the Service"), you agree to be bound by these Terms of Service. If you are using the Service on behalf of an organization, you represent that you have the authority to bind that organization.
        </p>

        <h2 style={{ marginTop: 48 }}>2. Service description</h2>
        <p className="landing-section-sub" style={{ maxWidth: 'none', textAlign: 'left' }}>
          Copilot Flight Recorder is a governance and monitoring platform for Microsoft Copilot agents within Microsoft 365 tenants. The Service provides agent monitoring, policy enforcement, incident management, trust scoring, and compliance reporting.
        </p>

        <h2 style={{ marginTop: 48 }}>3. Account and access</h2>
        <ul className="feature-details">
          <li>You must authenticate via Microsoft Entra ID to access the Service</li>
          <li>You are responsible for maintaining the security of your Microsoft 365 account</li>
          <li>You must have appropriate administrator privileges in your tenant</li>
          <li>Demo mode provides sample data and does not connect to any real tenant</li>
        </ul>

        <h2 style={{ marginTop: 48 }}>4. Subscription and billing</h2>
        <ul className="feature-details">
          <li>Starter plan: Free, limited to 5 agents with seed data</li>
          <li>Professional plan: $29/agent/month, billed monthly or annually</li>
          <li>Enterprise plan: Custom pricing, contact sales for details</li>
          <li>14-day free trial available for Professional features</li>
          <li>You may cancel at any time; access continues until the end of the billing period</li>
        </ul>

        <h2 style={{ marginTop: 48 }}>5. Data ownership</h2>
        <p className="landing-section-sub" style={{ maxWidth: 'none', textAlign: 'left' }}>
          You retain full ownership of all data synced from your Microsoft 365 tenant. We do not claim any intellectual property rights over your data. You may export or delete your data at any time.
        </p>

        <h2 style={{ marginTop: 48 }}>6. Acceptable use</h2>
        <p className="landing-section-sub" style={{ maxWidth: 'none', textAlign: 'left' }}>
          You agree not to reverse engineer, disrupt, or attempt to gain unauthorized access to the Service. You may not use the Service to violate any applicable laws or regulations.
        </p>

        <h2 style={{ marginTop: 48 }}>7. Limitation of liability</h2>
        <p className="landing-section-sub" style={{ maxWidth: 'none', textAlign: 'left' }}>
          The Service is provided "as is" without warranties of any kind. We are not liable for any damages arising from your use of the Service, including but not limited to data loss, service interruptions, or compliance failures.
        </p>

        <h2 style={{ marginTop: 48 }}>8. Contact</h2>
        <p className="landing-section-sub" style={{ maxWidth: 'none', textAlign: 'left' }}>
          For questions about these terms, contact us at legal@copilotflightrecorder.com.
        </p>
      </section>
    </LandingLayout>
  )
}
