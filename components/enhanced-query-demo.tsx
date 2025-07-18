'use client'

import { useState, useMemo } from 'react'
import {
  useTasksQuery,
  useTaskSearchQuery,
  useCreateTaskMutation,
  useUpdateTaskMutation,
  useBulkTaskMutation,
} from '@/hooks/use-task-queries'
import { useExecutionsQuery, useExecutionAnalyticsQuery } from '@/hooks/use-execution-queries'
import {
  QueryPerformanceMonitor,
  QueryCacheStatus,
  WASMOptimizationStatus,
} from '@/components/providers/query-provider'

/**
 * Demo component showcasing Enhanced TanStack Query integration
 */
export function EnhancedQueryDemo() {
  const [userId] = useState('demo-user-123')
  const [searchQuery, setSearchQuery] = useState('')
  const [useSemanticSearch, setUseSemanticSearch] = useState(false)
  const [selectedTasks, setSelectedTasks] = useState<string[]>([])

  // Task filters
  const [taskFilters, setTaskFilters] = useState({
    status: [] as string[],
    priority: [] as string[],
    userId,
  })

  // Enhanced task queries with WASM optimization
  const {
    tasks,
    loading: tasksLoading,
    error: tasksError,
    refetch: refetchTasks,
    isStale: tasksStale,
    isFetching: tasksFetching,
  } = useTasksQuery(taskFilters)

  // Semantic search with vector search
  const {
    tasks: searchResults,
    loading: searchLoading,
    isSemanticSearch,
    refetch: refetchSearch,
  } = useTaskSearchQuery({
    query: searchQuery,
    useSemanticSearch,
    filters: taskFilters,
    limit: 20,
  })

  // Execution analytics with WASM optimization
  const {
    analytics,
    loading: analyticsLoading,
    error: analyticsError,
  } = useExecutionAnalyticsQuery({ taskId: undefined })

  // Mutations with optimistic updates
  const createTaskMutation = useCreateTaskMutation()
  const updateTaskMutation = useUpdateTaskMutation()
  const bulkTaskMutation = useBulkTaskMutation()

  // Form state
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [newTaskDescription, setNewTaskDescription] = useState('')

  // Display data - use search results if searching, otherwise use filtered tasks
  const displayTasks = searchQuery.trim() ? searchResults || [] : tasks

  // Task statistics
  const taskStats = useMemo(() => {
    if (!displayTasks) return { total: 0, pending: 0, inProgress: 0, completed: 0 }

    return {
      total: displayTasks.length,
      pending: displayTasks.filter((t) => t.status === 'pending').length,
      inProgress: displayTasks.filter((t) => t.status === 'in_progress').length,
      completed: displayTasks.filter((t) => t.status === 'completed').length,
    }
  }, [displayTasks])

  // Handle task creation
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTaskTitle.trim()) return

    try {
      await createTaskMutation.mutateAsync({
        title: newTaskTitle,
        description: newTaskDescription || undefined,
        status: 'pending',
        priority: 'medium',
        userId,
      })
      setNewTaskTitle('')
      setNewTaskDescription('')
    } catch (error) {
      console.error('Failed to create task:', error)
    }
  }

  // Handle bulk status update
  const handleBulkStatusUpdate = async (status: string) => {
    if (!selectedTasks.length) return

    try {
      await bulkTaskMutation.mutateAsync({
        taskIds: selectedTasks,
        updates: { status },
      })
      setSelectedTasks([])
    } catch (error) {
      console.error('Failed to bulk update tasks:', error)
    }
  }

  // Handle task selection
  const handleTaskSelection = (taskId: string, selected: boolean) => {
    setSelectedTasks((prev) => (selected ? [...prev, taskId] : prev.filter((id) => id !== taskId)))
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Enhanced TanStack Query Demo</h1>
        <div className="flex items-center space-x-4">
          <QueryCacheStatus />
        </div>
      </div>

      {/* WASM Status */}
      <WASMOptimizationStatus />

      {/* Search Section */}
      <div className="bg-white rounded-lg border p-6">
        <h2 className="text-xl font-semibold mb-4">Smart Search</h2>
        <div className="space-y-4">
          <div className="flex space-x-4">
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={useSemanticSearch}
                onChange={(e) => setUseSemanticSearch(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm">Semantic Search (WASM)</span>
            </label>
          </div>

          {searchQuery && (
            <div className="text-sm text-gray-600">
              {searchLoading ? (
                <span>Searching...</span>
              ) : (
                <span>
                  Found {searchResults?.length || 0} results
                  {isSemanticSearch && ' (using WASM vector search)'}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Filters Section */}
      <div className="bg-white rounded-lg border p-6">
        <h2 className="text-xl font-semibold mb-4">Filters</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Status</label>
            <div className="space-y-2">
              {['pending', 'in_progress', 'completed', 'cancelled'].map((status) => (
                <label key={status} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={taskFilters.status.includes(status)}
                    onChange={(e) => {
                      setTaskFilters((prev) => ({
                        ...prev,
                        status: e.target.checked
                          ? [...prev.status, status]
                          : prev.status.filter((s) => s !== status),
                      }))
                    }}
                    className="rounded"
                  />
                  <span className="text-sm capitalize">{status.replace('_', ' ')}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Priority</label>
            <div className="space-y-2">
              {['low', 'medium', 'high'].map((priority) => (
                <label key={priority} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={taskFilters.priority.includes(priority)}
                    onChange={(e) => {
                      setTaskFilters((prev) => ({
                        ...prev,
                        priority: e.target.checked
                          ? [...prev.priority, priority]
                          : prev.priority.filter((p) => p !== priority),
                      }))
                    }}
                    className="rounded"
                  />
                  <span className="text-sm capitalize">{priority}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Task Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">{taskStats.total}</div>
          <div className="text-sm text-gray-600">Total Tasks</div>
        </div>
        <div className="bg-white rounded-lg border p-4 text-center">
          <div className="text-2xl font-bold text-yellow-600">{taskStats.pending}</div>
          <div className="text-sm text-gray-600">Pending</div>
        </div>
        <div className="bg-white rounded-lg border p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">{taskStats.inProgress}</div>
          <div className="text-sm text-gray-600">In Progress</div>
        </div>
        <div className="bg-white rounded-lg border p-4 text-center">
          <div className="text-2xl font-bold text-green-600">{taskStats.completed}</div>
          <div className="text-sm text-gray-600">Completed</div>
        </div>
      </div>

      {/* Create Task Form */}
      <div className="bg-white rounded-lg border p-6">
        <h2 className="text-xl font-semibold mb-4">Create New Task (with Optimistic Updates)</h2>
        <form onSubmit={handleCreateTask} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Task title"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              className="px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              placeholder="Task description (optional)"
              value={newTaskDescription}
              onChange={(e) => setNewTaskDescription(e.target.value)}
              className="px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            type="submit"
            disabled={!newTaskTitle.trim() || createTaskMutation.isPending}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {createTaskMutation.isPending ? 'Creating...' : 'Create Task'}
          </button>
        </form>
      </div>

      {/* Bulk Operations */}
      {selectedTasks.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">
              {selectedTasks.length} task{selectedTasks.length !== 1 ? 's' : ''} selected
            </span>
            <div className="space-x-2">
              <button
                onClick={() => handleBulkStatusUpdate('completed')}
                disabled={bulkTaskMutation.isPending}
                className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-300"
              >
                Mark Completed
              </button>
              <button
                onClick={() => handleBulkStatusUpdate('cancelled')}
                disabled={bulkTaskMutation.isPending}
                className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={() => setSelectedTasks([])}
                className="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                Clear Selection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tasks List */}
      <div className="bg-white rounded-lg border p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">
            Tasks {tasksStale && <span className="text-sm text-orange-600">(stale)</span>}
          </h2>
          <div className="flex items-center space-x-2">
            {tasksFetching && <div className="text-sm text-blue-600">Fetching...</div>}
            <button
              onClick={() => refetchTasks()}
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Refresh
            </button>
          </div>
        </div>

        {tasksLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading tasks...</p>
          </div>
        ) : tasksError ? (
          <div className="text-center py-8 text-red-600">
            Error loading tasks: {tasksError.message}
          </div>
        ) : !displayTasks?.length ? (
          <div className="text-center py-8 text-gray-500">
            No tasks found. Create your first task above!
          </div>
        ) : (
          <div className="space-y-3">
            {displayTasks.map((task) => (
              <div key={task.id} className="border rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <input
                    type="checkbox"
                    checked={selectedTasks.includes(task.id)}
                    onChange={(e) => handleTaskSelection(task.id, e.target.checked)}
                    className="mt-1 rounded"
                  />
                  <div className="flex-1">
                    <h4 className="font-medium">{task.title}</h4>
                    {task.description && (
                      <p className="text-gray-600 text-sm mt-1">{task.description}</p>
                    )}
                    <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                      <span
                        className={`px-2 py-1 rounded ${
                          task.status === 'completed'
                            ? 'bg-green-100 text-green-800'
                            : task.status === 'in_progress'
                              ? 'bg-blue-100 text-blue-800'
                              : task.status === 'cancelled'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {task.status.replace('_', ' ')}
                      </span>
                      <span
                        className={`px-2 py-1 rounded ${
                          task.priority === 'high'
                            ? 'bg-red-100 text-red-800'
                            : task.priority === 'medium'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-green-100 text-green-800'
                        }`}
                      >
                        {task.priority}
                      </span>
                      <span>Created: {new Date(task.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Analytics Section */}
      {analytics && (
        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-xl font-semibold mb-4">Execution Analytics (WASM Optimized)</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{analytics.totalExecutions}</div>
              <div className="text-sm text-gray-600">Total Executions</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{analytics.successRate}%</div>
              <div className="text-sm text-gray-600">Success Rate</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {analytics.averageExecutionTime}ms
              </div>
              <div className="text-sm text-gray-600">Avg Time</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {Object.keys(analytics.executionsByAgent).length}
              </div>
              <div className="text-sm text-gray-600">Agent Types</div>
            </div>
          </div>
        </div>
      )}

      {/* Performance Monitor */}
      <QueryPerformanceMonitor />
    </div>
  )
}
