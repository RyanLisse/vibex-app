/**
 * Data Validation Service
 *
 * Validates data integrity during and after migration.
 * Ensures no data loss and maintains consistency.
 */

import { db } from '@/db/config'
import { environments, tasks } from '@/db/schema'
import { eq } from 'drizzle-orm'
import type {
  ValidationResult,
  ValidationError,
  LocalStorageTask,
  LocalStorageEnvironment,
  LocalStorageData,
} from './types'

export interface ValidationOptions {
  validateSchema: boolean
  validateReferences: boolean
  validateConstraints: boolean
  validateCompleteness: boolean
  strictMode: boolean
}

export interface DataComparisonResult {
  identical: boolean
  differences: DataDifference[]
  localOnly: string[]
  databaseOnly: string[]
  summary: {
    totalLocal: number
    totalDatabase: number
    matched: number
    mismatched: number
  }
}

export interface DataDifference {
  id: string
  type: 'task' | 'environment'
  field: string
  localValue: any
  databaseValue: any
  severity: 'critical' | 'warning' | 'info'
}

export class ValidationService {
  private static instance: ValidationService

  private readonly defaultOptions: ValidationOptions = {
    validateSchema: true,
    validateReferences: true,
    validateConstraints: true,
    validateCompleteness: true,
    strictMode: false,
  }

  static getInstance(): ValidationService {
    if (!ValidationService.instance) {
      ValidationService.instance = new ValidationService()
    }
    return ValidationService.instance
  }

  /**
   * Validate migration completeness and integrity
   */
  async validateMigration(options?: Partial<ValidationOptions>): Promise<ValidationResult> {
    const opts = { ...this.defaultOptions, ...options }
    const errors: ValidationError[] = []
    const warnings: string[] = []
    const statistics = {
      totalChecked: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
    }

    try {
      // Extract localStorage data
      const localData = this.extractLocalStorageData()

      // Validate tasks
      if (localData.tasks && localData.tasks.length > 0) {
        const taskValidation = await this.validateTasks(localData.tasks, opts)
        errors.push(...taskValidation.errors)
        warnings.push(...taskValidation.warnings)
        statistics.totalChecked += taskValidation.statistics.totalChecked
        statistics.passed += taskValidation.statistics.passed
        statistics.failed += taskValidation.statistics.failed
        statistics.skipped += taskValidation.statistics.skipped
      }

      // Validate environments
      if (localData.environments && localData.environments.length > 0) {
        const envValidation = await this.validateEnvironments(localData.environments, opts)
        errors.push(...envValidation.errors)
        warnings.push(...envValidation.warnings)
        statistics.totalChecked += envValidation.statistics.totalChecked
        statistics.passed += envValidation.statistics.passed
        statistics.failed += envValidation.statistics.failed
        statistics.skipped += envValidation.statistics.skipped
      }

      // Validate completeness
      if (opts.validateCompleteness) {
        const completenessValidation = await this.validateCompleteness(localData)
        errors.push(...completenessValidation.errors)
        warnings.push(...completenessValidation.warnings)
      }

      const valid = errors.filter((e) => e.severity === 'ERROR').length === 0

      return {
        valid,
        errors,
        warnings,
        statistics,
      }
    } catch (error) {
      return {
        valid: false,
        errors: [
          {
            type: 'VALIDATION_ERROR',
            field: 'general',
            value: null,
            expected: 'successful validation',
            message: `Validation failed: ${error.message}`,
            severity: 'ERROR',
          },
        ],
        warnings,
        statistics,
      }
    }
  }

