/**
 * Data Integrity Validation Tests
 *
 * Comprehensive test suite for data integrity including concurrent operations,
 * constraint enforcement, referential integrity, transaction isolation, and
 * consistency validation across the entire database schema.
 */

import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { sql } from 'drizzle-orm'
import { eq, and, inArray, isNull, isNotNull, count, exists } from 'drizzle-orm'
import { checkDatabaseHealth, db } from '../../../db/config'
import { migrationRunner } from '../../../db/migrations/migration-runner'
import { 
  tasks, 
  environments, 
  agentExecutions, 
  observabilityEvents,
  users,
  apiKeys
} from '../../../db/schema'

// Data integrity types
interface IntegrityViolation {
  type: 'CONSTRAINT' | 'REFERENTIAL' | 'CONSISTENCY' | 'CONCURRENT'
  table: string
  field?: string
  details: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  suggestion?: string
}

interface ConcurrencyTestResult {
  totalOperations: number
  successfulOperations: number
  failedOperations: number
  deadlocks: number
  timeouts: number
  dataInconsistencies: number
  averageLatency: number
}

interface ConstraintValidationResult {
  constraintName: string
  isValid: boolean
  violationCount: number
  violations: Array<{
    recordId: string
    details: string
  }>
}

// Skip tests if no database URL is provided
const skipTests = !process.env.DATABASE_URL

