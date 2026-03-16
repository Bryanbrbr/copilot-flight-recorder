/**
 * Server-side authentication client.
 * Calls the API for register/login, stores JWT in localStorage.
 */

const SESSION_KEY = 'cfr_token'
const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3001/api'

export type SessionPayload = {
  userId: string
  tenantId: string
  email: string
  name: string
  role: string
  exp: number
  iat: number
}

// ── JWT helpers ────────────────────────────────────────────

function decodeJwt(token: string): SessionPayload | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')))
    return payload as SessionPayload
  } catch {
    return null
  }
}

function isTokenExpired(payload: SessionPayload): boolean {
  return Date.now() >= payload.exp * 1000
}

// ── Storage ────────────────────────────────────────────────

function getStoredToken(): string | null {
  try {
    return localStorage.getItem(SESSION_KEY)
  } catch {
    return null
  }
}

function storeToken(token: string): void {
  localStorage.setItem(SESSION_KEY, token)
}

function clearToken(): void {
  localStorage.removeItem(SESSION_KEY)
  // Also clear legacy localStorage auth data
  localStorage.removeItem('cfr_users')
  localStorage.removeItem('cfr_session')
}

// ── Public API ─────────────────────────────────────────────

/**
 * Get current session from stored JWT.
 * Returns null if no token, expired, or invalid.
 */
export function getSession(): { email: string; name: string; tenantId: string; userId: string; role: string; tenantName?: string } | null {
  const token = getStoredToken()
  if (!token) return null

  const payload = decodeJwt(token)
  if (!payload) {
    clearToken()
    return null
  }

  if (isTokenExpired(payload)) {
    clearToken()
    return null
  }

  return {
    email: payload.email,
    name: payload.name,
    tenantId: payload.tenantId,
    userId: payload.userId,
    role: payload.role,
  }
}

/**
 * Get the stored JWT token for API calls.
 */
export function getAccessToken(): string | null {
  const token = getStoredToken()
  if (!token) return null

  const payload = decodeJwt(token)
  if (!payload || isTokenExpired(payload)) {
    clearToken()
    return null
  }

  return token
}

/**
 * Sign up — calls the server API, stores the JWT.
 */
export async function signUp(
  name: string,
  email: string,
  password: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    })

    const data = await res.json()

    if (!res.ok) {
      return { ok: false, error: data.error ?? 'Registration failed.' }
    }

    storeToken(data.token)
    return { ok: true }
  } catch {
    return { ok: false, error: 'Network error. Please check your connection.' }
  }
}

/**
 * Sign in — calls the server API, stores the JWT.
 */
export async function signIn(
  email: string,
  password: string,
): Promise<{ ok: true; name: string } | { ok: false; error: string }> {
  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })

    const data = await res.json()

    if (!res.ok) {
      return { ok: false, error: data.error ?? 'Login failed.' }
    }

    storeToken(data.token)
    return { ok: true, name: data.user.name }
  } catch {
    return { ok: false, error: 'Network error. Please check your connection.' }
  }
}

/**
 * Sign out — clear the stored token.
 */
export function signOut() {
  clearToken()
}

/**
 * Check if user is locally authenticated.
 */
export function isLocallyAuthenticated(): boolean {
  return getSession() !== null
}
