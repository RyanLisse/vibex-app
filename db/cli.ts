#!/usr/bin/env node

import { checkDatabaseHealth, initializeExtensions } from './config'
import { migrationRunner } from './migrations/migration-runner'

const command = process.argv[2]
const args = process.argv.slice(3)

async function main() {
  try {
    switch (command) {
      case 'migrate':
        await runMigrations()
        break
      case 'rollback':
        await rollbackMigration()
        break
      case 'status':
        await showStatus()
        break
      case 'create':
        await createMigration(args[0])
        break
      case 'health':
        await healthCheck()
        break
      case 'init':
        await initializeDatabase()
        break
      default:
        showHelp()
    }
  } catch (error) {
    console.error('❌ Command failed:', error.message)
    process.exit(1)
  }
}

async function runMigrations() {
  console.log('🚀 Running database migrations...')

  const result = await migrationRunner.migrate()

  if (result.success) {
    if (result.executed.length > 0) {
      console.log(`✅ Successfully executed ${result.executed.length} migrations:`)
      result.executed.forEach((name) => console.log(`  - ${name}`))
    } else {
      console.log('✅ No pending migrations')
    }
  } else {
    console.error('❌ Migration failed:')
    result.errors.forEach((error) => console.error(`  - ${error}`))
    process.exit(1)
  }
}

async function rollbackMigration() {
  console.log('🔄 Rolling back last migration...')

  const result = await migrationRunner.rollback()

  if (result.success) {
    console.log(`✅ Successfully rolled back migration: ${result.rolledBack}`)
  } else {
    console.error(`❌ Rollback failed: ${result.error}`)
    process.exit(1)
  }
}

async function showStatus() {
  console.log('📊 Migration status:')

  const status = await migrationRunner.getStatus()

  console.log(`\nTotal migrations: ${status.total}`)
  console.log(`Executed: ${status.executed.length}`)
  console.log(`Pending: ${status.pending.length}`)

  if (status.executed.length > 0) {
    console.log('\n✅ Executed migrations:')
    status.executed.forEach((m) => {
      console.log(`  - ${m.name} (${m.executedAt.toISOString()})`)
    })
  }

  if (status.pending.length > 0) {
    console.log('\n⏳ Pending migrations:')
    status.pending.forEach((name) => console.log(`  - ${name}`))
  }
}

async function createMigration(name: string) {
  if (!name) {
    console.error('❌ Migration name is required')
    console.log('Usage: bun run db:create <migration_name>')
    process.exit(1)
  }

  const filepath = await migrationRunner.createMigration(name)
  console.log(`✅ Created migration: ${filepath}`)
}

async function healthCheck() {
  console.log('🏥 Checking database health...')

  const isHealthy = await checkDatabaseHealth()

  if (isHealthy) {
    console.log('✅ Database is healthy')
  } else {
    console.error('❌ Database health check failed')
    process.exit(1)
  }
}

async function initializeDatabase() {
  console.log('🔧 Initializing database...')

  // Check health first
  const isHealthy = await checkDatabaseHealth()
  if (!isHealthy) {
    throw new Error('Database connection failed')
  }

  // Initialize extensions
  await initializeExtensions()

  // Run migrations
  await runMigrations()

  console.log('✅ Database initialization completed')
}

function showHelp() {
  console.log(`
Database CLI Tool

Usage:
  bun run db <command> [options]

Commands:
  migrate     Run pending migrations
  rollback    Rollback the last migration
  status      Show migration status
  create      Create a new migration file
  health      Check database connection
  init        Initialize database (extensions + migrations)

Examples:
  bun run db migrate
  bun run db rollback
  bun run db status
  bun run db create add_user_preferences
  bun run db health
  bun run db init
`)
}

// Run if called directly
if (require.main === module) {
  main()
}

export { main as runCLI }
