import { useCallback, useRef } from 'react'

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error'

interface UseConnectionStateProps {
  onStateChange?: (state: ConnectionState) => void
  maxRetries?: number
  retryDelay?: number
}

export function useConnectionState({
  onStateChange,
  maxRetries = 3,
  retryDelay = 1000,
}: UseConnectionStateProps = {}) {
  const retryCountRef = useRef(0)
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const clearRetryTimeout = useCallback(() => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current)
      retryTimeoutRef.current = null
    }
  }, [])

  const scheduleRetry = useCallback(
    (retryFn: () => void, delay: number = retryDelay) => {
      clearRetryTimeout()

      if (retryCountRef.current >= maxRetries) {
        return false
      }

      retryCountRef.current++
      retryTimeoutRef.current = setTimeout(() => {
        retryFn()
      }, delay)

      return true
    },
    [maxRetries, retryDelay, clearRetryTimeout]
  )

  const resetRetryCount = useCallback(() => {
    retryCountRef.current = 0
    clearRetryTimeout()
  }, [clearRetryTimeout])

  const handleStateChange = useCallback(
    (newState: ConnectionState) => {
      if (newState === 'connected') {
        resetRetryCount()
      }
      onStateChange?.(newState)
    },
    [onStateChange, resetRetryCount]
  )

  return {
    scheduleRetry,
    resetRetryCount,
    clearRetryTimeout,
    handleStateChange,
    retryCount: retryCountRef.current,
  }
}
