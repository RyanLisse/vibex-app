'use client'
import { InngestSubscriptionState, useInngestSubscription } from '@inngest/realtime/hooks'
import React, { createContext, type ReactNode, useCallback, useContext, useMemo } from 'react'
import { useConnectionState } from '@/hooks/use-connection-state'
import { useRealtimeToken } from '@/hooks/use-realtime-token'
import type { LatestData } from '@/lib/container-types'

interface RealtimeContextValue {
  latestData: LatestData | null
  isConnected: boolean
  isConnecting: boolean
  error: Error | null
  reconnect: () => Promise<void>
}

const RealtimeContext = createContext<RealtimeContextValue | null>(null)

interface RealtimeProviderProps {
  children: ReactNode
}

export function RealtimeProvider({ children }: RealtimeProviderProps) {
  const { token, refreshToken, isEnabled, error: tokenError } = useRealtimeToken()
  const connectionState = useConnectionState({
    autoReconnect: true,
    maxReconnectAttempts: 3,
    reconnectDelay: 1000,
  })

  const subscription = useInngestSubscription({
    refreshToken,
    bufferInterval: 0,
    enabled: isEnabled,
  })

  const handleReconnect = useCallback(async () => {
    await connectionState.resetConnection()
  }, [connectionState])

  // Update connection state based on subscription state
  React.useEffect(() => {
    const isConnected = subscription.state === InngestSubscriptionState.Open
    const _isConnecting = subscription.state === InngestSubscriptionState.Connecting

    if (isConnected && !connectionState.isConnected) {
      connectionState.connect(async () => {
        // Connection successful
      })
    } else if (!isConnected && connectionState.isConnected) {
      connectionState.disconnect()
    }
  }, [subscription.state, connectionState])

  const contextValue = useMemo(
    () => ({
      latestData: subscription.latestData,
      isConnected: connectionState.isConnected,
      isConnecting: connectionState.isConnecting,
      error: subscription.error || tokenError,
      reconnect: handleReconnect,
    }),
    [
      subscription.latestData,
      subscription.error,
      connectionState.isConnected,
      connectionState.isConnecting,
      tokenError,
      handleReconnect,
    ]
  )

  return <RealtimeContext.Provider value={contextValue}>{children}</RealtimeContext.Provider>
}

export function useRealtime() {
  const context = useContext(RealtimeContext)
  if (!context) {
    throw new Error('useRealtime must be used within a RealtimeProvider')
  }
  return context
}
