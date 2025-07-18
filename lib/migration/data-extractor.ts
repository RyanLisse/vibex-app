/**
 * Data Extractor Service
 *
 * Extracts data from localStorage with type safety and validation.
 * Handles Zustand store data formats and provides normalized output.
 */

import type {
  LocalStorageData,
  LocalStorageTask,
  LocalStorageEnvironment,
  MigrationError,
  ValidationResult,
} from './types'

export class DataExtractor {
  private static instance: DataExtractor
  private readonly knownKeys = new Set([
    'task-store',
    'environments',
    // Add other known localStorage keys
  ])

  static getInstance(): DataExtractor {
    if (!DataExtractor.instance) {
      DataExtractor.instance = new DataExtractor()
    }
    return DataExtractor.instance
  }

  /**
   * Extract all relevant data from localStorage
   */
  async extractAll(): Promise<{
    data: LocalStorageData
    errors: MigrationError[]
    warnings: string[]
  }> {
    const data: LocalStorageData = {}
    const errors: MigrationError[] = []
    const warnings: string[] = []

    try {
      // Extract tasks data
      const tasksResult = await this.extractTasks()
      if (tasksResult.data) {
        data.tasks = tasksResult.data
      }
      errors.push(...tasksResult.errors)
      warnings.push(...tasksResult.warnings)

      // Extract environments data
      const environmentsResult = await this.extractEnvironments()
      if (environmentsResult.data) {
        data.environments = environmentsResult.data
      }
      errors.push(...environmentsResult.errors)
      warnings.push(...environmentsResult.warnings)

      // Extract form data
      const formDataResult = await this.extractFormData()
      if (formDataResult.data && Object.keys(formDataResult.data).length > 0) {
        data.formData = formDataResult.data
      }
      errors.push(...formDataResult.errors)
      warnings.push(...formDataResult.warnings)

      // Check for unknown localStorage keys
      const unknownKeys = this.findUnknownKeys()
      if (unknownKeys.length > 0) {
        warnings.push(`Found unknown localStorage keys: ${unknownKeys.join(', ')}`)
      }
    } catch (error) {
      errors.push({
        type: 'DATABASE_ERROR',
        message: `Failed to extract localStorage data: ${error.message}`,
      })
    }

    return { data, errors, warnings }
  }

  /**
   * Extract tasks from Zustand task store
   */
  async extractTasks(): Promise<{
    data?: LocalStorageTask[]
    errors: MigrationError[]
    warnings: string[]
  }> {
    const errors: MigrationError[] = []
    const warnings: string[] = []

    try {
      const taskStoreData = localStorage.getItem('task-store')
      if (!taskStoreData) {
        warnings.push('No task store data found in localStorage')
        return { errors, warnings }
      }

      const parsed = JSON.parse(taskStoreData)

      // Zustand persist middleware wraps data in state object
      const tasks = parsed?.state?.tasks || parsed?.tasks

      if (!Array.isArray(tasks)) {
        errors.push({
          type: 'VALIDATION_ERROR',
          message: 'Tasks data is not an array',
          item: tasks,
          expectedType: 'Array<Task>',
        })
        return { errors, warnings }
      }

      // Validate each task
      const validatedTasks: LocalStorageTask[] = []

      for (let i = 0; i < tasks.length; i++) {
        const task = tasks[i]
        const validation = this.validateTask(task, i)

        if (validation.valid) {
          validatedTasks.push(task)
        } else {
          errors.push(
            ...validation.errors.map((err) => ({
              type: 'VALIDATION_ERROR' as const,
              message: `Task ${i}: ${err.message}`,
              item: task,
              field: err.field,
            }))
          )
        }
      }

      if (validatedTasks.length < tasks.length) {
        warnings.push(
          `${tasks.length - validatedTasks.length} tasks failed validation and were skipped`
        )
      }

      return {
        data: validatedTasks,
        errors,
        warnings,
      }
    } catch (error) {
      errors.push({
        type: 'TRANSFORM_ERROR',
        message: `Failed to parse task store data: ${error.message}`,
      })
      return { errors, warnings }
    }
  }

