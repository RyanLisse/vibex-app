/**
 * Real-time Sync Integration Tests
 *
 * Tests the complete real-time synchronization flow including ElectricSQL (mocked),
 * WebSocket events, conflict resolution, and offline queue processing
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Task } from '@/db/schema'
import { useElectricSync } from '@/hooks/use-electric-sync'
import { useOfflineQueue } from '@/hooks/use-offline-queue'
import { electricDb } from '@/lib/electric/config'
import type { ConflictResolution, SyncEvent } from '@/lib/electric/types'
import { useTask, useTasks } from '@/lib/query/hooks'

// Mock ElectricSQL
vi.mock('@/lib/electric/config', () => ({
  electricDb: {
    isReady: vi.fn(),
    getConnectionState: vi.fn(),
    executeRealtimeOperation: vi.fn(),
    handleConflict: vi.fn(),
    queueOfflineOperation: vi.fn(),
    processOfflineQueue: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    subscribeToTable: vi.fn(),
    unsubscribeFromTable: vi.fn(),
    getLocalVersion: vi.fn(),
    syncWithRemote: vi.fn(),
  },
}))

// Mock WebSocket for real-time events
class MockWebSocket {
  url: string
  readyState = 0
  onopen: ((event: Event) => void) | null = null
  onmessage: ((event: MessageEvent) => void) | null = null
  onerror: ((event: Event) => void) | null = null
  onclose: ((event: CloseEvent) => void) | null = null

  constructor(url: string) {
    this.url = url
    setTimeout(() => {
      this.readyState = 1
      this.onopen?.(new Event('open'))
    }, 10)
  }

  send(data: string) {
    // Mock server echo
    setTimeout(() => {
      this.onmessage?.(new MessageEvent('message', { data }))
    }, 5)
  }

  close() {
    this.readyState = 3
    this.onclose?.(new CloseEvent('close'))
  }
}

global.WebSocket = MockWebSocket as any

// Test wrapper
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  })

  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children)
}

// Test data factory
function createMockTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-' + Math.random().toString(36).substr(2, 9),
    title: 'Test Task',
    description: 'Test Description',
    status: 'pending',
    priority: 'medium',
    createdAt: new Date(),
    updatedAt: new Date(),
    completedAt: null,
    dueDate: null,
    assignee: null,
    tags: [],
    metadata: {},
    userId: 'test-user',
    version: 1,
    ...overrides,
  }
}

describe('Real-time Sync Integration', () => {
  const mockElectricDb = vi.mocked(electricDb)

  beforeEach(() => {
    vi.clearAllMocks()
    navigator.onLine = true
    mockElectricDb.isReady.mockReturnValue(true)
    mockElectricDb.getConnectionState.mockReturnValue('connected')
  })

  describe('Real-time Task Synchronization', () => {
    it('should sync task creation across multiple clients', async () => {
      const wrapper = createWrapper()

      // Simulate two clients
      const { result: client1 } = renderHook(
        () => {
          const sync = useElectricSync()
          const tasks = useTasks()
          return { sync, tasks }
        },
        { wrapper }
      )

      const { result: client2 } = renderHook(
        () => {
          const sync = useElectricSync()
          const tasks = useTasks()
          return { sync, tasks }
        },
        { wrapper }
      )

      // Setup sync event simulation
      const syncCallbacks: ((event: SyncEvent) => void)[] = []
      mockElectricDb.addEventListener.mockImplementation((event, callback) => {
        if (event === 'sync') {
          syncCallbacks.push(callback)
        }
      })

      // Client 1 creates a task
      const newTask = createMockTask({
        id: 'sync-task-1',
        title: 'Task from Client 1',
        userId: 'client-1',
      })

      mockElectricDb.executeRealtimeOperation.mockResolvedValue(newTask)

      act(() => {
        client1.result.sync.createTask(newTask)
      })

      // Simulate sync event broadcast
      const syncEvent: SyncEvent = {
        type: 'insert',
        table: 'tasks',
        record: newTask,
        timestamp: new Date(),
        userId: 'client-1',
        version: 1,
      }

      // Broadcast to all clients
      act(() => {
        syncCallbacks.forEach((callback) => callback(syncEvent))
      })

      // Both clients should have the new task
      await waitFor(() => {
        expect(client1.result.tasks.data?.tasks).toContainEqual(
          expect.objectContaining({ id: 'sync-task-1' })
        )
        expect(client2.result.tasks.data?.tasks).toContainEqual(
          expect.objectContaining({ id: 'sync-task-1' })
        )
      })
    })

    it('should handle concurrent updates with conflict resolution', async () => {
      const baseTask = createMockTask({
        id: 'conflict-task',
        title: 'Original Title',
        status: 'pending',
        version: 1,
        updatedAt: new Date('2024-01-01T10:00:00Z'),
      })

      // Setup conflict resolution
      mockElectricDb.handleConflict.mockImplementation(async (table, local, remote) => {
        // Last-write-wins strategy
        const resolution: ConflictResolution = {
          resolved: local.updatedAt > remote.updatedAt ? local : remote,
          strategy: 'last-write-wins',
          winner: local.updatedAt > remote.updatedAt ? 'local' : 'remote',
          metadata: {
            localVersion: local.version,
            remoteVersion: remote.version,
            conflictedFields: ['title', 'status'],
          },
        }
        return resolution
      })

      const wrapper = createWrapper()
      const { result } = renderHook(() => useElectricSync(), { wrapper })

      // Simulate concurrent updates
      const client1Update = {
        ...baseTask,
        title: 'Client 1 Update',
        version: 2,
        updatedAt: new Date('2024-01-01T10:01:00Z'),
      }

      const client2Update = {
        ...baseTask,
        status: 'completed' as const,
        version: 2,
        updatedAt: new Date('2024-01-01T10:02:00Z'),
      }

      // Trigger conflict
      const conflictResult = await act(async () => {
        return await result.current.resolveConflict('tasks', client1Update, client2Update)
      })

      expect(conflictResult.winner).toBe('remote')
      expect(conflictResult.resolved.status).toBe('completed')
      expect(conflictResult.resolved.version).toBe(2)
    })
  })

  describe('Offline Queue Processing', () => {
    it('should queue operations when offline and sync when online', async () => {
      const wrapper = createWrapper()
      const { result } = renderHook(
        () => {
          const queue = useOfflineQueue()
          const sync = useElectricSync()
          return { queue, sync }
        },
        { wrapper }
      )

      // Go offline
      act(() => {
        navigator.onLine = false
        window.dispatchEvent(new Event('offline'))
      })

      // Queue operations while offline
      const offlineTasks = [
        createMockTask({ id: 'offline-1', title: 'Offline Task 1' }),
        createMockTask({ id: 'offline-2', title: 'Offline Task 2' }),
        createMockTask({ id: 'offline-3', title: 'Offline Task 3' }),
      ]

      for (const task of offlineTasks) {
        act(() => {
          result.current.queue.enqueue({
            type: 'insert',
            table: 'tasks',
            data: task,
            timestamp: new Date(),
            retries: 0,
            maxRetries: 3,
          })
        })
      }

      expect(result.current.queue.size).toBe(3)
      expect(result.current.queue.status).toBe('offline')

      // Mock successful sync
      mockElectricDb.processOfflineQueue.mockResolvedValue({
        processed: 3,
        failed: 0,
        errors: [],
      })

      // Go back online
      act(() => {
        navigator.onLine = true
        window.dispatchEvent(new Event('online'))
      })

      // Queue should process automatically
      await waitFor(() => {
        expect(result.current.queue.status).toBe('syncing')
      })

      await waitFor(() => {
        expect(result.current.queue.status).toBe('synced')
        expect(result.current.queue.size).toBe(0)
      })

      expect(mockElectricDb.processOfflineQueue).toHaveBeenCalled()
    })

    it('should handle offline queue failures with retry logic', async () => {
      const wrapper = createWrapper()
      const { result } = renderHook(() => useOfflineQueue(), { wrapper })

      // Queue operation that will fail
      const failingOperation = {
        id: 'fail-op-1',
        type: 'update' as const,
        table: 'tasks',
        data: { id: 'task-1', title: 'Will Fail' },
        timestamp: new Date(),
        retries: 0,
        maxRetries: 3,
      }

      act(() => {
        result.current.enqueue(failingOperation)
      })

      // Mock processing with failures
      let attemptCount = 0
      mockElectricDb.processOfflineQueue.mockImplementation(async () => {
        attemptCount++
        if (attemptCount < 3) {
          throw new Error('Network error')
        }
        return {
          processed: 1,
          failed: 0,
          errors: [],
        }
      })

      // Process with retries
      await act(async () => {
        await result.current.processQueue()
      })

      // Should succeed after retries
      expect(attemptCount).toBe(3)
      expect(result.current.size).toBe(0)
      expect(result.current.failedOperations).toHaveLength(0)
    })

    it('should handle permanent failures and move to dead letter queue', async () => {
      const wrapper = createWrapper()
      const { result } = renderHook(() => useOfflineQueue(), { wrapper })

      const permanentFailure = {
        id: 'permanent-fail',
        type: 'delete' as const,
        table: 'tasks',
        data: { id: 'non-existent' },
        timestamp: new Date(),
        retries: 0,
        maxRetries: 3,
      }

      act(() => {
        result.current.enqueue(permanentFailure)
      })

      // Mock permanent failure
      mockElectricDb.processOfflineQueue.mockRejectedValue(new Error('Task not found'))

      // Attempt processing
      for (let i = 0; i <= 3; i++) {
        await act(async () => {
          try {
            await result.current.processQueue()
          } catch (error) {
            // Expected to fail
          }
        })
      }

      // Should be in dead letter queue
      expect(result.current.size).toBe(0)
      expect(result.current.deadLetterQueue).toHaveLength(1)
      expect(result.current.deadLetterQueue[0].id).toBe('permanent-fail')
    })
  })

  describe('Multi-user Collaboration', () => {
    it('should handle real-time collaboration with presence', async () => {
      const wrapper = createWrapper()

      // Setup presence tracking
      const presenceCallbacks: ((event: any) => void)[] = []
      mockElectricDb.addEventListener.mockImplementation((event, callback) => {
        if (event === 'presence') {
          presenceCallbacks.push(callback)
        }
      })

      const { result } = renderHook(
        () => {
          const sync = useElectricSync()
          return sync
        },
        { wrapper }
      )

      // User joins
      act(() => {
        result.current.updatePresence({
          userId: 'user-1',
          status: 'online',
          currentTaskId: 'task-1',
          cursor: { line: 10, column: 5 },
        })
      })

      // Simulate another user joining
      const otherUserPresence = {
        userId: 'user-2',
        status: 'online',
        currentTaskId: 'task-1',
        cursor: { line: 15, column: 20 },
      }

      act(() => {
        presenceCallbacks.forEach((cb) =>
          cb({
            type: 'user-joined',
            data: otherUserPresence,
          })
        )
      })

      // Should show both users
      expect(result.current.activeUsers).toContainEqual(
        expect.objectContaining({ userId: 'user-1' })
      )
      expect(result.current.activeUsers).toContainEqual(
        expect.objectContaining({ userId: 'user-2' })
      )

      // Simulate user leaving
      act(() => {
        presenceCallbacks.forEach((cb) =>
          cb({
            type: 'user-left',
            data: { userId: 'user-2' },
          })
        )
      })

      await waitFor(() => {
        expect(result.current.activeUsers).toHaveLength(1)
      })
    })

    it('should handle collaborative editing with operational transforms', async () => {
      const sharedTask = createMockTask({
        id: 'collab-task',
        title: 'Collaborative Task',
        description: 'Original description',
      })

      const wrapper = createWrapper()
      const { result } = renderHook(() => useElectricSync(), { wrapper })

      // User 1 edits title
      const user1Edit = {
        taskId: 'collab-task',
        field: 'title',
        operation: 'replace',
        value: 'Updated Title by User 1',
        position: 0,
        userId: 'user-1',
        timestamp: new Date('2024-01-01T10:00:00Z'),
      }

      // User 2 edits description concurrently
      const user2Edit = {
        taskId: 'collab-task',
        field: 'description',
        operation: 'append',
        value: ' - edited by User 2',
        position: 20,
        userId: 'user-2',
        timestamp: new Date('2024-01-01T10:00:01Z'),
      }

      // Apply operational transforms
      const transformed = await act(async () => {
        return await result.current.applyOperationalTransform(sharedTask, [user1Edit, user2Edit])
      })

      // Both edits should be applied
      expect(transformed.title).toBe('Updated Title by User 1')
      expect(transformed.description).toBe('Original description - edited by User 2')
    })
  })

  describe('Sync Performance and Optimization', () => {
    it('should batch sync operations for efficiency', async () => {
      const wrapper = createWrapper()
      const { result } = renderHook(() => useElectricSync(), { wrapper })

      // Create multiple operations quickly
      const operations = Array.from({ length: 10 }, (_, i) => ({
        type: 'update' as const,
        table: 'tasks',
        data: {
          id: `task-${i}`,
          status: 'completed',
        },
      }))

      // Queue operations rapidly
      operations.forEach((op) => {
        act(() => {
          result.current.queueSyncOperation(op)
        })
      })

      // Should batch into single sync call
      mockElectricDb.executeRealtimeOperation.mockResolvedValue({
        batchId: 'batch-1',
        processed: 10,
      })

      // Trigger batch processing
      await act(async () => {
        await result.current.processSyncBatch()
      })

      // Should make single batched call
      expect(mockElectricDb.executeRealtimeOperation).toHaveBeenCalledTimes(1)
      expect(mockElectricDb.executeRealtimeOperation).toHaveBeenCalledWith(
        'tasks',
        'batch',
        expect.objectContaining({
          operations: expect.arrayContaining(operations),
        }),
        true
      )
    })

    it('should implement adaptive sync intervals based on activity', async () => {
      const wrapper = createWrapper()
      const { result } = renderHook(() => useElectricSync(), { wrapper })

      // Start with default interval
      expect(result.current.syncInterval).toBe(5000) // 5 seconds

      // Simulate high activity
      for (let i = 0; i < 20; i++) {
        act(() => {
          result.current.recordActivity('update')
        })
      }

      // Should decrease interval for active sync
      await waitFor(() => {
        expect(result.current.syncInterval).toBeLessThan(5000)
      })

      // Simulate low activity period
      act(() => {
        result.current.resetActivity()
      })

      // Should increase interval back
      await waitFor(() => {
        expect(result.current.syncInterval).toBe(5000)
      })
    })

    it('should optimize sync payload with compression', async () => {
      const largeTasks = Array.from({ length: 100 }, (_, i) =>
        createMockTask({
          id: `large-${i}`,
          title: `Task ${i}`,
          description: 'A'.repeat(1000), // Large description
        })
      )

      const wrapper = createWrapper()
      const { result } = renderHook(() => useElectricSync(), { wrapper })

      // Mock compression
      mockElectricDb.executeRealtimeOperation.mockImplementation(async (table, op, data) => {
        if (data.compressed) {
          expect(data.payload.length).toBeLessThan(JSON.stringify(largeTasks).length)
        }
        return { success: true }
      })

      // Sync large payload
      await act(async () => {
        await result.current.syncBulkData('tasks', largeTasks, {
          compress: true,
        })
      })

      expect(mockElectricDb.executeRealtimeOperation).toHaveBeenCalledWith(
        'tasks',
        'bulk-insert',
        expect.objectContaining({
          compressed: true,
        }),
        false
      )
    })
  })

  describe('Connection Recovery', () => {
    it('should handle connection drops and automatic recovery', async () => {
      const wrapper = createWrapper()
      const { result } = renderHook(() => useElectricSync(), { wrapper })

      const connectionStates: string[] = []

      // Track connection state changes
      result.current.onConnectionChange((state) => {
        connectionStates.push(state)
      })

      // Simulate connection drop
      act(() => {
        mockElectricDb.getConnectionState.mockReturnValue('disconnected')
        result.current.handleConnectionChange('disconnected')
      })

      expect(result.current.connectionState).toBe('disconnected')

      // Simulate reconnection attempts
      act(() => {
        mockElectricDb.getConnectionState.mockReturnValue('reconnecting')
        result.current.handleConnectionChange('reconnecting')
      })

      // Successful reconnection
      act(() => {
        mockElectricDb.getConnectionState.mockReturnValue('connected')
        result.current.handleConnectionChange('connected')
      })

      expect(connectionStates).toEqual(['disconnected', 'reconnecting', 'connected'])

      // Should trigger resync after reconnection
      expect(result.current.needsResync).toBe(true)
    })
  })
})
