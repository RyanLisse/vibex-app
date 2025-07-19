/**
 * Database Index Optimizer
 *
 * Implements intelligent database indexing strategies based on query patterns,
 * performance analysis, and best practices for PostgreSQL with vector extensions.
 */

import { db } from '@/db/config'
import { sql } from 'drizzle-orm'
import { trace, SpanStatusCode } from '@opentelemetry/api'
import type { IndexSuggestion } from './database-query-analyzer'

export interface IndexOptimizationPlan {
  timestamp: Date
  currentIndexes: DatabaseIndex[]
  recommendedIndexes: IndexSuggestion[]
  optimizationSteps: OptimizationStep[]
  estimatedImprovements: {
    querySpeedImprovement: string
    storageOverhead: string
    maintenanceImpact: string
  }
  implementationOrder: IndexSuggestion[]
}

export interface DatabaseIndex {
  name: string
  table: string
  columns: string[]
  type: string
  size: string
  usage: {
    scans: number
    tuplesRead: number
    tuplesFetched: number
  }
  isUnused: boolean
}

export interface OptimizationStep {
  action: 'CREATE' | 'DROP' | 'REINDEX'
  indexName: string
  sql: string
  reason: string
  priority: 'high' | 'medium' | 'low'
  estimatedTime: string
}

export class DatabaseIndexOptimizer {
  private static instance: DatabaseIndexOptimizer

  static getInstance(): DatabaseIndexOptimizer {
    if (!DatabaseIndexOptimizer.instance) {
      DatabaseIndexOptimizer.instance = new DatabaseIndexOptimizer()
    }
    return DatabaseIndexOptimizer.instance
  }

