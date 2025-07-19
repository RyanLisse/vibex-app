/**
 * Migration Utility Functions
 *
 * Helper functions for common migration operations.
 */

import { autoDetector } from './auto-detector'
import { migrationOrchestrator } from './migration-orchestrator'
import { progressTracker } from './progress-tracker'
import type { MigrationConfig, MigrationPlan, MigrationState } from './types'
import { validationService } from './validation-service'

/**
 * Create a migration plan with recommendations
 */
export async function createMigrationPlan(userId: string): Promise<{
  plan: MigrationPlan
  canProceed: boolean
  blockers: string[]
}> {
  const plan = await migrationOrchestrator.planMigration(userId)
  const blockers: string[] = []

  // Check for blockers
  const detection = await autoDetector.detect()

  if (!detection.hasData) {
    blockers.push('No data found to migrate')
  }

  if (detection.storageSize > 50 * 1024 * 1024) {
    // 50MB
    blockers.push('Storage size exceeds safe migration limit')
  }

  // Validate current data
  const validation = await validationService.validateMigration({
    validateSchema: true,
    validateReferences: false,
    strictMode: false,
  })

  if (!validation.valid) {
    blockers.push('Data validation failed: ' + validation.errors[0]?.message)
  }

  return {
    plan,
    canProceed: blockers.length === 0,
    blockers,
  }
}

/**
 * Start migration with default safe settings
 */
export async function startMigration(
  userId: string,
  options?: {
    requireConfirmation?: boolean
    onProgress?: (progress: any) => void
    onError?: (error: any) => void
    onComplete?: (result: any) => void
  }
): Promise<{
  migrationId: string
  cancel: () => Promise<void>
}> {
  const { requireConfirmation = true, onProgress, onError, onComplete } = options || {}

  // Set up event handlers
  if (onProgress) {
    progressTracker.on('progressUpdate', onProgress)
  }

  if (onError) {
    migrationOrchestrator.on('migrationError', onError)
    progressTracker.on('errorAdded', onError)
  }

  if (onComplete) {
    migrationOrchestrator.on('migrationCompleted', onComplete)
  }

  // Create migration plan
  const { plan, canProceed, blockers } = await createMigrationPlan(userId)

  if (!canProceed) {
    throw new Error(`Migration blocked: ${blockers.join(', ')}`)
  }

  // Start migration
  const migrationId = await migrationOrchestrator.startMigration(userId, {
    conflictResolution: 'AUTO_SKIP',
    backupBeforeMigration: true,
    validateAfterMigration: true,
    continueOnError: false,
    batchSize: 100,
    retryAttempts: 3,
    dryRun: false,
  })

  // Return cancel function
  return {
    migrationId,
    cancel: async () => {
      await migrationOrchestrator.stopMigration()

      // Clean up event handlers
      if (onProgress) progressTracker.off('progressUpdate', onProgress)
      if (onError) {
        migrationOrchestrator.off('migrationError', onError)
        progressTracker.off('errorAdded', onError)
      }
      if (onComplete) migrationOrchestrator.off('migrationCompleted', onComplete)
    },
  }
}

/**
 * Check current migration status
 */
export function checkMigrationStatus(): {
  isRunning: boolean
  status: MigrationState['status']
  progress?: {
    percentage: number
    itemsProcessed: number
    totalItems: number
    estimatedTimeRemaining?: number
    errors: number
  }
  canRollback: boolean
} {
  const status = migrationOrchestrator.getMigrationStatus()
  const progress = progressTracker.getCurrentProgress()
  const percentage = progressTracker.getProgressPercentage()
  const metrics = progressTracker.getMetrics()

  return {
    isRunning: status.status === 'RUNNING',
    status: status.status,
    progress: progress
      ? {
          percentage,
          itemsProcessed: progress.processedItems,
          totalItems: progress.totalItems,
          estimatedTimeRemaining: metrics?.estimatedTimeRemaining,
          errors: progress.errors.length,
        }
      : undefined,
    canRollback: status.status !== 'IDLE',
  }
}

/**
 * Format bytes for display
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return Number.parseFloat((bytes / k ** i).toFixed(2)) + ' ' + sizes[i]
}

/**
 * Format duration for display
 */
