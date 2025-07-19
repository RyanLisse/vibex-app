import type { PullRequestResponse } from '@vibe-kit/sdk'

export type TaskStatus = 'IN_PROGRESS' | 'DONE' | 'MERGED' | 'PAUSED' | 'CANCELLED'

export interface Task {
  id: string
  title: string
  description: string
  messages: {
    role: 'user' | 'assistant'
    type: string
    data: Record<string, unknown>
  }[]
  status: TaskStatus
  branch: string
  sessionId: string
  repository: string
  createdAt: string
  updatedAt: string
  statusMessage?: string
  isArchived: boolean
  mode: 'code' | 'ask'
  hasChanges: boolean
  pullRequest?: PullRequestResponse
}
