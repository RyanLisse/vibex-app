'use client'

import { useState, useRef, useEffect } from 'react'
import { MicIcon, SendIcon, StopCircleIcon, VolumeIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useGeminiAudio } from '@/hooks/use-gemini-audio'
import { useAudioRecorder } from '@/hooks/use-audio-recorder'
import { cn } from '@/lib/utils'

export function GeminiAudioChat() {
  const [inputValue, setInputValue] = useState('')
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  const { isConnected, isLoading, messages, error, connect, disconnect, sendMessage, sendAudio } =
    useGeminiAudio({
      voiceName: 'Enceladus',
    })

  const {
    isRecording,
    formattedDuration,
    startRecording,
    stopRecording,
    error: recordError,
  } = useAudioRecorder({
    onStop: (audioBlob) => {
      sendAudio(audioBlob)
    },
  })

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight
    }
  }, [messages])

  const handleSendMessage = () => {
    if (inputValue.trim() && isConnected) {
      sendMessage(inputValue)
      setInputValue('')
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  return (
    <Card className="flex h-[600px] w-full max-w-2xl flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b p-4">
        <div>
          <h2 className="text-lg font-semibold">Gemini Audio Chat</h2>
          <p className="text-sm text-muted-foreground">
            {isConnected ? 'Connected' : 'Disconnected'}
          </p>
        </div>
        <Button
          variant={isConnected ? 'destructive' : 'default'}
          onClick={isConnected ? disconnect : connect}
          disabled={isLoading}
        >
          {isLoading ? 'Connecting...' : isConnected ? 'Disconnect' : 'Connect'}
        </Button>
      </div>

      {/* Messages */}
      <ScrollArea ref={scrollAreaRef} className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn('flex', message.isUser ? 'justify-end' : 'justify-start')}
            >
              <div
                className={cn(
                  'max-w-[80%] rounded-lg px-4 py-2',
                  message.isUser ? 'bg-primary text-primary-foreground' : 'bg-muted'
                )}
              >
                {message.type === 'audio' && message.audioUrl ? (
                  <div className="flex items-center gap-2">
                    <VolumeIcon className="h-4 w-4" />
                    <audio src={message.audioUrl} controls className="h-8" />
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap">{message.content}</p>
                )}
                <p className="mt-1 text-xs opacity-70">{message.timestamp.toLocaleTimeString()}</p>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Error display */}
      {(error || recordError) && (
        <div className="border-t border-destructive bg-destructive/10 p-2 text-center text-sm text-destructive">
          {error || recordError}
        </div>
      )}

      {/* Input area */}
      <div className="border-t p-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={isConnected ? 'Type a message...' : 'Connect to start chatting'}
            disabled={!isConnected}
            className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          />

          {/* Audio recording button */}
          <Button
            variant={isRecording ? 'destructive' : 'outline'}
            size="icon"
            onClick={isRecording ? stopRecording : startRecording}
            disabled={!isConnected}
            title={isRecording ? 'Stop recording' : 'Start recording'}
          >
            {isRecording ? <StopCircleIcon className="h-4 w-4" /> : <MicIcon className="h-4 w-4" />}
          </Button>

          {/* Send button */}
          <Button
            onClick={handleSendMessage}
            disabled={!isConnected || !inputValue.trim()}
            size="icon"
          >
            <SendIcon className="h-4 w-4" />
          </Button>
        </div>

        {/* Recording indicator */}
        {isRecording && (
          <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
            <div className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
            Recording: {formattedDuration}
          </div>
        )}
      </div>
    </Card>
  )
}
