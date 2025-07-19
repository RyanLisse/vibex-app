'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Plus, Edit, Trash2, RefreshCw, CheckCircle, XCircle, Clock, Zap } from 'lucide-react'
import { useElectricTasks } from '@/hooks/use-electric-tasks'
import { LoadingSpinner, ErrorDisplay } from '@/components/ui/loading-states'
import { ErrorBoundary } from '@/components/error-boundary'
import type { Task } from '@/db/schema'

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
                placeholder="Enter new task title..."
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateTask()}
                className="flex-1"
              />
              <Button onClick={handleCreateTask} disabled={!newTaskTitle.trim() || loading}>
                <Plus className="h-4 w-4 mr-2" />
                Add Task
              </Button>
              <Button variant="outline" onClick={refetch} disabled={loading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>

            {/* Instructions */}
            <Alert>
              <Zap className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <div className="font-medium">How to test optimistic updates:</div>
                  <ol className="list-decimal list-inside space-y-1 text-sm">
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
                <Card key={task.id} className="transition-all duration-200">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        {/* Task Status Toggle */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleTaskStatus(task)}
                          className="p-1"
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
                                value={editTitle}
                                onChange={(e) => setEditTitle(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') saveEdit()
                                  if (e.key === 'Escape') cancelEditing()
                                }}
                                className="flex-1"
                                autoFocus
                              />
                              <Button size="sm" onClick={saveEdit}>
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                              <Button size="sm" variant="outline" onClick={cancelEditing}>
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span
                                className={`${
                                  task.status === 'completed'
                                    ? 'line-through text-muted-foreground'
                                    : ''
                                }`}
                              >
                                {task.title}
                              </span>
                              {task.id.startsWith('temp-') && (
                                <Badge variant="outline" className="text-xs">
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
                      <div className="flex items-center gap-1 ml-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => startEditing(task)}
                          disabled={editingTask === task.id}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteTask(task.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Task Description */}
                    {task.description && (
                      <div className="mt-2 text-sm text-muted-foreground pl-8">
                        {task.description}
                      </div>
                    )}

                    {/* Timestamps */}
                    <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground pl-8">
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
                      <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <h3 className="text-lg font-medium mb-2">No tasks yet</h3>
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
                  <div className="space-y-2 text-xs font-mono">
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
