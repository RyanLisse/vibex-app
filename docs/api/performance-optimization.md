# Performance Optimization

This guide covers performance optimization techniques for APIs built with the base infrastructure.

## Performance Principles

1. **Measure First** - Never optimize without metrics
2. **Optimize Hot Paths** - Focus on frequently used endpoints
3. **Cache Strategically** - Cache expensive, stable data
4. **Batch Operations** - Reduce round trips
5. **Use Indexes** - Optimize database queries
6. **Monitor Continuously** - Track performance over time

## Database Optimization

### 1. Query Optimization

#### Use Proper Indexes

```typescript
// Ensure your schema has appropriate indexes
export const products = pgTable('products', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  category: text('category').notNull(),
  price: decimal('price', { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp('created_at').defaultNow()
}, (table) => ({
  // Single column indexes
  categoryIdx: index('idx_products_category').on(table.category),
  priceIdx: index('idx_products_price').on(table.price),
  createdAtIdx: index('idx_products_created_at').on(table.createdAt),
  
  // Composite indexes for common query patterns
  categoryPriceIdx: index('idx_products_category_price').on(
    table.category,
    table.price
  ),
  categoryCreatedAtIdx: index('idx_products_category_created_at').on(
    table.category,
    table.createdAt
  )
}))
```

#### Optimize Common Queries

```typescript
class OptimizedProductService extends BaseAPIService {
  // Use covering indexes
  async getProductList(filters: ProductFilters) {
    return this.executeWithTracing('getProductList', {}, async (span) => {
      // Select only needed fields
      const query = db.select({
        id: products.id,
        name: products.name,
        price: products.price,
        category: products.category
      }).from(products)
      
      // Use index-friendly conditions
      if (filters.category) {
        query.where(eq(products.category, filters.category))
      }
      
      // Leverage composite index
      if (filters.minPrice && filters.maxPrice) {
        query.where(
          and(
            gte(products.price, filters.minPrice),
            lte(products.price, filters.maxPrice)
          )
        )
      }
      
      // Use index for sorting
      query.orderBy(desc(products.createdAt))
      
      return query.limit(filters.limit).offset(filters.offset)
    })
  }
}
```

### 2. Batch Loading

Prevent N+1 queries with batch loading:

```typescript
class BatchLoadingService extends BaseAPIService {
  async getOrdersWithUsers(orderIds: string[]) {
    return this.executeWithTracing('getOrdersWithUsers', {}, async (span) => {
      // Fetch all orders in one query
      const orders = await db.query.orders.findMany({
        where: inArray(orders.id, orderIds)
      })
      
      // Extract unique user IDs
      const userIds = [...new Set(orders.map(o => o.userId))]
      
      // Batch load all users
      const users = await db.query.users.findMany({
        where: inArray(users.id, userIds)
      })
      
      // Create lookup map
      const userMap = new Map(users.map(u => [u.id, u]))
      
      // Combine results
      return orders.map(order => ({
        ...order,
        user: userMap.get(order.userId)
      }))
    })
  }
  
  // DataLoader pattern for GraphQL-like batching
  private userLoader = new DataLoader(async (userIds: string[]) => {
    const users = await db.query.users.findMany({
      where: inArray(users.id, userIds)
    })
    
    const userMap = new Map(users.map(u => [u.id, u]))
    return userIds.map(id => userMap.get(id))
  })
  
  async getUserById(userId: string) {
    return this.userLoader.load(userId)
  }
}
```

### 3. Connection Pooling

Configure database connection pooling:

```typescript
// db/config.ts
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

const connectionString = process.env.DATABASE_URL!

// Configure connection pool
const sql = postgres(connectionString, {
  max: 20,                    // Maximum pool size
  idle_timeout: 20,           // Close idle connections after 20 seconds
  connect_timeout: 10,        // Connection timeout in seconds
  max_lifetime: 60 * 30,      // Maximum connection lifetime (30 minutes)
  prepare: false              // Disable prepared statements for better pooling
})

export const db = drizzle(sql)
```

## Caching Strategies

### 1. In-Memory Caching

