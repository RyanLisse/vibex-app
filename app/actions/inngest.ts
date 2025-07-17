'use server'
import { getSubscriptionToken, type Realtime } from '@inngest/realtime'
import { cookies } from 'next/headers'
import { getInngestApp, inngest, taskChannel } from '@/lib/inngest'
import { getTelemetryConfig } from '@/lib/telemetry'
import type { Task } from '@/stores/tasks'

export type TaskChannelToken = Realtime.Token<typeof taskChannel, ['status', 'update', 'control']>
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

// Helper functions for validation
const validateInngestConfig = (): boolean => {
  const { INNGEST_SIGNING_KEY, INNGEST_EVENT_KEY } = process.env

  if (!INNGEST_SIGNING_KEY || !INNGEST_EVENT_KEY) {
    console.warn('Inngest not configured - subscription disabled')
    return false
  }

  if (!INNGEST_SIGNING_KEY.startsWith('signkey-') || INNGEST_EVENT_KEY.length < 50) {
    console.warn('Inngest credentials appear invalid - subscription disabled')
    return false
  }

  return true
}

const validateToken = (token: unknown): token is TaskChannelToken => {
  if (!token) {
    console.warn('No subscription token received from Inngest')
    return false
  }

  if (typeof token !== 'string' && !(token as any)?.token) {
    console.warn('Invalid token format received from Inngest')
    return false
  }

  return true
}

const handleTokenError = (error: unknown): void => {
  console.error('Failed to fetch Inngest subscription token:', error)

  if (error instanceof Error) {
    if (error.message.includes('401') || error.message.includes('403')) {
      console.error('Inngest authentication failed - check credentials')
    } else if (error.message.includes('network') || error.message.includes('fetch')) {
      console.error('Network error connecting to Inngest')
    }
  }
}

export async function fetchRealtimeSubscriptionToken(): Promise<TaskChannelToken | null> {
  try {
    if (!validateInngestConfig()) {
      return null
    }

    const token = await getSubscriptionToken(getInngestApp(), {
      channel: taskChannel(),
      topics: ['status', 'update', 'control'],
    })

    if (!validateToken(token)) {
      return null
    }

    return token
  } catch (error) {
    handleTokenError(error)
    return null
  }
}
