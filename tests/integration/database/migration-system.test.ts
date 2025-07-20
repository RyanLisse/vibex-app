/**
 * Database Migration System Integration Tests
 *
 * Comprehensive test suite for migration system including rollback scenarios,
 * validation checks, schema integrity verification, and backup/recovery
 */

import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs'
import { join } from 'path'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { checkDatabaseHealth, db, sql } from '../../../db/config'
import {
  type MigrationExecutionResult,
  type MigrationFile,
  MigrationRunner,
  type MigrationValidationResult,
  migrationRunner,
} from '../../../db/migrations/migration-runner'
import { migrations } from '../../../db/schema'
import { sql as sqlOperator } from 'drizzle-orm'

// Skip tests if no database URL is provided
const skipTests = false // Always run tests with mocks

// Test migration directory
const testMigrationsPath = join(process.cwd(), 'tests/fixtures/migrations')

// Test migration file templates
const createTestMigration = (name: string, upSql: string, downSql: string): string => {
  return `-- Migration: ${name}
-- Created: ${new Date().toISOString()}
-- Description: Test migration for validation

-- Up
${upSql}

-- Down
${downSql}
`
}

// Sample migration SQL
const testMigrations = {
  '001_create_test_table': {
    up: `
CREATE TABLE test_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email varchar(255) NOT NULL UNIQUE,
  name varchar(255) NOT NULL,
  created_at timestamp DEFAULT now() NOT NULL,
  updated_at timestamp DEFAULT now() NOT NULL
);

CREATE INDEX test_users_email_idx ON test_users (email);
CREATE INDEX test_users_created_at_idx ON test_users (created_at);
`,
    down: `
DROP TABLE IF EXISTS test_users;
`,
  },
  '002_add_user_settings': {
    up: `
CREATE TABLE test_user_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES test_users(id) ON DELETE CASCADE,
  settings jsonb NOT NULL DEFAULT '{}',
  created_at timestamp DEFAULT now() NOT NULL,
  updated_at timestamp DEFAULT now() NOT NULL
);

CREATE INDEX test_user_settings_user_id_idx ON test_user_settings (user_id);
`,
    down: `
DROP TABLE IF EXISTS test_user_settings;
`,
  },
  '003_add_user_preferences': {
    up: `
ALTER TABLE test_users ADD COLUMN preferences jsonb DEFAULT '{}';
ALTER TABLE test_users ADD COLUMN timezone varchar(50) DEFAULT 'UTC';
UPDATE test_users SET preferences = '{"theme": "light", "notifications": true}' WHERE preferences IS NULL;
`,
    down: `
ALTER TABLE test_users DROP COLUMN IF EXISTS preferences;
ALTER TABLE test_users DROP COLUMN IF EXISTS timezone;
`,
  },
  '004_invalid_migration': {
    up: `
-- This migration contains syntax errors for testing
CREATE TABLE invalid_table (
  id INVALID_TYPE,
  name varchar(255
  missing_comma varchar(100)
);
`,
    down: `
DROP TABLE IF EXISTS invalid_table;
`,
  },
  '005_dangerous_migration': {
    up: `
-- This migration contains potentially dangerous operations
DROP TABLE test_users;
CREATE TABLE test_users (
  id serial PRIMARY KEY,
  username varchar(255) NOT NULL
);
`,
    down: `
-- Cannot reliably rollback a DROP TABLE operation
-- This would lose data
`,
  },
}

