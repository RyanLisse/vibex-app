/**
 * Cache Headers Utility
 *
 * Provides utilities for adding appropriate cache headers to API responses
 * based on the type of data and update frequency
 */

import { NextResponse } from 'next/server'

export interface CacheOptions {
  /**
   * Cache duration in seconds
   */
  maxAge?: number

  /**
   * Stale-while-revalidate duration in seconds
   */
  staleWhileRevalidate?: number

  /**
   * Whether to allow caching in CDNs (public) or only in browser (private)
   */
  public?: boolean

  /**
   * Whether to include must-revalidate directive
   */
  mustRevalidate?: boolean

  /**
   * Whether this is immutable content (won't change)
   */
  immutable?: boolean

  /**
   * ETag for conditional requests
   */
  etag?: string

  /**
   * Last modified date
   */
  lastModified?: Date
}

/**
 * Common cache configurations
 */
export const CacheConfigs = {
  // No caching - for sensitive or real-time data
  NO_CACHE: {
    maxAge: 0,
    mustRevalidate: true,
  },

  // Very short cache - for frequently updated data
  VERY_SHORT: {
    maxAge: 10,
    staleWhileRevalidate: 5,
  },

  // Short cache - for data that updates every few minutes
  SHORT: {
    maxAge: 60, // 1 minute
    staleWhileRevalidate: 30,
  },

  // Medium cache - for data that updates hourly
  MEDIUM: {
    maxAge: 300, // 5 minutes
    staleWhileRevalidate: 600, // 10 minutes
  },

  // Long cache - for data that updates daily
  LONG: {
    maxAge: 3600, // 1 hour
    staleWhileRevalidate: 7200, // 2 hours
  },

  // Very long cache - for static resources
  STATIC: {
    maxAge: 86400, // 24 hours
    staleWhileRevalidate: 604800, // 7 days
    public: true,
  },

  // Immutable - for versioned assets
  IMMUTABLE: {
    maxAge: 31536000, // 1 year
    immutable: true,
    public: true,
  },
} as const

/**
 * Add cache headers to a response
 */
export function addCacheHeaders(
  response: Response | NextResponse,
  options: CacheOptions = CacheConfigs.NO_CACHE
): Response | NextResponse {
  const headers = response.headers

  // Build Cache-Control header
  const cacheControl: string[] = []

  if (options.public) {
    cacheControl.push('public')
  } else {
    cacheControl.push('private')
  }

  if (options.maxAge !== undefined) {
    cacheControl.push(`max-age=${options.maxAge}`)
  }

  if (options.staleWhileRevalidate !== undefined) {
    cacheControl.push(`stale-while-revalidate=${options.staleWhileRevalidate}`)
  }

  if (options.mustRevalidate) {
    cacheControl.push('must-revalidate')
  }

  if (options.immutable) {
    cacheControl.push('immutable')
  }

  headers.set('Cache-Control', cacheControl.join(', '))

  // Add ETag if provided
  if (options.etag) {
    headers.set('ETag', options.etag)
  }

  // Add Last-Modified if provided
  if (options.lastModified) {
    headers.set('Last-Modified', options.lastModified.toUTCString())
  }

  // Add Vary header for proper caching with different request headers
  if (!headers.has('Vary')) {
    headers.set('Vary', 'Accept-Encoding')
  }

  return response
}

/**
 * Create a cached JSON response
 */
export function cachedJsonResponse(
  data: any,
  options: CacheOptions = CacheConfigs.SHORT,
  status = 200
): NextResponse {
  const response = NextResponse.json(data, { status })
  return addCacheHeaders(response, options) as NextResponse
}

/**
 * Generate ETag from data
 */
export function generateETag(data: any): string {
  const crypto = require('crypto')
  const hash = crypto.createHash('md5')
  hash.update(JSON.stringify(data))
  return `"${hash.digest('hex')}"`
}

/**
 * Check if request matches ETag
 */
export function checkETag(request: Request, etag: string): boolean {
  const ifNoneMatch = request.headers.get('If-None-Match')
  return ifNoneMatch === etag
}

/**
 * Create 304 Not Modified response
 */
export function notModifiedResponse(etag?: string): NextResponse {
  const response = new NextResponse(null, { status: 304 })
  if (etag) {
    response.headers.set('ETag', etag)
  }
  return response
}

/**
 * Middleware for automatic cache headers based on route
 */
export function getCacheConfigForRoute(pathname: string): CacheOptions {
  // Static assets
  if (pathname.match(/\.(js|css|jpg|jpeg|png|gif|svg|ico|woff|woff2)$/)) {
    return CacheConfigs.STATIC
  }

  // API routes with specific cache strategies
  if (pathname.startsWith('/api/')) {
    // Real-time endpoints - no cache
    if (pathname.includes('/realtime') || pathname.includes('/ws') || pathname.includes('/sse')) {
      return CacheConfigs.NO_CACHE
    }

    // Auth endpoints - no cache
    if (pathname.includes('/auth')) {
      return CacheConfigs.NO_CACHE
    }

    // Metrics and monitoring - very short cache
    if (pathname.includes('/metrics') || pathname.includes('/health')) {
      return CacheConfigs.VERY_SHORT
    }

    // List endpoints - short cache
    if (pathname.endsWith('/list') || pathname.match(/\/api\/[^\/]+\/?$/)) {
      return CacheConfigs.SHORT
    }

    // Individual resource endpoints - medium cache
    if (pathname.match(/\/api\/[^\/]+\/[^\/]+$/)) {
      return CacheConfigs.MEDIUM
    }
  }

  // Default to no cache for safety
  return CacheConfigs.NO_CACHE
}

/**
 * Helper to add cache headers to common API responses
 */
export const withCache = {
  /**
   * Tasks list - updates frequently
   */
  tasksList: (data: any) => cachedJsonResponse(data, CacheConfigs.SHORT),

  /**
   * Individual task - updates less frequently
   */
  task: (data: any) => cachedJsonResponse(data, CacheConfigs.MEDIUM),

  /**
   * User profile - updates rarely
   */
  userProfile: (data: any) => cachedJsonResponse(data, CacheConfigs.LONG),

  /**
   * Static configuration
   */
  config: (data: any) => cachedJsonResponse(data, CacheConfigs.STATIC),

  /**
   * Real-time data - no cache
   */
  realtime: (data: any) => cachedJsonResponse(data, CacheConfigs.NO_CACHE),

  /**
   * Error responses - no cache
   */
  error: (error: any, status = 500) => cachedJsonResponse(error, CacheConfigs.NO_CACHE, status),
}

/**
 * Example usage in API route:
 *
 * ```typescript
 * import { withCache, generateETag, checkETag, notModifiedResponse } from '@/lib/api/cache-headers'
 *
 * export async function GET(request: Request) {
 *   const tasks = await getTasks()
 *
 *   // Generate ETag
 *   const etag = generateETag(tasks)
 *
 *   // Check if client has current version
 *   if (checkETag(request, etag)) {
 *     return notModifiedResponse(etag)
 *   }
 *
 *   // Return cached response
 *   return withCache.tasksList(tasks)
 * }
 * ```
 */
