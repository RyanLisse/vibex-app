/**
 * Database Operations Integration Tests
 *
 * Comprehensive test suite for database operations using Drizzle ORM
 * Tests CRUD operations, transactions, constraints, and performance
 */

import { eq, and, desc, asc, count, sql } from 'drizzle-orm'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { checkDatabaseHealth, db, initializeExtensions } from '../../../db/config'
import { migrationRunner } from '../../../db/migrations/migration-runner'
import {
  tasks,
  environments,
  agentExecutions,
  observabilityEvents,
  agentMemory,
  workflows,
  workflowExecutions,
  executionSnapshots,
  type NewTask,
  type NewEnvironment,
  type NewAgentExecution,
  type NewObservabilityEvent,
  type NewAgentMemory,
  type NewWorkflow,
  type NewWorkflowExecution,
  type NewExecutionSnapshot,
} from '../../../db/schema'

// Skip tests if no database URL is provided
const skipTests = !process.env.DATABASE_URL

// Test data factories
const createTestTask = (overrides: Partial<NewTask> = {}): NewTask => ({
  title: 'Test Task',
  description: 'Test task description',
  status: 'pending',
  priority: 'medium',
  userId: 'test-user-123',
  metadata: { test: true },
  ...overrides,
})

const createTestEnvironment = (overrides: Partial<NewEnvironment> = {}): NewEnvironment => ({
  name: 'Test Environment',
  config: { apiKey: 'test-key', endpoint: 'https://api.test.com' },
  isActive: true,
  userId: 'test-user-123',
  schemaVersion: 1,
  ...overrides,
})

const createTestExecution = (
  taskId: string,
  overrides: Partial<NewAgentExecution> = {}
): NewAgentExecution => ({
  taskId,
  agentType: 'test-agent',
  status: 'running',
  input: { prompt: 'Test prompt' },
  metadata: { version: '1.0' },
  ...overrides,
})

