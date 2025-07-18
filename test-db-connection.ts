#!/usr/bin/env bun

import { neon } from '@neondatabase/serverless'

const DATABASE_URL =
  process.env.DATABASE_URL ||
  'postgres://neondb_owner:npg_AVsLnqbi76wD@ep-snowy-lab-a2mp8bgg-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require'

async function testConnection() {
  try {
    console.log('🔍 Testing database connection...')
    const sql = neon(DATABASE_URL)

    // Test basic connection
    const result = await sql`SELECT 1 as test`
    console.log('✅ Database connection successful:', result)

    // Check existing tables
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `
    console.log(
      '📋 Existing tables:',
      tables.map((t) => t.table_name)
    )

    // Check extensions
    const extensions = await sql`
      SELECT extname 
      FROM pg_extension 
      ORDER BY extname
    `
    console.log(
      '🔌 Installed extensions:',
      extensions.map((e) => e.extname)
    )

    // Check if migrations table exists
    const migrationTable = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'migrations'
      ) as exists
    `
    console.log('📊 Migrations table exists:', migrationTable[0].exists)
  } catch (error) {
    console.error('❌ Database connection failed:', error)
    process.exit(1)
  }
}

testConnection()
