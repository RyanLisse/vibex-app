'use client'

import React, { useCallback, useMemo } from 'react'
import { Card } from '@/components/ui/card'
import { useAudioPlayback } from '@/hooks/use-audio-playback'
import { useAudioRecorder } from '@/hooks/use-audio-recorder'
import { useChatMessages } from '@/hooks/use-chat-messages'
import { useGeminiAudio } from '@/hooks/use-gemini-audio'
import { ChatHeader } from './chat-header'
import { ChatInputArea } from './chat-input-area'
import { ChatMessageList } from './chat-message-list'
import { ErrorBoundary } from './error-boundary'

export interface GeminiAudioChatProps {
  voiceName?: string
  maxMessages?: number
  autoScroll?: boolean
  className?: string
}

export function GeminiAudioChat({
  voiceName = 'Enceladus',
  maxMessages = 1000,
  autoScroll = true,
  className,
}: GeminiAudioChatProps) {
  // Initialize hooks
  const { isConnected, isLoading, messages, error, connect, disconnect, sendMessage, sendAudio } =
    useGeminiAudio({
      voiceName,
    })

  const {
    isRecording,
    formattedDuration,
    startRecording,
    stopRecording,
    error: recordError,
  } = useAudioRecorder({
    onStop: useCallback(
      (audioBlob: Blob) => {
        sendAudio(audioBlob)
      },
      [sendAudio]
    ),
  })

  const {
    messages: chatMessages,
    scrollAreaRef,
    addMessage,
    clearMessages,
  } = useChatMessages({
    autoScroll,
    maxMessages,
  })

  const { playAudio, cleanupAudio } = useAudioPlayback({
    onError: (error) => {
      console.error('Audio playback error:', error)
    },
  })

  // Sync messages from Gemini hook to chat messages hook
  React.useEffect(() => {
    if (messages.length > chatMessages.length) {
      const newMessages = messages.slice(chatMessages.length)
      newMessages.forEach(addMessage)
    }
  }, [messages, chatMessages.length, addMessage])

  // Handle audio playback
  const handleAudioPlay = useCallback(
    (audioUrl: string) => {
      playAudio(audioUrl)
    },
    [playAudio]
  )

  // Cleanup audio resources on unmount
  React.useEffect(() => {
    return () => {
      cleanupAudio()
    }
  }, [cleanupAudio])

  // Combined error state
  const combinedError = error || recordError

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
        messages={chatMessages}
        onAudioPlay={handleAudioPlay}
        scrollAreaRef={scrollAreaRef}
      />
    ),
    [chatMessages, scrollAreaRef, handleAudioPlay]
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

  return (
    <ErrorBoundary>
      <Card className={`flex h-[600px] w-full max-w-2xl flex-col ${className || ''}`}>
        {headerComponent}
        {messageListComponent}

        {/* Error display */}
        {combinedError && (
          <div className="border-destructive border-t bg-destructive/10 p-2 text-center text-destructive text-sm">
            {combinedError}
          </div>
        )}

        {inputAreaComponent}
      </Card>
    </ErrorBoundary>
  )
}
