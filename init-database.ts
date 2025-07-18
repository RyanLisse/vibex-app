#!/usr/bin/env bun

import { neon } from '@neondatabase/serverless'
import { readFileSync } from 'fs'
import { join } from 'path'

// Load environment variables from .env.local
const envPath = join(process.cwd(), '.env.local')
try {
  const envContent = readFileSync(envPath, 'utf-8')
  const envLines = envContent.split('\n')
  for (const line of envLines) {
    if (line.includes('=') && !line.startsWith('#')) {
      const [key, ...valueParts] = line.split('=')
      const value = valueParts.join('=').trim()
      if (key && value && !process.env[key]) {
        process.env[key] = value
      }
    }
  }
} catch (error) {
  console.warn('Could not load .env.local file')
}

const DATABASE_URL =
  process.env.DATABASE_URL ||
  'postgres://neondb_owner:npg_AVsLnqbi76wD@ep-snowy-lab-a2mp8bgg-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require'

async function initializeDatabase() {
  try {
    console.log('🚀 Initializing database...')
    const sql = neon(DATABASE_URL)

    // Test connection
    await sql`SELECT 1`
    console.log('✅ Database connection successful')

    // Check if schema already exists
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('tasks', 'environments', 'agent_executions', 'observability_events', 'agent_memory', 'workflows', 'workflow_executions', 'execution_snapshots', 'migrations')
      ORDER BY table_name
    `

    if (tables.length > 0) {
      console.log(
        '📋 Found existing tables:',
        tables.map((t) => t.table_name)
      )
      console.log('✅ Database schema appears to be already initialized')
      return
    }

    console.log('📋 No existing schema found, running initialization...')

    // Read and execute the initial migration
    const migrationPath = join(process.cwd(), 'db/migrations/sql/001_initial_schema.sql')
    const migrationContent = readFileSync(migrationPath, 'utf-8')

    // Extract the UP section
    const lines = migrationContent.split('\n')
    const upStartIndex = lines.findIndex((line) => line.trim() === '-- Up')
    const downStartIndex = lines.findIndex((line) => line.trim() === '-- Down')

    if (upStartIndex === -1 || downStartIndex === -1) {
      throw new Error('Invalid migration file format')
    }

    const upSql = lines
      .slice(upStartIndex + 1, downStartIndex)
      .join('\n')
      .trim()

    // Execute the migration SQL
    console.log('🔄 Executing initial schema migration...')

    // Split by semicolon and execute each statement
    const statements = upSql
      .split(';')
      .map((stmt) => stmt.trim())
      .filter((stmt) => stmt.length > 0)

    for (const statement of statements) {
      if (statement.trim()) {
        console.log(`Executing: ${statement.substring(0, 50)}...`)
        await sql.unsafe(statement)
      }
    }

    console.log('✅ Database initialization completed successfully')

    // Verify the schema
    const finalTables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `
    console.log(
      '📋 Created tables:',
      finalTables.map((t) => t.table_name)
    )

    // Check extensions
    const extensions = await sql`
      SELECT extname 
      FROM pg_extension 
      WHERE extname IN ('uuid-ossp', 'vector', 'pg_stat_statements')
      ORDER BY extname
    `
    console.log(
      '🔌 Installed extensions:',
      extensions.map((e) => e.extname)
    )
  } catch (error) {
    console.error('❌ Database initialization failed:', error)
    process.exit(1)
  }
}

initializeDatabase()