  /**
   * Extract environments from Zustand environments store
   */
  async extractEnvironments(): Promise<{
    data?: LocalStorageEnvironment[]
    errors: MigrationError[]
    warnings: string[]
  }> {
    const errors: MigrationError[] = []
    const warnings: string[] = []

    try {
      const environmentsData = localStorage.getItem('environments')
      if (!environmentsData) {
        warnings.push('No environments data found in localStorage')
        return { errors, warnings }
      }

      const parsed = JSON.parse(environmentsData)

      // Zustand persist middleware wraps data in state object
      const environments = parsed?.state?.environments || parsed?.environments

      if (!Array.isArray(environments)) {
        errors.push({
          type: 'VALIDATION_ERROR',
          message: 'Environments data is not an array',
          item: environments,
          expectedType: 'Array<Environment>',
        })
        return { errors, warnings }
      }

      // Validate each environment
      const validatedEnvironments: LocalStorageEnvironment[] = []

      for (let i = 0; i < environments.length; i++) {
        const env = environments[i]
        const validation = this.validateEnvironment(env, i)

        if (validation.valid) {
          validatedEnvironments.push(env)
        } else {
          errors.push(
            ...validation.errors.map((err) => ({
              type: 'VALIDATION_ERROR' as const,
              message: `Environment ${i}: ${err.message}`,
              item: env,
              field: err.field,
            }))
          )
        }
      }

      if (validatedEnvironments.length < environments.length) {
        warnings.push(
          `${environments.length - validatedEnvironments.length} environments failed validation and were skipped`
        )
      }

      return {
        data: validatedEnvironments,
        errors,
        warnings,
      }
    } catch (error) {
      errors.push({
        type: 'TRANSFORM_ERROR',
        message: `Failed to parse environments data: ${error.message}`,
      })
      return { errors, warnings }
    }
  }

