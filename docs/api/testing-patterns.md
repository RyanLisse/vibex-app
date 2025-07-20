# Testing Patterns

This guide covers comprehensive testing strategies for APIs built with the base infrastructure.

## Testing Overview

The base infrastructure is designed to be testable with clear separation of concerns:
- **Route handlers** - Test HTTP behavior and validation
- **Services** - Test business logic and database operations
- **Integration** - Test complete workflows
- **Performance** - Test response times and load handling

## Unit Testing

### Testing Route Handlers

```typescript
// app/api/users/route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET, POST } from './route'
import { NextRequest } from 'next/server'
import { userService } from '@/services/user-service'
import { NotFoundError, ValidationError } from '@/lib/api/base'

// Mock the service
vi.mock('@/services/user-service')

describe('User API Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/users', () => {
    it('should return a single user when id is provided', async () => {
      const mockUser = { id: '123', email: 'test@example.com', name: 'Test User' }
      vi.mocked(userService.getUser).mockResolvedValue(mockUser)

      const request = new NextRequest('http://localhost/api/users?id=123')
      const response = await GET(request)
      
      expect(response.status).toBe(200)
      const data = await response.json()
      
      expect(data).toMatchObject({
        success: true,
        data: mockUser,
        meta: expect.objectContaining({
          timestamp: expect.any(String),
          requestId: expect.any(String)
        })
      })
      
      expect(userService.getUser).toHaveBeenCalledWith('123', expect.any(Object))
    })

    it('should return 404 when user not found', async () => {
      vi.mocked(userService.getUser).mockRejectedValue(
        new NotFoundError('User', '999')
      )

      const request = new NextRequest('http://localhost/api/users?id=999')
      const response = await GET(request)
      
      expect(response.status).toBe(404)
      const data = await response.json()
      
      expect(data).toMatchObject({
        success: false,
        code: 'NOT_FOUND',
        error: 'User with id 999 not found'
      })
    })

    it('should return paginated users when no id provided', async () => {
      const mockResult = {
        items: [{ id: '1' }, { id: '2' }],
        pagination: {
          page: 1,
          limit: 20,
          total: 50,
          totalPages: 3,
          hasNext: true,
          hasPrev: false
        }
      }
      
      vi.mocked(userService.getAllUsers).mockResolvedValue(mockResult)

      const request = new NextRequest('http://localhost/api/users?page=1&limit=20')
      const response = await GET(request)
      
      expect(response.status).toBe(200)
      const data = await response.json()
      
      expect(data).toMatchObject({
        success: true,
        data: mockResult.items,
        pagination: mockResult.pagination
      })
    })
  })

  describe('POST /api/users', () => {
    it('should create a user with valid data', async () => {
      const createData = { email: 'new@example.com', name: 'New User' }
      const mockUser = { id: '456', ...createData, createdAt: new Date() }
      
      vi.mocked(userService.createUser).mockResolvedValue(mockUser)

      const request = new NextRequest('http://localhost/api/users', {
        method: 'POST',
        body: JSON.stringify(createData)
      })
      
      const response = await POST(request)
      
      expect(response.status).toBe(200)
      const data = await response.json()
      
      expect(data).toMatchObject({
        success: true,
        data: expect.objectContaining(createData),
        message: 'Resource created successfully'
      })
    })

    it('should return 400 for invalid email', async () => {
      const request = new NextRequest('http://localhost/api/users', {
        method: 'POST',
        body: JSON.stringify({ email: 'invalid-email', name: 'Test' })
      })
      
      const response = await POST(request)
      
      expect(response.status).toBe(400)
      const data = await response.json()
      
      expect(data).toMatchObject({
        success: false,
        code: 'VALIDATION_ERROR',
        details: expect.arrayContaining([
          expect.objectContaining({
            field: 'email',
            message: expect.stringContaining('email')
          })
        ])
      })
    })
  })
})
```

### Testing Services

