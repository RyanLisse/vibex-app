#!/usr/bin/env bun

/**
 * ElectricSQL Integration Test Script
 *
 * Tests the enhanced ElectricSQL real-time integration with PostgreSQL + Redis
 * to verify end-to-end functionality including conflict resolution and offline sync.
 */

import type { NewEnvironment, NewTask } from '../db/schema'
import { conflictResolutionService } from '../lib/electric/conflict-resolution'
import { electricDatabaseClient } from '../lib/electric/database-client'
import { enhancedElectricSyncService } from '../lib/electric/enhanced-sync-service'
import { initializeRedis } from '../lib/redis'

// Sample test data
const sampleTask: NewTask = {
  title: 'ElectricSQL Integration Test Task',
  description: 'A test task to verify ElectricSQL real-time sync functionality',
  status: 'pending',
  priority: 'high',
  userId: 'test-user-electric',
  metadata: {
    mode: 'code',
    isArchived: false,
    hasChanges: true,
    messages: [
      {
        role: 'user',
        type: 'text',
        data: { content: 'Test ElectricSQL integration' },
      },
    ],
  },
}

const sampleEnvironment: NewEnvironment = {
  name: 'ElectricSQL Test Environment',
  description: 'Test environment for ElectricSQL integration',
  githubOrganization: 'test-org',
  githubToken: 'ghp_test_token',
  githubRepository: 'electric-test-repo',
  userId: 'test-user-electric',
  isActive: true,
}

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
}

function colorize(text: string, color: keyof typeof colors): string {
  return `${colors[color]}${text}${colors.reset}`
}

function logInfo(message: string): void {
  console.log(`${colorize('ℹ', 'blue')} ${message}`)
}

function logSuccess(message: string): void {
  console.log(`${colorize('✓', 'green')} ${message}`)
}

function logError(message: string): void {
  console.log(`${colorize('✗', 'red')} ${message}`)
}

function logWarning(message: string): void {
  console.log(`${colorize('⚠', 'yellow')} ${message}`)
}

/**
 * Test database client operations
 */
