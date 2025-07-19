/**
 * Database Query Analyzer
 *
 * Comprehensive tool for analyzing database query performance, identifying bottlenecks,
 * and generating optimization recommendations for the ElectricSQL + Drizzle + Neon setup.
 */

import { db } from '@/db/config'
import { sql } from 'drizzle-orm'
import { trace, SpanStatusCode } from '@opentelemetry/api'
import { observability } from '@/lib/observability'

export interface QueryAnalysis {
  query: string
  queryType: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE'
  executionTime: number
  cost: number
  rows: number
  bufferHits: number
  bufferReads: number
  planningTime: number
  executionPlan: any[]
  bottlenecks: string[]
  recommendations: string[]
  indexSuggestions: IndexSuggestion[]
}

export interface IndexSuggestion {
  table: string
  columns: string[]
  type: 'btree' | 'hash' | 'gin' | 'gist' | 'hnsw'
  reason: string
  estimatedImprovement: string
  priority: 'high' | 'medium' | 'low'
}

export interface DatabaseAnalysisReport {
  timestamp: Date
  totalQueries: number
  slowQueries: QueryAnalysis[]
  missingIndexes: IndexSuggestion[]
  performanceMetrics: {
    averageQueryTime: number
    p95QueryTime: number
    p99QueryTime: number
    totalExecutionTime: number
    cacheHitRatio: number
  }
  recommendations: {
    immediate: string[]
    shortTerm: string[]
    longTerm: string[]
  }
  electricSqlOptimizations: {
    syncLatency: number
    batchSize: number
    conflictResolution: string[]
    recommendations: string[]
  }
}

export class DatabaseQueryAnalyzer {
  private static instance: DatabaseQueryAnalyzer
  private queryHistory: QueryAnalysis[] = []
  private analysisCache = new Map<string, QueryAnalysis>()

  static getInstance(): DatabaseQueryAnalyzer {
    if (!DatabaseQueryAnalyzer.instance) {
      DatabaseQueryAnalyzer.instance = new DatabaseQueryAnalyzer()
    }
    return DatabaseQueryAnalyzer.instance
  }