```typescript
// services/user-service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { UserService } from './user-service'
import { db } from '@/db/config'
import { users } from '@/db/schema'
import { NotFoundError, ConflictError, DatabaseError } from '@/lib/api/base'

vi.mock('@/db/config')
vi.mock('@/lib/observability')

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
    vi.clearAllMocks()
  })

  describe('createUser', () => {
    it('should create a user successfully', async () => {
      const createData = { email: 'test@example.com', name: 'Test User' }
      const mockUser = { id: '123', ...createData, createdAt: new Date() }

      // Mock no existing user
      vi.mocked(db.query.users.findFirst).mockResolvedValue(null)
      
      // Mock successful insert
      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockUser])
        })
      })

      const result = await service.createUser(createData, mockContext)

      expect(result).toEqual(mockUser)
      expect(db.query.users.findFirst).toHaveBeenCalledWith({
        where: expect.any(Object)
      })
    })

    it('should throw ConflictError for duplicate email', async () => {
      const createData = { email: 'existing@example.com', name: 'Test' }
      
      // Mock existing user
      vi.mocked(db.query.users.findFirst).mockResolvedValue({
        id: '999',
        email: 'existing@example.com'
      })

      await expect(
        service.createUser(createData, mockContext)
      ).rejects.toThrow(ConflictError)
    })

    it('should wrap database errors', async () => {
      vi.mocked(db.query.users.findFirst).mockResolvedValue(null)
      vi.mocked(db.insert).mockImplementation(() => {
        throw new Error('Connection refused')
      })

      await expect(
        service.createUser({ email: 'test@example.com' }, mockContext)
      ).rejects.toThrow(DatabaseError)
    })
  })

  describe('getUser', () => {
    it('should return user when found', async () => {
      const mockUser = { id: '123', email: 'test@example.com' }
      vi.mocked(db.query.users.findFirst).mockResolvedValue(mockUser)

      const result = await service.getUser('123', mockContext)

      expect(result).toEqual(mockUser)
    })

    it('should throw NotFoundError when user not found', async () => {
      vi.mocked(db.query.users.findFirst).mockResolvedValue(null)

      await expect(
        service.getUser('999', mockContext)
      ).rejects.toThrow(NotFoundError)
    })
  })

  describe('tracing', () => {
    it('should create spans for operations', async () => {
      const mockSpan = {
        setAttributes: vi.fn(),
        addEvent: vi.fn(),
        end: vi.fn(),
        recordException: vi.fn(),
        setStatus: vi.fn()
      }
      
      vi.spyOn(service['tracer'], 'startSpan').mockReturnValue(mockSpan)
      
      await service.getUser('123', mockContext)

      expect(service['tracer'].startSpan).toHaveBeenCalledWith('users.getUser')
      expect(mockSpan.setAttributes).toHaveBeenCalledWith(
        expect.objectContaining({
          'service.name': 'users',
          'operation.name': 'getUser'
        })
      )
      expect(mockSpan.end).toHaveBeenCalled()
    })
  })
})
```

### Testing Query Builder

```typescript
// lib/api/base/query-builder.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { createQueryBuilder } from './query-builder'
import { products } from '@/db/schema'

describe('QueryBuilder', () => {
  describe('filtering', () => {
    it('should build WHERE conditions', () => {
      const query = createQueryBuilder(products)
        .where(products.category, 'electronics')
        .whereGte(products.price, 100)
        .whereLte(products.price, 1000)

      // Test internal state
      expect(query['conditions']).toHaveLength(3)
    })

    it('should handle search across multiple fields', () => {
      const query = createQueryBuilder(products)
        .search([products.name, products.description], 'laptop')

      expect(query['conditions']).toHaveLength(1)
    })
  })

  describe('pagination', () => {
    it('should calculate offset correctly', () => {
      const query = createQueryBuilder(products).paginate(3, 20)

      expect(query['limitValue']).toBe(20)
      expect(query['offsetValue']).toBe(40) // (3-1) * 20
    })
  })

  describe('applyOptions', () => {
    it('should apply all options', () => {
      const options = {
        page: 2,
        limit: 10,
        sortBy: 'price',
        sortOrder: 'asc' as const,
        filters: { category: 'electronics' },
        search: {
          fields: ['name', 'description'],
          query: 'gaming'
        }
      }

      const query = createQueryBuilder(products).applyOptions(options)

      expect(query['limitValue']).toBe(10)
      expect(query['offsetValue']).toBe(10)
      expect(query['conditions']).toHaveLength(2) // filter + search
    })
  })
})
```

## Integration Testing

### Testing Complete Workflows

