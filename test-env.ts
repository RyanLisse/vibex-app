#!/usr/bin/env bun

import { readFileSync } from 'fs'
import { join } from 'path'

console.log('🔍 Testing environment variables...')

// Load environment variables from .env.local
const envPath = join(process.cwd(), '.env.local')
try {
  const envContent = readFileSync(envPath, 'utf-8')
  console.log('✅ Found .env.local file')
  
  const envLines = envContent.split('\n')
  for (const line of envLines) {
    if (line.includes('=') && !line.startsWith('#') && line.includes('DATABASE_URL')) {
      const [key, ...valueParts] = line.split('=')
      const value = valueParts.join('=').trim()
      console.log(`Found ${key}: ${value.substring(0, 50)}...`)
      if (key && value && !process.env[key]) {
        process.env[key] = value
      }
    }
  }
} catch (error) {
  console.error('❌ Could not load .env.local file:', error)
}

console.log('DATABASE_URL from process.env:', process.env.DATABASE_URL ? 'SET' : 'NOT SET')
console.log('NODE_ENV:', process.env.NODE_ENV)
console.log('Current working directory:', process.cwd())

// Test database connection
import { neon } from '@neondatabase/serverless'

const DATABASE_URL = process.env.DATABASE_URL

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL is not set')
  process.exit(1)
}

async function testConnection() {
  try {
    console.log('🔗 Testing database connection...')
    const sql = neon(DATABASE_URL)
    
    const result = await sql`SELECT 1 as test, current_database() as db_name, version() as version`
    console.log('✅ Database connection successful')
    console.log('Database name:', result[0].db_name)
    console.log('PostgreSQL version:', result[0].version.split(' ')[0])
    
    // Check existing tables
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `
    console.log('📋 Existing tables:', tables.map(t => t.table_name))
    
    // Check extensions
    const extensions = await sql`
      SELECT extname 
      FROM pg_extension 
      ORDER BY extname
    `
    console.log('🔌 Installed extensions:', extensions.map(e => e.extname))
    
  } catch (error) {
    console.error('❌ Database connection failed:', error)
    process.exit(1)
  }
}

testConnection()
