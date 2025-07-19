/**
 * Enhanced Data Extractor
 *
 * Advanced extraction with better pattern matching and normalization.
 */

import type { LocalStorageData, LocalStorageEnvironment, LocalStorageTask } from './types'

export interface ExtractionOptions {
  includeFormData: boolean
  includeDrafts: boolean
  includeMetadata: boolean
  parseNestedJson: boolean
  deepScan: boolean
  preserveOriginal: boolean
}

export interface ExtractionResult {
  data: LocalStorageData
  metadata: {
    extractedAt: Date
    itemCounts: Record<string, number>
    errors: string[]
    warnings: string[]
    skipped: string[]
  }
  analysis: {
    structure: Record<string, any>
    patterns: string[]
    recommendations: string[]
  }
}

export class EnhancedDataExtractor {
  private readonly defaultOptions: ExtractionOptions = {
    includeFormData: true,
    includeDrafts: true,
    includeMetadata: true,
    parseNestedJson: true,
    deepScan: true,
    preserveOriginal: false,
  }

  /**
   * Extract all relevant data from localStorage with advanced pattern matching
   */
  extract(options?: Partial<ExtractionOptions>): ExtractionResult {
    const opts = { ...this.defaultOptions, ...options }
    const errors: string[] = []
    const warnings: string[] = []
    const skipped: string[] = []
    const itemCounts: Record<string, number> = {}

    const data: LocalStorageData = {}
    const structure: Record<string, any> = {}
    const patterns: string[] = []

    // Deep scan localStorage structure
    if (opts.deepScan) {
      const scanResult = this.deepScanLocalStorage()
      structure.scan = scanResult
      patterns.push(...scanResult.detectedPatterns)
    }

    // Extract tasks with multiple detection strategies
    try {
      const tasks = this.extractTasksAdvanced(opts)
      if (tasks.length > 0) {
        data.tasks = tasks
        itemCounts.tasks = tasks.length
      }
    } catch (error) {
      errors.push(`Failed to extract tasks: ${error.message}`)
    }

    // Extract environments with fallbacks
    try {
      const environments = this.extractEnvironmentsAdvanced(opts)
      if (environments.length > 0) {
        data.environments = environments
        itemCounts.environments = environments.length
      }
    } catch (error) {
      errors.push(`Failed to extract environments: ${error.message}`)
    }

    // Extract form data with pattern matching
    if (opts.includeFormData) {
      try {
        const formData = this.extractFormDataAdvanced(opts)
        if (formData && Object.keys(formData).length > 0) {
          data.formData = formData
          itemCounts.formData = Object.keys(formData).length
        }
      } catch (error) {
        errors.push(`Failed to extract form data: ${error.message}`)
      }
    }

    // Generate recommendations
    const recommendations = this.generateRecommendations(data, structure)

    return {
      data,
      metadata: {
        extractedAt: new Date(),
        itemCounts,
        errors,
        warnings,
        skipped,
      },
      analysis: {
        structure,
        patterns,
        recommendations,
      },
    }
  }

  /**
   * Deep scan localStorage to understand structure
   */
  private deepScanLocalStorage(): {
    totalKeys: number
    keyPatterns: Record<string, string[]>
    dataSizes: Record<string, number>
    dataTypes: Record<string, string>
    detectedPatterns: string[]
  } {
    const keyPatterns: Record<string, string[]> = {
      zustand: [],
      redux: [],
      form: [],
      cache: [],
      session: [],
      other: [],
    }
    const dataSizes: Record<string, number> = {}
    const dataTypes: Record<string, string> = {}
    const detectedPatterns: string[] = []

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (!key) continue

      const value = localStorage.getItem(key)
      if (!value) continue

      // Analyze size
      dataSizes[key] = new Blob([value]).size

      // Detect data type and structure
      try {
        const parsed = JSON.parse(value)
        dataTypes[key] = 'json'

        // Detect storage patterns
        if (parsed.state && parsed.version !== undefined) {
          keyPatterns.zustand.push(key)
          detectedPatterns.push('zustand-persist')
        } else if (parsed.type && parsed.payload) {
          keyPatterns.redux.push(key)
          detectedPatterns.push('redux-persist')
        } else if (key.match(/form|draft|temp/i)) {
          keyPatterns.form.push(key)
          detectedPatterns.push('form-data')
        } else if (key.match(/cache|cached/i)) {
          keyPatterns.cache.push(key)
          detectedPatterns.push('cache-data')
        } else if (key.match(/session|auth|user/i)) {
          keyPatterns.session.push(key)
          detectedPatterns.push('session-data')
        } else {
          keyPatterns.other.push(key)
        }
      } catch {
        dataTypes[key] = 'string'
        keyPatterns.other.push(key)
      }
    }

