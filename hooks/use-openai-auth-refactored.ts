import { useAuth } from './use-auth'

interface OpenAIAuthStatus {
  authenticated: boolean
  user?: {
    email?: string
    organization_id?: string
    credits_granted?: number
    created_at?: number
  }
  expires_at?: number
  hasRefreshToken?: boolean
  loading: boolean
  error?: string
}

export function useOpenAIAuth() {
  return useAuth<OpenAIAuthStatus>({
    statusEndpoint: '/api/auth/openai/status',
    loginEndpoint: '/api/auth/openai/login',
    logoutEndpoint: '/api/auth/openai/logout',
    refreshEndpoint: '/api/auth/openai/refresh',

    transformResponse: (data) => ({
      authenticated: data.authenticated,
      user: data.user,
      expires_at: data.expires_at,
      hasRefreshToken: data.hasRefreshToken,
    }),

    autoRefresh: {
      enabled: true,
      refreshTimeBeforeExpiry: 60_000, // 1 minute
      getExpiryTime: (status) => status.expires_at,
      hasRefreshToken: (status) => !!status.hasRefreshToken,
    },
  })
}
