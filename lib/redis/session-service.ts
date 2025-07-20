/**
 * SessionService - Redis/Valkey Session Management Implementation
 * 
 * Provides secure session management with multi-device support and analytics
 */

import { randomUUID } from 'crypto'
import type Redis from 'ioredis'
import { ObservabilityService } from '../observability'
import { RedisClientManager } from './redis-client'
import type { SessionData, SessionOptions } from './types'

interface SessionActivity {
  action: string
  data: any
  timestamp: Date
}

interface OAuthTokens {
  accessToken: string
  refreshToken: string
  expiresAt: Date
}

export class SessionService {
  private static instance: SessionService
  private redisManager: RedisClientManager
  private observability = ObservabilityService.getInstance()
  private defaultTTL = 86400 // 24 hours
  private sessionPrefix = 'session:'
  private userSessionsPrefix = 'user_sessions:'
  private sessionLimits = new Map<string, number>()

  private constructor() {
    this.redisManager = RedisClientManager.getInstance()
  }

  static getInstance(): SessionService {
    if (!SessionService.instance) {
      SessionService.instance = new SessionService()
    }
    return SessionService.instance
  }

  async createSession<T extends SessionData>(
    data: T,
    options?: SessionOptions
  ): Promise<string> {
    return this.observability.trackOperation('session.create', async () => {
      const sessionId = randomUUID()
      const client = this.redisManager.getClient(options?.clientName)
      const key = this.buildSessionKey(sessionId)
      const ttl = options?.ttl || this.defaultTTL

      const sessionData: SessionData = {
        ...data,
        id: sessionId,
        createdAt: new Date(),
        lastAccessedAt: new Date(),
        expiresAt: new Date(Date.now() + ttl * 1000),
      }

      try {
        // Store session data
        await client.setex(key, ttl, JSON.stringify(sessionData))

        // Track user sessions if userId is provided
        if (data.userId) {
          await this.addUserSession(data.userId, sessionId, ttl)
          
          // Check session limits
          const limit = this.sessionLimits.get(data.userId)
          if (limit) {
            await this.enforceSessionLimit(data.userId, limit)
          }
        }

        this.observability.recordEvent('session.created', 1, {
          ttl: ttl.toString(),
          hasUserId: (!!data.userId).toString()
        })

        return sessionId
      } catch (error) {
        this.observability.recordError('session.create.error', error as Error, {
          sessionId,
        })
        throw error
      }
    })
  }

  async getSession<T extends SessionData>(
    sessionId: string,
    options?: SessionOptions
  ): Promise<T | null> {
    return this.observability.trackOperation('session.get', async () => {
      const client = this.redisManager.getClient(options?.clientName)
      const key = this.buildSessionKey(sessionId)

      try {
        const data = await client.get(key)

        if (!data) {
          this.observability.recordEvent('session.miss', 1, { sessionId })
          return null
        }

        const sessionData = JSON.parse(data) as T

        // Update last accessed time if sliding expiration is enabled
        if (options?.slidingExpiration !== false) {
          sessionData.lastAccessedAt = new Date()
          const currentTTL = await client.ttl(key)
          if (currentTTL > 0) {
            await client.setex(key, currentTTL, JSON.stringify(sessionData))
          }
        }

        this.observability.recordEvent('session.hit', 1, { sessionId })
        return sessionData
      } catch (error) {
        this.observability.recordError('session.get.error', error as Error, {
          sessionId,
        })
        return null
      }
    })
  }

  async updateSession<T extends SessionData>(
    sessionId: string,
    updates: Partial<T>,
    options?: SessionOptions
  ): Promise<boolean> {
    return this.observability.trackOperation('session.update', async () => {
      const client = this.redisManager.getClient(options?.clientName)
      const key = this.buildSessionKey(sessionId)

      try {
        const existingData = await client.get(key)

        if (!existingData) {
          this.observability.recordEvent('session.update.not_found', 1, {
            sessionId,
          })
          return false
        }

        const sessionData = JSON.parse(existingData) as T
        const updatedData = {
          ...sessionData,
          ...updates,
          lastAccessedAt: new Date(),
        }

        const ttl = await client.ttl(key)
        await client.setex(
          key,
          ttl > 0 ? ttl : this.defaultTTL,
          JSON.stringify(updatedData)
        )

        this.observability.recordEvent('session.updated', 1, {
          sessionId,
          status: 'success',
        })

        return true
      } catch (error) {
        this.observability.recordError('session.update.error', error as Error, {
          sessionId,
        })
        return false
      }
    })
  }

