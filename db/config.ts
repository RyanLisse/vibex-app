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

// Database connection pool management
export class DatabasePool {
  private static instance: DatabasePool
  private connectionCount = 0
  private readonly maxConnections = 20

  static getInstance(): DatabasePool {
    if (!DatabasePool.instance) {
      DatabasePool.instance = new DatabasePool()
    }
    return DatabasePool.instance
  }

  async getConnection() {
    if (this.connectionCount >= this.maxConnections) {
      throw new Error('Maximum database connections reached')
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
}

export default db
