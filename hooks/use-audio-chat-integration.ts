import { useCallback, useEffect, useRef } from 'react'
import { useAudioChatActions } from '@/hooks/use-audio-chat-actions'
import { useAudioChatState } from '@/hooks/use-audio-chat-state'
import type { GeminiAudioMessage } from '@/hooks/use-gemini-audio'

export interface UseAudioChatIntegrationOptions {
  voiceName?: string
  maxMessages?: number
  autoScroll?: boolean
  onMessage?: (message: GeminiAudioMessage) => void
  onError?: (error: Error) => void
  onStateChange?: (state: any) => void
}

/**
 * Main integration hook that combines state management and actions
 * This is the primary hook that components should use
 */
export function useAudioChatIntegration(options: UseAudioChatIntegrationOptions = {}) {
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  // Initialize state management
  const {
    state,
    connect,
    disconnect,
    addMessage,
    clearMessages,
    setRecordingState,
    setPlaybackState,
    setError,
    clearAllErrors,
    registerAudioCleanup,
    setAudioElement,
    getAudioElement,
    hasError,
    primaryError,
  } = useAudioChatState({
    voiceName: options.voiceName,
    maxMessages: options.maxMessages,
    autoScroll: options.autoScroll,
    onStateChange: options.onStateChange,
  })

  // Initialize actions
  const {
    sendMessage,
    startRecording,
    stopRecording,
    sendAudio,
    playAudio,
    pauseAudio,
    resumeAudio,
  } = useAudioChatActions(
    state,
    {
      addMessage,
      setError,
      setRecordingState,
      setPlaybackState,
      registerAudioCleanup,
      setAudioElement,
      getAudioElement,
    },
    {
      onMessage: options.onMessage,
      onError: options.onError,
    }
  )

  // Auto-scroll functionality
  useEffect(() => {
    if (options.autoScroll && scrollAreaRef.current) {
      const scrollArea = scrollAreaRef.current
      const shouldScroll =
        scrollArea.scrollTop >= scrollArea.scrollHeight - scrollArea.clientHeight - 100

      if (shouldScroll) {
        scrollArea.scrollTop = scrollArea.scrollHeight
      }
    }
  }, [options.autoScroll])

  // Format recording duration
  const formatDuration = useCallback((ms: number) => {
    const totalSeconds = Math.floor(ms / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }, [])

  // Enhanced audio play handler with message context
  const handleAudioPlay = useCallback(
    (audioUrl: string, messageId: string) => {
      playAudio(audioUrl, messageId)
    },
    [playAudio]
  )

  // Scroll utilities
  const scrollToBottom = useCallback(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight
    }
  }, [])

  const scrollToMessage = useCallback((messageId: string) => {
    if (scrollAreaRef.current) {
      const messageElement = scrollAreaRef.current.querySelector(`[data-message-id="${messageId}"]`)
      if (messageElement) {
        messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }
  }, [])

  return {
    // State
    ...state,
    hasError,
    primaryError,
    formattedDuration: formatDuration(state.recordingDuration),

    // Actions
    connect,
    disconnect,
    sendMessage,
    startRecording,
    stopRecording,
    sendAudio,
    playAudio: handleAudioPlay,
    pauseAudio,
    resumeAudio,
    clearMessages,
    clearAllErrors,
    scrollToBottom,
    scrollToMessage,

    // Refs
    scrollAreaRef,
  }
}
