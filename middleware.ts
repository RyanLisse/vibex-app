import { type NextRequest, NextResponse } from 'next/server'
import { sessionManager } from '@/lib/auth/session-manager'
import { RateLimiter } from '@/lib/security/rate-limiter'

// Initialize rate limiter
const rateLimiter = new RateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
})

// API routes that require authentication
const protectedApiRoutes = [
  '/api/tasks',
  '/api/environments',
  '/api/agents',
  '/api/workflows',
  '/api/performance',
]

// API routes that require API key
const apiKeyRoutes = ['/api/external', '/api/v1']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Apply to API routes
  if (pathname.startsWith('/api')) {
    // Rate limiting
    const rateLimitResult = await rateLimiter.check(request)
    if (!rateLimitResult.success) {
      return new NextResponse('Too Many Requests', {
        status: 429,
        headers: {
          'Retry-After': rateLimitResult.retryAfter.toString(),
          'X-RateLimit-Limit': rateLimitResult.limit.toString(),
          'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
          'X-RateLimit-Reset': new Date(rateLimitResult.reset).toISOString(),
        },
      })
    }

    // Check if route requires authentication
    const requiresAuth = protectedApiRoutes.some((route) => pathname.startsWith(route))
    if (requiresAuth) {
      const sessionCookie = request.cookies.get('session')
      if (!sessionCookie) {
        return new NextResponse('Unauthorized', { status: 401 })
      }

      // Validate session
      const session = await sessionManager.validateSession(sessionCookie.value)
      if (!session) {
        return new NextResponse('Unauthorized', { status: 401 })
      }

      // Add user info to request headers for API routes
      const requestHeaders = new Headers(request.headers)
      requestHeaders.set('x-user-id', session.userId)
      requestHeaders.set('x-session-id', session.sessionId)
    }

    // API key validation for external APIs
    const requiresApiKey = apiKeyRoutes.some((route) => pathname.startsWith(route))
    if (requiresApiKey) {
      const apiKey = request.headers.get('x-api-key')
      if (!apiKey) {
        return new NextResponse('API Key Required', {
          status: 401,
          headers: {
            'WWW-Authenticate': 'Bearer realm="api"',
          },
        })
      }

      // Validate API key (implement your validation logic)
      const isValidApiKey = await validateApiKey(apiKey)
      if (!isValidApiKey) {
        return new NextResponse('Invalid API Key', { status: 401 })
      }
    }

    // CORS headers for API routes
    const response = NextResponse.next()

    // Configure CORS based on environment
    const allowedOrigin =
      process.env.ALLOWED_ORIGIN ||
      (process.env.NODE_ENV === 'development' ? '*' : 'https://yourdomain.com')

    response.headers.set('Access-Control-Allow-Origin', allowedOrigin)
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key')
    response.headers.set('Access-Control-Max-Age', '86400')

    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      return new NextResponse(null, { status: 200, headers: response.headers })
    }

    return response
  }

  // For non-API routes, just continue
  return NextResponse.next()
}

export const config = {
  matcher: [
    // Match all API routes
    '/api/:path*',
    // Exclude static files and images
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}

// API key validation function (implement your logic)
async function validateApiKey(apiKey: string): Promise<boolean> {
  // This is a placeholder - implement your actual API key validation
  // For example, check against database or environment variables

  if (process.env.NODE_ENV === 'development') {
    // Allow test API key in development
    return apiKey === 'test-api-key'
  }

  // In production, validate against stored API keys
  // const validKey = await db.apiKeys.findUnique({ where: { key: apiKey } });
  // return !!validKey && validKey.active;

  return false
}
