import { useMsal, useIsAuthenticated } from '@azure/msal-react'
import { InteractionStatus } from '@azure/msal-browser'
import { loginRequest, isAuthConfigured } from './msalConfig'
import { msalInstance } from './AuthProvider'
import { getSession, getAccessToken as getLocalToken, signOut as localSignOut } from './localAuth'
import { useSyncExternalStore } from 'react'

export type AuthUser = {
  name: string
  email: string
  tenantId: string
  objectId: string
}

// Simple external store to let useAuth re-render when local session changes
let localSessionVersion = 0
const localSessionListeners = new Set<() => void>()
function subscribeLocalSession(cb: () => void) {
  localSessionListeners.add(cb)
  return () => { localSessionListeners.delete(cb) }
}
function getLocalSessionSnapshot() { return localSessionVersion }

export function notifyLocalSessionChange() {
  localSessionVersion++
  localSessionListeners.forEach(cb => cb())
}

export function useAuth() {
  // Subscribe to local session changes so component re-renders
  useSyncExternalStore(subscribeLocalSession, getLocalSessionSnapshot)

  const localSession = getSession()

  // If user is logged in via email/password (server JWT), use that
  if (localSession) {
    return {
      isAuthenticated: true,
      isDemoMode: false,
      isLocalAuth: true,
      isLoading: false,
      user: {
        name: localSession.name,
        email: localSession.email,
        tenantId: localSession.tenantId,
        objectId: localSession.userId,
        role: localSession.role,
      } as AuthUser,
      login: () => {},
      logout: () => {
        localSignOut()
        window.location.href = '/'
      },
      getAccessToken: async () => getLocalToken(),
    }
  }

  if (!isAuthConfigured) {
    // No MSAL configured and no local session — allow demo mode
    return {
      isAuthenticated: false,
      isDemoMode: true,
      isLocalAuth: false,
      isLoading: false,
      user: null,
      login: () => { window.location.href = '/login' },
      logout: () => { window.location.href = '/' },
      getAccessToken: async () => null as string | null,
    }
  }

  const { accounts, inProgress } = useMsal()
  const isAuthenticated = useIsAuthenticated()
  const account = accounts[0]

  const user: AuthUser | null = account
    ? {
        name: account.name ?? 'Unknown',
        email: account.username ?? '',
        tenantId: account.tenantId ?? '',
        objectId: account.localAccountId ?? '',
      }
    : null

  const login = () => {
    msalInstance?.loginRedirect(loginRequest)
  }

  const logout = () => {
    msalInstance?.logoutRedirect()
  }

  const getAccessToken = async (): Promise<string | null> => {
    if (!msalInstance || !account) return null
    try {
      const response = await msalInstance.acquireTokenSilent({
        ...loginRequest,
        account,
      })
      return response.accessToken
    } catch {
      // Silent token acquisition failed, force login
      msalInstance.acquireTokenRedirect(loginRequest)
      return null
    }
  }

  return {
    isAuthenticated,
    isDemoMode: false,
    isLocalAuth: false,
    isLoading: inProgress !== InteractionStatus.None,
    user,
    login,
    logout,
    getAccessToken,
  }
}
