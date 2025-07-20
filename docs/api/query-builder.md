# Query Builder

The QueryBuilder provides a fluent interface for building database queries with automatic pagination, filtering, and sorting support.

## Overview

QueryBuilder is a type-safe wrapper around Drizzle ORM that provides:
- Fluent query construction
- Automatic pagination with metadata
- Dynamic filtering and searching
- Sort order management
- Common query patterns
- Performance optimization

## Basic Usage

### Creating a Query Builder

```typescript
import { createQueryBuilder } from '@/lib/api/base'
import { users } from '@/db/schema'

// Create a query builder for the users table
const query = createQueryBuilder(users)

// Execute simple query
const results = await query
  .where(users.isActive, true)
  .orderBy(users.createdAt, 'desc')
  .limit(10)
  .execute()
```

### Pagination

```typescript
// Get paginated results with metadata
const result = await createQueryBuilder(users)
  .paginate(2, 20) // page 2, 20 items per page
  .executePaginated()

console.log(result)
// {
//   items: [...],
//   pagination: {
//     page: 2,
//     limit: 20,
//     total: 150,
//     totalPages: 8,
//     hasNext: true,
//     hasPrev: true
//   }
// }
```

## Query Methods

### WHERE Conditions

```typescript
// Basic equality
query.where(users.id, '123')

// NOT equality
query.whereNot(users.status, 'deleted')

// LIKE pattern matching
query.whereLike(users.email, '%@example.com')

// Greater than or equal
query.whereGte(users.age, 18)

// Less than or equal
query.whereLte(users.createdAt, new Date())

// Chaining conditions (AND)
query
  .where(users.isActive, true)
  .whereGte(users.age, 18)
  .whereLte(users.age, 65)
```

### Search Across Multiple Fields

```typescript
// Search in multiple fields with OR
const results = await createQueryBuilder(products)
  .search(
    [products.name, products.description, products.category],
    'laptop'
  )
  .execute()

// Generates: WHERE (name LIKE '%laptop%' OR description LIKE '%laptop%' OR category LIKE '%laptop%')
```

### Dynamic Filtering

```typescript
// Apply filters from an object
const filters = {
  category: 'electronics',
  inStock: true,
  minPrice: 100
}

const results = await createQueryBuilder(products)
  .filter(filters) // Automatically maps to table columns
  .execute()
```

### Sorting

```typescript
// Sort by single column
query.orderBy(users.createdAt, 'desc')

// Sort by computed column
query.orderBy(products.price, 'asc')
```

### Limiting and Offset

```typescript
// Get first 10 results
query.limit(10)

// Skip first 20 results
query.offset(20)

// Pagination helper
query.paginate(3, 10) // Equivalent to: limit(10).offset(20)
```

### Field Selection

```typescript
// Select specific fields
const results = await createQueryBuilder(users)
  .select({
    id: users.id,
    email: users.email,
    fullName: sql`${users.firstName} || ' ' || ${users.lastName}`
  })
  .execute()
```

## Advanced Queries

### Complex Filtering with Query Options

```typescript
interface ProductQueryOptions {
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  filters?: {
    category?: string
    minPrice?: number
    maxPrice?: number
    inStock?: boolean
  }
  search?: {
    fields: string[]
    query: string
  }
}

async function getProducts(options: ProductQueryOptions) {
  const query = createQueryBuilder(products)
    .applyOptions(options)
  
  // Add custom filters
  if (options.filters?.minPrice) {
    query.whereGte(products.price, options.filters.minPrice)
  }
  
  if (options.filters?.maxPrice) {
    query.whereLte(products.price, options.filters.maxPrice)
  }
  
  return query.executePaginated()
}

// Usage
const result = await getProducts({
  page: 1,
  limit: 20,
  sortBy: 'price',
  sortOrder: 'asc',
  filters: {
    category: 'electronics',
    minPrice: 100,
    maxPrice: 1000
  },
  search: {
    fields: ['name', 'description'],
    query: 'gaming'
  }
})
```

### Aggregation Queries

