# Base API Service

The BaseAPIService provides a foundation for all service classes with automatic tracing, error handling, and observability integration.

## Overview

BaseAPIService is an abstract class that provides:
- Automatic OpenTelemetry tracing for all operations
- Performance metrics collection
- Error handling and reporting
- Event logging for important operations
- Database operation helpers

## Basic Usage

### Creating a Service

```typescript
import { BaseAPIService, ServiceContext } from '@/lib/api/base'
import { users } from '@/db/schema'

class UserService extends BaseAPIService {
  constructor() {
    super({
      serviceName: 'users',
      tracerName: 'user-service' // optional, defaults to '{serviceName}-api'
    })
  }

  async getUser(userId: string, context: ServiceContext) {
    return this.executeWithTracing('getUser', context, async (span) => {
      // Your business logic here
      const user = await db.query.users.findFirst({
        where: eq(users.id, userId)
      })
      
      if (!user) {
        throw new NotFoundError('User', userId)
      }
      
      // Add custom span attributes
      span.setAttributes({
        'user.id': user.id,
        'user.email': user.email
      })
      
      return user
    })
  }
}
```

### Service Context

The `ServiceContext` provides request-specific information:

```typescript
interface ServiceContext {
  userId?: string      // Authenticated user ID
  sessionId?: string   // Session identifier
  requestId?: string   // Request correlation ID
  [key: string]: any   // Additional context properties
}
```

## Core Methods

### executeWithTracing

Wraps operations with automatic tracing and error handling:

```typescript
protected async executeWithTracing<T>(
  operation: string,
  context: ServiceContext,
  fn: (span: Span) => Promise<T>
): Promise<T>
```

Features:
- Creates OpenTelemetry span for the operation
- Records operation duration and success/failure
- Captures errors with full context
- Collects performance metrics

Example:
```typescript
async createUser(data: CreateUserData, context: ServiceContext) {
  return this.executeWithTracing('createUser', context, async (span) => {
    // Validate data
    span.addEvent('validation_start')
    const validated = await this.validateUserData(data)
    span.addEvent('validation_complete')
    
    // Create user
    span.addEvent('database_insert_start')
    const user = await db.insert(users).values(validated).returning()
    span.addEvent('database_insert_complete')
    
    // Record success event
    await this.recordEvent(
      'user_created',
      'User account created successfully',
      { userId: user.id, email: user.email }
    )
    
    return user
  })
}
```

### executeDatabase

Wraps database operations with error handling:

```typescript
protected async executeDatabase<T>(
  operation: string,
  fn: () => Promise<T>
): Promise<T>
```

Automatically converts database errors to `DatabaseError`:

```typescript
async updateUserEmail(userId: string, email: string) {
  return this.executeDatabase('updateUserEmail', async () => {
    const result = await db
      .update(users)
      .set({ email, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning()
    
    return result[0]
  })
}
```

### recordEvent

Records service events for observability:

```typescript
protected async recordEvent(
  action: string,
  message: string,
  data?: Record<string, any>
): Promise<void>
```

Example:
```typescript
await this.recordEvent(
  'password_reset_requested',
  'User requested password reset',
  {
    userId: user.id,
    email: user.email,
    ip: context.clientIp
  }
)
```

## CRUD Service Pattern

For services that perform CRUD operations, extend `BaseCRUDService`:

