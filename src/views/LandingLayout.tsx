/**
 * Shared layout for all marketing pages (landing, features, pricing).
 * Provides consistent nav + footer across public pages.
 */
import '@/styles/Landing.css'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/auth'

export function LandingLayout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate()
  const { isAuthenticated, isDemoMode, login } = useAuth()
  const [showSignInModal, setShowSignInModal] = useState(false)

  const handleSignIn = () => {
    if (isDemoMode) {
      // Auth not configured — show info modal
      setShowSignInModal(true)
    } else if (isAuthenticated) {
      navigate('/app')
    } else {
      login()
    }
  }

  return (
    <div className="landing">
      <nav className="landing-nav">
        <Link to="/" className="landing-logo">
          <span className="landing-logo-icon">◈</span>
          <span>Copilot Flight Recorder</span>
        </Link>
        <div className="landing-nav-links">
          <Link to="/features">Features</Link>
          <Link to="/pricing">Pricing</Link>
          <button type="button" className="landing-cta-small" onClick={() => navigate('/app')}>
            Try demo
          </button>
          <button type="button" className="landing-cta-small landing-signin-btn" onClick={handleSignIn}>
            Sign in
          </button>
        </div>
      </nav>

      {children}

      <footer className="landing-footer">
        <div className="landing-footer-content">
          <div>
            <span className="landing-logo-icon">◈</span>
            <strong>Copilot Flight Recorder</strong>
            <p>The governance layer for Microsoft Copilot agents.</p>
          </div>
          <div className="landing-footer-links">
            <div>
              <h4>Product</h4>
              <Link to="/">Home</Link>
              <Link to="/features">Features</Link>
              <Link to="/pricing">Pricing</Link>
            </div>
            <div>
              <h4>Resources</h4>
              <a href="https://learn.microsoft.com/en-us/graph/" target="_blank" rel="noopener noreferrer">Graph API docs</a>
              <a href="https://entra.microsoft.com" target="_blank" rel="noopener noreferrer">Entra ID</a>
              <a href="https://azure.microsoft.com" target="_blank" rel="noopener noreferrer">Azure</a>
            </div>
            <div>
              <h4>Legal</h4>
              <Link to="/privacy">Privacy Policy</Link>
              <Link to="/terms">Terms of Service</Link>
            </div>
          </div>
        </div>
        <div className="landing-footer-bottom">
          <p>&copy; {new Date().getFullYear()} Copilot Flight Recorder. All rights reserved.</p>
        </div>
      </footer>

      {/* Microsoft Sign-in Modal */}
      {showSignInModal && (
        <div className="signin-modal-overlay" onClick={() => setShowSignInModal(false)}>
          <div className="signin-modal" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="signin-modal-close" onClick={() => setShowSignInModal(false)} aria-label="Close">
              &times;
            </button>
            <div className="signin-modal-logo">
              <svg width="24" height="24" viewBox="0 0 21 21" fill="none">
                <rect x="1" y="1" width="9" height="9" fill="#f25022" />
                <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
                <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
                <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
              </svg>
              <span>Microsoft</span>
            </div>
            <h2>Sign in</h2>
            <p>Use your Microsoft 365 work account to connect your tenant and monitor your real Copilot agents.</p>

            <div className="signin-modal-input-group">
              <label htmlFor="signin-email">Work or school account</label>
              <input id="signin-email" type="email" placeholder="admin@yourcompany.onmicrosoft.com" disabled />
            </div>

            <div className="signin-modal-info">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="7" stroke="#0078d4" strokeWidth="1.5" fill="none" />
                <text x="8" y="12" textAnchor="middle" fill="#0078d4" fontSize="11" fontWeight="700">i</text>
              </svg>
              <p>
                Microsoft Entra ID sign-in is coming soon. In the meantime, explore the full product with our interactive demo using sample data.
              </p>
            </div>

            <div className="signin-modal-actions">
              <button type="button" className="landing-cta" onClick={() => { setShowSignInModal(false); navigate('/app') }}>
                Try the demo
              </button>
              <a href="mailto:sales@copilotflightrecorder.com?subject=Early%20access%20request" className="landing-cta-secondary">
                Request early access
              </a>
            </div>

            <p className="signin-modal-footer">
              Protected by Microsoft Entra ID
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
