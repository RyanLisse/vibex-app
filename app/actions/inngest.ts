'use server'
import { cookies } from 'next/headers'
import { getSubscriptionToken, Realtime } from '@inngest/realtime'

import { inngest } from '@/lib/inngest'
import { Task } from '@/stores/tasks'
import { getInngestApp, taskChannel } from '@/lib/inngest'
import { getTelemetryConfig } from '@/lib/telemetry'

export type TaskChannelToken = Realtime.Token<typeof taskChannel, ['status', 'update']>
export type TaskChannelTokenResponse = TaskChannelToken | null

export const createTaskAction = async ({
  task,
  sessionId,
  prompt,
}: {
  task: Task
  sessionId?: string
  prompt?: string
}) => {
  const cookieStore = await cookies()
  const githubToken = cookieStore.get('github_access_token')?.value

  if (!githubToken) {
    throw new Error('No GitHub token found. Please authenticate first.')
  }

  const telemetryConfig = getTelemetryConfig()
  
  await inngest.send({
    name: 'clonedex/create.task',
    data: {
      task,
      token: githubToken,
      sessionId: sessionId,
      prompt: prompt,
      telemetryConfig: telemetryConfig.isEnabled ? telemetryConfig : undefined,
    },
  })
}

export const createPullRequestAction = async ({ sessionId }: { sessionId?: string }) => {
  const cookieStore = await cookies()
  const githubToken = cookieStore.get('github_access_token')?.value

  if (!githubToken) {
    throw new Error('No GitHub token found. Please authenticate first.')
  }

  const telemetryConfig = getTelemetryConfig()
  
  await inngest.send({
    name: 'clonedex/create.pull-request',
    data: {
      token: githubToken,
      sessionId: sessionId,
      telemetryConfig: telemetryConfig.isEnabled ? telemetryConfig : undefined,
    },
  })
}

export async function fetchRealtimeSubscriptionToken(): Promise<TaskChannelToken | null> {
  try {
    const token = await getSubscriptionToken(getInngestApp(), {
      channel: taskChannel(),
      topics: ['status', 'update'],
    })
    return token
  } catch (error) {
    console.error('Failed to fetch Inngest subscription token:', error)
    // Return null if we can't get a token (e.g., in development without Inngest running)
    return null
  }
}