```typescript
import { BaseCRUDService, ServiceContext } from '@/lib/api/base'
import { products } from '@/db/schema'

interface Product {
  id: string
  name: string
  price: number
  category: string
}

interface CreateProductDTO {
  name: string
  price: number
  category: string
}

interface UpdateProductDTO {
  name?: string
  price?: number
  category?: string
}

class ProductService extends BaseCRUDService<Product, CreateProductDTO, UpdateProductDTO> {
  protected tableName = 'products'

  constructor() {
    super({ serviceName: 'products' })
  }

  async getAll(
    filters: Record<string, any>,
    pagination: { page: number; limit: number },
    context: ServiceContext
  ) {
    return this.executeWithTracing('getAll', context, async (span) => {
      const query = createQueryBuilder(products)
        .filter(filters)
        .paginate(pagination.page, pagination.limit)
      
      const result = await query.executePaginated()
      
      span.setAttributes({
        'result.count': result.items.length,
        'result.total': result.pagination.total
      })
      
      return {
        items: result.items,
        total: result.pagination.total
      }
    })
  }

  async getById(id: string, context: ServiceContext) {
    return this.executeWithTracing('getById', context, async (span) => {
      const product = await db.query.products.findFirst({
        where: eq(products.id, id)
      })
      
      if (!product) {
        throw new NotFoundError('Product', id)
      }
      
      return product
    })
  }

  async create(data: CreateProductDTO, context: ServiceContext) {
    return this.executeWithTracing('create', context, async (span) => {
      const product = await this.executeDatabase('insertProduct', async () => {
        const [result] = await db
          .insert(products)
          .values({
            ...data,
            id: crypto.randomUUID(),
            createdAt: new Date(),
            updatedAt: new Date()
          })
          .returning()
        
        return result
      })
      
      await this.recordEvent(
        'product_created',
        `Product "${product.name}" created`,
        { productId: product.id, category: product.category }
      )
      
      return product
    })
  }

  async update(id: string, data: UpdateProductDTO, context: ServiceContext) {
    return this.executeWithTracing('update', context, async (span) => {
      // Check if exists
      await this.getById(id, context)
      
      const product = await this.executeDatabase('updateProduct', async () => {
        const [result] = await db
          .update(products)
          .set({
            ...data,
            updatedAt: new Date()
          })
          .where(eq(products.id, id))
          .returning()
        
        return result
      })
      
      await this.recordEvent(
        'product_updated',
        `Product "${product.name}" updated`,
        { productId: product.id, changes: Object.keys(data) }
      )
      
      return product
    })
  }

  async delete(id: string, context: ServiceContext) {
    return this.executeWithTracing('delete', context, async (span) => {
      const product = await this.getById(id, context)
      
      await this.executeDatabase('deleteProduct', async () => {
        await db.delete(products).where(eq(products.id, id))
      })
      
      await this.recordEvent(
        'product_deleted',
        `Product "${product.name}" deleted`,
        { productId: id }
      )
    })
  }
}
```

## Advanced Patterns

### Batch Operations

```typescript
async batchUpdatePrices(
  updates: Array<{ id: string; price: number }>,
  context: ServiceContext
) {
  return this.executeWithTracing('batchUpdatePrices', context, async (span) => {
    span.setAttributes({ 'batch.size': updates.length })
    
    const results = await Promise.allSettled(
      updates.map(update => 
        this.executeDatabase(`updatePrice-${update.id}`, async () => {
          const [result] = await db
            .update(products)
            .set({ price: update.price, updatedAt: new Date() })
            .where(eq(products.id, update.id))
            .returning()
          
          return result
        })
      )
    )
    
    const succeeded = results.filter(r => r.status === 'fulfilled').length
    const failed = results.filter(r => r.status === 'rejected').length
    
    span.setAttributes({
      'batch.succeeded': succeeded,
      'batch.failed': failed
    })
    
    await this.recordEvent(
      'batch_price_update',
      `Updated prices for ${succeeded} products`,
      { succeeded, failed, total: updates.length }
    )
    
    return results
  })
}
```

### Transaction Support

```typescript
async transferOwnership(
  productId: string,
  fromUserId: string,
  toUserId: string,
  context: ServiceContext
) {
  return this.executeWithTracing('transferOwnership', context, async (span) => {
    return await db.transaction(async (tx) => {
      // Verify product exists and is owned by fromUser
      const product = await tx.query.products.findFirst({
        where: and(
          eq(products.id, productId),
          eq(products.ownerId, fromUserId)
        )
      })
      
      if (!product) {
        throw new ForbiddenError('Product not owned by user')
      }
      
      // Update ownership
      await tx
        .update(products)
        .set({ ownerId: toUserId, updatedAt: new Date() })
        .where(eq(products.id, productId))
      
      // Record transfer in audit log
      await tx.insert(auditLogs).values({
        action: 'ownership_transfer',
        resourceType: 'product',
        resourceId: productId,
        userId: fromUserId,
        metadata: { fromUserId, toUserId }
      })
      
      await this.recordEvent(
        'ownership_transferred',
        `Product ownership transferred`,
        { productId, fromUserId, toUserId }
      )
      
      return { success: true }
    })
  })
}
```

### Caching Integration

