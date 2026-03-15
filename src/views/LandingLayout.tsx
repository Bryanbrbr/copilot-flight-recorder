/**
 * Shared layout for all marketing pages (landing, features, pricing).
 * Provides consistent nav + footer across public pages.
 */
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/auth'

export function LandingLayout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate()
  const { isAuthenticated, login } = useAuth()

  const handleGetStarted = () => {
    if (isAuthenticated) {
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
          <button type="button" className="landing-cta-small" onClick={handleGetStarted}>
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
    </div>
  )
}
