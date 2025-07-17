'use server'
import { cookies } from 'next/headers'
import { getSubscriptionToken, Realtime } from '@inngest/realtime'

import { inngest } from '@/lib/inngest'
import { Task } from '@/stores/tasks'
import { getInngestApp, taskChannel } from '@/lib/inngest'

export type TaskChannelToken = Realtime.Token<typeof taskChannel, ['status', 'update']>

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

  await inngest.send({
    name: 'clonedex/create.task',
    data: {
      task,
      token: githubToken,
      sessionId: sessionId,
      prompt: prompt,
    },
  })
}

export const createPullRequestAction = async ({ sessionId }: { sessionId?: string }) => {
  const cookieStore = await cookies()
  const githubToken = cookieStore.get('github_access_token')?.value

  if (!githubToken) {
    throw new Error('No GitHub token found. Please authenticate first.')
  }

  await inngest.send({
    name: 'clonedex/create.pull-request',
    data: {
      token: githubToken,
      sessionId: sessionId,
    },
  })
}

export async function fetchRealtimeSubscriptionToken(): Promise<TaskChannelToken> {
  const token = await getSubscriptionToken(getInngestApp(), {
    channel: taskChannel(),
    topics: ['status', 'update'],
  })

  return token
}
