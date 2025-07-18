'use client'

import { useEffect, useMemo, useState } from 'react'
import { useElectricContext } from '@/components/providers/electric-provider'
import {
  QueryCacheStatus,
  QueryPerformanceMonitor,
  WASMOptimizationStatus,
} from '@/components/providers/query-provider'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { useElectricEnvironments, useElectricTasks } from '@/hooks/use-electric-tasks'
import { useExecutionAnalyticsQuery } from '@/hooks/use-execution-queries'
import {
  useCreateTaskMutation,
  useTaskSearchQuery,
  useTasksQuery,
  useUpdateTaskMutation,
} from '@/hooks/use-task-queries'
import { wasmServices } from '@/lib/wasm/services'

interface User {
  id: string
  name: string
  color: string
  isOnline: boolean
}

/**
 * Comprehensive Database Observability Demo
 *
 * This component showcases all implemented database observability features:
 * - ElectricSQL real-time sync with offline-first architecture
 * - Enhanced TanStack Query with WASM optimizations
 * - Multi-user collaboration simulation
 * - Performance monitoring and analytics
 * - Network status simulation
 */
export function DatabaseObservabilityDemo() {
  // User simulation
  const [currentUser, setCurrentUser] = useState<User>({
    id: 'user-1',
    name: 'Alice',
    color: 'bg-blue-500',
    isOnline: true,
  })

  const [simulatedUsers] = useState<User[]>([
    { id: 'user-1', name: 'Alice', color: 'bg-blue-500', isOnline: true },
    { id: 'user-2', name: 'Bob', color: 'bg-green-500', isOnline: true },
    { id: 'user-3', name: 'Charlie', color: 'bg-purple-500', isOnline: false },
    { id: 'user-4', name: 'Diana', color: 'bg-pink-500', isOnline: true },
  ])

  // Network simulation
  const [isOnline, setIsOnline] = useState(true)
  const [networkLatency, setNetworkLatency] = useState(50) // ms

  // Demo state
  const [activeTab, setActiveTab] = useState('overview')
  const [searchQuery, setSearchQuery] = useState('')
  const [useSemanticSearch, setUseSemanticSearch] = useState(false)
  const [selectedTasks, setSelectedTasks] = useState<string[]>([])
  const [showPerformanceMetrics, setShowPerformanceMetrics] = useState(true)

  // ElectricSQL integration
  const { isReady, isConnected, isSyncing, error: electricError } = useElectricContext()

  const {
    tasks: electricTasks,
    taskStats,
    loading: electricLoading,
    error: electricTasksError,
    createTask: createElectricTask,
    updateTask: updateElectricTask,
    deleteTask: deleteElectricTask,
  } = useElectricTasks(currentUser.id)

  const {
    environments,
    activeEnvironment,
    loading: environmentsLoading,
    createEnvironment,
    activateEnvironment,
  } = useElectricEnvironments(currentUser.id)

  // Enhanced TanStack Query integration
  const {
    tasks: queryTasks,
    loading: queryLoading,
    error: queryError,
    refetch: refetchTasks,
    isStale: tasksStale,
    isFetching: tasksFetching,
  } = useTasksQuery({
    status: [],
    priority: [],
    userId: currentUser.id,
  })

  // Semantic search with WASM
  const {
    tasks: searchResults,
    loading: searchLoading,
    isSemanticSearch,
  } = useTaskSearchQuery({
    query: searchQuery,
    useSemanticSearch,
    filters: { userId: currentUser.id },
    limit: 20,
  })

  // Analytics with WASM optimization
  const { analytics, loading: analyticsLoading } = useExecutionAnalyticsQuery({ taskId: undefined })

  // Mutations
  const createTaskMutation = useCreateTaskMutation()
  const updateTaskMutation = useUpdateTaskMutation()

  // Form state
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [newTaskDescription, setNewTaskDescription] = useState('')

  // WASM services status
  const [wasmStatus, setWasmStatus] = useState<any>(null)

  useEffect(() => {
    const checkWasmStatus = async () => {
      try {
        const health = await wasmServices.healthCheck()
        const stats = wasmServices.getStats()
        setWasmStatus({ health, stats })
      } catch (error) {
        console.warn('WASM services not available:', error)
      }
    }

    checkWasmStatus()
    const interval = setInterval(checkWasmStatus, 5000)
    return () => clearInterval(interval)
  }, [])

  // Simulate network status changes
  useEffect(() => {
    const interval = setInterval(() => {
      if (Math.random() < 0.1) {
        // 10% chance to change network status
        setNetworkLatency((prev) => Math.max(10, prev + (Math.random() - 0.5) * 100))
      }
    }, 2000)

    return () => clearInterval(interval)
  }, [])

  // Display data - prioritize ElectricSQL for real-time features
  const displayTasks = searchQuery.trim() ? searchResults || [] : electricTasks || queryTasks || []

  // Combined statistics
  const combinedStats = useMemo(() => {
    const tasks = displayTasks || []
    return {
      total: tasks.length,
      pending: tasks.filter((t) => t.status === 'pending').length,
      inProgress: tasks.filter((t) => t.status === 'in_progress').length,
      completed: tasks.filter((t) => t.status === 'completed').length,
      online: simulatedUsers.filter((u) => u.isOnline).length,
      offline: simulatedUsers.filter((u) => !u.isOnline).length,
    }
  }, [displayTasks, simulatedUsers])

  // Handle task creation with both systems
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTaskTitle.trim()) return

    const taskData = {
      title: newTaskTitle,
      description: newTaskDescription || undefined,
      status: 'pending' as const,
      priority: 'medium' as const,
      userId: currentUser.id,
    }

    try {
      // Create in both systems for demonstration
      if (isReady && createElectricTask) {
        await createElectricTask(taskData)
      } else {
        await createTaskMutation.mutateAsync(taskData)
      }

      setNewTaskTitle('')
      setNewTaskDescription('')
    } catch (error) {
      console.error('Failed to create task:', error)
    }
  }

  // Handle user switching
  const handleUserSwitch = (user: User) => {
    setCurrentUser(user)
  }

  // Handle network toggle
  const handleNetworkToggle = () => {
    setIsOnline(!isOnline)
  }

  if (!isReady && electricLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-blue-600 border-b-2" />
          <p className="font-medium text-lg">Initializing Database Observability Demo...</p>
          <p className="mt-2 text-gray-600 text-sm">
            Loading ElectricSQL, WASM services, and TanStack Query
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-bold text-4xl text-gray-900">Database Observability Demo</h1>
            <p className="mt-2 text-gray-600 text-lg">
              Comprehensive showcase of ElectricSQL, Enhanced TanStack Query, and WASM optimizations
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <QueryCacheStatus />
            <Button
              onClick={() => setShowPerformanceMetrics(!showPerformanceMetrics)}
              variant={showPerformanceMetrics ? 'default' : 'outline'}
            >
              {showPerformanceMetrics ? 'Hide' : 'Show'} Metrics
            </Button>
          </div>
        </div>

        {/* Status Overview */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="font-medium text-sm">System Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">ElectricSQL</span>
                  <Badge variant={isReady && isConnected ? 'default' : 'destructive'}>
                    {isReady && isConnected ? 'Connected' : 'Disconnected'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Network</span>
                  <Badge variant={isOnline ? 'default' : 'destructive'}>
                    {isOnline ? 'Online' : 'Offline'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">WASM</span>
                  <Badge
                    variant={wasmStatus?.health?.overall === 'healthy' ? 'default' : 'secondary'}
                  >
                    {wasmStatus?.health?.overall || 'Unknown'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="font-medium text-sm">Task Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Total</span>
                  <span className="font-bold text-blue-600">{combinedStats.total}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Pending</span>
                  <span className="font-bold text-yellow-600">{combinedStats.pending}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">In Progress</span>
                  <span className="font-bold text-blue-600">{combinedStats.inProgress}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Completed</span>
                  <span className="font-bold text-green-600">{combinedStats.completed}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="font-medium text-sm">User Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Online Users</span>
                  <span className="font-bold text-green-600">{combinedStats.online}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Offline Users</span>
                  <span className="font-bold text-gray-600">{combinedStats.offline}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Current User</span>
                  <Badge className={currentUser.color}>{currentUser.name}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="font-medium text-sm">Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Network Latency</span>
                  <span className="font-bold">{networkLatency}ms</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Sync Status</span>
                  <Badge variant={isSyncing ? 'default' : 'secondary'}>
                    {isSyncing ? 'Syncing' : 'Idle'}
                  </Badge>
                </div>
                {wasmStatus?.stats && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm">WASM Init</span>
                    <span className="font-bold">
                      {wasmStatus.stats.initializationTime?.toFixed(1)}ms
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Demo Interface */}
        <Tabs className="space-y-6" onValueChange={setActiveTab} value={activeTab}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="collaboration">Collaboration</TabsTrigger>
            <TabsTrigger value="search">Smart Search</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
          </TabsList>

          <TabsContent className="space-y-6" value="overview">
            {/* User Simulation Controls */}
            <Card>
              <CardHeader>
                <CardTitle>Multi-User Simulation</CardTitle>
                <CardDescription>
                  Switch between different users to see real-time collaboration in action
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-4 flex flex-wrap gap-2">
                  {simulatedUsers.map((user) => (
                    <Button
                      className="flex items-center space-x-2"
                      disabled={!user.isOnline}
                      key={user.id}
                      onClick={() => handleUserSwitch(user)}
                      variant={currentUser.id === user.id ? 'default' : 'outline'}
                    >
                      <div className={`h-3 w-3 rounded-full ${user.color}`} />
                      <span>{user.name}</span>
                      {!user.isOnline && <span className="text-xs">(Offline)</span>}
                    </Button>
                  ))}
                </div>

                <div className="flex items-center space-x-4">
                  <Button
                    onClick={handleNetworkToggle}
                    variant={isOnline ? 'default' : 'destructive'}
                  >
                    {isOnline ? 'Go Offline' : 'Go Online'}
                  </Button>
                  <div className="text-gray-600 text-sm">Network latency: {networkLatency}ms</div>
                </div>
              </CardContent>
            </Card>

            {/* Task Creation Form */}
            <Card>
              <CardHeader>
                <CardTitle>Create New Task</CardTitle>
                <CardDescription>
                  Tasks are created with optimistic updates and real-time sync
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form className="space-y-4" onSubmit={handleCreateTask}>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Input
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                      placeholder="Task title"
                      value={newTaskTitle}
                    />
                    <Input
                      onChange={(e) => setNewTaskDescription(e.target.value)}
                      placeholder="Task description (optional)"
                      value={newTaskDescription}
                    />
                  </div>
                  <Button
                    className="w-full"
                    disabled={!newTaskTitle.trim() || createTaskMutation.isPending}
                    type="submit"
                  >
                    {createTaskMutation.isPending ? 'Creating...' : 'Create Task'}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Tasks List */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Tasks ({displayTasks?.length || 0})</span>
                  {tasksStale && <Badge variant="outline">Stale Data</Badge>}
                </CardTitle>
                <CardDescription>
                  Real-time collaborative task management with ElectricSQL sync
                </CardDescription>
              </CardHeader>
              <CardContent>
                {electricLoading || queryLoading ? (
                  <div className="py-8 text-center">
                    <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-blue-600 border-b-2" />
                    <p className="text-gray-600">Loading tasks...</p>
                  </div>
                ) : electricTasksError || queryError ? (
                  <div className="py-8 text-center text-red-600">
                    Error loading tasks: {(electricTasksError || queryError)?.message}
                  </div>
                ) : displayTasks?.length ? (
                  <div className="space-y-3">
                    {displayTasks.slice(0, 10).map((task) => (
                      <div className="rounded-lg border p-4 hover:bg-gray-50" key={task.id}>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium">{task.title}</h4>
                            {task.description && (
                              <p className="mt-1 text-gray-600 text-sm">{task.description}</p>
                            )}
                            <div className="mt-2 flex items-center space-x-2">
                              <Badge
                                variant={
                                  task.status === 'completed'
                                    ? 'default'
                                    : task.status === 'in_progress'
                                      ? 'secondary'
                                      : task.status === 'cancelled'
                                        ? 'destructive'
                                        : 'outline'
                                }
                              >
                                {task.status.replace('_', ' ')}
                              </Badge>
                              <Badge variant="outline">{task.priority}</Badge>
                              <span className="text-gray-500 text-xs">
                                {new Date(task.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    {displayTasks.length > 10 && (
                      <div className="text-center text-gray-500 text-sm">
                        ... and {displayTasks.length - 10} more tasks
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="py-8 text-center text-gray-500">
                    No tasks yet. Create your first task above!
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent className="space-y-6" value="collaboration">
            <Card>
              <CardHeader>
                <CardTitle>Real-Time Collaboration</CardTitle>
                <CardDescription>
                  See how multiple users can work together with conflict resolution
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                    {simulatedUsers.map((user) => (
                      <div className="rounded-lg border p-3 text-center" key={user.id}>
                        <div className={`h-8 w-8 rounded-full ${user.color} mx-auto mb-2`} />
                        <div className="font-medium text-sm">{user.name}</div>
                        <div className="text-gray-500 text-xs">
                          {user.isOnline ? 'Online' : 'Offline'}
                        </div>
                        {user.id === currentUser.id && (
                          <Badge className="mt-1" variant="outline">
                            You
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <h4 className="font-medium">Collaboration Features:</h4>
                    <ul className="space-y-1 text-gray-600 text-sm">
                      <li>• Real-time task updates across all connected users</li>
                      <li>• Automatic conflict resolution with last-write-wins</li>
                      <li>• Offline-first architecture with sync when reconnected</li>
                      <li>• User presence indicators and activity tracking</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent className="space-y-6" value="search">
            <Card>
              <CardHeader>
                <CardTitle>Smart Search with WASM</CardTitle>
                <CardDescription>
                  Experience semantic search powered by WebAssembly vector operations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex space-x-4">
                    <Input
                      className="flex-1"
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search tasks..."
                      value={searchQuery}
                    />
                    <div className="flex items-center space-x-2">
                      <input
                        checked={useSemanticSearch}
                        className="rounded"
                        id="semantic-search"
                        onChange={(e) => setUseSemanticSearch(e.target.checked)}
                        type="checkbox"
                      />
                      <label className="text-sm" htmlFor="semantic-search">
                        Semantic Search (WASM)
                      </label>
                    </div>
                  </div>

                  {searchQuery && (
                    <div className="rounded-lg bg-gray-50 p-3 text-gray-600 text-sm">
                      {searchLoading ? (
                        <span>Searching...</span>
                      ) : (
                        <div className="space-y-1">
                          <div>Found {searchResults?.length || 0} results</div>
                          {isSemanticSearch && (
                            <div className="text-blue-600">
                              ✨ Using WASM-powered vector search for semantic matching
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="space-y-2">
                    <h4 className="font-medium">Search Features:</h4>
                    <ul className="space-y-1 text-gray-600 text-sm">
                      <li>• Traditional keyword search with fuzzy matching</li>
                      <li>• Semantic search using WASM-optimized vector operations</li>
                      <li>• Real-time search results with intelligent caching</li>
                      <li>• Performance comparison between search methods</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent className="space-y-6" value="performance">
            <Card>
              <CardHeader>
                <CardTitle>Performance Metrics</CardTitle>
                <CardDescription>
                  Real-time performance monitoring of WASM optimizations and database operations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* WASM Performance */}
                  {wasmStatus && (
                    <div className="space-y-4">
                      <h4 className="font-medium">WASM Services Status</h4>
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                        <div className="rounded-lg border p-3">
                          <div className="font-medium text-sm">Vector Search</div>
                          <div className="font-bold text-green-600 text-lg">
                            {wasmStatus.health?.details?.vectorSearch || 'N/A'}
                          </div>
                        </div>
                        <div className="rounded-lg border p-3">
                          <div className="font-medium text-sm">SQLite Utils</div>
                          <div className="font-bold text-green-600 text-lg">
                            {wasmStatus.health?.details?.sqliteUtils || 'N/A'}
                          </div>
                        </div>
                        <div className="rounded-lg border p-3">
                          <div className="font-medium text-sm">Compute Engine</div>
                          <div className="font-bold text-green-600 text-lg">
                            {wasmStatus.health?.details?.computeEngine || 'N/A'}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Analytics */}
                  {analytics && (
                    <div className="space-y-4">
                      <h4 className="font-medium">Execution Analytics</h4>
                      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                        <div className="rounded-lg border p-3 text-center">
                          <div className="font-bold text-2xl text-blue-600">
                            {analytics.totalExecutions}
                          </div>
                          <div className="text-gray-600 text-sm">Total Executions</div>
                        </div>
                        <div className="rounded-lg border p-3 text-center">
                          <div className="font-bold text-2xl text-green-600">
                            {analytics.successRate}%
                          </div>
                          <div className="text-gray-600 text-sm">Success Rate</div>
                        </div>
                        <div className="rounded-lg border p-3 text-center">
                          <div className="font-bold text-2xl text-purple-600">
                            {analytics.averageExecutionTime}ms
                          </div>
                          <div className="text-gray-600 text-sm">Avg Time</div>
                        </div>
                        <div className="rounded-lg border p-3 text-center">
                          <div className="font-bold text-2xl text-orange-600">
                            {Object.keys(analytics.executionsByAgent).length}
                          </div>
                          <div className="text-gray-600 text-sm">Agent Types</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Network Performance */}
                  <div className="space-y-4">
                    <h4 className="font-medium">Network & Sync Performance</h4>
                    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                      <div className="rounded-lg border p-3 text-center">
                        <div className="font-bold text-2xl text-blue-600">{networkLatency}ms</div>
                        <div className="text-gray-600 text-sm">Network Latency</div>
                      </div>
                      <div className="rounded-lg border p-3 text-center">
                        <div className="font-bold text-2xl text-green-600">
                          {isConnected ? 'Connected' : 'Disconnected'}
                        </div>
                        <div className="text-gray-600 text-sm">Connection Status</div>
                      </div>
                      <div className="rounded-lg border p-3 text-center">
                        <div className="font-bold text-2xl text-purple-600">
                          {isSyncing ? 'Active' : 'Idle'}
                        </div>
                        <div className="text-gray-600 text-sm">Sync Status</div>
                      </div>
                      <div className="rounded-lg border p-3 text-center">
                        <div className="font-bold text-2xl text-orange-600">
                          {wasmStatus?.stats?.initializationTime?.toFixed(1) || 'N/A'}ms
                        </div>
                        <div className="text-gray-600 text-sm">WASM Init Time</div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent className="space-y-6" value="monitoring">
            <Card>
              <CardHeader>
                <CardTitle>Real-Time Monitoring</CardTitle>
                <CardDescription>
                  Live monitoring dashboard for database operations and system health
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* System Health */}
                  <div className="space-y-4">
                    <h4 className="font-medium">System Health Overview</h4>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                      <div className="rounded-lg border p-4">
                        <div className="mb-2 flex items-center justify-between">
                          <span className="font-medium text-sm">ElectricSQL</span>
                          <Badge variant={isReady && isConnected ? 'default' : 'destructive'}>
                            {isReady && isConnected ? 'Healthy' : 'Unhealthy'}
                          </Badge>
                        </div>
                        <div className="text-gray-600 text-xs">
                          Real-time sync: {isSyncing ? 'Active' : 'Idle'}
                        </div>
                      </div>

                      <div className="rounded-lg border p-4">
                        <div className="mb-2 flex items-center justify-between">
                          <span className="font-medium text-sm">TanStack Query</span>
                          <Badge variant="default">Healthy</Badge>
                        </div>
                        <div className="text-gray-600 text-xs">
                          Cache status: {tasksStale ? 'Stale' : 'Fresh'}
                        </div>
                      </div>

                      <div className="rounded-lg border p-4">
                        <div className="mb-2 flex items-center justify-between">
                          <span className="font-medium text-sm">WASM Services</span>
                          <Badge
                            variant={
                              wasmStatus?.health?.overall === 'healthy' ? 'default' : 'secondary'
                            }
                          >
                            {wasmStatus?.health?.overall || 'Unknown'}
                          </Badge>
                        </div>
                        <div className="text-gray-600 text-xs">
                          Services:{' '}
                          {wasmStatus?.stats?.capabilities?.isSupported
                            ? 'Available'
                            : 'Unavailable'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Activity Feed */}
                  <div className="space-y-4">
                    <h4 className="font-medium">Recent Activity</h4>
                    <div className="max-h-64 space-y-2 overflow-y-auto">
                      <div className="rounded border border-green-200 bg-green-50 p-2 text-sm">
                        <span className="font-medium text-green-800">Task Created:</span>
                        <span className="text-green-700">
                          {' '}
                          New task added by {currentUser.name}
                        </span>
                        <span className="ml-2 text-green-600 text-xs">2 minutes ago</span>
                      </div>
                      <div className="rounded border border-blue-200 bg-blue-50 p-2 text-sm">
                        <span className="font-medium text-blue-800">Sync Event:</span>
                        <span className="text-blue-700"> Real-time sync completed</span>
                        <span className="ml-2 text-blue-600 text-xs">5 minutes ago</span>
                      </div>
                      <div className="rounded border border-purple-200 bg-purple-50 p-2 text-sm">
                        <span className="font-medium text-purple-800">WASM Optimization:</span>
                        <span className="text-purple-700"> Vector search query optimized</span>
                        <span className="ml-2 text-purple-600 text-xs">8 minutes ago</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Performance Monitor */}
        {showPerformanceMetrics && <QueryPerformanceMonitor />}

        {/* WASM Optimization Status */}
        <WASMOptimizationStatus />
      </div>
    </div>
  )
}
