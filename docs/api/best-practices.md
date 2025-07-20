# Best Practices

This guide covers best practices for using the base API infrastructure to build maintainable, performant, and secure APIs.

## Code Organization

### 1. File Structure

Organize your API code following this structure:

```
app/
  api/
    users/
      route.ts          # Route handlers
    products/
      [id]/
        route.ts        # Dynamic routes
services/
  user-service.ts       # Business logic
  product-service.ts
schemas/
  users.ts             # Validation schemas
  products.ts
lib/
  api/
    base/              # Base infrastructure
```

### 2. Service Layer Pattern

Keep route handlers thin and move business logic to services:

```typescript
// ❌ Bad: Business logic in route handler
export const POST = BaseAPIHandler.POST(async (context) => {
  const data = await BaseAPIHandler.validateBody(context.request, Schema)
  
  // Don't put business logic here
  const existing = await db.query.users.findFirst({
    where: eq(users.email, data.email)
  })
  
  if (existing) {
    throw new ConflictError('Email exists')
  }
  
  const user = await db.insert(users).values(data).returning()
  
  // Don't put event recording here
  await observability.events.collector.collectEvent(...)
  
  return user
})

// ✅ Good: Business logic in service
export const POST = BaseAPIHandler.POST(async (context) => {
  const data = await BaseAPIHandler.validateBody(context.request, Schema)
  const user = await userService.createUser(data, context)
  return ResponseBuilder.created(user)
})
```

### 3. Schema Organization

Keep validation schemas close to their usage:

```typescript
// schemas/users.ts
import { z } from 'zod'

// Base schemas
export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().min(2).max(100),
  role: z.enum(['user', 'admin']),
  createdAt: z.date(),
  updatedAt: z.date()
})

// Operation-specific schemas
export const CreateUserSchema = UserSchema.pick({
  email: true,
  name: true,
  role: true
})

export const UpdateUserSchema = CreateUserSchema.partial()

export const UserQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  search: z.string().optional(),
  role: UserSchema.shape.role.optional()
})

// Type exports
export type User = z.infer<typeof UserSchema>
export type CreateUserData = z.infer<typeof CreateUserSchema>
export type UpdateUserData = z.infer<typeof UpdateUserSchema>
```

## Error Handling

### 1. Use Specific Error Types

```typescript
// ❌ Bad: Generic errors
throw new Error('Something went wrong')
throw new BaseAPIError('Not found', { statusCode: 404 })

// ✅ Good: Specific error types
throw new NotFoundError('User', userId)
throw new ValidationError('Invalid email format')
throw new ConflictError('Username already taken')
```

### 2. Provide Helpful Error Messages

```typescript
// ❌ Bad: Vague messages
throw new ValidationError('Invalid input')
throw new NotFoundError('Not found')

// ✅ Good: Specific, actionable messages
throw new ValidationError('Email must be a valid email address')
throw new NotFoundError('User', userId)
throw new ValidationError('Password must be at least 8 characters', [
  { field: 'password', message: 'Too short' }
])
```

### 3. Handle External Service Errors

```typescript
// ✅ Good: Wrap external errors appropriately
async sendEmail(to: string, subject: string) {
  try {
    await emailService.send({ to, subject })
  } catch (error) {
    // Don't expose internal error details
    throw new ExternalServiceError('EmailService', error as Error)
  }
}

// ✅ Good: Graceful degradation
async getWeatherData(city: string) {
  try {
    return await weatherAPI.get(city)
  } catch (error) {
    // Log error but return cached/default data
    logger.error('Weather API failed', error)
    return getCachedWeatherData(city) || getDefaultWeather()
  }
}
```

## Performance

### 1. Use Pagination Always

```typescript
// ❌ Bad: No pagination
export const GET = BaseAPIHandler.GET(async (context) => {
  const allProducts = await db.select().from(products)
  return allProducts
})

// ✅ Good: Always paginate list endpoints
export const GET = BaseAPIHandler.GET(async (context) => {
  const { page = '1', limit = '20' } = context.query
  
  const result = await createQueryBuilder(products)
    .paginate(Number(page), Number(limit))
    .executePaginated()
  
  return ResponseBuilder.fromQueryResult(result)
})
```

### 2. Optimize Database Queries

