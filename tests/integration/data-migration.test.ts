/**
 * Data Migration Tests
 *
 * Tests to verify data migration from Zustand stores to database works correctly
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Environment, Task } from '@/db/schema'
import { useMigration } from '@/hooks/use-migration'
import { useEnvironmentStore } from '@/stores/environments'
import { useTaskStore } from '@/stores/tasks'

// Mock fetch for API calls
global.fetch = vi.fn()

// Mock stores
vi.mock('@/stores/tasks', () => ({
  useTaskStore: vi.fn(),
}))

vi.mock('@/stores/environments', () => ({
  useEnvironmentStore: vi.fn(),
}))

// Mock database operations
vi.mock('@/db/config', () => ({
  db: {
    insert: vi.fn(),
    select: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}))

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  })

  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children)
}

describe('Data Migration', () => {
  let mockFetch: ReturnType<typeof vi.fn>
  let mockTaskStore: ReturnType<typeof vi.fn>
  let mockEnvironmentStore: ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockFetch = vi.mocked(fetch)
    mockTaskStore = vi.mocked(useTaskStore)
    mockEnvironmentStore = vi.mocked(useEnvironmentStore)

    // Default successful API responses
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    } as Response)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Task Migration', () => {
    it('should migrate tasks from Zustand to database', async () => {
      const zustandTasks = [
        {
          id: 'zustand-task-1',
          title: 'Zustand Task 1',
          description: 'Task from Zustand store',
          status: 'pending',
          priority: 'medium',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'zustand-task-2',
          title: 'Zustand Task 2',
          description: 'Another task from Zustand',
          status: 'completed',
          priority: 'high',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ] as Task[]

      // Mock Zustand store state
      mockTaskStore.mockReturnValue({
        tasks: zustandTasks,
        clearTasks: vi.fn(),
        getTasks: vi.fn(() => zustandTasks),
      })

      mockEnvironmentStore.mockReturnValue({
        environments: [],
        clearEnvironments: vi.fn(),
        getEnvironments: vi.fn(() => []),
      })

      const wrapper = createWrapper()
      const { result } = renderHook(() => useMigration(), { wrapper })

      // Start migration
      await act(async () => {
        await result.current.migrateToDatabase()
      })

      // Verify migration completed successfully
      expect(result.current.migrationStatus).toBe('completed')
      expect(result.current.migrationProgress.tasks.migrated).toBe(2)
      expect(result.current.migrationProgress.tasks.failed).toBe(0)

      // Verify API calls were made for each task
      expect(mockFetch).toHaveBeenCalledTimes(2)
      expect(mockFetch).toHaveBeenCalledWith('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(zustandTasks[0]),
      })
      expect(mockFetch).toHaveBeenCalledWith('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(zustandTasks[1]),
      })
    })

    it('should handle task migration failures gracefully', async () => {
      const zustandTasks = [
        {
          id: 'task-1',
          title: 'Good Task',
          status: 'pending',
          priority: 'medium',
        },
        {
          id: 'task-2',
          title: 'Bad Task',
          status: 'pending',
          priority: 'medium',
        },
      ] as Task[]

      mockTaskStore.mockReturnValue({
        tasks: zustandTasks,
        clearTasks: vi.fn(),
        getTasks: vi.fn(() => zustandTasks),
      })

      mockEnvironmentStore.mockReturnValue({
        environments: [],
        clearEnvironments: vi.fn(),
        getEnvironments: vi.fn(() => []),
      })

      // Mock first task success, second task failure
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        } as Response)
        .mockRejectedValueOnce(new Error('Migration failed'))

      const wrapper = createWrapper()
      const { result } = renderHook(() => useMigration(), { wrapper })

      await act(async () => {
        await result.current.migrateToDatabase()
      })

      // Should complete with partial success
      expect(result.current.migrationStatus).toBe('completed')
      expect(result.current.migrationProgress.tasks.migrated).toBe(1)
      expect(result.current.migrationProgress.tasks.failed).toBe(1)
      expect(result.current.migrationErrors).toHaveLength(1)
    })

    it('should skip migration if no tasks exist', async () => {
      mockTaskStore.mockReturnValue({
        tasks: [],
        clearTasks: vi.fn(),
        getTasks: vi.fn(() => []),
      })

      mockEnvironmentStore.mockReturnValue({
        environments: [],
        clearEnvironments: vi.fn(),
        getEnvironments: vi.fn(() => []),
      })

      const wrapper = createWrapper()
      const { result } = renderHook(() => useMigration(), { wrapper })

      await act(async () => {
        await result.current.migrateToDatabase()
      })

      expect(result.current.migrationStatus).toBe('completed')
      expect(result.current.migrationProgress.tasks.migrated).toBe(0)
      expect(mockFetch).not.toHaveBeenCalled()
    })
  })

  describe('Environment Migration', () => {
    it('should migrate environments from Zustand to database', async () => {
      const zustandEnvironments = [
        {
          id: 'env-1',
          name: 'Development',
          description: 'Dev environment',
          type: 'development',
          status: 'active',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'env-2',
          name: 'Production',
          description: 'Prod environment',
          type: 'production',
          status: 'active',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ] as Environment[]

      mockTaskStore.mockReturnValue({
        tasks: [],
        clearTasks: vi.fn(),
        getTasks: vi.fn(() => []),
      })

      mockEnvironmentStore.mockReturnValue({
        environments: zustandEnvironments,
        clearEnvironments: vi.fn(),
        getEnvironments: vi.fn(() => zustandEnvironments),
      })

      const wrapper = createWrapper()
      const { result } = renderHook(() => useMigration(), { wrapper })

      await act(async () => {
        await result.current.migrateToDatabase()
      })

      expect(result.current.migrationStatus).toBe('completed')
      expect(result.current.migrationProgress.environments.migrated).toBe(2)
      expect(result.current.migrationProgress.environments.failed).toBe(0)

      // Verify API calls for environments
      expect(mockFetch).toHaveBeenCalledWith('/api/environments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(zustandEnvironments[0]),
      })
    })
  })

  describe('Complete Migration Flow', () => {
    it('should migrate both tasks and environments', async () => {
      const zustandTasks = [
        {
          id: 'task-1',
          title: 'Migration Task',
          status: 'pending',
          priority: 'medium',
        },
      ] as Task[]

      const zustandEnvironments = [
        {
          id: 'env-1',
          name: 'Test Environment',
          type: 'development',
          status: 'active',
        },
      ] as Environment[]

      mockTaskStore.mockReturnValue({
        tasks: zustandTasks,
        clearTasks: vi.fn(),
        getTasks: vi.fn(() => zustandTasks),
      })

      mockEnvironmentStore.mockReturnValue({
        environments: zustandEnvironments,
        clearEnvironments: vi.fn(),
        getEnvironments: vi.fn(() => zustandEnvironments),
      })

      const wrapper = createWrapper()
      const { result } = renderHook(() => useMigration(), { wrapper })

      await act(async () => {
        await result.current.migrateToDatabase()
      })

      expect(result.current.migrationStatus).toBe('completed')
      expect(result.current.migrationProgress.tasks.migrated).toBe(1)
      expect(result.current.migrationProgress.environments.migrated).toBe(1)
      expect(mockFetch).toHaveBeenCalledTimes(2)
    })

    it('should clear Zustand stores after successful migration', async () => {
      const clearTasksMock = vi.fn()
      const clearEnvironmentsMock = vi.fn()

      mockTaskStore.mockReturnValue({
        tasks: [{ id: 'task-1', title: 'Task', status: 'pending' }],
        clearTasks: clearTasksMock,
        getTasks: vi.fn(() => [{ id: 'task-1', title: 'Task', status: 'pending' }]),
      })

      mockEnvironmentStore.mockReturnValue({
        environments: [{ id: 'env-1', name: 'Env', type: 'development' }],
        clearEnvironments: clearEnvironmentsMock,
        getEnvironments: vi.fn(() => [{ id: 'env-1', name: 'Env', type: 'development' }]),
      })

      const wrapper = createWrapper()
      const { result } = renderHook(() => useMigration(), { wrapper })

      await act(async () => {
        await result.current.migrateToDatabase()
      })

      expect(clearTasksMock).toHaveBeenCalled()
      expect(clearEnvironmentsMock).toHaveBeenCalled()
    })

    it('should track migration progress correctly', async () => {
      const zustandTasks = Array.from({ length: 5 }, (_, i) => ({
        id: `task-${i}`,
        title: `Task ${i}`,
        status: 'pending',
        priority: 'medium',
      })) as Task[]

      mockTaskStore.mockReturnValue({
        tasks: zustandTasks,
        clearTasks: vi.fn(),
        getTasks: vi.fn(() => zustandTasks),
      })

      mockEnvironmentStore.mockReturnValue({
        environments: [],
        clearEnvironments: vi.fn(),
        getEnvironments: vi.fn(() => []),
      })

      const wrapper = createWrapper()
      const { result } = renderHook(() => useMigration(), { wrapper })

      const progressUpdates: number[] = []

      // Monitor progress updates
      const originalMigrate = result.current.migrateToDatabase
      result.current.migrateToDatabase = async () => {
        await originalMigrate()
        progressUpdates.push(result.current.migrationProgress.tasks.migrated)
      }

      await act(async () => {
        await result.current.migrateToDatabase()
      })

      expect(result.current.migrationProgress.tasks.total).toBe(5)
      expect(result.current.migrationProgress.tasks.migrated).toBe(5)
      expect(result.current.migrationProgress.tasks.failed).toBe(0)
    })
  })

  describe('Migration State Management', () => {
    it('should reset migration state before starting new migration', async () => {
      mockTaskStore.mockReturnValue({
        tasks: [],
        clearTasks: vi.fn(),
        getTasks: vi.fn(() => []),
      })

      mockEnvironmentStore.mockReturnValue({
        environments: [],
        clearEnvironments: vi.fn(),
        getEnvironments: vi.fn(() => []),
      })

      const wrapper = createWrapper()
      const { result } = renderHook(() => useMigration(), { wrapper })

      // Set some initial state
      act(() => {
        result.current.setMigrationStatus('failed')
        result.current.setMigrationErrors(['Previous error'])
      })

      // Start new migration
      await act(async () => {
        await result.current.migrateToDatabase()
      })

      expect(result.current.migrationStatus).toBe('completed')
      expect(result.current.migrationErrors).toHaveLength(0)
    })

    it('should handle migration cancellation', async () => {
      const zustandTasks = Array.from({ length: 10 }, (_, i) => ({
        id: `task-${i}`,
        title: `Task ${i}`,
        status: 'pending',
      })) as Task[]

      mockTaskStore.mockReturnValue({
        tasks: zustandTasks,
        clearTasks: vi.fn(),
        getTasks: vi.fn(() => zustandTasks),
      })

      mockEnvironmentStore.mockReturnValue({
        environments: [],
        clearEnvironments: vi.fn(),
        getEnvironments: vi.fn(() => []),
      })

      const wrapper = createWrapper()
      const { result } = renderHook(() => useMigration(), { wrapper })

      // Start migration and immediately cancel
      act(() => {
        result.current.migrateToDatabase()
        result.current.cancelMigration()
      })

      await waitFor(() => {
        expect(result.current.migrationStatus).toBe('cancelled')
      })
    })
  })
})