  async deleteSession(
    sessionId: string,
    options?: SessionOptions
  ): Promise<boolean> {
    return this.observability.trackOperation('session.delete', async () => {
      const client = this.redisManager.getClient(options?.clientName)
      const key = this.buildSessionKey(sessionId)

      try {
        // Get session data to remove from user sessions
        const sessionData = await client.get(key)
        if (sessionData) {
          const parsed = JSON.parse(sessionData) as SessionData
          if (parsed.userId) {
            await this.removeUserSession(parsed.userId, sessionId)
          }
        }

        const result = await client.del(key)

        this.observability.recordEvent('session.deleted', 1, {
          sessionId,
          status: result > 0 ? 'success' : 'not_found',
        })

        return result > 0
      } catch (error) {
        this.observability.recordError('session.delete.error', error as Error, {
          sessionId,
        })
        return false
      }
    })
  }

  async extendSession(
    sessionId: string,
    additionalTTL: number,
    options?: SessionOptions
  ): Promise<boolean> {
    const client = this.redisManager.getClient(options?.clientName)
    const key = this.buildSessionKey(sessionId)

    try {
      const currentTTL = await client.ttl(key)

      if (currentTTL <= 0) {
        return false
      }

      const newTTL = currentTTL + additionalTTL
      const result = await client.expire(key, newTTL)

      // Update user session TTL as well
      const sessionData = await client.get(key)
      if (sessionData) {
        const parsed = JSON.parse(sessionData) as SessionData
        if (parsed.userId) {
          const userSessionsKey = this.buildUserSessionsKey(parsed.userId)
          await client.expire(userSessionsKey, newTTL)
        }
      }

      this.observability.recordEvent('session.extended', 1, {
        sessionId,
        additionalTTL: additionalTTL.toString(),
        status: result === 1 ? 'success' : 'failed',
      })

      return result === 1
    } catch (error) {
      this.observability.recordError('session.extend.error', error as Error, {
        sessionId,
      })
      return false
    }
  }

  async validateSessionForUser(sessionId: string, userId: string): Promise<boolean> {
    const session = await this.getSession(sessionId)
    return session?.userId === userId
  }

  async rotateSession(sessionId: string): Promise<string> {
    const session = await this.getSession(sessionId)
    if (!session) {
      throw new Error('Session not found')
    }

    // Create new session with same data but new ID
    const { id, createdAt, lastAccessedAt, expiresAt, ...sessionData } = session
    const newSessionId = await this.createSession(sessionData)

    // Delete old session
    await this.deleteSession(sessionId)

    return newSessionId
  }

  // Multi-device session management
  async getUserSessions(userId: string): Promise<SessionData[]> {
    const client = this.redisManager.getClient()
    const userSessionsKey = this.buildUserSessionsKey(userId)

    try {
      const sessionIds = await client.smembers(userSessionsKey)
      const sessions: SessionData[] = []

      for (const sessionId of sessionIds) {
        const session = await this.getSession(sessionId)
        if (session) {
          sessions.push(session)
        }
      }

      return sessions
    } catch (error) {
      this.observability.recordError('session.get_user_sessions.error', error as Error, {
        userId,
      })
      return []
    }
  }

  async revokeAllUserSessions(userId: string): Promise<number> {
    const sessions = await this.getUserSessions(userId)
    let revokedCount = 0

    for (const session of sessions) {
      if (await this.deleteSession(session.id!)) {
        revokedCount++
      }
    }

    // Clear user sessions set
    const client = this.redisManager.getClient()
    const userSessionsKey = this.buildUserSessionsKey(userId)
    await client.del(userSessionsKey)

    this.observability.recordEvent('session.revoke_all', 1, {
      userId,
      count: revokedCount.toString()
    })

    return revokedCount
  }

  async setUserSessionLimit(userId: string, limit: number): Promise<void> {
    this.sessionLimits.set(userId, limit)
  }

  // Session activity tracking
  async recordSessionActivity(sessionId: string, action: string, data: any): Promise<void> {
    const client = this.redisManager.getClient()
    const activityKey = this.buildSessionActivityKey(sessionId)

    const activity: SessionActivity = {
      action,
      data,
      timestamp: new Date()
    }

    try {
      await client.lpush(activityKey, JSON.stringify(activity))
      await client.ltrim(activityKey, 0, 99) // Keep last 100 activities
      await client.expire(activityKey, this.defaultTTL)
    } catch (error) {
      this.observability.recordError('session.activity.error', error as Error, {
        sessionId,
        action
      })
    }
  }

  async getSessionActivity(sessionId: string): Promise<SessionActivity[]> {
    const client = this.redisManager.getClient()
    const activityKey = this.buildSessionActivityKey(sessionId)

    try {
      const activities = await client.lrange(activityKey, 0, -1)
      return activities.map(activity => JSON.parse(activity))
    } catch (error) {
      this.observability.recordError('session.get_activity.error', error as Error, {
        sessionId
      })
      return []
    }
  }