  /**
   * Analyze a specific SQL query
   */
  async analyzeQuery(query: string, params: any[] = []): Promise<QueryAnalysis> {
    const tracer = trace.getTracer('database-analyzer')
    const span = tracer.startSpan('analyzeQuery')

    try {
      const cacheKey = `${query}:${JSON.stringify(params)}`
      if (this.analysisCache.has(cacheKey)) {
        return this.analysisCache.get(cacheKey)!
      }

      const startTime = performance.now()

      // Run EXPLAIN ANALYZE
      const explainQuery = `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${query}`
      const explainResult = await db.execute(sql.raw(explainQuery, params))

      const executionTime = performance.now() - startTime
      const planData = explainResult.rows[0]['QUERY PLAN'][0]

      const analysis: QueryAnalysis = {
        query: query.trim(),
        queryType: this.extractQueryType(query),
        executionTime,
        cost: planData['Total Cost'] || 0,
        rows: planData['Actual Rows'] || 0,
        bufferHits: this.extractBufferHits(planData),
        bufferReads: this.extractBufferReads(planData),
        planningTime: planData['Planning Time'] || 0,
        executionPlan: planData.Plan ? [planData.Plan] : [],
        bottlenecks: this.identifyBottlenecks(planData),
        recommendations: [],
        indexSuggestions: [],
      }

      // Generate recommendations
      analysis.recommendations = this.generateRecommendations(analysis)
      analysis.indexSuggestions = await this.suggestIndexes(analysis)

      // Cache the analysis
      this.analysisCache.set(cacheKey, analysis)
      this.queryHistory.push(analysis)

      span.setStatus({ code: SpanStatusCode.OK })
      return analysis
    } catch (error) {
      span.recordException(error as Error)
      span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message })
      throw error
    } finally {
      span.end()
    }
  }

  /**
   * Analyze all critical queries in the application
   */
  async analyzeCriticalQueries(): Promise<QueryAnalysis[]> {
    const criticalQueries = [
      // Task queries
      `SELECT * FROM tasks WHERE user_id = $1 AND status = $2 ORDER BY created_at DESC LIMIT 20`,
      `SELECT * FROM tasks WHERE user_id = $1 AND status IN ($2, $3) AND priority = $4`,
      `SELECT * FROM tasks WHERE user_id = $1 AND title ILIKE $2`,

      // Environment queries
      `SELECT * FROM environments WHERE user_id = $1 AND is_active = true`,
      `SELECT * FROM environments WHERE user_id = $1 ORDER BY created_at DESC`,

      // Agent execution queries
      `SELECT ae.*, t.title FROM agent_executions ae JOIN tasks t ON ae.task_id = t.id WHERE t.user_id = $1`,
      `SELECT * FROM agent_executions WHERE task_id = $1 ORDER BY started_at DESC`,

      // Observability queries
      `SELECT * FROM observability_events WHERE execution_id = $1 ORDER BY timestamp DESC`,
      `SELECT COUNT(*) FROM observability_events WHERE timestamp > $1`,

      // Vector search queries
      `SELECT *, embedding <-> $1 as distance FROM tasks WHERE user_id = $2 ORDER BY distance LIMIT 10`,
      `SELECT *, embedding <-> $1 as distance FROM agent_memory WHERE agent_type = $2 ORDER BY distance LIMIT 5`,
    ]

    const analyses: QueryAnalysis[] = []

    for (const query of criticalQueries) {
      try {
        const analysis = await this.analyzeQuery(query, this.generateSampleParams(query))
        analyses.push(analysis)
      } catch (error) {
        console.warn(`Failed to analyze query: ${query.substring(0, 50)}...`, error)
      }
    }

    return analyses
  }

  /**
   * Generate comprehensive database analysis report
   */
  async generateAnalysisReport(): Promise<DatabaseAnalysisReport> {
    const tracer = trace.getTracer('database-analyzer')
    const span = tracer.startSpan('generateAnalysisReport')

    try {
      // Analyze critical queries
      const criticalAnalyses = await this.analyzeCriticalQueries()

      // Get database statistics
      const dbStats = await this.getDatabaseStatistics()

      // Analyze ElectricSQL performance
      const electricSqlAnalysis = await this.analyzeElectricSqlPerformance()

      // Calculate performance metrics
      const executionTimes = criticalAnalyses.map((a) => a.executionTime)
      const performanceMetrics = {
        averageQueryTime: executionTimes.reduce((a, b) => a + b, 0) / executionTimes.length,
        p95QueryTime: this.calculatePercentile(executionTimes, 95),
        p99QueryTime: this.calculatePercentile(executionTimes, 99),
        totalExecutionTime: executionTimes.reduce((a, b) => a + b, 0),
        cacheHitRatio: dbStats.cacheHitRatio,
      }

      // Identify slow queries (>100ms)
      const slowQueries = criticalAnalyses.filter((a) => a.executionTime > 100)

      // Collect all index suggestions
      const missingIndexes = criticalAnalyses
        .flatMap((a) => a.indexSuggestions)
        .filter(
          (index, i, arr) =>
            arr.findIndex(
              (other) =>
                other.table === index.table &&
                JSON.stringify(other.columns) === JSON.stringify(index.columns)
            ) === i
        )

      // Generate recommendations
      const recommendations = this.generateGlobalRecommendations(
        criticalAnalyses,
        dbStats,
        electricSqlAnalysis
      )

      const report: DatabaseAnalysisReport = {
        timestamp: new Date(),
        totalQueries: criticalAnalyses.length,
        slowQueries,
        missingIndexes,
        performanceMetrics,
        recommendations,
        electricSqlOptimizations: electricSqlAnalysis,
      }

      span.setStatus({ code: SpanStatusCode.OK })
      return report
    } catch (error) {
      span.recordException(error as Error)
      span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message })
      throw error
    } finally {
      span.end()
    }
  }

  /**
   * Extract query type from SQL
   */
  private extractQueryType(query: string): 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' {
    const trimmed = query.trim().toUpperCase()
    if (trimmed.startsWith('SELECT')) return 'SELECT'
    if (trimmed.startsWith('INSERT')) return 'INSERT'
    if (trimmed.startsWith('UPDATE')) return 'UPDATE'
    if (trimmed.startsWith('DELETE')) return 'DELETE'
    return 'SELECT'
  }

  /**
   * Extract buffer hits from execution plan
   */
  private extractBufferHits(planData: any): number {
    return this.extractBufferMetric(planData, 'Shared Hit Blocks') || 0
  }

  /**
   * Extract buffer reads from execution plan
   */
  private extractBufferReads(planData: any): number {
    return this.extractBufferMetric(planData, 'Shared Read Blocks') || 0
  }

  /**
   * Extract buffer metric recursively from plan
   */
  private extractBufferMetric(node: any, metric: string): number {
    if (!node) return 0

    let total = node[metric] || 0

    if (node.Plans) {
      for (const child of node.Plans) {
        total += this.extractBufferMetric(child, metric)
      }
    }

    return total
  }

  /**
   * Identify performance bottlenecks from execution plan
   */
  private identifyBottlenecks(planData: any): string[] {
    const bottlenecks: string[] = []

    if (planData['Execution Time'] > 100) {
      bottlenecks.push('High execution time (>100ms)')
    }

    if (planData['Planning Time'] > 10) {
      bottlenecks.push('High planning time (>10ms)')
    }

    // Check for sequential scans
    if (this.hasSequentialScan(planData.Plan)) {
      bottlenecks.push('Sequential scan detected - missing index')
    }

    // Check for nested loops with high cost
    if (this.hasExpensiveNestedLoop(planData.Plan)) {
      bottlenecks.push('Expensive nested loop - consider index or join optimization')
    }

    return bottlenecks
  }

  /**
   * Check if execution plan contains sequential scan
   */
  private hasSequentialScan(plan: any): boolean {
    if (!plan) return false

    if (plan['Node Type'] === 'Seq Scan') {
      return true
    }

    if (plan.Plans) {
      return plan.Plans.some((child: any) => this.hasSequentialScan(child))
    }

    return false
  }

  /**
   * Check if execution plan has expensive nested loops
   */
  private hasExpensiveNestedLoop(plan: any): boolean {
    if (!plan) return false

    if (plan['Node Type'] === 'Nested Loop' && plan['Total Cost'] > 1000) {
      return true
    }

    if (plan.Plans) {
      return plan.Plans.some((child: any) => this.hasExpensiveNestedLoop(child))
    }

    return false
  }

  /**
   * Generate optimization recommendations for a query
   */
  private generateRecommendations(analysis: QueryAnalysis): string[] {
    const recommendations: string[] = []

    if (analysis.executionTime > 100) {
      recommendations.push('Consider adding appropriate indexes to reduce execution time')
    }

    if (analysis.bottlenecks.includes('Sequential scan detected - missing index')) {
      recommendations.push('Add indexes for WHERE clause columns to avoid sequential scans')
    }

    if (analysis.queryType === 'SELECT' && analysis.rows > 1000) {
      recommendations.push('Consider adding LIMIT clause or pagination for large result sets')
    }

    if (analysis.bufferReads > analysis.bufferHits) {
      recommendations.push(
        'Low cache hit ratio - consider increasing shared_buffers or optimizing query'
      )
    }

    return recommendations
  }

  /**
   * Calculate percentile from array of numbers
   */
  private calculatePercentile(values: number[], percentile: number): number {
    const sorted = values.slice().sort((a, b) => a - b)
    const index = Math.ceil((percentile / 100) * sorted.length) - 1
    return sorted[index] || 0
  }

  /**
   * Generate sample parameters for query testing
   */
  private generateSampleParams(query: string): any[] {
    const paramCount = (query.match(/\$\d+/g) || []).length
    const params: any[] = []

    for (let i = 0; i < paramCount; i++) {
      // Generate appropriate sample data based on common patterns
      if (query.includes('user_id')) {
        params.push('sample-user-id')
      } else if (query.includes('status')) {
        params.push('pending')
      } else if (query.includes('priority')) {
        params.push('high')
      } else if (query.includes('embedding')) {
        params.push(Array(1536).fill(0.1)) // Sample embedding vector
      } else if (query.includes('timestamp')) {
        params.push(new Date(Date.now() - 24 * 60 * 60 * 1000)) // 24 hours ago
      } else {
        params.push('sample-value')
      }
    }

    return params
  }

  /**
   * Suggest indexes based on query analysis
   */
  private async suggestIndexes(analysis: QueryAnalysis): Promise<IndexSuggestion[]> {
    const suggestions: IndexSuggestion[] = []
    const query = analysis.query.toLowerCase()

    // Analyze WHERE clauses for index opportunities
    const whereMatches = query.match(
      /where\s+(.+?)(?:\s+order\s+by|\s+group\s+by|\s+limit|\s+offset|$)/i
    )
    if (whereMatches) {
      const whereClause = whereMatches[1]

      // Single column indexes
      const columnMatches = whereClause.match(/(\w+)\s*[=<>]/g)
      if (columnMatches) {
        for (const match of columnMatches) {
          const column = match.replace(/\s*[=<>].*/, '')
          suggestions.push({
            table: this.extractTableName(query),
            columns: [column],
            type: 'btree',
            reason: `Frequent filtering on ${column}`,
            estimatedImprovement: '30-50% faster WHERE queries',
            priority: 'high',
          })
        }
      }

      // Composite indexes for multiple conditions
      const multiColumnPattern = /(\w+)\s*[=<>][^)]+(?:and|or)\s+(\w+)\s*[=<>]/gi
      let multiMatch
      while ((multiMatch = multiColumnPattern.exec(whereClause)) !== null) {
        suggestions.push({
          table: this.extractTableName(query),
          columns: [multiMatch[1], multiMatch[2]],
          type: 'btree',
          reason: `Multiple column filtering on ${multiMatch[1]} and ${multiMatch[2]}`,
          estimatedImprovement: '50-70% faster complex WHERE queries',
          priority: 'high',
        })
      }
    }

    // Vector search indexes
    if (query.includes('<->') || query.includes('embedding')) {
      suggestions.push({
        table: this.extractTableName(query),
        columns: ['embedding'],
        type: 'hnsw',
        reason: 'Vector similarity search optimization',
        estimatedImprovement: '80-90% faster vector searches',
        priority: 'high',
      })
    }

    // ORDER BY indexes
    const orderByMatch = query.match(/order\s+by\s+(\w+)/i)
    if (orderByMatch) {
      suggestions.push({
        table: this.extractTableName(query),
        columns: [orderByMatch[1]],
        type: 'btree',
        reason: `Sorting optimization for ${orderByMatch[1]}`,
        estimatedImprovement: '40-60% faster ORDER BY queries',
        priority: 'medium',
      })
    }

    return suggestions
  }

  /**
   * Extract table name from query
   */
  private extractTableName(query: string): string {
    const fromMatch = query.match(/from\s+(\w+)/i)
    return fromMatch ? fromMatch[1] : 'unknown'
  }

  /**
   * Get database statistics
   */
  private async getDatabaseStatistics(): Promise<{
    cacheHitRatio: number
    indexUsage: any[]
    tableStats: any[]
  }> {
    try {
      // Cache hit ratio
      const cacheStats = await db.execute(sql`
        SELECT
          sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read)) * 100 as cache_hit_ratio
        FROM pg_statio_user_tables
      `)

      // Index usage statistics
      const indexStats = await db.execute(sql`
        SELECT
          schemaname,
          tablename,
          indexname,
          idx_tup_read,
          idx_tup_fetch
        FROM pg_stat_user_indexes
        ORDER BY idx_tup_read DESC
        LIMIT 20
      `)

      // Table statistics
      const tableStats = await db.execute(sql`
        SELECT
          schemaname,
          tablename,
          n_tup_ins,
          n_tup_upd,
          n_tup_del,
          n_live_tup,
          n_dead_tup
        FROM pg_stat_user_tables
        ORDER BY n_live_tup DESC
      `)

      return {
        cacheHitRatio: cacheStats.rows[0]?.cache_hit_ratio || 0,
        indexUsage: indexStats.rows,
        tableStats: tableStats.rows,
      }
    } catch (error) {
      console.warn('Failed to get database statistics:', error)
      return {
        cacheHitRatio: 0,
        indexUsage: [],
        tableStats: [],
      }
    }
  }

  /**
   * Analyze ElectricSQL performance
   */
  private async analyzeElectricSqlPerformance(): Promise<{
    syncLatency: number
    batchSize: number
    conflictResolution: string[]
    recommendations: string[]
  }> {
    // This would integrate with ElectricSQL metrics when available
    // For now, return default analysis
    return {
      syncLatency: 50, // ms
      batchSize: 100,
      conflictResolution: ['last-write-wins'],
      recommendations: [
        'Consider increasing batch size for bulk operations',
        'Implement delta sync for large tables',
        'Optimize conflict resolution strategies',
      ],
    }
  }

  /**
   * Generate global recommendations
   */
  private generateGlobalRecommendations(
    analyses: QueryAnalysis[],
    dbStats: any,
    electricSqlAnalysis: any
  ): {
    immediate: string[]
    shortTerm: string[]
    longTerm: string[]
  } {
    const immediate: string[] = []
    const shortTerm: string[] = []
    const longTerm: string[] = []

    // Immediate recommendations
    const slowQueries = analyses.filter((a) => a.executionTime > 100)
    if (slowQueries.length > 0) {
      immediate.push(`Optimize ${slowQueries.length} slow queries (>100ms execution time)`)
    }

    if (dbStats.cacheHitRatio < 95) {
      immediate.push('Improve cache hit ratio - currently below 95%')
    }

    // Short-term recommendations
    const missingIndexes = analyses.flatMap((a) => a.indexSuggestions).length
    if (missingIndexes > 0) {
      shortTerm.push(`Add ${missingIndexes} recommended indexes for better performance`)
    }

    shortTerm.push('Implement query result caching for frequently accessed data')
    shortTerm.push('Set up automated slow query monitoring and alerting')

    // Long-term recommendations
    longTerm.push('Consider implementing read replicas for read-heavy workloads')
    longTerm.push('Evaluate database partitioning for large tables')
    longTerm.push('Implement connection pooling optimization')

    return { immediate, shortTerm, longTerm }
  }

  /**
   * Clear analysis cache
   */
  clearCache(): void {
    this.analysisCache.clear()
    this.queryHistory = []
  }

  /**
   * Get query history
   */
  getQueryHistory(): QueryAnalysis[] {
    return [...this.queryHistory]
  }
}

export const databaseQueryAnalyzer = DatabaseQueryAnalyzer.getInstance()
