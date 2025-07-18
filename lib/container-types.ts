// Type definitions for Container component
export interface StatusData {
  taskId: string
  status: 'IN_PROGRESS' | 'DONE' | 'MERGED' | 'PAUSED' | 'CANCELLED'
  sessionId: string
}

export interface UpdateData {
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

export interface LatestData {
  channel: string
  topic: string
  data: StatusData | UpdateData
}

export interface TaskMessage {
  role: 'user' | 'assistant'
  type: string
  data: Record<string, unknown>
}

// Type guards for better type safety
export function isStatusData(data: StatusData | UpdateData): data is StatusData {
  return 'status' in data && 'sessionId' in data
}

export function isUpdateData(data: StatusData | UpdateData): data is UpdateData {
  return 'message' in data
}

export function isTasksChannel(data: LatestData): boolean {
  return data.channel === 'tasks'
}

export function isStatusTopic(data: LatestData): boolean {
  return data.topic === 'status'
}

export function isUpdateTopic(data: LatestData): boolean {
  return data.topic === 'update'
}

export function isGitMessage(message: UpdateData['message']): boolean {
  return message.type === 'git'
}

export function isShellCallMessage(message: UpdateData['message']): boolean {
  return message.type === 'local_shell_call'
}

export function isShellOutputMessage(message: UpdateData['message']): boolean {
  return message.type === 'local_shell_call_output'
}

export function isCompletedAssistantMessage(message: UpdateData['message']): boolean {
  return (
    message.type === 'message' && message.status === 'completed' && message.role === 'assistant'
  )
}

export function hasShellAction(
  message: UpdateData['message']
): message is UpdateData['message'] & { action: { command: string[] } } {
  return 'action' in message && message.action !== undefined
}

export function hasMessageContent(
  message: UpdateData['message']
): message is UpdateData['message'] & { content: { text: string }[] } {
  return 'content' in message && Array.isArray(message.content)
}