describe.skipIf(skipTests)('Database Operations Integration Tests', () => {
  let testTaskId: string
  let testEnvironmentId: string
  let testExecutionId: string
  let testWorkflowId: string

  beforeAll(async () => {
    // Ensure database is healthy and migrations are run
    const isHealthy = await checkDatabaseHealth()
    if (!isHealthy) {
      throw new Error('Database is not healthy')
    }

    await initializeExtensions()
    const result = await migrationRunner.migrate()
    if (!result.success) {
      throw new Error(`Migration failed: ${result.errors.join(', ')}`)
    }
  })

  beforeEach(async () => {
    // Clean up test data before each test
    await cleanupTestData()
  })

  afterAll(async () => {
    // Final cleanup
    await cleanupTestData()
  })

  async function cleanupTestData() {
    try {
      // Delete in reverse dependency order
      await db.delete(executionSnapshots)
      await db.delete(observabilityEvents)
      await db.delete(agentExecutions)
      await db.delete(workflowExecutions)
      await db.delete(workflows)
      await db.delete(agentMemory)
      await db.delete(environments)
      await db.delete(tasks)
    } catch (error) {
      console.warn('Cleanup failed:', error)
    }
  }

  describe('Basic CRUD Operations', () => {
    describe('Tasks Table', () => {
      it('should create a task with all required fields', async () => {
        const taskData = createTestTask()
        const [created] = await db.insert(tasks).values(taskData).returning()

        expect(created).toBeDefined()
        expect(created.id).toBeDefined()
        expect(created.title).toBe(taskData.title)
        expect(created.status).toBe(taskData.status)
        expect(created.priority).toBe(taskData.priority)
        expect(created.userId).toBe(taskData.userId)
        expect(created.createdAt).toBeDefined()
        expect(created.updatedAt).toBeDefined()

        testTaskId = created.id
      })

      it('should retrieve task by ID', async () => {
        const taskData = createTestTask()
        const [created] = await db.insert(tasks).values(taskData).returning()

        const retrieved = await db.select().from(tasks).where(eq(tasks.id, created.id))

        expect(retrieved).toHaveLength(1)
        expect(retrieved[0].id).toBe(created.id)
        expect(retrieved[0].title).toBe(taskData.title)
      })

      it('should update task status and metadata', async () => {
        const taskData = createTestTask()
        const [created] = await db.insert(tasks).values(taskData).returning()

        const updatedMetadata = { test: true, updated: true, step: 'in-progress' }
        const [updated] = await db
          .update(tasks)
          .set({
            status: 'in_progress',
            metadata: updatedMetadata,
            updatedAt: new Date(),
          })
          .where(eq(tasks.id, created.id))
          .returning()

        expect(updated.status).toBe('in_progress')
        expect(updated.metadata).toEqual(updatedMetadata)
        expect(updated.updatedAt.getTime()).toBeGreaterThan(updated.createdAt.getTime())
      })

      it('should delete task and cascade to related records', async () => {
        const taskData = createTestTask()
        const [task] = await db.insert(tasks).values(taskData).returning()

        // Create related execution
        const executionData = createTestExecution(task.id)
        const [execution] = await db.insert(agentExecutions).values(executionData).returning()

        // Create related event
        const eventData: NewObservabilityEvent = {
          executionId: execution.id,
          eventType: 'test.event',
          data: { test: true },
          severity: 'info',
          category: 'test',
        }
        await db.insert(observabilityEvents).values(eventData)

        // Delete task - should cascade
        await db.delete(tasks).where(eq(tasks.id, task.id))

        // Verify cascade deletion
        const remainingExecutions = await db
          .select()
          .from(agentExecutions)
          .where(eq(agentExecutions.id, execution.id))
        const remainingEvents = await db
          .select()
          .from(observabilityEvents)
          .where(eq(observabilityEvents.executionId, execution.id))

        expect(remainingExecutions).toHaveLength(0)
        expect(remainingEvents).toHaveLength(0)
      })

      it('should enforce unique constraints where appropriate', async () => {
        const envData = createTestEnvironment({ name: 'Unique Test', userId: 'user123' })

        // First insert should succeed
        await db.insert(environments).values(envData)

        // Second insert with same name and user should fail
        await expect(
          db.insert(environments).values({ ...envData, id: undefined })
        ).rejects.toThrow()
      })

      it('should query tasks with filters and sorting', async () => {
        // Create multiple tasks with different statuses and priorities
        const taskData = [
          createTestTask({ title: 'High Priority Task', priority: 'high', status: 'pending' }),
          createTestTask({
            title: 'Medium Priority Task',
            priority: 'medium',
            status: 'in_progress',
          }),
          createTestTask({ title: 'Low Priority Task', priority: 'low', status: 'completed' }),
          createTestTask({
            title: 'Another High Priority',
            priority: 'high',
            status: 'in_progress',
          }),
        ]

        await db.insert(tasks).values(taskData)

        // Query pending tasks
        const pendingTasks = await db.select().from(tasks).where(eq(tasks.status, 'pending'))

        expect(pendingTasks).toHaveLength(1)
        expect(pendingTasks[0].title).toBe('High Priority Task')

        // Query high priority tasks, sorted by created date
        const highPriorityTasks = await db
          .select()
          .from(tasks)
          .where(eq(tasks.priority, 'high'))
          .orderBy(desc(tasks.createdAt))

        expect(highPriorityTasks).toHaveLength(2)

        // Complex query with multiple conditions
        const inProgressHighPriority = await db
          .select()
          .from(tasks)
          .where(and(eq(tasks.status, 'in_progress'), eq(tasks.priority, 'high')))

        expect(inProgressHighPriority).toHaveLength(1)
        expect(inProgressHighPriority[0].title).toBe('Another High Priority')
      })
    })

    describe('Environments Table', () => {
      it('should create environment with JSON configuration', async () => {
        const envData = createTestEnvironment({
          config: {
            apiKey: 'test-key-123',
            endpoint: 'https://api.example.com',
            timeout: 30000,
            retries: 3,
            features: ['feature1', 'feature2'],
          },
        })

        const [created] = await db.insert(environments).values(envData).returning()

        expect(created.config).toEqual(envData.config)
        expect(created.config.features).toHaveLength(2)
        expect(created.schemaVersion).toBe(1)

        testEnvironmentId = created.id
      })

      it('should update environment configuration', async () => {
        const envData = createTestEnvironment()
        const [created] = await db.insert(environments).values(envData).returning()

        const newConfig = {
          ...envData.config,
          newFeature: true,
          updatedField: 'updated-value',
        }

        const [updated] = await db
          .update(environments)
          .set({ config: newConfig, schemaVersion: 2 })
          .where(eq(environments.id, created.id))
          .returning()

        expect(updated.config.newFeature).toBe(true)
        expect(updated.config.updatedField).toBe('updated-value')
        expect(updated.schemaVersion).toBe(2)
      })

      it('should toggle environment active status', async () => {
        const envData = createTestEnvironment({ isActive: false })
        const [created] = await db.insert(environments).values(envData).returning()

        // Activate environment
        const [activated] = await db
          .update(environments)
          .set({ isActive: true })
          .where(eq(environments.id, created.id))
          .returning()

        expect(activated.isActive).toBe(true)

        // Deactivate environment
        const [deactivated] = await db
          .update(environments)
          .set({ isActive: false })
          .where(eq(environments.id, activated.id))
          .returning()

        expect(deactivated.isActive).toBe(false)
      })
    })
  })

  describe('Complex Relationships and Joins', () => {
    beforeEach(async () => {
      // Set up test data for relationship tests
      const [task] = await db.insert(tasks).values(createTestTask()).returning()
      testTaskId = task.id

      const [execution] = await db
        .insert(agentExecutions)
        .values(createTestExecution(task.id))
        .returning()
      testExecutionId = execution.id
    })

    it('should query tasks with their executions', async () => {
      // Create additional executions for the task
      await db
        .insert(agentExecutions)
        .values([
          createTestExecution(testTaskId, { agentType: 'executor-1', status: 'completed' }),
          createTestExecution(testTaskId, { agentType: 'executor-2', status: 'failed' }),
        ])

      // Query task with execution count
      const taskWithExecutions = await db
        .select({
          taskId: tasks.id,
          taskTitle: tasks.title,
          executionCount: count(agentExecutions.id),
        })
        .from(tasks)
        .leftJoin(agentExecutions, eq(tasks.id, agentExecutions.taskId))
        .where(eq(tasks.id, testTaskId))
        .groupBy(tasks.id, tasks.title)

      expect(taskWithExecutions).toHaveLength(1)
      expect(taskWithExecutions[0].executionCount).toBe(3) // Including the one from beforeEach
    })

    it('should query executions with their events', async () => {
      // Create events for the execution
      const eventData = [
        {
          executionId: testExecutionId,
          eventType: 'execution.started',
          data: { timestamp: new Date().toISOString() },
          severity: 'info' as const,
          category: 'lifecycle',
        },
        {
          executionId: testExecutionId,
          eventType: 'execution.progress',
          data: { progress: 50 },
          severity: 'info' as const,
          category: 'progress',
        },
        {
          executionId: testExecutionId,
          eventType: 'execution.error',
          data: { error: 'Test error' },
          severity: 'error' as const,
          category: 'error',
        },
      ]

      await db.insert(observabilityEvents).values(eventData)

      // Query execution with events
      const executionWithEvents = await db
        .select({
          executionId: agentExecutions.id,
          agentType: agentExecutions.agentType,
          eventType: observabilityEvents.eventType,
          eventSeverity: observabilityEvents.severity,
          eventData: observabilityEvents.data,
        })
        .from(agentExecutions)
        .leftJoin(observabilityEvents, eq(agentExecutions.id, observabilityEvents.executionId))
        .where(eq(agentExecutions.id, testExecutionId))
        .orderBy(observabilityEvents.timestamp)

      expect(executionWithEvents).toHaveLength(3)
      expect(executionWithEvents[0].eventType).toBe('execution.started')
      expect(executionWithEvents[1].eventType).toBe('execution.progress')
      expect(executionWithEvents[2].eventType).toBe('execution.error')
    })

    it('should create execution snapshots for debugging', async () => {
      const snapshotData: NewExecutionSnapshot[] = [
        {
          executionId: testExecutionId,
          stepNumber: 1,
          state: { step: 'initialization', variables: { x: 1, y: 2 } },
          description: 'Initial state',
          checkpoint: true,
        },
        {
          executionId: testExecutionId,
          stepNumber: 2,
          state: { step: 'processing', variables: { x: 3, y: 4 }, progress: 0.5 },
          description: 'Mid-execution state',
          checkpoint: false,
        },
        {
          executionId: testExecutionId,
          stepNumber: 3,
          state: { step: 'completion', variables: { x: 5, y: 6 }, result: 'success' },
          description: 'Final state',
          checkpoint: true,
        },
      ]

      await db.insert(executionSnapshots).values(snapshotData)

      // Query snapshots for the execution
      const snapshots = await db
        .select()
        .from(executionSnapshots)
        .where(eq(executionSnapshots.executionId, testExecutionId))
        .orderBy(executionSnapshots.stepNumber)

      expect(snapshots).toHaveLength(3)
      expect(snapshots[0].checkpoint).toBe(true)
      expect(snapshots[1].checkpoint).toBe(false)
      expect(snapshots[2].state.result).toBe('success')

      // Query only checkpoint snapshots
      const checkpoints = await db
        .select()
        .from(executionSnapshots)
        .where(
          and(
            eq(executionSnapshots.executionId, testExecutionId),
            eq(executionSnapshots.checkpoint, true)
          )
        )

      expect(checkpoints).toHaveLength(2)
    })
  })

  describe('Transaction Handling', () => {
    it('should handle successful transaction with multiple operations', async () => {
      const result = await db.transaction(async (tx) => {
        // Create task
        const [task] = await tx.insert(tasks).values(createTestTask()).returning()

        // Create environment
        const [env] = await tx.insert(environments).values(createTestEnvironment()).returning()

        // Create execution
        const [execution] = await tx
          .insert(agentExecutions)
          .values(createTestExecution(task.id))
          .returning()

        return { task, env, execution }
      })

      expect(result.task.id).toBeDefined()
      expect(result.env.id).toBeDefined()
      expect(result.execution.id).toBeDefined()

      // Verify all records were created
      const taskCount = await db.select({ count: count() }).from(tasks)
      const envCount = await db.select({ count: count() }).from(environments)
      const execCount = await db.select({ count: count() }).from(agentExecutions)

      expect(taskCount[0].count).toBe(1)
      expect(envCount[0].count).toBe(1)
      expect(execCount[0].count).toBe(1)
    })

    it('should rollback transaction on error', async () => {
      await expect(
        db.transaction(async (tx) => {
          // Create valid task
          await tx.insert(tasks).values(createTestTask())

          // Create invalid environment (this should fail)
          await tx.insert(environments).values({
            name: 'Test',
            config: null as any, // This should cause an error
            isActive: true,
            userId: 'test',
          })
        })
      ).rejects.toThrow()

      // Verify no records were created due to rollback
      const taskCount = await db.select({ count: count() }).from(tasks)
      const envCount = await db.select({ count: count() }).from(environments)

      expect(taskCount[0].count).toBe(0)
      expect(envCount[0].count).toBe(0)
    })

    it('should handle nested transactions correctly', async () => {
      const result = await db.transaction(async (tx) => {
        const [task] = await tx.insert(tasks).values(createTestTask()).returning()

        // Nested transaction-like operation
        const executions = []
        for (let i = 0; i < 3; i++) {
          const [execution] = await tx
            .insert(agentExecutions)
            .values(createTestExecution(task.id, { agentType: `agent-${i}` }))
            .returning()
          executions.push(execution)
        }

        return { task, executions }
      })

      expect(result.executions).toHaveLength(3)

      // Verify all executions were created
      const executionCount = await db
        .select({ count: count() })
        .from(agentExecutions)
        .where(eq(agentExecutions.taskId, result.task.id))

      expect(executionCount[0].count).toBe(3)
    })
  })

  describe('Advanced Queries and Performance', () => {
    beforeEach(async () => {
      // Create test data for performance tests
      const taskData = Array.from({ length: 10 }, (_, i) =>
        createTestTask({
          title: `Task ${i}`,
          priority: i % 2 === 0 ? 'high' : 'low',
          status: i % 3 === 0 ? 'completed' : i % 3 === 1 ? 'in_progress' : 'pending',
        })
      )

      const [createdTasks] = await Promise.all([db.insert(tasks).values(taskData).returning()])

      // Create executions for some tasks
      const executionData = createdTasks.slice(0, 5).map((task) =>
        createTestExecution(task.id, {
          status: Math.random() > 0.5 ? 'completed' : 'running',
          executionTimeMs: Math.floor(Math.random() * 5000) + 1000,
        })
      )

      await db.insert(agentExecutions).values(executionData)
    })

    it('should execute complex aggregation queries efficiently', async () => {
      const startTime = performance.now()

      const stats = await db
        .select({
          status: tasks.status,
          priority: tasks.priority,
          count: count(),
          avgExecutionTime: sql<number>`AVG(${agentExecutions.executionTimeMs})`,
        })
        .from(tasks)
        .leftJoin(agentExecutions, eq(tasks.id, agentExecutions.taskId))
        .groupBy(tasks.status, tasks.priority)
        .orderBy(tasks.status, tasks.priority)

      const executionTime = performance.now() - startTime

      expect(stats.length).toBeGreaterThan(0)
      expect(executionTime).toBeLessThan(1000) // Should complete within 1 second

      // Verify aggregation results
      const completedTasks = stats.filter((s) => s.status === 'completed')
      expect(completedTasks.length).toBeGreaterThan(0)
    })

    it('should handle pagination efficiently', async () => {
      const pageSize = 5
      const startTime = performance.now()

      // First page
      const firstPage = await db
        .select()
        .from(tasks)
        .orderBy(desc(tasks.createdAt))
        .limit(pageSize)
        .offset(0)

      // Second page
      const secondPage = await db
        .select()
        .from(tasks)
        .orderBy(desc(tasks.createdAt))
        .limit(pageSize)
        .offset(pageSize)

      const executionTime = performance.now() - startTime

      expect(firstPage).toHaveLength(5)
      expect(secondPage).toHaveLength(5)
      expect(executionTime).toBeLessThan(500) // Should be fast

      // Verify no overlap between pages
      const firstPageIds = new Set(firstPage.map((t) => t.id))
      const secondPageIds = new Set(secondPage.map((t) => t.id))
      const intersection = new Set([...firstPageIds].filter((id) => secondPageIds.has(id)))

      expect(intersection.size).toBe(0)
    })

    it('should efficiently query with JSON operations', async () => {
      // Create tasks with complex metadata
      const taskWithMetadata = createTestTask({
        metadata: {
          tags: ['urgent', 'customer-facing'],
          settings: {
            notifications: true,
            priority: 'high',
            assignee: 'user-123',
          },
          history: [
            { action: 'created', timestamp: new Date().toISOString() },
            { action: 'assigned', timestamp: new Date().toISOString() },
          ],
        },
      })

      const [created] = await db.insert(tasks).values(taskWithMetadata).returning()

      // Query using JSON operations
      const tasksWithTag = await db
        .select()
        .from(tasks)
        .where(sql`${tasks.metadata}->>'tags' @> '["urgent"]'`)

      expect(tasksWithTag).toHaveLength(1)
      expect(tasksWithTag[0].id).toBe(created.id)

      // Query nested JSON fields
      const tasksWithNotifications = await db
        .select()
        .from(tasks)
        .where(sql`${tasks.metadata}->'settings'->>'notifications' = 'true'`)

      expect(tasksWithNotifications).toHaveLength(1)
    })
  })

  describe('Vector Operations', () => {
    it('should handle vector embeddings for tasks', async () => {
      // Create task with mock embedding
      const embedding = new Array(1536).fill(0).map(() => Math.random() * 2 - 1)
      const taskData = createTestTask({
        title: 'Vector Test Task',
        embedding,
      })

      const [created] = await db.insert(tasks).values(taskData).returning()

      expect(created.embedding).toBeDefined()
      expect(created.embedding).toHaveLength(1536)

      // Test vector similarity search (cosine similarity)
      const queryEmbedding = new Array(1536).fill(0).map(() => Math.random() * 2 - 1)

      const similarTasks = await db
        .select({
          id: tasks.id,
          title: tasks.title,
          similarity: sql<number>`1 - (${tasks.embedding} <=> ${queryEmbedding}::vector) as similarity`,
        })
        .from(tasks)
        .where(sql`${tasks.embedding} IS NOT NULL`)
        .orderBy(sql`${tasks.embedding} <=> ${queryEmbedding}::vector`)
        .limit(5)

      expect(similarTasks).toHaveLength(1)
      expect(similarTasks[0].similarity).toBeGreaterThan(0)
      expect(similarTasks[0].similarity).toBeLessThanOrEqual(1)
    })

    it('should handle agent memory with vector embeddings', async () => {
      const memoryData: NewAgentMemory[] = [
        {
          agentType: 'test-agent',
          contextKey: 'user-preferences',
          content: 'User prefers dark mode and high contrast',
          embedding: new Array(1536).fill(0).map(() => Math.random() * 2 - 1),
          importance: 8,
          metadata: { source: 'user-interaction' },
        },
        {
          agentType: 'test-agent',
          contextKey: 'technical-knowledge',
          content: 'User is experienced with React and TypeScript',
          embedding: new Array(1536).fill(0).map(() => Math.random() * 2 - 1),
          importance: 6,
          metadata: { source: 'code-analysis' },
        },
      ]

      await db.insert(agentMemory).values(memoryData)

      // Query memory by importance
      const importantMemories = await db
        .select()
        .from(agentMemory)
        .where(sql`${agentMemory.importance} >= 7`)
        .orderBy(desc(agentMemory.importance))

      expect(importantMemories).toHaveLength(1)
      expect(importantMemories[0].contextKey).toBe('user-preferences')

      // Update access count and timestamp
      await db
        .update(agentMemory)
        .set({
          accessCount: sql`${agentMemory.accessCount} + 1`,
          lastAccessedAt: new Date(),
        })
        .where(eq(agentMemory.contextKey, 'user-preferences'))

      const updated = await db
        .select()
        .from(agentMemory)
        .where(eq(agentMemory.contextKey, 'user-preferences'))

      expect(updated[0].accessCount).toBe(1)
    })
  })

  describe('Workflow Management', () => {
    beforeEach(async () => {
      const workflowData: NewWorkflow = {
        name: 'Test Workflow',
        definition: {
          steps: [
            { id: 'step1', type: 'action', config: { action: 'validate-input' } },
            { id: 'step2', type: 'condition', config: { condition: 'input.valid === true' } },
            { id: 'step3', type: 'action', config: { action: 'process-data' } },
          ],
          metadata: { version: '1.0', author: 'test-user' },
        },
        version: 1,
        isActive: true,
        description: 'Test workflow for validation',
      }

      const [workflow] = await db.insert(workflows).values(workflowData).returning()
      testWorkflowId = workflow.id
    })

    it('should create and manage workflow executions', async () => {
      const executionData: NewWorkflowExecution = {
        workflowId: testWorkflowId,
        status: 'running',
        currentStep: 1,
        totalSteps: 3,
        state: {
          input: { data: 'test-data' },
          variables: { processed: false },
          stepResults: [],
        },
        triggeredBy: 'test-user',
      }

      const [execution] = await db.insert(workflowExecutions).values(executionData).returning()

      expect(execution.workflowId).toBe(testWorkflowId)
      expect(execution.status).toBe('running')
      expect(execution.currentStep).toBe(1)

      // Update execution progress
      const updatedState = {
        ...execution.state,
        variables: { processed: true },
        stepResults: [{ step: 1, result: 'validation-passed' }],
      }

      const [updated] = await db
        .update(workflowExecutions)
        .set({
          currentStep: 2,
          state: updatedState,
        })
        .where(eq(workflowExecutions.id, execution.id))
        .returning()

      expect(updated.currentStep).toBe(2)
      expect(updated.state.variables.processed).toBe(true)
    })

    it('should handle workflow execution hierarchy', async () => {
      // Create parent execution
      const parentExecution = await db
        .insert(workflowExecutions)
        .values({
          workflowId: testWorkflowId,
          status: 'running',
          currentStep: 1,
          totalSteps: 3,
          state: { type: 'parent' },
          triggeredBy: 'test-user',
        })
        .returning()

      // Create child execution
      const childExecution = await db
        .insert(workflowExecutions)
        .values({
          workflowId: testWorkflowId,
          status: 'running',
          currentStep: 1,
          totalSteps: 2,
          state: { type: 'child', parentId: parentExecution[0].id },
          triggeredBy: 'system',
          parentExecutionId: parentExecution[0].id,
        })
        .returning()

      // Query parent with children
      const parentWithChildren = await db
        .select({
          parentId: sql<string>`parent.id`,
          parentStatus: sql<string>`parent.status`,
          childId: sql<string>`child.id`,
          childStatus: sql<string>`child.status`,
        })
        .from(workflowExecutions.as('parent'))
        .leftJoin(workflowExecutions.as('child'), sql`parent.id = child.parent_execution_id`)
        .where(eq(sql`parent.id`, parentExecution[0].id))

      expect(parentWithChildren).toHaveLength(1)
      expect(parentWithChildren[0].childId).toBe(childExecution[0].id)
    })
  })

  describe('Performance and Stress Tests', () => {
    it('should handle bulk operations efficiently', async () => {
      const bulkSize = 100
      const startTime = performance.now()

      // Create bulk task data
      const bulkTasks = Array.from({ length: bulkSize }, (_, i) =>
        createTestTask({
          title: `Bulk Task ${i}`,
          metadata: { bulkIndex: i, batchId: 'test-batch-001' },
        })
      )

      // Bulk insert
      await db.insert(tasks).values(bulkTasks)

      const insertTime = performance.now() - startTime

      // Bulk query
      const queryStartTime = performance.now()
      const insertedTasks = await db
        .select()
        .from(tasks)
        .where(sql`${tasks.metadata}->>'batchId' = 'test-batch-001'`)

      const queryTime = performance.now() - queryStartTime

      expect(insertedTasks).toHaveLength(bulkSize)
      expect(insertTime).toBeLessThan(5000) // Bulk insert should be fast
      expect(queryTime).toBeLessThan(1000) // Bulk query should be fast

      // Bulk update
      const updateStartTime = performance.now()
      await db
        .update(tasks)
        .set({ status: 'bulk_processed' })
        .where(sql`${tasks.metadata}->>'batchId' = 'test-batch-001'`)

      const updateTime = performance.now() - updateStartTime
      expect(updateTime).toBeLessThan(2000) // Bulk update should be fast
    })

    it('should maintain performance with concurrent operations', async () => {
      const concurrentOps = 10
      const startTime = performance.now()

      // Run concurrent operations
      const operations = Array.from({ length: concurrentOps }, async (_, i) => {
        const [task] = await db
          .insert(tasks)
          .values(createTestTask({ title: `Concurrent Task ${i}` }))
          .returning()

        const [execution] = await db
          .insert(agentExecutions)
          .values(createTestExecution(task.id, { agentType: `concurrent-agent-${i}` }))
          .returning()

        await db.insert(observabilityEvents).values({
          executionId: execution.id,
          eventType: 'concurrent.test',
          data: { index: i },
          severity: 'info',
          category: 'test',
        })

        return { task, execution }
      })

      const results = await Promise.all(operations)
      const totalTime = performance.now() - startTime

      expect(results).toHaveLength(concurrentOps)
      expect(totalTime).toBeLessThan(10000) // Should handle concurrent ops within 10 seconds

      // Verify all operations completed successfully
      const taskCount = await db.select({ count: count() }).from(tasks)
      const executionCount = await db.select({ count: count() }).from(agentExecutions)
      const eventCount = await db.select({ count: count() }).from(observabilityEvents)

      expect(taskCount[0].count).toBe(concurrentOps)
      expect(executionCount[0].count).toBe(concurrentOps)
      expect(eventCount[0].count).toBe(concurrentOps)
    })
  })
})