  /**
   * Analyze current database indexes
   */
  async analyzeCurrentIndexes(): Promise<DatabaseIndex[]> {
    const tracer = trace.getTracer('index-optimizer')
    const span = tracer.startSpan('analyzeCurrentIndexes')

    try {
      const indexQuery = sql`
        SELECT 
          i.indexname as name,
          i.tablename as table,
          array_agg(a.attname ORDER BY a.attnum) as columns,
          am.amname as type,
          pg_size_pretty(pg_relation_size(i.indexname::regclass)) as size,
          COALESCE(s.idx_scan, 0) as scans,
          COALESCE(s.idx_tup_read, 0) as tuples_read,
          COALESCE(s.idx_tup_fetch, 0) as tuples_fetched
        FROM pg_indexes i
        JOIN pg_class c ON c.relname = i.indexname
        JOIN pg_am am ON am.oid = c.relam
        LEFT JOIN pg_stat_user_indexes s ON s.indexrelname = i.indexname
        LEFT JOIN pg_index idx ON idx.indexrelid = c.oid
        LEFT JOIN pg_attribute a ON a.attrelid = idx.indrelid AND a.attnum = ANY(idx.indkey)
        WHERE i.schemaname = 'public'
        GROUP BY i.indexname, i.tablename, am.amname, c.oid, s.idx_scan, s.idx_tup_read, s.idx_tup_fetch
        ORDER BY i.tablename, i.indexname
      `

      const result = await db.execute(indexQuery)

      const indexes: DatabaseIndex[] = result.rows.map((row) => ({
        name: row.name,
        table: row.table,
        columns: row.columns || [],
        type: row.type,
        size: row.size,
        usage: {
          scans: Number(row.scans) || 0,
          tuplesRead: Number(row.tuples_read) || 0,
          tuplesFetched: Number(row.tuples_fetched) || 0,
        },
        isUnused: Number(row.scans) === 0 && Number(row.tuples_read) === 0,
      }))

      span.setStatus({ code: SpanStatusCode.OK })
      return indexes
    } catch (error) {
      span.recordException(error as Error)
      span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message })
      throw error
    } finally {
      span.end()
    }
  }

  /**
   * Generate comprehensive index optimization plan
   */
  async generateOptimizationPlan(suggestions: IndexSuggestion[]): Promise<IndexOptimizationPlan> {
    const tracer = trace.getTracer('index-optimizer')
    const span = tracer.startSpan('generateOptimizationPlan')

    try {
      const currentIndexes = await this.analyzeCurrentIndexes()
      const optimizationSteps = await this.generateOptimizationSteps(suggestions, currentIndexes)
      const implementationOrder = this.prioritizeIndexes(suggestions)

      const plan: IndexOptimizationPlan = {
        timestamp: new Date(),
        currentIndexes,
        recommendedIndexes: suggestions,
        optimizationSteps,
        estimatedImprovements: {
          querySpeedImprovement: '30-70% faster query execution',
          storageOverhead: `~${this.estimateStorageOverhead(suggestions)}MB additional storage`,
          maintenanceImpact: 'Minimal impact on INSERT/UPDATE operations',
        },
        implementationOrder,
      }

      span.setStatus({ code: SpanStatusCode.OK })
      return plan
    } catch (error) {
      span.recordException(error as Error)
      span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message })
      throw error
    } finally {
      span.end()
    }
  }

  /**
   * Implement recommended indexes
   */
  async implementIndexes(
    suggestions: IndexSuggestion[],
    options: {
      dryRun?: boolean
      concurrent?: boolean
      maxConcurrentIndexes?: number
    } = {}
  ): Promise<{
    success: boolean
    implemented: string[]
    failed: string[]
    errors: string[]
  }> {
    const { dryRun = false, concurrent = true, maxConcurrentIndexes = 3 } = options
    const implemented: string[] = []
    const failed: string[] = []
    const errors: string[] = []

    const prioritizedSuggestions = this.prioritizeIndexes(suggestions)

    // Process indexes in batches to avoid overwhelming the database
    for (let i = 0; i < prioritizedSuggestions.length; i += maxConcurrentIndexes) {
      const batch = prioritizedSuggestions.slice(i, i + maxConcurrentIndexes)

      const batchPromises = batch.map(async (suggestion) => {
        try {
          const indexName = this.generateIndexName(suggestion)
          const createSql = this.generateCreateIndexSql(suggestion, concurrent)

          if (dryRun) {
            console.log(`[DRY RUN] Would create index: ${createSql}`)
            implemented.push(indexName)
            return
          }

          console.log(`Creating index: ${indexName}`)
          await db.execute(sql.raw(createSql))
          implemented.push(indexName)
        } catch (error) {
          const indexName = this.generateIndexName(suggestion)
          failed.push(indexName)
          errors.push(`Failed to create ${indexName}: ${(error as Error).message}`)
        }
      })

      await Promise.all(batchPromises)

      // Add delay between batches to reduce database load
      if (i + maxConcurrentIndexes < prioritizedSuggestions.length) {
        await new Promise((resolve) => setTimeout(resolve, 2000))
      }
    }

    return {
      success: failed.length === 0,
      implemented,
      failed,
      errors,
    }
  }

  /**
   * Generate optimization steps
   */
  private async generateOptimizationSteps(
    suggestions: IndexSuggestion[],
    currentIndexes: DatabaseIndex[]
  ): Promise<OptimizationStep[]> {
    const steps: OptimizationStep[] = []

    // Find unused indexes to drop
    const unusedIndexes = currentIndexes.filter(
      (idx) =>
        idx.isUnused &&
        !idx.name.endsWith('_pkey') && // Don't drop primary keys
        !idx.name.includes('unique') // Don't drop unique constraints
    )

    for (const unusedIndex of unusedIndexes) {
      steps.push({
        action: 'DROP',
        indexName: unusedIndex.name,
        sql: `DROP INDEX CONCURRENTLY IF EXISTS ${unusedIndex.name}`,
        reason: `Unused index consuming ${unusedIndex.size} of storage`,
        priority: 'medium',
        estimatedTime: '1-5 minutes',
      })
    }

    // Add creation steps for new indexes
    for (const suggestion of suggestions) {
      const indexName = this.generateIndexName(suggestion)
      const existingIndex = currentIndexes.find(
        (idx) =>
          idx.table === suggestion.table &&
          JSON.stringify(idx.columns.sort()) === JSON.stringify(suggestion.columns.sort())
      )

      if (!existingIndex) {
        steps.push({
          action: 'CREATE',
          indexName,
          sql: this.generateCreateIndexSql(suggestion, true),
          reason: suggestion.reason,
          priority: suggestion.priority,
          estimatedTime: this.estimateIndexCreationTime(suggestion),
        })
      }
    }

    return steps
  }

  /**
   * Prioritize indexes by impact and implementation complexity
   */
  private prioritizeIndexes(suggestions: IndexSuggestion[]): IndexSuggestion[] {
    return suggestions.sort((a, b) => {
      // Priority order: high > medium > low
      const priorityOrder = { high: 3, medium: 2, low: 1 }
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority]

      if (priorityDiff !== 0) return priorityDiff

      // Prefer simpler indexes (fewer columns)
      const complexityDiff = a.columns.length - b.columns.length
      if (complexityDiff !== 0) return complexityDiff

      // Prefer btree over specialized indexes for easier implementation
      const typeOrder = { btree: 4, gin: 3, gist: 2, hnsw: 1, hash: 1 }
      return (typeOrder[b.type] || 0) - (typeOrder[a.type] || 0)
    })
  }

  /**
   * Generate index name
   */
  private generateIndexName(suggestion: IndexSuggestion): string {
    const columns = suggestion.columns.join('_')
    const suffix = suggestion.type === 'btree' ? 'idx' : `${suggestion.type}_idx`
    return `${suggestion.table}_${columns}_${suffix}`
  }

  /**
   * Generate CREATE INDEX SQL
   */
  private generateCreateIndexSql(suggestion: IndexSuggestion, concurrent: boolean = true): string {
    const indexName = this.generateIndexName(suggestion)
    const concurrentKeyword = concurrent ? 'CONCURRENTLY' : ''
    const columns = suggestion.columns.join(', ')

    let sql = `CREATE INDEX ${concurrentKeyword} ${indexName} ON ${suggestion.table}`

    // Add index type and method
    switch (suggestion.type) {
      case 'hnsw':
        sql += ` USING hnsw (${columns} vector_cosine_ops)`
        break
      case 'gin':
        sql += ` USING gin (${columns})`
        break
      case 'gist':
        sql += ` USING gist (${columns})`
        break
      case 'hash':
        sql += ` USING hash (${columns})`
        break
      default: // btree
        sql += ` (${columns})`
    }

    return sql
  }

  /**
   * Estimate storage overhead for new indexes
   */
  private estimateStorageOverhead(suggestions: IndexSuggestion[]): number {
    // Rough estimation:
    // - Single column btree: ~10MB per 100k rows
    // - Multi-column btree: ~15MB per 100k rows
    // - Vector index (HNSW): ~50MB per 100k rows
    // - GIN index: ~20MB per 100k rows

    let totalMB = 0

    for (const suggestion of suggestions) {
      const baseSize = suggestion.columns.length === 1 ? 10 : 15

      switch (suggestion.type) {
        case 'hnsw':
          totalMB += 50
          break
        case 'gin':
          totalMB += 20
          break
        default:
          totalMB += baseSize
      }
    }

    return Math.round(totalMB)
  }

  /**
   * Estimate index creation time
   */
  private estimateIndexCreationTime(suggestion: IndexSuggestion): string {
    // Estimates based on index type and complexity
    switch (suggestion.type) {
      case 'hnsw':
        return '10-30 minutes'
      case 'gin':
        return '5-15 minutes'
      case 'gist':
        return '5-15 minutes'
      default:
        return suggestion.columns.length > 2 ? '3-10 minutes' : '1-5 minutes'
    }
  }

  /**
   * Validate index before creation
   */
  async validateIndex(suggestion: IndexSuggestion): Promise<{
    isValid: boolean
    warnings: string[]
    errors: string[]
  }> {
    const warnings: string[] = []
    const errors: string[] = []

    // Check if table exists
    try {
      const tableExists = await db.execute(sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = ${suggestion.table}
        )
      `)

      if (!tableExists.rows[0]?.exists) {
        errors.push(`Table ${suggestion.table} does not exist`)
      }
    } catch (error) {
      errors.push(`Failed to validate table: ${(error as Error).message}`)
    }

    // Check if columns exist
    for (const column of suggestion.columns) {
      try {
        const columnExists = await db.execute(sql`
          SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = ${suggestion.table}
            AND column_name = ${column}
          )
        `)

        if (!columnExists.rows[0]?.exists) {
          errors.push(`Column ${column} does not exist in table ${suggestion.table}`)
        }
      } catch (error) {
        errors.push(`Failed to validate column ${column}: ${(error as Error).message}`)
      }
    }

    // Check for potential issues
    if (suggestion.columns.length > 5) {
      warnings.push('Index with more than 5 columns may have limited effectiveness')
    }

    if (suggestion.type === 'hnsw' && suggestion.columns.length > 1) {
      warnings.push('HNSW indexes work best with single vector columns')
    }

    return {
      isValid: errors.length === 0,
      warnings,
      errors,
    }
  }
}

export const databaseIndexOptimizer = DatabaseIndexOptimizer.getInstance()
