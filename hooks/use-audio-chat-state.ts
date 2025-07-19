import { useCallback, useEffect, useRef, useState } from 'react'
import type { GeminiAudioMessage } from '@/hooks/use-gemini-audio'

export interface AudioChatState {
  // Connection state
  isConnected: boolean
  isLoading: boolean
  connectionError: string | null

  // Recording state
  isRecording: boolean
  recordingDuration: number
  recordingError: string | null

  // Playback state
  isPlaying: boolean
  playingMessageId: string | null
  playbackError: string | null

  // Messages state
  messages: GeminiAudioMessage[]
  messageError: string | null
}

export interface UseAudioChatStateOptions {
  voiceName?: string
  maxMessages?: number
  autoScroll?: boolean
  onStateChange?: (state: AudioChatState) => void
}

export function useAudioChatState(options: UseAudioChatStateOptions = {}) {
  const [state, setState] = useState<AudioChatState>({
    isConnected: false,
    isLoading: false,
    connectionError: null,
    isRecording: false,
    recordingDuration: 0,
    recordingError: null,
    isPlaying: false,
    playingMessageId: null,
    playbackError: null,
    messages: [],
    messageError: null,
  })

  const sessionIdRef = useRef<string | null>(null)
  const activeAudioRefs = useRef<Map<string, HTMLAudioElement>>(new Map())
  const cleanupCallbacks = useRef<Set<() => void>>(new Set())

  // Centralized state updater
  const updateState = useCallback(
    (updates: Partial<AudioChatState>) => {
      setState((prev) => {
        const newState = { ...prev, ...updates }
        options.onStateChange?.(newState)
        return newState
      })
    },
    [options.onStateChange]
  )

  // Connection management
  const connect = useCallback(async () => {
    try {
      updateState({ isLoading: true, connectionError: null })

      const sessionId = `session-${Date.now()}-${Math.random().toString(36).substring(7)}`
      sessionIdRef.current = sessionId

      const response = await fetch('/api/ai/gemini/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          voiceName: options.voiceName,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to create session')
      }

      updateState({ isConnected: true, isLoading: false })
    } catch (err) {
      updateState({
        isConnected: false,
        isLoading: false,
        connectionError: err instanceof Error ? err.message : 'Connection failed',
      })
    }
  }, [options.voiceName, updateState])

  const disconnect = useCallback(async () => {
    if (!sessionIdRef.current) {
      return
    }

    try {
      await fetch(`/api/ai/gemini/session?sessionId=${sessionIdRef.current}`, {
        method: 'DELETE',
      })
    } catch (_err) {}

    // Clean up all resources
    activeAudioRefs.current.forEach((audio) => {
      audio.pause()
      audio.remove()
    })
    activeAudioRefs.current.clear()

    cleanupCallbacks.current.forEach((cleanup) => cleanup())
    cleanupCallbacks.current.clear()

    sessionIdRef.current = null
    updateState({
      isConnected: false,
      isPlaying: false,
      playingMessageId: null,
      connectionError: null,
    })
  }, [updateState])

  // Message management
  const addMessage = useCallback(
    (message: GeminiAudioMessage) => {
      setState((prev) => {
        const updated = [...prev.messages, message]
        const trimmed =
          updated.length > (options.maxMessages || 1000)
            ? updated.slice(-(options.maxMessages || 1000))
            : updated

        return { ...prev, messages: trimmed }
      })
    },
    [options.maxMessages]
  )

  const clearMessages = useCallback(() => {
    updateState({ messages: [] })
  }, [updateState])

  // Audio resource management
  const registerAudioCleanup = useCallback((cleanup: () => void) => {
    cleanupCallbacks.current.add(cleanup)
    return () => cleanupCallbacks.current.delete(cleanup)
  }, [])

  const setAudioElement = useCallback((messageId: string, audio: HTMLAudioElement) => {
    activeAudioRefs.current.set(messageId, audio)
  }, [])

  const getAudioElement = useCallback((messageId: string) => {
    return activeAudioRefs.current.get(messageId)
  }, [])

  // Recording state management
  const setRecordingState = useCallback(
    (isRecording: boolean, duration = 0, error: string | null = null) => {
      updateState({
        isRecording,
        recordingDuration: duration,
        recordingError: error,
      })
    },
    [updateState]
  )

  // Playback state management
  const setPlaybackState = useCallback(
    (isPlaying: boolean, messageId: string | null = null, error: string | null = null) => {
      updateState({
        isPlaying,
        playingMessageId: messageId,
        playbackError: error,
      })
    },
    [updateState]
  )

  // Error management
  const setError = useCallback(
    (type: 'connection' | 'recording' | 'playback' | 'message', error: string | null) => {
      const errorKey = `${type}Error` as keyof AudioChatState
      updateState({ [errorKey]: error } as Partial<AudioChatState>)
    },
    [updateState]
  )

  const clearAllErrors = useCallback(() => {
    updateState({
      connectionError: null,
      recordingError: null,
      playbackError: null,
      messageError: null,
    })
  }, [updateState])

  // Global error state
  const hasError =
    state.connectionError || state.recordingError || state.playbackError || state.messageError
  const primaryError =
    state.connectionError || state.recordingError || state.playbackError || state.messageError

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect()
    }
  }, [disconnect])

  return {
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
  }
}
