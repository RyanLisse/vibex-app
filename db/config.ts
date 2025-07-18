import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-serverless'
import * as schema from './schema'

// Environment variables validation
const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required')
}

// Create Neon connection
const sql = neon(DATABASE_URL)

// Create Drizzle instance with schema
export const db = drizzle(sql, { schema })

// Connection configuration
export const dbConfig = {
  connectionString: DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production',
  maxConnections: 20,
  idleTimeout: 30_000,
  connectionTimeout: 10_000,
}

// Database health check
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    await sql`SELECT 1`
    return true
  } catch (error) {
    console.error('Database health check failed:', error)
    return false
  }
}

// Initialize database extensions
export async function initializeExtensions(): Promise<void> {
  try {
    // Enable pgvector extension for vector search
    await sql`CREATE EXTENSION IF NOT EXISTS vector`

    // Enable uuid-ossp for UUID generation
    await sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`

    // Enable pg_stat_statements for query performance monitoring
    await sql`CREATE EXTENSION IF NOT EXISTS pg_stat_statements`

    console.log('Database extensions initialized successfully')
  } catch (error) {
    console.error('Failed to initialize database extensions:', error)
    throw error
  }
}

// Database connection pool management with enhanced monitoring
export class DatabasePool {
  private static instance: DatabasePool
  private connectionCount = 0
  private readonly maxConnections = Number.parseInt(process.env.DB_MAX_CONNECTIONS || '20')
  private healthCheckInterval: NodeJS.Timeout | null = null
  private lastHealthCheck: Date | null = null
  private isHealthy = true

  static getInstance(): DatabasePool {
    if (!DatabasePool.instance) {
      DatabasePool.instance = new DatabasePool()
      DatabasePool.instance.startHealthMonitoring()
    }
    return DatabasePool.instance
  }

  async getConnection() {
    if (!this.isHealthy) {
      throw new Error('Database is unhealthy - connection refused')
    }

    if (this.connectionCount >= this.maxConnections) {
      throw new Error(`Maximum database connections reached (${this.maxConnections})`)
    }

    this.connectionCount++
    return sql
  }

  releaseConnection() {
    if (this.connectionCount > 0) {
      this.connectionCount--
    }
  }

  getConnectionCount(): number {
    return this.connectionCount
  }

  getMaxConnections(): number {
    return this.maxConnections
  }

  isConnectionPoolHealthy(): boolean {
    return this.isHealthy && this.connectionCount < this.maxConnections * 0.9
  }

  getLastHealthCheck(): Date | null {
    return this.lastHealthCheck
  }

  /**
   * Start continuous health monitoring
   */
  private startHealthMonitoring(): void {
    // Check health every 30 seconds
    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.performHealthCheck()
      } catch (error) {
        console.error('Health check failed:', error)
      }
    }, 30_000)

    // Perform initial health check
    this.performHealthCheck().catch(console.error)
  }

  /**
   * Perform database health check
   */
  private async performHealthCheck(): Promise<void> {
    try {
      const startTime = Date.now()
      await sql`SELECT 1`
      const responseTime = Date.now() - startTime

      this.isHealthy = responseTime < 5000 // Consider unhealthy if response > 5s
      this.lastHealthCheck = new Date()

      if (responseTime > 1000) {
        console.warn(`Database response time is high: ${responseTime}ms`)
      }
    } catch (error) {
      this.isHealthy = false
      this.lastHealthCheck = new Date()
      console.error('Database health check failed:', error)
    }
  }

  /**
   * Get detailed connection pool statistics
   */
  getPoolStats(): {
    activeConnections: number
    maxConnections: number
    utilizationPercent: number
    isHealthy: boolean
    lastHealthCheck: Date | null
  } {
    return {
      activeConnections: this.connectionCount,
      maxConnections: this.maxConnections,
      utilizationPercent: Math.round((this.connectionCount / this.maxConnections) * 100),
      isHealthy: this.isHealthy,
      lastHealthCheck: this.lastHealthCheck,
    }
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval)
      this.healthCheckInterval = null
    }
  }
}

// Enhanced database monitoring
export class DatabaseMonitor {
  private static instance: DatabaseMonitor
  private metrics: {
    queryCount: number
    errorCount: number
    totalResponseTime: number
    slowQueries: Array<{ query: string; duration: number; timestamp: Date }>
  } = {
    queryCount: 0,
    errorCount: 0,
    totalResponseTime: 0,
    slowQueries: [],
  }

  static getInstance(): DatabaseMonitor {
    if (!DatabaseMonitor.instance) {
      DatabaseMonitor.instance = new DatabaseMonitor()
    }
    return DatabaseMonitor.instance
  }

  recordQuery(duration: number, query?: string): void {
    this.metrics.queryCount++
    this.metrics.totalResponseTime += duration

    // Track slow queries (> 1 second)
    if (duration > 1000 && query) {
      this.metrics.slowQueries.push({
        query: query.substring(0, 100), // Truncate for storage
        duration,
        timestamp: new Date(),
      })

      // Keep only last 50 slow queries
      if (this.metrics.slowQueries.length > 50) {
        this.metrics.slowQueries = this.metrics.slowQueries.slice(-50)
      }
    }
  }

  recordError(): void {
    this.metrics.errorCount++
  }

  getMetrics(): {
    queryCount: number
    errorCount: number
    averageResponseTime: number
    errorRate: number
    slowQueries: Array<{ query: string; duration: number; timestamp: Date }>
  } {
    return {
      queryCount: this.metrics.queryCount,
      errorCount: this.metrics.errorCount,
      averageResponseTime:
        this.metrics.queryCount > 0
          ? Math.round(this.metrics.totalResponseTime / this.metrics.queryCount)
          : 0,
      errorRate:
        this.metrics.queryCount > 0
          ? Math.round((this.metrics.errorCount / this.metrics.queryCount) * 100)
          : 0,
      slowQueries: [...this.metrics.slowQueries],
    }
  }

  resetMetrics(): void {
    this.metrics = {
      queryCount: 0,
      errorCount: 0,
      totalResponseTime: 0,
      slowQueries: [],
    }
  }
}

export default db
