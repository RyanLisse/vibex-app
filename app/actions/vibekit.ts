'use server'

import { VibeKit, type VibeKitConfig } from '@vibe-kit/sdk'
import { cookies } from 'next/headers'
import { getTelemetryConfig } from '@/lib/telemetry'
import type { Task } from '@/types/task'

export const createPullRequestAction = async ({ task }: { task: Task }) => {
  const cookieStore = await cookies()
  const githubToken = cookieStore.get('github_access_token')?.value

  if (!githubToken) {
    throw new Error('No GitHub token found. Please authenticate first.')
  }

  const telemetryConfig = getTelemetryConfig()

  const config: VibeKitConfig = {
    agent: {
      type: 'codex',
      model: {
        apiKey: process.env.OPENAI_API_KEY!,
      },
    },
    environment: {
      e2b: {
        apiKey: process.env.E2B_API_KEY!,
      },
    },
    github: {
      token: githubToken,
      repository: task.repository,
    },
    sessionId: task.sessionId,
    telemetry: telemetryConfig.isEnabled ? telemetryConfig : undefined,
  }

  const vibekit = new VibeKit(config)

  const pr = await vibekit.createPullRequest()

  return pr
}
