/**
 * Shared layout for all marketing pages (landing, features, pricing).
 * Provides consistent nav + footer across public pages.
 */
import '@/styles/Landing.css'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth, signIn, signUp, notifyLocalSessionChange } from '@/auth'
import { isAuthConfigured } from '@/auth/msalConfig'

export function LandingLayout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate()
  const { isAuthenticated, isDemoMode, login } = useAuth()
  const [showSignInModal, setShowSignInModal] = useState(false)
  const [modalTab, setModalTab] = useState<'signin' | 'signup'>('signin')
  const [modalName, setModalName] = useState('')
  const [modalEmail, setModalEmail] = useState('')
  const [modalPassword, setModalPassword] = useState('')
  const [modalError, setModalError] = useState('')
  const [modalSubmitting, setModalSubmitting] = useState(false)

  const handleSignIn = () => {
    if (isAuthenticated && !isDemoMode) {
      navigate('/app')
    } else {
      setShowSignInModal(true)
      setModalTab('signin')
      resetModalForm()
    }
  }

  const resetModalForm = () => {
    setModalName('')
    setModalEmail('')
    setModalPassword('')
    setModalError('')
    setModalSubmitting(false)
  }

  const handleModalEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setModalError('')
    setModalSubmitting(true)
    const result = await signIn(modalEmail, modalPassword)
    if (result.ok) {
      notifyLocalSessionChange()
      setShowSignInModal(false)
      navigate('/app')
    } else {
      setModalError(result.error)
      setModalSubmitting(false)
    }
  }

  const handleModalEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setModalError('')
    setModalSubmitting(true)
    const result = await signUp(modalName, modalEmail, modalPassword)
    if (result.ok) {
      notifyLocalSessionChange()
      setShowSignInModal(false)
      navigate('/app')
    } else {
      setModalError(result.error)
      setModalSubmitting(false)
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
          <button type="button" className="landing-cta-small" onClick={() => navigate('/app?demo=1')}>
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

      {/* Sign-in Modal */}
      {showSignInModal && (
        <div className="signin-modal-overlay" onClick={() => setShowSignInModal(false)}>
          <div className="signin-modal" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="signin-modal-close" onClick={() => setShowSignInModal(false)} aria-label="Close">
              &times;
            </button>

            <div className="signin-modal-logo">
              <span className="landing-logo-icon" style={{ fontSize: '1.2rem' }}>◈</span>
              <span>Copilot Flight Recorder</span>
            </div>
            <h2>{modalTab === 'signin' ? 'Sign in' : 'Create account'}</h2>

            {/* Tab switcher */}
            <div className="signin-modal-tabs">
              <button
                type="button"
                className={`signin-modal-tab ${modalTab === 'signin' ? 'active' : ''}`}
                onClick={() => { setModalTab('signin'); setModalError('') }}
              >
                Sign in
              </button>
              <button
                type="button"
                className={`signin-modal-tab ${modalTab === 'signup' ? 'active' : ''}`}
                onClick={() => { setModalTab('signup'); setModalError('') }}
              >
                Create account
              </button>
            </div>

            {/* Email/password form */}
            <form onSubmit={modalTab === 'signin' ? handleModalEmailSignIn : handleModalEmailSignUp}>
              {modalTab === 'signup' && (
                <div className="signin-modal-input-group">
                  <label htmlFor="modal-name">Full name</label>
                  <input
                    id="modal-name"
                    type="text"
                    placeholder="John Doe"
                    value={modalName}
                    onChange={e => setModalName(e.target.value)}
                    required
                  />
                </div>
              )}
              <div className="signin-modal-input-group">
                <label htmlFor="modal-email">Email address</label>
                <input
                  id="modal-email"
                  type="email"
                  placeholder="you@company.com"
                  value={modalEmail}
                  onChange={e => setModalEmail(e.target.value)}
                  required
                />
              </div>
              <div className="signin-modal-input-group">
                <label htmlFor="modal-password">Password</label>
                <input
                  id="modal-password"
                  type="password"
                  placeholder={modalTab === 'signup' ? 'At least 8 characters' : 'Your password'}
                  value={modalPassword}
                  onChange={e => setModalPassword(e.target.value)}
                  required
                  minLength={8}
                />
              </div>

              {modalError && <p className="signin-modal-error">{modalError}</p>}

              <div className="signin-modal-actions">
                <button type="submit" className="landing-cta" disabled={modalSubmitting}>
                  {modalSubmitting
                    ? 'Please wait...'
                    : modalTab === 'signin'
                      ? 'Sign in'
                      : 'Create account'}
                </button>
              </div>
            </form>

            {/* Microsoft sign-in option */}
            {isAuthConfigured && (
              <>
                <div className="signin-modal-divider"><span>or</span></div>
                <button
                  type="button"
                  className="signin-modal-microsoft-btn"
                  onClick={() => { setShowSignInModal(false); login() }}
                >
                  <svg width="20" height="20" viewBox="0 0 21 21" fill="none">
                    <rect x="1" y="1" width="9" height="9" fill="#f25022" />
                    <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
                    <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
                    <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
                  </svg>
                  Sign in with Microsoft
                </button>
              </>
            )}

            <p className="signin-modal-footer">
              {modalTab === 'signin' ? "Don't have an account? " : 'Already have an account? '}
              <button
                type="button"
                className="signin-modal-switch"
                onClick={() => { setModalTab(modalTab === 'signin' ? 'signup' : 'signin'); setModalError('') }}
              >
                {modalTab === 'signin' ? 'Create one' : 'Sign in'}
              </button>
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
