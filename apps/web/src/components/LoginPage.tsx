import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth, signUp, signIn, notifyLocalSessionChange } from '@/auth'
import { isAuthConfigured } from '@/auth/msalConfig'

type AuthTab = 'signin' | 'signup'

export function LoginPage() {
  const navigate = useNavigate()
  const { login, isLoading } = useAuth()
  const [tab, setTab] = useState<AuthTab>('signin')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    const result = await signIn(email, password)
    if (result.ok) {
      notifyLocalSessionChange()
    } else {
      setError(result.error)
      setSubmitting(false)
    }
  }

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    const result = await signUp(name, email, password)
    if (result.ok) {
      notifyLocalSessionChange()
    } else {
      setError(result.error)
      setSubmitting(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-brand">
          <span className="brand-kicker">Copilot Flight Recorder</span>
          <h1>{tab === 'signin' ? 'Sign in to your workspace' : 'Create your account'}</h1>
          <p>
            {tab === 'signin'
              ? 'Access the admin center for Copilot agent operations.'
              : 'Start monitoring your Copilot agents for free.'}
          </p>
        </div>

        {/* Tab switcher */}
        <div className="login-tabs">
          <button
            type="button"
            className={`login-tab ${tab === 'signin' ? 'active' : ''}`}
            onClick={() => { setTab('signin'); setError('') }}
          >
            Sign in
          </button>
          <button
            type="button"
            className={`login-tab ${tab === 'signup' ? 'active' : ''}`}
            onClick={() => { setTab('signup'); setError('') }}
          >
            Create account
          </button>
        </div>

        {/* Email/Password form */}
        <form onSubmit={tab === 'signin' ? handleEmailSignIn : handleEmailSignUp} className="login-form">
          {tab === 'signup' && (
            <div className="login-field">
              <label htmlFor="login-name">Full name</label>
              <input
                id="login-name"
                type="text"
                placeholder="John Doe"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                autoComplete="name"
              />
            </div>
          )}
          <div className="login-field">
            <label htmlFor="login-email">Email address</label>
            <input
              id="login-email"
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          <div className="login-field">
            <label htmlFor="login-password">Password</label>
            <input
              id="login-password"
              type="password"
              placeholder={tab === 'signup' ? 'At least 8 characters' : 'Your password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete={tab === 'signin' ? 'current-password' : 'new-password'}
            />
          </div>

          {error && <p className="login-error">{error}</p>}

          <button type="submit" className="login-button email-login" disabled={submitting}>
            {submitting
              ? 'Please wait...'
              : tab === 'signin'
                ? 'Sign in'
                : 'Create account'}
          </button>
        </form>

        {/* Divider */}
        {isAuthConfigured && (
          <>
            <div className="login-divider">
              <span>or</span>
            </div>

            {/* Microsoft sign-in */}
            <button
              type="button"
              className="login-button microsoft-login"
              onClick={login}
              disabled={isLoading}
            >
              <svg width="20" height="20" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="1" y="1" width="9" height="9" fill="#f25022" />
                <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
                <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
                <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
              </svg>
              {isLoading ? 'Signing in...' : 'Sign in with Microsoft'}
            </button>
          </>
        )}

        <p className="login-footer">
          {tab === 'signin'
            ? "Don't have an account? "
            : 'Already have an account? '}
          <button
            type="button"
            className="login-switch-link"
            onClick={() => { setTab(tab === 'signin' ? 'signup' : 'signin'); setError('') }}
          >
            {tab === 'signin' ? 'Create one' : 'Sign in'}
          </button>
        </p>

        <div className="login-divider">
          <span>or</span>
        </div>

        <button
          type="button"
          className="login-button"
          onClick={() => { window.location.href = '/app?demo=1' }}
        >
          Explore the demo with sample data
        </button>
      </div>
    </div>
  )
}
