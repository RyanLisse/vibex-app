# Security Patterns

This guide covers security best practices and patterns for APIs built with the base infrastructure.

## Security Principles

1. **Defense in Depth** - Multiple layers of security
2. **Least Privilege** - Grant minimum necessary permissions
3. **Zero Trust** - Verify everything, trust nothing
4. **Fail Secure** - Default to deny on errors
5. **Security by Design** - Build security in from the start

## Authentication and Authorization

### 1. Token-Based Authentication

```typescript
// lib/auth/token-service.ts
import jwt from 'jsonwebtoken'
import { UnauthorizedError, ForbiddenError } from '@/lib/api/base'

interface TokenPayload {
  userId: string
  sessionId: string
  roles: string[]
  exp: number
}

export class TokenService {
  private readonly secret = process.env.JWT_SECRET!
  private readonly issuer = 'your-app'
  
  async generateToken(user: User): Promise<string> {
    const payload: TokenPayload = {
      userId: user.id,
      sessionId: crypto.randomUUID(),
      roles: user.roles,
      exp: Math.floor(Date.now() / 1000) + (60 * 60) // 1 hour
    }
    
    return jwt.sign(payload, this.secret, {
      issuer: this.issuer,
      algorithm: 'HS256'
    })
  }
  
  async verifyToken(token: string): Promise<TokenPayload> {
    try {
      const payload = jwt.verify(token, this.secret, {
        issuer: this.issuer,
        algorithms: ['HS256']
      }) as TokenPayload
      
      // Additional validation
      if (payload.exp < Math.floor(Date.now() / 1000)) {
        throw new UnauthorizedError('Token expired')
      }
      
      // Check if session is still valid
      const session = await this.validateSession(payload.sessionId)
      if (!session) {
        throw new UnauthorizedError('Invalid session')
      }
      
      return payload
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        throw new UnauthorizedError('Invalid token')
      }
      throw error
    }
  }
  
  private async validateSession(sessionId: string): Promise<boolean> {
    // Check Redis or database for valid session
    const session = await redis.get(`session:${sessionId}`)
    return !!session
  }
}
```

### 2. Custom Authentication Handler

```typescript
// lib/api/base/auth-handler.ts
export class AuthenticatedAPIHandler extends BaseAPIHandler {
  static async checkAuth(request: NextRequest): Promise<{
    isAuthenticated: boolean
    userId?: string
    sessionId?: string
    roles?: string[]
  }> {
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader?.startsWith('Bearer ')) {
      return { isAuthenticated: false }
    }
    
    const token = authHeader.substring(7)
    
    try {
      const tokenService = new TokenService()
      const payload = await tokenService.verifyToken(token)
      
      return {
        isAuthenticated: true,
        userId: payload.userId,
        sessionId: payload.sessionId,
        roles: payload.roles
      }
    } catch (error) {
      return { isAuthenticated: false }
    }
  }
}

// Usage
export const GET = AuthenticatedAPIHandler.GET(
  async (context) => {
    // context.userId is guaranteed
    const data = await service.getUserData(context.userId)
    return ResponseBuilder.success(data)
  },
  { requireAuth: true }
)
```

### 3. Role-Based Access Control (RBAC)

```typescript
// decorators/rbac.ts
export function requireRoles(...requiredRoles: string[]) {
  return function (handler: Function) {
    return async (context: RequestContext) => {
      if (!context.roles) {
        throw new UnauthorizedError('Authentication required')
      }
      
      const hasRequiredRole = requiredRoles.some(
        role => context.roles!.includes(role)
      )
      
      if (!hasRequiredRole) {
        throw new ForbiddenError(
          `Required roles: ${requiredRoles.join(', ')}`
        )
      }
      
      return handler(context)
    }
  }
}

// Usage
export const DELETE = AuthenticatedAPIHandler.DELETE(
  requireRoles('admin', 'moderator')(async (context) => {
    await productService.deleteProduct(context.query.id)
    return ResponseBuilder.deleted()
  }),
  { requireAuth: true }
)
```

