import type { Task } from '@/types/task'

// Enhanced message types with better type safety
export interface TaskMessage {
  role: 'user' | 'assistant'
  type: 'message' | 'local_shell_call' | 'local_shell_call_output'
  data: MessageData
}

export interface MessageData {
  id?: string
  text?: string
  call_id?: string
  action?: {
    command?: string[]
  }
  output?: string
  [key: string]: unknown
}

// Component props interfaces
export interface TaskClientPageProps {
  id: string
}

export interface ChatMessagesPanelProps {
  task: Task
  regularMessages: Task['messages']
  streamingMessages: Map<string, StreamingMessage>
}

export interface ShellOutputPanelProps {
  shellMessages: Task['messages']
}

// Re-export from message-types for convenience
export type { IncomingMessage, StreamingMessage } from '@/app/task/[id]/_types/message-types'

// Task status helpers
export type TaskStatus = 'IN_PROGRESS' | 'DONE' | 'MERGED' | 'PAUSED' | 'CANCELLED'

export interface TaskStatusInfo {
  status: TaskStatus
  statusMessage?: string
  hasChanges: boolean
}

// Utility types
export interface RepositoryInfo {
  repository?: string
  branch?: string
  repoUrl?: string
}

export interface StreamProgress {
  chunkIndex: number
  totalChunks: number
}
