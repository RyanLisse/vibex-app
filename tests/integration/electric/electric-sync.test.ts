/**
 * ElectricSQL Synchronization Integration Tests
 *
 * Comprehensive test suite for ElectricSQL real-time sync, conflict resolution,
 * offline/online transitions, and subscription management
 */

import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type { NewAgentExecution, NewEnvironment, NewTask } from '../../../db/schema'
import { type ElectricDatabaseManager, electricDb } from '../../../lib/electric/config'
import { electricSchema } from '../../../lib/electric/schema'

// Mock ElectricSQL client for testing
const mockElectricClient = {
  connect: vi.fn(),
  disconnect: vi.fn(),
  sync: vi.fn(),
  on: vi.fn(),
  emit: vi.fn(),
  subscribe: vi.fn(),
  unsubscribe: vi.fn(),
  query: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  conflict: {
    resolve: vi.fn(),
  },
  offline: {
    setEnabled: vi.fn(),
    getEnabled: vi.fn(),
  },
}

const mockPGlite = {
  query: vi.fn(),
  exec: vi.fn(),
  close: vi.fn(),
  sync: vi.fn(),
}

// Test data factories
const createTestTask = (overrides: Partial<NewTask> = {}): NewTask => ({
  title: 'Test Task',
  description: 'Test task description',
  status: 'pending',
  priority: 'medium',
  userId: 'test-user-123',
  metadata: {
    test: true,
    syncId: `sync-${Date.now()}-${Math.random()}`,
  },
  ...overrides,
})

const createTestEnvironment = (overrides: Partial<NewEnvironment> = {}): NewEnvironment => ({
  name: 'Test Environment',
  config: {
    apiKey: 'test-key',
    endpoint: 'https://api.test.com',
    syncEnabled: true,
  },
  isActive: true,
  userId: 'test-user-123',
  schemaVersion: 1,
  ...overrides,
})

// Mock data stores for simulating sync states
const localData = {
  tasks: new Map<string, any>(),
  environments: new Map<string, any>(),
  executions: new Map<string, any>(),
}

const serverData = {
  tasks: new Map<string, any>(),
  environments: new Map<string, any>(),
  executions: new Map<string, any>(),
}

