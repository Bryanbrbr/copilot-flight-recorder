import { useAuth } from '@/auth'

export function LoginPage() {
  const { login, isLoading } = useAuth()

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-brand">
          <span className="brand-kicker">Copilot Flight Recorder</span>
          <h1>Sign in to your workspace</h1>
          <p>
            Use your Microsoft 365 account to access the admin center for Copilot agent operations.
          </p>
        </div>

        <button
          type="button"
          className="login-button"
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

        <p className="login-footer">
          Protected by Microsoft Entra ID. Your tenant data stays isolated and governed.
        </p>
      </div>
    </div>
  )
}
