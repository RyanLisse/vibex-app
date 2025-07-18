import { db } from './config'
import { migrationRunner } from './migrations/migration-runner'

export interface DatabaseValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  recommendations: string[]
  extensionsStatus: {
    required: string[]
    installed: string[]
    missing: string[]
  }
  schemaStatus: {
    tablesCount: number
    indexesCount: number
    constraintsCount: number
  }
}

/**
 * Comprehensive database validation for the observability integration
 */
export class DatabaseValidator {
  private readonly requiredExtensions = ['uuid-ossp', 'vector', 'pg_stat_statements']

  private readonly requiredTables = [
    'tasks',
    'environments',
    'agent_executions',
    'observability_events',
    'agent_memory',
    'workflows',
    'workflow_executions',
    'execution_snapshots',
    'migrations',
  ]

  /**
   * Run comprehensive database validation
   */
  async validate(): Promise<DatabaseValidationResult> {
    const errors: string[] = []
    const warnings: string[] = []
    const recommendations: string[] = []

    try {
      // Check database connection
      await this.validateConnection()

      // Check extensions
      const extensionsStatus = await this.validateExtensions()
      if (extensionsStatus.missing.length > 0) {
        errors.push(`Missing required extensions: ${extensionsStatus.missing.join(', ')}`)
      }

      // Check schema
      const schemaStatus = await this.validateSchema()

      // Check vector search capabilities
      await this.validateVectorSearch(warnings, recommendations)

      // Check indexes for performance
      await this.validateIndexes(warnings, recommendations)

      // Check constraints and foreign keys
      await this.validateConstraints(warnings, recommendations)

      // Check migration status
      await this.validateMigrations(errors, warnings)

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        recommendations,
        extensionsStatus,
        schemaStatus,
      }
    } catch (error) {
      errors.push(`Database validation failed: ${error.message}`)
      return {
        isValid: false,
        errors,
        warnings,
        recommendations,
        extensionsStatus: {
          required: this.requiredExtensions,
          installed: [],
          missing: this.requiredExtensions,
        },
        schemaStatus: { tablesCount: 0, indexesCount: 0, constraintsCount: 0 },
      }
    }
  }

  /**
   * Validate database connection
   */
  private async validateConnection(): Promise<void> {
    try {
      await db.execute('SELECT 1')
    } catch (error) {
      throw new Error(`Database connection failed: ${error.message}`)
    }
  }

  /**
   * Validate required extensions
   */
  private async validateExtensions(): Promise<{
    required: string[]
    installed: string[]
    missing: string[]
  }> {
    const extensionsQuery = `
      SELECT extname 
      FROM pg_extension 
      WHERE extname = ANY($1)
    `

    const result = await db.execute(extensionsQuery, [this.requiredExtensions])
    const installed = result.rows.map((row) => row.extname)
    const missing = this.requiredExtensions.filter((ext) => !installed.includes(ext))

    return {
      required: this.requiredExtensions,
      installed,
      missing,
    }
  }

  /**
   * Validate database schema
   */
  private async validateSchema(): Promise<{
    tablesCount: number
    indexesCount: number
    constraintsCount: number
  }> {
    // Check tables
    const tablesQuery = `
      SELECT COUNT(*) as count
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = ANY($1)
    `
    const tablesResult = await db.execute(tablesQuery, [this.requiredTables])
    const tablesCount = Number.parseInt(tablesResult.rows[0]?.count || '0')

    // Check indexes
    const indexesQuery = `
      SELECT COUNT(*) as count
      FROM pg_indexes 
      WHERE schemaname = 'public'
    `
    const indexesResult = await db.execute(indexesQuery)
    const indexesCount = Number.parseInt(indexesResult.rows[0]?.count || '0')

    // Check constraints
    const constraintsQuery = `
      SELECT COUNT(*) as count
      FROM information_schema.table_constraints 
      WHERE table_schema = 'public'
    `
    const constraintsResult = await db.execute(constraintsQuery)
    const constraintsCount = Number.parseInt(constraintsResult.rows[0]?.count || '0')

    return {
      tablesCount,
      indexesCount,
      constraintsCount,
    }
  }

  /**
   * Validate vector search capabilities
   */
  private async validateVectorSearch(warnings: string[], recommendations: string[]): Promise<void> {
    try {
      // Check if vector extension is properly configured
      const vectorQuery = `
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND data_type = 'USER-DEFINED'
        AND udt_name = 'vector'
      `

      const vectorColumns = await db.execute(vectorQuery)

      if (vectorColumns.rows.length === 0) {
        warnings.push('No vector columns found - vector search capabilities may not be available')
      } else {
        // Check for HNSW indexes on vector columns
        for (const column of vectorColumns.rows) {
          const indexQuery = `
            SELECT indexname
            FROM pg_indexes
            WHERE tablename = (
              SELECT table_name
              FROM information_schema.columns
              WHERE column_name = $1
              AND data_type = 'USER-DEFINED'
              AND udt_name = 'vector'
              LIMIT 1
            )
            AND indexdef LIKE '%hnsw%'
            AND indexdef LIKE '%${column.column_name}%'
          `

          const indexes = await db.execute(indexQuery, [column.column_name])
          if (indexes.rows.length === 0) {
            recommendations.push(
              `Consider adding HNSW index on vector column ${column.column_name} for better performance`
            )
          }
        }
      }
    } catch (error) {
      warnings.push(`Vector search validation failed: ${error.message}`)
    }
  }

  /**
   * Validate indexes for performance
   */
  private async validateIndexes(warnings: string[], recommendations: string[]): Promise<void> {
    try {
      // Check for missing indexes on foreign key columns
      const foreignKeysQuery = `
        SELECT 
          tc.table_name,
          kcu.column_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
      `

      const foreignKeys = await db.execute(foreignKeysQuery)

      for (const fk of foreignKeys.rows) {
        const indexQuery = `
          SELECT indexname
          FROM pg_indexes
          WHERE tablename = $1
          AND indexdef LIKE '%${fk.column_name}%'
        `

        const indexes = await db.execute(indexQuery, [fk.table_name])
        if (indexes.rows.length === 0) {
          recommendations.push(
            `Add index on ${fk.table_name}.${fk.column_name} (foreign key) for better join performance`
          )
        }
      }

      // Check for tables with high row count but no indexes
      const largeTablesQuery = `
        SELECT 
          schemaname,
          tablename,
          n_live_tup as row_count
        FROM pg_stat_user_tables
        WHERE n_live_tup > 1000
        ORDER BY n_live_tup DESC
      `

      const largeTables = await db.execute(largeTablesQuery)

      for (const table of largeTables.rows) {
        const indexCountQuery = `
          SELECT COUNT(*) as count
          FROM pg_indexes
          WHERE tablename = $1
          AND schemaname = 'public'
        `

        const indexCount = await db.execute(indexCountQuery, [table.tablename])
        const count = Number.parseInt(indexCount.rows[0]?.count || '0')

        if (count < 2) {
          // Only primary key index
          warnings.push(
            `Table ${table.tablename} has ${table.row_count} rows but only ${count} index(es)`
          )
        }
      }
    } catch (error) {
      warnings.push(`Index validation failed: ${error.message}`)
    }
  }

  /**
   * Validate constraints and foreign keys
   */
  private async validateConstraints(warnings: string[], recommendations: string[]): Promise<void> {
    try {
      // Check for tables without primary keys
      const noPrimaryKeyQuery = `
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
        AND table_name NOT IN (
          SELECT table_name
          FROM information_schema.table_constraints
          WHERE constraint_type = 'PRIMARY KEY'
          AND table_schema = 'public'
        )
      `

      const tablesWithoutPK = await db.execute(noPrimaryKeyQuery)
      tablesWithoutPK.rows.forEach((row) => {
        warnings.push(`Table ${row.table_name} has no primary key`)
      })

      // Check for orphaned foreign key references
      const orphanedFKQuery = `
        SELECT 
          tc.table_name,
          kcu.column_name,
          ccu.table_name AS foreign_table_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
      `

      const foreignKeys = await db.execute(orphanedFKQuery)

      for (const fk of foreignKeys.rows) {
        // This is a basic check - in a real scenario you'd want to check for actual orphaned records
        const tableExistsQuery = `
          SELECT table_name
          FROM information_schema.tables
          WHERE table_name = $1
          AND table_schema = 'public'
        `

        const tableExists = await db.execute(tableExistsQuery, [fk.foreign_table_name])
        if (tableExists.rows.length === 0) {
          warnings.push(
            `Foreign key in ${fk.table_name}.${fk.column_name} references non-existent table ${fk.foreign_table_name}`
          )
        }
      }
    } catch (error) {
      warnings.push(`Constraint validation failed: ${error.message}`)
    }
  }

  /**
   * Validate migration status
   */
  private async validateMigrations(errors: string[], warnings: string[]): Promise<void> {
    try {
      const migrationStatus = await migrationRunner.getStatus()

      if (migrationStatus.pending.length > 0) {
        warnings.push(`${migrationStatus.pending.length} pending migrations found`)
      }

      // Validate migration integrity
      const validation = await migrationRunner.validateMigrations()
      if (!validation.valid) {
        errors.push(...validation.errors)
      }
      warnings.push(...validation.warnings)
    } catch (error) {
      warnings.push(`Migration validation failed: ${error.message}`)
    }
  }

  /**
   * Auto-fix common issues
   */
  async autoFix(): Promise<{
    success: boolean
    fixed: string[]
    errors: string[]
  }> {
    const fixed: string[] = []
    const errors: string[] = []

    try {
      // Install missing extensions
      const extensionsStatus = await this.validateExtensions()
      for (const extension of extensionsStatus.missing) {
        try {
          await db.execute(`CREATE EXTENSION IF NOT EXISTS "${extension}"`)
          fixed.push(`Installed extension: ${extension}`)
        } catch (error) {
          errors.push(`Failed to install extension ${extension}: ${error.message}`)
        }
      }

      // Run pending migrations
      const migrationStatus = await migrationRunner.getStatus()
      if (migrationStatus.pending.length > 0) {
        const migrationResult = await migrationRunner.migrate()
        if (migrationResult.success) {
          fixed.push(`Executed ${migrationResult.executed.length} pending migrations`)
        } else {
          errors.push(...migrationResult.errors)
        }
      }

      // Update statistics
      try {
        await db.execute('ANALYZE')
        fixed.push('Updated table statistics')
      } catch (error) {
        errors.push(`Failed to update statistics: ${error.message}`)
      }
    } catch (error) {
      errors.push(`Auto-fix failed: ${error.message}`)
    }

    return {
      success: errors.length === 0,
      fixed,
      errors,
    }
  }
}

// Export singleton instance
export const databaseValidator = new DatabaseValidator()
