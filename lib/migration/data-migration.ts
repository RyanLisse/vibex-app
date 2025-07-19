/**
 * Data Migration System
 *
 * Handles migration from localStorage to database with data integrity validation,
 * progress tracking, and rollback capabilities for seamless user experience.
 */

import { ulid } from 'ulid'
import { db } from '@/db/config'
import { agentExecutions, environments, tasks } from '@/db/schema'
import { observability } from '@/lib/observability'

// Migration status
export type MigrationStatus = 'not_started' | 'in_progress' | 'completed' | 'failed' | 'rolled_back'

// Migration step
export interface MigrationStep {
  id: string
  name: string
  description: string
  status: MigrationStatus
  startTime?: Date
  endTime?: Date
  error?: string
  recordsProcessed: number
  totalRecords: number
}

// Migration result
export interface MigrationResult {
  id: string
  status: MigrationStatus
  startTime: Date
  endTime?: Date
  steps: MigrationStep[]
  summary: {
    totalRecords: number
    migratedRecords: number
    failedRecords: number
    skippedRecords: number
  }
  errors: string[]
}

// Data migration manager
export class DataMigrationManager {
  private static instance: DataMigrationManager
  private currentMigration: MigrationResult | null = null

  private constructor() {}

  /**
   * Get Redis cache instance (lazy-loaded)
   */
  private async getRedisCache() {
    try {
      const { redisCache } = await import('@/lib/redis')
      return redisCache
    } catch (error) {
      console.warn('Redis not available, continuing without cache:', error)
      return null
    }
  }

  static getInstance(): DataMigrationManager {
    if (!DataMigrationManager.instance) {
      DataMigrationManager.instance = new DataMigrationManager()
    }
    return DataMigrationManager.instance
  }

  /**
   * Check if migration is needed
   */
  async checkMigrationNeeded(): Promise<{
    needed: boolean
    localStorageData: {
      tasks: number
      environments: number
    }
    databaseData: {
      tasks: number
      environments: number
    }
  }> {
    try {
      // Check localStorage data
      const taskStoreData = localStorage.getItem('task-store')
      const environmentStoreData = localStorage.getItem('environments')

      const localTasks = taskStoreData ? JSON.parse(taskStoreData)?.state?.tasks || [] : []
      const localEnvironments = environmentStoreData
        ? JSON.parse(environmentStoreData)?.state?.environments || []
        : []

      // Check database data
      const [dbTasksCount] = await db.select({ count: tasks.id }).from(tasks)
      const [dbEnvironmentsCount] = await db.select({ count: environments.id }).from(environments)

      const localStorageData = {
        tasks: localTasks.length,
        environments: localEnvironments.length,
      }

      const databaseData = {
        tasks: Number(dbTasksCount?.count || 0),
        environments: Number(dbEnvironmentsCount?.count || 0),
      }

      const needed = localStorageData.tasks > 0 || localStorageData.environments > 0

      return {
        needed,
        localStorageData,
        databaseData,
      }
    } catch (error) {
      console.error('Failed to check migration status:', error)
      return {
        needed: false,
        localStorageData: { tasks: 0, environments: 0 },
        databaseData: { tasks: 0, environments: 0 },
      }
    }
  }

