/**
 * Auto-Detection Service
 *
 * Automatically detects existing localStorage data and monitors for changes.
 * Provides real-time detection and notification of migration opportunities.
 */

import { EventEmitter } from 'events'
import type { LocalStorageData } from './types'

export interface DetectionResult {
  hasData: boolean
  dataTypes: string[]
  itemCounts: {
    tasks: number
    environments: number
    formData: number
    total: number
  }
  storageSize: number
  lastModified?: Date
  migrationRequired: boolean
  migrationRecommended: boolean
}

export interface DetectionConfig {
  autoDetect: boolean
  detectionInterval: number // milliseconds
  storageKeys: string[]
  notifyOnDetection: boolean
  minimumItemsForNotification: number
}

export class AutoDetector extends EventEmitter {
  private static instance: AutoDetector
  private detectionInterval?: NodeJS.Timeout
  private lastDetectionResult?: DetectionResult
  private storageObserver?: MutationObserver

  private readonly defaultConfig: DetectionConfig = {
    autoDetect: true,
    detectionInterval: 30_000, // 30 seconds
    storageKeys: ['task-store', 'environments'],
    notifyOnDetection: true,
    minimumItemsForNotification: 1,
  }

  private config: DetectionConfig

  private constructor(config?: Partial<DetectionConfig>) {
    super()
    this.config = { ...this.defaultConfig, ...config }
  }

  static getInstance(config?: Partial<DetectionConfig>): AutoDetector {
    if (!AutoDetector.instance) {
      AutoDetector.instance = new AutoDetector(config)
    }
    return AutoDetector.instance
  }

  /**
   * Start automatic detection
   */
  startDetection(): void {
    if (this.config.autoDetect) {
      // Initial detection
      this.detect()

      // Set up interval detection
      this.detectionInterval = setInterval(() => {
        this.detect()
      }, this.config.detectionInterval)

      // Set up storage observer for real-time detection
      this.setupStorageObserver()
    }
  }

  /**
   * Stop automatic detection
   */
  stopDetection(): void {
    if (this.detectionInterval) {
      clearInterval(this.detectionInterval)
      this.detectionInterval = undefined
    }

    if (this.storageObserver) {
      this.storageObserver.disconnect()
      this.storageObserver = undefined
    }
  }

  /**
   * Perform detection once
   */
  async detect(): Promise<DetectionResult> {
    const result = this.analyzeLocalStorage()

    // Check if migration is required
    result.migrationRequired = result.hasData && !this.isDatabaseSynced()
    result.migrationRecommended = result.itemCounts.total > 0

    // Emit events if significant changes detected
    if (this.shouldNotify(result)) {
      this.emit('dataDetected', result)

      if (result.migrationRequired) {
        this.emit('migrationRequired', result)
      }
    }

    this.lastDetectionResult = result
    return result
  }

  /**
   * Get the last detection result
   */
  getLastDetection(): DetectionResult | undefined {
    return this.lastDetectionResult
  }

