#!/usr/bin/env bun
/**
 * Migration CLI Tool
 *
 * Command-line interface for data migration operations.
 * Provides automated migration, status checking, and rollback capabilities.
 */

import { program } from 'commander'
import { migrationService } from '../lib/migration/migration-service'
import { dataExtractor } from '../lib/migration/data-extractor'
import { backupService } from '../lib/migration/backup-service'
import type { MigrationConfig } from '../lib/migration/types'

// CLI version
program.version('1.0.0')

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
}

function colorize(text: string, color: keyof typeof colors): string {
  return `${colors[color]}${text}${colors.reset}`
}

function logSuccess(message: string): void {
  console.log(colorize('✓ ' + message, 'green'))
}

function logError(message: string): void {
  console.log(colorize('✗ ' + message, 'red'))
}

function logWarning(message: string): void {
  console.log(colorize('⚠ ' + message, 'yellow'))
}

function logInfo(message: string): void {
  console.log(colorize('ℹ ' + message, 'blue'))
}

// Status command
program
  .command('status')
  .description('Check migration status and data availability')
  .option('-u, --user-id <userId>', 'User ID for user-specific migration')
  .option('-v, --verbose', 'Show detailed information')
  .action(async (options) => {
    try {
      logInfo('Checking migration status...')

      const statistics = await migrationService.getMigrationStatistics(options.userId)
      const currentMigration = migrationService.getCurrentMigrationStatus()
      const backups = backupService.listBackups()

      console.log('\n' + colorize('=== Migration Status ===', 'bright'))

      // Current migration
      if (currentMigration) {
        console.log(`Current Migration: ${colorize(currentMigration.status, 'cyan')}`)
        console.log(
          `Progress: ${currentMigration.progress.processedItems}/${currentMigration.progress.totalItems} items`
        )
        console.log(`Stage: ${currentMigration.progress.stage}`)

        if (currentMigration.conflicts.length > 0) {
          logWarning(`${currentMigration.conflicts.length} conflicts detected`)
        }
      } else {
        console.log('Current Migration: None')
      }

      // Local storage data
      console.log('\n' + colorize('Local Storage Data:', 'bright'))
      console.log(`Total Keys: ${statistics.localStorageStats.totalKeys}`)
      console.log(`Known Keys: ${statistics.localStorageStats.knownKeys}`)
      console.log(`Total Size: ${formatBytes(statistics.localStorageStats.totalSize)}`)

      if (options.verbose) {
        Object.entries(statistics.localStorageStats.keysSizes).forEach(([key, size]) => {
          console.log(`  ${key}: ${formatBytes(size)}`)
        })
      }

      // Database data
      console.log('\n' + colorize('Database Data:', 'bright'))
      console.log(`Tasks: ${statistics.databaseStats.taskCount}`)
      console.log(`Environments: ${statistics.databaseStats.environmentCount}`)

      // Migration capability
      console.log('\n' + colorize('Migration Capability:', 'bright'))
      if (statistics.canMigrate) {
        logSuccess('Ready to migrate')
      } else {
        logWarning('Cannot migrate - no data found or migration in progress')
      }

      // Backups
      console.log('\n' + colorize('Backups:', 'bright'))
      console.log(`Available Backups: ${backups.length}`)

      if (options.verbose && backups.length > 0) {
        backups.slice(0, 5).forEach((backup) => {
          console.log(`  ${backup.id} (${backup.totalItems} items, ${formatBytes(backup.size)})`)
        })
      }
    } catch (error) {
      logError(`Failed to check status: ${error.message}`)
      process.exit(1)
    }
  })

