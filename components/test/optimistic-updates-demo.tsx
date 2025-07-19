'use client'

import { CheckCircle, Clock, Edit, Plus, RefreshCw, Trash2, XCircle, Zap } from 'lucide-react'
import { useState } from 'react'
import { ErrorBoundary } from '@/components/error-boundary'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ErrorDisplay, LoadingSpinner } from '@/components/ui/loading-states'
import type { Task } from '@/db/schema'
import { useElectricTasks } from '@/hooks/use-electric-tasks'

/**
 * Demo component to test and showcase optimistic updates functionality
 */
export function OptimisticUpdatesDemo() {
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [editingTask, setEditingTask] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')

  const { tasks, loading, error, createTask, updateTask, deleteTask, refetch } = useElectricTasks()

  const handleCreateTask = async () => {
    if (!newTaskTitle.trim()) return

    try {
      await createTask({
        title: newTaskTitle,
        description: 'Created via optimistic updates demo',
        status: 'pending',
        priority: 'medium',
      })
      setNewTaskTitle('')
    } catch (error) {
      console.error('Failed to create task:', error)
    }
  }

  const handleUpdateTask = async (taskId: string, updates: Partial<Task>) => {
    try {
      await updateTask(taskId, updates)
      setEditingTask(null)
      setEditTitle('')
    } catch (error) {
      console.error('Failed to update task:', error)
    }
  }

  const handleDeleteTask = async (taskId: string) => {
    try {
      await deleteTask(taskId)
    } catch (error) {
      console.error('Failed to delete task:', error)
    }
  }

  const startEditing = (task: Task) => {
    setEditingTask(task.id)
    setEditTitle(task.title)
  }

  const cancelEditing = () => {
    setEditingTask(null)
    setEditTitle('')
  }

  const saveEdit = () => {
    if (editingTask && editTitle.trim()) {
      handleUpdateTask(editingTask, { title: editTitle.trim() })
    }
  }

  const toggleTaskStatus = (task: Task) => {
    const newStatus = task.status === 'completed' ? 'pending' : 'completed'
    handleUpdateTask(task.id, { status: newStatus })
  }

  return (
    <ErrorBoundary>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Optimistic Updates Demo
            </CardTitle>
            <CardDescription>
              Test optimistic updates, cache invalidation, and error handling. Changes appear
              immediately and rollback on errors.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Create Task Section */}
            <div className="flex gap-2">
              <Input
                className="flex-1"
                onChange={(e) => setNewTaskTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateTask()}
                placeholder="Enter new task title..."
                value={newTaskTitle}
              />
              <Button disabled={!newTaskTitle.trim() || loading} onClick={handleCreateTask}>
                <Plus className="mr-2 h-4 w-4" />
                Add Task
              </Button>
              <Button disabled={loading} onClick={refetch} variant="outline">
                <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>

            {/* Instructions */}
            <Alert>
              <Zap className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <div className="font-medium">How to test optimistic updates:</div>
                  <ol className="list-inside list-decimal space-y-1 text-sm">
                    <li>Create, edit, or delete tasks - changes appear instantly</li>
                    <li>
                      Open DevTools → Network → Throttle to "Slow 3G" to see optimistic updates
                    </li>
                    <li>Disable network to test error rollback behavior</li>
                    <li>Watch how the UI stays responsive during network operations</li>
                  </ol>
                </div>
              </AlertDescription>
            </Alert>

            {/* Error Display */}
            {error && <ErrorDisplay error={error} onRetry={refetch} title="Failed to load tasks" />}

            {/* Loading State */}
            {loading && tasks.length === 0 && (
              <div className="flex items-center justify-center py-8">
                <LoadingSpinner message="Loading tasks..." />
              </div>
            )}

            {/* Tasks List */}
            <div className="space-y-3">
              {tasks.map((task) => (
                <Card className="transition-all duration-200" key={task.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex flex-1 items-center gap-3">
                        {/* Task Status Toggle */}
                        <Button
                          className="p-1"
                          onClick={() => toggleTaskStatus(task)}
                          size="sm"
                          variant="ghost"
                        >
                          {task.status === 'completed' ? (
                            <CheckCircle className="h-5 w-5 text-green-500" />
                          ) : (
                            <Clock className="h-5 w-5 text-gray-400" />
                          )}
                        </Button>

                        {/* Task Title (Editable) */}
                        <div className="flex-1">
                          {editingTask === task.id ? (
                            <div className="flex gap-2">
                              <Input
                                autoFocus
                                className="flex-1"
                                onChange={(e) => setEditTitle(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') saveEdit()
                                  if (e.key === 'Escape') cancelEditing()
                                }}
                                value={editTitle}
                              />
                              <Button onClick={saveEdit} size="sm">
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                              <Button onClick={cancelEditing} size="sm" variant="outline">
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span
                                className={`${
                                  task.status === 'completed'
                                    ? 'text-muted-foreground line-through'
                                    : ''
                                }`}
                              >
                                {task.title}
                              </span>
                              {task.id.startsWith('temp-') && (
                                <Badge className="text-xs" variant="outline">
                                  Optimistic
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Task Metadata */}
                        <div className="flex items-center gap-2">
                          <Badge variant={task.status === 'completed' ? 'default' : 'secondary'}>
                            {task.status}
                          </Badge>
                          <Badge variant="outline">{task.priority}</Badge>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="ml-4 flex items-center gap-1">
                        <Button
                          disabled={editingTask === task.id}
                          onClick={() => startEditing(task)}
                          size="sm"
                          variant="ghost"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDeleteTask(task.id)}
                          size="sm"
                          variant="ghost"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Task Description */}
                    {task.description && (
                      <div className="mt-2 pl-8 text-muted-foreground text-sm">
                        {task.description}
                      </div>
                    )}

                    {/* Timestamps */}
                    <div className="mt-2 flex items-center gap-4 pl-8 text-muted-foreground text-xs">
                      {task.createdAt && (
                        <span>Created: {new Date(task.createdAt).toLocaleString()}</span>
                      )}
                      {task.updatedAt && task.updatedAt !== task.createdAt && (
                        <span>Updated: {new Date(task.updatedAt).toLocaleString()}</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}

              {/* Empty State */}
              {!loading && tasks.length === 0 && (
                <Card>
                  <CardContent className="p-8 text-center">
                    <div className="text-muted-foreground">
                      <Clock className="mx-auto mb-4 h-12 w-12 opacity-50" />
                      <h3 className="mb-2 font-medium text-lg">No tasks yet</h3>
                      <p className="text-sm">Create your first task to test optimistic updates</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Debug Info (Development Only) */}
            {process.env.NODE_ENV === 'development' && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Debug Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 font-mono text-xs">
                    <div>Total Tasks: {tasks.length}</div>
                    <div>Loading: {loading ? 'true' : 'false'}</div>
                    <div>Error: {error ? error.message : 'none'}</div>
                    <div>
                      Optimistic Tasks: {tasks.filter((t) => t.id.startsWith('temp-')).length}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>
      </div>
    </ErrorBoundary>
  )
}