### 4. API Key Authentication

```typescript
class APIKeyService extends BaseAPIService {
  async validateAPIKey(key: string): Promise<APIKeyData> {
    return this.executeWithTracing('validateAPIKey', {}, async (span) => {
      // Hash the key for comparison
      const hashedKey = crypto
        .createHash('sha256')
        .update(key)
        .digest('hex')
      
      const apiKey = await db.query.apiKeys.findFirst({
        where: and(
          eq(apiKeys.hashedKey, hashedKey),
          eq(apiKeys.isActive, true),
          gte(apiKeys.expiresAt, new Date())
        )
      })
      
      if (!apiKey) {
        throw new UnauthorizedError('Invalid API key')
      }
      
      // Check rate limits
      const usage = await this.checkAPIKeyUsage(apiKey.id)
      if (usage.exceeded) {
        throw new RateLimitError(usage.resetIn)
      }
      
      // Record usage
      await this.recordAPIKeyUsage(apiKey.id)
      
      return {
        keyId: apiKey.id,
        userId: apiKey.userId,
        scopes: apiKey.scopes,
        rateLimit: apiKey.rateLimit
      }
    })
  }
}

// API Key handler
export class APIKeyHandler extends BaseAPIHandler {
  static async checkAuth(request: NextRequest) {
    const apiKey = request.headers.get('x-api-key')
    
    if (!apiKey) {
      return { isAuthenticated: false }
    }
    
    try {
      const keyData = await apiKeyService.validateAPIKey(apiKey)
      
      return {
        isAuthenticated: true,
        userId: keyData.userId,
        scopes: keyData.scopes
      }
    } catch (error) {
      return { isAuthenticated: false }
    }
  }
}
```

## Input Validation and Sanitization

### 1. Comprehensive Input Validation

```typescript
import { z } from 'zod'
import validator from 'validator'
import DOMPurify from 'isomorphic-dompurify'

// Custom validators
const sanitizedString = z.string().transform(val => 
  DOMPurify.sanitize(val, { ALLOWED_TAGS: [] })
)

const safeEmail = z.string()
  .email()
  .toLowerCase()
  .refine(val => validator.isEmail(val), 'Invalid email format')

const safeUrl = z.string()
  .url()
  .refine(val => {
    try {
      const url = new URL(val)
      return ['http:', 'https:'].includes(url.protocol)
    } catch {
      return false
    }
  }, 'Invalid URL')

const phoneNumber = z.string()
  .refine(val => validator.isMobilePhone(val, 'any'), 'Invalid phone number')

// Prevent SQL injection in free text
const safeSqlString = z.string()
  .transform(val => val.replace(/['";\\]/g, ''))
  .refine(val => !/(DROP|DELETE|INSERT|UPDATE|SELECT)/i.test(val), 
    'Invalid characters detected')

// File upload validation
const FileUploadSchema = z.object({
  filename: sanitizedString.max(255),
  mimetype: z.enum(['image/jpeg', 'image/png', 'image/gif', 'application/pdf']),
  size: z.number().max(10 * 1024 * 1024), // 10MB
  content: z.instanceof(Buffer)
})

// Example usage
export const CreateUserSchema = z.object({
  email: safeEmail,
  username: sanitizedString.min(3).max(20)
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, - and _'),
  name: sanitizedString.min(2).max(100),
  bio: sanitizedString.max(500).optional(),
  website: safeUrl.optional(),
  phone: phoneNumber.optional()
})
```

### 2. SQL Injection Prevention

```typescript
// ❌ BAD: Never use string concatenation
const query = `SELECT * FROM users WHERE email = '${userInput}'`

// ✅ GOOD: Use parameterized queries (Drizzle handles this)
const user = await db.query.users.findFirst({
  where: eq(users.email, userInput)
})

// ✅ GOOD: Safe dynamic queries with QueryBuilder
const results = await createQueryBuilder(products)
  .whereLike(products.name, `%${userInput}%`) // Automatically escaped
  .execute()

// For raw SQL, use parameterized queries
const results = await db.execute(
  sql`SELECT * FROM users WHERE email = ${userInput}`
)
```