// Migrate command
program
  .command('migrate')
  .description('Start data migration from localStorage to database')
  .option('-u, --user-id <userId>', 'User ID for user-specific migration')
  .option('--dry-run', 'Perform a dry run without actual migration')
  .option('--no-backup', 'Skip backup creation before migration')
  .option('--continue-on-error', 'Continue migration even if some items fail')
  .option('--batch-size <size>', 'Number of items to process in each batch', '50')
  .option('--retry-attempts <attempts>', 'Number of retry attempts for failed operations', '3')
  .option('--conflict-resolution <strategy>', 'Conflict resolution strategy', 'INTERACTIVE')
  .action(async (options) => {
    try {
      logInfo('Starting migration...')

      const config: Partial<MigrationConfig> = {
        dryRun: options.dryRun,
        backupBeforeMigration: !options.noBackup,
        continueOnError: options.continueOnError,
        batchSize: parseInt(options.batchSize),
        retryAttempts: parseInt(options.retryAttempts),
        conflictResolution: options.conflictResolution as any,
        validateAfterMigration: true,
      }

      if (options.dryRun) {
        logInfo('Running in dry-run mode - no data will be modified')
      }

      const result = await migrationService.startMigration(config, options.userId)

      console.log('\n' + colorize('=== Migration Result ===', 'bright'))

      if (result.success) {
        logSuccess('Migration completed successfully!')
      } else {
        logError('Migration failed or completed with errors')
      }

      console.log(`Items Processed: ${result.itemsProcessed}`)
      console.log(`Items Success: ${result.itemsSuccess}`)
      console.log(`Items Failed: ${result.itemsFailed}`)
      console.log(`Duration: ${result.duration}ms`)

      if (result.errors.length > 0) {
        console.log('\n' + colorize('Errors:', 'red'))
        result.errors.forEach((error, index) => {
          console.log(`  ${index + 1}. ${error.message}`)
        })
      }

      if (result.warnings.length > 0) {
        console.log('\n' + colorize('Warnings:', 'yellow'))
        result.warnings.forEach((warning, index) => {
          console.log(`  ${index + 1}. ${warning}`)
        })
      }

      if (result.backupId) {
        logInfo(`Backup created: ${result.backupId}`)
      }

      if (!result.success) {
        process.exit(1)
      }
    } catch (error) {
      logError(`Migration failed: ${error.message}`)
      process.exit(1)
    }
  })

// Backup commands
program
  .command('backup')
  .description('Manage migration backups')
  .command('list')
  .description('List all available backups')
  .action(async () => {
    try {
      const backups = backupService.listBackups()

      if (backups.length === 0) {
        logInfo('No backups found')
        return
      }

      console.log('\n' + colorize('=== Available Backups ===', 'bright'))

      backups.forEach((backup, index) => {
        console.log(`\n${index + 1}. ${colorize(backup.id, 'cyan')}`)
        console.log(`   Created: ${backup.createdAt.toLocaleString()}`)
        console.log(`   Items: ${backup.totalItems}`)
        console.log(`   Size: ${formatBytes(backup.size)}`)
        console.log(`   Types: ${backup.dataTypes.join(', ')}`)
        console.log(`   Checksum: ${backup.checksum}`)
      })
    } catch (error) {
      logError(`Failed to list backups: ${error.message}`)
      process.exit(1)
    }
  })

program
  .command('backup create')
  .description('Create a new backup')
  .option('-s, --source <source>', 'Backup source (LOCALSTORAGE or DATABASE)', 'LOCALSTORAGE')
  .option('-u, --user-id <userId>', 'User ID for user-specific backup')
  .option('--include-database', 'Include database data in localStorage backup')
  .option('--compress', 'Compress backup data')
  .option('-d, --description <description>', 'Backup description')
  .action(async (options) => {
    try {
      logInfo('Creating backup...')

      const result = await backupService.createBackup({
        source: options.source as 'LOCALSTORAGE' | 'DATABASE',
        userId: options.userId,
        includeDatabase: options.includeDatabase,
        compress: options.compress,
        description: options.description,
      })

      if (result.success && result.manifest) {
        logSuccess(`Backup created: ${result.manifest.id}`)
        console.log(`Items: ${result.manifest.totalItems}`)
        console.log(`Size: ${formatBytes(result.manifest.size)}`)
        console.log(`Types: ${result.manifest.dataTypes.join(', ')}`)
      } else {
        logError(`Backup creation failed: ${result.error}`)
        process.exit(1)
      }
    } catch (error) {
      logError(`Failed to create backup: ${error.message}`)
      process.exit(1)
    }
  })