```typescript
// tests/integration/user-workflow.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createTestClient } from '@/tests/utils/test-client'
import { setupTestDatabase, cleanupTestDatabase } from '@/tests/utils/test-db'

describe('User Workflow Integration', () => {
  let client: TestClient
  
  beforeAll(async () => {
    await setupTestDatabase()
    client = createTestClient()
  })
  
  afterAll(async () => {
    await cleanupTestDatabase()
  })

  it('should complete full user lifecycle', async () => {
    // 1. Create user
    const createResponse = await client.post('/api/users', {
      email: 'integration@example.com',
      name: 'Integration Test User'
    })
    
    expect(createResponse.status).toBe(201)
    const { data: user } = await createResponse.json()
    
    expect(user).toMatchObject({
      email: 'integration@example.com',
      name: 'Integration Test User'
    })
    
    // 2. Fetch created user
    const getResponse = await client.get(`/api/users?id=${user.id}`)
    
    expect(getResponse.status).toBe(200)
    const { data: fetchedUser } = await getResponse.json()
    
    expect(fetchedUser.id).toBe(user.id)
    
    // 3. Update user
    const updateResponse = await client.put(`/api/users/${user.id}`, {
      name: 'Updated Name'
    })
    
    expect(updateResponse.status).toBe(200)
    const { data: updatedUser } = await updateResponse.json()
    
    expect(updatedUser.name).toBe('Updated Name')
    
    // 4. Delete user
    const deleteResponse = await client.delete(`/api/users/${user.id}`)
    
    expect(deleteResponse.status).toBe(204)
    
    // 5. Verify deletion
    const verifyResponse = await client.get(`/api/users?id=${user.id}`)
    
    expect(verifyResponse.status).toBe(404)
  })

  it('should handle concurrent operations', async () => {
    const promises = Array.from({ length: 10 }, (_, i) => 
      client.post('/api/users', {
        email: `concurrent${i}@example.com`,
        name: `User ${i}`
      })
    )
    
    const responses = await Promise.all(promises)
    
    // All should succeed
    responses.forEach(response => {
      expect(response.status).toBe(201)
    })
    
    // Verify all were created
    const listResponse = await client.get('/api/users?limit=100')
    const { data: users } = await listResponse.json()
    
    const createdUsers = users.filter(u => 
      u.email.startsWith('concurrent')
    )
    
    expect(createdUsers).toHaveLength(10)
  })
})
```

### Testing with Real Database

```typescript
// tests/integration/database-integration.test.ts
import { describe, it, expect } from 'vitest'
import { db } from '@/db/config'
import { migrate } from '@/db/migrate'
import { ProductService } from '@/services/product-service'

describe('Database Integration', () => {
  beforeAll(async () => {
    // Run migrations on test database
    await migrate(db, { migrationsFolder: './db/migrations' })
  })

  it('should handle transactions correctly', async () => {
    const service = new ProductService()
    
    try {
      await db.transaction(async (tx) => {
        // Create product
        const product = await service.createProduct({
          name: 'Transaction Test',
          price: 99.99
        }, { tx })
        
        // Simulate error
        throw new Error('Rollback test')
      })
    } catch (error) {
      // Expected error
    }
    
    // Verify rollback
    const products = await db.query.products.findMany({
      where: eq(products.name, 'Transaction Test')
    })
    
    expect(products).toHaveLength(0)
  })

  it('should handle connection pool correctly', async () => {
    const promises = Array.from({ length: 50 }, (_, i) =>
      db.query.products.findFirst({
        where: eq(products.id, `test-${i}`)
      })
    )
    
    // Should handle concurrent queries
    await expect(Promise.all(promises)).resolves.toBeDefined()
  })
})
```

## Performance Testing

### Load Testing

```typescript
// tests/performance/load-test.ts
import { describe, it, expect } from 'vitest'
import { performance } from 'perf_hooks'

describe('API Performance', () => {
  it('should handle 100 concurrent requests', async () => {
    const startTime = performance.now()
    
    const promises = Array.from({ length: 100 }, () =>
      fetch('http://localhost:3000/api/products')
    )
    
    const responses = await Promise.all(promises)
    const endTime = performance.now()
    
    // All requests should succeed
    responses.forEach(response => {
      expect(response.status).toBe(200)
    })
    
    // Should complete within reasonable time
    const totalTime = endTime - startTime
    expect(totalTime).toBeLessThan(5000) // 5 seconds
    
    // Calculate average response time
    const avgResponseTime = totalTime / 100
    expect(avgResponseTime).toBeLessThan(50) // 50ms average
  })

  it('should maintain performance with large datasets', async () => {
    const measurements = []
    
    for (let page = 1; page <= 10; page++) {
      const start = performance.now()
      
      const response = await fetch(
        `http://localhost:3000/api/products?page=${page}&limit=100`
      )
      
      const data = await response.json()
      const duration = performance.now() - start
      
      measurements.push(duration)
      
      expect(response.status).toBe(200)
      expect(data.data).toHaveLength(100)
    }
    
    // Response times should be consistent
    const avg = measurements.reduce((a, b) => a + b) / measurements.length
    const variance = measurements.map(m => Math.abs(m - avg))
    
    expect(Math.max(...variance)).toBeLessThan(avg * 0.5) // Max 50% variance
  })
})
```

### Query Performance Testing

```typescript
// tests/performance/query-performance.test.ts
describe('Query Performance', () => {
  it('should use indexes efficiently', async () => {
    const service = new ProductService()
    
    // Measure indexed query
    const indexedStart = performance.now()
    await service.getProductsByCategory('electronics', { limit: 100 })
    const indexedTime = performance.now() - indexedStart
    
    // Measure non-indexed query (if applicable)
    const nonIndexedStart = performance.now()
    await service.getProductsByCustomField('value', { limit: 100 })
    const nonIndexedTime = performance.now() - nonIndexedStart
    
    // Indexed queries should be significantly faster
    expect(indexedTime).toBeLessThan(nonIndexedTime * 0.1)
  })

  it('should handle pagination efficiently', async () => {
    const timings = []
    
    // Test different page sizes
    for (const limit of [10, 50, 100, 500]) {
      const start = performance.now()
      
      await createQueryBuilder(products)
        .paginate(1, limit)
        .executePaginated()
      
      timings.push({
        limit,
        time: performance.now() - start
      })
    }
    
    // Time should scale linearly with limit
    const timePerItem = timings.map(t => t.time / t.limit)
    const avgTimePerItem = timePerItem.reduce((a, b) => a + b) / timePerItem.length
    
    timePerItem.forEach(time => {
      expect(time).toBeCloseTo(avgTimePerItem, 1)
    })
  })
})
```

## Mocking Strategies

### Mocking External Services

```typescript
// tests/mocks/external-services.ts
import { vi } from 'vitest'