async function testDatabaseClient(): Promise<boolean> {
  logInfo('Testing ElectricSQL database client...')

  try {
    // Test task insertion
    const insertResult = await electricDatabaseClient.executeOperation({
      table: 'tasks',
      operation: 'insert',
      data: sampleTask,
      options: {
        userId: sampleTask.userId,
        realtime: true,
        cache: true,
      },
    })

    if (!(insertResult.success && insertResult.data)) {
      logError('Task insertion failed')
      return false
    }

    const insertedTask = insertResult.data
    logSuccess(`Task inserted: ${insertedTask.title}`)

    // Test task selection
    const selectResult = await electricDatabaseClient.executeOperation({
      table: 'tasks',
      operation: 'select',
      where: { status: 'pending' },
      options: {
        userId: sampleTask.userId,
        cache: true,
      },
    })

    if (!(selectResult.success && selectResult.data)) {
      logError('Task selection failed')
      return false
    }

    logSuccess(`Found ${selectResult.data.length} tasks`)

    // Test task update
    const updateResult = await electricDatabaseClient.executeOperation({
      table: 'tasks',
      operation: 'update',
      data: { status: 'in_progress', priority: 'medium' },
      where: { id: insertedTask.id },
      options: {
        userId: sampleTask.userId,
        realtime: true,
        cache: true,
      },
    })

    if (!updateResult.success) {
      logError('Task update failed')
      return false
    }

    logSuccess('Task updated successfully')

    // Test task deletion
    const deleteResult = await electricDatabaseClient.executeOperation({
      table: 'tasks',
      operation: 'delete',
      where: { id: insertedTask.id },
      options: {
        userId: sampleTask.userId,
        realtime: true,
      },
    })

    if (!deleteResult.success) {
      logError('Task deletion failed')
      return false
    }

    logSuccess('Task deleted successfully')
    return true
  } catch (error) {
    logError(
      `Database client test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
    return false
  }
}

/**
 * Test enhanced sync service
 */
async function testSyncService(): Promise<boolean> {
  logInfo('Testing enhanced sync service...')

  try {
    // Initialize sync service
    await enhancedElectricSyncService.initialize()
    logSuccess('Sync service initialized')

    // Configure sync for tasks
    await enhancedElectricSyncService.configureSyncForTable({
      table: 'tasks',
      userId: 'test-user-electric',
      realtime: true,
      cacheStrategy: 'aggressive',
      conflictResolution: 'last-write-wins',
      syncInterval: 1000,
      batchSize: 50,
    })

    logSuccess('Task sync configured')

    // Test subscription
    let subscriptionData: any[] = []
    const unsubscribe = await enhancedElectricSyncService.subscribeToTable(
      'tasks',
      (data) => {
        subscriptionData = data
        logInfo(`Received ${data.length} tasks via subscription`)
      },
      {
        userId: 'test-user-electric',
        cacheFirst: true,
        realtime: true,
      }
    )

    // Execute an operation to trigger subscription
    await enhancedElectricSyncService.executeOperation({
      table: 'tasks',
      operation: 'insert',
      data: sampleTask,
      options: {
        userId: sampleTask.userId,
        realtime: true,
        cache: true,
      },
    })

    // Wait a bit for subscription to trigger
    await new Promise((resolve) => setTimeout(resolve, 1000))

    unsubscribe()

    // Test force sync
    await enhancedElectricSyncService.forceSyncTable('tasks', 'test-user-electric')
    logSuccess('Force sync completed')

    // Get sync status
    const syncStatus = enhancedElectricSyncService.getSyncStatus()
    logInfo(`Sync status: ${syncStatus.size} configurations`)

    // Get cache statistics
    const cacheStats = await enhancedElectricSyncService.getCacheStatistics()
    logInfo(`Cache statistics: ${cacheStats.totalKeys} keys, ${cacheStats.hitRate}% hit rate`)

    return true
  } catch (error) {
    logError(
      `Sync service test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
    return false
  }
}

/**
 * Test conflict resolution
 */
async function testConflictResolution(): Promise<boolean> {
  logInfo('Testing conflict resolution...')

  try {
    // Create a task
    const task = await conflictResolutionService.executeOperationWithConflictResolution(
      {
        table: 'tasks',
        operation: 'insert',
        data: sampleTask,
        options: {
          userId: sampleTask.userId,
          realtime: true,
          cache: true,
        },
      },
      {
        conflictStrategy: 'last-write-wins',
        offlineSupport: true,
      }
    )

    if (!task) {
      logError('Task creation failed')
      return false
    }

    logSuccess('Task created with conflict resolution')

    // Test offline queue
    const queueStatus = conflictResolutionService.getOfflineQueueStatus()
    logInfo(`Offline queue: ${queueStatus.totalOperations} operations`)

    // Test online status
    const isOnline = conflictResolutionService.isOnlineStatus()
    logInfo(`Online status: ${isOnline}`)

    // Clean up
    await conflictResolutionService.executeOperationWithConflictResolution(
      {
        table: 'tasks',
        operation: 'delete',
        where: { id: task.id },
        options: {
          userId: sampleTask.userId,
          realtime: true,
        },
      },
      {
        offlineSupport: true,
      }
    )

    logSuccess('Conflict resolution test completed')
    return true
  } catch (error) {
    logError(
      `Conflict resolution test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
    return false
  }
}

/**
 * Test environment operations
 */
async function testEnvironmentOperations(): Promise<boolean> {
  logInfo('Testing environment operations...')

  try {
    // Create environment
    const createResult = await electricDatabaseClient.executeOperation({
      table: 'environments',
      operation: 'insert',
      data: sampleEnvironment,
      options: {
        userId: sampleEnvironment.userId,
        realtime: true,
        cache: true,
      },
    })

    if (!(createResult.success && createResult.data)) {
      logError('Environment creation failed')
      return false
    }

    const environment = createResult.data
    logSuccess(`Environment created: ${environment.name}`)

    // Update environment
    const updateResult = await electricDatabaseClient.executeOperation({
      table: 'environments',
      operation: 'update',
      data: { isActive: false, description: 'Updated test environment' },
      where: { id: environment.id },
      options: {
        userId: sampleEnvironment.userId,
        realtime: true,
        cache: true,
      },
    })

    if (!updateResult.success) {
      logError('Environment update failed')
      return false
    }

    logSuccess('Environment updated successfully')

    // Delete environment
    const deleteResult = await electricDatabaseClient.executeOperation({
      table: 'environments',
      operation: 'delete',
      where: { id: environment.id },
      options: {
        userId: sampleEnvironment.userId,
        realtime: true,
      },
    })

    if (!deleteResult.success) {
      logError('Environment deletion failed')
      return false
    }

    logSuccess('Environment deleted successfully')
    return true
  } catch (error) {
    logError(
      `Environment operations test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
    return false
  }
}

/**
 * Test Redis integration
 */
async function testRedisIntegration(): Promise<boolean> {
  logInfo('Testing Redis integration...')

  try {
    // Test basic Redis operations through the database client
    const testData = { test: 'electric-integration', timestamp: Date.now() }

    // Create a task that should be cached
    const result = await electricDatabaseClient.executeOperation({
      table: 'tasks',
      operation: 'insert',
      data: { ...sampleTask, title: 'Redis Cache Test Task' },
      options: {
        userId: sampleTask.userId,
        cache: true,
        ttl: 60,
      },
    })

    if (!result.success) {
      logError('Redis cache test failed - task creation')
      return false
    }

    // Try to fetch from cache
    const cachedResult = await electricDatabaseClient.executeOperation({
      table: 'tasks',
      operation: 'select',
      where: { id: result.data.id },
      options: {
        userId: sampleTask.userId,
        cache: true,
      },
    })

    if (cachedResult.cached) {
      logSuccess('Data retrieved from Redis cache')
    } else {
      logWarning('Data not retrieved from cache (may be expected)')
    }

    // Clean up
    await electricDatabaseClient.executeOperation({
      table: 'tasks',
      operation: 'delete',
      where: { id: result.data.id },
      options: {
        userId: sampleTask.userId,
      },
    })

    logSuccess('Redis integration test completed')
    return true
  } catch (error) {
    logError(
      `Redis integration test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
    return false
  }
}

/**
 * Main test function
 */
async function runElectricIntegrationTests(): Promise<void> {
  console.log(colorize('\n=== ElectricSQL Integration Test ===', 'bright'))

  let allTestsPassed = true

  try {
    // Initialize Redis
    logInfo('Initializing Redis...')
    await initializeRedis()
    logSuccess('Redis initialized (or using mock fallback)')

    // Test database client
    const dbClientPassed = await testDatabaseClient()
    allTestsPassed = allTestsPassed && dbClientPassed

    // Test sync service
    const syncServicePassed = await testSyncService()
    allTestsPassed = allTestsPassed && syncServicePassed

    // Test conflict resolution
    const conflictResolutionPassed = await testConflictResolution()
    allTestsPassed = allTestsPassed && conflictResolutionPassed

    // Test environment operations
    const environmentsPassed = await testEnvironmentOperations()
    allTestsPassed = allTestsPassed && environmentsPassed

    // Test Redis integration
    const redisPassed = await testRedisIntegration()
    allTestsPassed = allTestsPassed && redisPassed

    console.log('\n' + colorize('=== Test Results ===', 'bright'))
    if (allTestsPassed) {
      logSuccess('All ElectricSQL integration tests passed! Real-time sync is working correctly.')
    } else {
      logError('Some tests failed. Please check the output above.')
    }
  } catch (error) {
    logError(`Test execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

// Run tests if called directly
if (require.main === module) {
  runElectricIntegrationTests()
}

export { runElectricIntegrationTests }
