import { VolumeIcon } from 'lucide-react'
import type React from 'react'
import { memo } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { GeminiAudioMessage } from '@/hooks/use-gemini-audio'
import { cn } from '@/lib/utils'

interface ChatMessageListProps {
  messages: GeminiAudioMessage[]
  scrollAreaRef: React.RefObject<HTMLDivElement>
  onAudioPlay?: (audioUrl: string, messageId: string) => void
  playingMessageId?: string | null
  className?: string
}

const ChatMessage = memo(
  ({
    message,
    onAudioPlay,
    isPlaying,
  }: {
    message: GeminiAudioMessage
    onAudioPlay?: (audioUrl: string, messageId: string) => void
    isPlaying?: boolean
  }) => {
    const handleAudioPlay = () => {
      if (message.audioUrl && onAudioPlay) {
        onAudioPlay(message.audioUrl, message.id)
      }
    }

    return (
      <div
        className={cn('flex', message.isUser ? 'justify-end' : 'justify-start')}
        data-message-id={message.id}
        key={message.id}
      >
        <div
          className={cn(
            'max-w-[80%] break-words rounded-lg px-4 py-2',
            message.isUser ? 'bg-primary text-primary-foreground' : 'bg-muted'
          )}
        >
          {message.type === 'audio' && message.audioUrl ? (
            <div className="flex items-center gap-2">
              <VolumeIcon
                className={cn(
                  'h-4 w-4 flex-shrink-0',
                  isPlaying ? 'animate-pulse text-green-500' : 'text-muted-foreground'
                )}
              />
              <audio
                className="h-8 min-w-0"
                controls
                onPlay={handleAudioPlay}
                preload="metadata"
                src={message.audioUrl}
              />
              {isPlaying && <span className="animate-pulse text-green-500 text-xs">Playing</span>}
            </div>
          ) : (
            <p className="whitespace-pre-wrap text-sm">{message.content}</p>
          )}
          <p className="mt-1 text-xs opacity-70">{message.timestamp.toLocaleTimeString()}</p>
        </div>
      </div>
    )
  }
)

ChatMessage.displayName = 'ChatMessage'

export const ChatMessageList = memo(
  ({ messages, scrollAreaRef, onAudioPlay, playingMessageId, className }: ChatMessageListProps) => {
    return (
      <ScrollArea className={cn('flex-1 p-4', className)} ref={scrollAreaRef}>
        <div aria-label="Chat messages" aria-live="polite" className="space-y-4" role="log">
          {messages.length === 0 ? (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              <p className="text-sm">No messages yet. Start a conversation!</p>
            </div>
          ) : (
            messages.map((message) => (
              <ChatMessage
                isPlaying={playingMessageId === message.id}
                key={message.id}
                message={message}
                onAudioPlay={onAudioPlay}
              />
            ))
          )}
        </div>
      </ScrollArea>
    )
  }
)

ChatMessageList.displayName = 'ChatMessageList'
