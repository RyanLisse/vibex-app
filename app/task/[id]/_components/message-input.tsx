'use client'
import { useEffect, useRef, useState } from 'react'
import { Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Task } from '@/stores/tasks'
import { createTaskAction } from '@/app/actions/inngest'
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
    <div className="p-6 border-t border-border bg-background">
      <div className="relative">
        <div className="bg-card border-2 border-border rounded-2xl shadow-lg transition-all duration-200 hover:shadow-xl focus-within:border-primary/50 focus-within:shadow-xl">
          <div className="flex flex-col gap-y-3 p-4">
            <textarea
              ref={textareaRef}
              value={messageValue}
              onChange={(e) => setMessageValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              className="w-full min-h-[60px] max-h-[200px] resize-none border-none p-0 focus:outline-none bg-transparent placeholder:text-muted-foreground/60 text-sm leading-relaxed"
              style={{ scrollbarWidth: 'thin' }}
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                Press Enter to send, Shift+Enter for new line
              </span>
              <Button
                size="sm"
                onClick={handleSendMessage}
                disabled={!messageValue.trim()}
                className="rounded-xl transition-all duration-200 hover:scale-105"
              >
                <Send className="size-4 mr-1" />
                Send
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
