# Getting Started with Base API Infrastructure

This guide will help you quickly get started with the base API infrastructure for building consistent, well-structured API routes.

## Quick Start

### 1. Create a Simple API Route

```typescript
// app/api/hello/route.ts
import { BaseAPIHandler, ResponseBuilder } from '@/lib/api/base'

export const GET = BaseAPIHandler.GET(async (context) => {
  return { message: 'Hello, World!', requestId: context.requestId }
})
```

This creates a GET endpoint that:
- Automatically handles errors
- Formats the response consistently
- Adds request tracking
- Records metrics

### 2. Add Request Validation

```typescript
// app/api/users/route.ts
import { BaseAPIHandler, ResponseBuilder, ValidationError } from '@/lib/api/base'
import { z } from 'zod'

const CreateUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2).max(100),
  age: z.number().int().min(18)
})

export const POST = BaseAPIHandler.POST(async (context) => {
  // Validate request body
  const userData = await BaseAPIHandler.validateBody(
    context.request,
    CreateUserSchema
  )
  
  // Create user (validation errors are handled automatically)
  const user = await createUser(userData)
  
  return ResponseBuilder.created(user, 'User created successfully')
})
```

### 3. Create a Service Layer

```typescript
// services/user-service.ts
import { BaseAPIService, NotFoundError, ConflictError } from '@/lib/api/base'
import { users } from '@/db/schema'
import { db } from '@/db/config'

export class UserService extends BaseAPIService {
  constructor() {
    super({ serviceName: 'users' })
  }

  async createUser(data: CreateUserData, context: ServiceContext) {
    return this.executeWithTracing('createUser', context, async (span) => {
      // Check if email already exists
      const existing = await db.query.users.findFirst({
        where: eq(users.email, data.email)
      })
      
      if (existing) {
        throw new ConflictError('Email already registered')
      }
      
      // Create user
      const user = await this.executeDatabase('insertUser', async () => {
        const [result] = await db.insert(users).values({
          ...data,
          id: crypto.randomUUID(),
          createdAt: new Date()
        }).returning()
        
        return result
      })
      
      // Record event
      await this.recordEvent(
        'user_created',
        `New user registered: ${user.email}`,
        { userId: user.id }
      )
      
      return user
    })
  }

  async getUser(id: string, context: ServiceContext) {
    return this.executeWithTracing('getUser', context, async (span) => {
      const user = await db.query.users.findFirst({
        where: eq(users.id, id)
      })
      
      if (!user) {
        throw new NotFoundError('User', id)
      }
      
      return user
    })
  }
}

export const userService = new UserService()
```

### 4. Complete API Route with Service

```typescript
// app/api/users/route.ts
import { BaseAPIHandler, ResponseBuilder } from '@/lib/api/base'
import { userService } from '@/services/user-service'
import { CreateUserSchema } from '@/schemas/users'

export const GET = BaseAPIHandler.GET(async (context) => {
  const { id } = context.query
  
  if (id) {
    // Get single user
    const user = await userService.getUser(id, context)
    return ResponseBuilder.success(user)
  }
  
  // Get all users with pagination
  const { page = '1', limit = '20' } = context.query
  const users = await userService.getAllUsers({
    page: Number(page),
    limit: Number(limit)
  }, context)
  
  return ResponseBuilder.fromQueryResult(users)
})

export const POST = BaseAPIHandler.POST(async (context) => {
  const data = await BaseAPIHandler.validateBody(
    context.request,
    CreateUserSchema
  )
  
  const user = await userService.createUser(data, context)
  
  return ResponseBuilder.created(user)
})
```

## Step-by-Step Tutorial

### Step 1: Understanding the Architecture

The base infrastructure follows a layered approach:

```
┌─────────────────────┐
│   Route Handler     │  ← Your API endpoint (GET, POST, etc.)
├─────────────────────┤
│  BaseAPIHandler     │  ← Handles requests, validation, errors
├─────────────────────┤
│   Service Layer     │  ← Business logic (extends BaseAPIService)
├─────────────────────┤
│   QueryBuilder      │  ← Database queries
├─────────────────────┤
│    Database         │  ← Drizzle ORM
└─────────────────────┘
```

### Step 2: Create Your First Endpoint

1. Create a new route file:

```typescript
// app/api/products/route.ts
import { BaseAPIHandler } from '@/lib/api/base'

export const GET = BaseAPIHandler.GET(async (context) => {
  // Simple response
  return {
    products: [
      { id: '1', name: 'Product 1', price: 99.99 },
      { id: '2', name: 'Product 2', price: 149.99 }
    ]
  }
})
```

2. Test your endpoint:

```bash
curl http://localhost:3000/api/products
```

Response:
```json
{
  "success": true,
  "data": {
    "products": [
      { "id": "1", "name": "Product 1", "price": 99.99 },
      { "id": "2", "name": "Product 2", "price": 149.99 }
    ]
  },
  "meta": {
    "timestamp": "2024-01-20T10:30:00.000Z",
    "version": "1.0.0",
    "requestId": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

### Step 3: Add Database Integration

1. Create a service:

```typescript
// services/product-service.ts
import { BaseAPIService, createQueryBuilder } from '@/lib/api/base'
import { products } from '@/db/schema'

class ProductService extends BaseAPIService {
  constructor() {
    super({ serviceName: 'products' })
  }

  async getProducts(filters: any, context: ServiceContext) {
    return this.executeWithTracing('getProducts', context, async (span) => {
      const query = createQueryBuilder(products)
        .filter(filters)
        .orderBy(products.createdAt, 'desc')
        .paginate(filters.page || 1, filters.limit || 20)
      
      return await query.executePaginated()
    })
  }
}

