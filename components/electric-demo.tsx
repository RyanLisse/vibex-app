'use client'

import { useState } from 'react'
import { useElectricTasks, useElectricEnvironments } from '@/hooks/use-electric-tasks'
import { useElectricContext } from '@/components/providers/electric-provider'
import { ElectricConnectionStatus, ElectricSyncButton, ElectricOfflineIndicator } from '@/components/providers/electric-provider'

// Demo component to showcase ElectricSQL integration
export function ElectricDemo() {
  const [userId] = useState('demo-user-123') // In real app, get from auth
  const { isReady, isConnected, isSyncing, error } = useElectricContext()
  
  const {
    tasks,
    taskStats,
    loading: tasksLoading,
    error: tasksError,
    createTask,
    updateTask,
    deleteTask,
  } = useElectricTasks(userId)

  const {
    environments,
    activeEnvironment,
    loading: environmentsLoading,
    error: environmentsError,
    createEnvironment,
    activateEnvironment,
  } = useElectricEnvironments(userId)

  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [newTaskDescription, setNewTaskDescription] = useState('')
  const [newEnvName, setNewEnvName] = useState('')

  // Handle creating a new task
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTaskTitle.trim()) return

    try {
      await createTask({
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

  // Handle creating a new environment
  const handleCreateEnvironment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newEnvName.trim()) return

    try {
      await createEnvironment({
        name: newEnvName,
        config: { type: 'development', settings: {} },
        isActive: false,
        userId,
      })
      setNewEnvName('')
    } catch (error) {
      console.error('Failed to create environment:', error)
    }
  }

  // Handle task status update
  const handleUpdateTaskStatus = async (taskId: string, status: string) => {
    try {
      await updateTask(taskId, { status })
    } catch (error) {
      console.error('Failed to update task:', error)
    }
  }

  if (!isReady) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Initializing ElectricSQL...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-red-800 font-medium">ElectricSQL Error</h3>
          <p className="text-red-600 text-sm mt-1">{error.message}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      {/* Header with connection status */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">ElectricSQL Demo</h1>
        <div className="flex items-center space-x-4">
          <ElectricConnectionStatus />
          <ElectricSyncButton />
        </div>
      </div>

      {/* Connection info */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h2 className="text-lg font-semibold mb-2">Connection Status</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Ready:</span>
            <span className={`ml-2 ${isReady ? 'text-green-600' : 'text-red-600'}`}>
              {isReady ? 'Yes' : 'No'}
            </span>
          </div>
          <div>
            <span className="text-gray-600">Connected:</span>
            <span className={`ml-2 ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
              {isConnected ? 'Yes' : 'No'}
            </span>
          </div>
          <div>
            <span className="text-gray-600">Syncing:</span>
            <span className={`ml-2 ${isSyncing ? 'text-blue-600' : 'text-gray-600'}`}>
              {isSyncing ? 'Yes' : 'No'}
            </span>
          </div>
          <div>
            <span className="text-gray-600">User ID:</span>
            <span className="ml-2 text-gray-800">{userId}</span>
          </div>
        </div>
      </div>

      {/* Tasks Section */}
      <div className="bg-white rounded-lg border p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Tasks</h2>
          {tasksLoading && <div className="text-sm text-gray-500">Loading...</div>}
        </div>

        {/* Task Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{taskStats.total}</div>
            <div className="text-sm text-gray-600">Total</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">{taskStats.pending}</div>
            <div className="text-sm text-gray-600">Pending</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{taskStats.inProgress}</div>
            <div className="text-sm text-gray-600">In Progress</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{taskStats.completed}</div>
            <div className="text-sm text-gray-600">Completed</div>
          </div>
        </div>

        {/* Create Task Form */}
        <form onSubmit={handleCreateTask} className="mb-6 p-4 border rounded-lg">
          <h3 className="font-medium mb-3">Create New Task</h3>
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Task title"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <textarea
              placeholder="Task description (optional)"
              value={newTaskDescription}
              onChange={(e) => setNewTaskDescription(e.target.value)}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={2}
            />
            <button
              type="submit"
              disabled={!newTaskTitle.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              Create Task
            </button>
          </div>
        </form>

        {/* Tasks List */}
        {tasksError ? (
          <div className="text-red-600 text-sm">Error loading tasks: {tasksError.message}</div>
        ) : (
          <div className="space-y-3">
            {tasks.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                No tasks yet. Create your first task above!
              </div>
            ) : (
              tasks.map((task) => (
                <div key={task.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium">{task.title}</h4>
                      {task.description && (
                        <p className="text-gray-600 text-sm mt-1">{task.description}</p>
                      )}
                      <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                        <span>Priority: {task.priority}</span>
                        <span>Created: {new Date(task.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <select
                        value={task.status}
                        onChange={(e) => handleUpdateTaskStatus(task.id, e.target.value)}
                        className="text-sm border rounded px-2 py-1"
                      >
                        <option value="pending">Pending</option>
                        <option value="in_progress">In Progress</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                      <button
                        onClick={() => deleteTask(task.id)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Environments Section */}
      <div className="bg-white rounded-lg border p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Environments</h2>
          {environmentsLoading && <div className="text-sm text-gray-500">Loading...</div>}
        </div>

        {/* Create Environment Form */}
        <form onSubmit={handleCreateEnvironment} className="mb-6 p-4 border rounded-lg">
          <h3 className="font-medium mb-3">Create New Environment</h3>
          <div className="flex space-x-3">
            <input
              type="text"
              placeholder="Environment name"
              value={newEnvName}
              onChange={(e) => setNewEnvName(e.target.value)}
              className="flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              disabled={!newEnvName.trim()}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              Create
            </button>
          </div>
        </form>

        {/* Environments List */}
        {environmentsError ? (
          <div className="text-red-600 text-sm">Error loading environments: {environmentsError.message}</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {environments.length === 0 ? (
              <div className="col-span-full text-center text-gray-500 py-8">
                No environments yet. Create your first environment above!
              </div>
            ) : (
              environments.map((env) => (
                <div
                  key={env.id}
                  className={`border rounded-lg p-4 ${
                    env.isActive ? 'border-green-500 bg-green-50' : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">{env.name}</h4>
                    {env.isActive && (
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                        Active
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 mb-3">
                    Created: {new Date(env.createdAt).toLocaleDateString()}
                  </div>
                  {!env.isActive && (
                    <button
                      onClick={() => activateEnvironment(env.id)}
                      className="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                    >
                      Activate
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Offline Indicator */}
      <ElectricOfflineIndicator />
    </div>
  )
}
