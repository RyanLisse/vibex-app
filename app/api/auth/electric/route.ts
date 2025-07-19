import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { ObservabilityService } from '../../../../lib/observability'

// Validation schemas
const AuthRequestSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  permissions: z.array(z.string()).optional().default(['read', 'write']),
})

const RefreshRequestSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
})

// In-memory token storage (in production, use Redis or database)
const tokenStore = new Map<string, {
  userId: string
  permissions: string[]
  expiresAt: Date
  refreshToken: string
}>()

const refreshTokenStore = new Map<string, {
  userId: string
  permissions: string[]
  expiresAt: Date
}>()

const observability = ObservabilityService.getInstance()

/**
 * Generate JWT-like token for ElectricSQL authentication
 */
function generateToken(userId: string, permissions: string[]): {
  token: string
  refreshToken: string
  expiresAt: Date
} {
  const now = new Date()
  const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000) // 24 hours
  const refreshExpiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) // 7 days

  // Generate tokens (in production, use proper JWT library)
  const tokenId = `token_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  const refreshTokenId = `refresh_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  // Store token data
  tokenStore.set(tokenId, {
    userId,
    permissions,
    expiresAt,
    refreshToken: refreshTokenId,
  })

  refreshTokenStore.set(refreshTokenId, {
    userId,
    permissions,
    expiresAt: refreshExpiresAt,
  })

  // Create token payload
  const payload = {
    sub: userId,
    iat: Math.floor(now.getTime() / 1000),
    exp: Math.floor(expiresAt.getTime() / 1000),
    permissions,
    tokenId,
  }

  // Simple base64 encoding (in production, use proper JWT signing)
  const token = btoa(JSON.stringify(payload))

  return {
    token,
    refreshToken: refreshTokenId,
    expiresAt,
  }
}

/**
 * Validate API key (in production, check against database)
 */
function validateApiKey(apiKey: string): boolean {
  const validApiKeys = (process.env.ELECTRIC_API_KEYS || '').split(',').filter(Boolean)
  
  // In development, allow any non-empty API key
  if (process.env.NODE_ENV === 'development' && apiKey) {
    return true
  }

  return validApiKeys.includes(apiKey)
}

/**
 * POST /api/auth/electric - Generate authentication token
 */
export async function POST(request: NextRequest) {
  return observability.trackOperation('api.auth.electric.generate', async () => {
    try {
      // Validate API key
      const authHeader = request.headers.get('authorization')
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return NextResponse.json(
          { error: 'Missing or invalid authorization header' },
          { status: 401 }
        )
      }

      const apiKey = authHeader.substring(7)
      if (!validateApiKey(apiKey)) {
        return NextResponse.json(
          { error: 'Invalid API key' },
          { status: 401 }
        )
      }

      // Parse and validate request body
      const body = await request.json()
      const validation = AuthRequestSchema.safeParse(body)

      if (!validation.success) {
        return NextResponse.json(
          { 
            error: 'Invalid request data',
            details: validation.error.errors,
          },
          { status: 400 }
        )
      }

      const { userId, permissions } = validation.data

      // Generate token
      const { token, refreshToken, expiresAt } = generateToken(userId, permissions)

      observability.recordEvent('electric.auth.token-generated', {
        userId,
        permissions,
        expiresAt,
      })

      return NextResponse.json({
        token,
        refreshToken,
        expiresAt: expiresAt.toISOString(),
        permissions,
      })

    } catch (error) {
      observability.recordError('api.auth.electric.generate', error as Error)
      console.error('ElectricSQL auth error:', error)
      
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  })
}

/**
 * POST /api/auth/electric/refresh - Refresh authentication token
 */
