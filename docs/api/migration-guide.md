# Migration Guide

This guide helps you migrate existing API routes to use the base infrastructure patterns for better consistency, error handling, and observability.

## Migration Overview

The migration process involves:
1. Replacing custom error handling with BaseAPIError classes
2. Wrapping route handlers with BaseAPIHandler
3. Moving business logic to service classes
4. Using QueryBuilder for database operations
5. Replacing custom responses with ResponseBuilder

## Before and After Examples

### Simple Route Migration

**Before:**
```typescript
// app/api/users/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db/config'
import { users } from '@/db/schema'
import { eq } from 'drizzle-orm'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await db.query.users.findFirst({
      where: eq(users.id, params.id)
    })
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json(user)
  } catch (error) {
    console.error('Error fetching user:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

**After:**
```typescript
// app/api/users/[id]/route.ts
import { BaseAPIHandler, NotFoundError } from '@/lib/api/base'
import { userService } from '@/services/user-service'

export const GET = BaseAPIHandler.GET(async (context) => {
  const { id } = context.query
  
  const user = await userService.getUser(id, context)
  
  return user // Automatically wrapped in success response
})

// services/user-service.ts
import { BaseAPIService, NotFoundError } from '@/lib/api/base'
import { db } from '@/db/config'
import { users } from '@/db/schema'
import { eq } from 'drizzle-orm'

