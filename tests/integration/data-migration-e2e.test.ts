/**
 * Data Migration End-to-End Integration Tests
 * 
 * Tests the complete data migration flow from localStorage/Zustand stores
 * to the database, including error handling and recovery scenarios
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useMigration } from '@/hooks/use-migration'
import { useTaskStore } from '@/stores/tasks'
import { useEnvironmentStore } from '@/stores/environments'
import { useTasks, useEnvironments } from '@/lib/query/hooks'
import type { Task, Environment } from '@/db/schema'

// Mock server setup
import { setupServer } from 'msw/node'
import { http, HttpResponse, delay } from 'msw'

const server = setupServer()

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
Object.defineProperty(window, 'localStorage', { value: localStorageMock })

// Mock Zustand stores
vi.mock('@/stores/tasks', () => ({
  useTaskStore: vi.fn(),
}))

vi.mock('@/stores/environments', () => ({
  useEnvironmentStore: vi.fn(),
}))

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

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}

// Test data factories
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
    ...overrides,
  }
}

function createMockEnvironment(overrides: Partial<Environment> = {}): Environment {
  return {
    id: 'env-' + Math.random().toString(36).substr(2, 9),
    name: 'Test Environment',
    description: 'Test Description',
    type: 'development',
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
    metadata: {},
    userId: 'test-user',
    ...overrides,
  }
}

describe('Data Migration End-to-End', () => {
  let mockTaskStore: ReturnType<typeof vi.fn>
  let mockEnvironmentStore: ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockTaskStore = vi.mocked(useTaskStore)
    mockEnvironmentStore = vi.mocked(useEnvironmentStore)
    localStorageMock.clear()
  })

  describe('Complete Migration Flow', () => {
    it('should migrate all data from localStorage to database successfully', async () => {
      // Setup localStorage data
      const localTasks = [
        createMockTask({ id: 'local-1', title: 'Local Task 1' }),
        createMockTask({ id: 'local-2', title: 'Local Task 2' }),
        createMockTask({ id: 'local-3', title: 'Local Task 3' }),
      ]

      const localEnvironments = [
        createMockEnvironment({ id: 'local-env-1', name: 'Dev Environment' }),
        createMockEnvironment({ id: 'local-env-2', name: 'Prod Environment' }),
      ]

      // Mock Zustand stores
      mockTaskStore.mockReturnValue({
        tasks: localTasks,
        clearTasks: vi.fn(),
        getTasks: vi.fn(() => localTasks),
        hasMigratedToDatabase: false,
        setMigrationComplete: vi.fn(),
      })

      mockEnvironmentStore.mockReturnValue({
        environments: localEnvironments,
        clearEnvironments: vi.fn(),
        getEnvironments: vi.fn(() => localEnvironments),
        hasMigratedToDatabase: false,
        setMigrationComplete: vi.fn(),
      })

      // Mock API responses
      const createdTasks: Task[] = []
      const createdEnvironments: Environment[] = []

      server.use(
        // Task creation
        http.post('/api/tasks', async ({ request }) => {
          const body = await request.json()
          const created = { ...body, id: `db-${body.id}` }
          createdTasks.push(created)
          await delay(20) // Simulate network delay
          return HttpResponse.json({
            success: true,
            data: created,
          }, { status: 201 })
        }),
        // Environment creation
        http.post('/api/environments', async ({ request }) => {
          const body = await request.json()
          const created = { ...body, id: `db-${body.id}` }
          createdEnvironments.push(created)
          await delay(20)
          return HttpResponse.json({
            success: true,
            data: created,
          }, { status: 201 })
        }),
        // Fetch migrated tasks
        http.get('/api/tasks', () => {
          return HttpResponse.json({
            success: true,
            data: {
              tasks: createdTasks,
              total: createdTasks.length,
              hasMore: false,
            },
          })
        }),
        // Fetch migrated environments
        http.get('/api/environments', () => {
          return HttpResponse.json({
            success: true,
            data: {
              environments: createdEnvironments,
              total: createdEnvironments.length,
            },
          })
        })
      )

      const wrapper = createWrapper()
      const { result } = renderHook(() => {
        const migration = useMigration()
        const tasks = useTasks()
        const environments = useEnvironments()
        return { migration, tasks, environments }
      }, { wrapper })

      // Start migration
      act(() => {
        result.current.migration.startMigration()
      })

      // Verify migration starts
      expect(result.current.migration.migrationStatus).toBe('migrating')
      expect(result.current.migration.migrationProgress.tasks.total).toBe(3)
      expect(result.current.migration.migrationProgress.environments.total).toBe(2)

      // Wait for migration to complete
      await waitFor(() => {
        expect(result.current.migration.migrationStatus).toBe('completed')
      }, { timeout: 5000 })

      // Verify all items migrated
      expect(result.current.migration.migrationProgress.tasks.migrated).toBe(3)
      expect(result.current.migration.migrationProgress.environments.migrated).toBe(2)
      expect(result.current.migration.migrationProgress.tasks.failed).toBe(0)
      expect(result.current.migration.migrationProgress.environments.failed).toBe(0)

      // Verify stores were cleared
      const taskStore = mockTaskStore.mock.results[0].value
      const envStore = mockEnvironmentStore.mock.results[0].value
      expect(taskStore.clearTasks).toHaveBeenCalled()
      expect(envStore.clearEnvironments).toHaveBeenCalled()
      expect(taskStore.setMigrationComplete).toHaveBeenCalled()
      expect(envStore.setMigrationComplete).toHaveBeenCalled()

      // Verify data is now in database
      await waitFor(() => {
        expect(result.current.tasks.data?.tasks).toHaveLength(3)
        expect(result.current.environments.data?.environments).toHaveLength(2)
      })
    })

    it('should handle partial migration failures and allow retry', async () => {
      const localTasks = [
        createMockTask({ id: 'success-1', title: 'Will Succeed 1' }),
        createMockTask({ id: 'fail-1', title: 'Will Fail 1' }),
        createMockTask({ id: 'success-2', title: 'Will Succeed 2' }),
        createMockTask({ id: 'fail-2', title: 'Will Fail 2' }),
      ]

      mockTaskStore.mockReturnValue({
        tasks: localTasks,
        clearTasks: vi.fn(),
        getTasks: vi.fn(() => localTasks),
        hasMigratedToDatabase: false,
        setMigrationComplete: vi.fn(),
      })

      mockEnvironmentStore.mockReturnValue({
        environments: [],
        clearEnvironments: vi.fn(),
        getEnvironments: vi.fn(() => []),
        hasMigratedToDatabase: false,
        setMigrationComplete: vi.fn(),
      })

      let attemptCount = 0
      const failedIds = ['fail-1', 'fail-2']

      server.use(
        http.post('/api/tasks', async ({ request }) => {
          const body = await request.json()
          attemptCount++
          
          // Fail specific tasks on first attempt
          if (failedIds.includes(body.id) && attemptCount <= 4) {
            return HttpResponse.json({
              success: false,
              error: 'Network error',
              code: 'NETWORK_ERROR',
            }, { status: 500 })
          }
          
          return HttpResponse.json({
            success: true,
            data: { ...body, id: `db-${body.id}` },
          }, { status: 201 })
        })
      )

      const wrapper = createWrapper()
      const { result } = renderHook(() => useMigration(), { wrapper })

      // Start migration
      act(() => {
        result.current.startMigration()
      })

      // Wait for first attempt to complete
      await waitFor(() => {
        expect(result.current.migrationStatus).toBe('completed')
      })

      // Verify partial success
      expect(result.current.migrationProgress.tasks.migrated).toBe(2)
      expect(result.current.migrationProgress.tasks.failed).toBe(2)
      expect(result.current.migrationErrors).toHaveLength(2)

      // Retry failed migrations
      act(() => {
        result.current.retryFailedMigrations()
      })

      // Wait for retry to complete
      await waitFor(() => {
        expect(result.current.migrationStatus).toBe('completed')
        expect(result.current.migrationProgress.tasks.failed).toBe(0)
      })

      // All tasks should now be migrated
      expect(result.current.migrationProgress.tasks.migrated).toBe(4)
    })
  })

  describe('Migration Progress Tracking', () => {
    it('should provide real-time progress updates during migration', async () => {
      const largeBatchTasks = Array.from({ length: 20 }, (_, i) => 
        createMockTask({ id: `batch-${i}`, title: `Batch Task ${i}` })
      )

      mockTaskStore.mockReturnValue({
        tasks: largeBatchTasks,
        clearTasks: vi.fn(),
        getTasks: vi.fn(() => largeBatchTasks),
        hasMigratedToDatabase: false,
        setMigrationComplete: vi.fn(),
      })

      mockEnvironmentStore.mockReturnValue({
        environments: [],
        clearEnvironments: vi.fn(),
        getEnvironments: vi.fn(() => []),
        hasMigratedToDatabase: false,
        setMigrationComplete: vi.fn(),
      })

      let processedCount = 0
      server.use(
        http.post('/api/tasks', async ({ request }) => {
          processedCount++
          const body = await request.json()
          await delay(10) // Simulate processing time
          return HttpResponse.json({
            success: true,
            data: { ...body, id: `db-${body.id}` },
          }, { status: 201 })
        })
      )

      const wrapper = createWrapper()
      const { result } = renderHook(() => useMigration(), { wrapper })

      const progressUpdates: number[] = []
      
      // Start migration and track progress
      act(() => {
        result.current.startMigration()
      })

      // Collect progress updates
      const checkProgress = setInterval(() => {
        const migrated = result.current.migrationProgress.tasks.migrated
        if (migrated > 0 && !progressUpdates.includes(migrated)) {
          progressUpdates.push(migrated)
        }
      }, 50)

      // Wait for completion
      await waitFor(() => {
        expect(result.current.migrationStatus).toBe('completed')
      }, { timeout: 5000 })

      clearInterval(checkProgress)

      // Verify progress was tracked incrementally
      expect(progressUpdates.length).toBeGreaterThan(1)
      expect(progressUpdates[progressUpdates.length - 1]).toBe(20)
      expect(result.current.migrationProgress.percentage).toBe(100)
    })
  })

  describe('Migration State Persistence', () => {
    it('should persist migration state and resume on app reload', async () => {
      const tasks = [
        createMockTask({ id: 'persist-1', title: 'Task 1' }),
        createMockTask({ id: 'persist-2', title: 'Task 2' }),
      ]

      mockTaskStore.mockReturnValue({
        tasks,
        clearTasks: vi.fn(),
        getTasks: vi.fn(() => tasks),
        hasMigratedToDatabase: false,
        setMigrationComplete: vi.fn(),
      })

      mockEnvironmentStore.mockReturnValue({
        environments: [],
        clearEnvironments: vi.fn(),
        getEnvironments: vi.fn(() => []),
        hasMigratedToDatabase: false,
        setMigrationComplete: vi.fn(),
      })

      let requestCount = 0
      server.use(
        http.post('/api/tasks', async ({ request }) => {
          requestCount++
          const body = await request.json()
          
          // Simulate interruption after first task
          if (requestCount === 1) {
            await delay(20)
            return HttpResponse.json({
              success: true,
              data: { ...body, id: `db-${body.id}` },
            }, { status: 201 })
          }
          
          // Simulate network failure for second task
          return HttpResponse.json({
            success: false,
            error: 'Network interrupted',
          }, { status: 500 })
        })
      )

      const wrapper = createWrapper()
      const { result, unmount } = renderHook(() => useMigration(), { wrapper })

      // Start migration
      act(() => {
        result.current.startMigration()
      })

      // Wait for partial completion
      await waitFor(() => {
        expect(result.current.migrationProgress.tasks.migrated).toBe(1)
        expect(result.current.migrationProgress.tasks.failed).toBe(1)
      })

      // Simulate app reload by unmounting and remounting
      const migrationState = {
        status: result.current.migrationStatus,
        progress: result.current.migrationProgress,
        errors: result.current.migrationErrors,
      }

      unmount()

      // Mock reading persisted state
      localStorageMock.getItem.mockReturnValue(JSON.stringify(migrationState))

      // Remount with persisted state
      const { result: newResult } = renderHook(() => useMigration(), { wrapper })

      // Should restore previous state
      expect(newResult.current.migrationProgress.tasks.migrated).toBe(1)
      expect(newResult.current.migrationProgress.tasks.failed).toBe(1)

      // Can continue migration
      expect(newResult.current.canRetryMigration).toBe(true)
    })
  })

  describe('Migration Cleanup', () => {
    it('should clean up localStorage after successful migration', async () => {
      const tasks = [createMockTask({ id: 'cleanup-1', title: 'Cleanup Task' })]
      
      // Set initial localStorage data
      localStorageMock.setItem('task-store', JSON.stringify({ tasks }))
      localStorageMock.setItem('environment-store', JSON.stringify({ environments: [] }))
      localStorageMock.setItem('user-preferences', JSON.stringify({ theme: 'dark' }))

      mockTaskStore.mockReturnValue({
        tasks,
        clearTasks: vi.fn(),
        getTasks: vi.fn(() => tasks),
        hasMigratedToDatabase: false,
        setMigrationComplete: vi.fn(),
      })

      mockEnvironmentStore.mockReturnValue({
        environments: [],
        clearEnvironments: vi.fn(),
        getEnvironments: vi.fn(() => []),
        hasMigratedToDatabase: false,
        setMigrationComplete: vi.fn(),
      })

      server.use(
        http.post('/api/tasks', async ({ request }) => {
          const body = await request.json()
          return HttpResponse.json({
            success: true,
            data: { ...body, id: `db-${body.id}` },
          }, { status: 201 })
        })
      )

      const wrapper = createWrapper()
      const { result } = renderHook(() => useMigration(), { wrapper })

      // Start migration
      act(() => {
        result.current.startMigration()
      })

      await waitFor(() => {
        expect(result.current.migrationStatus).toBe('completed')
      })

      // Verify store data was cleared
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('task-store')
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('environment-store')
      
      // User preferences should remain
      expect(localStorageMock.removeItem).not.toHaveBeenCalledWith('user-preferences')
    })
  })

  describe('Migration Validation', () => {
    it('should validate migrated data integrity', async () => {
      const originalTasks = [
        createMockTask({ 
          id: 'validate-1', 
          title: 'Validation Task',
          tags: ['important', 'urgent'],
          metadata: { customField: 'value' },
        }),
      ]

      mockTaskStore.mockReturnValue({
        tasks: originalTasks,
        clearTasks: vi.fn(),
        getTasks: vi.fn(() => originalTasks),
        hasMigratedToDatabase: false,
        setMigrationComplete: vi.fn(),
      })

      mockEnvironmentStore.mockReturnValue({
        environments: [],
        clearEnvironments: vi.fn(),
        getEnvironments: vi.fn(() => []),
        hasMigratedToDatabase: false,
        setMigrationComplete: vi.fn(),
      })

      let migratedTask: any
      server.use(
        http.post('/api/tasks', async ({ request }) => {
          const body = await request.json()
          migratedTask = { ...body, id: `db-${body.id}` }
          return HttpResponse.json({
            success: true,
            data: migratedTask,
          }, { status: 201 })
        }),
        http.get('/api/tasks', () => {
          return HttpResponse.json({
            success: true,
            data: {
              tasks: migratedTask ? [migratedTask] : [],
              total: migratedTask ? 1 : 0,
              hasMore: false,
            },
          })
        })
      )

      const wrapper = createWrapper()
      const { result } = renderHook(() => {
        const migration = useMigration()
        const tasks = useTasks()
        return { migration, tasks }
      }, { wrapper })

      // Start migration
      act(() => {
        result.current.migration.startMigration()
      })

      await waitFor(() => {
        expect(result.current.migration.migrationStatus).toBe('completed')
      })

      // Verify data integrity
      await waitFor(() => {
        expect(result.current.tasks.data?.tasks).toHaveLength(1)
      })

      const migratedData = result.current.tasks.data?.tasks[0]
      expect(migratedData?.title).toBe('Validation Task')
      expect(migratedData?.tags).toEqual(['important', 'urgent'])
      expect(migratedData?.metadata).toEqual({ customField: 'value' })
    })
  })
})