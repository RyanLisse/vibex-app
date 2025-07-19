/**
 * Data Mapper Service
 *
 * Maps localStorage data structures to database schema entities.
 * Handles data transformation, type conversion, and field mapping.
 */

import { ulid } from 'ulid'
import type {
  Environment as DbEnvironment,
  Task as DbTask,
  NewEnvironment,
  NewTask,
} from '@/db/schema'
import type {
  DataConflict,
  DataMapping,
  LocalStorageEnvironment,
  LocalStorageTask,
  MigrationError,
  TransformationRule,
} from './types'

export class DataMapper {
  private static instance: DataMapper
  private readonly transformationRules: Map<string, TransformationRule[]> = new Map()
  private readonly dataMappings: DataMapping[] = []

  static getInstance(): DataMapper {
    if (!DataMapper.instance) {
      DataMapper.instance = new DataMapper()
      DataMapper.instance.initializeRules()
    }
    return DataMapper.instance
  }

  /**
   * Initialize transformation rules for different data types
   */
  private initializeRules(): void {
    // Task transformation rules
    this.transformationRules.set('tasks', [
      {
        field: 'id',
        sourceType: 'string',
        targetType: 'uuid',
        transform: (value: unknown) => {
          // Keep existing UUID if valid, otherwise generate new one
          const id = value as string
          if (this.isValidUuid(id)) {
            return id
          }
          return ulid() // Generate new ULID if invalid UUID
        },
        validate: (value: unknown) => typeof value === 'string' && value.length > 0,
      },
      {
        field: 'title',
        sourceType: 'string',
        targetType: 'varchar(255)',
        transform: (value: unknown) => {
          const title = String(value || 'Untitled Task')
          return title.length > 255 ? title.substring(0, 255) : title
        },
        validate: (value: unknown) => typeof value === 'string',
      },
      {
        field: 'description',
        sourceType: 'string',
        targetType: 'text',
        transform: (value: unknown) => String(value || ''),
        validate: (value: unknown) =>
          value === null || value === undefined || typeof value === 'string',
      },
      {
        field: 'status',
        sourceType: 'TaskStatus',
        targetType: 'varchar(50)',
        transform: (value: unknown) => {
          const statusMap: Record<string, string> = {
            IN_PROGRESS: 'in_progress',
            DONE: 'completed',
            MERGED: 'completed',
            PAUSED: 'paused',
            CANCELLED: 'cancelled',
          }
          return statusMap[value as string] || 'pending'
        },
        validate: (value: unknown) => typeof value === 'string',
      },
      {
        field: 'priority',
        sourceType: 'implied',
        targetType: 'varchar(20)',
        transform: (value: unknown, item?: LocalStorageTask) => {
          // Infer priority from task properties
          if (item?.hasChanges || item?.pullRequest) return 'high'
          if (item?.status === 'IN_PROGRESS') return 'medium'
          return 'low'
        },
        defaultValue: 'medium',
      },
      {
        field: 'createdAt',
        sourceType: 'string',
        targetType: 'timestamp',
        transform: (value: unknown) => {
          if (typeof value === 'string') {
            const date = new Date(value)
            return isNaN(date.getTime()) ? new Date() : date
          }
          return new Date()
        },
        validate: (value: unknown) => {
          if (typeof value === 'string') {
            return !isNaN(Date.parse(value))
          }
          return false
        },
      },
      {
        field: 'updatedAt',
        sourceType: 'string',
        targetType: 'timestamp',
        transform: (value: unknown) => {
          if (typeof value === 'string') {
            const date = new Date(value)
            return isNaN(date.getTime()) ? new Date() : date
          }
          return new Date()
        },
        validate: (value: unknown) => {
          if (typeof value === 'string') {
            return !isNaN(Date.parse(value))
          }
          return false
        },
      },
      {
        field: 'metadata',
        sourceType: 'TaskMetadata',
        targetType: 'jsonb',
        transform: (value: unknown, item?: LocalStorageTask) => {
          return {
            messages: item?.messages || [],
            branch: item?.branch,
            repository: item?.repository,
            sessionId: item?.sessionId,
            statusMessage: item?.statusMessage,
            isArchived: item?.isArchived,
            mode: item?.mode || 'code',
            hasChanges: item?.hasChanges,
            pullRequest: item?.pullRequest,
            originalLocalStorageId: item?.id,
          }
        },
        validate: () => true,
      },
    ])

    // Environment transformation rules
    this.transformationRules.set('environments', [
      {
        field: 'id',
        sourceType: 'string',
        targetType: 'uuid',
        transform: (value: unknown) => {
          const id = value as string
          if (this.isValidUuid(id)) {
            return id
          }
          return ulid()
        },
        validate: (value: unknown) => typeof value === 'string' && value.length > 0,
      },
      {
        field: 'name',
        sourceType: 'string',
        targetType: 'varchar(255)',
        transform: (value: unknown) => {
          const name = String(value || 'Unnamed Environment')
          return name.length > 255 ? name.substring(0, 255) : name
        },
        validate: (value: unknown) => typeof value === 'string',
      },
      {
        field: 'config',
        sourceType: 'EnvironmentConfig',
        targetType: 'jsonb',
        transform: (value: unknown, item?: LocalStorageEnvironment) => {
          return {
            description: item?.description,
            githubOrganization: item?.githubOrganization,
            githubToken: item?.githubToken, // Note: Should be encrypted in production
            githubRepository: item?.githubRepository,
            originalLocalStorageId: item?.id,
          }
        },
        validate: () => true,
      },
      {
        field: 'isActive',
        sourceType: 'boolean',
        targetType: 'boolean',
        transform: (value: unknown) => Boolean(value),
        defaultValue: false,
      },
      {
        field: 'createdAt',
        sourceType: 'Date|string',
        targetType: 'timestamp',
        transform: (value: unknown) => {
          if (value instanceof Date) {
            return value
          }
          if (typeof value === 'string') {
            const date = new Date(value)
            return isNaN(date.getTime()) ? new Date() : date
          }
          return new Date()
        },
        validate: (value: unknown) => {
          if (value instanceof Date) return true
          if (typeof value === 'string') {
            return !isNaN(Date.parse(value))
          }
          return false
        },
      },
      {
        field: 'updatedAt',
        sourceType: 'Date|string',
        targetType: 'timestamp',
        transform: (value: unknown) => {
          if (value instanceof Date) {
            return value
          }
          if (typeof value === 'string') {
            const date = new Date(value)
            return isNaN(date.getTime()) ? new Date() : date
          }
          return new Date()
        },
        validate: (value: unknown) => {
          if (value instanceof Date) return true
          if (typeof value === 'string') {
            return !isNaN(Date.parse(value))
          }
          return false
        },
      },
      {
        field: 'schemaVersion',
        sourceType: 'implied',
        targetType: 'integer',
        transform: () => 1, // Version 1 for migrated data
        defaultValue: 1,
      },
    ])

    // Initialize data mappings
    this.dataMappings.push(
      {
        source: 'task-store',
        target: 'tasks',
        transformations: this.transformationRules.get('tasks') || [],
        conflictStrategy: 'MERGE',
      },
      {
        source: 'environments',
        target: 'environments',
        transformations: this.transformationRules.get('environments') || [],
        conflictStrategy: 'MERGE',
      }
    )
  }