  // Session analytics
  async getUserSessionStats(userId: string): Promise<{
    totalSessions: number
    averageSessionDuration: number
    activeSessions: number
  }> {
    const sessions = await this.getUserSessions(userId)
    const activeSessions = sessions.length

    // This would be enhanced with historical data in a full implementation
    return {
      totalSessions: activeSessions,
      averageSessionDuration: 0,
      activeSessions
    }
  }

  async detectSuspiciousActivity(sessionId: string): Promise<{
    isSuspicious: boolean
    reasons: string[]
    riskScore: number
  }> {
    const activities = await this.getSessionActivity(sessionId)
    const reasons: string[] = []
    let riskScore = 0

    // Check for multiple failed login attempts
    const failedAttempts = activities.filter(a => a.action === 'failed_login_attempt').length
    if (failedAttempts > 5) {
      reasons.push('multiple_failed_attempts')
      riskScore += 0.4
    }

    // Check for unusual activity patterns
    const rapidActions = activities.filter(a => 
      Date.now() - a.timestamp.getTime() < 60000 // Last minute
    ).length
    if (rapidActions > 20) {
      reasons.push('rapid_activity')
      riskScore += 0.3
    }

    return {
      isSuspicious: riskScore > 0.5,
      reasons,
      riskScore
    }
  }

  // OAuth integration
  async refreshOAuthTokens(sessionId: string, tokens: OAuthTokens): Promise<boolean> {
    return this.updateSession(sessionId, {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      tokenExpiresAt: tokens.expiresAt
    })
  }

  // SSO integration
  async validateSSOSession(sessionId: string, ssoSessionIndex: string): Promise<boolean> {
    const session = await this.getSession(sessionId)
    return session?.sessionIndex === ssoSessionIndex
  }

  async initiateSSOLogout(sessionId: string): Promise<boolean> {
    // In a real implementation, this would initiate SAML/OIDC logout
    return this.deleteSession(sessionId)
  }

  // Session maintenance
  async cleanupExpiredSessions(): Promise<number> {
    return this.observability.trackOperation('session.cleanup', async () => {
      const client = this.redisManager.getClient()
      
      // This is a simplified cleanup - in practice you'd scan with patterns
      // and check TTLs or use Redis expiration events
      const cleanedCount = 0

      try {
        // Implementation would scan for expired sessions
        this.observability.recordEvent('session.cleanup', 1, {
          cleaned: cleanedCount.toString()
        })

        return cleanedCount
      } catch (error) {
        this.observability.recordError('session.cleanup.error', error as Error)
        return 0
      }
    })
  }

  async getHealthMetrics(): Promise<{
    totalActiveSessions: number
    memoryUsage: number
    averageSessionAge: number
    cleanupNeeded: boolean
  }> {
    // This would be implemented with actual Redis memory stats
    return {
      totalActiveSessions: 0,
      memoryUsage: 0,
      averageSessionAge: 0,
      cleanupNeeded: false
    }
  }

  async optimizeSessionStorage(sessionId: string): Promise<boolean> {
    // This would implement session data compression and optimization
    return true
  }

  async cleanup(): Promise<void> {
    console.log('Cleaning up Session service...')

    // Clear session limits
    this.sessionLimits.clear()

    console.log('Session service cleaned up successfully')
  }

  // Private helper methods
  private async addUserSession(userId: string, sessionId: string, ttl: number): Promise<void> {
    const client = this.redisManager.getClient()
    const userSessionsKey = this.buildUserSessionsKey(userId)

    try {
      await client.sadd(userSessionsKey, sessionId)
      await client.expire(userSessionsKey, ttl)
    } catch (error) {
      this.observability.recordError('session.add_user_session.error', error as Error, {
        userId,
        sessionId
      })
    }
  }

  private async removeUserSession(userId: string, sessionId: string): Promise<void> {
    const client = this.redisManager.getClient()
    const userSessionsKey = this.buildUserSessionsKey(userId)

    try {
      await client.srem(userSessionsKey, sessionId)
    } catch (error) {
      this.observability.recordError('session.remove_user_session.error', error as Error, {
        userId,
        sessionId
      })
    }
  }

  private async enforceSessionLimit(userId: string, limit: number): Promise<void> {
    const sessions = await this.getUserSessions(userId)
    
    if (sessions.length > limit) {
      // Sort by creation time and remove oldest sessions
      const sortedSessions = sessions.sort((a, b) => 
        a.createdAt!.getTime() - b.createdAt!.getTime()
      )

      const sessionsToRemove = sortedSessions.slice(0, sessions.length - limit)
      
      for (const session of sessionsToRemove) {
        await this.deleteSession(session.id!)
      }
    }
  }

  private buildSessionKey(sessionId: string): string {
    return `${this.sessionPrefix}${sessionId}`
  }

  private buildUserSessionsKey(userId: string): string {
    return `${this.userSessionsPrefix}${userId}`
  }

  private buildSessionActivityKey(sessionId: string): string {
    return `${this.sessionPrefix}${sessionId}:activity`
  }
}