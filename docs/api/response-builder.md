# Response Builder

The ResponseBuilder provides consistent API response formatting with metadata, pagination support, and standardized error responses.

## Overview

ResponseBuilder is a utility class that:
- Formats all API responses consistently
- Adds metadata automatically (timestamps, request IDs, version)
- Provides specialized response types (paginated, created, deleted, etc.)
- Ensures uniform error response structure
- Supports batch operation responses

## Response Formats

### Success Response

```typescript
import { ResponseBuilder } from '@/lib/api/base'

// Basic success response
const response = ResponseBuilder.success({
  id: '123',
  name: 'John Doe',
  email: 'john@example.com'
})

// Returns:
{
  "success": true,
  "data": {
    "id": "123",
    "name": "John Doe",
    "email": "john@example.com"
  },
  "meta": {
    "timestamp": "2024-01-20T10:30:00.000Z",
    "version": "1.0.0",
    "requestId": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

### Success with Message

```typescript
const response = ResponseBuilder.success(
  { id: '123', status: 'active' },
  'User activated successfully'
)

// Returns:
{
  "success": true,
  "data": { "id": "123", "status": "active" },
  "message": "User activated successfully",
  "meta": {
    "timestamp": "2024-01-20T10:30:00.000Z",
    "version": "1.0.0",
    "requestId": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

### Error Response

```typescript
import { BaseAPIError, ResponseBuilder } from '@/lib/api/base'

const error = new BaseAPIError('User not found', {
  statusCode: 404,
  code: 'USER_NOT_FOUND',
  details: { userId: '123' }
})

const response = ResponseBuilder.error(error)

// Returns:
{
  "success": false,
  "error": "User not found",
  "code": "USER_NOT_FOUND",
  "statusCode": 404,
  "details": { "userId": "123" },
  "timestamp": "2024-01-20T10:30:00.000Z",
  "meta": {
    "requestId": "550e8400-e29b-41d4-a716-446655440000",
    "version": "1.0.0"
  }
}
```

## Specialized Response Types

### Paginated Response

```typescript
const items = [
  { id: '1', name: 'Product 1' },
  { id: '2', name: 'Product 2' }
]

const response = ResponseBuilder.paginated(
  items,
  {
    page: 2,
    limit: 20,
    total: 150,
    totalPages: 8,
    hasNext: true,
    hasPrev: true
  },
  'Products retrieved successfully'
)

// Returns:
{
  "success": true,
  "data": [
    { "id": "1", "name": "Product 1" },
    { "id": "2", "name": "Product 2" }
  ],
  "message": "Products retrieved successfully",
  "pagination": {
    "page": 2,
    "limit": 20,
    "total": 150,
    "totalPages": 8,
    "hasNext": true,
    "hasPrev": true
  },
  "meta": {
    "timestamp": "2024-01-20T10:30:00.000Z",
    "version": "1.0.0",
    "requestId": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

### Created Response

```typescript
const newUser = { id: '123', name: 'John Doe' }
const response = ResponseBuilder.created(newUser)

// Returns (with default message):
{
  "success": true,
  "data": { "id": "123", "name": "John Doe" },
  "message": "Resource created successfully",
  "meta": {
    "timestamp": "2024-01-20T10:30:00.000Z",
    "version": "1.0.0",
    "requestId": "550e8400-e29b-41d4-a716-446655440000"
  }
}

// Custom message
const response = ResponseBuilder.created(
  newUser,
  'User account created successfully'
)
```

### Updated Response

```typescript
const updatedUser = { id: '123', name: 'Jane Doe' }
const response = ResponseBuilder.updated(updatedUser)

// Returns (with default message):
{
  "success": true,
  "data": { "id": "123", "name": "Jane Doe" },
  "message": "Resource updated successfully",
  "meta": { ... }
}
```

### Deleted Response

```typescript
const response = ResponseBuilder.deleted()

// Returns (with default message):
{
  "success": true,
  "data": null,
  "message": "Resource deleted successfully",
  "meta": { ... }
}

// Custom message
const response = ResponseBuilder.deleted('User permanently deleted')
```

### No Content Response

```typescript
// For operations that succeed but return no data
const response = ResponseBuilder.noContent()

// Returns:
{
  "success": true,
  "data": null,
  "meta": { ... }
}
```

### Accepted Response

```typescript
// For async operations that are queued for processing
const response = ResponseBuilder.accepted({
  jobId: '456',
  status: 'queued',
  estimatedTime: '5 minutes'
})

// Returns:
{
  "success": true,
  "data": {
    "jobId": "456",
    "status": "queued",
    "estimatedTime": "5 minutes"
  },
  "message": "Request accepted for processing",
  "meta": { ... }
}
```

### Batch Response

```typescript
// For operations on multiple items with mixed results
const results = [
  { success: true, data: { id: '1', status: 'processed' } },
  { success: false, error: 'Invalid data for item 2' },
  { success: true, data: { id: '3', status: 'processed' } }
]

const response = ResponseBuilder.batch(results, 'Batch operation completed')

// Returns:
{
  "success": true,
  "data": {
    "succeeded": 2,
    "failed": 1,
    "results": [
      { "success": true, "data": { "id": "1", "status": "processed" } },
      { "success": false, "error": "Invalid data for item 2" },
      { "success": true, "data": { "id": "3", "status": "processed" } }
    ]
  },
  "message": "Batch operation completed",
  "meta": { ... }
}
```

## Integration with QueryBuilder

### From Query Result

```typescript
import { createQueryBuilder, ResponseBuilder } from '@/lib/api/base'

const queryResult = await createQueryBuilder(products)
  .filter({ category: 'electronics' })
  .paginate(1, 20)
  .executePaginated()

const response = ResponseBuilder.fromQueryResult(
  queryResult,
  'Products retrieved successfully'
)

// Automatically formats with pagination metadata
```

## Real-World Examples

### API Route Handler

```typescript
import { BaseAPIHandler, ResponseBuilder } from '@/lib/api/base'

export const GET = BaseAPIHandler.GET(async (context) => {
  const { page = 1, limit = 20, category } = context.query
  
  const products = await productService.getProducts({
    page: Number(page),
    limit: Number(limit),
    category
  })
  
  // Service returns paginated result
  return ResponseBuilder.fromQueryResult(products)
})

export const POST = BaseAPIHandler.POST(async (context) => {
  const data = await BaseAPIHandler.validateBody(
    context.request,
    CreateProductSchema
  )
  
  const product = await productService.createProduct(data)
  
  return ResponseBuilder.created(
    product,
    `Product "${product.name}" created successfully`
  )
})

export const DELETE = BaseAPIHandler.DELETE(async (context) => {
  const { id } = context.query
  
  await productService.deleteProduct(id)
  
  return ResponseBuilder.deleted(`Product ${id} deleted successfully`)
})
```

### Batch Operations

```typescript
export const POST = BaseAPIHandler.POST(async (context) => {
  const { operations } = await BaseAPIHandler.validateBody(
    context.request,
    BatchOperationSchema
  )
  
  const results = await Promise.allSettled(
    operations.map(async (op) => {
      try {
        const result = await processOperation(op)
        return { success: true, data: result }
      } catch (error) {
        return { 
          success: false, 
          error: error.message,
          details: { operationId: op.id }
        }
      }
    })
  )
  
  const formattedResults = results.map(r => 
    r.status === 'fulfilled' ? r.value : {
      success: false,
      error: 'Operation failed',
      details: r.reason
    }
  )
  
  return ResponseBuilder.batch(
    formattedResults,
    'Batch processing completed'
  )
})
```

### File Upload Response

```typescript
export const POST = BaseAPIHandler.POST(async (context) => {
  const formData = await context.request.formData()
  const files = formData.getAll('files') as File[]
  
  const uploadResults = await Promise.all(
    files.map(async (file) => {
      try {
        const url = await uploadService.upload(file)
        return {
          success: true,
          data: {
            filename: file.name,
            size: file.size,
            url
          }
        }
      } catch (error) {
        return {
          success: false,
          error: `Failed to upload ${file.name}: ${error.message}`
        }
      }
    })
  )
  
  return ResponseBuilder.batch(
    uploadResults,
    `Uploaded ${uploadResults.filter(r => r.success).length} of ${files.length} files`
  )
})
```

### Search Results

```typescript
export const GET = BaseAPIHandler.GET(async (context) => {
  const { q, type, page = 1, limit = 20 } = context.query
  
  const results = await searchService.search({
    query: q,
    type,
    page: Number(page),
    limit: Number(limit)
  })
  
  // Add search metadata
  const response = ResponseBuilder.fromQueryResult(
    results,
    `Found ${results.pagination.total} results for "${q}"`
  )
  
  // Add custom metadata
  response.meta.searchQuery = q
  response.meta.searchType = type
  response.meta.processingTime = results.processingTime
  
  return response
})
```

## Custom Response Builders

### Extending ResponseBuilder

```typescript
class CustomResponseBuilder extends ResponseBuilder {
  static download(filename: string, data: Buffer, mimeType: string) {
    return new Response(data, {
      headers: {
        'Content-Type': mimeType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': data.length.toString(),
        'X-Request-ID': crypto.randomUUID()
      }
    })
  }
  
  static stream(stream: ReadableStream, contentType = 'text/event-stream') {
    return new Response(stream, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Request-ID': crypto.randomUUID()
      }
    })
  }
  
  static redirect(url: string, permanent = false) {
    return Response.redirect(url, permanent ? 301 : 302)
  }
}
```

### Domain-Specific Responses

```typescript
class AuthResponseBuilder extends ResponseBuilder {
  static loginSuccess(user: User, token: string) {
    return this.success(
      {
        user: {
          id: user.id,
          email: user.email,
          name: user.name
        },
        token,
        expiresIn: 3600
      },
      'Login successful'
    )
  }
  
