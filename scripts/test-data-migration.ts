#!/usr/bin/env bun

/**
 * Data Migration Test Script
 *
 * Tests the localStorage to database migration system with sample data
 * to verify end-to-end functionality.
 */

import { backupService } from '../lib/migration/backup-service'
import { dataExtractor } from '../lib/migration/data-extractor'
import { dataMigrationManager } from '../lib/migration/data-migration'
import type { LocalStorageEnvironment, LocalStorageTask } from '../lib/migration/types'
import { redisCache } from '../lib/redis'

// Sample test data that mimics real localStorage data
const sampleTasks: LocalStorageTask[] = [
  {
    id: 'task-1',
    title: 'Test Migration Task',
    description: 'A sample task for testing migration',
    messages: [
      {
        role: 'user',
        type: 'text',
        data: { content: 'Create a new feature' },
      },
      {
        role: 'assistant',
        type: 'code',
        data: { language: 'typescript', code: 'console.log("Hello World")' },
      },
    ],
    status: 'IN_PROGRESS',
    branch: 'feature/test-migration',
    sessionId: 'session-123',
    repository: 'test-repo',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isArchived: false,
    mode: 'code',
    hasChanges: true,
  },
  {
    id: 'task-2',
    title: 'Completed Task',
    description: 'A completed task for testing',
    messages: [],
    status: 'DONE',
    branch: 'main',
    sessionId: 'session-456',
    repository: 'test-repo',
    createdAt: new Date(Date.now() - 86_400_000).toISOString(), // 1 day ago
    updatedAt: new Date().toISOString(),
    isArchived: false,
    mode: 'ask',
    hasChanges: false,
  },
]

const sampleEnvironments: LocalStorageEnvironment[] = [
  {
    id: 'env-1',
    name: 'Development',
    description: 'Development environment',
    githubOrganization: 'test-org',
    githubToken: 'ghp_test_token',
    githubRepository: 'test-repo',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'env-2',
    name: 'Production',
    description: 'Production environment',
    githubOrganization: 'test-org',
    githubToken: 'ghp_prod_token',
    githubRepository: 'prod-repo',
    createdAt: new Date(Date.now() - 172_800_000).toISOString(), // 2 days ago
    updatedAt: new Date().toISOString(),
  },
]

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
 * Setup test localStorage data
 */
function setupTestData(): void {
  logInfo('Setting up test localStorage data...')

  // Setup task store
  const taskStore = {
    state: { tasks: sampleTasks },
    version: 0,
  }
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('task-store', JSON.stringify(taskStore))

    // Setup environments
    const envStore = {
      state: { environments: sampleEnvironments },
      version: 0,
    }
    localStorage.setItem('environments', JSON.stringify(envStore))

    // Setup some form data
    localStorage.setItem('form-draft-1', JSON.stringify({ field1: 'value1', field2: 'value2' }))

    logSuccess(`Set up ${sampleTasks.length} tasks and ${sampleEnvironments.length} environments`)
  } else {
    logWarning('localStorage not available in this environment')
  }
}

/**
 * Test data extraction
 */
async function testDataExtraction(): Promise<boolean> {
  logInfo('Testing data extraction...')

  try {
    const result = await dataExtractor.extractAll()

    if (result.errors.length > 0) {
      logError(`Extraction errors: ${result.errors.map((e) => e.message).join(', ')}`)
      return false
    }

    if (result.warnings.length > 0) {
      logWarning(`Extraction warnings: ${result.warnings.join(', ')}`)
    }

    const { data } = result
    logSuccess(
      `Extracted ${data.tasks?.length || 0} tasks and ${data.environments?.length || 0} environments`
    )

    return true
  } catch (error) {
    logError(`Data extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    return false
  }
}

/**
 * Test backup creation
 */
async function testBackupCreation(): Promise<string | null> {
  logInfo('Testing backup creation...')

  try {
    const result = await backupService.createBackup({
      source: 'LOCALSTORAGE',
      description: 'Test migration backup',
    })

    if (!(result.success && result.manifest)) {
      logError(`Backup creation failed: ${result.error || 'Unknown error'}`)
      return null
    }

    logSuccess(`Created backup: ${result.manifest.id}`)
    return result.manifest.id
  } catch (error) {
    logError(`Backup creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    return null
  }
}

/**
 * Test migration check
 */
async function testMigrationCheck(): Promise<boolean> {
  logInfo('Testing migration check...')

  try {
    const check = await dataMigrationManager.checkMigrationNeeded()

    logInfo(`Migration needed: ${check.needed}`)
    logInfo(`Local tasks: ${check.localStorageData.tasks}`)
    logInfo(`Local environments: ${check.localStorageData.environments}`)
    logInfo(`Database tasks: ${check.databaseData.tasks}`)
    logInfo(`Database environments: ${check.databaseData.environments}`)

    return true
  } catch (error) {
    logError(`Migration check failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    return false
  }
}

/**
 * Test Redis caching
 */
async function testRedisIntegration(): Promise<boolean> {
  logInfo('Testing Redis integration...')

  try {
    // Test basic cache operations
    const testKey = 'migration:test:key'
    const testValue = { test: 'data', timestamp: Date.now() }

    await redisCache.set(testKey, testValue, { ttl: 60 })
    const retrieved = await redisCache.get(testKey)

    if (!retrieved || JSON.stringify(retrieved) !== JSON.stringify(testValue)) {
      logError('Redis cache test failed - data mismatch')
      return false
    }

    await redisCache.delete(testKey)
    const deleted = await redisCache.get(testKey)

    if (deleted !== null) {
      logError('Redis cache test failed - deletion failed')
      return false
    }

    logSuccess('Redis integration test passed')
    return true
  } catch (error) {
    logError(
      `Redis integration test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
    return false
  }
}

/**
 * Cleanup test data
 */
function cleanupTestData(): void {
  logInfo('Cleaning up test data...')

  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem('task-store')
    localStorage.removeItem('environments')
    localStorage.removeItem('form-draft-1')
    logSuccess('Test data cleaned up')
  }
}

/**
 * Main test function
 */
async function runTests(): Promise<void> {
  console.log(colorize('\n=== Data Migration System Test ===', 'bright'))

  let allTestsPassed = true

  try {
    // Setup test data
    setupTestData()

    // Test data extraction
    const extractionPassed = await testDataExtraction()
    allTestsPassed = allTestsPassed && extractionPassed

    // Test backup creation
    const backupId = await testBackupCreation()
    allTestsPassed = allTestsPassed && backupId !== null

    // Test migration check
    const migrationCheckPassed = await testMigrationCheck()
    allTestsPassed = allTestsPassed && migrationCheckPassed

    // Test Redis integration
    const redisPassed = await testRedisIntegration()
    allTestsPassed = allTestsPassed && redisPassed

    // Cleanup
    cleanupTestData()

    console.log('\n' + colorize('=== Test Results ===', 'bright'))
    if (allTestsPassed) {
      logSuccess('All tests passed! Migration system is working correctly.')
    } else {
      logError('Some tests failed. Please check the output above.')
    }
  } catch (error) {
    logError(`Test execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    cleanupTestData()
  }
}

// Run tests if called directly
if (require.main === module) {
  runTests()
}

export { runTests }