  /**
   * Transform localStorage tasks to database format
   */
  transformTasks(tasks: LocalStorageTask[]): {
    transformed: NewTask[]
    errors: MigrationError[]
    warnings: string[]
  } {
    const transformed: NewTask[] = []
    const errors: MigrationError[] = []
    const warnings: string[] = []
    const rules = this.transformationRules.get('tasks') || []

    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i]

      try {
        const dbTask: Partial<NewTask> = {}

        // Apply transformation rules
        for (const rule of rules) {
          try {
            const sourceValue =
              rule.field === 'metadata' || rule.field === 'priority'
                ? task // Pass entire object for computed fields
                : (task as any)[rule.field]

            // Validate source value if validation function exists
            if (rule.validate && !rule.validate(sourceValue)) {
              if (rule.defaultValue !== undefined) {
                ;(dbTask as any)[rule.field] = rule.defaultValue
                warnings.push(`Task ${i}: Using default value for ${rule.field}`)
                continue
              }
              errors.push({
                type: 'VALIDATION_ERROR',
                message: `Invalid value for field ${rule.field}`,
                item: task,
                field: rule.field,
                originalValue: sourceValue,
                expectedType: rule.targetType,
              })
              continue
            }

            // Transform the value
            const transformedValue = rule.transform(sourceValue, task)
            ;(dbTask as any)[rule.field] = transformedValue
          } catch (transformError) {
            errors.push({
              type: 'TRANSFORM_ERROR',
              message: `Error transforming ${rule.field}: ${transformError.message}`,
              item: task,
              field: rule.field,
            })
          }
        }

        // Ensure all required fields are present
        if (dbTask.id && dbTask.title && dbTask.status && dbTask.createdAt && dbTask.updatedAt) {
          transformed.push(dbTask as NewTask)
        } else {
          errors.push({
            type: 'VALIDATION_ERROR',
            message: `Missing required fields for task ${i}`,
            item: task,
          })
        }
      } catch (error) {
        errors.push({
          type: 'TRANSFORM_ERROR',
          message: `Failed to transform task ${i}: ${error.message}`,
          item: task,
        })
      }
    }

    return { transformed, errors, warnings }
  }

  /**
   * Transform localStorage environments to database format
   */
  transformEnvironments(environments: LocalStorageEnvironment[]): {
    transformed: NewEnvironment[]
    errors: MigrationError[]
    warnings: string[]
  } {
    const transformed: NewEnvironment[] = []
    const errors: MigrationError[] = []
    const warnings: string[] = []
    const rules = this.transformationRules.get('environments') || []

    for (let i = 0; i < environments.length; i++) {
      const env = environments[i]

      try {
        const dbEnv: Partial<NewEnvironment> = {}

        // Apply transformation rules
        for (const rule of rules) {
          try {
            const sourceValue =
              rule.field === 'config' || rule.field === 'isActive' || rule.field === 'schemaVersion'
                ? env // Pass entire object for computed fields
                : (env as any)[rule.field]

            // Validate source value if validation function exists
            if (rule.validate && !rule.validate(sourceValue)) {
              if (rule.defaultValue !== undefined) {
                ;(dbEnv as any)[rule.field] = rule.defaultValue
                warnings.push(`Environment ${i}: Using default value for ${rule.field}`)
                continue
              }
              errors.push({
                type: 'VALIDATION_ERROR',
                message: `Invalid value for field ${rule.field}`,
                item: env,
                field: rule.field,
                originalValue: sourceValue,
                expectedType: rule.targetType,
              })
              continue
            }

            // Transform the value
            const transformedValue = rule.transform(sourceValue, env)
            ;(dbEnv as any)[rule.field] = transformedValue
          } catch (transformError) {
            errors.push({
              type: 'TRANSFORM_ERROR',
              message: `Error transforming ${rule.field}: ${transformError.message}`,
              item: env,
              field: rule.field,
            })
          }
        }

        // Ensure all required fields are present
        if (dbEnv.id && dbEnv.name && dbEnv.config && dbEnv.createdAt && dbEnv.updatedAt) {
          transformed.push(dbEnv as NewEnvironment)
        } else {
          errors.push({
            type: 'VALIDATION_ERROR',
            message: `Missing required fields for environment ${i}`,
            item: env,
          })
        }
      } catch (error) {
        errors.push({
          type: 'TRANSFORM_ERROR',
          message: `Failed to transform environment ${i}: ${error.message}`,
          item: env,
        })
      }
    }

    return { transformed, errors, warnings }
  }

  /**
   * Detect potential data conflicts before migration
   */
  async detectConflicts(
    transformedTasks: NewTask[],
    transformedEnvironments: NewEnvironment[],
    existingTasks: DbTask[] = [],
    existingEnvironments: DbEnvironment[] = []
  ): Promise<DataConflict[]> {
    const conflicts: DataConflict[] = []

    // Check for task ID conflicts
    const existingTaskIds = new Set(existingTasks.map((t) => t.id))
    for (const task of transformedTasks) {
      if (existingTaskIds.has(task.id)) {
        const existingTask = existingTasks.find((t) => t.id === task.id)
        conflicts.push({
          id: `task-${task.id}`,
          type: 'DUPLICATE_ID',
          localData: task,
          existingData: existingTask,
          suggestion: 'Generate new ID or merge data',
        })
      }
    }

    // Check for environment ID conflicts
    const existingEnvIds = new Set(existingEnvironments.map((e) => e.id))
    for (const env of transformedEnvironments) {
      if (existingEnvIds.has(env.id)) {
        const existingEnv = existingEnvironments.find((e) => e.id === env.id)
        conflicts.push({
          id: `env-${env.id}`,
          type: 'DUPLICATE_ID',
          localData: env,
          existingData: existingEnv,
          suggestion: 'Generate new ID or merge configuration',
        })
      }
    }

    // Check for environment name conflicts (should be unique per user)
    const envNameMap = new Map<string, NewEnvironment>()
    for (const env of transformedEnvironments) {
      const key = `${env.userId}-${env.name}`
      if (envNameMap.has(key)) {
        conflicts.push({
          id: `env-name-${env.id}`,
          type: 'CONSTRAINT_VIOLATION',
          localData: env,
          existingData: envNameMap.get(key),
          field: 'name',
          suggestion: 'Rename environment or merge with existing',
        })
      }
      envNameMap.set(key, env)
    }

    return conflicts
  }

  /**
   * Get data mapping configuration
   */
  getDataMappings(): DataMapping[] {
    return [...this.dataMappings]
  }

  /**
   * Get transformation rules for a specific data type
   */
  getTransformationRules(dataType: string): TransformationRule[] {
    return [...(this.transformationRules.get(dataType) || [])]
  }

  /**
   * Validate UUID format
   */
  private isValidUuid(str: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    const ulidRegex = /^[0-9A-HJKMNP-TV-Z]{26}$/i
    return uuidRegex.test(str) || ulidRegex.test(str)
  }

  /**
   * Generate migration statistics
   */
  generateMigrationStats(data: {
    originalTasks: number
    originalEnvironments: number
    transformedTasks: number
    transformedEnvironments: number
    errors: number
    warnings: number
    conflicts: number
  }): {
    totalOriginalItems: number
    totalTransformedItems: number
    successRate: number
    errorRate: number
    warningRate: number
    conflictRate: number
  } {
    const totalOriginal = data.originalTasks + data.originalEnvironments
    const totalTransformed = data.transformedTasks + data.transformedEnvironments

    return {
      totalOriginalItems: totalOriginal,
      totalTransformedItems: totalTransformed,
      successRate: totalOriginal > 0 ? (totalTransformed / totalOriginal) * 100 : 0,
      errorRate: totalOriginal > 0 ? (data.errors / totalOriginal) * 100 : 0,
      warningRate: totalOriginal > 0 ? (data.warnings / totalOriginal) * 100 : 0,
      conflictRate: totalTransformed > 0 ? (data.conflicts / totalTransformed) * 100 : 0,
    }
  }
}

export const dataMapper = DataMapper.getInstance()
