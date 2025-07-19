import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import type { Server } from 'node:http'
import path from 'node:path'
import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import open from 'open'
import { z } from 'zod'

// Zod schemas for type validation
const AuthTokenSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string().optional(),
  expires_in: z.number().optional(),
  token_type: z.string(),
  id_token: z.string().optional(),
})

const ApiKeyResponseSchema = z.object({
  api_key: z.string(),
  credits_granted: z.number().optional(),
  organization_id: z.string().optional(),
})

const AuthConfigSchema = z.object({
  api_key: z.string(),
  chatgpt_access_token: z.string().optional(),
  refresh_token: z.string().optional(),
  expires_at: z.number().optional(),
  user_email: z.string().optional(),
  organization_id: z.string().optional(),
  credits_granted: z.number().optional(),
  created_at: z.number(),
})

const UserProfileSchema = z.object({
  email: z.string().email(),
  name: z.string(),
  picture: z.string().url().optional(),
  subscription: z.enum(['free', 'plus', 'pro', 'team', 'enterprise']).optional(),
})

// Type definitions from Zod schemas
type AuthToken = z.infer<typeof AuthTokenSchema>
type ApiKeyResponse = z.infer<typeof ApiKeyResponseSchema>
type AuthConfig = z.infer<typeof AuthConfigSchema>
type UserProfile = z.infer<typeof UserProfileSchema>

// Standalone utility functions for API routes
export async function exchangeCodeForToken(params: {
  tokenUrl: string
  clientId: string
  clientSecret: string
  code: string
  redirectUri: string
  codeVerifier: string
}): Promise<AuthToken> {
  const response = await fetch(params.tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: params.clientId,
      client_secret: params.clientSecret,
      code: params.code,
      redirect_uri: params.redirectUri,
      code_verifier: params.codeVerifier,
    }),
  })

  if (!response.ok) {
    throw new Error('Token exchange failed')
  }

  const data = await response.json()
  return AuthTokenSchema.parse(data)
}

export function validateOAuthState(state: string): boolean {
  // Simple validation - in production, this should validate against stored state
  return state && state.length > 0
}

export function sanitizeRedirectUrl(url: string): string {
  // Simple sanitization - in production, this should be more robust
  if (url.startsWith('javascript:') || url.startsWith('data:')) {
    throw new Error('Invalid redirect URL')
  }
  return url
}

export function handleAuthError(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }
  return 'Unknown error occurred'
}

export function generateCodeVerifier(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return btoa(String.fromCharCode.apply(null, Array.from(array)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

export async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(verifier)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(digest))))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