```typescript
import { LRUCache } from 'lru-cache'

class CachedProductService extends BaseAPIService {
  private cache = new LRUCache<string, any>({
    max: 1000,                          // Maximum items
    ttl: 1000 * 60 * 5,                // 5 minutes TTL
    updateAgeOnGet: true,               // Refresh TTL on access
    updateAgeOnHas: true,
    fetchMethod: async (key: string) => {
      // Auto-fetch on cache miss
      return this.fetchFromDatabase(key)
    }
  })
  
  async getProduct(id: string, context: ServiceContext) {
    return this.executeWithTracing('getProduct', context, async (span) => {
      const cacheKey = `product:${id}`
      
      // Try cache first
      const cached = await this.cache.fetch(cacheKey)
      
      if (cached) {
        span.setAttributes({ 'cache.hit': true })
        return cached
      }
      
      span.setAttributes({ 'cache.hit': false })
      
      // Cache will auto-fetch via fetchMethod
      return cached
    })
  }
  
  async updateProduct(id: string, data: UpdateProductData) {
    const result = await this.executeDatabase('updateProduct', async () => {
      // Update database
      const [updated] = await db
        .update(products)
        .set(data)
        .where(eq(products.id, id))
        .returning()
      
      return updated
    })
    
    // Invalidate cache
    this.cache.delete(`product:${id}`)
    
    return result
  }
  
  // Batch cache operations
  async warmCache(productIds: string[]) {
    const uncached = productIds.filter(
      id => !this.cache.has(`product:${id}`)
    )
    
    if (uncached.length > 0) {
      const products = await db.query.products.findMany({
        where: inArray(products.id, uncached)
      })
      
      products.forEach(product => {
        this.cache.set(`product:${product.id}`, product)
      })
    }
  }
}
```

### 2. Redis Caching

```typescript
import { createClient } from 'redis'

class RedisCachedService extends BaseAPIService {
  private redis = createClient({ url: process.env.REDIS_URL })
  
  async initialize() {
    await this.redis.connect()
  }
  
  async getProductWithCache(id: string, context: ServiceContext) {
    return this.executeWithTracing('getProductWithCache', context, async (span) => {
      const cacheKey = `product:${id}`
      
      // Try Redis cache
      const cached = await this.redis.get(cacheKey)
      
      if (cached) {
        span.setAttributes({ 'cache.hit': true, 'cache.type': 'redis' })
        return JSON.parse(cached)
      }
      
      // Fetch from database
      const product = await this.fetchProduct(id)
      
      // Cache in Redis with expiration
      await this.redis.setEx(
        cacheKey,
        300, // 5 minutes
        JSON.stringify(product)
      )
      
      span.setAttributes({ 'cache.hit': false })
      return product
    })
  }
  
  // Cache invalidation pattern
  async invalidateProductCache(id: string) {
    const patterns = [
      `product:${id}`,
      `products:list:*`,
      `products:category:*`
    ]
    
    for (const pattern of patterns) {
      const keys = await this.redis.keys(pattern)
      if (keys.length > 0) {
        await this.redis.del(keys)
      }
    }
  }
}
```

### 3. HTTP Caching

Configure proper HTTP cache headers:

```typescript
export const GET = BaseAPIHandler.GET(async (context) => {
  const { id } = context.query
  const product = await productService.getProduct(id, context)
  
  // Create response with cache headers
  const response = ResponseBuilder.success(product)
  
  // Cache static content
  if (product.isStatic) {
    response.headers.set('Cache-Control', 'public, max-age=3600, immutable')
  } else {
    // Cache with revalidation
    response.headers.set('Cache-Control', 'private, max-age=60, must-revalidate')
  }
  
  // Add ETag for conditional requests
  const etag = generateETag(product)
  response.headers.set('ETag', etag)
  
  // Check If-None-Match
  if (context.headers['if-none-match'] === etag) {
    return new Response(null, { status: 304 })
  }
  
  return response
})

function generateETag(data: any): string {
  const hash = crypto.createHash('md5')
  hash.update(JSON.stringify(data))
  return `"${hash.digest('hex')}"`
}
```

## Response Optimization

### 1. Field Selection

Allow clients to specify needed fields:

```typescript
const FieldSelectionSchema = z.object({
  fields: z.string().optional() // comma-separated field list
})

export const GET = BaseAPIHandler.GET(async (context) => {
  const { fields } = BaseAPIHandler.validateQuery(
    new URLSearchParams(context.query),
    FieldSelectionSchema
  )
  
  if (fields) {
    const fieldList = fields.split(',').map(f => f.trim())
    const products = await productService.getProductsWithFields(fieldList)
    return ResponseBuilder.success(products)
  }
  
  // Return all fields by default
  const products = await productService.getAllProducts()
  return ResponseBuilder.success(products)
})

// Service implementation
async getProductsWithFields(fields: string[]) {
  // Build dynamic select
  const selectFields = fields.reduce((acc, field) => {
    if (products[field]) {
      acc[field] = products[field]
    }
    return acc
  }, {})
  
  return db.select(selectFields).from(products)
}
```

### 2. Response Compression

Enable response compression:

```typescript
// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Check if client accepts compression
  const acceptEncoding = request.headers.get('accept-encoding') || ''
  
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const response = NextResponse.next()
    
    // Enable compression for API routes
    if (acceptEncoding.includes('gzip')) {
      response.headers.set('Content-Encoding', 'gzip')
    } else if (acceptEncoding.includes('br')) {
      response.headers.set('Content-Encoding', 'br')
    }
    
    return response
  }
}
```

