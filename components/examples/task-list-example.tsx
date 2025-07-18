/**
 * Task List Example Component
 *
 * Demonstrates how to use the new TanStack Query hooks with Redis caching
 * instead of the old Zustand stores
 */

'use client'

import { useState } from 'react'
import { Plus, Archive, Play, Pause, X, RefreshCw } from 'lucide-react'
import {
  useTasks,
  useCreateTask,
  useUpdateTask,
  useDeleteTask,
  useArchiveTask,
  usePauseTask,
  useResumeTask,
  useCancelTask,
  type Task,
} from '@/lib/query/hooks'

interface TaskListExampleProps {
  className?: string
}

export function TaskListExample({ className = '' }: TaskListExampleProps) {
  const [showArchived, setShowArchived] = useState(false)
  const [newTaskTitle, setNewTaskTitle] = useState('')

  // Fetch tasks with filters
  const {
    data: tasksData,
    isLoading,
    error,
    refetch,
  } = useTasks({
    archived: showArchived,
  })

  // Mutations
  const createTask = useCreateTask()
  const updateTask = useUpdateTask()
  const deleteTask = useDeleteTask()
  const archiveTask = useArchiveTask()
  const pauseTask = usePauseTask()
  const resumeTask = useResumeTask()
  const cancelTask = useCancelTask()

  const tasks = tasksData?.tasks || []

  const handleCreateTask = async () => {
    if (!newTaskTitle.trim()) return

    try {
      await createTask.mutateAsync({
        title: newTaskTitle,
        description: '',
        status: 'IN_PROGRESS',
        branch: 'main',
        sessionId: 'example-session',
        repository: 'example-repo',
        mode: 'code',
        hasChanges: false,
        messages: [],
      })
      setNewTaskTitle('')
    } catch (error) {
      console.error('Failed to create task:', error)
    }
  }

  const handleUpdateTaskTitle = async (taskId: string, newTitle: string) => {
    try {
      await updateTask.mutateAsync({
        id: taskId,
        data: { title: newTitle },
      })
    } catch (error) {
      console.error('Failed to update task:', error)
    }
  }

  const handleTaskAction = async (taskId: string, action: string) => {
    try {
      switch (action) {
        case 'archive':
          await archiveTask.mutateAsync(taskId)
          break
        case 'pause':
          await pauseTask.mutateAsync(taskId)
          break
        case 'resume':
          await resumeTask.mutateAsync(taskId)
          break
        case 'cancel':
          await cancelTask.mutateAsync(taskId)
          break
        case 'delete':
          await deleteTask.mutateAsync(taskId)
          break
      }
    } catch (error) {
      console.error(`Failed to ${action} task:`, error)
    }
  }

  if (isLoading) {
    return (
      <div className={`p-6 ${className}`}>
        <div className="flex items-center justify-center space-x-2">
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span>Loading tasks...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`p-6 ${className}`}>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="text-red-800 font-medium">Error loading tasks</div>
          <div className="text-red-600 text-sm mt-1">{error.message}</div>
          <button
            onClick={() => refetch()}
            className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
          >
            Try again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={`p-6 ${className}`}>
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-4">Tasks ({tasks.length})</h2>

        {/* Create new task */}
        <div className="flex space-x-2 mb-4">
          <input
            type="text"
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            placeholder="Enter task title..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            onKeyPress={(e) => e.key === 'Enter' && handleCreateTask()}
          />
          <button
            onClick={handleCreateTask}
            disabled={createTask.isPending || !newTaskTitle.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
          >
            {createTask.isPending ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            <span>Add Task</span>
          </button>
        </div>

        {/* Filter toggle */}
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setShowArchived(!showArchived)}
            className={`px-3 py-1 rounded-md text-sm ${
              showArchived ? 'bg-gray-200 text-gray-800' : 'bg-blue-100 text-blue-800'
            }`}
          >
            {showArchived ? 'Show Active' : 'Show Archived'}
          </button>

          <button
            onClick={() => refetch()}
            className="text-sm text-gray-600 hover:text-gray-800 flex items-center space-x-1"
          >
            <RefreshCw className="h-3 w-3" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Task list */}
      <div className="space-y-3">
        {tasks.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {showArchived ? 'No archived tasks' : 'No active tasks'}
          </div>
        ) : (
          tasks.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              onUpdateTitle={(newTitle) => handleUpdateTaskTitle(task.id, newTitle)}
              onAction={(action) => handleTaskAction(task.id, action)}
              isUpdating={updateTask.isPending}
            />
          ))
        )}
      </div>

      {/* Mutation status */}
      {(createTask.error || updateTask.error || deleteTask.error) && (
        <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3">
          <div className="text-red-800 text-sm">
            {createTask.error?.message || updateTask.error?.message || deleteTask.error?.message}
          </div>
        </div>
      )}
    </div>
  )
}

interface TaskItemProps {
  task: Task
  onUpdateTitle: (newTitle: string) => void
  onAction: (action: string) => void
  isUpdating: boolean
}

function TaskItem({ task, onUpdateTitle, onAction, isUpdating }: TaskItemProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(task.title)

  const handleSaveTitle = () => {
    if (editTitle.trim() !== task.title) {
      onUpdateTitle(editTitle.trim())
    }
    setIsEditing(false)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'IN_PROGRESS':
        return 'bg-blue-100 text-blue-800'
      case 'DONE':
        return 'bg-green-100 text-green-800'
      case 'PAUSED':
        return 'bg-yellow-100 text-yellow-800'
      case 'CANCELLED':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          {isEditing ? (
            <div className="flex space-x-2">
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                onKeyPress={(e) => e.key === 'Enter' && handleSaveTitle()}
                onBlur={handleSaveTitle}
                autoFocus
              />
            </div>
          ) : (
            <h3
              className="font-medium cursor-pointer hover:text-blue-600"
              onClick={() => setIsEditing(true)}
            >
              {task.title}
            </h3>
          )}

          <div className="flex items-center space-x-2 mt-2">
            <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(task.status)}`}>
              {task.status}
            </span>
            <span className="text-xs text-gray-500">
              {task.mode} • {task.repository}
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-1 ml-4">
          {task.status === 'IN_PROGRESS' && (
            <button
              onClick={() => onAction('pause')}
              className="p-1 text-gray-400 hover:text-yellow-600"
              title="Pause task"
            >
              <Pause className="h-4 w-4" />
            </button>
          )}

          {task.status === 'PAUSED' && (
            <button
              onClick={() => onAction('resume')}
              className="p-1 text-gray-400 hover:text-blue-600"
              title="Resume task"
            >
              <Play className="h-4 w-4" />
            </button>
          )}

          {!task.isArchived && (
            <button
              onClick={() => onAction('archive')}
              className="p-1 text-gray-400 hover:text-gray-600"
              title="Archive task"
            >
              <Archive className="h-4 w-4" />
            </button>
          )}

          <button
            onClick={() => onAction('delete')}
            className="p-1 text-gray-400 hover:text-red-600"
            title="Delete task"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {isUpdating && (
        <div className="mt-2 text-xs text-gray-500 flex items-center space-x-1">
          <RefreshCw className="h-3 w-3 animate-spin" />
          <span>Updating...</span>
        </div>
      )}
    </div>
  )
}
