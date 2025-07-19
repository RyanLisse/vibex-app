/**
 * Migration CLI Test Suite
 *
 * Tests the command-line interface for migration operations,
 * including all commands, options, and error scenarios.
 */

import { afterEach, beforeEach, describe, expect, it, vi, type MockedFunction } from 'vitest'
import { execSync, spawn } from 'child_process'
import { existsSync, readFileSync, writeFileSync, mkdirSync, rmSync } from 'fs'
import { join } from 'path'
import { migrationService } from '../../lib/migration/migration-service'
import { dataExtractor } from '../../lib/migration/data-extractor'
import { backupService } from '../../lib/migration/backup-service'

// Mock CLI dependencies
vi.mock('child_process')
vi.mock('fs')
vi.mock('../../lib/migration/migration-service')
vi.mock('../../lib/migration/data-extractor')
vi.mock('../../lib/migration/backup-service')

const mockExecSync = execSync as MockedFunction<typeof execSync>
const mockSpawn = spawn as MockedFunction<typeof spawn>
const mockExistsSync = existsSync as MockedFunction<typeof existsSync>
const mockReadFileSync = readFileSync as MockedFunction<typeof readFileSync>
const mockWriteFileSync = writeFileSync as MockedFunction<typeof writeFileSync>
const mockMkdirSync = mkdirSync as MockedFunction<typeof mkdirSync>
const mockRmSync = rmSync as MockedFunction<typeof rmSync>

// CLI script path
const CLI_SCRIPT = join(process.cwd(), 'scripts/migration-cli.ts')

// Mock command execution helper
const mockCLIExecution = (command: string, options: any = {}) => {
  const { exitCode = 0, stdout = '', stderr = '', error = null } = options

  if (error) {
    mockExecSync.mockImplementation(() => {
      throw error
    })
  } else {
    mockExecSync.mockReturnValue(Buffer.from(stdout))
  }

  return { exitCode, stdout, stderr }
}

// Mock console methods to capture output
const mockConsole = {
  log: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn(),
}

