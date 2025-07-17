'use client'
import Link from 'next/link'
import { Archive, ArrowLeft, Dot, GitBranchPlus, GithubIcon, Loader } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { useCallback, useState } from 'react'

import { Button } from '@/components/ui/button'
import { useTaskStore } from '@/stores/tasks'
import { createPullRequestAction } from '@/app/actions/vibekit'

interface Props {
  id: string
}

export default function TaskNavbar({ id }: Props) {
  const [isCreatingPullRequest, setIsCreatingPullRequest] = useState(false)
  const { getTaskById, updateTask } = useTaskStore()
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

  return (
    <div className="h-14 border-b flex items-center justify-between px-4">
      <div className="flex items-center gap-x-2">
        <Link href="/">
          <Button variant="ghost" size="icon">
            <ArrowLeft />
          </Button>
        </Link>
        <div className="h-8 border-r" />
        <div className="flex flex-col gap-x-2 ml-4">
          <h3 className=" font-medium">{task?.title}</h3>
          <div className="flex items-center gap-x-0">
            <p className="text-sm text-muted-foreground">
              {task?.createdAt
                ? formatDistanceToNow(new Date(task.createdAt), {
                    addSuffix: true,
                  })
                : 'Loading...'}
            </p>
            <Dot className="size-4 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{task?.repository}</p>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-x-2">
        {task?.isArchived ? (
          <Button variant="outline" className="rounded-full" onClick={handleArchiveTask}>
            <Archive />
            Unarchive
          </Button>
        ) : (
          <Button variant="outline" className="rounded-full" onClick={handleArchiveTask}>
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
            onClick={handleCreatePullRequest}
            disabled={isCreatingPullRequest}
          >
            {isCreatingPullRequest ? <Loader className="animate-spin size-4" /> : <GitBranchPlus />}
            Create Pull Request
          </Button>
        )}
      </div>
    </div>
  )
}