  static logoutSuccess() {
    return this.success(
      null,
      'Logout successful'
    )
  }
  
  static tokenRefreshed(token: string, refreshToken: string) {
    return this.success(
      {
        token,
        refreshToken,
        expiresIn: 3600
      },
      'Token refreshed successfully'
    )
  }
}
```

## Testing Response Formats

```typescript
import { describe, it, expect } from 'vitest'
import { ResponseBuilder } from '@/lib/api/base'

describe('ResponseBuilder', () => {
  it('should create success response with metadata', () => {
    const data = { id: '123', name: 'Test' }
    const response = ResponseBuilder.success(data, 'Test successful')
    
    expect(response).toMatchObject({
      success: true,
      data,
      message: 'Test successful',
      meta: {
        timestamp: expect.any(String),
        version: '1.0.0',
        requestId: expect.any(String)
      }
    })
  })

  it('should create paginated response', () => {
    const items = [{ id: '1' }, { id: '2' }]
    const pagination = {
      page: 1,
      limit: 10,
      total: 2,
      totalPages: 1,
      hasNext: false,
      hasPrev: false
    }
    
    const response = ResponseBuilder.paginated(items, pagination)
    
    expect(response).toMatchObject({
      success: true,
      data: items,
      pagination,
      meta: expect.any(Object)
    })
  })

  it('should create batch response with statistics', () => {
    const results = [
      { success: true, data: { id: '1' } },
      { success: false, error: 'Failed' },
      { success: true, data: { id: '2' } }
    ]
    
    const response = ResponseBuilder.batch(results)
    
    expect(response.data).toMatchObject({
      succeeded: 2,
      failed: 1,
      results
    })
  })
})
```

## Best Practices

1. **Use appropriate response methods** - `created()` for POST, `updated()` for PUT, etc.
2. **Include meaningful messages** - Help clients understand what happened
3. **Be consistent** - Always use ResponseBuilder for all responses
4. **Add context to errors** - Include details that help debugging
5. **Use batch responses** - For operations on multiple items
6. **Include pagination metadata** - For list endpoints
7. **Keep response size reasonable** - Don't include unnecessary data
8. **Version your API** - Include version in meta for future compatibility
9. **Use request IDs** - For tracing and debugging
10. **Document response formats** - Include examples in API documentation

## Response Headers

ResponseBuilder works with BaseAPIHandler to add standard headers:

```
Content-Type: application/json
X-Request-ID: 550e8400-e29b-41d4-a716-446655440000
X-Response-Time: 125ms
X-API-Version: 1.0.0
```

Custom headers can be added:

```typescript
export const GET = BaseAPIHandler.GET(async (context) => {
  const data = await fetchData()
  const response = ResponseBuilder.success(data)
  
  // Add custom headers
  response.headers.set('X-Total-Count', '150')
  response.headers.set('X-Rate-Limit-Remaining', '99')
  
  return response
})
```