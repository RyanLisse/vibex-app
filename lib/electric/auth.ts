import { ObservabilityService } from '../observability'

// Authentication service for ElectricSQL
export class ElectricAuthService {
  private static instance: ElectricAuthService | null = null
  private observability = ObservabilityService.getInstance()
  private authToken: string | null = null
  private refreshToken: string | null = null
  private tokenExpiry: Date | null = null
  private refreshInterval: NodeJS.Timeout | null = null

  private constructor() {
    // Private constructor for singleton pattern
  }

  static getInstance(): ElectricAuthService {
    if (!ElectricAuthService.instance) {
      ElectricAuthService.instance = new ElectricAuthService()
    }
    return ElectricAuthService.instance
  }

  /**
   * Initialize authentication with user credentials
   */
  async initialize(options?: {
    userId?: string
    apiKey?: string
    customToken?: string
  }): Promise<void> {
    return this.observability.trackOperation('electric-auth.initialize', async () => {
      try {
        if (options?.customToken) {
          // Use provided custom token
          this.authToken = options.customToken
          this.tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
        } else if (options?.userId && options?.apiKey) {
          // Generate JWT token for user
          await this.generateUserToken(options.userId, options.apiKey)
        } else {
          // Use environment variables
          const envToken = process.env.ELECTRIC_AUTH_TOKEN
          const envUserId = process.env.ELECTRIC_USER_ID
          const envApiKey = process.env.ELECTRIC_API_KEY

          if (envToken) {
            this.authToken = envToken
            this.tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000)
          } else if (envUserId && envApiKey) {
            await this.generateUserToken(envUserId, envApiKey)
          } else {
            // Development mode - use anonymous token
            await this.generateAnonymousToken()
          }
        }

        // Set up token refresh if we have a refresh token
        if (this.refreshToken) {
          this.setupTokenRefresh()
        }

        console.log('ElectricSQL authentication initialized')
      } catch (error) {
        console.error('Failed to initialize ElectricSQL authentication:', error)
        throw error
      }
    })
  }

  /**
   * Generate JWT token for authenticated user
   */
  private async generateUserToken(userId: string, apiKey: string): Promise<void> {
    return this.observability.trackOperation('electric-auth.generate-user-token', async () => {
      const authEndpoint = process.env.ELECTRIC_AUTH_ENDPOINT || '/api/auth/electric'

      try {
        const response = await fetch(authEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            userId,
            permissions: this.getUserPermissions(userId),
          }),
        })

        if (!response.ok) {
          throw new Error(`Authentication failed: ${response.statusText}`)
        }

        const authData = await response.json()
        this.authToken = authData.token
        this.refreshToken = authData.refreshToken
        this.tokenExpiry = new Date(authData.expiresAt)

        this.observability.recordEvent('electric-auth.token-generated', {
          userId,
          expiresAt: this.tokenExpiry,
        })
      } catch (error) {
        this.observability.recordError('electric-auth.generate-user-token', error as Error)
        throw error
      }
    })
  }

  /**
   * Generate anonymous token for development/testing
   */
  private async generateAnonymousToken(): Promise<void> {
    return this.observability.trackOperation('electric-auth.generate-anonymous-token', async () => {
      // In development, create a simple JWT-like token
      const payload = {
        sub: 'anonymous',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 24 * 60 * 60, // 24 hours
        permissions: ['read', 'write'], // Full permissions for development
      }

      // Simple base64 encoding (not secure, only for development)
      this.authToken = btoa(JSON.stringify(payload))
      this.tokenExpiry = new Date(payload.exp * 1000)

      console.warn('Using anonymous token for ElectricSQL - not suitable for production')
    })
  }

  /**
   * Get user permissions based on user ID
   */
  private getUserPermissions(userId: string): string[] {
    // Default permissions for authenticated users
    const basePermissions = ['read', 'write']

    // Add admin permissions for specific users (in production, this would come from a database)
    const adminUsers = (process.env.ELECTRIC_ADMIN_USERS || '').split(',').filter(Boolean)
    if (adminUsers.includes(userId)) {
      basePermissions.push('admin', 'delete')
    }

    return basePermissions
  }

  /**
   * Set up automatic token refresh
   */
  private setupTokenRefresh(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval)
    }

    // Refresh token 5 minutes before expiry
    const refreshTime = this.tokenExpiry
      ? this.tokenExpiry.getTime() - Date.now() - 5 * 60 * 1000
      : 30 * 60 * 1000 // Default to 30 minutes

    if (refreshTime > 0) {
      this.refreshInterval = setTimeout(async () => {
        try {
          await this.refreshAuthToken()
        } catch (error) {
          console.error('Failed to refresh auth token:', error)
          this.observability.recordError('electric-auth.refresh-token', error as Error)
        }
      }, refreshTime)
    }
  }

  /**
   * Refresh authentication token
   */
  private async refreshAuthToken(): Promise<void> {
    if (!this.refreshToken) {
      throw new Error('No refresh token available')
    }

    return this.observability.trackOperation('electric-auth.refresh-token', async () => {
      const authEndpoint = process.env.ELECTRIC_AUTH_ENDPOINT || '/api/auth/electric'

      try {
        const response = await fetch(`${authEndpoint}/refresh`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.refreshToken}`,
          },
        })

        if (!response.ok) {
          throw new Error(`Token refresh failed: ${response.statusText}`)
        }

        const authData = await response.json()
        this.authToken = authData.token
        this.refreshToken = authData.refreshToken
        this.tokenExpiry = new Date(authData.expiresAt)

        // Set up next refresh
        this.setupTokenRefresh()

        this.observability.recordEvent('electric-auth.token-refreshed', {
          expiresAt: this.tokenExpiry,
        })

        console.log('ElectricSQL auth token refreshed')
      } catch (error) {
        this.observability.recordError('electric-auth.refresh-token', error as Error)
        throw error
      }
    })
  }

  /**
   * Get current authentication token
   */
  getAuthToken(): string | null {
    if (!this.authToken) {
      console.warn('No ElectricSQL auth token available')
      return null
    }

    // Check if token is expired
    if (this.tokenExpiry && this.tokenExpiry < new Date()) {
      console.warn('ElectricSQL auth token has expired')
      return null
    }

    return this.authToken
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.getAuthToken() !== null
  }

  /**
   * Get token expiry information
   */
  getTokenInfo(): {
    hasToken: boolean
    isExpired: boolean
    expiresAt: Date | null
    timeUntilExpiry: number | null
  } {
    const hasToken = this.authToken !== null
    const isExpired = this.tokenExpiry ? this.tokenExpiry < new Date() : false
    const timeUntilExpiry = this.tokenExpiry ? this.tokenExpiry.getTime() - Date.now() : null

    return {
      hasToken,
      isExpired,
      expiresAt: this.tokenExpiry,
      timeUntilExpiry,
    }
  }

  /**
   * Validate token permissions for specific operations
   */
  hasPermission(operation: 'read' | 'write' | 'delete' | 'admin'): boolean {
    if (!this.authToken) {
      return false
    }

    try {
      // Decode token to check permissions (simplified for development)
      const payload = JSON.parse(atob(this.authToken))
      const permissions = payload.permissions || []

      return permissions.includes(operation) || permissions.includes('admin')
    } catch (error) {
      console.error('Failed to validate token permissions:', error)
      return false
    }
  }

  /**
   * Get authorization headers for API requests
   */
  getAuthHeaders(): Record<string, string> {
    const token = this.getAuthToken()
    if (!token) {
      return {}
    }

    return {
      Authorization: `Bearer ${token}`,
    }
  }

  /**
   * Logout and clear authentication
   */
  async logout(): Promise<void> {
    return this.observability.trackOperation('electric-auth.logout', async () => {
      // Clear refresh interval
      if (this.refreshInterval) {
        clearInterval(this.refreshInterval)
        this.refreshInterval = null
      }

      // Clear tokens
      this.authToken = null
      this.refreshToken = null
      this.tokenExpiry = null

      this.observability.recordEvent('electric-auth.logout', {
        timestamp: new Date(),
      })

      console.log('ElectricSQL authentication cleared')
    })
  }

  /**
   * Reset service instance (for testing)
   */
  static reset(): void {
    if (ElectricAuthService.instance) {
      ElectricAuthService.instance.logout().catch(console.error)
      ElectricAuthService.instance = null
    }
  }
}

// Export singleton instance
export const electricAuthService = ElectricAuthService.getInstance()
