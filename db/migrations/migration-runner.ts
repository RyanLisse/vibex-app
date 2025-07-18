import { createHash } from 'crypto'
import { desc, eq } from 'drizzle-orm'
import { readdirSync, readFileSync } from 'fs'
import { join } from 'path'
import { db } from '../config'
import { migrations, type NewMigration } from '../schema'

export interface MigrationFile {
  name: string
  up: string
  down: string
  checksum: string
}

export class MigrationRunner {
  private migrationsPath: string

  constructor(migrationsPath: string = join(process.cwd(), 'db/migrations/sql')) {
    this.migrationsPath = migrationsPath
  }

  /**
   * Generate checksum for migration content
   */
  private generateChecksum(content: string): string {
    return createHash('sha256').update(content).digest('hex')
  }

  /**
   * Load migration files from filesystem
   */
  private loadMigrationFiles(): MigrationFile[] {
    try {
      const files = readdirSync(this.migrationsPath)
        .filter((file) => file.endsWith('.sql'))
        .sort()

      return files.map((file) => {
        const filePath = join(this.migrationsPath, file)
        const content = readFileSync(filePath, 'utf-8')

        // Parse migration file format:
        // -- Migration: migration_name
        // -- Up
        // SQL statements...
        // -- Down
        // SQL statements...

        const lines = content.split('\n')
        const upStartIndex = lines.findIndex((line) => line.trim() === '-- Up')
        const downStartIndex = lines.findIndex((line) => line.trim() === '-- Down')

        if (upStartIndex === -1 || downStartIndex === -1) {
          throw new Error(`Invalid migration file format: ${file}`)
        }

        const upSql = lines
          .slice(upStartIndex + 1, downStartIndex)
          .join('\n')
          .trim()
        const downSql = lines
          .slice(downStartIndex + 1)
          .join('\n')
          .trim()

        return {
          name: file.replace('.sql', ''),
          up: upSql,
          down: downSql,
          checksum: this.generateChecksum(upSql + downSql),
        }
      })
    } catch (error) {
      console.error('Failed to load migration files:', error)
      return []
    }
  }

  /**
   * Get executed migrations from database
   */
  private async getExecutedMigrations(): Promise<
    Array<{ name: string; checksum: string; executedAt: Date }>
  > {
    try {
      return await db
        .select({
          name: migrations.name,
          checksum: migrations.checksum,
          executedAt: migrations.executedAt,
        })
        .from(migrations)
        .orderBy(desc(migrations.executedAt))
    } catch (error) {
      // If migrations table doesn't exist, return empty array
      console.warn('Migrations table not found, assuming first run')
      return []
    }
  }

  /**
   * Validate migration integrity
   */
  private async validateMigrations(): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = []
    const migrationFiles = this.loadMigrationFiles()
    const executedMigrations = await this.getExecutedMigrations()

    // Check for checksum mismatches
    for (const executed of executedMigrations) {
      const file = migrationFiles.find((f) => f.name === executed.name)
      if (file && file.checksum !== executed.checksum) {
        errors.push(`Checksum mismatch for migration ${executed.name}`)
      }
    }

    // Check for missing migration files
    for (const executed of executedMigrations) {
      const file = migrationFiles.find((f) => f.name === executed.name)
      if (!file) {
        errors.push(`Migration file not found: ${executed.name}`)
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    }
  }

  /**
   * Execute a single migration
   */
  private async executeMigration(migration: MigrationFile): Promise<void> {
    const startTime = Date.now()

    try {
      // Execute migration SQL
      await db.transaction(async (tx) => {
        // Split SQL by semicolon and execute each statement
        const statements = migration.up
          .split(';')
          .map((stmt) => stmt.trim())
          .filter((stmt) => stmt.length > 0)

        for (const statement of statements) {
          await tx.execute(statement)
        }

        // Record migration execution
        await tx.insert(migrations).values({
          name: migration.name,
          checksum: migration.checksum,
          rollbackSql: migration.down,
          metadata: {
            executionTimeMs: Date.now() - startTime,
            statementsCount: statements.length,
          },
        })
      })

      console.log(
        `✅ Migration ${migration.name} executed successfully (${Date.now() - startTime}ms)`
      )
    } catch (error) {
      console.error(`❌ Migration ${migration.name} failed:`, error)
      throw error
    }
  }

