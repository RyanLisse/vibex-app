import { useInngestSubscription } from '@inngest/realtime/hooks'
import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react'
import { fetchRealtimeSubscriptionToken, type TaskChannelToken } from '@/app/actions/inngest'
import { useMessageProcessor } from '@/app/task/[id]/_hooks/use-message-processor'
import { useStatusProcessor } from '@/app/task/[id]/_hooks/use-status-processor'
import type { StreamingMessage } from '@/app/task/[id]/_types/message-types'
import { safeAsync } from '@/lib/stream-utils'

interface UseTaskSubscriptionProps {
  taskId: string
  taskMessages?: Array<{
    role: 'user' | 'assistant'
    type: string
    data: Record<string, unknown>
  }>
}

// Consolidated state for better management
interface SubscriptionState {
  enabled: boolean
  streamingMessages: Map<string, StreamingMessage>
  isInitialized: boolean
  lastError: Error | null
  connectionState: 'disconnected' | 'connecting' | 'connected' | 'error'
}

// State actions for reducer - more specific actions for better state management
type SubscriptionAction =
  | { type: 'ENABLE_SUBSCRIPTION' }
  | { type: 'DISABLE_SUBSCRIPTION' }
  | { type: 'SET_STREAMING_MESSAGES'; payload: Map<string, StreamingMessage> }
  | {
      type: 'UPDATE_STREAMING_MESSAGE'
      payload: { streamId: string; message: StreamingMessage }
    }
  | { type: 'REMOVE_STREAMING_MESSAGE'; payload: string }
  | { type: 'SET_INITIALIZED'; payload: boolean }
  | { type: 'SET_ERROR'; payload: Error | null }
  | {
      type: 'SET_CONNECTION_STATE'
      payload: SubscriptionState['connectionState']
    }
  | { type: 'RESET' }

// Reducer for consolidated state management with better state transitions
function subscriptionReducer(
  state: SubscriptionState,
  action: SubscriptionAction
): SubscriptionState {
  switch (action.type) {
    case 'ENABLE_SUBSCRIPTION':
      return {
        ...state,
        enabled: true,
        lastError: null,
        connectionState: 'connecting',
      }
    case 'DISABLE_SUBSCRIPTION':
      return { ...state, enabled: false, connectionState: 'disconnected' }
    case 'SET_STREAMING_MESSAGES':
      return { ...state, streamingMessages: action.payload }
    case 'UPDATE_STREAMING_MESSAGE': {
      const newMessages = new Map(state.streamingMessages)
      newMessages.set(action.payload.streamId, action.payload.message)
      return { ...state, streamingMessages: newMessages }
    }
    case 'REMOVE_STREAMING_MESSAGE': {
      const newMessages = new Map(state.streamingMessages)
      newMessages.delete(action.payload)
      return { ...state, streamingMessages: newMessages }
    }
    case 'SET_INITIALIZED':
      return { ...state, isInitialized: action.payload }
    case 'SET_ERROR':
      return { ...state, lastError: action.payload, connectionState: 'error' }
    case 'SET_CONNECTION_STATE':
      return { ...state, connectionState: action.payload }
    case 'RESET':
      return {
        enabled: false,
        streamingMessages: new Map(),
        isInitialized: false,
        lastError: null,
        connectionState: 'disconnected',
      }
    default:
      return state
  }
}

// Constants for better maintainability
const RECONNECT_DELAY = 1000
const ERROR_RECONNECT_DELAY = 5000
const CONNECTION_CHECK_ENDPOINT = '/api/test-inngest'

