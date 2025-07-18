import { useInngestSubscription } from '@inngest/realtime/hooks'
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { fetchRealtimeSubscriptionToken, type TaskChannelToken } from '@/app/actions/inngest'
import { safeAsync } from '@/lib/stream-utils'
import type { StreamingMessage } from '../_types/message-types'
import { useMessageProcessor } from './use-message-processor'
import { useStatusProcessor } from './use-status-processor'

interface UseTaskSubscriptionProps {
  taskId: string
  taskMessages?: Array<{ role: 'user' | 'assistant'; type: string; data: Record<string, unknown> }>
}

// Consolidated state for better management
interface SubscriptionState {
  enabled: boolean
  streamingMessages: Map<string, StreamingMessage>
  isInitialized: boolean
  lastError: Error | null
}

// State actions for reducer
type SubscriptionAction =
  | { type: 'ENABLE_SUBSCRIPTION' }
  | { type: 'DISABLE_SUBSCRIPTION' }
  | { type: 'SET_STREAMING_MESSAGES'; payload: Map<string, StreamingMessage> }
  | { type: 'SET_INITIALIZED'; payload: boolean }
  | { type: 'SET_ERROR'; payload: Error | null }
  | { type: 'RESET' }

// Reducer for consolidated state management
function subscriptionReducer(
  state: SubscriptionState,
  action: SubscriptionAction
): SubscriptionState {
  switch (action.type) {
    case 'ENABLE_SUBSCRIPTION':
      return { ...state, enabled: true, lastError: null }
    case 'DISABLE_SUBSCRIPTION':
      return { ...state, enabled: false }
    case 'SET_STREAMING_MESSAGES':
      return { ...state, streamingMessages: action.payload }
    case 'SET_INITIALIZED':
      return { ...state, isInitialized: action.payload }
    case 'SET_ERROR':
      return { ...state, lastError: action.payload }
    case 'RESET':
      return { enabled: false, streamingMessages: new Map(), isInitialized: false, lastError: null }
    default:
      return state
  }
}

