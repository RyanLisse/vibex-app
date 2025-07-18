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
import { Button } from '@/components/ui/button'
import { useTaskStore } from '@/stores/tasks'
import { TaskControlButton } from './task-control-button'

interface Props {
  id: string
}

export default function TaskNavbar({ id }: Props) {
  const [isCreatingPullRequest, setIsCreatingPullRequest] = useState(false)
  const [isControllingTask, setIsControllingTask] = useState(false)
  const { getTaskById, updateTask, pauseTask, resumeTask, cancelTask } = useTaskStore()
  const task = getTaskById(id)

  const handleCreatePullRequest = useCallback(async () => {
    if (!task) return

    setIsCreatingPullRequest(true)

    const pr = await createPullRequestAction({ task })

    updateTask(id, {
      pullRequest: pr,
    })

    setIsCreatingPullRequest(false)
  }, [task, id, updateTask])

  const handleArchiveTask = useCallback(() => {
    if (!task) return

    updateTask(id, {
      isArchived: !task.isArchived,
    })
  }, [task, id, updateTask])

  const handlePauseTask = useCallback(async () => {
    if (!task) return
    setIsControllingTask(true)
    try {
      await pauseTaskAction(id)
      pauseTask(id)
    } catch (error) {
      console.error('Failed to pause task:', error)
    } finally {
      setIsControllingTask(false)
    }
  }, [task, id, pauseTask])

  const handleResumeTask = useCallback(async () => {
    if (!task) return
    setIsControllingTask(true)
    try {
      await resumeTaskAction(id)
      resumeTask(id)
    } catch (error) {
      console.error('Failed to resume task:', error)
    } finally {
      setIsControllingTask(false)
    }
  }, [task, id, resumeTask])

  const handleCancelTask = useCallback(async () => {
    if (!task) return
    setIsControllingTask(true)
    try {
      await cancelTaskAction(id)
      cancelTask(id)
    } catch (error) {
      console.error('Failed to cancel task:', error)
    } finally {
      setIsControllingTask(false)
    }
  }, [task, id, cancelTask])

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
