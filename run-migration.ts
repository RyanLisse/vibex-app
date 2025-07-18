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

const DATABASE_URL = process.env.DATABASE_URL

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is required')
  process.exit(1)
}

async function runMigration() {
  try {
    console.log('🚀 Running database migration...')
    console.log('🔗 Database URL:', DATABASE_URL.replace(/:[^:@]*@/, ':***@'))
    
    const sql = neon(DATABASE_URL)
    
    // Test connection
    await sql`SELECT 1`
    console.log('✅ Database connection successful')
    
    // Check if tables already exist
    const existingTables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('tasks', 'environments', 'agent_executions', 'observability_events', 'agent_memory', 'workflows', 'workflow_executions', 'execution_snapshots', 'migrations')
      ORDER BY table_name
    `
    
    if (existingTables.length > 0) {
      console.log('📋 Found existing tables:', existingTables.map(t => t.table_name))
      console.log('✅ Database schema appears to be already initialized')
      
      // Check migration status
      const migrationCheck = await sql`
        SELECT COUNT(*) as count 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'migrations'
      `
      
      if (migrationCheck[0].count > 0) {
        const migrations = await sql`
          SELECT name, executed_at 
          FROM migrations 
          ORDER BY executed_at DESC
        `
        console.log('📊 Migration history:')
        migrations.forEach(m => {
          console.log(`  - ${m.name} (${m.executed_at})`)
        })
      }
      
      return
    }
    
    console.log('📋 No existing schema found, running initialization...')
    
    // Enable extensions first
    console.log('🔌 Enabling required extensions...')
    await sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`
    await sql`CREATE EXTENSION IF NOT EXISTS "vector"`
    await sql`CREATE EXTENSION IF NOT EXISTS "pg_stat_statements"`
    console.log('✅ Extensions enabled')
    
    // Read and execute the initial migration
    const migrationPath = join(process.cwd(), 'db/migrations/sql/001_initial_schema.sql')
    const migrationContent = readFileSync(migrationPath, 'utf-8')
    
    // Extract the UP section
    const lines = migrationContent.split('\n')
    const upStartIndex = lines.findIndex(line => line.trim() === '-- Up')
    const downStartIndex = lines.findIndex(line => line.trim() === '-- Down')
    
    if (upStartIndex === -1 || downStartIndex === -1) {
      throw new Error('Invalid migration file format')
    }
    
    const upSql = lines.slice(upStartIndex + 1, downStartIndex).join('\n').trim()
    
    // Execute the migration SQL
    console.log('🔄 Executing initial schema migration...')
    
    // Split by semicolon and execute each statement
    const statements = upSql.split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))
    
    console.log(`📝 Found ${statements.length} SQL statements to execute`)
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]
      if (statement.trim()) {
        console.log(`[${i + 1}/${statements.length}] Executing: ${statement.substring(0, 80)}...`)
        try {
          await sql.unsafe(statement)
        } catch (error) {
          console.error(`❌ Failed to execute statement ${i + 1}:`, error.message)
          console.error('Statement:', statement)
          throw error
        }
      }
    }
    
    console.log('✅ Database migration completed successfully')
    
    // Verify the schema
    const finalTables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `
    console.log('📋 Created tables:', finalTables.map(t => t.table_name))
    
    // Check extensions
    const extensions = await sql`
      SELECT extname 
      FROM pg_extension 
      WHERE extname IN ('uuid-ossp', 'vector', 'pg_stat_statements')
      ORDER BY extname
    `
    console.log('🔌 Installed extensions:', extensions.map(e => e.extname))
    
    // Check indexes
    const indexes = await sql`
      SELECT indexname, tablename 
      FROM pg_indexes 
      WHERE schemaname = 'public' 
      ORDER BY tablename, indexname
    `
    console.log(`📊 Created ${indexes.length} indexes`)
    
    console.log('🎉 Database initialization completed successfully!')
    
  } catch (error) {
    console.error('❌ Database migration failed:', error)
    process.exit(1)
  }
}

runMigration()
