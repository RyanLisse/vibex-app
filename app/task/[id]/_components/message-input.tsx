'use client'
import { Send } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { createTaskAction } from '@/app/actions/inngest'
import { Button } from '@/components/ui/button'
import type { Task } from '@/stores/tasks'
import { useTaskStore } from '@/stores/tasks'

export default function MessageInput({ task }: { task: Task }) {
  const { updateTask } = useTaskStore()
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [messageValue, setMessageValue] = useState('')

  const adjustHeight = () => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = '60px' // Reset to min height
      textarea.style.height = Math.max(60, textarea.scrollHeight) + 'px'
    }
  }

  const handleSendMessage = async () => {
    if (messageValue.trim()) {
      await createTaskAction({
        task,
        prompt: messageValue,
        sessionId: task.sessionId,
      })

      updateTask(task.id, {
        ...task,
        status: 'IN_PROGRESS',
        statusMessage: 'Working on task',
        messages: [
          ...task.messages,
          {
            role: 'user',
            type: 'message',
            data: { text: messageValue, id: crypto.randomUUID() },
          },
        ],
      })

      setMessageValue('')
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  useEffect(() => {
    adjustHeight()
  }, [messageValue])

  return (
    <div className="border-border border-t bg-background p-6">
      <div className="relative">
        <div className="rounded-2xl border-2 border-border bg-card shadow-lg transition-all duration-200 focus-within:border-primary/50 focus-within:shadow-xl hover:shadow-xl">
          <div className="flex flex-col gap-y-3 p-4">
            <textarea
              className="max-h-[200px] min-h-[60px] w-full resize-none border-none bg-transparent p-0 text-sm leading-relaxed placeholder:text-muted-foreground/60 focus:outline-none"
              onChange={(e) => setMessageValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              ref={textareaRef}
              style={{ scrollbarWidth: 'thin' }}
              value={messageValue}
            />
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-xs">
                Press Enter to send, Shift+Enter for new line
              </span>
              <Button
                className="rounded-xl transition-all duration-200 hover:scale-105"
                disabled={!messageValue.trim()}
                onClick={handleSendMessage}
                size="sm"
              >
                <Send className="mr-1 size-4" />
                Send
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