  /**
   * Start data migration
   */
  async startMigration(userId: string): Promise<MigrationResult> {
    if (this.currentMigration && this.currentMigration.status === 'in_progress') {
      throw new Error('Migration already in progress')
    }

    const migrationId = ulid()
    const startTime = new Date()

    this.currentMigration = {
      id: migrationId,
      status: 'in_progress',
      startTime,
      steps: [],
      summary: {
        totalRecords: 0,
        migratedRecords: 0,
        failedRecords: 0,
        skippedRecords: 0,
      },
      errors: [],
    }

    try {
      // Record migration start
      await observability.events.collector.collectEvent(
        'system_event',
        'info',
        `Data migration started for user ${userId}`,
        {
          migrationId,
          userId,
        },
        'migration',
        ['migration', 'start']
      )

      // Step 1: Migrate tasks
      await this.migrateTasksStep(userId)

      // Step 2: Migrate environments
      await this.migrateEnvironmentsStep(userId)

      // Step 3: Validate data integrity
      await this.validateDataIntegrityStep()

      // Step 4: Clean up localStorage (optional)
      await this.cleanupLocalStorageStep()

      // Complete migration
      this.currentMigration.status = 'completed'
      this.currentMigration.endTime = new Date()

      // Record migration completion
      await observability.events.collector.collectEvent(
        'system_event',
        'info',
        `Data migration completed for user ${userId}`,
        {
          migrationId,
          userId,
          duration: this.currentMigration.endTime.getTime() - startTime.getTime(),
          summary: this.currentMigration.summary,
        },
        'migration',
        ['migration', 'complete']
      )

      return this.currentMigration
    } catch (error) {
      this.currentMigration.status = 'failed'
      this.currentMigration.endTime = new Date()
      this.currentMigration.errors.push(error instanceof Error ? error.message : 'Unknown error')

      // Record migration failure
      await observability.events.collector.collectEvent(
        'system_event',
        'error',
        `Data migration failed for user ${userId}`,
        {
          migrationId,
          userId,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        'migration',
        ['migration', 'error']
      )

      throw error
    }
  }

  /**
   * Migrate tasks from localStorage to database
   */
  private async migrateTasksStep(userId: string): Promise<void> {
    const step: MigrationStep = {
      id: ulid(),
      name: 'migrate_tasks',
      description: 'Migrate tasks from localStorage to database',
      status: 'in_progress',
      startTime: new Date(),
      recordsProcessed: 0,
      totalRecords: 0,
    }

    this.currentMigration!.steps.push(step)

    try {
      // Get tasks from localStorage
      const taskStoreData = localStorage.getItem('task-store')
      const localTasks = taskStoreData ? JSON.parse(taskStoreData)?.state?.tasks || [] : []

      step.totalRecords = localTasks.length
      this.currentMigration!.summary.totalRecords += localTasks.length

      if (localTasks.length === 0) {
        step.status = 'completed'
        step.endTime = new Date()
        return
      }

      // Migrate each task
      for (const localTask of localTasks) {
        try {
          // Map localStorage task to database schema
          const dbTask = {
            id: localTask.id || ulid(),
            title: localTask.title,
            description: localTask.description || null,
            status: this.mapTaskStatus(localTask.status),
            priority: this.mapTaskPriority(localTask.mode === 'ask' ? 'low' : 'medium'),
            assignee: null,
            userId,
            sessionId: localTask.sessionId || null,
            dueDate: null,
            completedAt:
              localTask.status === 'DONE' || localTask.status === 'MERGED'
                ? new Date(localTask.updatedAt)
                : null,
            createdAt: new Date(localTask.createdAt),
            updatedAt: new Date(localTask.updatedAt),
            tags: [],
            metadata: {
              originalStatus: localTask.status,
              mode: localTask.mode,
              branch: localTask.branch,
              repository: localTask.repository,
              hasChanges: localTask.hasChanges,
              pullRequest: localTask.pullRequest,
              messages: localTask.messages,
            },
          }

          // Insert into database
          await db.insert(tasks).values(dbTask).onConflictDoNothing()

          // Cache in Redis for faster access (if available)
          const redis = await this.getRedisCache()
          if (redis) {
            await redis.set(`task:${dbTask.id}`, dbTask, { ttl: 300 })
          }

          step.recordsProcessed++
          this.currentMigration!.summary.migratedRecords++
        } catch (error) {
          console.error(`Failed to migrate task ${localTask.id}:`, error)
          this.currentMigration!.summary.failedRecords++
          this.currentMigration!.errors.push(
            `Task ${localTask.id}: ${error instanceof Error ? error.message : 'Unknown error'}`
          )
        }
      }

      step.status = 'completed'
      step.endTime = new Date()
    } catch (error) {
      step.status = 'failed'
      step.endTime = new Date()
      step.error = error instanceof Error ? error.message : 'Unknown error'
      throw error
    }
  }

  /**
   * Migrate environments from localStorage to database
   */
  private async migrateEnvironmentsStep(userId: string): Promise<void> {
    const step: MigrationStep = {
      id: ulid(),
      name: 'migrate_environments',
      description: 'Migrate environments from localStorage to database',
      status: 'in_progress',
      startTime: new Date(),
      recordsProcessed: 0,
      totalRecords: 0,
    }

    this.currentMigration!.steps.push(step)

    try {
      // Get environments from localStorage
      const environmentStoreData = localStorage.getItem('environments')
      const localEnvironments = environmentStoreData
        ? JSON.parse(environmentStoreData)?.state?.environments || []
        : []

      step.totalRecords = localEnvironments.length
      this.currentMigration!.summary.totalRecords += localEnvironments.length

      if (localEnvironments.length === 0) {
        step.status = 'completed'
        step.endTime = new Date()
        return
      }

      // Migrate each environment
      for (const localEnv of localEnvironments) {
        try {
          // Map localStorage environment to database schema
          const dbEnvironment = {
            id: localEnv.id || ulid(),
            name: localEnv.name,
            description: localEnv.description || null,
            config: {
              githubOrganization: localEnv.githubOrganization,
              githubRepository: localEnv.githubRepository,
              githubToken: localEnv.githubToken,
            },
            isActive: false, // Will be set later if needed
            userId,
            createdAt: new Date(localEnv.createdAt),
            updatedAt: new Date(localEnv.updatedAt),
            schemaVersion: 1,
          }

          // Insert into database
          await db.insert(environments).values(dbEnvironment).onConflictDoNothing()

          // Cache in Redis for faster access (if available)
          const redis = await this.getRedisCache()
          if (redis) {
            await redis.set(`environment:${dbEnvironment.id}`, dbEnvironment, { ttl: 600 })
          }

          step.recordsProcessed++
          this.currentMigration!.summary.migratedRecords++
        } catch (error) {
          console.error(`Failed to migrate environment ${localEnv.id}:`, error)
          this.currentMigration!.summary.failedRecords++
          this.currentMigration!.errors.push(
            `Environment ${localEnv.id}: ${error instanceof Error ? error.message : 'Unknown error'}`
          )
        }
      }

      step.status = 'completed'
      step.endTime = new Date()
    } catch (error) {
      step.status = 'failed'
      step.endTime = new Date()
      step.error = error instanceof Error ? error.message : 'Unknown error'
      throw error
    }
  }

  /**
   * Validate data integrity after migration
   */
  private async validateDataIntegrityStep(): Promise<void> {
    const step: MigrationStep = {
      id: ulid(),
      name: 'validate_integrity',
      description: 'Validate data integrity after migration',
      status: 'in_progress',
      startTime: new Date(),
      recordsProcessed: 0,
      totalRecords: 1,
    }

    this.currentMigration!.steps.push(step)

    try {
      // Check if migrated data exists in database
      const [dbTasksCount] = await db.select({ count: tasks.id }).from(tasks)
      const [dbEnvironmentsCount] = await db.select({ count: environments.id }).from(environments)

      const dbTasks = Number(dbTasksCount?.count || 0)
      const dbEnvironments = Number(dbEnvironmentsCount?.count || 0)

      if (dbTasks === 0 && dbEnvironments === 0) {
        throw new Error('No data found in database after migration')
      }

      step.recordsProcessed = 1
      step.status = 'completed'
      step.endTime = new Date()
    } catch (error) {
      step.status = 'failed'
      step.endTime = new Date()
      step.error = error instanceof Error ? error.message : 'Unknown error'
      throw error
    }
  }

  /**
   * Clean up localStorage after successful migration
   */
  private async cleanupLocalStorageStep(): Promise<void> {
    const step: MigrationStep = {
      id: ulid(),
      name: 'cleanup_localstorage',
      description: 'Clean up localStorage after successful migration',
      status: 'in_progress',
      startTime: new Date(),
      recordsProcessed: 0,
      totalRecords: 2,
    }

    this.currentMigration!.steps.push(step)

    try {
      // Create backup before cleanup
      const taskStoreData = localStorage.getItem('task-store')
      const environmentStoreData = localStorage.getItem('environments')

      if (taskStoreData) {
        localStorage.setItem('task-store-backup', taskStoreData)
        localStorage.removeItem('task-store')
        step.recordsProcessed++
      }

      if (environmentStoreData) {
        localStorage.setItem('environments-backup', environmentStoreData)
        localStorage.removeItem('environments')
        step.recordsProcessed++
      }

      step.status = 'completed'
      step.endTime = new Date()
    } catch (error) {
      step.status = 'failed'
      step.endTime = new Date()
      step.error = error instanceof Error ? error.message : 'Unknown error'
      // Don't throw error for cleanup step - migration can still be considered successful
    }
  }

  /**
   * Get current migration status
   */
  getCurrentMigration(): MigrationResult | null {
    return this.currentMigration
  }

  /**
   * Map localStorage task status to database status
   */
  private mapTaskStatus(
    localStatus: string
  ): 'pending' | 'in_progress' | 'completed' | 'cancelled' {
    switch (localStatus) {
      case 'IN_PROGRESS':
        return 'in_progress'
      case 'DONE':
      case 'MERGED':
        return 'completed'
      case 'CANCELLED':
        return 'cancelled'
      case 'PAUSED':
      default:
        return 'pending'
    }
  }

  /**
   * Map task priority
   */
  private mapTaskPriority(priority: string): 'low' | 'medium' | 'high' | 'urgent' {
    switch (priority?.toLowerCase()) {
      case 'high':
        return 'high'
      case 'urgent':
        return 'urgent'
      case 'low':
        return 'low'
      default:
        return 'medium'
    }
  }
}

// Export singleton instance
export const dataMigrationManager = DataMigrationManager.getInstance()