program
  .command('backup restore <backupId>')
  .description('Restore data from a backup')
  .action(async (backupId: string) => {
    try {
      logInfo(`Restoring backup: ${backupId}`)

      const result = await backupService.restoreBackup(backupId)

      if (result.success) {
        logSuccess(`Backup restored successfully!`)
        if (result.restoredItems) {
          console.log(`Restored Items: ${result.restoredItems}`)
        }
      } else {
        logError(`Backup restoration failed: ${result.error}`)
        process.exit(1)
      }
    } catch (error) {
      logError(`Failed to restore backup: ${error.message}`)
      process.exit(1)
    }
  })

// Extract command
program
  .command('extract')
  .description('Extract and analyze localStorage data')
  .option('-v, --verbose', 'Show detailed extraction information')
  .action(async (options) => {
    try {
      logInfo('Extracting localStorage data...')

      const result = await dataExtractor.extractAll()

      console.log('\n' + colorize('=== Extraction Result ===', 'bright'))

      if (result.data.tasks) {
        console.log(`Tasks found: ${result.data.tasks.length}`)
        if (options.verbose) {
          result.data.tasks.slice(0, 3).forEach((task, index) => {
            console.log(`  ${index + 1}. ${task.title} (${task.status})`)
          })
          if (result.data.tasks.length > 3) {
            console.log(`  ... and ${result.data.tasks.length - 3} more`)
          }
        }
      }

      if (result.data.environments) {
        console.log(`Environments found: ${result.data.environments.length}`)
        if (options.verbose) {
          result.data.environments.slice(0, 3).forEach((env, index) => {
            console.log(`  ${index + 1}. ${env.name}`)
          })
          if (result.data.environments.length > 3) {
            console.log(`  ... and ${result.data.environments.length - 3} more`)
          }
        }
      }

      if (result.data.formData && Object.keys(result.data.formData).length > 0) {
        console.log(`Form data keys: ${Object.keys(result.data.formData).length}`)
        if (options.verbose) {
          Object.keys(result.data.formData)
            .slice(0, 5)
            .forEach((key) => {
              console.log(`  - ${key}`)
            })
        }
      }

      if (result.errors.length > 0) {
        console.log('\n' + colorize('Errors:', 'red'))
        result.errors.forEach((error, index) => {
          console.log(`  ${index + 1}. ${error.message}`)
        })
      }

      if (result.warnings.length > 0) {
        console.log('\n' + colorize('Warnings:', 'yellow'))
        result.warnings.forEach((warning, index) => {
          console.log(`  ${index + 1}. ${warning}`)
        })
      }

      const stats = dataExtractor.getStorageStatistics()
      console.log('\n' + colorize('Storage Statistics:', 'bright'))
      console.log(`Total size: ${formatBytes(stats.totalSize)}`)
      console.log(`Total keys: ${stats.totalKeys}`)
      console.log(`Known keys: ${stats.knownKeys}`)
      console.log(`Unknown keys: ${stats.unknownKeys}`)
    } catch (error) {
      logError(`Failed to extract data: ${error.message}`)
      process.exit(1)
    }
  })

// Clear command (dangerous)
program
  .command('clear')
  .description('Clear localStorage data (DANGEROUS - requires confirmation)')
  .option('--confirm', 'Confirm the clear operation')
  .action(async (options) => {
    if (!options.confirm) {
      logError('This operation will permanently delete localStorage data!')
      logWarning('Use --confirm flag to proceed: migration-cli clear --confirm')
      process.exit(1)
    }

    try {
      logWarning('Clearing localStorage data...')

      const success = await dataExtractor.clearExtractedData('CONFIRM_CLEAR_LOCALSTORAGE')

      if (success) {
        logSuccess('localStorage data cleared successfully')
      } else {
        logError('Failed to clear localStorage data')
        process.exit(1)
      }
    } catch (error) {
      logError(`Failed to clear data: ${error.message}`)
      process.exit(1)
    }
  })

// Utility function to format bytes
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

// Error handling
process.on('uncaughtException', (error) => {
  logError(`Uncaught exception: ${error.message}`)
  process.exit(1)
})

process.on('unhandledRejection', (reason, promise) => {
  logError(`Unhandled rejection at: ${promise}, reason: ${reason}`)
  process.exit(1)
})

// Parse command line arguments
program.parse(process.argv)

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp()
}
