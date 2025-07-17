'use client'
import { useEffect, useRef } from 'react'
import { User } from 'lucide-react'

import TaskNavbar from '@/components/navigation/task-navbar'
import MessageInput from './_components/message-input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useTaskStore } from '@/stores/tasks'
import { cn } from '@/lib/utils'

// Custom hooks
import { useTaskSubscription } from './_hooks/use-task-subscription'
import { useAutoScroll } from './_hooks/use-auto-scroll'

// Components
import { ChatMessage } from './_components/chat-message'
import { ShellOutput } from './_components/shell-output'
import { TaskLoadingState } from './_components/task-loading-state'

interface Props {
  id: string
}

export default function TaskClientPage({ id }: Props) {
  const { getTaskById, updateTask } = useTaskStore()
  const task = getTaskById(id)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  
  const { streamingMessages } = useTaskSubscription({
    taskId: id,
    taskMessages: task?.messages,
  })
  
  const chatScrollAreaRef = useAutoScroll<HTMLDivElement>([
    task?.messages,
    streamingMessages,
  ])

  // Function to get the output message for a given shell call message
  const getOutputForCall = (callId: string) => {
    return task?.messages.find(
      (message) => message.type === 'local_shell_call_output' && message.data?.call_id === callId
    )
  }

  useEffect(() => {
    if (task) {
      updateTask(task.id, {
        hasChanges: false,
      })
    }
  }, [])

  const renderInitialTaskMessage = () => (
    <div className="flex justify-end animate-in slide-in-from-right duration-300">
      <div className="max-w-[85%] flex gap-3">
        <div className="bg-primary text-primary-foreground rounded-2xl px-5 py-3 shadow-sm">
          <p className="text-sm leading-relaxed">{task?.title}</p>
        </div>
        <div className="flex-shrink-0">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="w-4 h-4 text-primary" />
          </div>
        </div>
      </div>
    </div>
  )

  const renderRegularMessages = () => {
    return task?.messages
      .filter(
        (message) =>
          (message.role === 'assistant' || message.role === 'user') &&
          message.type === 'message'
      )
      .map((message, index) => (
        <ChatMessage
          key={
            (message.data as { id?: string })?.id ||
            `message-${index}-${message.role}` ||
            index
          }
          role={message.role}
          text={message.data?.text as string}
          repoUrl={task?.repository ? `https://github.com/${task.repository}` : undefined}
          branch={task?.branch}
        />
      ))
  }

  const renderStreamingMessages = () => {
    return Array.from(streamingMessages.values()).map((message) => (
      <ChatMessage
        key={message.data.streamId as string}
        role={message.role}
        text={message.data?.text as string}
        isStreaming={true}
        streamProgress={
          message.data.chunkIndex !== undefined && message.data.totalChunks !== undefined
            ? {
                chunkIndex: message.data.chunkIndex,
                totalChunks: message.data.totalChunks,
              }
            : undefined
        }
        repoUrl={task?.repository ? `https://github.com/${task.repository}` : undefined}
        branch={task?.branch}
      />
    ))
  }

  const renderShellOutputs = () => {
    return task?.messages.map((message) => {
      if (message.type === 'local_shell_call') {
        const output = getOutputForCall(message.data?.call_id as string)
        const command = (message.data as { action?: { command?: string[] } })?.action?.command

        if (!command) return null

        return (
          <ShellOutput
            key={message.data?.call_id as string}
            command={command}
            output={(output?.data as { output?: string })?.output}
          />
        )
      }
      return null
    })
  }

  return (
    <div className="flex flex-col h-screen">
      <TaskNavbar id={id} />
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar for chat messages */}
        <div className="w-full max-w-3xl mx-auto border-r border-border bg-gradient-to-b from-background to-muted/5 flex flex-col h-full">
          <ScrollArea ref={chatScrollAreaRef} className="flex-1 overflow-y-auto scroll-area-custom">
            <div className="p-6 flex flex-col gap-y-6">
              {renderInitialTaskMessage()}
              {renderRegularMessages()}
              {renderStreamingMessages()}
              {task?.status === 'IN_PROGRESS' && streamingMessages.size === 0 && (
                <TaskLoadingState statusMessage={task?.statusMessage} />
              )}
            </div>
          </ScrollArea>

          {/* Message input component - fixed at bottom */}
          <div className="flex-shrink-0">
            <MessageInput task={task!} />
          </div>
        </div>

        {/* Right panel for details */}
        <div className="flex-1 bg-gradient-to-br from-muted/50 to-background relative">
          {/* Fade overlay at the top */}
          <div className="absolute top-0 left-0 right-0 h-20 bg-gradient-to-b from-muted/50 to-transparent pointer-events-none z-10" />
          <ScrollArea ref={scrollAreaRef} className="h-full scroll-area-custom">
            <div className="max-w-4xl mx-auto w-full py-10 px-6">
              <div className="flex flex-col gap-y-10">{renderShellOutputs()}</div>
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  )
}