### 3. XSS Prevention

```typescript
// Response sanitization
export class SafeResponseBuilder extends ResponseBuilder {
  static success<T>(data: T, message?: string) {
    // Sanitize response data
    const sanitized = this.sanitizeData(data)
    return super.success(sanitized, message)
  }
  
  private static sanitizeData(data: any): any {
    if (typeof data === 'string') {
      return DOMPurify.sanitize(data)
    }
    
    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeData(item))
    }
    
    if (data && typeof data === 'object') {
      const sanitized: any = {}
      for (const [key, value] of Object.entries(data)) {
        sanitized[key] = this.sanitizeData(value)
      }
      return sanitized
    }
    
    return data
  }
}

// Content Security Policy
export function setSecurityHeaders(response: NextResponse) {
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'"
  )
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  
  return response
}
```

## Rate Limiting

### 1. Token Bucket Rate Limiting

```typescript
import { RateLimitError } from '@/lib/api/base'

interface RateLimitOptions {
  requests: number
  window: string // e.g., '1m', '1h', '1d'
  keyGenerator?: (context: RequestContext) => string
}

class RateLimiter {
  private buckets = new Map<string, TokenBucket>()
  
  async checkLimit(
    key: string,
    options: RateLimitOptions
  ): Promise<{ allowed: boolean; remaining: number; resetAt: Date }> {
    const bucket = this.getBucket(key, options)
    
    const allowed = bucket.consume(1)
    
    return {
      allowed,
      remaining: bucket.getRemaining(),
      resetAt: bucket.getResetTime()
    }
  }
  
  private getBucket(key: string, options: RateLimitOptions): TokenBucket {
    if (!this.buckets.has(key)) {
      this.buckets.set(key, new TokenBucket(
        options.requests,
        this.parseWindow(options.window)
      ))
    }
    
    return this.buckets.get(key)!
  }
  
  private parseWindow(window: string): number {
    const match = window.match(/^(\d+)([smhd])$/)
    if (!match) throw new Error('Invalid window format')
    
    const [, num, unit] = match
    const multipliers = { s: 1000, m: 60000, h: 3600000, d: 86400000 }
    
    return parseInt(num) * multipliers[unit as keyof typeof multipliers]
  }
}

// Rate limiting middleware
export function withRateLimit(options: RateLimitOptions) {
  const rateLimiter = new RateLimiter()
  
  return function (handler: Function) {
    return async (context: RequestContext) => {
      const key = options.keyGenerator?.(context) || 
                  context.userId || 
                  context.headers['x-forwarded-for'] || 
                  'anonymous'
      
      const limitKey = `ratelimit:${context.path}:${key}`
      const result = await rateLimiter.checkLimit(limitKey, options)
      
      if (!result.allowed) {
        throw new RateLimitError(
          Math.ceil((result.resetAt.getTime() - Date.now()) / 1000)
        )
      }
      
      // Add rate limit headers
      const response = await handler(context)
      response.headers.set('X-RateLimit-Limit', String(options.requests))
      response.headers.set('X-RateLimit-Remaining', String(result.remaining))
      response.headers.set('X-RateLimit-Reset', result.resetAt.toISOString())
      
      return response
    }
  }
}

// Usage
export const POST = BaseAPIHandler.POST(
  withRateLimit({
    requests: 10,
    window: '1m',
    keyGenerator: (ctx) => ctx.userId || ctx.headers['x-forwarded-for']
  })(async (context) => {
    // Handle request
  })
)
```

### 2. Distributed Rate Limiting with Redis

