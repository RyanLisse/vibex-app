import { InngestSubscriptionState, useInngestSubscription } from '@inngest/realtime/hooks'
import { useCallback, useEffect, useState } from 'react'
import { fetchRealtimeSubscriptionToken, type TaskChannelToken } from '@/app/actions/inngest'

export interface UseInngestSubscriptionReturn {
  subscription: ReturnType<typeof useInngestSubscription>
  subscriptionEnabled: boolean
  refreshToken: () => Promise<TaskChannelToken>
  handleError: (error: unknown) => void
}

export function useInngestSubscriptionManagement(): UseInngestSubscriptionReturn {
  const [subscriptionEnabled, setSubscriptionEnabled] = useState(true)

  const refreshToken = useCallback(async () => {
    try {
      const token = await fetchRealtimeSubscriptionToken()
      if (!token) {
        console.log('Inngest subscription disabled: No token available')
        setSubscriptionEnabled(false)
        return null as unknown as TaskChannelToken
      }
      return token
    } catch (error) {
      console.error('Failed to refresh Inngest token:', error)
      setSubscriptionEnabled(false)
      return null as unknown as TaskChannelToken
    }
  }, [])

  const handleError = useCallback((error: unknown) => {
    console.error('Container Inngest subscription error:', error)
    setSubscriptionEnabled(false)
  }, [])

  const subscription = useInngestSubscription({
    refreshToken,
    bufferInterval: 0,
    enabled: subscriptionEnabled,
  })

  // Handle subscription errors
  useEffect(() => {
    if (subscription.error) {
      handleError(subscription.error)
    }
  }, [subscription.error, handleError])

  // Handle subscription state changes
  useEffect(() => {
    if (subscription.state === InngestSubscriptionState.Closed) {
      console.log('Container Inngest subscription closed')
    }
  }, [subscription.state])

  // Cleanup subscription on unmount
  useEffect(() => {
    return () => {
      setSubscriptionEnabled(false)
    }
  }, [])

  return {
    subscription,
    subscriptionEnabled,
    refreshToken,
    handleError,
  }
}
