/**
 * Simple localStorage-based authentication for email/password sign-in.
 * Stores user accounts and session in localStorage.
 */

const USERS_KEY = 'cfr_users'
const SESSION_KEY = 'cfr_session'

export type LocalUser = {
  name: string
  email: string
  passwordHash: string
  createdAt: string
}

type StoredSession = {
  email: string
  name: string
}

// Simple hash (not cryptographic — fine for a demo/MVP)
function simpleHash(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash |= 0
  }
  return hash.toString(36)
}

function getUsers(): LocalUser[] {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY) || '[]')
  } catch {
    return []
  }
}

function saveUsers(users: LocalUser[]) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users))
}

export function getSession(): StoredSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function setSession(session: StoredSession | null) {
  if (session) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session))
  } else {
    localStorage.removeItem(SESSION_KEY)
  }
}

export function signUp(name: string, email: string, password: string): { ok: true } | { ok: false; error: string } {
  const trimmedEmail = email.trim().toLowerCase()
  const trimmedName = name.trim()

  if (!trimmedName) return { ok: false, error: 'Name is required.' }
  if (!trimmedEmail || !trimmedEmail.includes('@')) return { ok: false, error: 'Valid email is required.' }
  if (password.length < 6) return { ok: false, error: 'Password must be at least 6 characters.' }

  const users = getUsers()
  if (users.some(u => u.email === trimmedEmail)) {
    return { ok: false, error: 'An account with this email already exists.' }
  }

  users.push({
    name: trimmedName,
    email: trimmedEmail,
    passwordHash: simpleHash(password),
    createdAt: new Date().toISOString(),
  })
  saveUsers(users)
  setSession({ email: trimmedEmail, name: trimmedName })
  return { ok: true }
}

export function signIn(email: string, password: string): { ok: true; name: string } | { ok: false; error: string } {
  const trimmedEmail = email.trim().toLowerCase()
  const users = getUsers()
  const user = users.find(u => u.email === trimmedEmail)

  if (!user) return { ok: false, error: 'No account found with this email.' }
  if (user.passwordHash !== simpleHash(password)) return { ok: false, error: 'Incorrect password.' }

  setSession({ email: user.email, name: user.name })
  return { ok: true, name: user.name }
}

export function signOut() {
  setSession(null)
}

export function isLocallyAuthenticated(): boolean {
  return getSession() !== null
}