  /**
   * Run pending migrations
   */
  async migrate(): Promise<{ success: boolean; executed: string[]; errors: string[] }> {
    console.log('🚀 Starting database migration...')

    const validation = await this.validateMigrations()
    if (!validation.valid) {
      return {
        success: false,
        executed: [],
        errors: validation.errors,
      }
    }

    const migrationFiles = this.loadMigrationFiles()
    const executedMigrations = await this.getExecutedMigrations()
    const executedNames = new Set(executedMigrations.map((m) => m.name))

    const pendingMigrations = migrationFiles.filter((m) => !executedNames.has(m.name))

    if (pendingMigrations.length === 0) {
      console.log('✅ No pending migrations')
      return { success: true, executed: [], errors: [] }
    }

    const executed: string[] = []
    const errors: string[] = []

    for (const migration of pendingMigrations) {
      try {
        await this.executeMigration(migration)
        executed.push(migration.name)
      } catch (error) {
        errors.push(`${migration.name}: ${error.message}`)
        break // Stop on first error
      }
    }

    const success = errors.length === 0
    console.log(success ? '✅ Migration completed successfully' : '❌ Migration failed')

    return { success, executed, errors }
  }

  /**
   * Rollback last migration
   */
  async rollback(): Promise<{ success: boolean; rolledBack?: string; error?: string }> {
    console.log('🔄 Starting migration rollback...')

    try {
      const lastMigration = await db
        .select()
        .from(migrations)
        .orderBy(desc(migrations.executedAt))
        .limit(1)

      if (lastMigration.length === 0) {
        return { success: false, error: 'No migrations to rollback' }
      }

      const migration = lastMigration[0]

      if (!migration.rollbackSql) {
        return { success: false, error: `No rollback SQL found for migration ${migration.name}` }
      }

      await db.transaction(async (tx) => {
        // Execute rollback SQL
        const statements = migration.rollbackSql
          .split(';')
          .map((stmt) => stmt.trim())
          .filter((stmt) => stmt.length > 0)

        for (const statement of statements) {
          await tx.execute(statement)
        }

        // Remove migration record
        await tx.delete(migrations).where(eq(migrations.id, migration.id))
      })

      console.log(`✅ Migration ${migration.name} rolled back successfully`)
      return { success: true, rolledBack: migration.name }
    } catch (error) {
      console.error('❌ Rollback failed:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Get migration status
   */
  async getStatus(): Promise<{
    executed: Array<{ name: string; executedAt: Date }>
    pending: string[]
    total: number
  }> {
    const migrationFiles = this.loadMigrationFiles()
    const executedMigrations = await this.getExecutedMigrations()
    const executedNames = new Set(executedMigrations.map((m) => m.name))

    const pending = migrationFiles.filter((m) => !executedNames.has(m.name)).map((m) => m.name)

    return {
      executed: executedMigrations.map((m) => ({ name: m.name, executedAt: m.executedAt })),
      pending,
      total: migrationFiles.length,
    }
  }

  /**
   * Create a new migration file
   */
  async createMigration(name: string): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0]
    const filename = `${timestamp}_${name}.sql`
    const filepath = join(this.migrationsPath, filename)

    const template = `-- Migration: ${name}
-- Created: ${new Date().toISOString()}

-- Up
-- Add your migration SQL here


-- Down
-- Add your rollback SQL here

`

    require('fs').writeFileSync(filepath, template)
    console.log(`✅ Created migration file: ${filename}`)
    return filepath
  }
}

// Export singleton instance
export const migrationRunner = new MigrationRunner()