export function useTaskSubscription({ taskId, taskMessages = [] }: UseTaskSubscriptionProps) {
  // Consolidated state management with reducer
  const [state, dispatch] = useReducer(subscriptionReducer, {
    enabled: false,
    streamingMessages: new Map(),
    isInitialized: false,
    lastError: null,
  })

  // Refs for stable references
  const cleanupRef = useRef<(() => void) | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Memoized message processor with stable streamingMessages reference
  const { processMessage } = useMessageProcessor({
    taskId,
    taskMessages,
    streamingMessages: state.streamingMessages,
    setStreamingMessages: useCallback(
      (updater: React.SetStateAction<Map<string, StreamingMessage>>) => {
        dispatch({
          type: 'SET_STREAMING_MESSAGES',
          payload: typeof updater === 'function' ? updater(state.streamingMessages) : updater,
        })
      },
      [state.streamingMessages]
    ),
  })

  const { processStatusUpdate } = useStatusProcessor({ taskId })

  // Memoized Inngest availability check with error handling
  const checkInngestAvailability = useCallback(async () => {
    if (state.isInitialized) return

    try {
      const response = await fetch('/api/test-inngest')
      const data = await response.json()

      if (data.status === 'ok' && data.config.isDev) {
        console.log('Inngest is configured, enabling subscription...')
        dispatch({ type: 'ENABLE_SUBSCRIPTION' })
      } else {
        console.log('Inngest not properly configured, subscription disabled')
        dispatch({ type: 'DISABLE_SUBSCRIPTION' })
      }
    } catch (error) {
      console.log('Failed to check Inngest status:', error)
      dispatch({ type: 'SET_ERROR', payload: error as Error })
      dispatch({ type: 'DISABLE_SUBSCRIPTION' })
    } finally {
      dispatch({ type: 'SET_INITIALIZED', payload: true })
    }
  }, [state.isInitialized])

  // Initialize subscription on mount
  useEffect(() => {
    checkInngestAvailability()
  }, [checkInngestAvailability])

  // Memoized token refresh with better error handling
  const refreshToken = useCallback(async () => {
    console.log('Attempting to refresh Inngest subscription token...')

    try {
      const token = await fetchRealtimeSubscriptionToken()

      if (!token) {
        console.log('Inngest subscription disabled: No token available')
        console.log('Make sure Inngest dev server is running with: bunx inngest-cli@latest dev')
        dispatch({ type: 'DISABLE_SUBSCRIPTION' })
        return null as unknown as TaskChannelToken
      }

      console.log('Inngest subscription token received successfully')
      dispatch({ type: 'SET_ERROR', payload: null })
      return token
    } catch (error) {
      console.error('Token refresh failed:', error)
      dispatch({ type: 'SET_ERROR', payload: error as Error })
      dispatch({ type: 'DISABLE_SUBSCRIPTION' })
      return null as unknown as TaskChannelToken
    }
  }, [])

  // Enhanced error handling with recovery mechanisms
  const handleError = useCallback(
    (error: unknown) => {
      console.error('Inngest subscription error:', error)
      const errorObj = error as Error

      dispatch({ type: 'SET_ERROR', payload: errorObj })

      // Handle specific error types
      if (
        errorObj?.message?.includes('ReadableStream') ||
        errorObj?.message?.includes('WebSocket')
      ) {
        console.warn('Stream/WebSocket error, will retry connection')
        // Allow automatic reconnection for network errors
      } else if (errorObj?.message?.includes('401') || errorObj?.message?.includes('403')) {
        console.warn('Authentication error, disabling subscription')
        dispatch({ type: 'DISABLE_SUBSCRIPTION' })
      } else {
        console.warn('Unknown error, attempting recovery')
        // Attempt reconnection after a delay
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current)
        }
        reconnectTimeoutRef.current = setTimeout(() => {
          if (state.enabled) {
            console.log('Attempting to recover from error')
            checkInngestAvailability()
          }
        }, 5000)
      }
    },
    [state.enabled, checkInngestAvailability]
  )

  const handleClose = useCallback(() => {
    console.log('Inngest subscription closed')

    if (state.enabled && !state.lastError) {
      // Clean disconnection - attempt reconnection
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      reconnectTimeoutRef.current = setTimeout(() => {
        if (state.enabled) {
          console.log('Attempting to reconnect Inngest subscription')
          checkInngestAvailability()
        }
      }, 1000)
    }
  }, [state.enabled, state.lastError, checkInngestAvailability])

  // Memoized subscription configuration to prevent unnecessary re-subscriptions
  const subscriptionConfig = useMemo(
    () => ({
      refreshToken,
      bufferInterval: 0,
      enabled: state.enabled,
      onError: handleError,
      onClose: handleClose,
    }),
    [state.enabled, refreshToken, handleError, handleClose]
  )

  const subscriptionResult = useInngestSubscription(subscriptionConfig)

  const { latestData } = subscriptionResult
  const disconnect = (subscriptionResult as { disconnect?: () => void })?.disconnect

  // Memoized data processing to prevent unnecessary re-processing
  const processLatestData = useCallback(
    (data: typeof latestData) => {
      if (data?.channel !== 'tasks') return

      if (data.topic === 'status') {
        processStatusUpdate(data.data)
      } else if (data.topic === 'update') {
        const updateData = data.data as { taskId: string; message: unknown }
        if (updateData.taskId === taskId && updateData.message) {
          processMessage(updateData.message)
        }
      }
    },
    [taskId, processStatusUpdate, processMessage]
  )

  // Process latest data with memoized handler
  useEffect(() => {
    if (latestData) {
      processLatestData(latestData)
    }
  }, [latestData, processLatestData])

  // Enhanced cleanup with proper error handling
  useEffect(() => {
    // Store cleanup function in ref for stable reference
    cleanupRef.current = () => {
      dispatch({ type: 'RESET' })

      // Clear any pending reconnection timeouts
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
        reconnectTimeoutRef.current = null
      }

      // Safely disconnect subscription
      if (disconnect) {
        safeAsync(() => disconnect(), undefined, 'Error disconnecting Inngest subscription:')
      }
    }

    // Return cleanup function
    return () => {
      cleanupRef.current?.()
    }
  }, [disconnect])

  // Memoized return value to prevent unnecessary re-renders
  return useMemo(
    () => ({
      streamingMessages: state.streamingMessages,
      subscriptionEnabled: state.enabled,
      isInitialized: state.isInitialized,
      lastError: state.lastError,
    }),
    [state.streamingMessages, state.enabled, state.isInitialized, state.lastError]
  )
}