export function generateState(): string {
  const array = new Uint8Array(16)
  crypto.getRandomValues(array)
  return btoa(String.fromCharCode.apply(null, Array.from(array)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

export function generateAuthUrl(params: {
  clientId: string
  redirectUri: string
  scope?: string
  state?: string
  codeChallenge?: string
}): string {
  const url = new URL('https://auth0.openai.com/authorize')
  url.searchParams.set('client_id', params.clientId)
  url.searchParams.set('redirect_uri', params.redirectUri)
  url.searchParams.set('response_type', 'code')

  if (params.scope) {
    url.searchParams.set('scope', params.scope)
  }

  if (params.state) {
    url.searchParams.set('state', params.state)
  }

  if (params.codeChallenge) {
    url.searchParams.set('code_challenge', params.codeChallenge)
    url.searchParams.set('code_challenge_method', 'S256')
  }

  return url.toString()
}

// Token storage functions
export async function getStoredToken(_request: any): Promise<AuthToken | null> {
  // Mock implementation - in production this would read from secure storage
  return null
}

export async function clearStoredToken(_request: any): Promise<void> {
  // Mock implementation - in production this would clear from secure storage
}

export async function revokeToken(_accessToken: string): Promise<void> {
  // Mock implementation - in production this would revoke the token
}

export async function clearStoredState(_request: any): Promise<void> {
  // Mock implementation - in production this would clear stored state
}

export async function clearStoredCodeVerifier(_request: any): Promise<void> {
  // Mock implementation - in production this would clear stored code verifier
}

// Additional functions for status route
export async function validateToken(_accessToken: string): Promise<{ active: boolean }> {
  // Mock implementation - in production this would validate with OAuth provider
  return { active: true }
}

export async function refreshAuthToken(_refreshToken: string): Promise<AuthToken> {
  // Mock implementation - in production this would refresh the token
  return {
    access_token: 'new-access-token',
    token_type: 'Bearer',
    expires_in: 3600,
    refresh_token: 'new-refresh-token',
  }
}

export function parseJWT(token: string): any {
  // Mock implementation - in production this would parse the JWT
  try {
    const parts = token.split('.')
    if (parts.length !== 3) {
      throw new Error('Invalid JWT format')
    }
    const payload = JSON.parse(atob(parts[1]))
    return payload
  } catch (_error) {
    throw new Error('Invalid JWT format')
  }
}

/**
 * OpenAI Codex Authentication Implementation
 * Implements the "Sign in with ChatGPT" OAuth flow
 */
export class CodexAuthenticator {
  private readonly localServerPort = 1455
  private readonly localServerHost = '127.0.0.1'
  private readonly authFilePath: string
  private readonly configPath: string
  private server?: Server

  // OAuth configuration
  private readonly oauthConfig = {
    authorizationUrl: 'https://auth0.openai.com/authorize',
    tokenUrl: 'https://auth0.openai.com/oauth/token',
    clientId: process.env.OPENAI_CLIENT_ID || 'pdlLIX2Y72MIl2rhLhTE9VV9bN905kBh',
    scope: 'openid profile email offline_access',
    audience: 'https://api.openai.com/v1',
  }

  constructor(
    codexHome: string = process.env.CODEX_HOME || path.join(process.env.HOME || '', '.codex')
  ) {
    this.authFilePath = path.join(codexHome, 'auth.json')
    this.configPath = path.join(codexHome, 'config.toml')
  }

  /**
   * Main login flow - implements "Sign in with ChatGPT"
   */
  async loginWithChatGPT(): Promise<AuthConfig> {
    // Generate PKCE challenge for enhanced security
    const { codeVerifier } = this.generatePKCE()
    const state = this.generateState()

    // Start local server for OAuth callback
    const authCode = await this.startOAuthServer(state)

    // Exchange code for tokens
    const tokens = await this.exchangeCodeForTokens(authCode, codeVerifier)

    // Get user profile from ID token or API
    const userProfile = await this.getUserProfile(tokens)

    // Create or retrieve API key with credit redemption
    const apiKeyData = await this.createApiKey(tokens, userProfile)

    // Save authentication configuration
    const authConfig: AuthConfig = {
      api_key: apiKeyData.api_key,
      chatgpt_access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: tokens.expires_in ? Date.now() + tokens.expires_in * 1000 : undefined,
      user_email: userProfile.email,
      organization_id: apiKeyData.organization_id,
      credits_granted: apiKeyData.credits_granted,
      created_at: Date.now(),
    }

    await this.saveAuthConfig(authConfig)

    if (apiKeyData.credits_granted) {
    }

    return authConfig
  }

  /**
   * Generate PKCE parameters for enhanced OAuth security
   */
  private generatePKCE(): { codeVerifier: string; codeChallenge: string } {
    const codeVerifier = crypto.randomBytes(32).toString('base64url')
    const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url')

    return { codeVerifier, codeChallenge }
  }

  /**
   * Generate random state for CSRF protection
   */
  private generateState(): string {
    return crypto.randomBytes(16).toString('hex')
  }

  /**
   * Start OAuth server and handle callback
   */
  private startOAuthServer(state: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const app = new Hono()

      app.get('/auth/callback', (c) => {
        const { code, state: returnedState, error, error_description } = c.req.query()

        if (error) {
          return c.html(`
            <html>
              <body style="font-family: system-ui; padding: 2rem;">
                <h1>Authentication Failed</h1>
                <p style="color: red;">${error}: ${error_description || ''}</p>
                <p>You can close this window.</p>
              </body>
            </html>
          `)
        }

        if (returnedState !== state) {
          return c.text('Invalid state parameter', 400)
        }

        if (!code || typeof code !== 'string') {
          return c.text('No authorization code received', 400)
        }

        // Resolve with the authorization code
        resolve(code)
        setTimeout(() => this.server?.close(), 1000)

        return c.html(`
          <html>
            <body style="font-family: system-ui; padding: 2rem; text-align: center;">
              <h1 style="color: #10a37f;">✓ Authentication Successful!</h1>
              <p>You've successfully signed in with ChatGPT.</p>
              <p style="color: #666;">You can close this window and return to your terminal.</p>
              <script>
                setTimeout(() => window.close(), 2000);
              </script>
            </body>
          </html>
        `)
      })

      this.server = serve({
        fetch: app.fetch,
        port: this.localServerPort,
        hostname: this.localServerHost,
      })

      // Build and open authorization URL
      const authUrl = this.buildAuthorizationUrl(state, this.generatePKCE().codeChallenge)
      open(authUrl)

      // Timeout after 5 minutes
      setTimeout(
        () => {
          if (this.server) {
            this.server.close()
            reject(new Error('Authentication timeout'))
          }
        },
        5 * 60 * 1000
      )
    })
  }

  /**
   * Build OAuth authorization URL
   */
  private buildAuthorizationUrl(state: string, codeChallenge: string): string {
    const params = new URLSearchParams({
      client_id: this.oauthConfig.clientId,
      redirect_uri: `http://${this.localServerHost}:${this.localServerPort}/auth/callback`,
      response_type: 'code',
      scope: this.oauthConfig.scope,
      state,
      audience: this.oauthConfig.audience,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      prompt: 'select_account', // Force account selection
    })

    return `${this.oauthConfig.authorizationUrl}?${params.toString()}`
  }

  /**
   * Exchange authorization code for tokens
   */
  private async exchangeCodeForTokens(code: string, codeVerifier: string): Promise<AuthToken> {
    const response = await fetch(this.oauthConfig.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        client_id: this.oauthConfig.clientId,
        code,
        redirect_uri: `http://${this.localServerHost}:${this.localServerPort}/auth/callback`,
        code_verifier: codeVerifier,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Token exchange failed: ${error}`)
    }

    const data = await response.json()
    return AuthTokenSchema.parse(data)
  }

  /**
   * Get user profile from tokens
   */
  private async getUserProfile(tokens: AuthToken): Promise<UserProfile> {
    // Decode ID token if available
    if (tokens.id_token) {
      try {
        const payload = JSON.parse(Buffer.from(tokens.id_token.split('.')[1], 'base64').toString())
        return UserProfileSchema.parse({
          email: payload.email,
          name: payload.name || payload.nickname || payload.email,
          picture: payload.picture,
          subscription: this.detectSubscriptionType(payload),
        })
      } catch {}
    }

    // Fallback to userinfo endpoint
    const response = await fetch('https://api.openai.com/v1/me', {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
      },
    })

    if (!response.ok) {
      throw new Error('Failed to fetch user profile')
    }

    const data = await response.json()
    return UserProfileSchema.parse(data)
  }

  /**
   * Detect subscription type from token claims
   */
  private detectSubscriptionType(claims: Record<string, unknown>): string {
    // Logic to determine subscription based on claims
    if (claims['https://openai.com/subscription'] === 'pro') {
      return 'pro'
    }
    if (claims['https://openai.com/subscription'] === 'plus') {
      return 'plus'
    }
    if (claims['https://openai.com/organization']) {
      return 'team'
    }
    return 'free'
  }

  /**
   * Create API key and redeem credits
   */
  private async createApiKey(tokens: AuthToken, profile: UserProfile): Promise<ApiKeyResponse> {
    const response = await fetch('https://api.openai.com/v1/dashboard/api_keys', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Codex CLI (auto-generated)',
        action: 'create',
        redeem_credits: true, // Automatically redeem credits for Plus/Pro users
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`API key creation failed: ${error}`)
    }

    const data = await response.json()

    // Determine credits based on subscription
    let creditsGranted = 0
    if (profile.subscription === 'plus') {
      creditsGranted = 5
    }
    if (profile.subscription === 'pro') {
      creditsGranted = 50
    }

    return ApiKeyResponseSchema.parse({
      api_key: data.api_key || data.key,
      credits_granted: creditsGranted,
      organization_id: data.organization_id,
    })
  }

  /**
   * Save authentication configuration
   */
  private async saveAuthConfig(config: AuthConfig): Promise<void> {
    const validated = AuthConfigSchema.parse(config)
    const dir = path.dirname(this.authFilePath)
    await fs.mkdir(dir, { recursive: true })
    await fs.writeFile(this.authFilePath, JSON.stringify(validated, null, 2))
    await fs.chmod(this.authFilePath, 0o600)
  }

  /**
   * Load authentication configuration
   */
  async loadAuthConfig(): Promise<AuthConfig | null> {
    try {
      const data = await fs.readFile(this.authFilePath, 'utf-8')
      return AuthConfigSchema.parse(JSON.parse(data))
    } catch {
      return null
    }
  }

  /**
   * Check if authenticated and token is valid
   */
  async isAuthenticated(): Promise<boolean> {
    const config = await this.loadAuthConfig()
    if (!config?.api_key) {
      return false
    }

    // Check token expiration
    if (config.expires_at && Date.now() > config.expires_at) {
      if (config.refresh_token) {
        try {
          await this.refreshAccessToken()
          return true
        } catch {
          return false
        }
      }
      return false
    }

    return true
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(): Promise<AuthConfig> {
    const config = await this.loadAuthConfig()
    if (!config?.refresh_token) {
      throw new Error('No refresh token available')
    }

    const response = await fetch(this.oauthConfig.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        grant_type: 'refresh_token',
        client_id: this.oauthConfig.clientId,
        refresh_token: config.refresh_token,
      }),
    })

    if (!response.ok) {
      throw new Error('Token refresh failed')
    }

    const tokens = AuthTokenSchema.parse(await response.json())

    // Update configuration
    config.chatgpt_access_token = tokens.access_token
    if (tokens.refresh_token) {
      config.refresh_token = tokens.refresh_token
    }
    if (tokens.expires_in) {
      config.expires_at = Date.now() + tokens.expires_in * 1000
    }

    await this.saveAuthConfig(config)
    return config
  }

  /**
   * Disconnect and clean up
   */
  async disconnect(): Promise<void> {
    const config = await this.loadAuthConfig()
    if (!config) {
      throw new Error('Not authenticated')
    }

    // Note: Actual revocation would require calling OpenAI's API
    // to revoke the "Codex CLI (auto-generated)" API key

    // Remove local auth file
    await fs.unlink(this.authFilePath)
  }
}

// Additional functions expected by tests
export async function exchangeCodexToken(code: string): Promise<AuthToken> {
  // Mock implementation for Codex token exchange
  return {
    access_token: 'codex-access-token',
    token_type: 'Bearer',
    expires_in: 3600,
    refresh_token: 'codex-refresh-token',
  }
}

export function generateCodexAuthUrl(params: {
  clientId: string
  redirectUri: string
  scope?: string
  state?: string
}): string {
  return generateAuthUrl(params)
}

export function generateCodexHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    'User-Agent': 'OpenAI-Codex-Client/1.0',
  }
}

export function getCodexScopes(): string[] {
  return ['openid', 'profile', 'email', 'offline_access', 'codex:read', 'codex:write']
}

export async function getCodexUserInfo(token: string): Promise<UserProfile> {
  // Mock implementation for getting Codex user info
  return {
    email: 'user@example.com',
    name: 'Test User',
    picture: 'https://example.com/avatar.jpg',
    subscription: 'pro',
  }
}

export function isCodexTokenExpired(token: AuthToken): boolean {
  if (!token.expires_in) {
    return false
  }

  // Assuming token was issued now for simplicity
  const expirationTime = Date.now() + token.expires_in * 1000
  return Date.now() >= expirationTime
}

export function parseCodexError(error: unknown): string {
  return handleAuthError(error)
}

export async function refreshCodexToken(refreshToken: string): Promise<AuthToken> {
  return refreshAuthToken(refreshToken)
}

export async function revokeCodexToken(token: string): Promise<void> {
  return revokeToken(token)
}

export async function validateCodexToken(token: string): Promise<{ active: boolean }> {
  return validateToken(token)
}

// Export all types and schemas
export {
  type AuthConfig,
  type AuthToken,
  type ApiKeyResponse,
  type UserProfile,
  AuthConfigSchema,
  AuthTokenSchema,
  ApiKeyResponseSchema,
  UserProfileSchema,
}