  /**
   * Validate tasks migration
   */
  private async validateTasks(
    localTasks: LocalStorageTask[],
    options: ValidationOptions
  ): Promise<ValidationResult> {
    const errors: ValidationError[] = []
    const warnings: string[] = []
    const statistics = {
      totalChecked: localTasks.length,
      passed: 0,
      failed: 0,
      skipped: 0,
    }

    for (const localTask of localTasks) {
      try {
        // Check if task exists in database
        const [dbTask] = await db.select().from(tasks).where(eq(tasks.id, localTask.id)).limit(1)

        if (!dbTask) {
          errors.push({
            type: 'MISSING_FIELD',
            field: 'task',
            value: localTask.id,
            expected: 'task in database',
            message: `Task ${localTask.id} not found in database`,
            severity: 'ERROR',
          })
          statistics.failed++
          continue
        }

        // Validate schema
        if (options.validateSchema) {
          const schemaErrors = this.validateTaskSchema(localTask, dbTask)
          errors.push(...schemaErrors)
          if (schemaErrors.length > 0) {
            statistics.failed++
            continue
          }
        }

        // Validate data integrity
        const integrityErrors = this.validateTaskIntegrity(localTask, dbTask)
        errors.push(...integrityErrors)

        if (integrityErrors.length > 0) {
          statistics.failed++
        } else {
          statistics.passed++
        }
      } catch (error) {
        errors.push({
          type: 'VALIDATION_ERROR',
          field: 'task',
          value: localTask.id,
          expected: 'successful validation',
          message: `Failed to validate task ${localTask.id}: ${error.message}`,
          severity: 'ERROR',
        })
        statistics.failed++
      }
    }

    return {
      valid: errors.filter((e) => e.severity === 'ERROR').length === 0,
      errors,
      warnings,
      statistics,
    }
  }

  /**
   * Validate environments migration
   */
  private async validateEnvironments(
    localEnvs: LocalStorageEnvironment[],
    options: ValidationOptions
  ): Promise<ValidationResult> {
    const errors: ValidationError[] = []
    const warnings: string[] = []
    const statistics = {
      totalChecked: localEnvs.length,
      passed: 0,
      failed: 0,
      skipped: 0,
    }

    for (const localEnv of localEnvs) {
      try {
        // Check if environment exists in database
        const [dbEnv] = await db
          .select()
          .from(environments)
          .where(eq(environments.id, localEnv.id))
          .limit(1)

        if (!dbEnv) {
          errors.push({
            type: 'MISSING_FIELD',
            field: 'environment',
            value: localEnv.id,
            expected: 'environment in database',
            message: `Environment ${localEnv.id} not found in database`,
            severity: 'ERROR',
          })
          statistics.failed++
          continue
        }

        // Validate schema
        if (options.validateSchema) {
          const schemaErrors = this.validateEnvironmentSchema(localEnv, dbEnv)
          errors.push(...schemaErrors)
          if (schemaErrors.length > 0) {
            statistics.failed++
            continue
          }
        }

        // Validate data integrity
        const integrityErrors = this.validateEnvironmentIntegrity(localEnv, dbEnv)
        errors.push(...integrityErrors)

        if (integrityErrors.length > 0) {
          statistics.failed++
        } else {
          statistics.passed++
        }
      } catch (error) {
        errors.push({
          type: 'VALIDATION_ERROR',
          field: 'environment',
          value: localEnv.id,
          expected: 'successful validation',
          message: `Failed to validate environment ${localEnv.id}: ${error.message}`,
          severity: 'ERROR',
        })
        statistics.failed++
      }
    }

    return {
      valid: errors.filter((e) => e.severity === 'ERROR').length === 0,
      errors,
      warnings,
      statistics,
    }
  }

  /**
   * Validate task schema
   */
  private validateTaskSchema(localTask: LocalStorageTask, dbTask: any): ValidationError[] {
    const errors: ValidationError[] = []

    // Required fields
    const requiredFields = ['id', 'title', 'status', 'createdAt', 'updatedAt']

    for (const field of requiredFields) {
      if (!dbTask[field]) {
        errors.push({
          type: 'MISSING_FIELD',
          field,
          value: null,
          expected: 'non-null value',
          message: `Required field '${field}' is missing in database`,
          severity: 'ERROR',
        })
      }
    }

    // Type validations
    if (dbTask.createdAt && !(dbTask.createdAt instanceof Date)) {
      errors.push({
        type: 'INVALID_TYPE',
        field: 'createdAt',
        value: dbTask.createdAt,
        expected: 'Date',
        message: 'createdAt should be a Date object',
        severity: 'ERROR',
      })
    }

    return errors
  }

