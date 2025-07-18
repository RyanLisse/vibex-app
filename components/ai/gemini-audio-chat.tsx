'use client'

import { memo, useMemo } from 'react'
import { Card } from '@/components/ui/card'
import { useAudioChatIntegration } from '@/hooks/use-audio-chat-integration'
import { ChatHeader } from '@/components/ai/chat-header'
import { ChatInputArea } from '@/components/ai/chat-input-area'
import { ChatMessageList } from '@/components/ai/chat-message-list'
import { ErrorBoundary } from '@/components/ai/error-boundary'

export interface GeminiAudioChatProps {
  voiceName?: string
  maxMessages?: number
  autoScroll?: boolean
  className?: string
  onError?: (error: Error) => void
  onStateChange?: (state: any) => void
}

/**
 * Refactored GeminiAudioChat component with improved architecture:
 * - Centralized state management
 * - Better resource cleanup
 * - Improved error handling
 * - Enhanced performance with proper memoization
 * - Simplified component structure
 */
export const GeminiAudioChat = memo<GeminiAudioChatProps>(function GeminiAudioChat({
  voiceName = 'Enceladus',
  maxMessages = 1000,
  autoScroll = true,
  className,
  onError,
  onStateChange,
}) {
  // Single hook manages all audio chat state and actions
  const {
    // Connection state
    isConnected,
    isLoading,
    connectionError,

    // Recording state
    isRecording,
    formattedDuration,
    recordingError,

    // Playback state
    isPlaying,
    playingMessageId,
    playbackError,

    // Messages state
    messages,
    messageError,

    // Error state
    hasError,
    primaryError,

    // Actions
    connect,
    disconnect,
    sendMessage,
    startRecording,
    stopRecording,
    playAudio,
    clearMessages,
    clearAllErrors,

    // Refs
    scrollAreaRef,
  } = useAudioChatIntegration({
    voiceName,
    maxMessages,
    autoScroll,
    onError,
    onStateChange,
  })

  // Memoize components to prevent unnecessary re-renders
  const headerComponent = useMemo(
    () => (
      <ChatHeader
        isConnected={isConnected}
        isLoading={isLoading}
        onConnect={connect}
        onDisconnect={disconnect}
        title="Gemini Audio Chat"
      />
    ),
    [isConnected, isLoading, connect, disconnect]
  )

  const messageListComponent = useMemo(
    () => (
      <ChatMessageList
        messages={messages}
        onAudioPlay={playAudio}
        playingMessageId={playingMessageId}
        scrollAreaRef={scrollAreaRef}
      />
    ),
    [messages, scrollAreaRef, playAudio, playingMessageId]
  )

  const inputAreaComponent = useMemo(
    () => (
      <ChatInputArea
        className="border-t p-4"
        formattedDuration={formattedDuration}
        isConnected={isConnected}
        isRecording={isRecording}
        onSendMessage={sendMessage}
        onStartRecording={startRecording}
        onStopRecording={stopRecording}
      />
    ),
    [isConnected, isRecording, formattedDuration, sendMessage, startRecording, stopRecording]
  )

  // Error display component
  const errorComponent = useMemo(() => {
    if (!hasError) {
      return null
    }

    return (
      <div className="border-destructive border-t bg-destructive/10 p-2 text-center text-destructive text-sm">
        <div className="flex items-center justify-between">
          <span>{primaryError}</span>
          <button
            className="ml-2 text-destructive text-xs underline hover:text-destructive/80"
            onClick={clearAllErrors}
            type="button"
          >
            Dismiss
          </button>
        </div>
      </div>
    )
  }, [hasError, primaryError, clearAllErrors])

  return (
    <ErrorBoundary>
      <Card className={`flex h-[600px] w-full max-w-2xl flex-col ${className || ''}`}>
        {headerComponent}
        {messageListComponent}
        {errorComponent}
        {inputAreaComponent}
      </Card>
    </ErrorBoundary>
  )
})
