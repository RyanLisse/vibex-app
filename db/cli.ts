#!/usr/bin/env node

import { checkDatabaseHealth, DatabaseMonitor, DatabasePool, initializeExtensions } from './config'
import { migrationRunner } from './migrations/migration-runner'
import { databaseValidator } from './validation'

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
        await createMigration(args[0], args[1])
        break
      case 'health':
        await healthCheck()
        break
      case 'init':
        await initializeDatabase()
        break
      case 'validate':
        await validateSchema()
        break
      case 'stats':
        await showDatabaseStats()
        break
      case 'optimize':
        await optimizeDatabase()
        break
      case 'monitor':
        await showMonitoringStats()
        break
      case 'validate-full':
        await validateDatabaseFull()
        break
      case 'fix':
        await autoFixIssues()
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

async function createMigration(name: string, description?: string) {
  if (!name) {
    console.error('❌ Migration name is required')
    console.log('Usage: bun run db:create <migration_name> [description]')
    process.exit(1)
  }

  const options = description ? { description } : undefined
  const filepath = await migrationRunner.createMigration(name, options)
  console.log(`✅ Created migration: ${filepath}`)
}

async function validateSchema() {
  console.log('🔍 Validating database schema...')

  const result = await migrationRunner.validateSchema()

  if (result.valid) {
    console.log('✅ Database schema is valid')
  } else {
    console.log('❌ Database schema has issues:')
    result.issues.forEach((issue) => console.log(`  - ${issue}`))
  }

  if (result.recommendations.length > 0) {
    console.log('\n💡 Recommendations:')
    result.recommendations.forEach((rec) => console.log(`  - ${rec}`))
  }
}

async function showDatabaseStats() {
  console.log('📊 Database Statistics:')

  const stats = await migrationRunner.getDatabaseStats()

  console.log(`\nTotal Database Size: ${stats.totalSize}`)
  console.log(`Active Connections: ${stats.connectionCount}`)
  console.log(`Installed Extensions: ${stats.extensions.join(', ')}`)

  if (stats.tables.length > 0) {
    console.log('\n📋 Table Statistics:')
    console.log('┌─────────────────────────┬──────────┬─────────────┬─────────┐')
    console.log('│ Table Name              │ Rows     │ Size        │ Indexes │')
    console.log('├─────────────────────────┼──────────┼─────────────┼─────────┤')

    stats.tables.forEach((table) => {
      const name = table.name.padEnd(23)
      const rows = table.rowCount.toString().padStart(8)
      const size = table.size.padEnd(11)
      const indexes = table.indexes.toString().padStart(7)
      console.log(`│ ${name} │ ${rows} │ ${size} │ ${indexes} │`)
    })

    console.log('└─────────────────────────┴──────────┴─────────────┴─────────┘')
  }
}

async function optimizeDatabase() {
  console.log('⚡ Optimizing database performance...')

  const result = await migrationRunner.optimizeDatabase()

  if (result.success) {
    console.log('✅ Database optimization completed successfully')
  } else {
    console.log('⚠️  Database optimization completed with some errors')
  }

  if (result.operations.length > 0) {
    console.log('\n✅ Completed operations:')
    result.operations.forEach((op) => console.log(`  - ${op}`))
  }

  if (result.errors.length > 0) {
    console.log('\n❌ Errors encountered:')
    result.errors.forEach((error) => console.log(`  - ${error}`))
  }
}