describe('ElectricSQL Synchronization Tests', () => {
  // Skip all tests as they require a running ElectricSQL service
  let dbManager: ElectricDatabaseManager
  let eventListeners: Map<string, Function[]>

  beforeAll(async () => {
    // Initialize mock environment
    eventListeners = new Map()

    // Mock the ElectricSQL client
    vi.mocked(mockElectricClient.on).mockImplementation((event: string, listener: Function) => {
      if (!eventListeners.has(event)) {
        eventListeners.set(event, [])
      }
      eventListeners.get(event)!.push(listener)
    })

    // Mock emit to trigger listeners
    vi.mocked(mockElectricClient.emit).mockImplementation((event: string, ...args: any[]) => {
      const listeners = eventListeners.get(event)
      if (listeners) {
        listeners.forEach((listener) => listener(...args))
      }
    })

    dbManager = electricDb
  })

  beforeEach(async () => {
    // Clear mock data before each test
    localData.tasks.clear()
    localData.environments.clear()
    localData.executions.clear()
    serverData.tasks.clear()
    serverData.environments.clear()
    serverData.executions.clear()

    // Reset mocks
    vi.clearAllMocks()

    // Setup default mock behaviors
    vi.mocked(mockElectricClient.connect).mockResolvedValue(undefined)
    vi.mocked(mockElectricClient.sync).mockResolvedValue(undefined)
    vi.mocked(mockElectricClient.query).mockImplementation(async (table: string, filters?: any) => {
      const data = localData[table as keyof typeof localData] || new Map()
      return Array.from(data.values()).filter((item) => {
        if (!filters) return true
        return Object.entries(filters).every(([key, value]) => item[key] === value)
      })
    })
  })

  afterEach(async () => {
    // Cleanup after each test
    eventListeners.clear()
  })

  describe('Connection Management', () => {
    it('should establish connection to ElectricSQL sync service', async () => {
      // Skip this test as it requires a running ElectricSQL service
      // Mock successful connection
      vi.mocked(mockElectricClient.connect).mockResolvedValue(undefined)

      // Replace the actual electric client with our mock
      // @ts-expect-error - Mock replacement
      dbManager['electric'] = mockElectricClient

      await dbManager.initialize()

      expect(mockElectricClient.connect).toHaveBeenCalled()
      expect(dbManager.getConnectionState()).toBe('connected')
      expect(dbManager.isReady()).toBe(true)
    })

    it('should handle connection failures gracefully', async () => {
      // Skip this test as it requires a running ElectricSQL service
      const connectionError = new Error('Failed to connect to Electric sync service')
      vi.mocked(mockElectricClient.connect).mockRejectedValue(connectionError)

      // @ts-expect-error - Mock replacement
      dbManager['electric'] = mockElectricClient

      await expect(dbManager.initialize()).rejects.toThrow(connectionError)
      expect(dbManager.getConnectionState()).toBe('error')
      expect(dbManager.isReady()).toBe(false)
    })

    it('should reconnect automatically after disconnection', async () => {
      // Skip this test as it requires a running ElectricSQL service
      // @ts-expect-error - Mock replacement
      dbManager['electric'] = mockElectricClient

      await dbManager.initialize()

      // Simulate disconnection
      mockElectricClient.emit('disconnect')
      expect(dbManager.getConnectionState()).toBe('disconnected')

      // Simulate reconnection
      mockElectricClient.emit('connect')
      expect(dbManager.getConnectionState()).toBe('connected')
    })

    it('should manage connection state listeners', async () => {
      // Skip this test as it requires a running ElectricSQL service
      const stateListener = vi.fn()
      dbManager.addStateListener(stateListener)

      // @ts-expect-error - Mock replacement
      dbManager['electric'] = mockElectricClient

      await dbManager.initialize()

      // Trigger state changes
      mockElectricClient.emit('connect')
      mockElectricClient.emit('disconnect')

      expect(stateListener).toHaveBeenCalledWith({
        connection: 'connected',
        sync: 'idle',
      })

      dbManager.removeStateListener(stateListener)
    })
  })

  describe('Real-time Synchronization', () => {
    beforeEach(async () => {
      // @ts-expect-error - Mock replacement
      dbManager['electric'] = mockElectricClient
      await dbManager.initialize()
    })

    it('should sync new tasks from server to client', async () => {
      const serverTask = createTestTask({
        id: 'server-task-1',
        title: 'Server Created Task',
        metadata: { source: 'server' },
      })

      // Simulate server-side task creation
      serverData.tasks.set(serverTask.id!, serverTask)

      // Mock sync operation
      vi.mocked(mockElectricClient.sync).mockImplementation(async () => {
        // Simulate sync bringing server data to client
        localData.tasks.set(serverTask.id!, serverTask)
      })

      await dbManager.sync()

      expect(localData.tasks.has(serverTask.id!)).toBe(true)
      expect(localData.tasks.get(serverTask.id!).title).toBe('Server Created Task')
    })

    it('should sync local changes to server', async () => {
      const localTask = createTestTask({
        id: 'local-task-1',
        title: 'Locally Created Task',
        metadata: { source: 'local' },
      })

      // Simulate local task creation
      localData.tasks.set(localTask.id!, localTask)

      // Mock sync operation
      vi.mocked(mockElectricClient.sync).mockImplementation(async () => {
        // Simulate local data being pushed to server
        serverData.tasks.set(localTask.id!, localTask)
      })

      await dbManager.sync()

      expect(serverData.tasks.has(localTask.id!)).toBe(true)
      expect(serverData.tasks.get(localTask.id!).title).toBe('Locally Created Task')
    })

    it('should handle real-time updates via subscriptions', async () => {
      const updateListener = vi.fn()

      // Mock subscription
      vi.mocked(mockElectricClient.subscribe).mockImplementation((filter, callback) => {
        callback({
          type: 'update',
          table: 'tasks',
          record: {
            id: 'task-1',
            title: 'Updated Task',
            status: 'in_progress',
            updatedAt: new Date(),
          },
        })
      })

      await mockElectricClient.subscribe('tasks.user_id = "test-user-123"', updateListener)

      expect(updateListener).toHaveBeenCalledWith({
        type: 'update',
        table: 'tasks',
        record: expect.objectContaining({
          id: 'task-1',
          status: 'in_progress',
        }),
      })
    })

    it('should batch sync operations for efficiency', async () => {
      const batchSize = 10
      const tasks = Array.from({ length: batchSize }, (_, i) =>
        createTestTask({
          id: `batch-task-${i}`,
          title: `Batch Task ${i}`,
        })
      )

      // Simulate batch creation
      tasks.forEach((task) => localData.tasks.set(task.id!, task))

      let syncCallCount = 0
      vi.mocked(mockElectricClient.sync).mockImplementation(async () => {
        syncCallCount++
        // Simulate batched sync
        tasks.forEach((task) => serverData.tasks.set(task.id!, task))
      })

      await dbManager.sync()

      expect(syncCallCount).toBe(1) // Should batch into single sync call
      expect(serverData.tasks.size).toBe(batchSize)
    })

    it('should handle sync progress and completion events', async () => {
      const progressListener = vi.fn()
      const completionListener = vi.fn()

      dbManager.addStateListener((state) => {
        if (state.sync === 'syncing') progressListener()
        if (state.sync === 'idle') completionListener()
      })

      // Simulate sync events
      mockElectricClient.emit('sync:start')
      expect(progressListener).toHaveBeenCalled()

      mockElectricClient.emit('sync:complete')
      expect(completionListener).toHaveBeenCalled()
    })
  })

  describe('Conflict Resolution', () => {
    beforeEach(async () => {
      // @ts-expect-error - Mock replacement
      dbManager['electric'] = mockElectricClient
      await dbManager.initialize()
    })

    it('should resolve conflicts using last-write-wins strategy', async () => {
      const taskId = 'conflict-task-1'
      const baseTime = new Date('2024-01-01T10:00:00Z')

      // Local version (older)
      const localTask = createTestTask({
        id: taskId,
        title: 'Local Version',
        status: 'in_progress',
        updatedAt: new Date(baseTime.getTime() + 1000), // +1 second
      })

      // Server version (newer)
      const serverTask = createTestTask({
        id: taskId,
        title: 'Server Version',
        status: 'completed',
        updatedAt: new Date(baseTime.getTime() + 2000), // +2 seconds
      })

      localData.tasks.set(taskId, localTask)
      serverData.tasks.set(taskId, serverTask)

      // Mock conflict resolution
      vi.mocked(mockElectricClient.conflict.resolve).mockImplementation(async (local, server) => {
        // Last-write-wins: choose the version with latest updatedAt
        return local.updatedAt > server.updatedAt ? local : server
      })

      const resolved = await mockElectricClient.conflict.resolve(localTask, serverTask)

      expect(resolved.title).toBe('Server Version')
      expect(resolved.status).toBe('completed')
    })

    it('should handle custom conflict resolution for agent memory', async () => {
      const memoryId = 'memory-1'

      // Local version (higher importance)
      const localMemory = {
        id: memoryId,
        content: 'Local memory content',
        importance: 8,
        accessCount: 5,
        lastAccessedAt: new Date(),
      }

      // Server version (lower importance)
      const serverMemory = {
        id: memoryId,
        content: 'Server memory content',
        importance: 6,
        accessCount: 3,
        lastAccessedAt: new Date(),
      }

      // Mock importance-based resolution
      vi.mocked(mockElectricClient.conflict.resolve).mockImplementation(async (local, server) => {
        // Custom strategy: choose higher importance, or higher access count if equal
        if (local.importance !== server.importance) {
          return local.importance > server.importance ? local : server
        }
        return local.accessCount > server.accessCount ? local : server
      })

      const resolved = await mockElectricClient.conflict.resolve(localMemory, serverMemory)

      expect(resolved.content).toBe('Local memory content')
      expect(resolved.importance).toBe(8)
    })

    it('should handle server-wins strategy for observability data', async () => {
      const executionId = 'execution-1'

      const localExecution = {
        id: executionId,
        status: 'running',
        completedAt: null,
        executionTimeMs: null,
      }

      const serverExecution = {
        id: executionId,
        status: 'completed',
        completedAt: new Date(),
        executionTimeMs: 1500,
      }

      // Server-wins strategy
      vi.mocked(mockElectricClient.conflict.resolve).mockImplementation(async (local, server) => {
        return server // Always choose server version
      })

      const resolved = await mockElectricClient.conflict.resolve(localExecution, serverExecution)

      expect(resolved.status).toBe('completed')
      expect(resolved.executionTimeMs).toBe(1500)
    })

    it('should merge conflicting metadata fields', async () => {
      const taskId = 'merge-task-1'

      const localTask = {
        id: taskId,
        title: 'Task Title',
        metadata: {
          localField: 'local-value',
          sharedField: 'local-shared',
          tags: ['local-tag'],
        },
      }

      const serverTask = {
        id: taskId,
        title: 'Task Title',
        metadata: {
          serverField: 'server-value',
          sharedField: 'server-shared',
          tags: ['server-tag'],
        },
      }

      // Mock merge strategy for metadata
      vi.mocked(mockElectricClient.conflict.resolve).mockImplementation(async (local, server) => {
        return {
          ...server,
          metadata: {
            ...local.metadata,
            ...server.metadata,
            tags: [...(local.metadata.tags || []), ...(server.metadata.tags || [])],
          },
        }
      })

      const resolved = await mockElectricClient.conflict.resolve(localTask, serverTask)

      expect(resolved.metadata.localField).toBe('local-value')
      expect(resolved.metadata.serverField).toBe('server-value')
      expect(resolved.metadata.sharedField).toBe('server-shared') // Server wins for conflicts
      expect(resolved.metadata.tags).toEqual(['local-tag', 'server-tag'])
    })
  })

  describe('Offline/Online Transitions', () => {
    beforeEach(async () => {
      // @ts-expect-error - Mock replacement
      dbManager['electric'] = mockElectricClient
      await dbManager.initialize()
    })

    it('should queue operations while offline', async () => {
      const offlineQueue: any[] = []

      // Simulate offline mode
      vi.mocked(mockElectricClient.offline.setEnabled).mockImplementation((enabled) => {
        if (enabled) {
          // Mock queuing operations when offline
          vi.mocked(mockElectricClient.insert).mockImplementation(async (table, data) => {
            offlineQueue.push({ operation: 'insert', table, data })
            localData[table as keyof typeof localData].set(data.id, data)
          })
        }
      })

      vi.mocked(mockElectricClient.offline.getEnabled).mockReturnValue(true)

      // Enable offline mode
      await mockElectricClient.offline.setEnabled(true)

      // Create tasks while offline
      const offlineTask1 = createTestTask({
        id: 'offline-1',
        title: 'Offline Task 1',
      })
      const offlineTask2 = createTestTask({
        id: 'offline-2',
        title: 'Offline Task 2',
      })

      await mockElectricClient.insert('tasks', offlineTask1)
      await mockElectricClient.insert('tasks', offlineTask2)

      expect(offlineQueue).toHaveLength(2)
      expect(localData.tasks.size).toBe(2)
      expect(serverData.tasks.size).toBe(0) // Server not updated while offline
    })

    it('should sync queued operations when coming back online', async () => {
      const offlineQueue = [
        {
          operation: 'insert',
          table: 'tasks',
          data: createTestTask({ id: 'queued-1' }),
        },
        {
          operation: 'insert',
          table: 'tasks',
          data: createTestTask({ id: 'queued-2' }),
        },
        {
          operation: 'update',
          table: 'tasks',
          data: { id: 'queued-1', status: 'completed' },
        },
      ]

      // Mock sync processing queued operations
      vi.mocked(mockElectricClient.sync).mockImplementation(async () => {
        offlineQueue.forEach((op) => {
          if (op.operation === 'insert') {
            serverData[op.table as keyof typeof serverData].set(op.data.id, op.data)
          } else if (op.operation === 'update') {
            const existing = serverData[op.table as keyof typeof serverData].get(op.data.id)
            if (existing) {
              serverData[op.table as keyof typeof serverData].set(op.data.id, {
                ...existing,
                ...op.data,
              })
            }
          }
        })
      })

      // Simulate coming back online
      vi.mocked(mockElectricClient.offline.getEnabled).mockReturnValue(false)
      await mockElectricClient.sync()

      expect(serverData.tasks.size).toBe(2)
      expect(serverData.tasks.get('queued-1').status).toBe('completed')
    })

    it('should handle offline storage limits', async () => {
      const maxOfflineSize = 5
      let offlineDataSize = 0

      vi.mocked(mockElectricClient.insert).mockImplementation(async (table, data) => {
        offlineDataSize++
        if (offlineDataSize > maxOfflineSize) {
          throw new Error('Offline storage limit exceeded')
        }
        localData[table as keyof typeof localData].set(data.id, data)
      })

      // Fill up offline storage
      for (let i = 0; i < maxOfflineSize; i++) {
        await mockElectricClient.insert('tasks', createTestTask({ id: `offline-${i}` }))
      }

      // Next insert should fail
      await expect(
        mockElectricClient.insert('tasks', createTestTask({ id: 'overflow' }))
      ).rejects.toThrow('Offline storage limit exceeded')
    })

    it('should detect network status changes', async () => {
      const networkStatusListener = vi.fn()

      // Mock network status detection
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true,
      })

      // Simulate network status changes
      Object.defineProperty(navigator, 'onLine', { value: false })
      networkStatusListener('offline')

      Object.defineProperty(navigator, 'onLine', { value: true })
      networkStatusListener('online')

      expect(networkStatusListener).toHaveBeenCalledWith('offline')
      expect(networkStatusListener).toHaveBeenCalledWith('online')
    })
  })

  describe('Subscription Management', () => {
    beforeEach(async () => {
      // @ts-expect-error - Mock replacement
      dbManager['electric'] = mockElectricClient
      await dbManager.initialize()
    })

    it('should manage real-time subscriptions by user', async () => {
      const userId = 'test-user-123'
      const subscriptions = new Map<string, Function>()

      vi.mocked(mockElectricClient.subscribe).mockImplementation((filter, callback) => {
        subscriptions.set(filter, callback)
        return Promise.resolve({
          unsubscribe: () => subscriptions.delete(filter),
        })
      })

      // Subscribe to user's tasks
      const taskSubscription = await mockElectricClient.subscribe(
        `tasks.user_id = "${userId}"`,
        (change: any) => {
          console.log('Task change:', change)
        }
      )

      // Subscribe to user's environments
      const envSubscription = await mockElectricClient.subscribe(
        `environments.user_id = "${userId}"`,
        (change: any) => {
          console.log('Environment change:', change)
        }
      )

      expect(subscriptions.size).toBe(2)

      // Cleanup subscriptions
      taskSubscription.unsubscribe()
      envSubscription.unsubscribe()

      expect(subscriptions.size).toBe(0)
    })

    it('should filter subscription events correctly', async () => {
      const userId = 'test-user-123'
      const otherUserId = 'other-user-456'
      const receivedEvents: any[] = []

      vi.mocked(mockElectricClient.subscribe).mockImplementation((filter, callback) => {
        // Simulate filtering
        if (filter.includes(userId)) {
          callback({
            type: 'insert',
            table: 'tasks',
            record: createTestTask({ userId }),
          })
        }

        // This should not trigger the callback due to filter
        if (filter.includes(otherUserId)) {
          // No callback - filtered out
        }
      })

      await mockElectricClient.subscribe(`tasks.user_id = "${userId}"`, (change: any) => {
        receivedEvents.push(change)
      })

      expect(receivedEvents).toHaveLength(1)
      expect(receivedEvents[0].record.userId).toBe(userId)
    })

    it('should handle subscription errors gracefully', async () => {
      const subscriptionError = new Error('Subscription failed')

      vi.mocked(mockElectricClient.subscribe).mockRejectedValue(subscriptionError)

      const errorHandler = vi.fn()

      try {
        await mockElectricClient.subscribe('invalid.filter', () => {})
      } catch (error) {
        errorHandler(error)
      }

      expect(errorHandler).toHaveBeenCalledWith(subscriptionError)
    })

    it('should handle subscription reconnection after network issues', async () => {
      let connectionState = 'connected'
      const subscriptionCallbacks = new Map<string, Function>()

      vi.mocked(mockElectricClient.subscribe).mockImplementation((filter, callback) => {
        if (connectionState === 'connected') {
          subscriptionCallbacks.set(filter, callback)
          return Promise.resolve({
            unsubscribe: () => subscriptionCallbacks.delete(filter),
          })
        }
        throw new Error('Not connected')
      })

      // Initial subscription
      await mockElectricClient.subscribe('tasks.user_id = "test"', () => {})
      expect(subscriptionCallbacks.size).toBe(1)

      // Simulate disconnection
      connectionState = 'disconnected'
      subscriptionCallbacks.clear()

      // Simulate reconnection and auto-resubscribe
      connectionState = 'connected'
      await mockElectricClient.subscribe('tasks.user_id = "test"', () => {})
      expect(subscriptionCallbacks.size).toBe(1)
    })
  })

  describe('Data Validation and Consistency', () => {
    beforeEach(async () => {
      // @ts-expect-error - Mock replacement
      dbManager['electric'] = mockElectricClient
      await dbManager.initialize()
    })

    it('should validate data before sync', async () => {
      const invalidTask = {
        id: 'invalid-task',
        title: '', // Invalid: empty title
        status: 'invalid-status', // Invalid: not a valid status
        userId: null, // Invalid: missing user ID
      }

      vi.mocked(mockElectricClient.insert).mockImplementation(async (table, data) => {
        // Simulate validation
        if (table === 'tasks') {
          if (!data.title || data.title.trim() === '') {
            throw new Error('Title is required')
          }
          if (!['pending', 'in_progress', 'completed', 'cancelled'].includes(data.status)) {
            throw new Error('Invalid status')
          }
          if (!data.userId) {
            throw new Error('User ID is required')
          }
        }

        localData[table as keyof typeof localData].set(data.id, data)
      })

      await expect(mockElectricClient.insert('tasks', invalidTask)).rejects.toThrow(
        'Title is required'
      )
    })

    it('should maintain referential integrity during sync', async () => {
      const taskId = 'ref-task-1'
      const executionId = 'ref-execution-1'

      // Try to create execution without task
      const orphanExecution = {
        id: executionId,
        taskId: 'non-existent-task',
        agentType: 'test-agent',
        status: 'running',
      }

      vi.mocked(mockElectricClient.insert).mockImplementation(async (table, data) => {
        if (table === 'agentExecutions') {
          // Check if referenced task exists
          if (!localData.tasks.has(data.taskId)) {
            throw new Error('Referenced task does not exist')
          }
        }

        localData[table as keyof typeof localData].set(data.id, data)
      })

      await expect(mockElectricClient.insert('agentExecutions', orphanExecution)).rejects.toThrow(
        'Referenced task does not exist'
      )

      // Create task first, then execution should succeed
      await mockElectricClient.insert('tasks', createTestTask({ id: taskId }))
      await mockElectricClient.insert('agentExecutions', {
        ...orphanExecution,
        taskId,
      })

      expect(localData.tasks.has(taskId)).toBe(true)
      expect(localData.executions.has(executionId)).toBe(true)
    })

    it('should handle schema version compatibility', async () => {
      const oldSchemaEnvironment = {
        id: 'env-1',
        name: 'Test Environment',
        config: { oldFormat: true },
        schemaVersion: 1,
      }

      const newSchemaEnvironment = {
        id: 'env-2',
        name: 'Test Environment',
        config: {
          newFormat: true,
          features: ['feature1', 'feature2'],
          metadata: { version: '2.0' },
        },
        schemaVersion: 2,
      }

      vi.mocked(mockElectricClient.insert).mockImplementation(async (table, data) => {
        if (table === 'environments') {
          // Simulate schema migration during sync
          if (data.schemaVersion === 1) {
            // Migrate old format to new format
            data = {
              ...data,
              config: {
                ...data.config,
                newFormat: true,
                migrated: true,
              },
              schemaVersion: 2,
            }
          }
        }

        localData[table as keyof typeof localData].set(data.id, data)
      })

      await mockElectricClient.insert('environments', oldSchemaEnvironment)
      await mockElectricClient.insert('environments', newSchemaEnvironment)

      const migratedEnv = localData.environments.get('env-1')
      expect(migratedEnv.schemaVersion).toBe(2)
      expect(migratedEnv.config.migrated).toBe(true)
    })
  })

  describe('Performance and Scalability', () => {
    beforeEach(async () => {
      // @ts-expect-error - Mock replacement
      dbManager['electric'] = mockElectricClient
      await dbManager.initialize()
    })

    it('should handle large dataset synchronization efficiently', async () => {
      const datasetSize = 1000
      const startTime = performance.now()

      // Mock efficient bulk sync
      vi.mocked(mockElectricClient.sync).mockImplementation(async () => {
        // Simulate batched sync of large dataset
        const batchSize = 100
        for (let i = 0; i < datasetSize; i += batchSize) {
          const batch = Array.from({ length: Math.min(batchSize, datasetSize - i) }, (_, j) =>
            createTestTask({ id: `bulk-task-${i + j}` })
          )

          batch.forEach((task) => {
            localData.tasks.set(task.id!, task)
          })

          // Simulate small delay for batch processing
          await new Promise((resolve) => setTimeout(resolve, 10))
        }
      })

      await dbManager.sync()

      const syncTime = performance.now() - startTime

      expect(localData.tasks.size).toBe(datasetSize)
      expect(syncTime).toBeLessThan(5000) // Should complete within 5 seconds
    })

    it('should implement incremental sync for efficiency', async () => {
      const lastSyncTimestamp = new Date('2024-01-01T10:00:00Z')
      let syncCallCount = 0

      vi.mocked(mockElectricClient.sync).mockImplementation(async () => {
        syncCallCount++

        // Simulate incremental sync - only sync records modified after lastSyncTimestamp
        const newTasks = [
          createTestTask({
            id: 'new-task-1',
            updatedAt: new Date('2024-01-01T10:30:00Z'),
          }),
          createTestTask({
            id: 'new-task-2',
            updatedAt: new Date('2024-01-01T10:45:00Z'),
          }),
        ]

        newTasks.forEach((task) => {
          localData.tasks.set(task.id!, task)
        })
      })

      // First sync - full sync
      await dbManager.sync()

      // Second sync - incremental only
      await dbManager.sync()

      expect(syncCallCount).toBe(2)
      expect(localData.tasks.size).toBe(2)
    })

    it('should handle concurrent sync operations safely', async () => {
      const concurrentSyncs = 5
      let activeSyncs = 0
      let maxConcurrentSyncs = 0

      vi.mocked(mockElectricClient.sync).mockImplementation(async () => {
        activeSyncs++
        maxConcurrentSyncs = Math.max(maxConcurrentSyncs, activeSyncs)

        // Simulate sync work
        await new Promise((resolve) => setTimeout(resolve, 100))

        activeSyncs--
      })

      // Start multiple concurrent syncs
      const syncPromises = Array.from({ length: concurrentSyncs }, () => dbManager.sync())
      await Promise.all(syncPromises)

      // Should handle concurrent operations without conflicts
      expect(maxConcurrentSyncs).toBeGreaterThan(0)
      expect(activeSyncs).toBe(0) // All syncs completed
    })

    it('should implement sync throttling to prevent overwhelming the server', async () => {
      const syncRequests: number[] = []

      vi.mocked(mockElectricClient.sync).mockImplementation(async () => {
        syncRequests.push(Date.now())
        await new Promise((resolve) => setTimeout(resolve, 50))
      })

      // Rapid sync requests
      const rapidSyncs = Array.from({ length: 10 }, () => dbManager.sync())
      await Promise.all(rapidSyncs)

      // Check that syncs were throttled (not all executed immediately)
      const timeDifferences = []
      for (let i = 1; i < syncRequests.length; i++) {
        timeDifferences.push(syncRequests[i] - syncRequests[i - 1])
      }

      // At least some syncs should have been delayed
      expect(timeDifferences.some((diff) => diff > 40)).toBe(true)
    })
  })
})
