import { Bot, User } from 'lucide-react'
import { Markdown } from '@/components/markdown'
import { StreamingIndicator } from '@/components/streaming-indicator'
import { cn } from '@/lib/utils'

interface ChatMessageProps {
  role: 'user' | 'assistant'
  text: string
  isStreaming?: boolean
  streamProgress?: {
    chunkIndex: number
    totalChunks: number
  }
  repoUrl?: string
  branch?: string
}

export function ChatMessage({
  role,
  text,
  isStreaming,
  streamProgress,
  repoUrl,
  branch,
}: ChatMessageProps) {
  const isAssistant = role === 'assistant'

  return (
    <div
      className={cn(
        'flex animate-in gap-3 duration-300',
        isAssistant ? 'slide-in-from-left justify-start' : 'slide-in-from-right justify-end'
      )}
    >
      {isAssistant && (
        <div className="flex-shrink-0">
          <div
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-full border border-border bg-muted',
              isStreaming && 'relative overflow-hidden'
            )}
          >
            <Bot className="relative z-10 h-4 w-4 text-muted-foreground" />
            {isStreaming && (
              <div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/20 to-transparent"
                style={{
                  animation: 'shimmer 2s linear infinite',
                  backgroundSize: '200% 100%',
                }}
              />
            )}
          </div>
        </div>
      )}
      <div
        className={cn(
          'max-w-[85%] rounded-2xl px-5 py-3 shadow-sm',
          isAssistant ? 'border border-border bg-card' : 'bg-primary text-primary-foreground'
        )}
      >
        {isAssistant ? (
          <div className="prose prose-sm dark:prose-invert max-w-none overflow-hidden">
            <Markdown branch={branch} repoUrl={repoUrl}>
              {text}
            </Markdown>
            {isStreaming && (
              <span className="ml-1 inline-flex items-center gap-2">
                <StreamingIndicator size="sm" variant="cursor" />
                {streamProgress && (
                  <span className="font-mono text-[10px] text-muted-foreground/60">
                    {Math.round(
                      ((streamProgress.chunkIndex + 1) / streamProgress.totalChunks) * 100
                    )}
                    %
                  </span>
                )}
              </span>
            )}
          </div>
        ) : (
          <p className="break-words text-sm leading-relaxed">{text}</p>
        )}
      </div>
      {!isAssistant && (
        <div className="flex-shrink-0">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
            <User className="h-4 w-4 text-primary" />
          </div>
        </div>
      )}
    </div>
  )
}