class UserService extends BaseAPIService {
  constructor() {
    super({ serviceName: 'users' })
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

### Route with Validation

**Before:**
```typescript
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Manual validation
    if (!body.email || !body.name) {
      return NextResponse.json(
        { error: 'Email and name are required' },
        { status: 400 }
      )
    }
    
    if (!body.email.includes('@')) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }
    
    // Check for duplicates
    const existing = await db.query.users.findFirst({
      where: eq(users.email, body.email)
    })
    
    if (existing) {
      return NextResponse.json(
        { error: 'Email already exists' },
        { status: 409 }
      )
    }
    
    // Create user
    const [user] = await db.insert(users).values({
      id: crypto.randomUUID(),
      email: body.email,
      name: body.name,
      createdAt: new Date()
    }).returning()
    
    return NextResponse.json(user, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    )
  }
}
```

**After:**
```typescript
import { BaseAPIHandler, ResponseBuilder } from '@/lib/api/base'
import { z } from 'zod'
import { userService } from '@/services/user-service'

const CreateUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100)
})

export const POST = BaseAPIHandler.POST(async (context) => {
  const data = await BaseAPIHandler.validateBody(
    context.request,
    CreateUserSchema
  )
  
  const user = await userService.createUser(data, context)
  
  return ResponseBuilder.created(user)
})

// In user-service.ts
async createUser(data: CreateUserData, context: ServiceContext) {
  return this.executeWithTracing('createUser', context, async (span) => {
    // Check for duplicates
    const existing = await db.query.users.findFirst({
      where: eq(users.email, data.email)
    })
    
    if (existing) {
      throw new ConflictError('Email already exists')
    }
    
    // Create user with error handling
    const user = await this.executeDatabase('insertUser', async () => {
      const [result] = await db.insert(users).values({
        id: crypto.randomUUID(),
        ...data,
        createdAt: new Date()
      }).returning()
      
      return result
    })
    
    await this.recordEvent(
      'user_created',
      `New user created: ${user.email}`,
      { userId: user.id }
    )
    
    return user
  })
}
```

### List Endpoint with Pagination

**Before:**
```typescript
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const search = searchParams.get('search') || ''
    
    const offset = (page - 1) * limit
    
    // Build query manually
    let query = db.select().from(products)
    
    if (search) {
      query = query.where(
        or(
          like(products.name, `%${search}%`),
          like(products.description, `%${search}%`)
        )
      )
    }
    
    // Get total count
    const countResult = await db.select({ count: sql`count(*)` })
      .from(products)
      .where(search ? or(
        like(products.name, `%${search}%`),
        like(products.description, `%${search}%`)
      ) : undefined)
    
    const total = countResult[0].count
    
    // Get paginated results
    const items = await query
      .limit(limit)
      .offset(offset)
      .orderBy(desc(products.createdAt))
    
    return NextResponse.json({
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    )
  }
}
```

**After:**
```typescript
import { BaseAPIHandler, ResponseBuilder, createQueryBuilder } from '@/lib/api/base'

export const GET = BaseAPIHandler.GET(async (context) => {
  const {
    page = '1',
    limit = '10',
    search = ''
  } = context.query
  
  const result = await productService.searchProducts({
    page: Number(page),
    limit: Number(limit),
    search
  }, context)
  
  return ResponseBuilder.fromQueryResult(result)
})

// In product-service.ts
async searchProducts(params: SearchParams, context: ServiceContext) {
  return this.executeWithTracing('searchProducts', context, async (span) => {
    const query = createQueryBuilder(products)
    
    if (params.search) {
      query.search(
        [products.name, products.description],
        params.search
      )
    }
    
    query
      .orderBy(products.createdAt, 'desc')
      .paginate(params.page, params.limit)
    
    const result = await query.executePaginated()
    
    span.setAttributes({
      'search.query': params.search,
      'search.results': result.items.length,
      'search.total': result.pagination.total
    })
    
    return result
  })
}
```

## Step-by-Step Migration Process

### Step 1: Identify Routes to Migrate

1. List all API routes in your application
2. Prioritize by:
   - High-traffic endpoints
   - Error-prone endpoints
   - Complex business logic
   - Public-facing APIs

### Step 2: Create Service Classes

For each domain area, create a service class:

```typescript
// services/product-service.ts
import { BaseAPIService, BaseCRUDService } from '@/lib/api/base'
import { products } from '@/db/schema'

export class ProductService extends BaseCRUDService<
  Product,
  CreateProductDTO,
  UpdateProductDTO
> {
  protected tableName = 'products'
  
  constructor() {
    super({ serviceName: 'products' })
  }
  
  // Implement required CRUD methods
  // Add domain-specific methods
}
```

### Step 3: Migrate Error Handling

Replace custom error responses:

```typescript
// Before
if (!user) {
  return NextResponse.json({ error: 'Not found' }, { status: 404 })
}

// After
if (!user) {
  throw new NotFoundError('User', userId)
}

// Before
if (error.code === '23505') {
  return NextResponse.json({ error: 'Duplicate entry' }, { status: 409 })
}

// After
if (error.code === '23505') {
  throw new ConflictError('Email already exists')
}
```

### Step 4: Migrate Validation

Replace manual validation with Zod schemas:

```typescript
// Before
if (!body.email || !isValidEmail(body.email)) {
  return NextResponse.json({ error: 'Invalid email' }, { status: 400 })
}

// After
const Schema = z.object({
  email: z.string().email()
})

const data = await BaseAPIHandler.validateBody(request, Schema)
```

### Step 5: Migrate Response Formatting

Replace custom responses with ResponseBuilder:

```typescript
// Before
return NextResponse.json({
  success: true,
  data: products,
  total: count,
  page,
  pageSize: limit
})

// After
return ResponseBuilder.paginated(products, {
  page,
  limit,
  total: count,
  totalPages: Math.ceil(count / limit),
  hasNext: page < Math.ceil(count / limit),
  hasPrev: page > 1
})
```

### Step 6: Add Observability

Wrap service methods with tracing:

```typescript
// Before
async function getProduct(id: string) {
  const product = await db.query.products.findFirst({
    where: eq(products.id, id)
  })
  return product
}

// After
async getProduct(id: string, context: ServiceContext) {
  return this.executeWithTracing('getProduct', context, async (span) => {
    const product = await db.query.products.findFirst({
      where: eq(products.id, id)
    })
    
    if (!product) {
      throw new NotFoundError('Product', id)
    }
    
    span.setAttributes({
      'product.id': id,
      'product.category': product.category
    })
    
    return product
  })
}
```

## Migration Checklist

For each route, ensure:

- [ ] Route handler wrapped with BaseAPIHandler
- [ ] Request validation using Zod schemas
- [ ] Business logic moved to service class
- [ ] Service extends BaseAPIService
- [ ] Database operations use executeDatabase
- [ ] Errors use appropriate BaseAPIError classes
- [ ] Responses use ResponseBuilder
- [ ] Tracing added via executeWithTracing
- [ ] Events recorded for important operations
- [ ] Authentication added where needed
- [ ] Tests updated to match new patterns

## Common Migration Patterns

### Error Mapping

```typescript
// Create a helper for database error mapping
function mapDatabaseError(error: any): BaseAPIError {
  // PostgreSQL error codes
  switch (error.code) {
    case '23505': // unique_violation
      return new ConflictError('Resource already exists')
    case '23503': // foreign_key_violation
      return new ValidationError('Invalid reference')
    case '23502': // not_null_violation
      return new ValidationError('Required field missing')
    default:
      return new DatabaseError('Database operation failed', error)
  }
}

// Use in service
try {
  const result = await db.insert(table).values(data)
  return result
} catch (error) {
  throw mapDatabaseError(error)
}
```

### Authentication Migration

```typescript
// Before
export async function GET(request: NextRequest) {
  const token = request.headers.get('authorization')
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  const user = await validateToken(token)
  if (!user) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }
  
  // ... rest of handler
}

// After
export const GET = BaseAPIHandler.GET(
  async (context) => {
    // context.userId is guaranteed to exist
    const { userId } = context
    
    // ... rest of handler
  },
  { requireAuth: true }
)
```

### Query Parameter Validation

```typescript
// Before
const page = parseInt(searchParams.get('page') || '1')
const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)
const sortBy = searchParams.get('sortBy') || 'createdAt'

if (page < 1 || limit < 1) {
  return NextResponse.json({ error: 'Invalid pagination' }, { status: 400 })
}

// After
const QuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  sortBy: z.enum(['createdAt', 'name', 'price']).default('createdAt')
})

const params = BaseAPIHandler.validateQuery(
  new URLSearchParams(context.query),
  QuerySchema
)
```

## Testing After Migration

Update your tests to work with the new patterns:

```typescript
// Before
describe('GET /api/users/[id]', () => {
  it('should return 404 for non-existent user', async () => {
    const response = await GET(
      new NextRequest('http://localhost/api/users/999'),
      { params: { id: '999' } }
    )
    
    expect(response.status).toBe(404)
    const data = await response.json()
    expect(data.error).toBe('User not found')
  })
})

// After
describe('GET /api/users/[id]', () => {
  it('should return 404 for non-existent user', async () => {
    vi.mocked(userService.getUser).mockRejectedValue(
      new NotFoundError('User', '999')
    )
    
    const response = await GET(
      new NextRequest('http://localhost/api/users?id=999')
    )
    
    expect(response.status).toBe(404)
    const data = await response.json()
    expect(data).toMatchObject({
      success: false,
      code: 'NOT_FOUND',
      error: 'User with id 999 not found'
    })
  })
})
```

## Gradual Migration Strategy

1. **Phase 1: Critical Routes**
   - Migrate high-traffic endpoints first
   - Focus on routes with frequent errors
   - Start with read-only endpoints

2. **Phase 2: CRUD Operations**
   - Migrate create/update/delete endpoints
   - Implement proper validation
   - Add transaction support

3. **Phase 3: Complex Business Logic**
   - Migrate routes with complex queries
   - Add caching where appropriate
   - Implement batch operations

4. **Phase 4: Optimization**
   - Add performance monitoring
   - Implement query optimization
   - Add response caching

## Rollback Plan

If issues arise during migration:

1. Keep old route handlers in separate files
2. Use feature flags to toggle between old/new
3. Monitor error rates and performance
4. Have database backups ready
5. Document any breaking changes

## Post-Migration

After migration:

1. Remove old route handlers
2. Update API documentation
3. Train team on new patterns
4. Monitor metrics for improvements
5. Document lessons learned