```typescript
class RedisRateLimiter {
  constructor(private redis: RedisClient) {}
  
  async checkLimit(
    key: string,
    limit: number,
    window: number
  ): Promise<RateLimitResult> {
    const now = Date.now()
    const windowStart = now - window
    
    // Use Redis sorted set for sliding window
    const pipe = this.redis.pipeline()
    
    // Remove old entries
    pipe.zremrangebyscore(key, '-inf', windowStart)
    
    // Add current request
    pipe.zadd(key, now, `${now}-${crypto.randomUUID()}`)
    
    // Count requests in window
    pipe.zcard(key)
    
    // Set expiry
    pipe.expire(key, Math.ceil(window / 1000))
    
    const results = await pipe.exec()
    const count = results[2][1] as number
    
    if (count > limit) {
      // Remove the request we just added
      await this.redis.zrem(key, `${now}-${crypto.randomUUID()}`)
      
      // Get oldest entry to calculate reset time
      const oldest = await this.redis.zrange(key, 0, 0, 'WITHSCORES')
      const resetAt = oldest.length > 0 
        ? new Date(parseInt(oldest[1]) + window)
        : new Date(now + window)
      
      return {
        allowed: false,
        remaining: 0,
        resetAt,
        retryAfter: Math.ceil((resetAt.getTime() - now) / 1000)
      }
    }
    
    return {
      allowed: true,
      remaining: limit - count,
      resetAt: new Date(now + window),
      retryAfter: 0
    }
  }
}
```

## CORS and CSRF Protection

### 1. CORS Configuration

```typescript
// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const ALLOWED_ORIGINS = [
  'https://yourdomain.com',
  'https://app.yourdomain.com',
  process.env.NODE_ENV === 'development' && 'http://localhost:3000'
].filter(Boolean) as string[]

export function middleware(request: NextRequest) {
  // Handle preflight requests
  if (request.method === 'OPTIONS') {
    return handlePreflight(request)
  }
  
  // Check origin for API routes
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const origin = request.headers.get('origin')
    
    if (origin && !ALLOWED_ORIGINS.includes(origin)) {
      return new Response('Forbidden', { status: 403 })
    }
    
    const response = NextResponse.next()
    
    // Set CORS headers
    if (origin && ALLOWED_ORIGINS.includes(origin)) {
      response.headers.set('Access-Control-Allow-Origin', origin)
      response.headers.set('Access-Control-Allow-Credentials', 'true')
    }
    
    return response
  }
  
  return NextResponse.next()
}

function handlePreflight(request: NextRequest) {
  const origin = request.headers.get('origin')
  
  if (!origin || !ALLOWED_ORIGINS.includes(origin)) {
    return new Response(null, { status: 403 })
  }
  
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-CSRF-Token',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Max-Age': '86400'
    }
  })
}
```

### 2. CSRF Protection

```typescript
// lib/security/csrf.ts
import crypto from 'crypto'

export class CSRFProtection {
  private static readonly TOKEN_LENGTH = 32
  
  static generateToken(): string {
    return crypto.randomBytes(this.TOKEN_LENGTH).toString('hex')
  }
  
  static async validateToken(
    sessionToken: string,
    requestToken: string
  ): Promise<boolean> {
    // Constant-time comparison to prevent timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(sessionToken),
      Buffer.from(requestToken)
    )
  }
}

// CSRF middleware
export function withCSRFProtection(handler: Function) {
  return async (context: RequestContext) => {
    // Skip for safe methods
    if (['GET', 'HEAD', 'OPTIONS'].includes(context.method)) {
      return handler(context)
    }
    
    const sessionToken = await getSessionCSRFToken(context.sessionId)
    const requestToken = context.headers['x-csrf-token']
    
    if (!requestToken || !sessionToken) {
      throw new ForbiddenError('CSRF token missing')
    }
    
    const isValid = await CSRFProtection.validateToken(
      sessionToken,
      requestToken
    )
    
    if (!isValid) {
      throw new ForbiddenError('Invalid CSRF token')
    }
    
    return handler(context)
  }
}
```

## Data Security

### 1. Encryption at Rest

