/**
 * Migration Progress Tracker
 *
 * Tracks and reports migration progress with detailed metrics
 * and estimated completion times.
 */

import { EventEmitter } from 'events'
import type { MigrationProgress, MigrationError } from './types'

export interface ProgressMetrics {
  startTime: Date
  currentTime: Date
  elapsedTime: number
  estimatedTotalTime: number
  estimatedTimeRemaining: number
  averageItemTime: number
  itemsPerSecond: number
  successRate: number
  errorRate: number
}

export interface ProgressSnapshot {
  timestamp: Date
  progress: MigrationProgress
  metrics: ProgressMetrics
  recentErrors: MigrationError[]
  performanceData: {
    cpuUsage?: number
    memoryUsage?: number
    storageUsage?: number
  }
}

export interface ProgressConfig {
  updateInterval: number // milliseconds
  metricsInterval: number // milliseconds
  errorHistoryLimit: number
  enablePerformanceMonitoring: boolean
}

export class ProgressTracker extends EventEmitter {
  private static instance: ProgressTracker
  private currentProgress?: MigrationProgress
  private progressHistory: ProgressSnapshot[] = []
  private startTime?: Date
  private updateInterval?: NodeJS.Timeout
  private metricsInterval?: NodeJS.Timeout
  private itemTimings: number[] = []
  private recentErrors: MigrationError[] = []

  private readonly defaultConfig: ProgressConfig = {
    updateInterval: 1000, // 1 second
    metricsInterval: 5000, // 5 seconds
    errorHistoryLimit: 50,
    enablePerformanceMonitoring: true,
  }

  private config: ProgressConfig

  private constructor(config?: Partial<ProgressConfig>) {
    super()
    this.config = { ...this.defaultConfig, ...config }
  }

  static getInstance(config?: Partial<ProgressConfig>): ProgressTracker {
    if (!ProgressTracker.instance) {
      ProgressTracker.instance = new ProgressTracker(config)
    }
    return ProgressTracker.instance
  }

  /**
   * Start tracking migration progress
   */
  startTracking(initialProgress: MigrationProgress): void {
    this.currentProgress = initialProgress
    this.startTime = new Date()
    this.progressHistory = []
    this.itemTimings = []
    this.recentErrors = []

    // Start update interval
    this.updateInterval = setInterval(() => {
      this.updateProgress()
    }, this.config.updateInterval)

    // Start metrics interval
    this.metricsInterval = setInterval(() => {
      this.calculateMetrics()
    }, this.config.metricsInterval)

    this.emit('trackingStarted', { progress: initialProgress })
  }