  /**
   * Validate task data integrity
   */
  private validateTaskIntegrity(localTask: LocalStorageTask, dbTask: any): ValidationError[] {
    const errors: ValidationError[] = []

    // Critical fields must match exactly
    if (localTask.id !== dbTask.id) {
      errors.push({
        type: 'CONSTRAINT_VIOLATION',
        field: 'id',
        value: dbTask.id,
        expected: localTask.id,
        message: 'Task ID mismatch',
        severity: 'ERROR',
      })
    }

    if (localTask.title !== dbTask.title) {
      errors.push({
        type: 'CONSTRAINT_VIOLATION',
        field: 'title',
        value: dbTask.title,
        expected: localTask.title,
        message: 'Task title mismatch',
        severity: 'WARNING',
      })
    }

    // Status mapping validation
    const expectedStatus = this.mapTaskStatus(localTask.status)
    if (dbTask.status !== expectedStatus) {
      errors.push({
        type: 'CONSTRAINT_VIOLATION',
        field: 'status',
        value: dbTask.status,
        expected: expectedStatus,
        message: 'Task status mapping error',
        severity: 'WARNING',
      })
    }

    // Messages integrity
    if (localTask.messages && dbTask.metadata?.messages) {
      if (localTask.messages.length !== dbTask.metadata.messages.length) {
        errors.push({
          type: 'CONSTRAINT_VIOLATION',
          field: 'messages',
          value: dbTask.metadata.messages.length,
          expected: localTask.messages.length,
          message: 'Message count mismatch',
          severity: 'WARNING',
        })
      }
    }

    return errors
  }

  /**
   * Validate environment schema
   */
  private validateEnvironmentSchema(
    localEnv: LocalStorageEnvironment,
    dbEnv: any
  ): ValidationError[] {
    const errors: ValidationError[] = []

    // Required fields
    const requiredFields = ['id', 'name', 'createdAt', 'updatedAt']

    for (const field of requiredFields) {
      if (!dbEnv[field]) {
        errors.push({
          type: 'MISSING_FIELD',
          field,
          value: null,
          expected: 'non-null value',
          message: `Required field '${field}' is missing in database`,
          severity: 'ERROR',
        })
      }
    }

    return errors
  }

  /**
   * Validate environment data integrity
   */
  private validateEnvironmentIntegrity(
    localEnv: LocalStorageEnvironment,
    dbEnv: any
  ): ValidationError[] {
    const errors: ValidationError[] = []

    // Critical fields must match
    if (localEnv.id !== dbEnv.id) {
      errors.push({
        type: 'CONSTRAINT_VIOLATION',
        field: 'id',
        value: dbEnv.id,
        expected: localEnv.id,
        message: 'Environment ID mismatch',
        severity: 'ERROR',
      })
    }

    if (localEnv.name !== dbEnv.name) {
      errors.push({
        type: 'CONSTRAINT_VIOLATION',
        field: 'name',
        value: dbEnv.name,
        expected: localEnv.name,
        message: 'Environment name mismatch',
        severity: 'WARNING',
      })
    }

    // Config validation
    if (dbEnv.config) {
      if (localEnv.githubOrganization !== dbEnv.config.githubOrganization) {
        errors.push({
          type: 'CONSTRAINT_VIOLATION',
          field: 'githubOrganization',
          value: dbEnv.config.githubOrganization,
          expected: localEnv.githubOrganization,
          message: 'GitHub organization mismatch',
          severity: 'WARNING',
        })
      }
    }

    return errors
  }

  /**
   * Validate data completeness
   */
  private async validateCompleteness(localData: LocalStorageData): Promise<ValidationResult> {
    const errors: ValidationError[] = []
    const warnings: string[] = []

    try {
      // Count items in database
      const [dbTaskCount] = await db.select({ count: tasks.id }).from(tasks)
      const [dbEnvCount] = await db.select({ count: environments.id }).from(environments)

      const localTaskCount = localData.tasks?.length || 0
      const localEnvCount = localData.environments?.length || 0

      // Check task completeness
      if (localTaskCount > 0 && Number(dbTaskCount.count) < localTaskCount) {
        errors.push({
          type: 'MISSING_FIELD',
          field: 'tasks',
          value: Number(dbTaskCount.count),
          expected: localTaskCount.toString(),
          message: `Database has fewer tasks (${dbTaskCount.count}) than localStorage (${localTaskCount})`,
          severity: 'ERROR',
        })
      }

      // Check environment completeness
      if (localEnvCount > 0 && Number(dbEnvCount.count) < localEnvCount) {
        errors.push({
          type: 'MISSING_FIELD',
          field: 'environments',
          value: Number(dbEnvCount.count),
          expected: localEnvCount.toString(),
          message: `Database has fewer environments (${dbEnvCount.count}) than localStorage (${localEnvCount})`,
          severity: 'ERROR',
        })
      }

      // Warnings for extra items in database
      if (Number(dbTaskCount.count) > localTaskCount) {
        warnings.push(
          `Database has more tasks (${dbTaskCount.count}) than localStorage (${localTaskCount})`
        )
      }

      if (Number(dbEnvCount.count) > localEnvCount) {
        warnings.push(
          `Database has more environments (${dbEnvCount.count}) than localStorage (${localEnvCount})`
        )
      }
    } catch (error) {
      errors.push({
        type: 'VALIDATION_ERROR',
        field: 'completeness',
        value: null,
        expected: 'successful validation',
        message: `Failed to validate completeness: ${error.message}`,
        severity: 'ERROR',
      })
    }

    return {
      valid: errors.filter((e) => e.severity === 'ERROR').length === 0,
      errors,
      warnings,
      statistics: {
        totalChecked: 1,
        passed: errors.length === 0 ? 1 : 0,
        failed: errors.length > 0 ? 1 : 0,
        skipped: 0,
      },
    }
  }

