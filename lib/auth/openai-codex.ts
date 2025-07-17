import { z } from 'zod'
import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import open from 'open'
import fs from 'fs/promises'
import path from 'path'
import crypto from 'crypto'
import { Server } from 'http'

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
    console.log('Starting Sign in with ChatGPT flow...')
    console.log('This will share your name, email, and profile picture with Codex CLI.')

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
    console.log(`✓ Authentication successful! Logged in as ${userProfile.email}`)

    if (apiKeyData.credits_granted) {
      console.log(`✓ Credits granted: ${apiKeyData.credits_granted}`)
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

      console.log(`Listening on http://${this.localServerHost}:${this.localServerPort}`)

      // Build and open authorization URL
      const authUrl = this.buildAuthorizationUrl(state, this.generatePKCE().codeChallenge)
      console.log('Opening browser for Sign in with ChatGPT...')
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
      state: state,
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
        code: code,
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
      } catch {
        console.warn('Failed to decode ID token, fetching from API')
      }
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
    if (claims['https://openai.com/subscription'] === 'pro') return 'pro'
    if (claims['https://openai.com/subscription'] === 'plus') return 'plus'
    if (claims['https://openai.com/organization']) return 'team'
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
    if (profile.subscription === 'plus') creditsGranted = 5
    if (profile.subscription === 'pro') creditsGranted = 50

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
    if (!config || !config.api_key) {
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
    if (!config || !config.refresh_token) {
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

// Export all types and schemas
export {
  AuthConfig,
  AuthToken,
  ApiKeyResponse,
  UserProfile,
  AuthConfigSchema,
  AuthTokenSchema,
  ApiKeyResponseSchema,
  UserProfileSchema,
}
