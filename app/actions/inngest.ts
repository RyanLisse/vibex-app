'use server'
import { getSubscriptionToken, type Realtime } from '@inngest/realtime'
import { cookies } from 'next/headers'
import { getInngestApp, inngest, taskChannel } from '@/lib/inngest'
import { getTelemetryConfig } from '@/lib/telemetry'
import type { Task } from '@/stores/tasks'

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

export async function pauseTaskAction(taskId: string) {
  await inngest.send({
    name: 'clonedx/task.control',
    data: {
      taskId,
      action: 'pause',
    },
  })
}

export async function resumeTaskAction(taskId: string) {
  await inngest.send({
    name: 'clonedx/task.control',
    data: {
      taskId,
      action: 'resume',
    },
  })
}

export async function cancelTaskAction(taskId: string) {
  await inngest.send({
    name: 'clonedx/task.control',
    data: {
      taskId,
      action: 'cancel',
    },
  })
}

export async function fetchRealtimeSubscriptionToken(): Promise<TaskChannelToken | null> {
  try {
    // Check if Inngest is properly configured
    if (!process.env.INNGEST_SIGNING_KEY || !process.env.INNGEST_EVENT_KEY) {
      console.warn('Inngest not configured - subscription disabled')
      return null
    }

    const token = await getSubscriptionToken(getInngestApp(), {
      channel: taskChannel(),
      topics: ['status', 'update', 'control'],
    })

    if (!token) {
      console.warn('No subscription token received from Inngest')
      return null
    }

    return token
  } catch (error) {
    console.error('Failed to fetch Inngest subscription token:', error)
    // Return null if we can't get a token (e.g., in development without Inngest running)
    return null
  }
}