  /**
   * Compare localStorage and database data
   */
  async compareData(): Promise<DataComparisonResult> {
    const differences: DataDifference[] = []
    const localOnly: string[] = []
    const databaseOnly: string[] = []
    let matched = 0
    let mismatched = 0

    try {
      // Extract localStorage data
      const localData = this.extractLocalStorageData()

      // Get database data
      const dbTasks = await db.select().from(tasks)
      const dbEnvs = await db.select().from(environments)

      // Create maps for efficient lookup
      const localTaskMap = new Map(localData.tasks?.map((t) => [t.id, t]) || [])
      const localEnvMap = new Map(localData.environments?.map((e) => [e.id, e]) || [])
      const dbTaskMap = new Map(dbTasks.map((t) => [t.id, t]))
      const dbEnvMap = new Map(dbEnvs.map((e) => [e.id, e]))

      // Compare tasks
      for (const [id, localTask] of localTaskMap) {
        const dbTask = dbTaskMap.get(id)
        if (!dbTask) {
          localOnly.push(`task:${id}`)
        } else {
          const taskDiffs = this.compareTask(localTask, dbTask)
          if (taskDiffs.length > 0) {
            differences.push(...taskDiffs)
            mismatched++
          } else {
            matched++
          }
          dbTaskMap.delete(id) // Remove to track database-only items
        }
      }

      // Compare environments
      for (const [id, localEnv] of localEnvMap) {
        const dbEnv = dbEnvMap.get(id)
        if (!dbEnv) {
          localOnly.push(`environment:${id}`)
        } else {
          const envDiffs = this.compareEnvironment(localEnv, dbEnv)
          if (envDiffs.length > 0) {
            differences.push(...envDiffs)
            mismatched++
          } else {
            matched++
          }
          dbEnvMap.delete(id)
        }
      }

      // Remaining items are database-only
      for (const id of dbTaskMap.keys()) {
        databaseOnly.push(`task:${id}`)
      }
      for (const id of dbEnvMap.keys()) {
        databaseOnly.push(`environment:${id}`)
      }

      return {
        identical: differences.length === 0 && localOnly.length === 0 && databaseOnly.length === 0,
        differences,
        localOnly,
        databaseOnly,
        summary: {
          totalLocal: (localData.tasks?.length || 0) + (localData.environments?.length || 0),
          totalDatabase: dbTasks.length + dbEnvs.length,
          matched,
          mismatched,
        },
      }
    } catch (error) {
      throw new Error(`Failed to compare data: ${error.message}`)
    }
  }

  /**
   * Compare individual task
   */
  private compareTask(localTask: LocalStorageTask, dbTask: any): DataDifference[] {
    const differences: DataDifference[] = []

    // Compare critical fields
    if (localTask.title !== dbTask.title) {
      differences.push({
        id: localTask.id,
        type: 'task',
        field: 'title',
        localValue: localTask.title,
        databaseValue: dbTask.title,
        severity: 'warning',
      })
    }

    // Compare status (with mapping)
    const expectedStatus = this.mapTaskStatus(localTask.status)
    if (dbTask.status !== expectedStatus) {
      differences.push({
        id: localTask.id,
        type: 'task',
        field: 'status',
        localValue: localTask.status,
        databaseValue: dbTask.status,
        severity: 'warning',
      })
    }

    // Compare timestamps
    const localCreated = new Date(localTask.createdAt).getTime()
    const dbCreated = dbTask.createdAt.getTime()
    if (Math.abs(localCreated - dbCreated) > 1000) {
      // Allow 1 second difference
      differences.push({
        id: localTask.id,
        type: 'task',
        field: 'createdAt',
        localValue: localTask.createdAt,
        databaseValue: dbTask.createdAt.toISOString(),
        severity: 'info',
      })
    }

    return differences
  }

