'use client'
import { useInngestSubscription } from '@inngest/realtime/hooks'
import { useEffect, useState, useCallback } from 'react'

import { fetchRealtimeSubscriptionToken, type TaskChannelToken } from '@/app/actions/inngest'
import { useTaskStore } from '@/stores/tasks'

// Type definitions for better type safety
interface StatusData {
  taskId: string
  status: 'IN_PROGRESS' | 'DONE' | 'MERGED' | 'PAUSED' | 'CANCELLED'
  sessionId: string
}

interface UpdateData {
  taskId: string
  message: {
    type: string
    output?: string
    action?: { command: string[] }
    status?: string
    role?: string
    content?: { text: string }[]
  }
}

interface LatestData {
  channel: string
  topic: string
  data: StatusData | UpdateData
}

export default function Container({ children }: { children: React.ReactNode }) {
  const { updateTask, getTaskById } = useTaskStore()
  const [subscriptionEnabled, setSubscriptionEnabled] = useState(true)

  // Extract token refresh logic
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

  // Extract error handling
  const handleError = useCallback((error: unknown) => {
    console.error('Container Inngest subscription error:', error)
    setSubscriptionEnabled(false)
  }, [])

  // Extract status update handling
  const handleStatusUpdate = useCallback((data: StatusData) => {
    updateTask(data.taskId, {
      status: data.status,
      hasChanges: true,
      sessionId: data.sessionId,
    })
  }, [updateTask])

  // Extract git message handling
  const handleGitMessage = useCallback((data: UpdateData) => {
    updateTask(data.taskId, {
      statusMessage: data.message.output as string,
    })
  }, [updateTask])

  // Extract shell call handling
  const handleShellCall = useCallback((data: UpdateData) => {
    const task = getTaskById(data.taskId)
    const shellData = data.message as { action: { command: string[] } }
    
    updateTask(data.taskId, {
      statusMessage: `Running command ${shellData.action.command.join(' ')}`,
      messages: [
        ...(task?.messages || []),
        {
          role: 'assistant',
          type: 'local_shell_call',
          data: data.message,
        },
      ],
    })
  }, [getTaskById, updateTask])

  // Extract shell output handling
  const handleShellOutput = useCallback((data: UpdateData) => {
    const task = getTaskById(data.taskId)
    
    updateTask(data.taskId, {
      messages: [
        ...(task?.messages || []),
        {
          role: 'assistant',
          type: 'local_shell_call_output',
          data: data.message,
        },
      ],
    })
  }, [getTaskById, updateTask])

  // Extract assistant message handling
  const handleAssistantMessage = useCallback((data: UpdateData) => {
    const task = getTaskById(data.taskId)
    const content = data.message.content as { text: string }[]
    
    updateTask(data.taskId, {
      messages: [
        ...(task?.messages || []),
        {
          role: 'assistant',
          type: 'message',
          data: content[0],
        },
      ],
    })
  }, [getTaskById, updateTask])

  // Extract update message handling
  const handleUpdateMessage = useCallback((data: UpdateData) => {
    const messageType = data.message.type
    
    switch (messageType) {
      case 'git':
        handleGitMessage(data)
        break
      case 'local_shell_call':
        handleShellCall(data)
        break
      case 'local_shell_call_output':
        handleShellOutput(data)
        break
      case 'message':
        if (data.message.status === 'completed' && data.message.role === 'assistant') {
          handleAssistantMessage(data)
        }
        break
    }
  }, [handleGitMessage, handleShellCall, handleShellOutput, handleAssistantMessage])

  const { latestData, disconnect } = useInngestSubscription({
    refreshToken,
    bufferInterval: 0,
    enabled: subscriptionEnabled,
    onError: handleError,
    onClose: () => {
      console.log('Container Inngest subscription closed')
    },
  })

  // Main data processing effect
  useEffect(() => {
    if (!latestData || latestData.channel !== 'tasks') return

    const typedData = latestData as LatestData
    
    if (typedData.topic === 'status') {
      handleStatusUpdate(typedData.data as StatusData)
    } else if (typedData.topic === 'update') {
      handleUpdateMessage(typedData.data as UpdateData)
    }
  }, [latestData, handleStatusUpdate, handleUpdateMessage])

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