### 3. Streaming Responses

Stream large datasets:

```typescript
export const GET = BaseAPIHandler.GET(async (context) => {
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()
      
      // Start JSON array
      controller.enqueue(encoder.encode('{"data":['))
      
      let first = true
      let offset = 0
      const limit = 100
      
      while (true) {
        const batch = await productService.getProducts({
          offset,
          limit
        })
        
        if (batch.length === 0) break
        
        for (const item of batch) {
          if (!first) {
            controller.enqueue(encoder.encode(','))
          }
          first = false
          
          controller.enqueue(
            encoder.encode(JSON.stringify(item))
          )
        }
        
        offset += limit
        
        // Yield to prevent blocking
        await new Promise(resolve => setTimeout(resolve, 0))
      }
      
      // Close JSON
      controller.enqueue(encoder.encode('],"success":true}'))
      controller.close()
    }
  })
  
  return new Response(stream, {
    headers: {
      'Content-Type': 'application/json',
      'Transfer-Encoding': 'chunked'
    }
  })
})
```

## Query Performance

### 1. Query Analysis

Monitor and analyze slow queries:

```typescript
class QueryAnalyzer extends BaseAPIService {
  async analyzeQuery<T>(
    queryName: string,
    queryFn: () => Promise<T>
  ): Promise<{ result: T; analysis: QueryAnalysis }> {
    const startTime = performance.now()
    const startMemory = process.memoryUsage()
    
    // Execute with EXPLAIN ANALYZE in development
    if (process.env.NODE_ENV === 'development') {
      const explainResult = await db.execute(
        sql`EXPLAIN ANALYZE ${queryFn.toString()}`
      )
      console.log(`Query plan for ${queryName}:`, explainResult)
    }
    
    const result = await queryFn()
    
    const endTime = performance.now()
    const endMemory = process.memoryUsage()
    
    const analysis = {
      queryName,
      duration: endTime - startTime,
      memoryDelta: {
        heapUsed: endMemory.heapUsed - startMemory.heapUsed,
        external: endMemory.external - startMemory.external
      },
      timestamp: new Date()
    }
    
    // Log slow queries
    if (analysis.duration > 100) {
      await this.recordEvent(
        'slow_query_detected',
        `Slow query: ${queryName}`,
        analysis
      )
    }
    
    return { result, analysis }
  }
}
```

### 2. Query Optimization Patterns

```typescript
class OptimizedQueryService extends BaseAPIService {
  // Use subqueries for complex aggregations
  async getProductsWithStats() {
    return db.select({
      product: products,
      reviewCount: sql<number>`(
        SELECT COUNT(*) FROM reviews 
        WHERE reviews.product_id = products.id
      )`,
      avgRating: sql<number>`(
        SELECT AVG(rating) FROM reviews 
        WHERE reviews.product_id = products.id
      )`
    }).from(products)
  }
  
  // Use window functions for ranking
  async getTopProductsByCategory() {
    return db.select({
      id: products.id,
      name: products.name,
      category: products.category,
      sales: products.sales,
      rank: sql<number>`
        RANK() OVER (
          PARTITION BY category 
          ORDER BY sales DESC
        )`
    })
    .from(products)
    .where(sql`rank <= 10`)
  }
  
  // Use CTEs for complex queries
  async getProductRecommendations(userId: string) {
    return db.execute(sql`
      WITH user_categories AS (
        SELECT DISTINCT p.category
        FROM orders o
        JOIN products p ON o.product_id = p.id
        WHERE o.user_id = ${userId}
      ),
      recommended_products AS (
        SELECT p.*, 
               ROW_NUMBER() OVER (
                 PARTITION BY p.category 
                 ORDER BY p.rating DESC
               ) as rn
        FROM products p
        WHERE p.category IN (SELECT category FROM user_categories)
        AND p.id NOT IN (
          SELECT product_id FROM orders WHERE user_id = ${userId}
        )
      )
      SELECT * FROM recommended_products WHERE rn <= 5
    `)
  }
}
```

## Monitoring and Metrics

### 1. Performance Monitoring