  /**
   * Compare individual environment
   */
  private compareEnvironment(localEnv: LocalStorageEnvironment, dbEnv: any): DataDifference[] {
    const differences: DataDifference[] = []

    if (localEnv.name !== dbEnv.name) {
      differences.push({
        id: localEnv.id,
        type: 'environment',
        field: 'name',
        localValue: localEnv.name,
        databaseValue: dbEnv.name,
        severity: 'warning',
      })
    }

    if (localEnv.description !== dbEnv.description) {
      differences.push({
        id: localEnv.id,
        type: 'environment',
        field: 'description',
        localValue: localEnv.description,
        databaseValue: dbEnv.description,
        severity: 'info',
      })
    }

    return differences
  }

  /**
   * Extract localStorage data
   */
  private extractLocalStorageData(): LocalStorageData {
    const data: LocalStorageData = {}

    try {
      // Extract tasks
      const taskData = localStorage.getItem('task-store')
      if (taskData) {
        const parsed = JSON.parse(taskData)
        data.tasks = parsed?.state?.tasks || parsed?.tasks || []
      }

      // Extract environments
      const envData = localStorage.getItem('environments')
      if (envData) {
        const parsed = JSON.parse(envData)
        data.environments = parsed?.state?.environments || parsed?.environments || []
      }
    } catch (error) {
      console.error('Failed to extract localStorage data:', error)
    }

    return data
  }

  /**
   * Map localStorage task status to database status
   */
  private mapTaskStatus(localStatus: string): string {
    const statusMap: Record<string, string> = {
      IN_PROGRESS: 'in_progress',
      DONE: 'completed',
      MERGED: 'completed',
      CANCELLED: 'cancelled',
      PAUSED: 'pending',
    }

    return statusMap[localStatus] || 'pending'
  }

  /**
   * Generate validation report
   */
  async generateValidationReport(): Promise<string> {
    const validation = await this.validateMigration()
    const comparison = await this.compareData()

    const report = `
# Migration Validation Report
Generated: ${new Date().toISOString()}

## Overall Status
- Valid: ${validation.valid ? '✅ Yes' : '❌ No'}
- Data Identical: ${comparison.identical ? '✅ Yes' : '⚠️ No'}

## Statistics
- Total Checked: ${validation.statistics.totalChecked}
- Passed: ${validation.statistics.passed}
- Failed: ${validation.statistics.failed}
- Skipped: ${validation.statistics.skipped}

## Data Comparison
- Total Local Items: ${comparison.summary.totalLocal}
- Total Database Items: ${comparison.summary.totalDatabase}
- Matched: ${comparison.summary.matched}
- Mismatched: ${comparison.summary.mismatched}

## Errors (${validation.errors.length})
${validation.errors.map((e) => `- [${e.severity}] ${e.field}: ${e.message}`).join('\n') || 'None'}

## Warnings (${validation.warnings.length})
${validation.warnings.join('\n') || 'None'}

## Data Differences (${comparison.differences.length})
${
  comparison.differences
    .slice(0, 10)
    .map(
      (d) =>
        `- ${d.type} ${d.id}: ${d.field} differs (local: ${d.localValue}, db: ${d.databaseValue})`
    )
    .join('\n') || 'None'
}
${comparison.differences.length > 10 ? `\n... and ${comparison.differences.length - 10} more differences` : ''}

## Local Only Items (${comparison.localOnly.length})
${comparison.localOnly.slice(0, 10).join('\n') || 'None'}
${comparison.localOnly.length > 10 ? `\n... and ${comparison.localOnly.length - 10} more items` : ''}

## Database Only Items (${comparison.databaseOnly.length})
${comparison.databaseOnly.slice(0, 10).join('\n') || 'None'}
${comparison.databaseOnly.length > 10 ? `\n... and ${comparison.databaseOnly.length - 10} more items` : ''}
`

    return report
  }
}

// Export singleton instance
export const validationService = ValidationService.getInstance()
