import type { Task } from '@/types/task'
import {
  hasMessageContent,
  hasShellAction,
  isCompletedAssistantMessage,
  isGitMessage,
  isShellCallMessage,
  isShellOutputMessage,
  type StatusData,
  type UpdateData,
} from './container-types'

export interface MessageHandlerDependencies {
  updateTask: (id: string, updates: Partial<Omit<Task, 'id' | 'createdAt'>>) => void
  getTaskById: (id: string) => Task | undefined
}

export class MessageHandlers {
  constructor(private deps: MessageHandlerDependencies) {}

  handleStatusUpdate = (data: StatusData): void => {
    this.deps.updateTask(data.taskId, {
      status: data.status,
      hasChanges: true,
      sessionId: data.sessionId,
    })
  }

  handleGitMessage = (data: UpdateData): void => {
    if (!isGitMessage(data.message)) {
      return
    }

    this.deps.updateTask(data.taskId, {
      statusMessage: data.message.output as string,
    })
  }

  handleShellCall = (data: UpdateData): void => {
    if (!(isShellCallMessage(data.message) && hasShellAction(data.message))) {
      return
    }

    const task = this.deps.getTaskById(data.taskId)
    const command = data.message.action.command.join(' ')

    this.deps.updateTask(data.taskId, {
      statusMessage: `Running command ${command}`,
      messages: [
        ...(task?.messages || []),
        {
          role: 'assistant',
          type: 'local_shell_call',
          data: data.message,
        },
      ],
    })
  }

  handleShellOutput = (data: UpdateData): void => {
    if (!isShellOutputMessage(data.message)) {
      return
    }

    const task = this.deps.getTaskById(data.taskId)

    this.deps.updateTask(data.taskId, {
      messages: [
        ...(task?.messages || []),
        {
          role: 'assistant',
          type: 'local_shell_call_output',
          data: data.message,
        },
      ],
    })
  }

  handleAssistantMessage = (data: UpdateData): void => {
    if (!(isCompletedAssistantMessage(data.message) && hasMessageContent(data.message))) {
      return
    }

    const task = this.deps.getTaskById(data.taskId)
    const content = data.message.content[0]

    this.deps.updateTask(data.taskId, {
      messages: [
        ...(task?.messages || []),
        {
          role: 'assistant',
          type: 'message',
          data: content,
        },
      ],
    })
  }

  handleUpdateMessage = (data: UpdateData): void => {
    const messageType = data.message.type

    switch (messageType) {
      case 'git':
        this.handleGitMessage(data)
        break
      case 'local_shell_call':
        this.handleShellCall(data)
        break
      case 'local_shell_call_output':
        this.handleShellOutput(data)
        break
      case 'message':
        if (isCompletedAssistantMessage(data.message)) {
          this.handleAssistantMessage(data)
        }
        break
      default:
        // Unknown message type - silently ignore
        break
    }
  }
}
