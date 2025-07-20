# Base API Handler

The BaseAPIHandler provides consistent request handling, validation, and response formatting for all API routes with automatic error handling and observability.

## Overview

BaseAPIHandler is a utility class that:
- Wraps route handlers with error handling
- Validates request bodies and query parameters
- Provides authentication checking
- Formats responses consistently
- Records metrics automatically
- Generates request IDs for tracing

## Basic Usage

### Simple GET Handler

```typescript
import { BaseAPIHandler } from '@/lib/api/base'

export const GET = BaseAPIHandler.GET(async (context) => {
  // Access request context
  const { userId, requestId, query } = context
  
  // Your business logic
  const data = await fetchData(query.id)
  
  // Return data (automatically wrapped in success response)
  return data
})
```

### POST Handler with Validation

```typescript
import { BaseAPIHandler } from '@/lib/api/base'
import { z } from 'zod'

const CreateUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
  age: z.number().min(18)
})

export const POST = BaseAPIHandler.POST(async (context) => {
  // Validate request body
  const data = await BaseAPIHandler.validateBody(
    context.request,
    CreateUserSchema
  )
  
  // Create user with validated data
  const user = await userService.create(data, context)
  
  return user
})
```

### Protected Route

```typescript
export const PUT = BaseAPIHandler.PUT(
  async (context) => {
    // context.userId is guaranteed to be present
    const { userId } = context
    
    const data = await BaseAPIHandler.validateBody(
      context.request,
      UpdateProfileSchema
    )
    
    return await userService.updateProfile(userId, data)
  },
  { requireAuth: true } // Requires authentication
)
```

## Request Context

The handler provides a rich context object:

```typescript
interface RequestContext {
  userId?: string        // Present when authenticated
  sessionId?: string     // Session identifier
  requestId: string      // Unique request ID (UUID)
  method: string         // HTTP method
  path: string          // Request path
  query: Record<string, string>  // Query parameters
  headers: Record<string, string> // Request headers
}
```

## HTTP Method Handlers

BaseAPIHandler provides convenience methods for all HTTP verbs:

```typescript
// GET requests
export const GET = BaseAPIHandler.GET(async (context) => {
  return await fetchResource(context.query.id)
})

// POST requests
export const POST = BaseAPIHandler.POST(async (context) => {
  const data = await BaseAPIHandler.validateBody(context.request, Schema)
  return await createResource(data)
})

// PUT requests
export const PUT = BaseAPIHandler.PUT(async (context) => {
  const data = await BaseAPIHandler.validateBody(context.request, Schema)
  return await updateResource(context.query.id, data)
})

// DELETE requests
export const DELETE = BaseAPIHandler.DELETE(async (context) => {
  await deleteResource(context.query.id)
  return null // Returns 204 No Content
})

// PATCH requests
export const PATCH = BaseAPIHandler.PATCH(async (context) => {
  const data = await BaseAPIHandler.validateBody(context.request, PatchSchema)
  return await patchResource(context.query.id, data)
})
```

## Validation

### Body Validation

```typescript
const CreateProductSchema = z.object({
  name: z.string().min(1).max(100),
  price: z.number().positive(),
  category: z.enum(['electronics', 'clothing', 'food']),
  tags: z.array(z.string()).optional()
})

export const POST = BaseAPIHandler.POST(async (context) => {
  const product = await BaseAPIHandler.validateBody(
    context.request,
    CreateProductSchema
  )
  
  // product is fully typed based on schema
  console.log(product.name) // string
  console.log(product.price) // number
  console.log(product.tags) // string[] | undefined
  
  return await productService.create(product)
})
```

### Query Parameter Validation

```typescript
const ListProductsSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  category: z.enum(['electronics', 'clothing', 'food']).optional(),
  search: z.string().optional()
})

export const GET = BaseAPIHandler.GET(async (context) => {
  const params = BaseAPIHandler.validateQuery(
    new URLSearchParams(context.query),
    ListProductsSchema
  )
  
  // params is fully typed
  const products = await productService.list({
    page: params.page,
    limit: params.limit,
    filters: {
      category: params.category,
      search: params.search
    }
  })
  
  return products
})
```

### Validation Error Responses

Validation errors are automatically formatted:

```json
{
  "success": false,
  "error": "Validation failed",
  "code": "VALIDATION_ERROR",
  "statusCode": 400,
  "details": [
    {
      "field": "email",
      "message": "Invalid email",
      "code": "invalid_string"
    },
    {
      "field": "age",
      "message": "Number must be greater than or equal to 18",
      "code": "too_small"
    }
  ],
  "timestamp": "2024-01-20T10:30:00.000Z"
}
```

## Authentication

### Basic Authentication

```typescript
export const GET = BaseAPIHandler.GET(
  async (context) => {
    // context.userId is guaranteed to exist
    const { userId } = context
    
    return await userService.getProfile(userId)
  },
  { requireAuth: true }
)
```

### Custom Authentication Logic

Override the default authentication check:

```typescript
class CustomAPIHandler extends BaseAPIHandler {
  static async checkAuth(request: NextRequest) {
    const apiKey = request.headers.get('x-api-key')
    
    if (!apiKey) {
      return { isAuthenticated: false }
    }
    
    const keyData = await validateApiKey(apiKey)
    
    return {
      isAuthenticated: true,
      userId: keyData.userId,
      sessionId: keyData.sessionId
    }
  }
}

export const GET = CustomAPIHandler.GET(
  async (context) => {
    return await fetchUserData(context.userId)
  },
  { requireAuth: true }
)
```

