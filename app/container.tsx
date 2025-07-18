'use client'
import type React from 'react'
import { useInngestSubscriptionManagement } from '@/hooks/use-inngest-subscription'
import { useTaskMessageProcessing } from '@/hooks/use-task-message-processing'

interface ContainerProps {
  children: React.ReactNode
}

/**
 * Container component that manages Inngest subscription and processes task messages.
 * This component handles real-time updates for task status and message processing.
 */
export default function Container({ children }: ContainerProps) {
  const { subscription } = useInngestSubscriptionManagement()
  const { latestData } = subscription

  useTaskMessageProcessing(latestData)

  return <>{children}</>
}
