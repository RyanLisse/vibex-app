import { NextRequest } from 'next/server'
import { redis } from '@/lib/redis'

export interface RateLimiterOptions {
  windowMs: number // Time window in milliseconds
  max: number // Max requests per window
  standardHeaders?: boolean // Return rate limit headers
  legacyHeaders?: boolean // Return legacy headers
  keyGenerator?: (req: NextRequest) => string // Custom key generator
  skipSuccessfulRequests?: boolean
  skipFailedRequests?: boolean
}

export interface RateLimitResult {
  success: boolean
  limit: number
  remaining: number
  reset: number
  retryAfter: number
}

export class RateLimiter {
  private options: Required<RateLimiterOptions>

  constructor(options: RateLimiterOptions) {
    this.options = {
      windowMs: options.windowMs,
      max: options.max,
      standardHeaders: options.standardHeaders ?? true,
      legacyHeaders: options.legacyHeaders ?? false,
      keyGenerator: options.keyGenerator ?? this.defaultKeyGenerator,
      skipSuccessfulRequests: options.skipSuccessfulRequests ?? false,
      skipFailedRequests: options.skipFailedRequests ?? false,
    }
  }

  async check(request: NextRequest): Promise<RateLimitResult> {
    const key = this.options.keyGenerator(request)
    const now = Date.now()
    const windowStart = now - this.options.windowMs
    const windowEnd = now + this.options.windowMs

    // Create a unique key for this time window
    const windowKey = `ratelimit:${key}:${Math.floor(now / this.options.windowMs)}`

    try {
      // Use Redis INCR with expiration for atomic rate limiting
      const multi = redis.multi()
      multi.incr(windowKey)
      multi.expire(windowKey, Math.ceil(this.options.windowMs / 1000))

      const results = await multi.exec()
      const count = (results?.[0]?.[1] as number) || 1

      const remaining = Math.max(0, this.options.max - count)
      const retryAfter = remaining === 0 ? Math.ceil(this.options.windowMs / 1000) : 0

      return {
        success: count <= this.options.max,
        limit: this.options.max,
        remaining,
        reset: windowEnd,
        retryAfter,
      }
    } catch (error) {
      // If Redis is unavailable, allow the request but log the error
      console.error('Rate limiter error:', error)

      return {
        success: true,
        limit: this.options.max,
        remaining: this.options.max,
        reset: windowEnd,
        retryAfter: 0,
      }
    }
  }

  async reset(request: NextRequest): Promise<void> {
    const key = this.options.keyGenerator(request)
    const now = Date.now()
    const windowKey = `ratelimit:${key}:${Math.floor(now / this.options.windowMs)}`

    await redis.del(windowKey)
  }

  private defaultKeyGenerator(request: NextRequest): string {
    // Use IP address as the default key
    const forwarded = request.headers.get('x-forwarded-for')
    const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown'

    // Include the path to allow different limits per endpoint
    const path = request.nextUrl.pathname

    return `${ip}:${path}`
  }
}

// Specialized rate limiters for different use cases
export class AuthRateLimiter extends RateLimiter {
  constructor() {
    super({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 5, // Only 5 auth attempts per window
      keyGenerator: (req) => {
        // Rate limit by IP for auth endpoints
        const forwarded = req.headers.get('x-forwarded-for')
        const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown'
        return `auth:${ip}`
      },
    })
  }
}

export class ApiRateLimiter extends RateLimiter {
  constructor() {
    super({
      windowMs: 60 * 1000, // 1 minute
      max: 60, // 60 requests per minute
      keyGenerator: (req) => {
        // Rate limit by API key or IP
        const apiKey = req.headers.get('x-api-key')
        if (apiKey) {
          return `api:${apiKey}`
        }

        const forwarded = req.headers.get('x-forwarded-for')
        const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown'
        return `api:${ip}`
      },
    })
  }
}

// Utility function for creating custom rate limiters
export function createRateLimiter(
  windowMs: number,
  max: number,
  keyPrefix: string = ''
): RateLimiter {
  return new RateLimiter({
    windowMs,
    max,
    keyGenerator: (req) => {
      const forwarded = req.headers.get('x-forwarded-for')
      const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown'
      const path = req.nextUrl.pathname
      return keyPrefix ? `${keyPrefix}:${ip}:${path}` : `${ip}:${path}`
    },
  })
}
