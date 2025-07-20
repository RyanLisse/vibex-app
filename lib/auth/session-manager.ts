import { jwtVerify, SignJWT } from 'jose'
import { cookies } from 'next/headers'
import { redis } from '@/lib/redis'

export interface SessionData {
  userId: string
  sessionId: string
  metadata?: any
  iat?: number
  exp?: number
}

export class SecureSessionManager {
  private readonly secret = new TextEncoder().encode(process.env.JWT_SECRET!)
  private readonly issuer = 'urn:codex:clone'
  private readonly audience = 'urn:codex:user'
  private readonly cookieName = 'session'
  private readonly sessionDuration = 2 * 60 * 60 // 2 hours in seconds

  constructor() {
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET environment variable is required')
    }
  }

  async createSession(userId: string, metadata?: any): Promise<string> {
    const sessionId = crypto.randomUUID()

    const jwt = await new SignJWT({
      userId,
      metadata,
      sessionId,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setIssuer(this.issuer)
      .setAudience(this.audience)
      .setExpirationTime('2h')
      .sign(this.secret)

    // Set secure HTTP-only cookie
    cookies().set(this.cookieName, jwt, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: this.sessionDuration,
      path: '/',
    })

    // Store session metadata in Redis for additional validation
    await redis.setex(
      `session:${sessionId}`,
      this.sessionDuration,
      JSON.stringify({ userId, metadata, createdAt: Date.now() })
    )

    return jwt
  }

  async validateSession(token: string): Promise<SessionData | null> {
    try {
      const { payload } = await jwtVerify(token, this.secret, {
        issuer: this.issuer,
        audience: this.audience,
      })

      // Additional validation
      if (!(payload.userId && payload.sessionId)) {
        return null
      }

      // Check if session exists in Redis
      const sessionData = await redis.get(`session:${payload.sessionId}`)
      if (!sessionData) {
        return null
      }

      // Check if session is blacklisted
      const isBlacklisted = await redis.exists(`blacklist:${payload.sessionId}`)
      if (isBlacklisted) {
        return null
      }

      return payload as SessionData
    } catch {
      return null
    }
  }

  async getSession(): Promise<SessionData | null> {
    const cookieStore = cookies()
    const token = cookieStore.get(this.cookieName)?.value

    if (!token) {
      return null
    }

    return this.validateSession(token)
  }

  async refreshSession(sessionId: string): Promise<string | null> {
    const sessionData = await redis.get(`session:${sessionId}`)
    if (!sessionData) {
      return null
    }

    const session = JSON.parse(sessionData)

    // Extend session in Redis
    await redis.expire(`session:${sessionId}`, this.sessionDuration)

    // Create new JWT with extended expiration
    return this.createSession(session.userId, session.metadata)
  }

  async revokeSession(sessionId: string): Promise<void> {
    // Add to blacklist with TTL matching token expiration
    await redis.setex(`blacklist:${sessionId}`, this.sessionDuration, '1')

    // Remove session data
    await redis.del(`session:${sessionId}`)

    // Clear cookie
    cookies().delete(this.cookieName)
  }

  async revokeAllUserSessions(userId: string): Promise<void> {
    // Get all session keys for user
    const keys = await redis.keys('session:*')

    for (const key of keys) {
      const sessionData = await redis.get(key)
      if (sessionData) {
        const session = JSON.parse(sessionData)
        if (session.userId === userId) {
          const sessionId = key.replace('session:', '')
          await this.revokeSession(sessionId)
        }
      }
    }
  }

  async getActiveSessions(userId: string): Promise<string[]> {
    const sessions: string[] = []
    const keys = await redis.keys('session:*')

    for (const key of keys) {
      const sessionData = await redis.get(key)
      if (sessionData) {
        const session = JSON.parse(sessionData)
        if (session.userId === userId) {
          sessions.push(key.replace('session:', ''))
        }
      }
    }

    return sessions
  }
}

export const sessionManager = new SecureSessionManager()