```typescript
import crypto from 'crypto'

export class EncryptionService {
  private readonly algorithm = 'aes-256-gcm'
  private readonly key: Buffer
  
  constructor() {
    // Use environment variable or key management service
    this.key = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex')
  }
  
  encrypt(data: string): EncryptedData {
    const iv = crypto.randomBytes(16)
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv)
    
    const encrypted = Buffer.concat([
      cipher.update(data, 'utf8'),
      cipher.final()
    ])
    
    const authTag = cipher.getAuthTag()
    
    return {
      encrypted: encrypted.toString('base64'),
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64')
    }
  }
  
  decrypt(encryptedData: EncryptedData): string {
    const decipher = crypto.createDecipheriv(
      this.algorithm,
      this.key,
      Buffer.from(encryptedData.iv, 'base64')
    )
    
    decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'base64'))
    
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(encryptedData.encrypted, 'base64')),
      decipher.final()
    ])
    
    return decrypted.toString('utf8')
  }
}

// Usage in service
class SecureDataService extends BaseAPIService {
  private encryption = new EncryptionService()
  
  async storeSensitiveData(userId: string, data: SensitiveData) {
    const encrypted = this.encryption.encrypt(JSON.stringify(data))
    
    await db.insert(sensitiveData).values({
      userId,
      encryptedData: encrypted.encrypted,
      iv: encrypted.iv,
      authTag: encrypted.authTag
    })
  }
  
  async getSensitiveData(userId: string): Promise<SensitiveData> {
    const record = await db.query.sensitiveData.findFirst({
      where: eq(sensitiveData.userId, userId)
    })
    
    if (!record) {
      throw new NotFoundError('Sensitive data', userId)
    }
    
    const decrypted = this.encryption.decrypt({
      encrypted: record.encryptedData,
      iv: record.iv,
      authTag: record.authTag
    })
    
    return JSON.parse(decrypted)
  }
}
```

### 2. Password Hashing

```typescript
import bcrypt from 'bcrypt'
import { z } from 'zod'

// Password validation schema
export const PasswordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character')

export class PasswordService {
  private readonly saltRounds = 12
  
  async hashPassword(password: string): Promise<string> {
    // Validate password strength
    PasswordSchema.parse(password)
    
    return bcrypt.hash(password, this.saltRounds)
  }
  
  async verifyPassword(
    password: string,
    hashedPassword: string
  ): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword)
  }
  
  async needsRehash(hashedPassword: string): Promise<boolean> {
    // Check if hash was created with current salt rounds
    const rounds = bcrypt.getRounds(hashedPassword)
    return rounds < this.saltRounds
  }
}

// Usage in authentication
class AuthService extends BaseAPIService {
  private passwords = new PasswordService()
  
  async login(email: string, password: string) {
    const user = await db.query.users.findFirst({
      where: eq(users.email, email)
    })
    
    if (!user) {
      // Prevent timing attacks by still hashing
      await this.passwords.verifyPassword(password, '$2b$12$dummy')
      throw new UnauthorizedError('Invalid credentials')
    }
    
    const isValid = await this.passwords.verifyPassword(
      password,
      user.passwordHash
    )
    
    if (!isValid) {
      await this.recordFailedLogin(user.id)
      throw new UnauthorizedError('Invalid credentials')
    }
    
    // Check if password needs rehashing
    if (await this.passwords.needsRehash(user.passwordHash)) {
      const newHash = await this.passwords.hashPassword(password)
      await db.update(users)
        .set({ passwordHash: newHash })
        .where(eq(users.id, user.id))
    }
    
    return this.createSession(user)
  }
  
  private async recordFailedLogin(userId: string) {
    await this.recordEvent(
      'login_failed',
      'Failed login attempt',
      { userId, timestamp: new Date() }
    )
    
    // Check for brute force
    const recentFailures = await this.getRecentFailedLogins(userId)
    
    if (recentFailures >= 5) {
      await this.lockAccount(userId)
      throw new ForbiddenError('Account locked due to multiple failed attempts')
    }
  }
}
```