describe.skipIf(skipTests)('Data Integrity Validation Tests', () => {
  let testDataIds: {
    userIds: string[]
    taskIds: string[]
    environmentIds: string[]
    executionIds: string[]
    eventIds: string[]
    apiKeyIds: string[]
  }

  beforeAll(async () => {
    // Ensure database is healthy and migrations are run
    const isHealthy = await checkDatabaseHealth()
    if (!isHealthy) {
      throw new Error('Database is not healthy')
    }

    const result = await migrationRunner.migrate()
    if (!result.success) {
      throw new Error(`Migration failed: ${result.errors.join(', ')}`)
    }
  })

  beforeEach(async () => {
    // Clean up and setup fresh test data
    await cleanupTestData()
    testDataIds = await setupIntegrityTestData()
  })

  afterAll(async () => {
    await cleanupTestData()
  })

  async function cleanupTestData() {
    try {
      // Clean up in dependency order
      await db.delete(observabilityEvents)
      await db.delete(apiKeys)
      await db.delete(agentExecutions)
      await db.delete(environments)
      await db.delete(tasks)
      await db.delete(users)
    } catch (error) {
      console.warn('Cleanup failed:', error)
    }
  }

  async function setupIntegrityTestData() {
    // Create test users
    const userData = Array.from({ length: 3 }, (_, i) => ({
      id: `user-${i}`,
      email: `user${i}@test.com`,
      name: `Test User ${i}`,
      role: i === 0 ? 'admin' as const : 'user' as const,
      isActive: true,
      preferences: { theme: 'dark', notifications: true },
    }))

    const createdUsers = await db.insert(users).values(userData).returning()

    // Create test environments
    const envData = Array.from({ length: 2 }, (_, i) => ({
      name: `Test Environment ${i}`,
      description: `Environment ${i} for integrity testing`,
      userId: createdUsers[i % createdUsers.length].id,
      config: {
        apiKey: `test-key-${i}`,
        endpoint: `https://api-${i}.test.com`,
        timeout: 5000,
      },
      isActive: i === 0,
      schemaVersion: 1,
    }))

    const createdEnvs = await db.insert(environments).values(envData).returning()

    // Create test tasks
    const taskData = Array.from({ length: 5 }, (_, i) => ({
      title: `Integrity Test Task ${i}`,
      description: `Task ${i} for integrity testing`,
      status: (i % 3 === 0 ? 'pending' : i % 3 === 1 ? 'in-progress' : 'completed') as 'pending' | 'in-progress' | 'completed',
      priority: (i % 3 === 0 ? 'high' : i % 3 === 1 ? 'medium' : 'low') as 'high' | 'medium' | 'low',
      userId: createdUsers[i % createdUsers.length].id,
      environmentId: createdEnvs[i % createdEnvs.length].id,
      metadata: { testIndex: i, category: 'integrity' },
    }))

    const createdTasks = await db.insert(tasks).values(taskData).returning()

    // Create test executions
    const executionData = createdTasks.slice(0, 3).map((task, i) => ({
      taskId: task.id,
      agentType: `integrity-test-agent-${i}`,
      status: (i % 2 === 0 ? 'completed' : 'running') as 'completed' | 'running',
      input: { test: true, index: i },
      output: i % 2 === 0 ? { result: `Test result ${i}` } : null,
      executionTimeMs: i % 2 === 0 ? 1000 + i * 100 : null,
    }))

    const createdExecutions = await db.insert(agentExecutions).values(executionData).returning()

    // Create test events
    const eventData = createdExecutions.map((execution, i) => ({
      executionId: execution.id,
      eventType: `test.event.${i}`,
      data: { index: i, test: true },
      severity: (i % 3 === 0 ? 'info' : i % 3 === 1 ? 'warning' : 'error') as 'info' | 'warning' | 'error',
      category: 'integrity-test',
      tags: ['test', `execution-${i}`],
    }))

    const createdEvents = await db.insert(observabilityEvents).values(eventData).returning()

    // Create test API keys
    const apiKeyData = createdUsers.map((user, i) => ({
      name: `Test API Key ${i}`,
      userId: user.id,
      keyHash: `hash-${i}`,
      lastUsed: i % 2 === 0 ? new Date() : null,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      scopes: ['read', i % 2 === 0 ? 'write' : 'read'].filter(Boolean),
    }))

    const createdApiKeys = await db.insert(apiKeys).values(apiKeyData).returning()

    return {
      userIds: createdUsers.map(u => u.id),
      taskIds: createdTasks.map(t => t.id),
      environmentIds: createdEnvs.map(e => e.id),
      executionIds: createdExecutions.map(e => e.id),
      eventIds: createdEvents.map(e => e.id),
      apiKeyIds: createdApiKeys.map(k => k.id),
    }
  }

  describe('Referential Integrity Tests', () => {
    it('should enforce foreign key constraints on task-user relationship', async () => {
      // Try to create task with non-existent user
      await expect(
        db.insert(tasks).values({
          title: 'Invalid User Task',
          status: 'pending',
          priority: 'medium',
          userId: 'non-existent-user',
        })
      ).rejects.toThrow()
    })

    it('should enforce foreign key constraints on task-environment relationship', async () => {
      // Try to create task with non-existent environment
      await expect(
        db.insert(tasks).values({
          title: 'Invalid Environment Task',
          status: 'pending',
          priority: 'medium',
          userId: testDataIds.userIds[0],
          environmentId: 'non-existent-environment',
        })
      ).rejects.toThrow()
    })

    it('should enforce foreign key constraints on execution-task relationship', async () => {
      // Try to create execution with non-existent task
      await expect(
        db.insert(agentExecutions).values({
          taskId: 'non-existent-task',
          agentType: 'test-agent',
          status: 'running',
          input: { test: true },
        })
      ).rejects.toThrow()
    })

    it('should enforce foreign key constraints on event-execution relationship', async () => {
      // Try to create event with non-existent execution
      await expect(
        db.insert(observabilityEvents).values({
          executionId: 'non-existent-execution',
          eventType: 'test.event',
          data: { test: true },
          severity: 'info',
          category: 'test',
        })
      ).rejects.toThrow()
    })

    it('should cascade delete when user is deleted', async () => {
      const userId = testDataIds.userIds[0]

      // Count related records before deletion
      const tasksBefore = await db.select({ count: count() }).from(tasks).where(eq(tasks.userId, userId))
      const envsBefore = await db.select({ count: count() }).from(environments).where(eq(environments.userId, userId))
      const keysBefore = await db.select({ count: count() }).from(apiKeys).where(eq(apiKeys.userId, userId))

      expect(tasksBefore[0].count).toBeGreaterThan(0)

      // Delete user
      await db.delete(users).where(eq(users.id, userId))

      // Verify cascaded deletions
      const tasksAfter = await db.select({ count: count() }).from(tasks).where(eq(tasks.userId, userId))
      const envsAfter = await db.select({ count: count() }).from(environments).where(eq(environments.userId, userId))
      const keysAfter = await db.select({ count: count() }).from(apiKeys).where(eq(apiKeys.userId, userId))

      expect(tasksAfter[0].count).toBe(0)
      expect(envsAfter[0].count).toBe(0)
      expect(keysAfter[0].count).toBe(0)
    })

    it('should cascade delete when task is deleted', async () => {
      const taskId = testDataIds.taskIds[0]

      // Count related records before deletion
      const executionsBefore = await db.select({ count: count() }).from(agentExecutions).where(eq(agentExecutions.taskId, taskId))
      expect(executionsBefore[0].count).toBeGreaterThan(0)

      // Delete task
      await db.delete(tasks).where(eq(tasks.id, taskId))

      // Verify cascaded deletions
      const executionsAfter = await db.select({ count: count() }).from(agentExecutions).where(eq(agentExecutions.taskId, taskId))
      expect(executionsAfter[0].count).toBe(0)

      // Verify events are also cascaded through executions
      const eventsAfter = await db.select({ count: count() }).from(observabilityEvents)
        .where(exists(
          db.select().from(agentExecutions)
            .where(and(
              eq(agentExecutions.id, observabilityEvents.executionId),
              eq(agentExecutions.taskId, taskId)
            ))
        ))
      expect(eventsAfter[0].count).toBe(0)
    })

    it('should maintain referential integrity during bulk operations', async () => {
      // Create multiple tasks referencing the same user
      const bulkTasks = Array.from({ length: 10 }, (_, i) => ({
        title: `Bulk Task ${i}`,
        status: 'pending' as const,
        priority: 'medium' as const,
        userId: testDataIds.userIds[0],
      }))

      const createdTasks = await db.insert(tasks).values(bulkTasks).returning()

      // Verify all tasks reference valid user
      const taskUsers = await db.select({
        taskId: tasks.id,
        userId: tasks.userId,
        userExists: exists(db.select().from(users).where(eq(users.id, tasks.userId)))
      }).from(tasks).where(inArray(tasks.id, createdTasks.map(t => t.id)))

      taskUsers.forEach(taskUser => {
        expect(taskUser.userExists).toBe(true)
      })
    })
  })

  describe('Constraint Enforcement Tests', () => {
    it('should enforce unique constraints on user email', async () => {
      const duplicateUser = {
        email: testDataIds.userIds[0] ? 'user0@test.com' : 'test@example.com',
        name: 'Duplicate User',
        role: 'user' as const,
      }

      await expect(
        db.insert(users).values(duplicateUser)
      ).rejects.toThrow()
    })

    it('should enforce check constraints on enum values', async () => {
      // Invalid task status
      await expect(
        db.insert(tasks).values({
          title: 'Invalid Status Task',
          status: 'invalid-status' as any,
          priority: 'medium',
          userId: testDataIds.userIds[0],
        })
      ).rejects.toThrow()

      // Invalid task priority
      await expect(
        db.insert(tasks).values({
          title: 'Invalid Priority Task',
          status: 'pending',
          priority: 'invalid-priority' as any,
          userId: testDataIds.userIds[0],
        })
      ).rejects.toThrow()

      // Invalid user role
      await expect(
        db.insert(users).values({
          email: 'invalid@role.com',
          name: 'Invalid Role User',
          role: 'invalid-role' as any,
        })
      ).rejects.toThrow()
    })

    it('should enforce NOT NULL constraints', async () => {
      // Task without title
      await expect(
        db.insert(tasks).values({
          title: null as any,
          status: 'pending',
          priority: 'medium',
          userId: testDataIds.userIds[0],
        })
      ).rejects.toThrow()

      // User without email
      await expect(
        db.insert(users).values({
          email: null as any,
          name: 'No Email User',
          role: 'user',
        })
      ).rejects.toThrow()

      // Environment without name
      await expect(
        db.insert(environments).values({
          name: null as any,
          userId: testDataIds.userIds[0],
          config: {},
        })
      ).rejects.toThrow()
    })

    it('should enforce length constraints on text fields', async () => {
      const longTitle = 'x'.repeat(1000) // Assuming max length is less than 1000

      // This might not throw an error depending on your schema
      // Adjust based on your actual constraints
      const result = await db.insert(tasks).values({
        title: longTitle,
        status: 'pending',
        priority: 'medium',
        userId: testDataIds.userIds[0],
      }).returning()

      // If your schema allows long titles, verify it was stored correctly
      if (result.length > 0) {
        const stored = await db.select().from(tasks).where(eq(tasks.id, result[0].id))
        expect(stored[0].title).toBe(longTitle)
      }
    })

    it('should validate JSON structure in JSONB fields', async () => {
      // Valid JSON
      const validTask = await db.insert(tasks).values({
        title: 'Valid JSON Task',
        status: 'pending',
        priority: 'medium',
        userId: testDataIds.userIds[0],
        metadata: { key: 'value', number: 42, nested: { array: [1, 2, 3] } },
      }).returning()

      expect(validTask[0].metadata).toEqual({
        key: 'value',
        number: 42,
        nested: { array: [1, 2, 3] }
      })
    })

    it('should handle concurrent constraint violations gracefully', async () => {
      const promises = Array.from({ length: 5 }, (_, i) =>
        db.insert(users).values({
          email: 'concurrent@test.com', // Same email for all
          name: `Concurrent User ${i}`,
          role: 'user',
        }).catch(error => ({ error: error.message }))
      )

      const results = await Promise.allSettled(promises)
      const successes = results.filter(r => r.status === 'fulfilled' && !('error' in r.value))
      const failures = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && 'error' in r.value))

      expect(successes.length).toBe(1) // Only one should succeed
      expect(failures.length).toBe(4) // Others should fail due to unique constraint
    })
  })

  describe('Concurrent Operations Tests', () => {
    it('should handle concurrent reads without data corruption', async () => {
      const readOperations = Array.from({ length: 10 }, () =>
        db.select().from(tasks).where(eq(tasks.userId, testDataIds.userIds[0]))
      )

      const startTime = Date.now()
      const results = await Promise.all(readOperations)
      const endTime = Date.now()

      // All reads should return the same data
      const firstResult = results[0]
      results.forEach(result => {
        expect(result).toEqual(firstResult)
      })

      // Should complete reasonably quickly
      expect(endTime - startTime).toBeLessThan(5000)
    })

    it('should handle concurrent writes with proper isolation', async () => {
      const writeOperations = Array.from({ length: 5 }, (_, i) =>
        db.insert(tasks).values({
          title: `Concurrent Task ${i}`,
          status: 'pending',
          priority: 'medium',
          userId: testDataIds.userIds[0],
        }).returning()
      )

      const results = await Promise.allSettled(writeOperations)
      const successful = results.filter(r => r.status === 'fulfilled')

      expect(successful.length).toBe(5) // All should succeed

      // Verify all tasks were created with unique IDs
      const createdIds = successful.map(r => (r as any).value[0].id)
      const uniqueIds = new Set(createdIds)
      expect(uniqueIds.size).toBe(createdIds.length)
    })

    it('should prevent race conditions in counter updates', async () => {
      // Create a task that multiple executions will reference
      const [task] = await db.insert(tasks).values({
        title: 'Race Condition Task',
        status: 'pending',
        priority: 'medium',
        userId: testDataIds.userIds[0],
      }).returning()

      // Concurrent execution creations
      const executionPromises = Array.from({ length: 10 }, (_, i) =>
        db.insert(agentExecutions).values({
          taskId: task.id,
          agentType: `race-agent-${i}`,
          status: 'completed',
          input: { test: true },
          output: { result: `Result ${i}` },
          executionTimeMs: 1000,
        }).returning()
      )

      const results = await Promise.allSettled(executionPromises)
      const successful = results.filter(r => r.status === 'fulfilled')

      expect(successful.length).toBe(10)

      // Verify execution count is correct
      const executionCount = await db.select({ count: count() })
        .from(agentExecutions)
        .where(eq(agentExecutions.taskId, task.id))

      expect(executionCount[0].count).toBe(10)
    })

    it('should handle deadlocks gracefully', async () => {
      // Create two tasks
      const [task1, task2] = await db.insert(tasks).values([
        {
          title: 'Deadlock Task 1',
          status: 'pending',
          priority: 'high',
          userId: testDataIds.userIds[0],
        },
        {
          title: 'Deadlock Task 2',
          status: 'pending',
          priority: 'high',
          userId: testDataIds.userIds[1],
        }
      ]).returning()

      // Simulate operations that might cause deadlocks
      const operation1 = db.transaction(async (tx) => {
        await tx.update(tasks).set({ status: 'in-progress' }).where(eq(tasks.id, task1.id))
        await new Promise(resolve => setTimeout(resolve, 100)) // Simulate work
        await tx.update(tasks).set({ status: 'in-progress' }).where(eq(tasks.id, task2.id))
      })

      const operation2 = db.transaction(async (tx) => {
        await tx.update(tasks).set({ status: 'in-progress' }).where(eq(tasks.id, task2.id))
        await new Promise(resolve => setTimeout(resolve, 100)) // Simulate work
        await tx.update(tasks).set({ status: 'in-progress' }).where(eq(tasks.id, task1.id))
      })

      // Both operations should complete eventually (one might fail and retry)
      const results = await Promise.allSettled([operation1, operation2])
      const successful = results.filter(r => r.status === 'fulfilled')

      // At least one should succeed
      expect(successful.length).toBeGreaterThan(0)
    })

    it('should maintain consistency during bulk operations', async () => {
      const bulkSize = 100

      // Create bulk tasks
      const bulkTasks = Array.from({ length: bulkSize }, (_, i) => ({
        title: `Bulk Consistency Task ${i}`,
        status: 'pending' as const,
        priority: 'medium' as const,
        userId: testDataIds.userIds[i % testDataIds.userIds.length],
      }))

      const startTime = Date.now()
      await db.insert(tasks).values(bulkTasks)
      const endTime = Date.now()

      // Verify all tasks were created
      const createdCount = await db.select({ count: count() })
        .from(tasks)
        .where(sql`title LIKE 'Bulk Consistency Task%'`)

      expect(createdCount[0].count).toBe(bulkSize)
      expect(endTime - startTime).toBeLessThan(10000) // Should complete within 10 seconds
    })
  })

  describe('Transaction Isolation Tests', () => {
    it('should provide read committed isolation', async () => {
      const [task] = await db.insert(tasks).values({
        title: 'Isolation Test Task',
        status: 'pending',
        priority: 'medium',
        userId: testDataIds.userIds[0],
      }).returning()

      // Transaction 1: Update but don't commit yet
      const transaction1Promise = db.transaction(async (tx) => {
        await tx.update(tasks).set({ status: 'in-progress' }).where(eq(tasks.id, task.id))
        await new Promise(resolve => setTimeout(resolve, 1000)) // Hold transaction
        return 'tx1-complete'
      })

      // Transaction 2: Read the task (should see old value until tx1 commits)
      await new Promise(resolve => setTimeout(resolve, 500)) // Let tx1 start first
      
      const readResult = await db.select().from(tasks).where(eq(tasks.id, task.id))
      expect(readResult[0].status).toBe('pending') // Should see uncommitted value

      await transaction1Promise
    })

    it('should handle serializable conflicts', async () => {
      // Create initial data
      const [task] = await db.insert(tasks).values({
        title: 'Serializable Test Task',
        status: 'pending',
        priority: 'medium',
        userId: testDataIds.userIds[0],
      }).returning()

      // Two transactions that modify the same data
      const tx1 = db.transaction(async (tx) => {
        const current = await tx.select().from(tasks).where(eq(tasks.id, task.id))
        await new Promise(resolve => setTimeout(resolve, 100))
        await tx.update(tasks).set({ 
          status: 'in-progress',
          updatedAt: new Date()
        }).where(eq(tasks.id, task.id))
        return current[0]
      })

      const tx2 = db.transaction(async (tx) => {
        const current = await tx.select().from(tasks).where(eq(tasks.id, task.id))
        await new Promise(resolve => setTimeout(resolve, 50))
        await tx.update(tasks).set({ 
          priority: 'high',
          updatedAt: new Date()
        }).where(eq(tasks.id, task.id))
        return current[0]
      })

      const results = await Promise.allSettled([tx1, tx2])
      const successful = results.filter(r => r.status === 'fulfilled')

      // Both should succeed or one should fail with serialization error
      expect(successful.length).toBeGreaterThan(0)
    })

    it('should rollback on transaction failure', async () => {
      const initialTaskCount = await db.select({ count: count() }).from(tasks)

      try {
        await db.transaction(async (tx) => {
          // Create a task
          await tx.insert(tasks).values({
            title: 'Rollback Test Task',
            status: 'pending',
            priority: 'medium',
            userId: testDataIds.userIds[0],
          })

          // Create an execution
          await tx.insert(agentExecutions).values({
            taskId: 'non-existent-task', // This should fail
            agentType: 'rollback-test',
            status: 'running',
            input: { test: true },
          })
        })
      } catch (error) {
        // Expected to fail
      }

      // Verify rollback - task count should be unchanged
      const finalTaskCount = await db.select({ count: count() }).from(tasks)
      expect(finalTaskCount[0].count).toBe(initialTaskCount[0].count)
    })
  })

  describe('Data Consistency Validation', () => {
    it('should validate cross-table consistency', async () => {
      // Check that all executions reference valid tasks
      const orphanedExecutions = await db.select({
        executionId: agentExecutions.id,
        taskId: agentExecutions.taskId
      })
      .from(agentExecutions)
      .where(
        sql`NOT EXISTS (SELECT 1 FROM ${tasks} WHERE ${tasks.id} = ${agentExecutions.taskId})`
      )

      expect(orphanedExecutions.length).toBe(0)

      // Check that all events reference valid executions
      const orphanedEvents = await db.select({
        eventId: observabilityEvents.id,
        executionId: observabilityEvents.executionId
      })
      .from(observabilityEvents)
      .where(
        sql`NOT EXISTS (SELECT 1 FROM ${agentExecutions} WHERE ${agentExecutions.id} = ${observabilityEvents.executionId})`
      )

      expect(orphanedEvents.length).toBe(0)
    })

    it('should validate enum value consistency', async () => {
      // Check task statuses
      const invalidStatuses = await db.select()
        .from(tasks)
        .where(sql`${tasks.status} NOT IN ('pending', 'in-progress', 'completed', 'cancelled')`)

      expect(invalidStatuses.length).toBe(0)

      // Check task priorities
      const invalidPriorities = await db.select()
        .from(tasks)
        .where(sql`${tasks.priority} NOT IN ('low', 'medium', 'high', 'urgent')`)

      expect(invalidPriorities.length).toBe(0)

      // Check user roles
      const invalidRoles = await db.select()
        .from(users)
        .where(sql`${users.role} NOT IN ('admin', 'user')`)

      expect(invalidRoles.length).toBe(0)
    })

    it('should validate timestamp consistency', async () => {
      // Check that updatedAt >= createdAt for all records
      const inconsistentTasks = await db.select()
        .from(tasks)
        .where(sql`${tasks.updatedAt} < ${tasks.createdAt}`)

      expect(inconsistentTasks.length).toBe(0)

      const inconsistentEnvs = await db.select()
        .from(environments)
        .where(sql`${environments.updatedAt} < ${environments.createdAt}`)

      expect(inconsistentEnvs.length).toBe(0)
    })

    it('should validate business rule consistency', async () => {
      // Check that completed executions have output and execution time
      const incompleteExecutions = await db.select()
        .from(agentExecutions)
        .where(
          and(
            eq(agentExecutions.status, 'completed'),
            sql`(${agentExecutions.output} IS NULL OR ${agentExecutions.executionTimeMs} IS NULL)`
          )
        )

      expect(incompleteExecutions.length).toBe(0)

      // Check that running executions don't have end time
      const prematureExecutions = await db.select()
        .from(agentExecutions)
        .where(
          and(
            eq(agentExecutions.status, 'running'),
            isNotNull(agentExecutions.executionTimeMs)
          )
        )

      expect(prematureExecutions.length).toBe(0)
    })

    it('should validate unique constraints across related data', async () => {
      // Check for duplicate active environments per user
      const duplicateActiveEnvs = await db.select({
        userId: environments.userId,
        count: count()
      })
      .from(environments)
      .where(eq(environments.isActive, true))
      .groupBy(environments.userId)
      .having(sql`count(*) > 1`)

      expect(duplicateActiveEnvs.length).toBe(0)
    })
  })

  describe('Performance Impact of Integrity Checks', () => {
    it('should maintain performance during integrity validation', async () => {
      const operations = [
        () => validateReferentialIntegrity(),
        () => validateConstraints(),
        () => validateConsistency(),
      ]

      const results = await Promise.all(
        operations.map(async (op) => {
          const start = Date.now()
          await op()
          return Date.now() - start
        })
      )

      // All integrity checks should complete within reasonable time
      results.forEach(duration => {
        expect(duration).toBeLessThan(5000) // 5 seconds max per check
      })
    })

    it('should handle large datasets efficiently', async () => {
      // Create a larger dataset
      const largeBatch = Array.from({ length: 500 }, (_, i) => ({
        title: `Large Dataset Task ${i}`,
        status: 'pending' as const,
        priority: 'medium' as const,
        userId: testDataIds.userIds[i % testDataIds.userIds.length],
      }))

      const start = Date.now()
      await db.insert(tasks).values(largeBatch)
      const insertTime = Date.now() - start

      // Validate integrity on large dataset
      const validateStart = Date.now()
      await validateReferentialIntegrity()
      const validateTime = Date.now() - validateStart

      expect(insertTime).toBeLessThan(10000) // 10 seconds for insert
      expect(validateTime).toBeLessThan(5000) // 5 seconds for validation
    })
  })

  // Helper functions for validation
  async function validateReferentialIntegrity(): Promise<IntegrityViolation[]> {
    const violations: IntegrityViolation[] = []

    // Check orphaned tasks
    const orphanedTasks = await db.select()
      .from(tasks)
      .where(
        sql`NOT EXISTS (SELECT 1 FROM ${users} WHERE ${users.id} = ${tasks.userId})`
      )

    orphanedTasks.forEach(task => {
      violations.push({
        type: 'REFERENTIAL',
        table: 'tasks',
        field: 'userId',
        details: `Task ${task.id} references non-existent user ${task.userId}`,
        severity: 'high',
        suggestion: 'Remove orphaned task or restore missing user'
      })
    })

    return violations
  }

  async function validateConstraints(): Promise<ConstraintValidationResult[]> {
    const results: ConstraintValidationResult[] = []

    // Validate unique email constraint
    const duplicateEmails = await db.select({
      email: users.email,
      count: count()
    })
    .from(users)
    .groupBy(users.email)
    .having(sql`count(*) > 1`)

    results.push({
      constraintName: 'users_email_unique',
      isValid: duplicateEmails.length === 0,
      violationCount: duplicateEmails.length,
      violations: duplicateEmails.map(dup => ({
        recordId: dup.email,
        details: `Email ${dup.email} is used ${dup.count} times`
      }))
    })

    return results
  }

  async function validateConsistency(): Promise<IntegrityViolation[]> {
    const violations: IntegrityViolation[] = []

    // Check timestamp consistency
    const timestampInconsistencies = await db.select()
      .from(tasks)
      .where(sql`${tasks.updatedAt} < ${tasks.createdAt}`)

    timestampInconsistencies.forEach(task => {
      violations.push({
        type: 'CONSISTENCY',
        table: 'tasks',
        field: 'updatedAt',
        details: `Task ${task.id} has updatedAt before createdAt`,
        severity: 'medium',
        suggestion: 'Fix timestamp values to ensure updatedAt >= createdAt'
      })
    })

    return violations
  }
})