describe('Migration CLI Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Mock console methods
    global.console = mockConsole as any

    // Mock process.exit to prevent actual exits
    vi.spyOn(process, 'exit').mockImplementation((() => {}) as any)

    // Setup default mocks
    mockExistsSync.mockReturnValue(true)

    // Mock migration service
    vi.mocked(migrationService.getMigrationStatistics).mockResolvedValue({
      localStorageStats: {
        totalKeys: 5,
        knownKeys: 2,
        unknownKeys: 3,
        totalSize: 1024,
        keysSizes: {
          'task-store': 512,
          environments: 256,
          'other-key': 256,
        },
      },
      databaseStats: {
        taskCount: 10,
        environmentCount: 3,
        lastMigration: new Date('2024-01-01'),
      },
      canMigrate: true,
    })

    vi.mocked(migrationService.getCurrentMigrationStatus).mockReturnValue(null)

    vi.mocked(migrationService.startMigration).mockResolvedValue({
      success: true,
      itemsProcessed: 15,
      itemsSuccess: 15,
      itemsFailed: 0,
      errors: [],
      warnings: [],
      duration: 5000,
      backupId: 'backup-123',
    })

    // Mock data extractor
    vi.mocked(dataExtractor.extractAll).mockResolvedValue({
      data: {
        tasks: [
          {
            id: 'task-1',
            title: 'Test Task',
            status: 'pending',
            createdAt: '2024-01-01T00:00:00.000Z',
          },
        ],
        environments: [
          {
            id: 'env-1',
            name: 'Test Environment',
            isActive: true,
            createdAt: '2024-01-01T00:00:00.000Z',
          },
        ],
        formData: {
          'form-key': { field: 'value' },
        },
      },
      errors: [],
      warnings: [],
    })

    vi.mocked(dataExtractor.getStorageStatistics).mockReturnValue({
      totalSize: 2048,
      totalKeys: 6,
      knownKeys: 2,
      unknownKeys: 4,
      keysSizes: {
        'task-store': 1024,
        environments: 512,
      },
    })

    vi.mocked(dataExtractor.clearExtractedData).mockResolvedValue(true)

    // Mock backup service
    vi.mocked(backupService.listBackups).mockReturnValue([
      {
        id: 'backup-1',
        createdAt: new Date('2024-01-01'),
        source: 'LOCALSTORAGE',
        totalItems: 10,
        size: 1024,
        checksum: 'abc123',
        dataTypes: ['tasks', 'environments'],
        compressed: false,
      },
      {
        id: 'backup-2',
        createdAt: new Date('2024-01-02'),
        source: 'DATABASE',
        totalItems: 20,
        size: 2048,
        checksum: 'def456',
        dataTypes: ['tasks'],
        compressed: true,
      },
    ])

    vi.mocked(backupService.createBackup).mockResolvedValue({
      success: true,
      manifest: {
        id: 'new-backup-123',
        createdAt: new Date(),
        source: 'LOCALSTORAGE',
        totalItems: 15,
        size: 1536,
        checksum: 'ghi789',
        dataTypes: ['tasks', 'environments'],
        compressed: false,
      },
    })

    vi.mocked(backupService.restoreBackup).mockResolvedValue({
      success: true,
      restoredItems: 15,
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Status Command', () => {
    it('should display migration status', async () => {
      mockCLIExecution('bun run scripts/migration-cli.ts status', {
        stdout:
          'Migration Status\nLocal Storage Data: 2 known keys\nDatabase Data: 10 tasks, 3 environments\nReady to migrate: Yes',
      })

      const result = mockExecSync('bun run scripts/migration-cli.ts status')
      const output = result.toString()

      expect(output).toContain('Migration Status')
      expect(output).toContain('Local Storage Data')
      expect(output).toContain('Database Data')
    })

    it('should display verbose status information', async () => {
      mockCLIExecution('bun run scripts/migration-cli.ts status --verbose', {
        stdout:
          'Migration Status\n  task-store: 512 bytes\n  environments: 256 bytes\nBackups: 2 available',
      })

      const result = mockExecSync('bun run scripts/migration-cli.ts status --verbose')
      const output = result.toString()

      expect(output).toContain('task-store: 512 bytes')
      expect(output).toContain('environments: 256 bytes')
    })

    it('should handle status command errors', async () => {
      vi.mocked(migrationService.getMigrationStatistics).mockRejectedValue(
        new Error('Database connection failed')
      )

      mockCLIExecution('bun run scripts/migration-cli.ts status', {
        exitCode: 1,
        stderr: 'Failed to check status: Database connection failed',
      })

      expect(() => mockExecSync('bun run scripts/migration-cli.ts status')).toThrow()
    })

    it('should display user-specific status', async () => {
      mockCLIExecution('bun run scripts/migration-cli.ts status --user-id user-123', {
        stdout: 'Migration Status for user: user-123\nLocal Storage Data: filtered for user',
      })

      const result = mockExecSync('bun run scripts/migration-cli.ts status --user-id user-123')
      const output = result.toString()

      expect(output).toContain('user-123')
    })
  })

  describe('Migrate Command', () => {
    it('should perform migration successfully', async () => {
      mockCLIExecution('bun run scripts/migration-cli.ts migrate', {
        stdout:
          'Starting migration...\nMigration completed successfully!\nItems Processed: 15\nItems Success: 15\nItems Failed: 0\nDuration: 5000ms\nBackup created: backup-123',
      })

      const result = mockExecSync('bun run scripts/migration-cli.ts migrate')
      const output = result.toString()

      expect(output).toContain('Migration completed successfully')
      expect(output).toContain('Items Processed: 15')
      expect(output).toContain('Backup created: backup-123')
    })

    it('should perform dry run migration', async () => {
      mockCLIExecution('bun run scripts/migration-cli.ts migrate --dry-run', {
        stdout:
          'Running in dry-run mode - no data will be modified\nMigration completed successfully!\nItems Processed: 15',
      })

      const result = mockExecSync('bun run scripts/migration-cli.ts migrate --dry-run')
      const output = result.toString()

      expect(output).toContain('dry-run mode')
      expect(output).toContain('no data will be modified')
    })

    it('should handle migration with custom batch size', async () => {
      mockCLIExecution('bun run scripts/migration-cli.ts migrate --batch-size 25', {
        stdout: 'Migration completed successfully!\nItems Processed: 15',
      })

      const result = mockExecSync('bun run scripts/migration-cli.ts migrate --batch-size 25')

      expect(vi.mocked(migrationService.startMigration)).toHaveBeenCalledWith(
        expect.objectContaining({ batchSize: 25 }),
        undefined
      )
    })

    it('should handle migration with continue on error', async () => {
      vi.mocked(migrationService.startMigration).mockResolvedValue({
        success: true,
        itemsProcessed: 15,
        itemsSuccess: 12,
        itemsFailed: 3,
        errors: [
          {
            type: 'VALIDATION_ERROR',
            message: 'Invalid task data',
            item: 'task-1',
          },
          {
            type: 'VALIDATION_ERROR',
            message: 'Invalid task data',
            item: 'task-2',
          },
          {
            type: 'VALIDATION_ERROR',
            message: 'Invalid task data',
            item: 'task-3',
          },
        ],
        warnings: ['Some warnings occurred'],
        duration: 5000,
        backupId: 'backup-123',
      })

      mockCLIExecution('bun run scripts/migration-cli.ts migrate --continue-on-error', {
        stdout:
          'Migration completed successfully!\nItems Failed: 3\nErrors:\n  1. Invalid task data\n  2. Invalid task data\n  3. Invalid task data',
      })

      const result = mockExecSync('bun run scripts/migration-cli.ts migrate --continue-on-error')
      const output = result.toString()

      expect(output).toContain('Items Failed: 3')
      expect(output).toContain('Errors:')
    })

    it('should handle migration failure', async () => {
      vi.mocked(migrationService.startMigration).mockResolvedValue({
        success: false,
        itemsProcessed: 5,
        itemsSuccess: 2,
        itemsFailed: 3,
        errors: [
          {
            type: 'DATABASE_ERROR',
            message: 'Connection lost',
            item: 'task-1',
          },
        ],
        warnings: [],
        duration: 2000,
      })

      mockCLIExecution('bun run scripts/migration-cli.ts migrate', {
        exitCode: 1,
        stderr: 'Migration failed or completed with errors',
      })

      expect(() => mockExecSync('bun run scripts/migration-cli.ts migrate')).toThrow()
    })

    it('should handle migration with retry attempts', async () => {
      mockCLIExecution('bun run scripts/migration-cli.ts migrate --retry-attempts 5', {
        stdout: 'Migration completed successfully!',
      })

      const result = mockExecSync('bun run scripts/migration-cli.ts migrate --retry-attempts 5')

      expect(vi.mocked(migrationService.startMigration)).toHaveBeenCalledWith(
        expect.objectContaining({ retryAttempts: 5 }),
        undefined
      )
    })

    it('should handle migration with conflict resolution strategy', async () => {
      mockCLIExecution(
        'bun run scripts/migration-cli.ts migrate --conflict-resolution MERGE_FAVOR_LOCAL',
        {
          stdout: 'Migration completed successfully!',
        }
      )

      const result = mockExecSync(
        'bun run scripts/migration-cli.ts migrate --conflict-resolution MERGE_FAVOR_LOCAL'
      )

      expect(vi.mocked(migrationService.startMigration)).toHaveBeenCalledWith(
        expect.objectContaining({ conflictResolution: 'MERGE_FAVOR_LOCAL' }),
        undefined
      )
    })

    it('should handle migration without backup', async () => {
      mockCLIExecution('bun run scripts/migration-cli.ts migrate --no-backup', {
        stdout: 'Migration completed successfully!',
      })

      const result = mockExecSync('bun run scripts/migration-cli.ts migrate --no-backup')

      expect(vi.mocked(migrationService.startMigration)).toHaveBeenCalledWith(
        expect.objectContaining({ backupBeforeMigration: false }),
        undefined
      )
    })
  })

  describe('Backup Commands', () => {
    it('should list backups', async () => {
      mockCLIExecution('bun run scripts/migration-cli.ts backup list', {
        stdout:
          'Available Backups\n1. backup-1\n   Created: 1/1/2024\n   Items: 10\n   Size: 1 KB\n2. backup-2\n   Created: 1/2/2024\n   Items: 20\n   Size: 2 KB',
      })

      const result = mockExecSync('bun run scripts/migration-cli.ts backup list')
      const output = result.toString()

      expect(output).toContain('Available Backups')
      expect(output).toContain('backup-1')
      expect(output).toContain('backup-2')
    })

    it('should handle empty backup list', async () => {
      vi.mocked(backupService.listBackups).mockReturnValue([])

      mockCLIExecution('bun run scripts/migration-cli.ts backup list', {
        stdout: 'No backups found',
      })

      const result = mockExecSync('bun run scripts/migration-cli.ts backup list')
      const output = result.toString()

      expect(output).toContain('No backups found')
    })

    it('should create new backup', async () => {
      mockCLIExecution('bun run scripts/migration-cli.ts backup create', {
        stdout:
          'Creating backup...\nBackup created: new-backup-123\nItems: 15\nSize: 1.5 KB\nTypes: tasks, environments',
      })

      const result = mockExecSync('bun run scripts/migration-cli.ts backup create')
      const output = result.toString()

      expect(output).toContain('Backup created: new-backup-123')
      expect(output).toContain('Items: 15')
    })

    it('should create backup with options', async () => {
      mockCLIExecution(
        'bun run scripts/migration-cli.ts backup create --source DATABASE --compress --description "Test backup"',
        {
          stdout: 'Creating backup...\nBackup created: new-backup-123',
        }
      )

      const result = mockExecSync(
        'bun run scripts/migration-cli.ts backup create --source DATABASE --compress --description "Test backup"'
      )

      expect(vi.mocked(backupService.createBackup)).toHaveBeenCalledWith({
        source: 'DATABASE',
        compress: true,
        description: 'Test backup',
        userId: undefined,
        includeDatabase: undefined,
      })
    })

    it('should handle backup creation failure', async () => {
      vi.mocked(backupService.createBackup).mockResolvedValue({
        success: false,
        error: 'Insufficient storage space',
      })

      mockCLIExecution('bun run scripts/migration-cli.ts backup create', {
        exitCode: 1,
        stderr: 'Backup creation failed: Insufficient storage space',
      })

      expect(() => mockExecSync('bun run scripts/migration-cli.ts backup create')).toThrow()
    })

    it('should restore backup', async () => {
      mockCLIExecution('bun run scripts/migration-cli.ts backup restore backup-123', {
        stdout: 'Restoring backup: backup-123\nBackup restored successfully!\nRestored Items: 15',
      })

      const result = mockExecSync('bun run scripts/migration-cli.ts backup restore backup-123')
      const output = result.toString()

      expect(output).toContain('Backup restored successfully')
      expect(output).toContain('Restored Items: 15')
    })

    it('should handle backup restoration failure', async () => {
      vi.mocked(backupService.restoreBackup).mockResolvedValue({
        success: false,
        error: 'Backup file not found',
      })

      mockCLIExecution('bun run scripts/migration-cli.ts backup restore invalid-backup', {
        exitCode: 1,
        stderr: 'Backup restoration failed: Backup file not found',
      })

      expect(() =>
        mockExecSync('bun run scripts/migration-cli.ts backup restore invalid-backup')
      ).toThrow()
    })
  })

  describe('Extract Command', () => {
    it('should extract localStorage data', async () => {
      mockCLIExecution('bun run scripts/migration-cli.ts extract', {
        stdout:
          'Extracting localStorage data...\nExtraction Result\nTasks found: 1\nEnvironments found: 1\nForm data keys: 1\nStorage Statistics:\nTotal size: 2 KB\nTotal keys: 6\nKnown keys: 2\nUnknown keys: 4',
      })

      const result = mockExecSync('bun run scripts/migration-cli.ts extract')
      const output = result.toString()

      expect(output).toContain('Extraction Result')
      expect(output).toContain('Tasks found: 1')
      expect(output).toContain('Environments found: 1')
    })

    it('should extract with verbose output', async () => {
      mockCLIExecution('bun run scripts/migration-cli.ts extract --verbose', {
        stdout:
          'Extracting localStorage data...\nTasks found: 1\n  1. Test Task (pending)\nEnvironments found: 1\n  1. Test Environment',
      })

      const result = mockExecSync('bun run scripts/migration-cli.ts extract --verbose')
      const output = result.toString()

      expect(output).toContain('1. Test Task (pending)')
      expect(output).toContain('1. Test Environment')
    })

    it('should handle extraction errors', async () => {
      vi.mocked(dataExtractor.extractAll).mockResolvedValue({
        data: { tasks: [], environments: [] },
        errors: [
          {
            type: 'EXTRACTION_ERROR',
            message: 'Invalid JSON in localStorage',
            item: 'task-store',
          },
        ],
        warnings: ['Some warnings'],
      })

      mockCLIExecution('bun run scripts/migration-cli.ts extract', {
        stdout:
          'Extraction Result\nErrors:\n  1. Invalid JSON in localStorage\nWarnings:\n  1. Some warnings',
      })

      const result = mockExecSync('bun run scripts/migration-cli.ts extract')
      const output = result.toString()

      expect(output).toContain('Errors:')
      expect(output).toContain('Invalid JSON in localStorage')
    })

    it('should handle extraction failure', async () => {
      vi.mocked(dataExtractor.extractAll).mockRejectedValue(new Error('localStorage access denied'))

      mockCLIExecution('bun run scripts/migration-cli.ts extract', {
        exitCode: 1,
        stderr: 'Failed to extract data: localStorage access denied',
      })

      expect(() => mockExecSync('bun run scripts/migration-cli.ts extract')).toThrow()
    })
  })

  describe('Clear Command', () => {
    it('should refuse to clear without confirmation', async () => {
      mockCLIExecution('bun run scripts/migration-cli.ts clear', {
        exitCode: 1,
        stderr:
          'This operation will permanently delete localStorage data!\nUse --confirm flag to proceed: migration-cli clear --confirm',
      })

      expect(() => mockExecSync('bun run scripts/migration-cli.ts clear')).toThrow()
    })

    it('should clear localStorage with confirmation', async () => {
      mockCLIExecution('bun run scripts/migration-cli.ts clear --confirm', {
        stdout: 'Clearing localStorage data...\nlocalStorage data cleared successfully',
      })

      const result = mockExecSync('bun run scripts/migration-cli.ts clear --confirm')
      const output = result.toString()

      expect(output).toContain('localStorage data cleared successfully')
    })

    it('should handle clear operation failure', async () => {
      vi.mocked(dataExtractor.clearExtractedData).mockResolvedValue(false)

      mockCLIExecution('bun run scripts/migration-cli.ts clear --confirm', {
        exitCode: 1,
        stderr: 'Failed to clear localStorage data',
      })

      expect(() => mockExecSync('bun run scripts/migration-cli.ts clear --confirm')).toThrow()
    })
  })

  describe('Error Handling and Edge Cases', () => {
    it('should handle uncaught exceptions', async () => {
      mockCLIExecution('bun run scripts/migration-cli.ts status', {
        exitCode: 1,
        stderr: 'Uncaught exception: Unexpected error occurred',
      })

      expect(() => mockExecSync('bun run scripts/migration-cli.ts status')).toThrow()
    })

    it('should handle unhandled rejections', async () => {
      mockCLIExecution('bun run scripts/migration-cli.ts migrate', {
        exitCode: 1,
        stderr: 'Unhandled rejection: Promise rejected unexpectedly',
      })

      expect(() => mockExecSync('bun run scripts/migration-cli.ts migrate')).toThrow()
    })

    it('should show help when no command provided', async () => {
      mockCLIExecution('bun run scripts/migration-cli.ts', {
        stdout:
          'Usage: migration-cli [options] [command]\nCommands:\n  status      Check migration status\n  migrate     Start migration\n  backup      Manage backups\n  extract     Extract localStorage data\n  clear       Clear localStorage data',
      })

      const result = mockExecSync('bun run scripts/migration-cli.ts')
      const output = result.toString()

      expect(output).toContain('Usage:')
      expect(output).toContain('Commands:')
    })

    it('should handle invalid command', async () => {
      mockCLIExecution('bun run scripts/migration-cli.ts invalid-command', {
        exitCode: 1,
        stderr: "error: unknown command 'invalid-command'",
      })

      expect(() => mockExecSync('bun run scripts/migration-cli.ts invalid-command')).toThrow()
    })

    it('should handle invalid options', async () => {
      mockCLIExecution('bun run scripts/migration-cli.ts migrate --invalid-option', {
        exitCode: 1,
        stderr: "error: unknown option '--invalid-option'",
      })

      expect(() =>
        mockExecSync('bun run scripts/migration-cli.ts migrate --invalid-option')
      ).toThrow()
    })

    it('should format bytes correctly', async () => {
      vi.mocked(dataExtractor.getStorageStatistics).mockReturnValue({
        totalSize: 1536, // 1.5 KB
        totalKeys: 5,
        knownKeys: 2,
        unknownKeys: 3,
        keysSizes: {},
      })

      mockCLIExecution('bun run scripts/migration-cli.ts extract', {
        stdout: 'Total size: 1.5 KB',
      })

      const result = mockExecSync('bun run scripts/migration-cli.ts extract')
      const output = result.toString()

      expect(output).toContain('1.5 KB')
    })

    it('should handle large file sizes', async () => {
      vi.mocked(dataExtractor.getStorageStatistics).mockReturnValue({
        totalSize: 5 * 1024 * 1024 * 1024, // 5 GB
        totalKeys: 100,
        knownKeys: 10,
        unknownKeys: 90,
        keysSizes: {},
      })

      mockCLIExecution('bun run scripts/migration-cli.ts extract', {
        stdout: 'Total size: 5.0 GB',
      })

      const result = mockExecSync('bun run scripts/migration-cli.ts extract')
      const output = result.toString()

      expect(output).toContain('5.0 GB')
    })
  })

  describe('Color Output', () => {
    it('should use colors for success messages', async () => {
      mockCLIExecution('bun run scripts/migration-cli.ts migrate', {
        stdout: '\x1b[32m✓ Migration completed successfully!\x1b[0m',
      })

      const result = mockExecSync('bun run scripts/migration-cli.ts migrate')
      const output = result.toString()

      expect(output).toContain('\x1b[32m') // Green color
      expect(output).toContain('✓')
    })

    it('should use colors for error messages', async () => {
      mockCLIExecution('bun run scripts/migration-cli.ts migrate', {
        exitCode: 1,
        stderr: '\x1b[31m✗ Migration failed\x1b[0m',
      })

      expect(() => mockExecSync('bun run scripts/migration-cli.ts migrate')).toThrow()
    })

    it('should use colors for warning messages', async () => {
      mockCLIExecution('bun run scripts/migration-cli.ts status', {
        stdout: '\x1b[33m⚠ Cannot migrate - no data found\x1b[0m',
      })

      const result = mockExecSync('bun run scripts/migration-cli.ts status')
      const output = result.toString()

      expect(output).toContain('\x1b[33m') // Yellow color
      expect(output).toContain('⚠')
    })

    it('should use colors for info messages', async () => {
      mockCLIExecution('bun run scripts/migration-cli.ts backup create', {
        stdout: '\x1b[34mℹ Creating backup...\x1b[0m',
      })

      const result = mockExecSync('bun run scripts/migration-cli.ts backup create')
      const output = result.toString()

      expect(output).toContain('\x1b[34m') // Blue color
      expect(output).toContain('ℹ')
    })
  })
})