    return {
      totalKeys: localStorage.length,
      keyPatterns,
      dataSizes,
      dataTypes,
      detectedPatterns: [...new Set(detectedPatterns)],
    }
  }

  /**
   * Extract tasks with advanced detection
   */
  private extractTasksAdvanced(options: ExtractionOptions): LocalStorageTask[] {
    const tasks: LocalStorageTask[] = []
    const possibleKeys = ['task-store', 'tasks', 'taskStore', 'task-data']

    // Try known keys first
    for (const key of possibleKeys) {
      const data = localStorage.getItem(key)
      if (data) {
        const extracted = this.parseTaskData(data, options)
        if (extracted.length > 0) {
          tasks.push(...extracted)
        }
      }
    }

    // Deep scan if enabled and no tasks found
    if (options.deepScan && tasks.length === 0) {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (!key || possibleKeys.includes(key)) continue

        if (key.toLowerCase().includes('task')) {
          const data = localStorage.getItem(key)
          if (data) {
            const extracted = this.parseTaskData(data, options)
            if (extracted.length > 0) {
              tasks.push(...extracted)
            }
          }
        }
      }
    }

    // Deduplicate by ID
    const uniqueTasks = new Map<string, LocalStorageTask>()
    for (const task of tasks) {
      if (!uniqueTasks.has(task.id) || this.isMoreComplete(task, uniqueTasks.get(task.id)!)) {
        uniqueTasks.set(task.id, task)
      }
    }

    return Array.from(uniqueTasks.values())
  }

  /**
   * Parse task data from various formats
   */
  private parseTaskData(data: string, options: ExtractionOptions): LocalStorageTask[] {
    try {
      const parsed = JSON.parse(data)

      // Handle different storage structures
      const taskArrays = [
        parsed,
        parsed.tasks,
        parsed.state?.tasks,
        parsed.data?.tasks,
        parsed.value?.tasks,
        parsed.payload?.tasks,
      ].filter((arr) => Array.isArray(arr))

      const allTasks: LocalStorageTask[] = []

      for (const taskArray of taskArrays) {
        const validTasks = taskArray
          .filter((task) => this.isValidTask(task))
          .map((task) => this.normalizeTask(task, options))

        allTasks.push(...validTasks)
      }

      return allTasks
    } catch {
      return []
    }
  }

  /**
   * Extract environments with advanced detection
   */
  private extractEnvironmentsAdvanced(options: ExtractionOptions): LocalStorageEnvironment[] {
    const environments: LocalStorageEnvironment[] = []
    const possibleKeys = ['environments', 'envs', 'environment-store', 'env-data']

    // Try known keys first
    for (const key of possibleKeys) {
      const data = localStorage.getItem(key)
      if (data) {
        const extracted = this.parseEnvironmentData(data, options)
        if (extracted.length > 0) {
          environments.push(...extracted)
        }
      }
    }

    // Deep scan if enabled
    if (options.deepScan && environments.length === 0) {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (!key || possibleKeys.includes(key)) continue

        if (key.toLowerCase().includes('env')) {
          const data = localStorage.getItem(key)
          if (data) {
            const extracted = this.parseEnvironmentData(data, options)
            if (extracted.length > 0) {
              environments.push(...extracted)
            }
          }
        }
      }
    }

    // Deduplicate by ID
    const uniqueEnvs = new Map<string, LocalStorageEnvironment>()
    for (const env of environments) {
      if (!uniqueEnvs.has(env.id) || this.isMoreComplete(env, uniqueEnvs.get(env.id)!)) {
        uniqueEnvs.set(env.id, env)
      }
    }

    return Array.from(uniqueEnvs.values())
  }

  /**
   * Parse environment data from various formats
   */
  private parseEnvironmentData(
    data: string,
    options: ExtractionOptions
  ): LocalStorageEnvironment[] {
    try {
      const parsed = JSON.parse(data)

      const envArrays = [
        parsed,
        parsed.environments,
        parsed.state?.environments,
        parsed.data?.environments,
        parsed.value?.environments,
      ].filter((arr) => Array.isArray(arr))

      const allEnvs: LocalStorageEnvironment[] = []

      for (const envArray of envArrays) {
        const validEnvs = envArray
          .filter((env) => this.isValidEnvironment(env))
          .map((env) => this.normalizeEnvironment(env, options))

        allEnvs.push(...validEnvs)
      }

      return allEnvs
    } catch {
      return []
    }
  }

  /**
   * Extract form data with advanced pattern matching
   */
  private extractFormDataAdvanced(options: ExtractionOptions): Record<string, unknown> | undefined {
    const formData: Record<string, unknown> = {}
    const formPatterns = [
      /^form[-_]/,
      /^draft[-_]/,
      /^temp[-_]/,
      /^autosave[-_]/,
      /[-_]form$/,
      /[-_]draft$/,
      /[-_]data$/,
      /^formik/,
      /^react-hook-form/,
    ]

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (!key) continue

      // Check if key matches form patterns
      const isFormData = formPatterns.some((pattern) => pattern.test(key))
      const looksLikeForm =
        key.toLowerCase().includes('form') ||
        key.toLowerCase().includes('draft') ||
        key.toLowerCase().includes('input')

      if (isFormData || (options.deepScan && looksLikeForm)) {
        try {
          const value = localStorage.getItem(key)
          if (!value) continue

          // Try to parse and validate
          if (options.parseNestedJson) {
            try {
              const parsed = JSON.parse(value)

              // Check if it looks like form data
              if (this.looksLikeFormData(parsed)) {
                formData[key] = options.preserveOriginal ? { original: value, parsed } : parsed
              }
            } catch {
              // Keep as string if it can't be parsed
              if (options.includeDrafts || value.length > 10) {
                formData[key] = value
              }
            }
          } else {
            formData[key] = value
          }
        } catch (error) {
          console.warn(`Failed to extract form data for key ${key}:`, error)
        }
      }
    }

    return Object.keys(formData).length > 0 ? formData : undefined
  }

  /**
   * Validate task structure
   */
  private isValidTask(task: any): boolean {
    return (
      task &&
      typeof task === 'object' &&
      typeof task.id === 'string' &&
      (typeof task.title === 'string' || typeof task.name === 'string')
    )
  }

  /**
   * Validate environment structure
   */
  private isValidEnvironment(env: any): boolean {
    return (
      env && typeof env === 'object' && typeof env.id === 'string' && typeof env.name === 'string'
    )
  }

  /**
   * Check if object looks like form data
   */
  private looksLikeFormData(obj: any): boolean {
    if (!obj || typeof obj !== 'object') return false

    // Common form data patterns
    const formIndicators = [
      'values',
      'errors',
      'touched',
      'fields',
      'firstName',
      'lastName',
      'email',
      'phone',
      'address',
      'username',
      'password',
    ]

    const keys = Object.keys(obj)
    return (
      formIndicators.some((indicator) => keys.includes(indicator)) ||
      (keys.length > 2 && keys.every((k) => typeof k === 'string'))
    )
  }

  /**
   * Normalize task data
   */
  private normalizeTask(task: any, options: ExtractionOptions): LocalStorageTask {
    const normalized: LocalStorageTask = {
      id: task.id,
      title: task.title || task.name || 'Untitled Task',
      description: task.description || task.details || '',
      messages: Array.isArray(task.messages) ? task.messages : [],
      status: this.normalizeTaskStatus(task.status || task.state),
      branch: task.branch || task.gitBranch || '',
      sessionId: task.sessionId || task.session || '',
      repository: task.repository || task.repo || '',
      createdAt: this.normalizeDate(task.createdAt || task.created || task.dateCreated),
      updatedAt: this.normalizeDate(
        task.updatedAt || task.updated || task.lastModified || task.createdAt
      ),
      statusMessage: task.statusMessage || task.message,
      isArchived: Boolean(task.isArchived || task.archived),
      mode: task.mode || 'code',
      hasChanges: Boolean(task.hasChanges || task.modified || task.dirty),
      pullRequest: task.pullRequest || task.pr,
    }

    if (options.preserveOriginal) {
      ;(normalized as any)._original = task
    }

    return normalized
  }

  /**
   * Normalize environment data
   */
  private normalizeEnvironment(env: any, options: ExtractionOptions): LocalStorageEnvironment {
    const normalized: LocalStorageEnvironment = {
      id: env.id,
      name: env.name,
      description: env.description || env.desc || '',
      githubOrganization: env.githubOrganization || env.org || env.organization || '',
      githubToken: env.githubToken || env.token || '',
      githubRepository: env.githubRepository || env.repo || env.repository || '',
      createdAt: this.normalizeDate(env.createdAt || env.created),
      updatedAt: this.normalizeDate(env.updatedAt || env.updated || env.createdAt),
    }

    if (options.preserveOriginal) {
      ;(normalized as any)._original = env
    }

    return normalized
  }

  /**
   * Normalize task status
   */
  private normalizeTaskStatus(status: any): LocalStorageTask['status'] {
    if (!status) return 'IN_PROGRESS'

    const statusMap: Record<string, LocalStorageTask['status']> = {
      in_progress: 'IN_PROGRESS',
      inprogress: 'IN_PROGRESS',
      active: 'IN_PROGRESS',
      doing: 'IN_PROGRESS',
      wip: 'IN_PROGRESS',
      done: 'DONE',
      completed: 'DONE',
      finished: 'DONE',
      merged: 'MERGED',
      paused: 'PAUSED',
      hold: 'PAUSED',
      cancelled: 'CANCELLED',
      canceled: 'CANCELLED',
      stopped: 'CANCELLED',
    }

    const normalized = String(status)
      .toLowerCase()
      .replace(/[^a-z]/g, '')
    return statusMap[normalized] || 'IN_PROGRESS'
  }

  /**
   * Normalize date values
   */
  private normalizeDate(value: any): string {
    if (!value) return new Date().toISOString()

    // Handle various date formats
    const dateValue = (() => {
      if (value instanceof Date) return value
      if (typeof value === 'string') return new Date(value)
      if (typeof value === 'number') return new Date(value)
      if (value.$date) return new Date(value.$date) // MongoDB format
      if (value.toDate && typeof value.toDate === 'function') return value.toDate() // Firestore
      return new Date()
    })()

    return isNaN(dateValue.getTime()) ? new Date().toISOString() : dateValue.toISOString()
  }

  /**
   * Check if one object is more complete than another
   */
  private isMoreComplete(obj1: any, obj2: any): boolean {
    const keys1 = Object.keys(obj1).filter((k) => obj1[k] !== null && obj1[k] !== undefined)
    const keys2 = Object.keys(obj2).filter((k) => obj2[k] !== null && obj2[k] !== undefined)
    return keys1.length > keys2.length
  }

  /**
   * Generate migration recommendations
   */
  private generateRecommendations(data: LocalStorageData, structure: any): string[] {
    const recommendations: string[] = []

    // Check data size
    const totalSize = Object.values(structure.scan?.dataSizes || {}).reduce(
      (sum: number, size: any) => sum + size,
      0
    )

    if (totalSize > 5 * 1024 * 1024) {
      recommendations.push(
        'Large data size detected. Consider cleaning up old data before migration.'
      )
    }

    // Check for duplicate storage patterns
    if (structure.scan?.detectedPatterns.length > 1) {
      recommendations.push(
        'Multiple storage patterns detected. Ensure all data sources are included.'
      )
    }

    // Check for sensitive data
    const sensitivePatterns = ['token', 'password', 'secret', 'key', 'auth']
    const hasSensitive = Object.keys(structure.scan?.keyPatterns || {}).some((key) =>
      sensitivePatterns.some((pattern) => key.toLowerCase().includes(pattern))
    )

    if (hasSensitive) {
      recommendations.push('Sensitive data detected. Ensure proper encryption during migration.')
    }

    // Check task status
    if (data.tasks?.some((t) => t.status === 'IN_PROGRESS')) {
      recommendations.push(
        'Active tasks detected. Consider completing or pausing them before migration.'
      )
    }

    return recommendations
  }
}
