/**
 * Enhanced Task List Component
 *
 * Updated to use TanStack Query hooks instead of direct store access,
 * with optimistic updates, loading states, error boundaries, and offline indicators.
 */

'use client'

import { formatDistanceToNow } from 'date-fns'
import { Archive, Check, Dot, Trash2, RefreshCw, AlertCircle, Wifi, WifiOff } from 'lucide-react'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TextShimmer } from '@/components/ui/text-shimmer'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import {
  useTasksQuery,
  useUpdateTaskMutation,
  useDeleteTaskMutation,
} from '@/hooks/use-task-queries'
import { useElectricContext } from '@/components/providers/electric-provider'
import { observability } from '@/lib/observability'

interface EnhancedTaskListProps {
  userId?: string
  showArchived?: boolean
  filters?: {
    status?: string[]
    priority?: string[]
    search?: string
  }
}

export function EnhancedTaskList({
  userId,
  showArchived = true,
  filters = {},
}: EnhancedTaskListProps) {
  const [activeTab, setActiveTab] = useState<'active' | 'archived'>('active')
  const [isHydrated, setIsHydrated] = useState(false)

  // ElectricSQL connection status
  const { isConnected, isSyncing, error: electricError } = useElectricContext()

  // Query for active tasks
  const {
    tasks: activeTasks,
    loading: activeLoading,
    error: activeError,
    refetch: refetchActive,
    isStale: activeStale,
    isFetching: activeFetching,
  } = useTasksQuery({
    ...filters,
    status: ['pending', 'in_progress'],
    userId,
  })

  // Query for archived tasks
  const {
    tasks: archivedTasks,
    loading: archivedLoading,
    error: archivedError,
    refetch: refetchArchived,
    isStale: archivedStale,
    isFetching: archivedFetching,
  } = useTasksQuery(
    {
      ...filters,
      status: ['completed', 'cancelled'],
      userId,
    },
    {
      enabled: showArchived,
    }
  )

  // Mutations
  const updateTaskMutation = useUpdateTaskMutation()
  const deleteTaskMutation = useDeleteTaskMutation()

  useEffect(() => {
    setIsHydrated(true)
  }, [])

  // Handle task archiving (mark as completed)
  const handleArchiveTask = async (taskId: string) => {
    try {
      await updateTaskMutation.mutateAsync({
        id: taskId,
        status: 'completed',
        completedAt: new Date(),
      })

      // Record user action
      await observability.events.collector.collectEvent(
        'user_action',
        'info',
        `Task archived: ${taskId}`,
        { taskId, userId, action: 'archive' },
        'ui',
        ['task', 'archive']
      )
    } catch (error) {
      console.error('Failed to archive task:', error)
    }
  }

  // Handle task deletion
  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task? This action cannot be undone.')) {
      return
    }

    try {
      await deleteTaskMutation.mutateAsync(taskId)

      // Record user action
      await observability.events.collector.collectEvent(
        'user_action',
        'info',
        `Task deleted: ${taskId}`,
        { taskId, userId, action: 'delete' },
        'ui',
        ['task', 'delete']
      )
    } catch (error) {
      console.error('Failed to delete task:', error)
    }
  }

  // Handle manual refresh
  const handleRefresh = () => {
    if (activeTab === 'active') {
      refetchActive()
    } else {
      refetchArchived()
    }
  }

  // Connection status indicator
  const ConnectionStatus = () => (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      {isConnected ? (
        <>
          <Wifi className="h-4 w-4 text-green-500" />
          <span>Online</span>
          {isSyncing && <RefreshCw className="h-4 w-4 animate-spin" />}
        </>
      ) : (
        <>
          <WifiOff className="h-4 w-4 text-red-500" />
          <span>Offline</span>
        </>
      )}
    </div>
  )

  // Error display component
  const ErrorDisplay = ({ error, onRetry }: { error: Error; onRetry: () => void }) => (
    <Alert variant="destructive" className="mb-4">
      <AlertCircle className="h-4 w-4" />
      <AlertDescription className="flex items-center justify-between">
        <span>Failed to load tasks: {error.message}</span>
        <Button variant="outline" size="sm" onClick={onRetry}>
          Retry
        </Button>
      </AlertDescription>
    </Alert>
  )

  // Loading skeleton
  const LoadingSkeleton = () => (
    <div className="flex flex-col gap-1">
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="rounded-lg border bg-background p-4">
          <div className="flex items-center justify-between">
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <Skeleton className="h-8 w-8" />
          </div>
        </div>
      ))}
    </div>
  )

  // Task item component
  const TaskItem = ({
    task,
    onArchive,
    onDelete,
  }: {
    task: any
    onArchive?: (id: string) => void
    onDelete?: (id: string) => void
  }) => (
    <div className="flex items-center justify-between rounded-lg border bg-background p-4 hover:bg-sidebar">
      <Link className="flex-1" href={`/task/${task.id}`}>
        <div>
          <div className="flex items-center gap-x-2">
            {task.hasChanges && <div className="size-2 rounded-full bg-blue-500" />}
            <h3 className="font-medium">{task.title}</h3>
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
            {task.priority === 'high' && (
              <Badge variant="destructive" className="text-xs">
                High
              </Badge>
            )}
          </div>

          {task.description && (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{task.description}</p>
          )}

          {task.status === 'in_progress' ? (
            <div>
              <TextShimmer className="text-sm">
                {`${task.statusMessage || 'Working on your task'}...`}
              </TextShimmer>
            </div>
          ) : (
            <div className="flex items-center gap-0 mt-1">
              <p className="text-muted-foreground text-sm">
                {task.createdAt
                  ? formatDistanceToNow(new Date(task.createdAt), { addSuffix: true })
                  : 'Just now'}
              </p>
              {task.updatedAt && task.updatedAt !== task.createdAt && (
                <>
                  <Dot className="size-4 text-muted-foreground" />
                  <p className="text-muted-foreground text-sm">
                    Updated {formatDistanceToNow(new Date(task.updatedAt), { addSuffix: true })}
                  </p>
                </>
              )}
              {task.assignee && (
                <>
                  <Dot className="size-4 text-muted-foreground" />
                  <p className="text-muted-foreground text-sm">{task.assignee}</p>
                </>
              )}
            </div>
          )}
        </div>
      </Link>

      <div className="flex items-center gap-2">
        {task.status === 'completed' && onDelete && (
          <Button
            onClick={() => onDelete(task.id)}
            size="icon"
            variant="outline"
            disabled={deleteTaskMutation.isPending}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
        {(task.status === 'pending' || task.status === 'in_progress') && onArchive && (
          <Button
            onClick={() => onArchive(task.id)}
            size="icon"
            variant="outline"
            disabled={updateTaskMutation.isPending}
          >
            <Archive className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  )

  if (!isHydrated) {
    return <LoadingSkeleton />
  }

  return (
    <div className="mx-auto w-full max-w-3xl rounded-lg bg-muted p-1">
      <div className="flex items-center justify-between p-2">
        <ConnectionStatus />
        <div className="flex items-center gap-2">
          {(activeStale || archivedStale) && (
            <Badge variant="outline" className="text-xs">
              Stale Data
            </Badge>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={activeFetching || archivedFetching}
          >
            <RefreshCw
              className={`h-4 w-4 ${activeFetching || archivedFetching ? 'animate-spin' : ''}`}
            />
          </Button>
        </div>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as 'active' | 'archived')}
      >
        <TabsList>
          <TabsTrigger value="active">
            <Check className="h-4 w-4" />
            Active Tasks ({activeTasks?.length || 0})
          </TabsTrigger>
          {showArchived && (
            <TabsTrigger value="archived">
              <Archive className="h-4 w-4" />
              Archived ({archivedTasks?.length || 0})
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="active">
          {electricError && (
            <Alert className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Real-time sync unavailable. Working in offline mode.
              </AlertDescription>
            </Alert>
          )}

          {activeError && <ErrorDisplay error={activeError} onRetry={refetchActive} />}

          <div className="flex flex-col gap-1">
            {activeLoading ? (
              <LoadingSkeleton />
            ) : activeTasks?.length === 0 ? (
              <p className="p-2 text-muted-foreground">No active tasks yet.</p>
            ) : (
              activeTasks?.map((task) => (
                <TaskItem key={task.id} task={task} onArchive={handleArchiveTask} />
              ))
            )}
          </div>
        </TabsContent>

        {showArchived && (
          <TabsContent value="archived">
            {archivedError && <ErrorDisplay error={archivedError} onRetry={refetchArchived} />}

            <div className="flex flex-col gap-1">
              {archivedLoading ? (
                <LoadingSkeleton />
              ) : archivedTasks?.length === 0 ? (
                <p className="p-2 text-muted-foreground">No archived tasks yet.</p>
              ) : (
                archivedTasks?.map((task) => (
                  <TaskItem key={task.id} task={task} onDelete={handleDeleteTask} />
                ))
              )}
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
