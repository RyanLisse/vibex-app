import { useAuth } from './use-auth'

interface AuthStatus {
  authenticated: boolean
  type?: 'oauth' | 'api'
  expires?: number
  loading: boolean
  error?: string
}

export function useAnthropicAuth() {
  return useAuth<AuthStatus>({
    statusEndpoint: '/api/auth/anthropic/status',
    logoutEndpoint: '/api/auth/anthropic/logout',

    loginHandler: (mode: 'max' | 'console' = 'max') => {
      window.location.href = `/api/auth/anthropic/authorize?mode=${mode}`
    },

    transformResponse: (data) => ({
      authenticated: data.authenticated,
      type: data.type,
      expires: data.expires,
    }),
  })
}
