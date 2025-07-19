'use client'
import { Suspense } from 'react'
import { ChatMessagesPanel } from '@/app/task/[id]/_components/chat-messages-panel'
import MessageInput from '@/app/task/[id]/_components/message-input'
import { ShellOutputPanel } from '@/app/task/[id]/_components/shell-output-panel'
import { TaskLoadingState } from '@/app/task/[id]/_components/task-loading-state'
import { useAutoScroll } from '@/app/task/[id]/_hooks/use-auto-scroll'
import { useTaskData } from '@/app/task/[id]/_hooks/use-task-data'
import { useTaskSubscription } from '@/app/task/[id]/_hooks/use-task-subscription'
import TaskNavbar from '@/components/navigation/task-navbar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useTaskQuery } from '@/hooks/use-task-queries'

interface TaskClientPageProps {
  id: string
}

export default function TaskClientPage({ id }: TaskClientPageProps) {
  const { task, loading, error } = useTaskQuery(id)
  const { streamingMessages } = useTaskSubscription({
    taskId: id,
    taskMessages: task?.messages,
  })

  const { regularMessages, shellMessages, hasStreamingMessages, isTaskInProgress } = useTaskData({
    task,
    streamingMessages,
  })

  const chatScrollAreaRef = useAutoScroll<HTMLDivElement>([task?.messages, streamingMessages])

  if (!task) {
    return (
      <div className="flex h-screen flex-col">
        <TaskNavbar id={id} />
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center">
            <h2 className="mb-2 font-semibold text-lg">Task not found</h2>
            <p className="text-muted-foreground">The requested task could not be found.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen flex-col">
      <TaskNavbar id={id} />
      <div className="flex flex-1 overflow-hidden">
        {/* Chat Messages Panel */}
        <div className="mx-auto flex h-full w-full max-w-3xl flex-col border-border border-r bg-gradient-to-b from-background to-muted/5">
          <ScrollArea className="scroll-area-custom flex-1 overflow-y-auto" ref={chatScrollAreaRef}>
            <div className="flex flex-col gap-y-6 p-6">
              <Suspense fallback={<TaskLoadingState statusMessage="Loading messages..." />}>
                <ChatMessagesPanel
                  regularMessages={regularMessages}
                  streamingMessages={streamingMessages}
                  task={task}
                />
              </Suspense>
              {isTaskInProgress && !hasStreamingMessages && (
                <TaskLoadingState statusMessage={task.statusMessage} />
              )}
            </div>
          </ScrollArea>

          {/* Message Input - Fixed at bottom */}
          <div className="flex-shrink-0">
            <MessageInput task={task} />
          </div>
        </div>

        {/* Shell Output Panel */}
        <ShellOutputPanel shellMessages={shellMessages} />
      </div>
    </div>
  )
}
