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
        'flex gap-3 animate-in duration-300',
        isAssistant ? 'justify-start slide-in-from-left' : 'justify-end slide-in-from-right'
      )}
    >
      {isAssistant && (
        <div className="flex-shrink-0">
          <div
            className={cn(
              'w-8 h-8 rounded-full bg-muted flex items-center justify-center border border-border',
              isStreaming && 'relative overflow-hidden'
            )}
          >
            <Bot className="w-4 h-4 text-muted-foreground z-10 relative" />
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
          isAssistant ? 'bg-card border border-border' : 'bg-primary text-primary-foreground'
        )}
      >
        {isAssistant ? (
          <div className="prose prose-sm dark:prose-invert max-w-none overflow-hidden">
            <Markdown repoUrl={repoUrl} branch={branch}>
              {text}
            </Markdown>
            {isStreaming && (
              <span className="inline-flex items-center gap-2 ml-1">
                <StreamingIndicator size="sm" variant="cursor" />
                {streamProgress && (
                  <span className="text-[10px] text-muted-foreground/60 font-mono">
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
          <p className="text-sm leading-relaxed break-words">{text}</p>
        )}
      </div>
      {!isAssistant && (
        <div className="flex-shrink-0">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="w-4 h-4 text-primary" />
          </div>
        </div>
      )}
    </div>
  )
}