## Security Headers

```typescript
// middleware/security-headers.ts
export function securityHeaders(response: NextResponse): NextResponse {
  // Prevent clickjacking
  response.headers.set('X-Frame-Options', 'DENY')
  
  // Prevent MIME type sniffing
  response.headers.set('X-Content-Type-Options', 'nosniff')
  
  // Enable XSS filter
  response.headers.set('X-XSS-Protection', '1; mode=block')
  
  // Control referrer information
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  
  // Content Security Policy
  response.headers.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self'",
      "connect-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'"
    ].join('; ')
  )
  
  // Permissions Policy
  response.headers.set(
    'Permissions-Policy',
    [
      'camera=()',
      'microphone=()',
      'geolocation=()',
      'payment=()'
    ].join(', ')
  )
  
  // HSTS (only in production)
  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    )
  }
  
  return response
}
```

## Audit Logging

```typescript
class AuditLogger extends BaseAPIService {
  async logSecurityEvent(
    event: SecurityEvent,
    context: RequestContext
  ) {
    await this.executeDatabase('logAuditEvent', async () => {
      await db.insert(auditLogs).values({
        id: crypto.randomUUID(),
        timestamp: new Date(),
        eventType: event.type,
        severity: event.severity,
        userId: context.userId,
        sessionId: context.sessionId,
        ipAddress: context.headers['x-forwarded-for'] || 'unknown',
        userAgent: context.headers['user-agent'],
        requestId: context.requestId,
        resource: event.resource,
        action: event.action,
        result: event.result,
        metadata: event.metadata
      })
    })
    
    // Alert on critical events
    if (event.severity === 'critical') {
      await this.alertSecurityTeam(event)
    }
  }
  
  private async alertSecurityTeam(event: SecurityEvent) {
    // Send to monitoring service
    await observability.events.collector.collectEvent(
      'security_alert',
      'critical',
      `Critical security event: ${event.type}`,
      event,
      'security',
      ['alert', 'critical']
    )
  }
}

// Usage
await auditLogger.logSecurityEvent({
  type: 'unauthorized_access_attempt',
  severity: 'high',
  resource: '/api/admin/users',
  action: 'DELETE',
  result: 'blocked',
  metadata: {
    reason: 'Insufficient permissions',
    requiredRole: 'admin',
    userRoles: ['user']
  }
}, context)
```

## Security Checklist

### Authentication & Authorization
- [ ] Strong password requirements enforced
- [ ] Passwords hashed with bcrypt (12+ rounds)
- [ ] JWT tokens have expiration
- [ ] Session management implemented
- [ ] Role-based access control (RBAC)
- [ ] API key management for service accounts
- [ ] Multi-factor authentication (MFA) supported

### Input Validation
- [ ] All inputs validated with Zod schemas
- [ ] SQL injection prevention via parameterized queries
- [ ] XSS prevention via output encoding
- [ ] File upload restrictions (type, size)
- [ ] Path traversal prevention
- [ ] Command injection prevention

### Rate Limiting & DoS Protection
- [ ] Rate limiting on all endpoints
- [ ] Different limits for authenticated/anonymous
- [ ] Distributed rate limiting with Redis
- [ ] Request size limits
- [ ] Timeout configurations
- [ ] Connection limits

### Data Security
- [ ] Sensitive data encrypted at rest
- [ ] TLS/HTTPS enforced
- [ ] Secure session storage
- [ ] PII data minimization
- [ ] Data retention policies
- [ ] Secure data deletion

### Security Headers
- [ ] CSP headers configured
- [ ] HSTS enabled (production)
- [ ] X-Frame-Options set
- [ ] X-Content-Type-Options set
- [ ] Referrer-Policy configured
- [ ] Permissions-Policy set

### Monitoring & Compliance
- [ ] Security event logging
- [ ] Failed login monitoring
- [ ] Anomaly detection
- [ ] Regular security audits
- [ ] Dependency scanning
- [ ] Compliance reporting (GDPR, etc.)