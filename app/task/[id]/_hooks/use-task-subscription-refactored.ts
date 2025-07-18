import { useInngestSubscription } from '@inngest/realtime/hooks'
import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react'
import {
  type ConnectionState,
  useConnectionState,
} from '@/app/task/[id]/_hooks/use-connection-state'
import { useMessageProcessor } from '@/app/task/[id]/_hooks/use-message-processor'
import { useStatusProcessor } from '@/app/task/[id]/_hooks/use-status-processor'
import { useStreamingMessages } from '@/app/task/[id]/_hooks/use-streaming-messages'
import { useSubscriptionConfig } from '@/app/task/[id]/_hooks/use-subscription-config'
import type { StreamingMessage } from '@/app/task/[id]/_types/message-types'
import { safeAsync } from '@/lib/stream-utils'

interface UseTaskSubscriptionProps {
  taskId: string
  taskMessages?: Array<{ role: 'user' | 'assistant'; type: string; data: Record<string, unknown> }>
}

interface SubscriptionState {
  enabled: boolean
  streamingMessages: Map<string, StreamingMessage>
  isInitialized: boolean
  lastError: Error | null
  connectionState: ConnectionState
}

type SubscriptionAction =
  | { type: 'ENABLE_SUBSCRIPTION' }
  | { type: 'DISABLE_SUBSCRIPTION' }
  | { type: 'SET_STREAMING_MESSAGES'; payload: Map<string, StreamingMessage> }
  | { type: 'SET_INITIALIZED'; payload: boolean }
  | { type: 'SET_ERROR'; payload: Error | null }
  | { type: 'SET_CONNECTION_STATE'; payload: ConnectionState }
  | { type: 'RESET' }

const initialState: SubscriptionState = {
  enabled: false,
  streamingMessages: new Map(),
  isInitialized: false,
  lastError: null,
  connectionState: 'disconnected',
}

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
    case 'SET_CONNECTION_STATE':
      return { ...state, connectionState: action.payload }
    case 'RESET':
      return initialState
    default:
      return state
  }
}

const CONNECTION_CHECK_ENDPOINT = '/api/test-inngest'
const ERROR_RETRY_DELAY = 5000

export function useTaskSubscription({ taskId, taskMessages = [] }: UseTaskSubscriptionProps) {
  const [state, dispatch] = useReducer(subscriptionReducer, initialState)
  const isUnmountedRef = useRef(false)

  // Connection state management
  const { scheduleRetry, resetRetryCount, clearRetryTimeout, handleStateChange } =
    useConnectionState({
      onStateChange: (newState) => dispatch({ type: 'SET_CONNECTION_STATE', payload: newState }),
      maxRetries: 3,
      retryDelay: 1000,
    })

  // Streaming messages management
  const { updateStreamingMessage, removeStreamingMessage, markAsUnmounted } = useStreamingMessages({
    streamingMessages: state.streamingMessages,
    onUpdate: (updater) => {
      if (!isUnmountedRef.current) {
        dispatch({
          type: 'SET_STREAMING_MESSAGES',
          payload: typeof updater === 'function' ? updater(state.streamingMessages) : updater,
        })
      }
    },
  })

  // Message processors
  const { processMessage } = useMessageProcessor({
    taskId,
    taskMessages,
    streamingMessages: state.streamingMessages,
    setStreamingMessages: (updater) => {
      if (!isUnmountedRef.current) {
        dispatch({
          type: 'SET_STREAMING_MESSAGES',
          payload: typeof updater === 'function' ? updater(state.streamingMessages) : updater,
        })
      }
    },
  })

  const { processStatusUpdate } = useStatusProcessor({ taskId })

  // Inngest availability check
  const checkInngestAvailability = useCallback(async () => {
    if (state.isInitialized || isUnmountedRef.current) {
      return
    }

    try {
      handleStateChange('connecting')
      const response = await fetch(CONNECTION_CHECK_ENDPOINT)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()

      if (data.status === 'ok' && data.config.isDev) {
        dispatch({ type: 'ENABLE_SUBSCRIPTION' })
        handleStateChange('connected')
      } else {
        dispatch({ type: 'DISABLE_SUBSCRIPTION' })
        handleStateChange('disconnected')
      }
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error as Error })
      dispatch({ type: 'DISABLE_SUBSCRIPTION' })
      handleStateChange('error')
    } finally {
      if (!isUnmountedRef.current) {
        dispatch({ type: 'SET_INITIALIZED', payload: true })
      }
    }
  }, [state.isInitialized, handleStateChange])

  // Error handling
  const handleError = useCallback(
    (error: unknown) => {
      if (isUnmountedRef.current) {
        return
      }
      const errorObj = error as Error
      dispatch({ type: 'SET_ERROR', payload: errorObj })
      handleStateChange('error')

      const errorMessage = errorObj?.message?.toLowerCase() || ''

      if (errorMessage.includes('401') || errorMessage.includes('403')) {
        dispatch({ type: 'DISABLE_SUBSCRIPTION' })
      } else if (
        errorMessage.includes('network') ||
        errorMessage.includes('websocket') ||
        errorMessage.includes('readablestream')
      ) {
        scheduleRetry(() => {
          if (state.enabled && !isUnmountedRef.current) {
            checkInngestAvailability()
          }
        }, ERROR_RETRY_DELAY)
      }
    },
    [state.enabled, checkInngestAvailability, scheduleRetry, handleStateChange]
  )

  // Connection close handling
  const handleClose = useCallback(() => {
    if (isUnmountedRef.current) {
      return
    }
    handleStateChange('disconnected')

    if (state.enabled && !state.lastError) {
      scheduleRetry(() => {
        if (state.enabled && !isUnmountedRef.current) {
          checkInngestAvailability()
        }
      })
    }
  }, [state.enabled, state.enabled, state.lastError.lastError, checkInngestAvailability, scheduleRetry, handleStateChange])

  // Subscription configuration
  const { config } = useSubscriptionConfig({
    enabled: state.enabled,
    onError: handleError,
    onClose: handleClose,
    onTokenRefresh: (token) => {
      if (token) {
        handleStateChange('connected')
        resetRetryCount()
      } else {
        handleStateChange('error')
      }
    },
  })

  // Inngest subscription
  const subscriptionResult = useInngestSubscription(config)
  const { latestData } = subscriptionResult
  const disconnect = (subscriptionResult as { disconnect?: () => void })?.disconnect

  // Data processing
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
        handleError(error)
      }
    },
    [taskId, processStatusUpdate, processMessage, handleError]
  )

  // Initialize subscription
  useEffect(() => {
    checkInngestAvailability()
  }, [checkInngestAvailability])

  // Process latest data
  useEffect(() => {
    if (latestData) {
      processLatestData(latestData)
    }
  }, [latestData, processLatestData])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isUnmountedRef.current = true
      markAsUnmounted()
      clearRetryTimeout()

      if (disconnect) {
        safeAsync(() => disconnect(), undefined, 'Error disconnecting subscription:')
      }
    }
  }, [disconnect, markAsUnmounted, clearRetryTimeout])

  return useMemo(
    () => ({
      streamingMessages: state.streamingMessages,
      subscriptionEnabled: state.enabled,
      isInitialized: state.isInitialized,
      lastError: state.lastError,
      connectionState: state.connectionState,
      isConnected: state.connectionState === 'connected',
      isConnecting: state.connectionState === 'connecting',
      hasError: state.lastError !== null,
      messagesCount: state.streamingMessages.size,
    }),
    [state]
  )
}
