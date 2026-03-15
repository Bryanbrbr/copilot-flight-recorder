import type { Configuration } from '@azure/msal-browser'
import { LogLevel } from '@azure/msal-browser'

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

export const loginRequest = {
  scopes: ['User.Read', 'openid', 'profile', 'email'],
}

export const apiRequest = {
  scopes: [`api://${clientId}/access_as_user`],
}

export const isAuthConfigured = Boolean(clientId)