```typescript
// ❌ Bad: N+1 query problem
const orders = await db.select().from(orders).limit(10)
for (const order of orders) {
  order.user = await db.query.users.findFirst({
    where: eq(users.id, order.userId)
  })
}

// ✅ Good: Use joins or batch loading
const ordersWithUsers = await db
  .select({
    order: orders,
    user: users
  })
  .from(orders)
  .leftJoin(users, eq(orders.userId, users.id))
  .limit(10)

// ✅ Good: Batch load related data
const orders = await db.select().from(orders).limit(10)
const userIds = [...new Set(orders.map(o => o.userId))]
const users = await db.query.users.findMany({
  where: inArray(users.id, userIds)
})
const userMap = new Map(users.map(u => [u.id, u]))
orders.forEach(order => {
  order.user = userMap.get(order.userId)
})
```

### 3. Implement Caching

```typescript
class CachedProductService extends BaseAPIService {
  private cache = new Map<string, CacheEntry>()
  
  async getProduct(id: string, context: ServiceContext) {
    return this.executeWithTracing('getProduct', context, async (span) => {
      // Check cache
      const cached = this.cache.get(id)
      if (cached && cached.expires > Date.now()) {
        span.setAttributes({ 'cache.hit': true })
        return cached.data
      }
      
      // Fetch from database
      const product = await this.fetchProduct(id)
      
      // Cache for 5 minutes
      this.cache.set(id, {
        data: product,
        expires: Date.now() + 5 * 60 * 1000
      })
      
      span.setAttributes({ 'cache.hit': false })
      return product
    })
  }
  
  invalidateProduct(id: string) {
    this.cache.delete(id)
  }
}
```

## Security

### 1. Always Validate Input

```typescript
// ✅ Good: Validate all input
export const POST = BaseAPIHandler.POST(async (context) => {
  const data = await BaseAPIHandler.validateBody(
    context.request,
    CreateProductSchema
  )
  
  // data is now type-safe and validated
  return await productService.create(data, context)
})

// ✅ Good: Validate query parameters
export const GET = BaseAPIHandler.GET(async (context) => {
  const params = BaseAPIHandler.validateQuery(
    new URLSearchParams(context.query),
    ProductQuerySchema
  )
  
  return await productService.list(params, context)
})
```

### 2. Sanitize User Input

```typescript
// ✅ Good: Sanitize before using in queries
import DOMPurify from 'isomorphic-dompurify'

const SearchSchema = z.object({
  query: z.string().transform(val => DOMPurify.sanitize(val))
})

// ✅ Good: Use parameterized queries
// QueryBuilder handles this automatically
const results = await createQueryBuilder(products)
  .whereLike(products.name, `%${userInput}%`) // Safe
  .execute()
```

### 3. Implement Rate Limiting

```typescript
// ✅ Good: Rate limit sensitive endpoints
export const POST = BaseAPIHandler.POST(
  async (context) => {
    // Password reset logic
  },
  {
    rateLimit: {
      requests: 3,
      window: '15m'
    }
  }
)

// ✅ Good: Different limits for different operations
const rateLimits = {
  login: { requests: 5, window: '15m' },
  register: { requests: 3, window: '1h' },
  apiKey: { requests: 1000, window: '1h' }
}
```

### 4. Protect Sensitive Data

```typescript
// ❌ Bad: Exposing sensitive fields
const user = await db.query.users.findFirst({ where: eq(users.id, id) })
return user // Includes password hash!

// ✅ Good: Exclude sensitive fields
const UserResponseSchema = UserSchema.omit({
  passwordHash: true,
  resetToken: true,
  twoFactorSecret: true
})

const user = await db.query.users.findFirst({ where: eq(users.id, id) })
return UserResponseSchema.parse(user)

// ✅ Good: Use field selection
const user = await db.select({
  id: users.id,
  email: users.email,
  name: users.name,
  role: users.role
}).from(users).where(eq(users.id, id))
```

## Observability

### 1. Add Meaningful Trace Attributes

```typescript
async processOrder(orderId: string, context: ServiceContext) {
  return this.executeWithTracing('processOrder', context, async (span) => {
    const order = await this.getOrder(orderId)
    
    // Add context for debugging
    span.setAttributes({
      'order.id': orderId,
      'order.total': order.total,
      'order.itemCount': order.items.length,
      'order.customer': order.customerId,
      'order.status': order.status
    })
    
    // Add events for important steps
    span.addEvent('payment_processing_start')
    const payment = await this.processPayment(order)
    span.addEvent('payment_processing_complete', {
      'payment.status': payment.status
    })
    
    return { order, payment }
  })
}
```

