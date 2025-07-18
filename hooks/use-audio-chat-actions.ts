import { useCallback, useRef } from 'react'
import type { AudioChatState } from '@/hooks/use-audio-chat-state'
import type { GeminiAudioMessage } from '@/hooks/use-gemini-audio'

export interface UseAudioChatActionsOptions {
  onMessage?: (message: GeminiAudioMessage) => void
  onError?: (error: Error) => void
}

export function useAudioChatActions(
  state: AudioChatState,
  actions: {
    addMessage: (message: GeminiAudioMessage) => void
    setError: (
      type: 'connection' | 'recording' | 'playback' | 'message',
      error: string | null
    ) => void
    setRecordingState: (isRecording: boolean, duration?: number, error?: string | null) => void
    setPlaybackState: (isPlaying: boolean, messageId?: string | null, error?: string | null) => void
    registerAudioCleanup: (cleanup: () => void) => () => void
    setAudioElement: (messageId: string, audio: HTMLAudioElement) => void
    getAudioElement: (messageId: string) => HTMLAudioElement | undefined
  },
  options: UseAudioChatActionsOptions = {}
) {
  const sessionIdRef = useRef<string | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null)
  const startTimeRef = useRef<number>(0)

  // Message sending
  const sendMessage = useCallback(
    async (content: string) => {
      if (!state.isConnected) {
        actions.setError('message', 'Not connected')
        return
      }

      try {
        actions.setError('message', null)

        // Add user message
        const userMessage: GeminiAudioMessage = {
          id: `msg-${Date.now()}`,
          type: 'text',
          content,
          timestamp: new Date(),
          isUser: true,
        }

        actions.addMessage(userMessage)
        options.onMessage?.(userMessage)

        // Send to API
        const response = await fetch('/api/ai/gemini/audio', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: sessionIdRef.current,
            content,
          }),
        })

        if (!response.ok) {
          throw new Error('Failed to send message')
        }

        // Simulate AI response
        setTimeout(() => {
          const aiMessage: GeminiAudioMessage = {
            id: `msg-${Date.now()}-ai`,
            type: 'text',
            content: 'This is a simulated response from Gemini.',
            timestamp: new Date(),
            isUser: false,
          }

          actions.addMessage(aiMessage)
          options.onMessage?.(aiMessage)
        }, 1000)
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to send message')
        actions.setError('message', error.message)
        options.onError?.(error)
      }
    },
    [state.isConnected, actions, options]
  )

  // Audio recording
  const startRecording = useCallback(async () => {
    try {
      actions.setError('recording', null)

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm',
        audioBitsPerSecond: 128_000,
      })

      mediaRecorderRef.current = mediaRecorder
      const chunks: Blob[] = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: 'audio/webm' })
        await sendAudio(audioBlob)
      }

      mediaRecorder.start(1000)
      startTimeRef.current = Date.now()
      actions.setRecordingState(true, 0)

      // Start duration timer
      recordingTimerRef.current = setInterval(() => {
        const duration = Date.now() - startTimeRef.current
        actions.setRecordingState(true, duration)
      }, 100)
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to start recording')
      actions.setError('recording', error.message)
      options.onError?.(error)
    }
  }, [actions, options, sendAudio])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && state.isRecording) {
      mediaRecorderRef.current.stop()

      // Stop all tracks
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
        streamRef.current = null
      }

      // Clear timer
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current)
        recordingTimerRef.current = null
      }

      actions.setRecordingState(false, 0)
    }
  }, [state.isRecording, actions])

  // Audio sending
  const sendAudio = useCallback(
    async (audioBlob: Blob) => {
      if (!state.isConnected) {
        actions.setError('message', 'Not connected')
        return
      }

      try {
        actions.setError('message', null)

        // Convert blob to base64
        const reader = new FileReader()
        reader.readAsDataURL(audioBlob)

        reader.onloadend = async () => {
          const base64Audio = reader.result as string

          // Add user audio message
          const userMessage: GeminiAudioMessage = {
            id: `msg-${Date.now()}`,
            type: 'audio',
            content: 'Audio message',
            audioUrl: base64Audio,
            timestamp: new Date(),
            isUser: true,
          }

          actions.addMessage(userMessage)
          options.onMessage?.(userMessage)

          // Send to API
          const response = await fetch('/api/ai/gemini/audio', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sessionId: sessionIdRef.current,
              audio: base64Audio,
            }),
          })

          if (!response.ok) {
            throw new Error('Failed to send audio')
          }
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to send audio')
        actions.setError('message', error.message)
        options.onError?.(error)
      }
    },
    [state.isConnected, actions, options]
  )

  // Audio playback
  const playAudio = useCallback(
    async (audioUrl: string, messageId: string) => {
      try {
        actions.setError('playback', null)

        // Stop any currently playing audio
        const currentAudio = actions.getAudioElement(state.playingMessageId || '')
        if (currentAudio) {
          currentAudio.pause()
          currentAudio.currentTime = 0
        }

        // Create new audio element
        const audio = new Audio(audioUrl)
        actions.setAudioElement(messageId, audio)

        // Set up event listeners
        audio.addEventListener('play', () => {
          actions.setPlaybackState(true, messageId)
        })

        audio.addEventListener('ended', () => {
          actions.setPlaybackState(false)
        })

        audio.addEventListener('error', () => {
          actions.setError('playback', 'Failed to play audio')
          actions.setPlaybackState(false)
        })

        // Register cleanup
        const cleanup = () => {
          audio.pause()
          audio.remove()
          if (audioUrl.startsWith('blob:')) {
            URL.revokeObjectURL(audioUrl)
          }
        }

        const removeCleanup = actions.registerAudioCleanup(cleanup)

        audio.addEventListener('ended', removeCleanup)
        audio.addEventListener('error', removeCleanup)

        await audio.play()
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to play audio')
        actions.setError('playback', error.message)
        options.onError?.(error)
      }
    },
    [state.playingMessageId, actions, options]
  )

  const pauseAudio = useCallback(() => {
    const currentAudio = actions.getAudioElement(state.playingMessageId || '')
    if (currentAudio) {
      currentAudio.pause()
      actions.setPlaybackState(false, state.playingMessageId)
    }
  }, [state.playingMessageId, actions])

  const resumeAudio = useCallback(async () => {
    const currentAudio = actions.getAudioElement(state.playingMessageId || '')
    if (currentAudio) {
      try {
        await currentAudio.play()
        actions.setPlaybackState(true, state.playingMessageId)
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to resume audio')
        actions.setError('playback', error.message)
        options.onError?.(error)
      }
    }
  }, [state.playingMessageId, actions, options])

  return {
    sendMessage,
    startRecording,
    stopRecording,
    sendAudio,
    playAudio,
    pauseAudio,
    resumeAudio,
  }
}