  /**
   * Extract form data from various form storage keys
   */
  async extractFormData(): Promise<{
    data?: Record<string, unknown>
    errors: MigrationError[]
    warnings: string[]
  }> {
    const errors: MigrationError[] = []
    const warnings: string[] = []
    const formData: Record<string, unknown> = {}

    try {
      // Scan for form-related localStorage keys
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (!key || this.knownKeys.has(key)) continue

        // Check if it looks like form data (contains 'form' or has JSON structure)
        if (key.includes('form') || key.includes('draft') || key.includes('temp')) {
          try {
            const value = localStorage.getItem(key)
            if (value) {
              const parsed = JSON.parse(value)
              formData[key] = parsed
            }
          } catch (parseError) {
            warnings.push(`Could not parse potential form data for key: ${key}`)
          }
        }
      }

      return { data: formData, errors, warnings }
    } catch (error) {
      errors.push({
        type: 'TRANSFORM_ERROR',
        message: `Failed to extract form data: ${error.message}`,
      })
      return { errors, warnings }
    }
  }

  /**
   * Get statistics about localStorage data
   */
  getStorageStatistics(): {
    totalKeys: number
    knownKeys: number
    unknownKeys: number
    totalSize: number
    keysSizes: Record<string, number>
  } {
    const stats = {
      totalKeys: localStorage.length,
      knownKeys: 0,
      unknownKeys: 0,
      totalSize: 0,
      keysSizes: {} as Record<string, number>,
    }

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (!key) continue

      const value = localStorage.getItem(key) || ''
      const size = new Blob([value]).size

      stats.keysSizes[key] = size
      stats.totalSize += size

      if (this.knownKeys.has(key)) {
        stats.knownKeys++
      } else {
        stats.unknownKeys++
      }
    }

    return stats
  }

  /**
   * Find unknown localStorage keys that might contain data
   */
  private findUnknownKeys(): string[] {
    const unknownKeys: string[] = []

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && !this.knownKeys.has(key)) {
        unknownKeys.push(key)
      }
    }

    return unknownKeys
  }

  /**
   * Validate task structure
   */
  private validateTask(task: unknown, index: number): ValidationResult {
    const errors: any[] = []

    if (!task || typeof task !== 'object') {
      return {
        valid: false,
        errors: [{ field: 'root', message: 'Task must be an object', severity: 'ERROR' }],
        warnings: [],
        statistics: { totalChecked: 1, passed: 0, failed: 1, skipped: 0 },
      }
    }

    const t = task as Record<string, unknown>

    // Required fields
    const requiredFields = ['id', 'title', 'status', 'createdAt', 'updatedAt']
    for (const field of requiredFields) {
      if (!(field in t) || t[field] === null || t[field] === undefined) {
        errors.push({ field, message: `Missing required field: ${field}`, severity: 'ERROR' })
      }
    }

    // Type validations
    if (typeof t.id !== 'string') {
      errors.push({ field: 'id', message: 'ID must be a string', severity: 'ERROR' })
    }

    if (typeof t.title !== 'string') {
      errors.push({ field: 'title', message: 'Title must be a string', severity: 'ERROR' })
    }

    // Date validations
    if (t.createdAt && typeof t.createdAt === 'string') {
      if (isNaN(Date.parse(t.createdAt as string))) {
        errors.push({ field: 'createdAt', message: 'Invalid date format', severity: 'ERROR' })
      }
    }

    if (t.updatedAt && typeof t.updatedAt === 'string') {
      if (isNaN(Date.parse(t.updatedAt as string))) {
        errors.push({ field: 'updatedAt', message: 'Invalid date format', severity: 'ERROR' })
      }
    }

    // Status validation
    const validStatuses = ['IN_PROGRESS', 'DONE', 'MERGED', 'PAUSED', 'CANCELLED']
    if (t.status && !validStatuses.includes(t.status as string)) {
      errors.push({ field: 'status', message: `Invalid status: ${t.status}`, severity: 'ERROR' })
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings: [],
      statistics: {
        totalChecked: requiredFields.length,
        passed: requiredFields.length - errors.length,
        failed: errors.length,
        skipped: 0,
      },
    }
  }

  /**
   * Validate environment structure
   */
  private validateEnvironment(env: unknown, index: number): ValidationResult {
    const errors: any[] = []

    if (!env || typeof env !== 'object') {
      return {
        valid: false,
        errors: [{ field: 'root', message: 'Environment must be an object', severity: 'ERROR' }],
        warnings: [],
        statistics: { totalChecked: 1, passed: 0, failed: 1, skipped: 0 },
      }
    }

    const e = env as Record<string, unknown>

    // Required fields
    const requiredFields = ['id', 'name', 'createdAt', 'updatedAt']
    for (const field of requiredFields) {
      if (!(field in e) || e[field] === null || e[field] === undefined) {
        errors.push({ field, message: `Missing required field: ${field}`, severity: 'ERROR' })
      }
    }

    // Type validations
    if (typeof e.id !== 'string') {
      errors.push({ field: 'id', message: 'ID must be a string', severity: 'ERROR' })
    }

    if (typeof e.name !== 'string') {
      errors.push({ field: 'name', message: 'Name must be a string', severity: 'ERROR' })
    }

    // Date validations (can be Date object or ISO string)
    if (e.createdAt) {
      if (typeof e.createdAt === 'string' && isNaN(Date.parse(e.createdAt))) {
        errors.push({ field: 'createdAt', message: 'Invalid date format', severity: 'ERROR' })
      } else if (!(e.createdAt instanceof Date) && typeof e.createdAt !== 'string') {
        errors.push({
          field: 'createdAt',
          message: 'Date must be Date object or ISO string',
          severity: 'ERROR',
        })
      }
    }

    if (e.updatedAt) {
      if (typeof e.updatedAt === 'string' && isNaN(Date.parse(e.updatedAt))) {
        errors.push({ field: 'updatedAt', message: 'Invalid date format', severity: 'ERROR' })
      } else if (!(e.updatedAt instanceof Date) && typeof e.updatedAt !== 'string') {
        errors.push({
          field: 'updatedAt',
          message: 'Date must be Date object or ISO string',
          severity: 'ERROR',
        })
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings: [],
      statistics: {
        totalChecked: requiredFields.length,
        passed: requiredFields.length - errors.length,
        failed: errors.length,
        skipped: 0,
      },
    }
  }

  /**
   * Clear all extracted data from localStorage (use with caution)
   */
  async clearExtractedData(confirmationCode: string): Promise<boolean> {
    if (confirmationCode !== 'CONFIRM_CLEAR_LOCALSTORAGE') {
      throw new Error('Invalid confirmation code')
    }

    try {
      // Only clear known keys to avoid deleting other application data
      for (const key of this.knownKeys) {
        localStorage.removeItem(key)
      }
      return true
    } catch (error) {
      console.error('Failed to clear localStorage:', error)
      return false
    }
  }
}

export const dataExtractor = DataExtractor.getInstance()