```typescript
// Count total records
const totalUsers = await createQueryBuilder(users)
  .where(users.isActive, true)
  .count()

// Check if any records exist
const hasAdmins = await createQueryBuilder(users)
  .where(users.role, 'admin')
  .exists()

// Get first matching record
const firstUser = await createQueryBuilder(users)
  .where(users.email, 'admin@example.com')
  .first()
```

### Join Operations

```typescript
// Manual join with Drizzle
const query = createQueryBuilder(orders)
  .select({
    orderId: orders.id,
    orderTotal: orders.total,
    userName: users.name,
    userEmail: users.email
  })

// Execute with custom join
const results = await db
  .select(query.selectFields)
  .from(orders)
  .leftJoin(users, eq(orders.userId, users.id))
  .where(query.conditions.length > 0 ? and(...query.conditions) : undefined)
  .orderBy(query.orderByClause)
  .limit(query.limitValue)
  .offset(query.offsetValue)
```

## Real-World Examples

### User Search with Filters

```typescript
class UserService {
  async searchUsers(params: {
    search?: string
    role?: string
    isActive?: boolean
    page: number
    limit: number
  }) {
    const query = createQueryBuilder(users)
    
    // Apply search across multiple fields
    if (params.search) {
      query.search(
        [users.name, users.email, users.username],
        params.search
      )
    }
    
    // Apply filters
    if (params.role) {
      query.where(users.role, params.role)
    }
    
    if (params.isActive !== undefined) {
      query.where(users.isActive, params.isActive)
    }
    
    // Apply pagination and sorting
    query
      .orderBy(users.createdAt, 'desc')
      .paginate(params.page, params.limit)
    
    return query.executePaginated()
  }
}
```

### Product Catalog with Complex Filters

```typescript
class ProductService {
  async getCatalog(filters: {
    categories?: string[]
    priceRange?: { min: number; max: number }
    tags?: string[]
    search?: string
    inStock?: boolean
    page: number
    limit: number
    sortBy: 'price' | 'name' | 'createdAt'
    sortOrder: 'asc' | 'desc'
  }) {
    const query = createQueryBuilder(products)
    
    // Category filter
    if (filters.categories?.length) {
      query.where(products.category, sql`ANY(${filters.categories})`)
    }
    
    // Price range
    if (filters.priceRange) {
      query
        .whereGte(products.price, filters.priceRange.min)
        .whereLte(products.price, filters.priceRange.max)
    }
    
    // Tags filter (assuming array column)
    if (filters.tags?.length) {
      filters.tags.forEach(tag => {
        query.where(sql`${products.tags} @> ARRAY[${tag}]`)
      })
    }
    
    // Search
    if (filters.search) {
      query.search(
        [products.name, products.description],
        filters.search
      )
    }
    
    // Stock filter
    if (filters.inStock !== undefined) {
      query.where(products.inStock, filters.inStock)
    }
    
    // Sorting
    const sortColumn = {
      price: products.price,
      name: products.name,
      createdAt: products.createdAt
    }[filters.sortBy]
    
    query.orderBy(sortColumn, filters.sortOrder)
    
    // Pagination
    query.paginate(filters.page, filters.limit)
    
    return query.executePaginated()
  }
}
```

### Audit Log Query

```typescript
class AuditService {
  async getAuditLogs(params: {
    userId?: string
    action?: string
    resourceType?: string
    startDate?: Date
    endDate?: Date
    page: number
    limit: number
  }) {
    const query = createQueryBuilder(auditLogs)
    
    // User filter
    if (params.userId) {
      query.where(auditLogs.userId, params.userId)
    }
    
    // Action filter
    if (params.action) {
      query.where(auditLogs.action, params.action)
    }
    
    // Resource type filter
    if (params.resourceType) {
      query.where(auditLogs.resourceType, params.resourceType)
    }
    
    // Date range
    if (params.startDate) {
      query.whereGte(auditLogs.createdAt, params.startDate)
    }
    
    if (params.endDate) {
      query.whereLte(auditLogs.createdAt, params.endDate)
    }
    
    // Sort by most recent first
    query
      .orderBy(auditLogs.createdAt, 'desc')
      .paginate(params.page, params.limit)
    
    const result = await query.executePaginated()
    
    // Enhance with user details
    const userIds = [...new Set(result.items.map(log => log.userId))]
    const users = await db.query.users.findMany({
      where: sql`id = ANY(${userIds})`
    })
    
    const userMap = new Map(users.map(u => [u.id, u]))
    
    return {
      ...result,
      items: result.items.map(log => ({
        ...log,
        user: userMap.get(log.userId)
      }))
    }
  }
}
```