```typescript
class CachedUserService extends BaseAPIService {
  private cache = new Map<string, { user: User; expires: number }>()

  async getUser(userId: string, context: ServiceContext) {
    return this.executeWithTracing('getUser', context, async (span) => {
      // Check cache
      const cached = this.cache.get(userId)
      if (cached && cached.expires > Date.now()) {
        span.setAttributes({ 'cache.hit': true })
        return cached.user
      }
      
      span.setAttributes({ 'cache.hit': false })
      
      // Fetch from database
      const user = await this.executeDatabase('fetchUser', async () => {
        const result = await db.query.users.findFirst({
          where: eq(users.id, userId)
        })
        
        if (!result) {
          throw new NotFoundError('User', userId)
        }
        
        return result
      })
      
      // Cache for 5 minutes
      this.cache.set(userId, {
        user,
        expires: Date.now() + 5 * 60 * 1000
      })
      
      return user
    })
  }

  invalidateUser(userId: string) {
    this.cache.delete(userId)
  }
}
```

## Metrics and Observability

### Automatic Metrics

Every operation automatically records:

```typescript
// Success metrics
observability.metrics.queryDuration(duration, operation, true, {
  service: this.serviceName
})

// Error metrics
observability.metrics.queryDuration(duration, operation, false, {
  service: this.serviceName
})

observability.metrics.errorRate(1, this.serviceName, {
  operation,
  error_type: error.code
})
```

### Custom Metrics

Add custom metrics within operations:

```typescript
async processOrder(orderId: string, context: ServiceContext) {
  return this.executeWithTracing('processOrder', context, async (span) => {
    const startTime = Date.now()
    
    // Process order...
    const order = await this.getOrder(orderId)
    const items = await this.getOrderItems(orderId)
    
    // Record custom metric
    observability.metrics.gauge(items.length, 'order_item_count', {
      service: this.serviceName,
      orderStatus: order.status
    })
    
    // Process payment...
    const paymentResult = await this.processPayment(order)
    
    // Record payment processing time
    observability.metrics.histogram(
      Date.now() - startTime,
      'payment_processing_duration',
      { 
        service: this.serviceName,
        paymentMethod: order.paymentMethod 
      }
    )
    
    return { order, paymentResult }
  })
}
```

## Testing Services

```typescript
import { describe, it, expect, vi } from 'vitest'
import { UserService } from './user-service'
import { NotFoundError } from '@/lib/api/base'

describe('UserService', () => {
  let service: UserService
  let mockContext: ServiceContext

  beforeEach(() => {
    service = new UserService()
    mockContext = {
      userId: 'test-user',
      sessionId: 'test-session',
      requestId: 'test-request'
    }
  })

  describe('getUser', () => {
    it('should return user when found', async () => {
      const mockUser = { id: '123', email: 'test@example.com' }
      vi.mocked(db.query.users.findFirst).mockResolvedValue(mockUser)

      const result = await service.getUser('123', mockContext)

      expect(result).toEqual(mockUser)
      expect(db.query.users.findFirst).toHaveBeenCalledWith({
        where: expect.any(Object)
      })
    })

    it('should throw NotFoundError when user not found', async () => {
      vi.mocked(db.query.users.findFirst).mockResolvedValue(null)

      await expect(service.getUser('999', mockContext))
        .rejects.toThrow(NotFoundError)
    })

    it('should record metrics on success', async () => {
      const mockUser = { id: '123', email: 'test@example.com' }
      vi.mocked(db.query.users.findFirst).mockResolvedValue(mockUser)
      
      const metricsSpy = vi.spyOn(observability.metrics, 'queryDuration')

      await service.getUser('123', mockContext)

      expect(metricsSpy).toHaveBeenCalledWith(
        expect.any(Number),
        'getUser',
        true,
        { service: 'users' }
      )
    })
  })
})
```

## Best Practices

1. **Always use executeWithTracing** for operations that should be traced
2. **Use executeDatabase** for database operations to get automatic error wrapping
3. **Add meaningful span attributes** for better observability
4. **Record events** for important business operations
5. **Include context** in all service method calls
6. **Handle errors appropriately** - let BaseAPIError instances bubble up
7. **Use transactions** for operations that must be atomic
8. **Add caching** for frequently accessed, rarely changing data
9. **Test error scenarios** thoroughly
10. **Monitor metrics** to identify performance issues