export function formatDuration(milliseconds: number): string {
  const seconds = Math.floor(milliseconds / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`
  }
  return `${seconds}s`
}

/**
 * Check if localStorage data needs migration
 */
export async function checkIfMigrationNeeded(): Promise<{
  needed: boolean
  itemCount: number
  storageSize: number
  recommendation: string
}> {
  const detection = await autoDetector.detect()

  let recommendation = 'No action needed'

  if (detection.migrationRequired) {
    recommendation = 'Migration required to sync with database'
  } else if (detection.migrationRecommended) {
    recommendation = 'Migration recommended for better performance'
  }

  return {
    needed: detection.migrationRequired || detection.migrationRecommended,
    itemCount: detection.itemCounts.total,
    storageSize: detection.storageSize,
    recommendation,
  }
}

/**
 * Get migration recommendations based on current state
 */
export async function getMigrationRecommendations(): Promise<{
  recommendations: string[]
  estimatedDuration: string
  bestTimeToMigrate: string
}> {
  const detection = await autoDetector.detect()
  const recommendations = autoDetector.getMigrationRecommendations(detection)
  const estimatedTime = autoDetector.estimateMigrationTime(detection)

  // Determine best time to migrate
  let bestTime = 'Now'
  if (detection.lastModified) {
    const hoursSinceModified = (Date.now() - detection.lastModified.getTime()) / (1000 * 60 * 60)
    if (hoursSinceModified < 0.5) {
      bestTime = 'Wait 30 minutes after last activity'
    }
  }

  return {
    recommendations,
    estimatedDuration: formatDuration(estimatedTime),
    bestTimeToMigrate: bestTime,
  }
}

/**
 * Validate migration readiness
 */
export async function validateMigrationReadiness(): Promise<{
  ready: boolean
  issues: string[]
  warnings: string[]
}> {
  const issues: string[] = []
  const warnings: string[] = []

  // Check localStorage accessibility
  try {
    localStorage.setItem('_migration_test', 'test')
    localStorage.removeItem('_migration_test')
  } catch (error) {
    issues.push('localStorage is not accessible')
  }

  // Check data validity
  const validation = await validationService.validateMigration({
    validateSchema: true,
    strictMode: false,
  })

  if (!validation.valid) {
    issues.push(...validation.errors.filter((e) => e.severity === 'ERROR').map((e) => e.message))
    warnings.push(...validation.warnings)
  }

  // Check available storage
  if ('storage' in navigator && 'estimate' in navigator.storage) {
    try {
      const estimate = await navigator.storage.estimate()
      const usagePercent = ((estimate.usage || 0) / (estimate.quota || 1)) * 100

      if (usagePercent > 90) {
        warnings.push('Storage usage is over 90%')
      }
    } catch (error) {
      warnings.push('Could not check storage quota')
    }
  }

  return {
    ready: issues.length === 0,
    issues,
    warnings,
  }
}

/**
 * Get detailed migration statistics
 */
export async function getMigrationStatistics(): Promise<{
  localStorage: {
    tasks: number
    environments: number
    formData: number
    totalSize: string
  }
  database: {
    tasks: number
    environments: number
    syncStatus: 'synced' | 'out-of-sync' | 'unknown'
  }
  migration: {
    lastAttempt?: Date
    lastSuccess?: Date
    totalMigrations: number
  }
}> {
  // Get detection results
  const detection = await autoDetector.detect()

  // Get storage stats
  const storageStats = autoDetector.getStorageStats()

  // Get migration history from localStorage
  const migrationStatus = localStorage.getItem('migration-status')
  const migrationHistory = migrationStatus ? JSON.parse(migrationStatus) : null

  // Compare data
  const comparison = await validationService.compareData()

  return {
    localStorage: {
      tasks: detection.itemCounts.tasks,
      environments: detection.itemCounts.environments,
      formData: detection.itemCounts.formData,
      totalSize: formatBytes(storageStats.totalSize),
    },
    database: {
      tasks:
        comparison.summary.totalDatabase -
        comparison.summary.totalLocal +
        detection.itemCounts.tasks,
      environments:
        comparison.summary.totalDatabase -
        comparison.summary.totalLocal +
        detection.itemCounts.environments,
      syncStatus: comparison.identical ? 'synced' : 'out-of-sync',
    },
    migration: {
      lastAttempt: migrationHistory?.lastAttempt
        ? new Date(migrationHistory.lastAttempt)
        : undefined,
      lastSuccess: migrationHistory?.completedAt
        ? new Date(migrationHistory.completedAt)
        : undefined,
      totalMigrations: migrationHistory?.totalCount || 0,
    },
  }
}
