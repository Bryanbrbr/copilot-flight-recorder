/**
 * Marketing landing page for Copilot Flight Recorder.
 * Uses LandingLayout for shared nav + footer.
 */
import { useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '@/auth'
import { LandingLayout } from './LandingLayout'

function useScrollReveal() {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('revealed')
          observer.disconnect()
        }
      },
      { threshold: 0.12 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  return ref
}

function RevealSection({ children, className = '', id }: { children: React.ReactNode; className?: string; id?: string }) {
  const ref = useScrollReveal()
  return (
    <div ref={ref} className={`reveal-on-scroll ${className}`} id={id}>
      {children}
    </div>
  )
}

/* ─── SVG badge icons ──────────────────────────────────────────── */

function ShieldCheckIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  )
}

function CloudCheckIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
      <path d="m9 15 2 2 4-4" />
    </svg>
  )
}

function LockIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  )
}

function CertIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="6" />
      <path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11" />
    </svg>
  )
}

/* ─── Product preview (CSS browser chrome) ─────────────────────── */

function ProductPreview({ onClick }: { onClick: () => void }) {
  return (
    <div className="browser-chrome">
      <div className="browser-chrome-bar">
        <div className="browser-dots">
          <span /><span /><span />
        </div>
        <div className="browser-url">
          <LockIcon />
          <span>app.copilotflightrecorder.com</span>
        </div>
      </div>
      <div className="browser-chrome-body">
        <div className="preview-dashboard">
          <div className="preview-sidebar">
            <div className="preview-brand">◈ CFR</div>
            <div className="preview-nav-item active" />
            <div className="preview-nav-item" />
            <div className="preview-nav-item alert" />
            <div className="preview-nav-item" />
          </div>
          <div className="preview-main">
            <div className="preview-topbar">
              <div className="preview-title-block">
                <div className="preview-eyebrow" />
                <div className="preview-title" />
              </div>
              <div className="preview-chips">
                <span className="preview-chip" />
                <span className="preview-chip accent" />
                <span className="preview-chip" />
              </div>
            </div>
            <div className="preview-ribbon">
              <div className="preview-ribbon-card">
                <div className="preview-label" />
                <div className="preview-value red">2 open</div>
                <div className="preview-helper" />
              </div>
              <div className="preview-ribbon-card">
                <div className="preview-label" />
                <div className="preview-value">4 active</div>
                <div className="preview-helper" />
              </div>
              <div className="preview-ribbon-card">
                <div className="preview-label" />
                <div className="preview-value">2/4</div>
                <div className="preview-helper" />
              </div>
              <div className="preview-ribbon-card">
                <div className="preview-label" />
                <div className="preview-value blue">Trust 84</div>
                <div className="preview-helper" />
              </div>
            </div>
            <div className="preview-cards-row">
              <div className="preview-card">
                <div className="preview-card-dot green" />
                <div className="preview-card-lines">
                  <div className="preview-line w80" />
                  <div className="preview-line w60" />
                </div>
              </div>
              <div className="preview-card highlight">
                <div className="preview-card-dot red" />
                <div className="preview-card-lines">
                  <div className="preview-line w70" />
                  <div className="preview-line w90" />
                </div>
              </div>
              <div className="preview-card">
                <div className="preview-card-dot blue" />
                <div className="preview-card-lines">
                  <div className="preview-line w60" />
                  <div className="preview-line w80" />
                </div>
              </div>
            </div>
            <div className="preview-case-bar">
              <div className="preview-case-badge">High</div>
              <div className="preview-case-badge yellow">In review</div>
              <div className="preview-line w40" />
            </div>
          </div>
        </div>
        <button type="button" className="preview-cta-overlay" onClick={onClick}>
          <span>Try the live demo</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
        </button>
      </div>
    </div>
  )
}

/* ─── Landing Page ─────────────────────────────────────────────── */

