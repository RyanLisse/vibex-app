import { useCallback, useEffect, useRef, useState } from 'react'

export interface UseWebSocketOptions {
  onOpen?: (event: Event) => void
  onClose?: (event: CloseEvent) => void
  onError?: (event: Event) => void
  onMessage?: (event: MessageEvent) => void
  reconnectAttempts?: number
  reconnectInterval?: number
}

export interface UseWebSocketReturn {
  lastMessage: MessageEvent | null
  connectionStatus: 'Connecting' | 'Open' | 'Closing' | 'Closed'
  sendMessage: (message: string) => void
  closeConnection: () => void
}

export const useWebSocket = (
  url: string,
  options: UseWebSocketOptions = {}
): UseWebSocketReturn => {
  const {
    onOpen,
    onClose,
    onError,
    onMessage,
    reconnectAttempts = 3,
    reconnectInterval = 3000,
  } = options

  const [lastMessage, setLastMessage] = useState<MessageEvent | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<
    'Connecting' | 'Open' | 'Closing' | 'Closed'
  >('Closed')

  const eventSourceRef = useRef<EventSource | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectCountRef = useRef(0)

  const connect = useCallback(() => {
    if (eventSourceRef.current?.readyState === EventSource.OPEN) {
      return
    }

    setConnectionStatus('Connecting')

    try {
      // Use Server-Sent Events instead of WebSocket for Next.js compatibility
      const sseUrl = url.replace('/ws', '/sse')
      // @ts-expect-error - Workaround for TypeScript bug
      eventSourceRef.current = new EventSource(sseUrl)

      eventSourceRef.current.onopen = (event) => {
        setConnectionStatus('Open')
        reconnectCountRef.current = 0
        onOpen?.(event)
      }

      eventSourceRef.current.onmessage = (event) => {
        // Convert SSE event to MessageEvent-like structure for compatibility
        const messageEvent = {
          data: event.data,
          type: 'message',
          origin: event.origin,
          lastEventId: event.lastEventId,
        } as MessageEvent

        setLastMessage(messageEvent)
        onMessage?.(messageEvent)
      }

      eventSourceRef.current.onerror = (event) => {
        setConnectionStatus('Closed')
        onError?.(event)

        // Attempt reconnection if not manually closed
        if (reconnectCountRef.current < reconnectAttempts) {
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectCountRef.current++
            connect()
          }, reconnectInterval)
        }
      }
    } catch (error) {
      console.error('SSE connection error:', error)
      setConnectionStatus('Closed')
    }
  }, [url, onOpen, onError, onMessage, reconnectAttempts, reconnectInterval])

  const sendMessage = useCallback((message: string) => {
    // For SSE, we can't send messages back to server directly
    // In a real implementation, you'd use a separate HTTP POST endpoint
    console.log('SSE does not support sending messages. Message:', message)

    // Send via HTTP POST instead
    fetch('/api/ambient-agents/ws', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, timestamp: new Date().toISOString() }),
    }).catch((error) => console.error('Error sending message:', error))
  }, [])

  const closeConnection = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }

    if (eventSourceRef.current) {
      setConnectionStatus('Closing')
      eventSourceRef.current.close()
      setConnectionStatus('Closed')

      // Simulate close event for compatibility
      // @ts-expect-error - Temporary workaround for TypeScript bug
      const closeEvent = new CloseEvent('close', {
        wasClean: true,
        code: 1000,
        reason: 'User initiated close',
      })
      onClose?.(closeEvent)
    }
  }, [onClose])

  useEffect(() => {
    connect()

    return () => {
      closeConnection()
    }
  }, [connect, closeConnection])

  return {
    lastMessage,
    connectionStatus,
    sendMessage,
    closeConnection,
  }
}