export const productService = new ProductService()
```

2. Update your route:

```typescript
// app/api/products/route.ts
import { BaseAPIHandler, ResponseBuilder } from '@/lib/api/base'
import { productService } from '@/services/product-service'

export const GET = BaseAPIHandler.GET(async (context) => {
  const filters = {
    page: Number(context.query.page || 1),
    limit: Number(context.query.limit || 20),
    category: context.query.category
  }
  
  const result = await productService.getProducts(filters, context)
  
  return ResponseBuilder.fromQueryResult(result)
})
```

### Step 4: Add Error Handling

Errors are handled automatically, but you can throw specific errors:

```typescript
import { NotFoundError, ValidationError, ForbiddenError } from '@/lib/api/base'

export const GET = BaseAPIHandler.GET(async (context) => {
  const { id } = context.query
  
  if (!id) {
    throw new ValidationError('Product ID is required')
  }
  
  const product = await productService.getProduct(id, context)
  
  if (!product) {
    throw new NotFoundError('Product', id)
  }
  
  if (product.isRestricted && !context.userId) {
    throw new ForbiddenError('This product requires authentication')
  }
  
  return ResponseBuilder.success(product)
})
```

### Step 5: Add Authentication

Protect routes that require authentication:

```typescript
export const POST = BaseAPIHandler.POST(
  async (context) => {
    // context.userId is guaranteed to exist
    const { userId } = context
    
    const data = await BaseAPIHandler.validateBody(
      context.request,
      CreateProductSchema
    )
    
    const product = await productService.createProduct({
      ...data,
      ownerId: userId
    }, context)
    
    return ResponseBuilder.created(product)
  },
  { requireAuth: true } // Enable authentication
)
```

## Common Patterns

### List Endpoint with Filtering

```typescript
export const GET = BaseAPIHandler.GET(async (context) => {
  const {
    page = '1',
    limit = '20',
    search,
    category,
    minPrice,
    maxPrice,
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = context.query
  
  const result = await productService.searchProducts({
    pagination: {
      page: Number(page),
      limit: Number(limit)
    },
    filters: {
      search,
      category,
      minPrice: minPrice ? Number(minPrice) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined
    },
    sorting: {
      field: sortBy,
      order: sortOrder as 'asc' | 'desc'
    }
  }, context)
  
  return ResponseBuilder.fromQueryResult(result)
})
```

### CRUD Operations

```typescript
// GET - List or single item
export const GET = BaseAPIHandler.GET(async (context) => {
  const { id } = context.query
  
  if (id) {
    const item = await service.getById(id, context)
    return ResponseBuilder.success(item)
  }
  
  const items = await service.getAll(context.query, context)
  return ResponseBuilder.fromQueryResult(items)
})

// POST - Create new item
export const POST = BaseAPIHandler.POST(async (context) => {
  const data = await BaseAPIHandler.validateBody(
    context.request,
    CreateSchema
  )
  
  const item = await service.create(data, context)
  return ResponseBuilder.created(item)
})

// PUT - Update entire item
export const PUT = BaseAPIHandler.PUT(async (context) => {
  const { id } = context.query
  const data = await BaseAPIHandler.validateBody(
    context.request,
    UpdateSchema
  )
  
  const item = await service.update(id, data, context)
  return ResponseBuilder.updated(item)
})

// PATCH - Partial update
export const PATCH = BaseAPIHandler.PATCH(async (context) => {
  const { id } = context.query
  const data = await BaseAPIHandler.validateBody(
    context.request,
    PatchSchema
  )
  
  const item = await service.patch(id, data, context)
  return ResponseBuilder.updated(item)
})

// DELETE - Remove item
export const DELETE = BaseAPIHandler.DELETE(async (context) => {
  const { id } = context.query
  
  await service.delete(id, context)
  return ResponseBuilder.deleted()
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
    operations.map(op => service.processOperation(op, context))
  )
  
  const formatted = results.map((result, index) => ({
    success: result.status === 'fulfilled',
    data: result.status === 'fulfilled' ? result.value : undefined,
    error: result.status === 'rejected' ? result.reason.message : undefined,
    index
  }))
  
  return ResponseBuilder.batch(formatted)
})
```

## Next Steps

1. **Read the detailed guides**:
   - [Base API Errors](./base-api-errors.md) - Error handling patterns
   - [Base API Service](./base-api-service.md) - Service layer patterns
   - [Query Builder](./query-builder.md) - Database query patterns
   - [Response Builder](./response-builder.md) - Response formatting

2. **Explore advanced topics**:
   - [Migration Guide](./migration-guide.md) - Migrate existing routes
   - [Testing Patterns](./testing-patterns.md) - Test your APIs
   - [Performance Optimization](./performance-optimization.md) - Optimize performance
   - [Security Patterns](./security-patterns.md) - Secure your APIs

3. **Check examples**:
   - Look at existing routes in `app/api/` for real examples
   - Review service implementations in `services/`
   - See schema definitions in `schemas/`

## Troubleshooting

### Common Issues

1. **"ValidationError is not defined"**
   - Import from `@/lib/api/base`

2. **"Context is undefined"**
   - Ensure you're using BaseAPIHandler wrapper

3. **"Cannot read property 'userId' of undefined"**
   - Add `requireAuth: true` to handler options

4. **Type errors with query parameters**
   - Query params are strings, convert as needed: `Number(context.query.page)`

5. **Database errors not formatted**
   - Use `executeDatabase` method in services

### Getting Help

- Check the troubleshooting section in each guide
- Review the test files for usage examples
- Look at existing implementations in the codebase