  /**
   * Analyze localStorage for relevant data
   */
  private analyzeLocalStorage(): DetectionResult {
    const result: DetectionResult = {
      hasData: false,
      dataTypes: [],
      itemCounts: {
        tasks: 0,
        environments: 0,
        formData: 0,
        total: 0,
      },
      storageSize: 0,
      migrationRequired: false,
      migrationRecommended: false,
    }

    try {
      // Check for tasks
      const taskData = localStorage.getItem('task-store')
      if (taskData) {
        try {
          const parsed = JSON.parse(taskData)
          const tasks = parsed?.state?.tasks || parsed?.tasks || []
          if (Array.isArray(tasks) && tasks.length > 0) {
            result.itemCounts.tasks = tasks.length
            result.dataTypes.push('tasks')
            result.hasData = true
            result.storageSize += new Blob([taskData]).size
          }
        } catch (e) {
          console.warn('Failed to parse task data:', e)
        }
      }

      // Check for environments
      const envData = localStorage.getItem('environments')
      if (envData) {
        try {
          const parsed = JSON.parse(envData)
          const environments = parsed?.state?.environments || parsed?.environments || []
          if (Array.isArray(environments) && environments.length > 0) {
            result.itemCounts.environments = environments.length
            result.dataTypes.push('environments')
            result.hasData = true
            result.storageSize += new Blob([envData]).size
          }
        } catch (e) {
          console.warn('Failed to parse environment data:', e)
        }
      }

      // Check for form data
      const formDataKeys = this.detectFormDataKeys()
      if (formDataKeys.length > 0) {
        result.itemCounts.formData = formDataKeys.length
        result.dataTypes.push('formData')
        result.hasData = true

        formDataKeys.forEach((key) => {
          const value = localStorage.getItem(key)
          if (value) {
            result.storageSize += new Blob([value]).size
          }
        })
      }

      // Calculate total items
      result.itemCounts.total =
        result.itemCounts.tasks + result.itemCounts.environments + result.itemCounts.formData

      // Determine last modified time
      result.lastModified = this.getLastModifiedTime()
    } catch (error) {
      console.error('Error analyzing localStorage:', error)
    }

    return result
  }