```typescript
class PerformanceMonitor {
  private metrics = new Map<string, PerformanceMetric[]>()
  
  recordMetric(endpoint: string, duration: number, metadata?: any) {
    if (!this.metrics.has(endpoint)) {
      this.metrics.set(endpoint, [])
    }
    
    this.metrics.get(endpoint)!.push({
      duration,
      timestamp: Date.now(),
      metadata
    })
    
    // Keep only last 1000 metrics per endpoint
    const metrics = this.metrics.get(endpoint)!
    if (metrics.length > 1000) {
      metrics.shift()
    }
    
    // Check for performance degradation
    this.checkPerformance(endpoint)
  }
  
  private checkPerformance(endpoint: string) {
    const metrics = this.metrics.get(endpoint)!
    if (metrics.length < 100) return
    
    // Calculate percentiles
    const sorted = [...metrics].sort((a, b) => a.duration - b.duration)
    const p50 = sorted[Math.floor(sorted.length * 0.5)].duration
    const p95 = sorted[Math.floor(sorted.length * 0.95)].duration
    const p99 = sorted[Math.floor(sorted.length * 0.99)].duration
    
    // Alert if p95 > threshold
    if (p95 > 1000) {
      console.warn(`Performance alert for ${endpoint}: p95=${p95}ms`)
    }
    
    // Record metrics
    observability.metrics.histogram(p50, `${endpoint}_p50`)
    observability.metrics.histogram(p95, `${endpoint}_p95`)
    observability.metrics.histogram(p99, `${endpoint}_p99`)
  }
  
  getStats(endpoint: string) {
    const metrics = this.metrics.get(endpoint)
    if (!metrics || metrics.length === 0) return null
    
    const durations = metrics.map(m => m.duration)
    const sorted = [...durations].sort((a, b) => a - b)
    
    return {
      count: metrics.length,
      min: Math.min(...durations),
      max: Math.max(...durations),
      avg: durations.reduce((a, b) => a + b) / durations.length,
      p50: sorted[Math.floor(sorted.length * 0.5)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)]
    }
  }
}

// Use in handlers
const perfMonitor = new PerformanceMonitor()

export const GET = BaseAPIHandler.GET(async (context) => {
  const startTime = performance.now()
  
  try {
    const result = await productService.getProducts(context.query)
    return ResponseBuilder.success(result)
  } finally {
    perfMonitor.recordMetric(
      'GET /api/products',
      performance.now() - startTime,
      { query: context.query }
    )
  }
})
```

### 2. Resource Monitoring

```typescript
class ResourceMonitor {
  private interval: NodeJS.Timeout
  
  start() {
    this.interval = setInterval(() => {
      const usage = process.memoryUsage()
      const cpuUsage = process.cpuUsage()
      
      // Record memory metrics
      observability.metrics.gauge(
        usage.heapUsed / 1024 / 1024,
        'memory_heap_used_mb'
      )
      
      observability.metrics.gauge(
        usage.heapTotal / 1024 / 1024,
        'memory_heap_total_mb'
      )
      
      // Record CPU metrics
      observability.metrics.gauge(
        cpuUsage.user / 1000000,
        'cpu_user_seconds'
      )
      
      observability.metrics.gauge(
        cpuUsage.system / 1000000,
        'cpu_system_seconds'
      )
      
      // Check for issues
      if (usage.heapUsed / usage.heapTotal > 0.9) {
        console.warn('High memory usage detected')
      }
    }, 30000) // Every 30 seconds
  }
  
  stop() {
    clearInterval(this.interval)
  }
}
```

## Optimization Checklist

### Database
- [ ] Indexes created for common query patterns
- [ ] Composite indexes for multi-column queries
- [ ] Query execution plans analyzed
- [ ] N+1 queries eliminated
- [ ] Connection pooling configured
- [ ] Slow query logging enabled

### Caching
- [ ] In-memory caching for hot data
- [ ] Redis caching for shared data
- [ ] HTTP caching headers configured
- [ ] Cache invalidation strategy defined
- [ ] Cache hit rates monitored

### Response Optimization
- [ ] Field selection implemented
- [ ] Response compression enabled
- [ ] Large datasets streamed
- [ ] Pagination enforced
- [ ] Response sizes monitored

### Monitoring
- [ ] Performance metrics collected
- [ ] Slow queries logged
- [ ] Resource usage tracked
- [ ] Alerts configured
- [ ] Dashboards created

## Performance Budget

Set and enforce performance budgets:

```typescript
const PERFORMANCE_BUDGETS = {
  'GET /api/products': {
    p95: 200,  // 200ms
    p99: 500   // 500ms
  },
  'POST /api/orders': {
    p95: 500,  // 500ms
    p99: 1000  // 1 second
  }
}

// Enforce in CI/CD
async function checkPerformanceBudget() {
  for (const [endpoint, budget] of Object.entries(PERFORMANCE_BUDGETS)) {
    const stats = perfMonitor.getStats(endpoint)
    
    if (stats && stats.p95 > budget.p95) {
      throw new Error(
        `Performance budget exceeded for ${endpoint}: ` +
        `p95=${stats.p95}ms (budget=${budget.p95}ms)`
      )
    }
  }
}
```