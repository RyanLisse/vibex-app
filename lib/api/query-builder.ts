/**
 * Query Builder Utilities
 * 
 * Provides standardized database query building functionality
 * Reduces duplication in filter, sort, and pagination logic
 */
import { and, or, eq, like, gte, lte, desc, asc, sql } from 'drizzle-orm'
import type { SQL } from 'drizzle-orm'

export interface QueryFilters {
  [key: string]: any
}

export interface QueryOptions {
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  page?: number
  limit?: number
}

export class QueryBuilder {
  /**
   * Build WHERE conditions from filters
   */
  static buildConditions(
    filters: QueryFilters,
    table: any,
    searchFields?: string[]
  ): SQL | undefined {
    const conditions: SQL[] = []

    for (const [key, value] of Object.entries(filters)) {
      if (value === undefined || value === null || value === '') continue

      // Handle special cases
      if (key === 'search' && searchFields && value) {
        const searchConditions = searchFields.map(field => 
          like(table[field], `%${value}%`)
        )
        if (searchConditions.length > 0) {
          conditions.push(or(...searchConditions))
        }
      } else if (key === 'dateFrom' && table.createdAt) {
        conditions.push(gte(table.createdAt, new Date(value)))
      } else if (key === 'dateTo' && table.createdAt) {
        conditions.push(lte(table.createdAt, new Date(value)))
      } else if (key.endsWith('_min') && table[key.replace('_min', '')]) {
        const field = key.replace('_min', '')
        conditions.push(gte(table[field], value))
      } else if (key.endsWith('_max') && table[key.replace('_max', '')]) {
        const field = key.replace('_max', '')
        conditions.push(lte(table[field], value))
      } else if (Array.isArray(value) && table[key]) {
        // Handle array filters (e.g., status in ['active', 'pending'])
        if (value.length > 0) {
          conditions.push(sql`${table[key]} = ANY(${value})`)
        }
      } else if (table[key]) {
        // Direct equality
        conditions.push(eq(table[key], value))
      }
    }

    return conditions.length > 0 ? and(...conditions) : undefined
  }

  /**
   * Build ORDER BY clause
   */
  static buildOrderBy(
    sortBy: string | undefined,
    sortOrder: 'asc' | 'desc' | undefined,
    table: any,
    defaultSort?: { field: string; order: 'asc' | 'desc' }
  ): SQL | undefined {
    const field = sortBy || defaultSort?.field
    const order = sortOrder || defaultSort?.order || 'desc'

    if (!field || !table[field]) {
      return defaultSort && table[defaultSort.field]
        ? order === 'asc' 
          ? asc(table[defaultSort.field])
          : desc(table[defaultSort.field])
        : undefined
    }

    return order === 'asc' ? asc(table[field]) : desc(table[field])
  }

  /**
   * Build pagination parameters
   */
  static buildPagination(options: QueryOptions) {
    const page = Math.max(1, options.page || 1)
    const limit = Math.min(100, Math.max(1, options.limit || 20))
    const offset = (page - 1) * limit

    return { limit, offset, page }
  }

  /**
   * Build a complete query with filters, sorting, and pagination
   */
  static buildQuery<T>(
    baseQuery: any,
    table: any,
    options: {
      filters?: QueryFilters
      searchFields?: string[]
      sortBy?: string
      sortOrder?: 'asc' | 'desc'
      page?: number
      limit?: number
      defaultSort?: { field: string; order: 'asc' | 'desc' }
    }
  ) {
    let query = baseQuery

    // Apply filters
    const conditions = this.buildConditions(
      options.filters || {},
      table,
      options.searchFields
    )
    if (conditions) {
      query = query.where(conditions)
    }

    // Apply sorting
    const orderBy = this.buildOrderBy(
      options.sortBy,
      options.sortOrder,
      table,
      options.defaultSort
    )
    if (orderBy) {
      query = query.orderBy(orderBy)
    }

    // Apply pagination
    if (options.page !== undefined || options.limit !== undefined) {
      const { limit, offset } = this.buildPagination({
        page: options.page,
        limit: options.limit,
      })
      query = query.limit(limit).offset(offset)
    }

    return query
  }

  /**
   * Build a count query for pagination
   */
  static async getCount(
    db: any,
    table: any,
    filters?: QueryFilters,
    searchFields?: string[]
  ): Promise<number> {
    const conditions = this.buildConditions(filters || {}, table, searchFields)
    
    const query = db
      .select({ count: sql<number>`count(*)::int` })
      .from(table)

    if (conditions) {
      query.where(conditions)
    }

    const result = await query
    return result[0]?.count || 0
  }

  /**
   * Execute a paginated query
   */
  static async executePaginatedQuery<T>(
    db: any,
    table: any,
    options: {
      select?: any
      filters?: QueryFilters
      searchFields?: string[]
      sortBy?: string
      sortOrder?: 'asc' | 'desc'
      page?: number
      limit?: number
      defaultSort?: { field: string; order: 'asc' | 'desc' }
    }
  ): Promise<{
    data: T[]
    pagination: {
      page: number
      limit: number
      total: number
      totalPages: number
      hasMore: boolean
    }
  }> {
    // Get pagination params
    const { limit, page } = this.buildPagination({
      page: options.page,
      limit: options.limit,
    })

    // Build and execute main query
    const baseQuery = options.select 
      ? db.select(options.select).from(table)
      : db.select().from(table)

    const query = this.buildQuery(baseQuery, table, {
      ...options,
      page,
      limit,
    })

    const [data, total] = await Promise.all([
      query,
      this.getCount(db, table, options.filters, options.searchFields),
    ])

    // Calculate pagination info
    const totalPages = Math.ceil(total / limit)
    const hasMore = page < totalPages

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasMore,
      },
    }
  }
}