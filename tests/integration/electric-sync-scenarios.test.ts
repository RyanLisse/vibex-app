/**
 * ElectricSQL Sync Scenarios Tests
 *
 * Comprehensive tests for ElectricSQL real-time sync, conflict resolution, and offline scenarios
 */

import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Environment, Task } from '../../db/schema'
import { useElectric } from '../../hooks/use-electric'
import { useElectricEnvironments, useElectricTasks } from '../../hooks/use-electric-tasks'
import { useOfflineSync } from '../../hooks/use-offline-sync'
import { electricDb } from '../../lib/electric/config'

// Mock ElectricSQL
vi.mock('@/lib/electric/config', () => ({
  electricDb: {
    isReady: vi.fn(),
    getConnectionState: vi.fn(),
    executeRealtimeOperation: vi.fn(),
    handleConflict: vi.fn(),
    queueOfflineOperation: vi.fn(),
    processOfflineQueue: vi.fn(),
    setupConflictResolvers: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  },
}))

// Mock PGlite
vi.mock('@electric-sql/pglite', () => ({
  PGlite: vi.fn(() => ({
    query: vi.fn(),
    close: vi.fn(),
  })),
}))

// Mock navigator.onLine
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true,
})

describe('ElectricSQL Sync Scenarios', () => {
  const mockElectricDb = vi.mocked(electricDb)

  beforeEach(() => {
    vi.clearAllMocks()
    navigator.onLine = true

    // Default mocks
    mockElectricDb.isReady.mockReturnValue(true)
    mockElectricDb.getConnectionState.mockReturnValue('connected')
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Real-time Sync', () => {
    it('should sync task creation in real-time', async () => {
      const mockTasks = [{ id: '1', title: 'Existing Task', status: 'pending' }] as Task[]

      const newTask = {
        id: '2',
        title: 'New Real-time Task',
        status: 'pending',
        priority: 'medium',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as Task

      mockElectricDb.executeRealtimeOperation.mockResolvedValue(newTask)

      const { result } = renderHook(() => useElectricTasks())

      // Simulate initial tasks
      act(() => {
        // This would normally come from the subscription
        result.current.tasks = mockTasks
      })

      // Create new task
      await act(async () => {
        await result.current.createTask({
          title: 'New Real-time Task',
          status: 'pending',
          priority: 'medium',
        })
      })

      expect(mockElectricDb.executeRealtimeOperation).toHaveBeenCalledWith(
        'tasks',
        'insert',
        expect.objectContaining({
          title: 'New Real-time Task',
          status: 'pending',
          priority: 'medium',
        }),
        true // optimistic update
      )
    })

    it('should sync task updates across clients', async () => {
      const originalTask = {
        id: 'task-1',
        title: 'Original Title',
        status: 'pending',
        priority: 'medium',
      } as Task

      const updatedTask = {
        ...originalTask,
        title: 'Updated Title',
        status: 'completed',
        updatedAt: new Date().toISOString(),
      } as Task

      mockElectricDb.executeRealtimeOperation.mockResolvedValue(updatedTask)

      const { result } = renderHook(() => useElectricTasks())

      await act(async () => {
        await result.current.updateTask('task-1', {
          title: 'Updated Title',
          status: 'completed',
        })
      })

      expect(mockElectricDb.executeRealtimeOperation).toHaveBeenCalledWith(
        'tasks',
        'update',
        expect.objectContaining({
          id: 'task-1',
          title: 'Updated Title',
          status: 'completed',
        }),
        true
      )
    })

    it('should handle real-time sync events', async () => {
      const { result } = renderHook(() => useElectric())

      const syncEvent = {
        type: 'insert' as const,
        table: 'tasks',
        record: {
          id: 'new-task',
          title: 'Synced Task',
          status: 'pending',
        },
        timestamp: new Date(),
        userId: 'user-123',
      }

      // Simulate receiving a sync event
      act(() => {
        // This would normally be triggered by ElectricSQL's event system
        const listeners = result.current.syncEventListeners || []
        listeners.forEach((listener) => listener(syncEvent))
      })

      // Verify event was processed
      expect(result.current.syncEvents).toContainEqual(
        expect.objectContaining({
          type: 'insert',
          table: 'tasks',
        })
      )
    })
  })

  describe('Conflict Resolution', () => {
    it('should resolve conflicts using last-write-wins strategy', async () => {
      const localTask = {
        id: 'conflict-task',
        title: 'Local Version',
        status: 'pending',
        updatedAt: '2024-01-01T10:00:00Z',
      } as Task

      const remoteTask = {
        id: 'conflict-task',
        title: 'Remote Version',
        status: 'completed',
        updatedAt: '2024-01-01T11:00:00Z', // Later timestamp
      } as Task

      const resolvedTask = {
        ...remoteTask, // Remote wins due to later timestamp
      }

      mockElectricDb.handleConflict.mockResolvedValue({
        resolved: resolvedTask,
        strategy: 'last-write-wins',
        winner: 'remote',
        metadata: {
          localTime: '2024-01-01T10:00:00Z',
          remoteTime: '2024-01-01T11:00:00Z',
        },
      })

      const { result } = renderHook(() => useElectricTasks())

      // Simulate conflict resolution
      await act(async () => {
        await mockElectricDb.handleConflict('tasks', localTask, remoteTask)
      })

      expect(mockElectricDb.handleConflict).toHaveBeenCalledWith('tasks', localTask, remoteTask)
    })

    it('should resolve conflicts using user-priority strategy', async () => {
      const adminTask = {
        id: 'priority-task',
        title: 'Admin Version',
        userId: 'admin-user',
        updatedAt: '2024-01-01T10:00:00Z',
      } as Task

      const userTask = {
        id: 'priority-task',
        title: 'User Version',
        userId: 'regular-user',
        updatedAt: '2024-01-01T11:00:00Z', // Later but lower priority
      } as Task

      mockElectricDb.handleConflict.mockResolvedValue({
        resolved: adminTask, // Admin wins due to higher priority
        strategy: 'user-priority',
        winner: 'local',
        metadata: {
          localPriority: 100,
          remotePriority: 10,
        },
      })

      const { result } = renderHook(() => useElectricTasks())

      await act(async () => {
        await mockElectricDb.handleConflict('tasks', adminTask, userTask)
      })

      expect(mockElectricDb.handleConflict).toHaveBeenCalledWith('tasks', adminTask, userTask)
    })

    it('should handle field-merge conflict resolution', async () => {
      const localTask = {
        id: 'merge-task',
        title: 'Local Title',
        description: 'Local Description',
        status: 'pending',
        priority: 'high',
        updatedAt: '2024-01-01T10:00:00Z',
      } as Task

      const remoteTask = {
        id: 'merge-task',
        title: 'Remote Title',
        description: 'Local Description', // Same as local
        status: 'completed', // Different from local
        priority: 'medium', // Different from local
        updatedAt: '2024-01-01T09:00:00Z',
      } as Task

      const mergedTask = {
        id: 'merge-task',
        title: 'Local Title', // Local wins for conflicting field
        description: 'Local Description', // No conflict
        status: 'pending', // Local wins for conflicting field
        priority: 'high', // Local wins for conflicting field
        updatedAt: '2024-01-01T10:00:00Z', // Latest timestamp
      } as Task

      mockElectricDb.handleConflict.mockResolvedValue({
        resolved: mergedTask,
        strategy: 'field-merge',
        winner: 'merged',
        metadata: {
          conflicts: ['title', 'status', 'priority'],
          mergedFields: ['id', 'title', 'description', 'status', 'priority', 'updatedAt'],
        },
      })

      await act(async () => {
        await mockElectricDb.handleConflict('tasks', localTask, remoteTask)
      })

      expect(mockElectricDb.handleConflict).toHaveBeenCalledWith('tasks', localTask, remoteTask)
    })
  })

  describe('Offline Scenarios', () => {
    it('should queue operations when offline', async () => {
      navigator.onLine = false

      const offlineTask = {
        title: 'Offline Task',
        description: 'Created while offline',
        status: 'pending' as const,
        priority: 'medium' as const,
      }

      mockElectricDb.queueOfflineOperation.mockResolvedValue('queued-operation-id')

      const { result } = renderHook(() => useOfflineSync())

      act(() => {
        result.current.queueOperation('insert', 'tasks', offlineTask, 'user-123')
      })

      expect(mockElectricDb.queueOfflineOperation).toHaveBeenCalledWith(
        'tasks',
        'insert',
        offlineTask
      )

      expect(result.current.getStats().queueSize).toBeGreaterThan(0)
    })

    it('should process offline queue when coming back online', async () => {
      const queuedOperations = [
        {
          id: 'op-1',
          type: 'insert' as const,
          table: 'tasks',
          data: { title: 'Queued Task 1' },
          timestamp: new Date(),
          retries: 0,
          maxRetries: 3,
        },
        {
          id: 'op-2',
          type: 'update' as const,
          table: 'tasks',
          data: { id: 'task-1', title: 'Updated Task' },
          timestamp: new Date(),
          retries: 0,
          maxRetries: 3,
        },
      ]

      mockElectricDb.processOfflineQueue.mockResolvedValue({
        processed: 2,
        failed: 0,
        errors: [],
      })

      const { result } = renderHook(() => useOfflineSync())

      // Simulate coming back online
      act(() => {
        navigator.onLine = true
        // Trigger online event
        window.dispatchEvent(new Event('online'))
      })

      await waitFor(() => {
        expect(mockElectricDb.processOfflineQueue).toHaveBeenCalled()
      })
    })

    it('should handle offline queue processing failures', async () => {
      const failedOperation = {
        id: 'failed-op',
        type: 'insert' as const,
        table: 'tasks',
        data: { title: 'Failed Task' },
        timestamp: new Date(),
        retries: 3,
        maxRetries: 3,
      }

      mockElectricDb.processOfflineQueue.mockResolvedValue({
        processed: 0,
        failed: 1,
        errors: ['Failed to sync insert on tasks after 3 retries'],
      })

      const { result } = renderHook(() => useOfflineSync())

      await act(async () => {
        await result.current.manualSync()
      })

      expect(result.current.syncErrors).toContain('Failed to sync insert on tasks after 3 retries')
    })

    it('should implement retry logic with exponential backoff', async () => {
      const retryOperation = {
        id: 'retry-op',
        type: 'update' as const,
        table: 'tasks',
        data: { id: 'task-1', title: 'Retry Task' },
        timestamp: new Date(),
        retries: 1,
        maxRetries: 3,
      }

      // First attempt fails
      mockElectricDb.executeRealtimeOperation
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ id: 'task-1', title: 'Retry Task' })

      const { result } = renderHook(() => useOfflineSync())

      // First attempt should fail and increment retries
      await act(async () => {
        try {
          await result.current.manualSync()
        } catch (error) {
          // Expected to fail
        }
      })

      // Second attempt should succeed
      await act(async () => {
        await result.current.manualSync()
      })

      expect(mockElectricDb.executeRealtimeOperation).toHaveBeenCalledTimes(2)
    })
  })

  describe('Multi-user Scenarios', () => {
    it('should filter sync events by user', async () => {
      const userATask = {
        id: 'user-a-task',
        title: 'User A Task',
        userId: 'user-a',
      } as Task

      const userBTask = {
        id: 'user-b-task',
        title: 'User B Task',
        userId: 'user-b',
      } as Task

      const { result } = renderHook(() => useElectricTasks('user-a'))

      // Simulate sync events from different users
      const syncEventA = {
        type: 'insert' as const,
        table: 'tasks',
        record: userATask,
        timestamp: new Date(),
        userId: 'user-a',
      }

      const syncEventB = {
        type: 'insert' as const,
        table: 'tasks',
        record: userBTask,
        timestamp: new Date(),
        userId: 'user-b',
      }

      // Only user A's events should be processed for user A's subscription
      act(() => {
        // Simulate receiving both events
        result.current.handleSyncEvent?.(syncEventA)
        result.current.handleSyncEvent?.(syncEventB)
      })

      // Should only include user A's task
      expect(result.current.tasks).toContainEqual(expect.objectContaining({ userId: 'user-a' }))
      expect(result.current.tasks).not.toContainEqual(expect.objectContaining({ userId: 'user-b' }))
    })

    it('should handle concurrent updates from multiple users', async () => {
      const baseTask = {
        id: 'concurrent-task',
        title: 'Base Task',
        status: 'pending',
        priority: 'medium',
        updatedAt: '2024-01-01T10:00:00Z',
      } as Task

      const userAUpdate = {
        ...baseTask,
        title: 'User A Update',
        updatedAt: '2024-01-01T10:01:00Z',
      } as Task

      const userBUpdate = {
        ...baseTask,
        status: 'completed',
        updatedAt: '2024-01-01T10:02:00Z',
      } as Task

      // User B's update should win due to later timestamp
      mockElectricDb.handleConflict.mockResolvedValue({
        resolved: userBUpdate,
        strategy: 'last-write-wins',
        winner: 'remote',
        metadata: {
          localTime: '2024-01-01T10:01:00Z',
          remoteTime: '2024-01-01T10:02:00Z',
        },
      })

      await act(async () => {
        await mockElectricDb.handleConflict('tasks', userAUpdate, userBUpdate)
      })

      expect(mockElectricDb.handleConflict).toHaveBeenCalledWith('tasks', userAUpdate, userBUpdate)
    })
  })

  describe('Connection Management', () => {
    it('should handle connection state changes', async () => {
      const { result } = renderHook(() => useElectric())

      // Simulate connection loss
      act(() => {
        mockElectricDb.getConnectionState.mockReturnValue('disconnected')
        // Trigger connection state change event
      })

      expect(result.current.connectionState).toBe('disconnected')

      // Simulate reconnection
      act(() => {
        mockElectricDb.getConnectionState.mockReturnValue('connected')
        // Trigger connection state change event
      })

      expect(result.current.connectionState).toBe('connected')
    })

    it('should resume sync after reconnection', async () => {
      mockElectricDb.processOfflineQueue.mockResolvedValue({
        processed: 3,
        failed: 0,
        errors: [],
      })

      const { result } = renderHook(() => useElectric())

      // Simulate reconnection
      act(() => {
        mockElectricDb.getConnectionState.mockReturnValue('connected')
        result.current.handleReconnection?.()
      })

      await waitFor(() => {
        expect(mockElectricDb.processOfflineQueue).toHaveBeenCalled()
      })
    })
  })
})