## Performance Optimization

### Index Usage

```typescript
// Ensure your queries use indexes efficiently
const query = createQueryBuilder(users)
  .where(users.email, 'user@example.com') // Uses email index
  .first()

// Compound index usage
const query = createQueryBuilder(orders)
  .where(orders.userId, userId)
  .where(orders.status, 'pending')
  .orderBy(orders.createdAt, 'desc') // Uses (userId, status, createdAt) index
```

### Count Optimization

```typescript
// For large tables, use estimates when exact count isn't critical
class OptimizedQueryBuilder extends QueryBuilder {
  async estimatedCount(): Promise<number> {
    // PostgreSQL example
    const result = await db.execute(sql`
      SELECT reltuples::BIGINT AS estimate
      FROM pg_class
      WHERE relname = ${this.table}
    `)
    
    return result[0]?.estimate || 0
  }
}

// Use exact count for filtered queries
const exactCount = await query
  .where(products.category, 'electronics')
  .count()

// Use estimate for total table count
const estimatedTotal = await query.estimatedCount()
```

### Batch Operations

```typescript
// Process large datasets in batches
async function* batchQuery<T>(
  query: QueryBuilder<T>,
  batchSize = 1000
): AsyncGenerator<T[], void, unknown> {
  let offset = 0
  let hasMore = true
  
  while (hasMore) {
    const batch = await query
      .limit(batchSize)
      .offset(offset)
      .execute()
    
    if (batch.length > 0) {
      yield batch
      offset += batchSize
      hasMore = batch.length === batchSize
    } else {
      hasMore = false
    }
  }
}

// Usage
for await (const batch of batchQuery(createQueryBuilder(users))) {
  await processBatch(batch)
}
```

## Testing

```typescript
import { describe, it, expect } from 'vitest'
import { createQueryBuilder } from '@/lib/api/base'
import { users } from '@/db/schema'

describe('QueryBuilder', () => {
  it('should build WHERE conditions', async () => {
    const query = createQueryBuilder(users)
      .where(users.isActive, true)
      .whereGte(users.age, 18)
    
    const results = await query.execute()
    
    expect(results).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          isActive: true,
          age: expect.toBeGreaterThanOrEqual(18)
        })
      ])
    )
  })

  it('should handle pagination', async () => {
    const result = await createQueryBuilder(users)
      .paginate(2, 10)
      .executePaginated()
    
    expect(result.pagination).toEqual({
      page: 2,
      limit: 10,
      total: expect.any(Number),
      totalPages: expect.any(Number),
      hasNext: expect.any(Boolean),
      hasPrev: true
    })
    
    expect(result.items).toHaveLength(
      Math.min(10, Math.max(0, result.pagination.total - 10))
    )
  })

  it('should search across multiple fields', async () => {
    const searchTerm = 'john'
    const results = await createQueryBuilder(users)
      .search([users.name, users.email, users.username], searchTerm)
      .execute()
    
    expect(results).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: expect.stringMatching(/john/i)
        })
      ])
    )
  })
})
```

## Best Practices

1. **Use indexes effectively** - Structure queries to leverage database indexes
2. **Paginate large datasets** - Always use pagination for list endpoints
3. **Avoid N+1 queries** - Use joins or batch loading for related data
4. **Use field selection** - Only select fields you need
5. **Cache query results** - Cache frequently accessed, rarely changing data
6. **Monitor query performance** - Track slow queries and optimize
7. **Use query builder methods** - Prefer builder methods over raw SQL
8. **Test with realistic data** - Ensure queries perform well with production-like data
9. **Document complex queries** - Add comments explaining complex logic
10. **Consider read replicas** - Use read replicas for heavy read operations