export async function PUT(request: NextRequest) {
  return observability.trackOperation('api.auth.electric.refresh', async () => {
    try {
      // Parse and validate request body
      const body = await request.json()
      const validation = RefreshRequestSchema.safeParse(body)

      if (!validation.success) {
        return NextResponse.json(
          { 
            error: 'Invalid request data',
            details: validation.error.errors,
          },
          { status: 400 }
        )
      }

      const { refreshToken } = validation.data

      // Validate refresh token
      const refreshData = refreshTokenStore.get(refreshToken)
      if (!refreshData) {
        return NextResponse.json(
          { error: 'Invalid refresh token' },
          { status: 401 }
        )
      }

      // Check if refresh token is expired
      if (refreshData.expiresAt < new Date()) {
        refreshTokenStore.delete(refreshToken)
        return NextResponse.json(
          { error: 'Refresh token expired' },
          { status: 401 }
        )
      }

      // Generate new token
      const { token, refreshToken: newRefreshToken, expiresAt } = generateToken(
        refreshData.userId,
        refreshData.permissions
      )

      // Remove old refresh token
      refreshTokenStore.delete(refreshToken)

      observability.recordEvent('electric.auth.token-refreshed', {
        userId: refreshData.userId,
        permissions: refreshData.permissions,
        expiresAt,
      })

      return NextResponse.json({
        token,
        refreshToken: newRefreshToken,
        expiresAt: expiresAt.toISOString(),
        permissions: refreshData.permissions,
      })

    } catch (error) {
      observability.recordError('api.auth.electric.refresh', error as Error)
      console.error('ElectricSQL auth refresh error:', error)
      
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  })
}

/**
 * GET /api/auth/electric/status - Get authentication status
 */
export async function GET(request: NextRequest) {
  return observability.trackOperation('api.auth.electric.status', async () => {
    try {
      // Get token from authorization header
      const authHeader = request.headers.get('authorization')
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return NextResponse.json(
          { authenticated: false, error: 'No token provided' },
          { status: 200 }
        )
      }

      const token = authHeader.substring(7)

      try {
        // Decode token (in production, verify JWT signature)
        const payload = JSON.parse(atob(token))
        const tokenData = tokenStore.get(payload.tokenId)

        if (!tokenData) {
          return NextResponse.json(
            { authenticated: false, error: 'Invalid token' },
            { status: 200 }
          )
        }

        // Check if token is expired
        if (tokenData.expiresAt < new Date()) {
          tokenStore.delete(payload.tokenId)
          return NextResponse.json(
            { authenticated: false, error: 'Token expired' },
            { status: 200 }
          )
        }

        return NextResponse.json({
          authenticated: true,
          userId: tokenData.userId,
          permissions: tokenData.permissions,
          expiresAt: tokenData.expiresAt.toISOString(),
        })

      } catch (decodeError) {
        return NextResponse.json(
          { authenticated: false, error: 'Invalid token format' },
          { status: 200 }
        )
      }

    } catch (error) {
      observability.recordError('api.auth.electric.status', error as Error)
      console.error('ElectricSQL auth status error:', error)
      
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  })
}

/**
 * DELETE /api/auth/electric - Logout and invalidate token
 */
export async function DELETE(request: NextRequest) {
  return observability.trackOperation('api.auth.electric.logout', async () => {
    try {
      // Get token from authorization header
      const authHeader = request.headers.get('authorization')
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return NextResponse.json(
          { message: 'No token to invalidate' },
          { status: 200 }
        )
      }

      const token = authHeader.substring(7)

      try {
        // Decode token
        const payload = JSON.parse(atob(token))
        const tokenData = tokenStore.get(payload.tokenId)

        if (tokenData) {
          // Remove token and refresh token
          tokenStore.delete(payload.tokenId)
          refreshTokenStore.delete(tokenData.refreshToken)

          observability.recordEvent('electric.auth.logout', {
            userId: tokenData.userId,
            timestamp: new Date(),
          })
        }

        return NextResponse.json({
          message: 'Token invalidated successfully',
        })

      } catch (decodeError) {
        return NextResponse.json(
          { message: 'Invalid token format, but logout successful' },
          { status: 200 }
        )
      }

    } catch (error) {
      observability.recordError('api.auth.electric.logout', error as Error)
      console.error('ElectricSQL auth logout error:', error)
      
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  })
}

// Cleanup expired tokens periodically
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = new Date()
    
    // Clean up expired tokens
    for (const [tokenId, tokenData] of tokenStore.entries()) {
      if (tokenData.expiresAt < now) {
        tokenStore.delete(tokenId)
        refreshTokenStore.delete(tokenData.refreshToken)
      }
    }
    
    // Clean up expired refresh tokens
    for (const [refreshTokenId, refreshData] of refreshTokenStore.entries()) {
      if (refreshData.expiresAt < now) {
        refreshTokenStore.delete(refreshTokenId)
      }
    }
  }, 60 * 60 * 1000) // Clean up every hour
}