export const mockEmailService = {
  send: vi.fn().mockResolvedValue({ messageId: 'mock-123' }),
  verify: vi.fn().mockResolvedValue(true)
}

export const mockPaymentGateway = {
  charge: vi.fn().mockResolvedValue({
    transactionId: 'txn_123',
    status: 'succeeded'
  }),
  refund: vi.fn().mockResolvedValue({
    refundId: 'ref_123',
    status: 'succeeded'
  })
}

// Usage in tests
vi.mock('@/lib/email', () => ({ emailService: mockEmailService }))
vi.mock('@/lib/payment', () => ({ paymentGateway: mockPaymentGateway }))
```

### Database Mocking

```typescript
// tests/mocks/db.ts
import { vi } from 'vitest'

export function createMockDb() {
  return {
    query: {
      users: {
        findFirst: vi.fn(),
        findMany: vi.fn()
      },
      products: {
        findFirst: vi.fn(),
        findMany: vi.fn()
      }
    },
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    returning: vi.fn(),
    transaction: vi.fn()
  }
}
```

## Test Utilities

### Request Helpers

```typescript
// tests/utils/request-helpers.ts
export function createMockRequest(
  url: string,
  options: Partial<RequestInit> = {}
): NextRequest {
  return new NextRequest(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  })
}

export function createAuthenticatedRequest(
  url: string,
  userId: string,
  options: Partial<RequestInit> = {}
): NextRequest {
  return createMockRequest(url, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer mock-token-${userId}`
    }
  })
}
```

### Response Assertions

```typescript
// tests/utils/assertions.ts
export function expectSuccessResponse(response: Response, data?: any) {
  expect(response.status).toBe(200)
  expect(response.headers.get('content-type')).toContain('application/json')
  
  if (data) {
    expect(response.json()).resolves.toMatchObject({
      success: true,
      data,
      meta: expect.any(Object)
    })
  }
}

export function expectErrorResponse(
  response: Response,
  statusCode: number,
  errorCode: string
) {
  expect(response.status).toBe(statusCode)
  expect(response.json()).resolves.toMatchObject({
    success: false,
    code: errorCode,
    error: expect.any(String)
  })
}

export function expectPaginatedResponse(
  response: Response,
  itemCount: number,
  total: number
) {
  expect(response.json()).resolves.toMatchObject({
    success: true,
    data: expect.arrayContaining(
      Array(itemCount).fill(expect.any(Object))
    ),
    pagination: expect.objectContaining({
      total,
      limit: expect.any(Number),
      page: expect.any(Number)
    })
  })
}
```

## Testing Checklist

### Unit Tests
- [ ] Route handlers handle all HTTP methods correctly
- [ ] Validation errors return proper error responses
- [ ] Authentication is enforced where required
- [ ] Services handle all error cases
- [ ] Database errors are properly wrapped
- [ ] Tracing and metrics are recorded
- [ ] Query builder constructs correct queries

### Integration Tests
- [ ] Complete workflows function end-to-end
- [ ] Database transactions work correctly
- [ ] External service failures are handled
- [ ] Concurrent operations don't cause issues
- [ ] Rate limiting works as expected
- [ ] Caching behavior is correct

### Performance Tests
- [ ] Response times meet requirements
- [ ] Large datasets are handled efficiently
- [ ] Database queries use indexes
- [ ] Memory usage stays within limits
- [ ] Concurrent load is handled properly

## CI/CD Integration

```yaml
# .github/workflows/test.yml
name: API Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Bun
        uses: oven-sh/setup-bun@v1
        
      - name: Install dependencies
        run: bun install
        
      - name: Run unit tests
        run: bun test:unit
        
      - name: Run integration tests
        run: bun test:integration
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test
          
      - name: Run performance tests
        run: bun test:performance
        
      - name: Upload coverage
        uses: codecov/codecov-action@v3
```