export function useTaskSubscription({ taskId, taskMessages = [] }: UseTaskSubscriptionProps) {
  // Consolidated state management with reducer
  const [state, dispatch] = useReducer(subscriptionReducer, {
    enabled: false,
    streamingMessages: new Map(),
    isInitialized: false,
    lastError: null,
    connectionState: 'disconnected',
  })

  // Refs for stable references and cleanup
  const cleanupRef = useRef<(() => void) | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isUnmountedRef = useRef(false)

  // Optimized message processor with better streaming message updates
  const setStreamingMessages = useCallback(
    (updater: React.SetStateAction<Map<string, StreamingMessage>>) => {
      if (isUnmountedRef.current) {
        return
      }
      dispatch({
        type: 'SET_STREAMING_MESSAGES',
        payload: typeof updater === 'function' ? updater(state.streamingMessages) : updater,
      })
    },
    [state.streamingMessages]
  )

  // Memoized message processor with stable references
  const { processMessage } = useMessageProcessor({
    taskId,
    taskMessages,
    streamingMessages: state.streamingMessages,
    setStreamingMessages,
  })

  const { processStatusUpdate } = useStatusProcessor({ taskId })

  // Optimized Inngest availability check with better error handling
  const checkInngestAvailability = useCallback(async () => {
    if (state.isInitialized || isUnmountedRef.current) {
      return
    }

    try {
      dispatch({ type: 'SET_CONNECTION_STATE', payload: 'connecting' })
      const response = await fetch(CONNECTION_CHECK_ENDPOINT)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()

      if (data.status === 'ok' && data.config.isDev) {
        dispatch({ type: 'ENABLE_SUBSCRIPTION' })
        dispatch({ type: 'SET_CONNECTION_STATE', payload: 'connected' })
      } else {
        dispatch({ type: 'DISABLE_SUBSCRIPTION' })
      }
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error as Error })
      dispatch({ type: 'DISABLE_SUBSCRIPTION' })
    } finally {
      if (!isUnmountedRef.current) {
        dispatch({ type: 'SET_INITIALIZED', payload: true })
      }
    }
  }, [state.isInitialized])

  // Initialize subscription on mount
  useEffect(() => {
    checkInngestAvailability()
  }, [checkInngestAvailability])

  // Optimized token refresh with better error handling and retry logic
  const refreshToken = useCallback(async () => {
    if (isUnmountedRef.current) {
      return null as unknown as TaskChannelToken
    }

    try {
      const token = await fetchRealtimeSubscriptionToken()

      if (!token) {
        if (!isUnmountedRef.current) {
          dispatch({ type: 'DISABLE_SUBSCRIPTION' })
        }
        return null as unknown as TaskChannelToken
      }
      if (!isUnmountedRef.current) {
        dispatch({ type: 'SET_ERROR', payload: null })
        dispatch({ type: 'SET_CONNECTION_STATE', payload: 'connected' })
      }
      return token
    } catch (error) {
      if (!isUnmountedRef.current) {
        dispatch({ type: 'SET_ERROR', payload: error as Error })
        dispatch({ type: 'DISABLE_SUBSCRIPTION' })
      }
      return null as unknown as TaskChannelToken
    }
  }, [])

  // Enhanced error handling with better recovery mechanisms
  const handleError = useCallback(
    (error: unknown) => {
      if (isUnmountedRef.current) {
        return
      }
      const errorObj = error as Error

      dispatch({ type: 'SET_ERROR', payload: errorObj })

      // Handle specific error types with better classification
      const errorMessage = errorObj?.message?.toLowerCase() || ''

      if (errorMessage.includes('readablestream') || errorMessage.includes('websocket')) {
        // Allow automatic reconnection for network errors
        dispatch({ type: 'SET_CONNECTION_STATE', payload: 'connecting' })
      } else if (errorMessage.includes('401') || errorMessage.includes('403')) {
        dispatch({ type: 'DISABLE_SUBSCRIPTION' })
      } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
        dispatch({ type: 'SET_CONNECTION_STATE', payload: 'connecting' })
      } else {
        // Attempt reconnection after a delay
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current)
        }
        reconnectTimeoutRef.current = setTimeout(() => {
          if (state.enabled && !isUnmountedRef.current) {
            checkInngestAvailability()
          }
        }, ERROR_RECONNECT_DELAY)
      }
    },
    [state.enabled, checkInngestAvailability]
  )

  const handleClose = useCallback(() => {
    if (isUnmountedRef.current) {
      return
    }
    dispatch({ type: 'SET_CONNECTION_STATE', payload: 'disconnected' })

    if (state.enabled && !state.lastError) {
      // Clean disconnection - attempt reconnection
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      reconnectTimeoutRef.current = setTimeout(() => {
        if (state.enabled && !isUnmountedRef.current) {
          dispatch({ type: 'SET_CONNECTION_STATE', payload: 'connecting' })
          checkInngestAvailability()
        }
      }, RECONNECT_DELAY)
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

  // Optimized data processing with better error handling
  const processLatestData = useCallback(
    (data: typeof latestData) => {
      if (isUnmountedRef.current || !data || data.channel !== 'tasks') {
        return
      }

      try {
        if (data.topic === 'status') {
          processStatusUpdate(data.data)
        } else if (data.topic === 'update') {
          const updateData = data.data as { taskId: string; message: unknown }
          if (updateData.taskId === taskId && updateData.message) {
            processMessage(updateData.message)
          }
        }
      } catch (error) {
        dispatch({ type: 'SET_ERROR', payload: error as Error })
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

  // Enhanced cleanup with proper error handling and unmount tracking
  useEffect(() => {
    // Store cleanup function in ref for stable reference
    cleanupRef.current = () => {
      isUnmountedRef.current = true
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

  // Track component unmount
  useEffect(() => {
    return () => {
      isUnmountedRef.current = true
    }
  }, [])

  // Memoized return value to prevent unnecessary re-renders with additional state
  return useMemo(
    () => ({
      streamingMessages: state.streamingMessages,
      subscriptionEnabled: state.enabled,
      isInitialized: state.isInitialized,
      lastError: state.lastError,
      connectionState: state.connectionState,
      // Helper functions for better usability
      isConnected: state.connectionState === 'connected',
      isConnecting: state.connectionState === 'connecting',
      hasError: state.lastError !== null,
    }),
    [
      state.streamingMessages,
      state.enabled,
      state.isInitialized,
      state.lastError,
      state.connectionState,
    ]
  )
}
