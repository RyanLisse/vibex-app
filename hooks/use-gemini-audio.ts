import { useCallback, useEffect, useRef, useState } from 'react'

export interface GeminiAudioMessage {
  id: string
  type: 'text' | 'audio' | 'tool'
  content: string
  audioUrl?: string
  timestamp: Date
  isUser: boolean
}

export interface UseGeminiAudioOptions {
  voiceName?: string
  tools?: any[]
  onMessage?: (message: GeminiAudioMessage) => void
  onError?: (error: Error) => void
}

export function useGeminiAudio(options: UseGeminiAudioOptions = {}) {
  const [isConnected, setIsConnected] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [messages, setMessages] = useState<GeminiAudioMessage[]>([])
  const [error, setError] = useState<string | null>(null)
  const sessionIdRef = useRef<string | null>(null)
  const wsRef = useRef<WebSocket | null>(null)

  const generateSessionId = () => {
    return `session-${Date.now()}-${Math.random().toString(36).substring(7)}`
  }

  const connect = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const sessionId = generateSessionId()
      sessionIdRef.current = sessionId

      // Create session via API
      const response = await fetch('/api/ai/gemini/session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          voiceName: options.voiceName,
          tools: options.tools,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to create session')
      }

      // In a real implementation, you would establish a WebSocket connection here
      // For now, we'll just mark as connected
      setIsConnected(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect')
      options.onError?.(err as Error)
    } finally {
      setIsLoading(false)
    }
  }, [options, generateSessionId])

  const disconnect = useCallback(async () => {
    if (!sessionIdRef.current) {
      return
    }

    try {
      await fetch(`/api/ai/gemini/session?sessionId=${sessionIdRef.current}`, {
        method: 'DELETE',
      })

      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }

      setIsConnected(false)
      sessionIdRef.current = null
    } catch (_err) {}
  }, [])

  const sendMessage = useCallback(
    async (content: string) => {
      if (!(sessionIdRef.current && isConnected)) {
        throw new Error('Not connected')
      }

      // Add user message
      const userMessage: GeminiAudioMessage = {
        id: `msg-${Date.now()}`,
        type: 'text',
        content,
        timestamp: new Date(),
        isUser: true,
      }

      setMessages((prev) => [...prev, userMessage])
      options.onMessage?.(userMessage)

      // Send message to API
      try {
        const response = await fetch('/api/ai/gemini/audio', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sessionId: sessionIdRef.current,
            content,
          }),
        })

        if (!response.ok) {
          throw new Error('Failed to send message')
        }

        // In a real implementation, you would receive the response via WebSocket
        // For demo purposes, we'll simulate a response
        setTimeout(() => {
          const aiMessage: GeminiAudioMessage = {
            id: `msg-${Date.now()}-ai`,
            type: 'text',
            content:
              'This is a simulated response. In production, this would be the actual Gemini response.',
            timestamp: new Date(),
            isUser: false,
          }

          setMessages((prev) => [...prev, aiMessage])
          options.onMessage?.(aiMessage)
        }, 1000)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to send message')
        options.onError?.(err as Error)
      }
    },
    [isConnected, options]
  )

  const sendAudio = useCallback(
    async (audioBlob: Blob) => {
      if (!(sessionIdRef.current && isConnected)) {
        throw new Error('Not connected')
      }

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

        setMessages((prev) => [...prev, userMessage])
        options.onMessage?.(userMessage)

        // Send audio to API
        try {
          const response = await fetch('/api/ai/gemini/audio', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              sessionId: sessionIdRef.current,
              audio: base64Audio,
            }),
          })

          if (!response.ok) {
            throw new Error('Failed to send audio')
          }
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to send audio')
          options.onError?.(err as Error)
        }
      }
    },
    [isConnected, options]
  )

  const clearMessages = useCallback(() => {
    setMessages([])
  }, [])

  // Clean up on unmount
  useEffect(() => {
    return () => {
      disconnect()
    }
  }, [disconnect])

  return {
    isConnected,
    isLoading,
    messages,
    error,
    connect,
    disconnect,
    sendMessage,
    sendAudio,
    clearMessages,
  }
}