### 2. Record Business Events

```typescript
// ✅ Good: Record important business events
await this.recordEvent(
  'order_placed',
  `Order ${order.id} placed by customer ${order.customerId}`,
  {
    orderId: order.id,
    customerId: order.customerId,
    total: order.total,
    itemCount: order.items.length
  }
)

// ✅ Good: Record security events
await this.recordEvent(
  'login_attempt_failed',
  `Failed login attempt for ${email}`,
  {
    email,
    ip: context.clientIp,
    reason: 'invalid_password'
  }
)
```

### 3. Monitor Performance

```typescript
// ✅ Good: Track custom metrics
async searchProducts(query: string, context: ServiceContext) {
  const startTime = Date.now()
  
  const results = await this.performSearch(query)
  
  // Record search performance
  observability.metrics.histogram(
    Date.now() - startTime,
    'product_search_duration',
    {
      resultCount: results.length,
      queryLength: query.length
    }
  )
  
  // Track search patterns
  observability.metrics.increment('product_search_count', {
    hasResults: results.length > 0
  })
  
  return results
}
```

## Testing

### 1. Test Error Scenarios

```typescript
describe('UserService', () => {
  it('should handle duplicate email', async () => {
    // Mock existing user
    vi.mocked(db.query.users.findFirst).mockResolvedValue({
      id: '123',
      email: 'existing@example.com'
    })
    
    await expect(
      userService.createUser({ email: 'existing@example.com' }, context)
    ).rejects.toThrow(ConflictError)
  })
  
  it('should handle database errors', async () => {
    vi.mocked(db.insert).mockRejectedValue(new Error('Connection lost'))
    
    await expect(
      userService.createUser(validData, context)
    ).rejects.toThrow(DatabaseError)
  })
})
```

### 2. Test Validation

```typescript
describe('User API', () => {
  it('should validate email format', async () => {
    const response = await POST(
      createRequest({ email: 'invalid-email', name: 'Test' })
    )
    
    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.details).toContainEqual(
      expect.objectContaining({
        field: 'email',
        message: expect.stringContaining('email')
      })
    )
  })
})
```

### 3. Test Performance

```typescript
describe('ProductService performance', () => {
  it('should handle large datasets efficiently', async () => {
    const startTime = Date.now()
    
    const result = await productService.searchProducts({
      search: 'laptop',
      page: 1,
      limit: 100
    }, context)
    
    const duration = Date.now() - startTime
    
    expect(duration).toBeLessThan(1000) // Should complete in < 1 second
    expect(result.items).toHaveLength(100)
  })
})
```

## Documentation

### 1. Document API Endpoints

```typescript
/**
 * Create a new product
 * 
 * @route POST /api/products
 * @auth required
 * @body {CreateProductSchema}
 * @response 201 - Product created successfully
 * @response 400 - Validation error
 * @response 401 - Authentication required
 * @response 409 - Product name already exists
 */
export const POST = BaseAPIHandler.POST(
  async (context) => {
    // Implementation
  },
  { requireAuth: true }
)
```

### 2. Document Service Methods

```typescript
/**
 * Search products with advanced filtering
 * 
 * @param filters - Search and filter criteria
 * @param context - Request context
 * @returns Paginated list of products matching criteria
 * @throws {ValidationError} If search parameters are invalid
 * @throws {DatabaseError} If database query fails
 */
async searchProducts(
  filters: ProductSearchFilters,
  context: ServiceContext
): Promise<PaginatedResult<Product>> {
  // Implementation
}
```

## Common Pitfalls to Avoid

1. **Don't bypass the service layer** - Always use services for business logic
2. **Don't return raw database records** - Transform/sanitize data first
3. **Don't ignore error handling** - Use appropriate error types
4. **Don't skip validation** - Validate all external input
5. **Don't forget pagination** - Always paginate list endpoints
6. **Don't expose internal errors** - Wrap external service errors
7. **Don't neglect logging** - Add traces and events
8. **Don't hardcode limits** - Make them configurable
9. **Don't ignore performance** - Monitor and optimize queries
10. **Don't skip tests** - Test error cases and edge conditions