  /**
   * Stop tracking
   */
  stopTracking(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval)
      this.updateInterval = undefined
    }

    if (this.metricsInterval) {
      clearInterval(this.metricsInterval)
      this.metricsInterval = undefined
    }

    this.emit('trackingStopped')
  }

  /**
   * Update progress
   */
  updateProgress(update?: Partial<MigrationProgress>): void {
    if (!this.currentProgress) return

    // Update progress
    if (update) {
      this.currentProgress = {
        ...this.currentProgress,
        ...update,
      }

      // Track errors
      if (update.errors) {
        this.recentErrors.push(...update.errors)
        if (this.recentErrors.length > this.config.errorHistoryLimit) {
          this.recentErrors = this.recentErrors.slice(-this.config.errorHistoryLimit)
        }
      }
    }

    // Calculate estimated time remaining
    if (this.currentProgress.processedItems > 0) {
      const elapsedTime = Date.now() - this.startTime!.getTime()
      const avgTimePerItem = elapsedTime / this.currentProgress.processedItems
      const remainingItems = this.currentProgress.totalItems - this.currentProgress.processedItems
      this.currentProgress.estimatedTimeRemaining = Math.round(avgTimePerItem * remainingItems)
    }

    // Create snapshot
    const snapshot = this.createSnapshot()
    this.progressHistory.push(snapshot)

    // Emit update event
    this.emit('progressUpdate', snapshot)

    // Check for completion
    if (this.currentProgress.processedItems >= this.currentProgress.totalItems) {
      this.handleCompletion()
    }
  }

  /**
   * Record item processing time
   */
  recordItemTiming(duration: number): void {
    this.itemTimings.push(duration)

    // Keep only recent timings (last 100)
    if (this.itemTimings.length > 100) {
      this.itemTimings = this.itemTimings.slice(-100)
    }
  }

  /**
   * Update current stage
   */
  updateStage(stage: MigrationProgress['stage'], currentItem?: string): void {
    this.updateProgress({
      stage,
      currentItem,
    })

    this.emit('stageChanged', { stage, currentItem })
  }

  /**
   * Add error
   */
  addError(error: MigrationError): void {
    if (!this.currentProgress) return

    this.currentProgress.errors.push(error)
    this.recentErrors.push(error)

    if (this.recentErrors.length > this.config.errorHistoryLimit) {
      this.recentErrors = this.recentErrors.slice(-this.config.errorHistoryLimit)
    }

    this.emit('errorAdded', error)
  }

  /**
   * Add warning
   */
  addWarning(warning: string): void {
    if (!this.currentProgress) return

    this.currentProgress.warnings.push(warning)
    this.emit('warningAdded', warning)
  }

  /**
   * Increment processed items
   */
  incrementProcessed(count: number = 1): void {
    if (!this.currentProgress) return

    this.updateProgress({
      processedItems: this.currentProgress.processedItems + count,
    })
  }

  /**
   * Get current progress
   */
  getCurrentProgress(): MigrationProgress | undefined {
    return this.currentProgress
  }

  /**
   * Get progress metrics
   */
  getMetrics(): ProgressMetrics | undefined {
    if (!this.currentProgress || !this.startTime) return undefined

    return this.calculateCurrentMetrics()
  }

  /**
   * Get progress percentage
   */
  getProgressPercentage(): number {
    if (!this.currentProgress || this.currentProgress.totalItems === 0) return 0

    return Math.round((this.currentProgress.processedItems / this.currentProgress.totalItems) * 100)
  }

  /**
   * Get estimated completion time
   */
  getEstimatedCompletionTime(): Date | undefined {
    const metrics = this.getMetrics()
    if (!metrics || !metrics.estimatedTimeRemaining) return undefined

    return new Date(Date.now() + metrics.estimatedTimeRemaining)
  }

  /**
   * Create progress snapshot
   */
  private createSnapshot(): ProgressSnapshot {
    const metrics = this.calculateCurrentMetrics()
    const performanceData = this.config.enablePerformanceMonitoring ? this.getPerformanceData() : {}

    return {
      timestamp: new Date(),
      progress: { ...this.currentProgress! },
      metrics,
      recentErrors: [...this.recentErrors],
      performanceData,
    }
  }

  /**
   * Calculate current metrics
   */
  private calculateCurrentMetrics(): ProgressMetrics {
    const currentTime = new Date()
    const elapsedTime = currentTime.getTime() - this.startTime!.getTime()
    const processedItems = this.currentProgress!.processedItems || 0
    const totalItems = this.currentProgress!.totalItems || 1

    // Calculate average time per item
    const averageItemTime = processedItems > 0 ? elapsedTime / processedItems : 0

    // Calculate items per second
    const itemsPerSecond = elapsedTime > 0 ? (processedItems * 1000) / elapsedTime : 0

    // Calculate estimated times
    const estimatedTotalTime = averageItemTime * totalItems
    const estimatedTimeRemaining = estimatedTotalTime - elapsedTime

    // Calculate success/error rates
    const successRate =
      processedItems > 0
        ? ((processedItems - this.currentProgress!.errors.length) / processedItems) * 100
        : 100
    const errorRate = 100 - successRate

    return {
      startTime: this.startTime!,
      currentTime,
      elapsedTime,
      estimatedTotalTime,
      estimatedTimeRemaining: Math.max(0, estimatedTimeRemaining),
      averageItemTime,
      itemsPerSecond,
      successRate,
      errorRate,
    }
  }

  /**
   * Calculate metrics (called by interval)
   */
  private calculateMetrics(): void {
    if (!this.currentProgress) return

    const metrics = this.calculateCurrentMetrics()
    this.emit('metricsUpdate', metrics)

    // Check for performance issues
    if (metrics.itemsPerSecond < 1 && this.currentProgress.processedItems > 10) {
      this.emit('performanceWarning', {
        message: 'Migration is running slowly',
        itemsPerSecond: metrics.itemsPerSecond,
      })
    }

    if (metrics.errorRate > 10) {
      this.emit('errorRateWarning', {
        message: 'High error rate detected',
        errorRate: metrics.errorRate,
      })
    }
  }

  /**
   * Get performance data
   */
  private getPerformanceData(): ProgressSnapshot['performanceData'] {
    // In a real implementation, you would gather actual performance metrics
    // For now, returning mock data
    return {
      cpuUsage: Math.random() * 100,
      memoryUsage: Math.random() * 100,
      storageUsage: Math.random() * 100,
    }
  }

  /**
   * Handle completion
   */
  private handleCompletion(): void {
    const finalMetrics = this.calculateCurrentMetrics()

    this.emit('completed', {
      progress: this.currentProgress,
      metrics: finalMetrics,
      summary: this.generateSummary(),
    })

    this.stopTracking()
  }

  /**
   * Generate progress summary
   */
  generateSummary(): string {
    if (!this.currentProgress || !this.startTime) {
      return 'No migration in progress'
    }

    const metrics = this.calculateCurrentMetrics()
    const percentage = this.getProgressPercentage()

    return `
Migration Progress Summary
========================
Stage: ${this.currentProgress.stage}
Progress: ${this.currentProgress.processedItems}/${this.currentProgress.totalItems} (${percentage}%)
Elapsed Time: ${this.formatDuration(metrics.elapsedTime)}
Estimated Time Remaining: ${this.formatDuration(metrics.estimatedTimeRemaining)}
Average Speed: ${metrics.itemsPerSecond.toFixed(2)} items/second
Success Rate: ${metrics.successRate.toFixed(1)}%
Errors: ${this.currentProgress.errors.length}
Warnings: ${this.currentProgress.warnings.length}
`
  }

  /**
   * Format duration for display
   */
  private formatDuration(milliseconds: number): string {
    const seconds = Math.floor(milliseconds / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`
    } else {
      return `${seconds}s`
    }
  }

  /**
   * Get progress history
   */
  getProgressHistory(): ProgressSnapshot[] {
    return [...this.progressHistory]
  }

  /**
   * Get recent errors
   */
  getRecentErrors(): MigrationError[] {
    return [...this.recentErrors]
  }

  /**
   * Export progress data for analysis
   */
  exportProgressData(): {
    summary: ReturnType<typeof this.generateSummary>
    history: ProgressSnapshot[]
    errors: MigrationError[]
    timings: number[]
  } {
    return {
      summary: this.generateSummary(),
      history: this.getProgressHistory(),
      errors: this.getRecentErrors(),
      timings: [...this.itemTimings],
    }
  }

  /**
   * Generate progress chart data
   */
  getChartData(): {
    labels: string[]
    processed: number[]
    errors: number[]
    speed: number[]
  } {
    const labels: string[] = []
    const processed: number[] = []
    const errors: number[] = []
    const speed: number[] = []

    this.progressHistory.forEach((snapshot, index) => {
      if (index % 5 === 0) {
        // Sample every 5th snapshot for chart
        labels.push(snapshot.timestamp.toLocaleTimeString())
        processed.push(snapshot.progress.processedItems)
        errors.push(snapshot.progress.errors.length)
        speed.push(snapshot.metrics.itemsPerSecond)
      }
    })

    return { labels, processed, errors, speed }
  }
}

// Export singleton instance
export const progressTracker = ProgressTracker.getInstance()
