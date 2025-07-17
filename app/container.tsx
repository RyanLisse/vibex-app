'use client'
import { useInngestSubscription } from '@inngest/realtime/hooks'
import { useEffect, useState } from 'react'

import { fetchRealtimeSubscriptionToken } from '@/app/actions/inngest'
import { useTaskStore } from '@/stores/tasks'

export default function Container({ children }: { children: React.ReactNode }) {
  const { updateTask, getTaskById } = useTaskStore()
  const [subscriptionEnabled, setSubscriptionEnabled] = useState(true)

  const { latestData, disconnect } = useInngestSubscription({
    refreshToken: async () => {
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
    },
    bufferInterval: 0,
    enabled: subscriptionEnabled,
    onError: (error) => {
      console.error('Container Inngest subscription error:', error)
      setSubscriptionEnabled(false)
    },
    onClose: () => {
      console.log('Container Inngest subscription closed')
    },
  })

  useEffect(() => {
    if (latestData?.channel === 'tasks' && latestData.topic === 'status') {
      updateTask(latestData.data.taskId, {
        status: latestData.data.status,
        hasChanges: true,
        sessionId: latestData.data.sessionId,
      })
    }

    if (latestData?.channel === 'tasks' && latestData.topic === 'update') {
      if (latestData.data.message.type === 'git') {
        updateTask(latestData.data.taskId, {
          statusMessage: latestData.data.message.output as string,
        })
      }

      if (latestData.data.message.type === 'local_shell_call') {
        const task = getTaskById(latestData.data.taskId)
        updateTask(latestData.data.taskId, {
          statusMessage: `Running command ${(latestData.data.message as { action: { command: string[] } }).action.command.join(' ')}`,
          messages: [
            ...(task?.messages || []),
            {
              role: 'assistant',
              type: 'local_shell_call',
              data: latestData.data.message,
            },
          ],
        })
      }

      if (latestData.data.message.type === 'local_shell_call_output') {
        const task = getTaskById(latestData.data.taskId)
        updateTask(latestData.data.taskId, {
          messages: [
            ...(task?.messages || []),
            {
              role: 'assistant',
              type: 'local_shell_call_output',
              data: latestData.data.message,
            },
          ],
        })
      }

      if (
        latestData.data.message.type === 'message' &&
        latestData.data.message.status === 'completed' &&
        latestData.data.message.role === 'assistant'
      ) {
        const task = getTaskById(latestData.data.taskId)

        updateTask(latestData.data.taskId, {
          messages: [
            ...(task?.messages || []),
            {
              role: 'assistant',
              type: 'message',
              data: (latestData.data.message.content as { text: string }[])[0],
            },
          ],
        })
      }
    }
  }, [latestData, updateTask, getTaskById])

  // Cleanup subscription on unmount
  useEffect(() => {
    return () => {
      setSubscriptionEnabled(false)
      // Properly disconnect the subscription to avoid stream cancellation errors
      if (disconnect) {
        try {
          disconnect()
        } catch (error) {
          console.warn('Error disconnecting Container Inngest subscription:', error)
        }
      }
    }
  }, [disconnect])

  return children
}
