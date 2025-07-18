import { useCallback, useEffect, useRef, useState } from 'react'

export interface UseConnectionStateOptions {
  autoReconnect?: boolean
  maxReconnectAttempts?: number
  reconnectDelay?: number
  onConnectionChange?: (isConnected: boolean) => void
  onError?: (error: Error) => void
}

export function useConnectionState(options: UseConnectionStateOptions = {}) {
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [isDisconnecting, setIsDisconnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reconnectAttempts, setReconnectAttempts] = useState(0)

  const { autoReconnect = false, maxReconnectAttempts = 3, reconnectDelay = 1000 } = options

  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const connectionCallbackRef = useRef<(() => Promise<void>) | null>(null)
  const disconnectionCallbackRef = useRef<(() => Promise<void>) | null>(null)

  const clearReconnectTimeout = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
  }, [])

  const attemptReconnect = useCallback(async () => {
    if (!autoReconnect || reconnectAttempts >= maxReconnectAttempts) {
      return
    }

    setReconnectAttempts((prev) => prev + 1)

    reconnectTimeoutRef.current = setTimeout(
      async () => {
        if (connectionCallbackRef.current) {
          try {
            await connectionCallbackRef.current()
          } catch (err) {
            console.error('Reconnection failed:', err)
            await attemptReconnect()
          }
        }
      },
      reconnectDelay * 2 ** reconnectAttempts
    ) // Exponential backoff
  }, [autoReconnect, maxReconnectAttempts, reconnectAttempts, reconnectDelay])

  const connect = useCallback(
    async (connectionCallback: () => Promise<void>) => {
      if (isConnected || isConnecting) {
        return
      }

      setIsConnecting(true)
      setError(null)
      connectionCallbackRef.current = connectionCallback

      try {
        await connectionCallback()
        setIsConnected(true)
        setReconnectAttempts(0)
        options.onConnectionChange?.(true)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Connection failed'
        setError(errorMessage)
        options.onError?.(new Error(errorMessage))

        if (autoReconnect) {
          await attemptReconnect()
        }
      } finally {
        setIsConnecting(false)
      }
    },
    [isConnected, isConnecting, autoReconnect, attemptReconnect, options]
  )

  const disconnect = useCallback(
    async (disconnectionCallback?: () => Promise<void>) => {
      if (!isConnected || isDisconnecting) {
        return
      }

      setIsDisconnecting(true)
      clearReconnectTimeout()
      disconnectionCallbackRef.current = disconnectionCallback || null

      try {
        if (disconnectionCallback) {
          await disconnectionCallback()
        }
        setIsConnected(false)
        setReconnectAttempts(0)
        options.onConnectionChange?.(false)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Disconnection failed'
        setError(errorMessage)
        options.onError?.(new Error(errorMessage))
      } finally {
        setIsDisconnecting(false)
      }
    },
    [isConnected, isDisconnecting, clearReconnectTimeout, options]
  )

  const resetConnection = useCallback(async () => {
    if (disconnectionCallbackRef.current) {
      await disconnect(disconnectionCallbackRef.current)
    }
    if (connectionCallbackRef.current) {
      await connect(connectionCallbackRef.current)
    }
  }, [connect, disconnect])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  // Clean up on unmount
  useEffect(() => {
    return () => {
      clearReconnectTimeout()
    }
  }, [clearReconnectTimeout])

  return {
    isConnected,
    isConnecting,
    isDisconnecting,
    error,
    reconnectAttempts,
    isLoading: isConnecting || isDisconnecting,
    connect,
    disconnect,
    resetConnection,
    clearError,
    canReconnect: autoReconnect && reconnectAttempts < maxReconnectAttempts,
  }
}
