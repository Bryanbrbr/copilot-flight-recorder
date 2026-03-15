import { useMsal, useIsAuthenticated } from '@azure/msal-react'
import { InteractionStatus } from '@azure/msal-browser'
import { loginRequest, isAuthConfigured } from './msalConfig'
import { msalInstance } from './AuthProvider'

export type AuthUser = {
  name: string
  email: string
  tenantId: string
  objectId: string
}

export function useAuth() {
  if (!isAuthConfigured) {
    // Dev mode — no auth configured, return mock user
    return {
      isAuthenticated: true,
      isLoading: false,
      user: {
        name: 'Dev User',
        email: 'dev@northwind.com',
        tenantId: 'tenant-northwind',
        objectId: 'dev-user-id',
      } as AuthUser,
      login: () => {},
      logout: () => {},
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
    isLoading: inProgress !== InteractionStatus.None,
    user,
    login,
    logout,
    getAccessToken,
  }
}