  /**
   * Detect form data keys in localStorage
   */
  private detectFormDataKeys(): string[] {
    const formDataKeys: string[] = []

    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && this.isFormDataKey(key)) {
          formDataKeys.push(key)
        }
      }
    } catch (error) {
      console.error('Error detecting form data keys:', error)
    }

    return formDataKeys
  }

  /**
   * Check if a key is likely form data
   */
  private isFormDataKey(key: string): boolean {
    const formDataPatterns = [/^form-/, /^draft-/, /^temp-/, /form/i, /draft/i, /temp/i]

    return formDataPatterns.some((pattern) => pattern.test(key))
  }

  /**
   * Get estimated last modified time
   */
  private getLastModifiedTime(): Date | undefined {
    // This is a simplified implementation
    // In production, you might want to track actual modification times
    try {
      const taskData = localStorage.getItem('task-store')
      if (taskData) {
        const parsed = JSON.parse(taskData)
        const tasks = parsed?.state?.tasks || parsed?.tasks || []
        if (tasks.length > 0) {
          // Find the most recent updated task
          const mostRecent = tasks.reduce((latest: any, task: any) => {
            const taskDate = new Date(task.updatedAt || task.createdAt)
            return taskDate > latest ? taskDate : latest
          }, new Date(0))

          return mostRecent
        }
      }
    } catch (error) {
      console.error('Error getting last modified time:', error)
    }

    return
  }

  /**
   * Check if database is already synced
   */
  private isDatabaseSynced(): boolean {
    // Check for migration completion marker
    const migrationStatus = localStorage.getItem('migration-status')
    if (migrationStatus) {
      try {
        const status = JSON.parse(migrationStatus)
        return status.completed === true
      } catch {
        return false
      }
    }
    return false
  }

  /**
   * Determine if notification should be sent
   */
  private shouldNotify(result: DetectionResult): boolean {
    if (!this.config.notifyOnDetection) {
      return false
    }

    if (result.itemCounts.total < this.config.minimumItemsForNotification) {
      return false
    }

    // Check if result has changed significantly
    if (this.lastDetectionResult) {
      const hasNewData = result.itemCounts.total > this.lastDetectionResult.itemCounts.total
      const hasNewTypes = result.dataTypes.some(
        (type) => !this.lastDetectionResult!.dataTypes.includes(type)
      )

      return hasNewData || hasNewTypes
    }

    return true
  }

  /**
   * Set up storage observer for real-time detection
   */
  private setupStorageObserver(): void {
    if (typeof window === 'undefined') return

    // Listen for storage events
    window.addEventListener('storage', this.handleStorageEvent.bind(this))

    // Also monitor for direct localStorage changes within the same tab
    const originalSetItem = localStorage.setItem
    const originalRemoveItem = localStorage.removeItem
    const originalClear = localStorage.clear

    const handleStorageChange = this.handleLocalStorageChange.bind(this)

    localStorage.setItem = function (key: string, value: string) {
      originalSetItem.apply(this, [key, value])
      handleStorageChange(key, 'set')
    }

    localStorage.removeItem = function (key: string) {
      originalRemoveItem.apply(this, [key])
      handleStorageChange(key, 'remove')
    }

    localStorage.clear = function () {
      originalClear.apply(this)
      handleStorageChange('*', 'clear')
    }
  }

  /**
   * Handle storage events from other tabs
   */
  private handleStorageEvent(event: StorageEvent): void {
    if (event.key && this.isRelevantKey(event.key)) {
      this.emit('storageChanged', {
        key: event.key,
        oldValue: event.oldValue,
        newValue: event.newValue,
      })

      // Debounced detection
      this.debouncedDetect()
    }
  }

  /**
   * Handle localStorage changes within the same tab
   */
  private handleLocalStorageChange(key: string, action: 'set' | 'remove' | 'clear'): void {
    if (action === 'clear' || this.isRelevantKey(key)) {
      this.emit('storageChanged', { key, action })

      // Debounced detection
      this.debouncedDetect()
    }
  }

  /**
   * Check if a storage key is relevant for migration
   */
  private isRelevantKey(key: string): boolean {
    return this.config.storageKeys.includes(key) || this.isFormDataKey(key)
  }

  private detectionDebounceTimer?: NodeJS.Timeout

  /**
   * Debounced detection to avoid excessive checks
   */
  private debouncedDetect(): void {
    if (this.detectionDebounceTimer) {
      clearTimeout(this.detectionDebounceTimer)
    }

    this.detectionDebounceTimer = setTimeout(() => {
      this.detect()
    }, 1000) // 1 second delay
  }

  /**
   * Get storage statistics
   */
  getStorageStats(): {
    totalSize: number
    itemCount: number
    breakdown: Record<string, number>
  } {
    const stats = {
      totalSize: 0,
      itemCount: 0,
      breakdown: {} as Record<string, number>,
    }

    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key) {
          const value = localStorage.getItem(key)
          if (value) {
            const size = new Blob([value]).size
            stats.totalSize += size
            stats.itemCount++
            stats.breakdown[key] = size
          }
        }
      }
    } catch (error) {
      console.error('Error getting storage stats:', error)
    }

    return stats
  }

  /**
   * Estimate migration time based on data size
   */
  estimateMigrationTime(detectionResult?: DetectionResult): number {
    const result = detectionResult || this.lastDetectionResult
    if (!result) return 0

    // Rough estimates (milliseconds)
    const baseTime = 1000 // 1 second base
    const perTaskTime = 50 // 50ms per task
    const perEnvironmentTime = 30 // 30ms per environment
    const perFormDataTime = 20 // 20ms per form data item

    const estimatedTime =
      baseTime +
      result.itemCounts.tasks * perTaskTime +
      result.itemCounts.environments * perEnvironmentTime +
      result.itemCounts.formData * perFormDataTime

    return estimatedTime
  }

  /**
   * Get migration recommendations
   */
  getMigrationRecommendations(detectionResult?: DetectionResult): string[] {
    const result = detectionResult || this.lastDetectionResult
    if (!result) return []

    const recommendations: string[] = []

    if (result.itemCounts.total > 100) {
      recommendations.push('Large dataset detected. Migration may take several minutes.')
    }

    if (result.storageSize > 5 * 1024 * 1024) {
      // 5MB
      recommendations.push('Storage usage is high. Consider cleaning up old data before migration.')
    }

    if (result.dataTypes.includes('formData')) {
      recommendations.push('Form data detected. Review and save any unsaved work before migration.')
    }

    if (result.lastModified) {
      const hoursSinceModified = (Date.now() - result.lastModified.getTime()) / (1000 * 60 * 60)
      if (hoursSinceModified < 1) {
        recommendations.push(
          'Recent activity detected. Ensure all operations are complete before migrating.'
        )
      }
    }

    return recommendations
  }
}

// Export singleton instance
export const autoDetector = AutoDetector.getInstance()