async function showMonitoringStats() {
  console.log('📊 Database Monitoring Statistics:')

  const pool = DatabasePool.getInstance()
  const monitor = DatabaseMonitor.getInstance()

  const poolStats = pool.getPoolStats()
  const metrics = monitor.getMetrics()

  console.log('\n🔗 Connection Pool:')
  console.log(`  Active Connections: ${poolStats.activeConnections}/${poolStats.maxConnections}`)
  console.log(`  Utilization: ${poolStats.utilizationPercent}%`)
  console.log(`  Health Status: ${poolStats.isHealthy ? '✅ Healthy' : '❌ Unhealthy'}`)
  console.log(`  Last Health Check: ${poolStats.lastHealthCheck?.toISOString() || 'Never'}`)

  console.log('\n📈 Query Metrics:')
  console.log(`  Total Queries: ${metrics.queryCount}`)
  console.log(`  Total Errors: ${metrics.errorCount}`)
  console.log(`  Error Rate: ${metrics.errorRate}%`)
  console.log(`  Average Response Time: ${metrics.averageResponseTime}ms`)

  if (metrics.slowQueries.length > 0) {
    console.log('\n🐌 Recent Slow Queries:')
    metrics.slowQueries.slice(-5).forEach((query, index) => {
      console.log(
        `  ${index + 1}. ${query.duration}ms - ${query.query}... (${query.timestamp.toISOString()})`
      )
    })
  }
}

async function validateDatabaseFull() {
  console.log('🔍 Running comprehensive database validation...')

  const result = await databaseValidator.validate()

  if (result.isValid) {
    console.log('✅ Database validation passed')
  } else {
    console.log('❌ Database validation failed')
  }

  if (result.errors.length > 0) {
    console.log('\n❌ Errors found:')
    result.errors.forEach((error) => console.log(`  - ${error}`))
  }

  if (result.warnings.length > 0) {
    console.log('\n⚠️  Warnings:')
    result.warnings.forEach((warning) => console.log(`  - ${warning}`))
  }

  if (result.recommendations.length > 0) {
    console.log('\n💡 Recommendations:')
    result.recommendations.forEach((rec) => console.log(`  - ${rec}`))
  }

  console.log('\n📊 Schema Status:')
  console.log(`  Tables: ${result.schemaStatus.tablesCount}`)
  console.log(`  Indexes: ${result.schemaStatus.indexesCount}`)
  console.log(`  Constraints: ${result.schemaStatus.constraintsCount}`)

  console.log('\n🔌 Extensions Status:')
  console.log(`  Required: ${result.extensionsStatus.required.join(', ')}`)
  console.log(`  Installed: ${result.extensionsStatus.installed.join(', ')}`)
  if (result.extensionsStatus.missing.length > 0) {
    console.log(`  Missing: ${result.extensionsStatus.missing.join(', ')}`)
  }
}

async function autoFixIssues() {
  console.log('🔧 Auto-fixing database issues...')

  const result = await databaseValidator.autoFix()

  if (result.success) {
    console.log('✅ Auto-fix completed successfully')
  } else {
    console.log('⚠️  Auto-fix completed with some errors')
  }

  if (result.fixed.length > 0) {
    console.log('\n✅ Issues fixed:')
    result.fixed.forEach((fix) => console.log(`  - ${fix}`))
  }

  if (result.errors.length > 0) {
    console.log('\n❌ Errors encountered:')
    result.errors.forEach((error) => console.log(`  - ${error}`))
  }
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
  migrate     Run pending migrations with validation and rollback support
  rollback    Rollback the last migration
  status      Show migration status and pending migrations
  create      Create a new migration file with enhanced template
  health      Check database connection and basic health
  init        Initialize database (extensions + migrations)
  validate    Validate database schema integrity and get recommendations
  stats       Show detailed database statistics and table information
  optimize    Optimize database performance (ANALYZE, VACUUM, REINDEX)
  monitor     Show real-time database monitoring statistics
  validate-full  Run comprehensive database validation with detailed reporting
  fix         Auto-fix common database issues

Examples:
  bun run db migrate
  bun run db rollback
  bun run db status
  bun run db create add_user_preferences "Add user preference settings"
  bun run db health
  bun run db init
  bun run db validate
  bun run db stats
  bun run db optimize
  bun run db monitor
  bun run db validate-full
  bun run db fix

Migration Features:
  - Comprehensive validation with checksum verification
  - Automatic rollback on migration failure
  - SQL syntax validation
  - Backup point creation before migrations
  - Enhanced error reporting and warnings
  - Support for migration metadata and dependencies
`)
}

// Run if called directly
if (require.main === module) {
  main()
}

export { main as runCLI }