## Error Handling

All errors are automatically caught and formatted:

```typescript
export const GET = BaseAPIHandler.GET(async (context) => {
  const { id } = context.query
  
  // Throwing BaseAPIError
  if (!id) {
    throw new ValidationError('ID is required')
  }
  
  // Service might throw NotFoundError
  const user = await userService.getUser(id)
  
  // Any other error becomes 500
  const data = await riskyOperation()
  
  return data
})
```

Error response format:

```json
{
  "success": false,
  "error": "User with id 123 not found",
  "code": "NOT_FOUND",
  "statusCode": 404,
  "timestamp": "2024-01-20T10:30:00.000Z",
  "meta": {
    "requestId": "550e8400-e29b-41d4-a716-446655440000",
    "version": "1.0.0"
  }
}
```

## Response Formatting

Successful responses are automatically wrapped:

```typescript
// Handler returns raw data
export const GET = BaseAPIHandler.GET(async (context) => {
  return { id: '123', name: 'John Doe' }
})

// Client receives formatted response
{
  "success": true,
  "data": {
    "id": "123",
    "name": "John Doe"
  },
  "meta": {
    "timestamp": "2024-01-20T10:30:00.000Z",
    "version": "1.0.0",
    "requestId": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

## Advanced Usage

### Rate Limiting

```typescript
export const POST = BaseAPIHandler.POST(
  async (context) => {
    // Check rate limit
    const rateLimitKey = `api:${context.userId}:create`
    const limit = await rateLimiter.check(rateLimitKey, {
      requests: 10,
      window: '1m'
    })
    
    if (!limit.allowed) {
      throw new RateLimitError(limit.retryAfter)
    }
    
    return await createResource(context)
  },
  { 
    requireAuth: true,
    rateLimit: { requests: 10, window: '1m' }
  }
)
```

### File Uploads

```typescript
export const POST = BaseAPIHandler.POST(async (context) => {
  const formData = await context.request.formData()
  const file = formData.get('file') as File
  
  if (!file) {
    throw new ValidationError('File is required')
  }
  
  // Validate file
  if (file.size > 10 * 1024 * 1024) { // 10MB
    throw new ValidationError('File too large')
  }
  
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif']
  if (!allowedTypes.includes(file.type)) {
    throw new ValidationError('Invalid file type')
  }
  
  // Process file
  const url = await uploadService.upload(file, context.userId)
  
  return { url }
})
```

### Streaming Responses

```typescript
export const GET = BaseAPIHandler.GET(async (context) => {
  const stream = new ReadableStream({
    async start(controller) {
      for (let i = 0; i < 100; i++) {
        controller.enqueue(`data: ${JSON.stringify({ count: i })}\n\n`)
        await new Promise(resolve => setTimeout(resolve, 100))
      }
      controller.close()
    }
  })
  
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    }
  })
})
```

### Middleware Pattern

```typescript
const withCors = (handler: Function) => {
  return async (request: NextRequest, params?: any) => {
    const response = await handler(request, params)
    
    response.headers.set('Access-Control-Allow-Origin', '*')
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type')
    
    return response
  }
}

export const GET = withCors(
  BaseAPIHandler.GET(async (context) => {
    return await fetchPublicData()
  })
)
```

## Metrics and Observability

### Automatic Metrics

Every request automatically records:

```typescript
// HTTP request duration by method, path, and status
observability.metrics.httpRequestDuration(
  duration,
  method,
  path,
  statusCode
)
```

### Custom Headers

Response includes timing and request ID headers:

```
X-Request-ID: 550e8400-e29b-41d4-a716-446655440000
X-Response-Time: 125ms
```

## Testing

```typescript
import { describe, it, expect } from 'vitest'
import { GET, POST } from './route'
import { NextRequest } from 'next/server'

describe('API Route', () => {
  it('should handle GET request', async () => {
    const request = new NextRequest('http://localhost/api/users?id=123')
    const response = await GET(request)
    const data = await response.json()
    
    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data).toBeDefined()
  })

  it('should validate POST body', async () => {
    const request = new NextRequest('http://localhost/api/users', {
      method: 'POST',
      body: JSON.stringify({ email: 'invalid' })
    })
    
    const response = await POST(request)
    const data = await response.json()
    
    expect(response.status).toBe(400)
    expect(data.code).toBe('VALIDATION_ERROR')
    expect(data.details).toBeDefined()
  })

  it('should require authentication', async () => {
    const request = new NextRequest('http://localhost/api/profile')
    const response = await GET(request)
    
    expect(response.status).toBe(401)
    expect(await response.json()).toMatchObject({
      success: false,
      code: 'AUTHENTICATION_REQUIRED'
    })
  })
})
```

## Best Practices

1. **Always validate input** - Use Zod schemas for type-safe validation
2. **Use appropriate HTTP methods** - GET for reading, POST for creating, etc.
3. **Return consistent responses** - Let BaseAPIHandler format responses
4. **Handle errors appropriately** - Throw specific error types
5. **Add authentication where needed** - Use requireAuth option
6. **Include rate limiting** - Protect endpoints from abuse
7. **Log important operations** - Use context.requestId for correlation
8. **Test error scenarios** - Ensure proper error handling
9. **Document API endpoints** - Include request/response examples
10. **Monitor performance** - Track slow endpoints via metrics