export function LandingPage({ onGetStarted }: { onGetStarted: () => void }) {
  const navigate = useNavigate()
  const goToApp = () => navigate('/app')

  return (
    <LandingLayout>
      {/* ─── Hero ─────────────────────────────────────────────────── */}
      <header className="landing-hero">
        <div className="landing-hero-content">
          <span className="landing-badge">For Microsoft 365 administrators</span>
          <h1>Govern your Copilot agents<br />before they govern you.</h1>
          <p>
            The admin center Microsoft forgot to build. Monitor every AI agent in your tenant,
            enforce policies in real time, and prove compliance to your CISO — all from one dashboard.
          </p>
          <div className="landing-hero-actions">
            <button type="button" className="landing-cta" onClick={onGetStarted}>
              Start free trial
            </button>
            <button type="button" className="landing-cta-secondary" onClick={goToApp}>Try the demo</button>
          </div>
          <div className="landing-hero-stats">
            <div><strong>4</strong><span>AI agent types monitored</span></div>
            <div><strong>&lt; 15s</strong><span>Mean time to detect</span></div>
            <div><strong>100%</strong><span>Audit trail coverage</span></div>
            <div><strong>SOC 2</strong><span>Compliance ready</span></div>
          </div>
        </div>
      </header>

      {/* ─── Social Proof with SVG badges ─────────────────────────── */}
      <RevealSection className="landing-social-proof">
        <p>Built for enterprise compliance and governance</p>
        <div className="landing-logos">
          <div className="landing-badge-item">
            <ShieldCheckIcon />
            <span>Microsoft Partner</span>
          </div>
          <div className="landing-badge-item">
            <CloudCheckIcon />
            <span>Azure Certified</span>
          </div>
          <div className="landing-badge-item">
            <LockIcon />
            <span>SOC 2 Type II</span>
          </div>
          <div className="landing-badge-item">
            <CertIcon />
            <span>ISO 27001</span>
          </div>
        </div>
      </RevealSection>

      {/* ─── Product Preview ──────────────────────────────────────── */}
      <RevealSection className="landing-section landing-preview-section" id="preview">
        <span className="landing-section-badge">See it in action</span>
        <h2>Your AI governance command center.</h2>
        <p className="landing-section-sub">
          Monitor agents, triage incidents, enforce policies, and prove compliance —
          all from a single dashboard built for IT admins.
        </p>
        <ProductPreview onClick={onGetStarted} />
      </RevealSection>

      {/* ─── Problem Statement ────────────────────────────────────── */}
      <RevealSection className="landing-section landing-section-alt" id="problem">
        <span className="landing-section-badge">The problem</span>
        <h2>Your Copilot agents are operating in the dark.</h2>
        <p className="landing-section-sub">
          Microsoft ships the agents. You ship the trust. But today you have no visibility into what
          they actually do, who they talk to, or whether they follow your policies.
        </p>
        <div className="landing-problem-grid">
          <div className="landing-problem-card">
            <span className="landing-problem-icon">&#x1f513;</span>
            <h3>No agent-level audit trail</h3>
            <p>Copilot actions happen silently. When something goes wrong, you have no forensic path to follow.</p>
          </div>
          <div className="landing-problem-card">
            <span className="landing-problem-icon">&#x1f4ca;</span>
            <h3>No centralized governance</h3>
            <p>Policies live across Purview, Teams admin, and Copilot Studio — with no single pane of glass.</p>
          </div>
          <div className="landing-problem-card">
            <span className="landing-problem-icon">&#x26a1;</span>
            <h3>No real-time enforcement</h3>
            <p>By the time you discover a policy violation, the data has already left your tenant.</p>
          </div>
        </div>
      </RevealSection>

      {/* ─── Features teaser ─────────────────────────────────────── */}
      <RevealSection className="landing-section" id="features">
        <span className="landing-section-badge">The solution</span>
        <h2>Everything you need to govern AI agents at scale.</h2>
        <div className="landing-features-grid">
          <div className="landing-feature">
            <div className="landing-feature-number">01</div>
            <h3>Incident command center</h3>
            <p>Triage AI incidents by severity, see blast radius across agents and surfaces, and resolve with auditable decision trails.</p>
          </div>
          <div className="landing-feature">
            <div className="landing-feature-number">02</div>
            <h3>Policy engine</h3>
            <p>Define sharing, publishing, and autonomy policies. Roll them out gradually with draft → limited → live controls.</p>
          </div>
          <div className="landing-feature">
            <div className="landing-feature-number">03</div>
            <h3>Trust scoring</h3>
            <p>Every agent gets a dynamic trust score based on event history, policy compliance, and incident frequency.</p>
          </div>
        </div>
        <div className="landing-section-cta">
          <Link to="/features" className="landing-cta-secondary">See all features</Link>
        </div>
      </RevealSection>

      {/* ─── Pricing teaser ──────────────────────────────────────── */}
      <RevealSection className="landing-section landing-section-alt" id="pricing">
        <span className="landing-section-badge">Pricing</span>
        <h2>Simple, transparent pricing.</h2>
        <div className="landing-pricing-grid">
          <div className="landing-pricing-card">
            <h3>Starter</h3>
            <div className="landing-price">Free</div>
            <p>For evaluation and small teams</p>
            <ul>
              <li>Up to 5 agents</li>
              <li>Seed data mode</li>
              <li>Basic dashboard</li>
            </ul>
            <button type="button" className="landing-cta-secondary" onClick={onGetStarted}>Get started</button>
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
              <li>Priority support</li>
            </ul>
            <button type="button" className="landing-cta" onClick={onGetStarted}>Start free trial</button>
          </div>
          <div className="landing-pricing-card">
            <h3>Enterprise</h3>
            <div className="landing-price">Custom</div>
            <p>For large organizations with compliance needs</p>
            <ul>
              <li>Everything in Pro</li>
              <li>Dedicated deployment</li>
              <li>SSO & SCIM</li>
            </ul>
            <a href="mailto:sales@copilotflightrecorder.com?subject=Enterprise%20inquiry" className="landing-cta-secondary">Contact sales</a>
          </div>
        </div>
        <div className="landing-section-cta">
          <Link to="/pricing" className="landing-cta-secondary">Compare all plans</Link>
        </div>
      </RevealSection>

      {/* ─── CTA ──────────────────────────────────────────────────── */}
      <section className="landing-final-cta">
        <h2>Ready to take control of your AI agents?</h2>
        <p>Start monitoring, governing, and securing your Copilot deployment in under 5 minutes.</p>
        <button type="button" className="landing-cta" onClick={onGetStarted}>
          Start your free trial
        </button>
      </section>
    </LandingLayout>
  )
}