describe('Migration System Integration Tests', () => {
  let testRunner: MigrationRunner

  beforeAll(async () => {
    // Ensure database is healthy
    const isHealthy = await checkDatabaseHealth()
    if (!isHealthy) {
      throw new Error('Database is not healthy')
    }

    // Create test migrations directory
    if (!existsSync(testMigrationsPath)) {
      mkdirSync(testMigrationsPath, { recursive: true })
    }

    // Initialize test migration runner
    testRunner = new MigrationRunner(testMigrationsPath)
  })

  beforeEach(async () => {
    // Clean up test migrations and database
    await cleanupTestData()
    await setupTestMigrations()
  })

  afterAll(async () => {
    // Final cleanup
    await cleanupTestData()

    // Remove test migrations directory
    if (existsSync(testMigrationsPath)) {
      rmSync(testMigrationsPath, { recursive: true, force: true })
    }
  })

  async function cleanupTestData() {
    try {
      // Drop test tables if they exist
      await sql`DROP TABLE IF EXISTS test_user_settings CASCADE`
      await sql`DROP TABLE IF EXISTS test_users CASCADE`
      await sql`DROP TABLE IF EXISTS invalid_table CASCADE`

      // Clean up migration records for test migrations
      await sql`DELETE FROM migrations WHERE name LIKE '%test%' OR name LIKE '00%'`
    } catch (error) {
      console.warn('Cleanup warning:', error)
    }
  }

  async function setupTestMigrations() {
    // Clear existing test migration files
    if (existsSync(testMigrationsPath)) {
      rmSync(testMigrationsPath, { recursive: true, force: true })
    }
    mkdirSync(testMigrationsPath, { recursive: true })

    // Create test migration files
    Object.entries(testMigrations).forEach(([name, sql]) => {
      const filename = `${name}.sql`
      const content = createTestMigration(name, sql.up, sql.down)
      writeFileSync(join(testMigrationsPath, filename), content)
    })
  }

  describe('Migration File Management', () => {
    it('should load migration files correctly', async () => {
      const files = testRunner['loadMigrationFiles']()

      expect(files).toHaveLength(5) // All test migrations
      expect(files[0].name).toBe('001_create_test_table')
      expect(files[1].name).toBe('002_add_user_settings')
      expect(files[2].name).toBe('003_add_user_preferences')
      expect(files[3].name).toBe('004_invalid_migration')
      expect(files[4].name).toBe('005_dangerous_migration')

      // Verify checksums are generated
      files.forEach((file) => {
        expect(file.checksum).toBeDefined()
        expect(file.checksum).toHaveLength(64) // SHA-256 hex string
      })
    })

    it('should parse migration file format correctly', async () => {
      const files = testRunner['loadMigrationFiles']()
      const firstMigration = files[0]

      expect(firstMigration.up).toContain('CREATE TABLE test_users')
      expect(firstMigration.down).toContain('DROP TABLE IF EXISTS test_users')
      expect(firstMigration.up).not.toContain('-- Up')
      expect(firstMigration.down).not.toContain('-- Down')
    })

    it('should handle malformed migration files', async () => {
      // Create malformed migration file
      const malformedContent = `
-- Migration: malformed
-- Missing Up/Down sections
CREATE TABLE something;
`
      writeFileSync(join(testMigrationsPath, '999_malformed.sql'), malformedContent)

      expect(() => {
        testRunner['loadMigrationFiles']()
      }).toThrow('Invalid migration file format')
    })

    it('should generate checksums consistently', async () => {
      const files1 = testRunner['loadMigrationFiles']()
      const files2 = testRunner['loadMigrationFiles']()

      files1.forEach((file, index) => {
        expect(file.checksum).toBe(files2[index].checksum)
      })
    })
  })

  describe('Migration Validation', () => {
    it('should validate clean migration set', async () => {
      // Remove problematic migrations for clean validation
      rmSync(join(testMigrationsPath, '004_invalid_migration.sql'))
      rmSync(join(testMigrationsPath, '005_dangerous_migration.sql'))

      const validation = await testRunner['validateMigrations']()

      expect(validation.valid).toBe(true)
      expect(validation.errors).toHaveLength(0)
      expect(validation.warnings.length).toBeGreaterThanOrEqual(0)
    })

    it('should detect SQL syntax errors', async () => {
      const validation = await testRunner['validateMigrations']()

      expect(validation.valid).toBe(false)
      expect(
        validation.errors.some(
          (error) => error.includes('004_invalid_migration') && error.includes('syntax error')
        )
      ).toBe(true)
    })

    it('should warn about dangerous operations', async () => {
      const validation = await testRunner['validateMigrations']()

      expect(
        validation.warnings.some(
          (warning) => warning.includes('005_dangerous_migration') && warning.includes('DROP TABLE')
        )
      ).toBe(true)
    })

    it('should detect missing rollback SQL', async () => {
      // Create migration with empty down section
      const migrationContent = createTestMigration(
        '006_no_rollback',
        'CREATE TABLE temp_test (id int);',
        '-- No rollback provided'
      )
      writeFileSync(join(testMigrationsPath, '006_no_rollback.sql'), migrationContent)

      const validation = await testRunner['validateMigrations']()

      expect(
        validation.warnings.some(
          (warning) => warning.includes('006_no_rollback') && warning.includes('no rollback SQL')
        )
      ).toBe(true)
    })

    it('should detect duplicate migration names', async () => {
      // Create duplicate migration
      const duplicateContent = createTestMigration(
        '001_create_test_table', // Same name as existing
        'CREATE TABLE duplicate (id int);',
        'DROP TABLE duplicate;'
      )
      writeFileSync(join(testMigrationsPath, '001_duplicate.sql'), duplicateContent)

      const validation = await testRunner['validateMigrations']()

      expect(validation.valid).toBe(false)
      expect(validation.errors.some((error) => error.includes('Duplicate migration name'))).toBe(
        true
      )
    })

    it('should validate checksum integrity', async () => {
      // First, run a clean migration
      rmSync(join(testMigrationsPath, '004_invalid_migration.sql'))
      rmSync(join(testMigrationsPath, '005_dangerous_migration.sql'))

      await testRunner.migrate()

      // Now modify an executed migration file
      const modifiedContent = createTestMigration(
        '001_create_test_table',
        'CREATE TABLE test_users (id int);', // Modified SQL
        'DROP TABLE test_users;'
      )
      writeFileSync(join(testMigrationsPath, '001_create_test_table.sql'), modifiedContent)

      const validation = await testRunner['validateMigrations']()

      expect(validation.valid).toBe(false)
      expect(validation.errors.some((error) => error.includes('Checksum mismatch'))).toBe(true)
    })
  })

  describe('Migration Execution', () => {
    beforeEach(async () => {
      // Remove problematic migrations for execution tests
      if (existsSync(join(testMigrationsPath, '004_invalid_migration.sql'))) {
        rmSync(join(testMigrationsPath, '004_invalid_migration.sql'))
      }
      if (existsSync(join(testMigrationsPath, '005_dangerous_migration.sql'))) {
        rmSync(join(testMigrationsPath, '005_dangerous_migration.sql'))
      }
    })

    it('should execute migrations successfully', async () => {
      const result = await testRunner.migrate()

      expect(result.success).toBe(true)
      expect(result.executed).toHaveLength(3) // Three clean migrations
      expect(result.errors).toHaveLength(0)

      // Verify tables were created
      const tableCheck = await sql`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN ('test_users', 'test_user_settings')
      `

      expect(tableCheck).toHaveLength(2)

      // Verify migration records were created
      const migrationRecords = await db
        .select()
        .from(migrations)
        .where(sqlOperator`name LIKE '00%'`)

      expect(migrationRecords).toHaveLength(3)
    })

    it('should skip already executed migrations', async () => {
      // First execution
      const firstResult = await testRunner.migrate()
      expect(firstResult.success).toBe(true)
      expect(firstResult.executed).toHaveLength(3)

      // Second execution should skip already executed migrations
      const secondResult = await testRunner.migrate()
      expect(secondResult.success).toBe(true)
      expect(secondResult.executed).toHaveLength(0) // No new migrations
    })

    it('should handle migration failure and rollback', async () => {
      // Add back the invalid migration
      const invalidContent = createTestMigration(
        '004_invalid_migration',
        testMigrations['004_invalid_migration'].up,
        testMigrations['004_invalid_migration'].down
      )
      writeFileSync(join(testMigrationsPath, '004_invalid_migration.sql'), invalidContent)

      const result = await testRunner.migrate()

      expect(result.success).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)

      // Verify partial rollback occurred
      const migrationRecords = await db
        .select()
        .from(migrations)
        .where(sqlOperator`name LIKE '00%'`)

      // Should have no successful migrations due to rollback
      expect(migrationRecords).toHaveLength(0)
    })

    it('should execute migrations in correct order', async () => {
      // Add a migration that depends on previous ones
      const dependentContent = createTestMigration(
        '006_dependent_migration',
        `
INSERT INTO test_users (email, name) VALUES ('test@example.com', 'Test User');
INSERT INTO test_user_settings (user_id, settings) 
SELECT id, '{"theme": "dark"}' FROM test_users WHERE email = 'test@example.com';
`,
        `
DELETE FROM test_user_settings WHERE user_id IN (
  SELECT id FROM test_users WHERE email = 'test@example.com'
);
DELETE FROM test_users WHERE email = 'test@example.com';
`
      )
      writeFileSync(join(testMigrationsPath, '006_dependent_migration.sql'), dependentContent)

      const result = await testRunner.migrate()

      expect(result.success).toBe(true)
      expect(result.executed).toEqual([
        '001_create_test_table',
        '002_add_user_settings',
        '003_add_user_preferences',
        '006_dependent_migration',
      ])

      // Verify dependent data was created
      const userCount = await sql`SELECT COUNT(*) as count FROM test_users`
      expect(Number.parseInt(userCount[0].count)).toBe(1)
    })

    it('should track execution time and metadata', async () => {
      const result = await testRunner.migrate()

      expect(result.success).toBe(true)
      expect(result.executionTime).toBeGreaterThan(0)

      // Check migration metadata in database
      const migrationRecords = await db
        .select()
        .from(migrations)
        .where(sqlOperator`name LIKE '00%'`)

      migrationRecords.forEach((record) => {
        expect(record.metadata).toBeDefined()
        expect(record.metadata.executionTimeMs).toBeGreaterThan(0)
        expect(record.metadata.statementsCount).toBeGreaterThan(0)
      })
    })
  })

  describe('Migration Rollback', () => {
    beforeEach(async () => {
      // Execute clean migrations first
      if (existsSync(join(testMigrationsPath, '004_invalid_migration.sql'))) {
        rmSync(join(testMigrationsPath, '004_invalid_migration.sql'))
      }
      if (existsSync(join(testMigrationsPath, '005_dangerous_migration.sql'))) {
        rmSync(join(testMigrationsPath, '005_dangerous_migration.sql'))
      }

      await testRunner.migrate()
    })

    it('should rollback last migration successfully', async () => {
      // Verify initial state
      const initialMigrations = await db
        .select()
        .from(migrations)
        .where(sqlOperator`name LIKE '00%'`)
      expect(initialMigrations).toHaveLength(3)

      // Rollback last migration
      const rollbackResult = await testRunner.rollback()

      expect(rollbackResult.success).toBe(true)
      expect(rollbackResult.rolledBack).toBe('003_add_user_preferences')

      // Verify migration was removed from database
      const remainingMigrations = await db
        .select()
        .from(migrations)
        .where(sqlOperator`name LIKE '00%'`)
      expect(remainingMigrations).toHaveLength(2)

      // Verify schema changes were rolled back
      const columnCheck = await sql`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'test_users' 
        AND column_name IN ('preferences', 'timezone')
      `
      expect(columnCheck).toHaveLength(0)
    })

    it('should handle rollback when no migrations exist', async () => {
      // Clear all migrations first
      await sql`DELETE FROM migrations WHERE name LIKE '00%'`

      const rollbackResult = await testRunner.rollback()

      expect(rollbackResult.success).toBe(false)
      expect(rollbackResult.error).toContain('No migrations to rollback')
    })

    it('should handle missing rollback SQL', async () => {
      // Create a migration with no rollback SQL
      const migrationContent = createTestMigration(
        '007_no_rollback',
        'CREATE TABLE temp_table (id int);',
        '' // Empty rollback
      )
      writeFileSync(join(testMigrationsPath, '007_no_rollback.sql'), migrationContent)

      // Execute the migration
      await testRunner.migrate()

      // Try to rollback
      const rollbackResult = await testRunner.rollback()

      expect(rollbackResult.success).toBe(false)
      expect(rollbackResult.error).toContain('No rollback SQL found')
    })

    it('should handle rollback failure gracefully', async () => {
      // Create problematic rollback
      const problematicContent = createTestMigration(
        '008_bad_rollback',
        'CREATE TABLE temp_table2 (id int);',
        'DROP TABLE non_existent_table;' // This will fail
      )
      writeFileSync(join(testMigrationsPath, '008_bad_rollback.sql'), problematicContent)

      await testRunner.migrate()

      const rollbackResult = await testRunner.rollback()

      expect(rollbackResult.success).toBe(false)
      expect(rollbackResult.error).toBeDefined()
    })
  })

  describe('Migration Status and Information', () => {
    it('should provide accurate migration status', async () => {
      // Clean initial state
      if (existsSync(join(testMigrationsPath, '004_invalid_migration.sql'))) {
        rmSync(join(testMigrationsPath, '004_invalid_migration.sql'))
      }
      if (existsSync(join(testMigrationsPath, '005_dangerous_migration.sql'))) {
        rmSync(join(testMigrationsPath, '005_dangerous_migration.sql'))
      }

      const initialStatus = await testRunner.getStatus()
      expect(initialStatus.executed).toHaveLength(0)
      expect(initialStatus.pending).toHaveLength(3)
      expect(initialStatus.total).toBe(3)

      // Execute some migrations
      await testRunner.migrate()

      const finalStatus = await testRunner.getStatus()
      expect(finalStatus.executed).toHaveLength(3)
      expect(finalStatus.pending).toHaveLength(0)
      expect(finalStatus.total).toBe(3)
    })

    it('should create new migration files', async () => {
      const migrationPath = await testRunner.createMigration('add_user_roles', {
        description: 'Add user roles table',
        author: 'test-runner',
        tags: ['user-management', 'authorization'],
      })

      expect(existsSync(migrationPath)).toBe(true)

      const content = readFileSync(migrationPath, 'utf-8')
      expect(content).toContain('Migration: add_user_roles')
      expect(content).toContain('Description: Add user roles table')
      expect(content).toContain('Author: test-runner')
      expect(content).toContain('Tags: user-management, authorization')
      expect(content).toContain('-- Up')
      expect(content).toContain('-- Down')
    })

    it('should validate database schema integrity', async () => {
      // Execute migrations first
      if (existsSync(join(testMigrationsPath, '004_invalid_migration.sql'))) {
        rmSync(join(testMigrationsPath, '004_invalid_migration.sql'))
      }
      if (existsSync(join(testMigrationsPath, '005_dangerous_migration.sql'))) {
        rmSync(join(testMigrationsPath, '005_dangerous_migration.sql'))
      }

      await testRunner.migrate()

      const schemaValidation = await testRunner.validateSchema()

      expect(schemaValidation.valid).toBe(true)
      expect(schemaValidation.issues).toHaveLength(0)
      expect(schemaValidation.recommendations.length).toBeGreaterThanOrEqual(0)
    })

    it('should provide database statistics', async () => {
      // Execute migrations first
      if (existsSync(join(testMigrationsPath, '004_invalid_migration.sql'))) {
        rmSync(join(testMigrationsPath, '004_invalid_migration.sql'))
      }
      if (existsSync(join(testMigrationsPath, '005_dangerous_migration.sql'))) {
        rmSync(join(testMigrationsPath, '005_dangerous_migration.sql'))
      }

      await testRunner.migrate()

      const stats = await testRunner.getDatabaseStats()

      expect(stats.tables.length).toBeGreaterThan(0)
      expect(stats.totalSize).toBeDefined()
      expect(stats.connectionCount).toBeGreaterThanOrEqual(0)
      expect(stats.extensions.length).toBeGreaterThan(0)

      // Check for our test tables
      const testUserTable = stats.tables.find((t) => t.name === 'test_users')
      expect(testUserTable).toBeDefined()
      expect(testUserTable?.indexes).toBeGreaterThan(0)
    })
  })

  describe('Backup and Recovery', () => {
    it('should create backup points before migrations', async () => {
      // Clean migrations
      if (existsSync(join(testMigrationsPath, '004_invalid_migration.sql'))) {
        rmSync(join(testMigrationsPath, '004_invalid_migration.sql'))
      }
      if (existsSync(join(testMigrationsPath, '005_dangerous_migration.sql'))) {
        rmSync(join(testMigrationsPath, '005_dangerous_migration.sql'))
      }

      const result = await testRunner.migrate()

      expect(result.success).toBe(true)

      // Check if backup directory was created
      const backupPath = join(testMigrationsPath, '..', 'backup')
      expect(existsSync(backupPath)).toBe(true)

      // Check for backup files
      const fs = await import('fs')
      const backupFiles = fs
        .readdirSync(backupPath)
        .filter((file: string) => file.startsWith('backup-') && file.endsWith('.json'))

      expect(backupFiles.length).toBeGreaterThan(0)
    })

    it('should cleanup old backup files', async () => {
      const backupPath = join(testMigrationsPath, '..', 'backup')

      // Create multiple backup files
      if (!existsSync(backupPath)) {
        mkdirSync(backupPath, { recursive: true })
      }

      for (let i = 0; i < 10; i++) {
        const backupFile = join(backupPath, `backup-${Date.now() - i * 1000}.json`)
        writeFileSync(backupFile, JSON.stringify({ timestamp: new Date() }))
      }

      // Run migration to trigger cleanup
      await testRunner.migrate()

      // Check that old backups were cleaned up (should keep only 5)
      const fs = await import('fs')
      const remainingFiles = fs
        .readdirSync(backupPath)
        .filter((file: string) => file.startsWith('backup-') && file.endsWith('.json'))

      expect(remainingFiles.length).toBeLessThanOrEqual(5)
    })
  })

  describe('Performance and Optimization', () => {
    it('should optimize database after migrations', async () => {
      // Execute migrations first
      if (existsSync(join(testMigrationsPath, '004_invalid_migration.sql'))) {
        rmSync(join(testMigrationsPath, '004_invalid_migration.sql'))
      }
      if (existsSync(join(testMigrationsPath, '005_dangerous_migration.sql'))) {
        rmSync(join(testMigrationsPath, '005_dangerous_migration.sql'))
      }

      await testRunner.migrate()

      const optimizationResult = await testRunner.optimizeDatabase()

      expect(optimizationResult.success).toBe(true)
      expect(optimizationResult.operations.length).toBeGreaterThan(0)
      expect(optimizationResult.operations).toContain('Updated table statistics (ANALYZE)')
    })

    it('should handle large migration files efficiently', async () => {
      // Create a large migration with many statements
      const largeMigrationSql = Array.from(
        { length: 1000 },
        (_, i) =>
          `INSERT INTO test_users (email, name) VALUES ('user${i}@example.com', 'User ${i}');`
      ).join('\n')

      const largeMigrationContent = createTestMigration(
        '009_large_data_migration',
        largeMigrationSql,
        "DELETE FROM test_users WHERE email LIKE 'user%@example.com';"
      )

      writeFileSync(join(testMigrationsPath, '009_large_data_migration.sql'), largeMigrationContent)

      const startTime = performance.now()
      const result = await testRunner.migrate()
      const executionTime = performance.now() - startTime

      expect(result.success).toBe(true)
      expect(executionTime).toBeLessThan(30_000) // Should complete within 30 seconds

      // Verify data was inserted
      const userCount = await sql`SELECT COUNT(*) as count FROM test_users`
      expect(Number.parseInt(userCount[0].count)).toBe(1000)
    })

    it('should handle concurrent migration attempts safely', async () => {
      // Clean migrations
      if (existsSync(join(testMigrationsPath, '004_invalid_migration.sql'))) {
        rmSync(join(testMigrationsPath, '004_invalid_migration.sql'))
      }
      if (existsSync(join(testMigrationsPath, '005_dangerous_migration.sql'))) {
        rmSync(join(testMigrationsPath, '005_dangerous_migration.sql'))
      }

      // Attempt concurrent migrations
      const runner1 = new MigrationRunner(testMigrationsPath)
      const runner2 = new MigrationRunner(testMigrationsPath)

      const results = await Promise.allSettled([runner1.migrate(), runner2.migrate()])

      // At least one should succeed
      const successResults = results.filter((r) => r.status === 'fulfilled' && r.value.success)
      expect(successResults.length).toBeGreaterThanOrEqual(1)

      // Verify final state is consistent
      const finalMigrations = await db.select().from(migrations).where(sqlOperator`name LIKE '00%'`)
      expect(finalMigrations).toHaveLength(3) // No duplicates
    })
  })
})
