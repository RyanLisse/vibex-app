'use client'
import { formatDistanceToNow } from 'date-fns'
import {
  Archive,
  ArrowLeft,
  Dot,
  GitBranchPlus,
  GithubIcon,
  Loader,
  Pause,
  Play,
  X,
} from 'lucide-react'
import Link from 'next/link'
import { useCallback, useState } from 'react'
import { cancelTaskAction, pauseTaskAction, resumeTaskAction } from '@/app/actions/inngest'
import { createPullRequestAction } from '@/app/actions/vibekit'
import { TaskControlButton } from '@/components/navigation/task-control-button'
import { Button } from '@/components/ui/button'
import { useTaskQuery, useUpdateTaskMutation } from '@/hooks/use-task-queries'

interface Props {
  id: string
}

export default function TaskNavbar({ id }: Props) {
  const [isCreatingPullRequest, setIsCreatingPullRequest] = useState(false)
  const [isControllingTask, setIsControllingTask] = useState(false)
  const { task, loading, error } = useTaskQuery(id)
  const updateTaskMutation = useUpdateTaskMutation()

  // Handle loading and error states
  if (loading) {
    return (
      <div className="flex items-center justify-between border-b bg-background px-6 py-3">
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 animate-pulse rounded bg-muted" />
          <div className="h-4 w-32 animate-pulse rounded bg-muted" />
        </div>
      </div>
    )
  }

  if (error || !task) {
    return (
      <div className="flex items-center justify-between border-b bg-background px-6 py-3">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Task not found</span>
        </div>
      </div>
    )
  }

  const handleCreatePullRequest = useCallback(async () => {
    if (!task) {
      return
    }

    setIsCreatingPullRequest(true)

    const pr = await createPullRequestAction({ task })

    updateTaskMutation.mutate({
      id,
      pullRequest: pr,
    })

    setIsCreatingPullRequest(false)
  }, [task, id, updateTaskMutation])

  const handleArchiveTask = useCallback(() => {
    if (!task) {
      return
    }

    updateTaskMutation.mutate({
      id,
      isArchived: !task.isArchived,
    })
  }, [task, id, updateTaskMutation])

  const handlePauseTask = useCallback(async () => {
    if (!task) {
      return
    }
    setIsControllingTask(true)
    try {
      await pauseTaskAction(id)
      updateTaskMutation.mutate({ id, status: 'paused' })
    } catch (_error) {
    } finally {
      setIsControllingTask(false)
    }
  }, [task, id, updateTaskMutation])

  const handleResumeTask = useCallback(async () => {
    if (!task) {
      return
    }
    setIsControllingTask(true)
    try {
      await resumeTaskAction(id)
      updateTaskMutation.mutate({ id, status: 'in_progress' })
    } catch (_error) {
    } finally {
      setIsControllingTask(false)
    }
  }, [task, id, updateTaskMutation])

  const handleCancelTask = useCallback(async () => {
    if (!task) {
      return
    }
    setIsControllingTask(true)
    try {
      await cancelTaskAction(id)
      updateTaskMutation.mutate({ id, status: 'cancelled' })
    } catch (_error) {
    } finally {
      setIsControllingTask(false)
    }
  }, [task, id, updateTaskMutation])

  return (
    <div className="flex h-14 items-center justify-between border-b px-4">
      <div className="flex items-center gap-x-2">
        <Link href="/">
          <Button size="icon" variant="ghost">
            <ArrowLeft />
          </Button>
        </Link>
        <div className="h-8 border-r" />
        <div className="ml-4 flex flex-col gap-x-2">
          <h3 className=" font-medium">{task?.title}</h3>
          <div className="flex items-center gap-x-0">
            <p className="text-muted-foreground text-sm">
              {task?.createdAt
                ? formatDistanceToNow(new Date(task.createdAt), {
                    addSuffix: true,
                  })
                : 'Loading...'}
            </p>
            <Dot className="size-4 text-muted-foreground" />
            <p className="text-muted-foreground text-sm">{task?.repository}</p>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-x-2">
        {task?.status === 'IN_PROGRESS' && (
          <>
            <TaskControlButton
              icon={<Pause className="size-4" />}
              isLoading={isControllingTask}
              onClick={handlePauseTask}
              tooltip="Pause Task"
              variant="outline"
            />
            <TaskControlButton
              icon={<X className="size-4" />}
              isLoading={isControllingTask}
              onClick={handleCancelTask}
              tooltip="Cancel Task"
              variant="destructive"
            />
          </>
        )}
        {task?.status === 'PAUSED' && (
          <>
            <TaskControlButton
              icon={<Play className="size-4" />}
              isLoading={isControllingTask}
              onClick={handleResumeTask}
              tooltip="Resume Task"
              variant="default"
            />
            <TaskControlButton
              icon={<X className="size-4" />}
              isLoading={isControllingTask}
              onClick={handleCancelTask}
              tooltip="Cancel Task"
              variant="destructive"
            />
          </>
        )}

        {task?.isArchived ? (
          <Button className="rounded-full" onClick={handleArchiveTask} variant="outline">
            <Archive />
            Unarchive
          </Button>
        ) : (
          <Button className="rounded-full" onClick={handleArchiveTask} variant="outline">
            <Archive />
            Archive
          </Button>
        )}
        {task?.pullRequest ? (
          <Link href={task.pullRequest.html_url} target="_blank">
            <Button className="rounded-full">
              <GithubIcon />
              View Pull Request
            </Button>
          </Link>
        ) : (
          <Button
            className="rounded-full"
            disabled={isCreatingPullRequest}
            onClick={handleCreatePullRequest}
          >
            {isCreatingPullRequest ? <Loader className="size-4 animate-spin" /> : <GitBranchPlus />}
            Create Pull Request
          </Button>
        )}
      </div>
    </div>
  )
}
