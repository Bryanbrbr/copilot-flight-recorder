import type { Configuration } from '@azure/msal-browser'
import { LogLevel } from '@azure/msal-browser'

// These values come from your Azure Entra ID app registration
// 1. Go to https://entra.microsoft.com → App registrations → New registration
// 2. Set redirect URI to http://localhost:5173 (SPA)
// 3. Copy Application (client) ID → VITE_MSAL_CLIENT_ID
// 4. Copy Directory (tenant) ID → VITE_MSAL_TENANT_ID (or use "common" for multi-tenant)

const clientId = import.meta.env.VITE_MSAL_CLIENT_ID ?? ''
const tenantId = import.meta.env.VITE_MSAL_TENANT_ID ?? 'common'
const redirectUri = import.meta.env.VITE_MSAL_REDIRECT_URI ?? 'http://localhost:5173'

export const msalConfig: Configuration = {
  auth: {
    clientId,
    authority: `https://login.microsoftonline.com/${tenantId}`,
    redirectUri,
    postLogoutRedirectUri: redirectUri,
    navigateToLoginRequestUrl: true,
  },
  cache: {
    cacheLocation: 'localStorage',
    storeAuthStateInCookie: false,
  },
  system: {
    loggerOptions: {
      logLevel: LogLevel.Warning,
      loggerCallback: (level, message) => {
        if (level === LogLevel.Error) console.error('[msal]', message)
      },
    },
  },
}

// Scopes for Microsoft Graph (user profile)
export const loginRequest = {
  scopes: ['User.Read', 'openid', 'profile', 'email'],
}

// Scopes for our own API
export const apiRequest = {
  scopes: [`api://${clientId}/access_as_user`],
}

export const isAuthConfigured = Boolean(clientId)
