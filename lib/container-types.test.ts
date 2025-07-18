import { afterEach, beforeEach, describe, expect, it, mock, spyOn, test } from 'bun:test'
import {
  hasMessageContent,
  hasShellAction,
  isCompletedAssistantMessage,
  isGitMessage,
  isShellCallMessage,
  isShellOutputMessage,
  isStatusData,
  isStatusTopic,
  isTasksChannel,
  isUpdateData,
  isUpdateTopic,
  type LatestData,
  type StatusData,
  type UpdateData,
} from './container-types'

describe('Container Types', () => {
  describe('Type Guards', () => {
    it('should identify StatusData correctly', () => {
      const statusData: StatusData = {
        taskId: 'task-123',
        status: 'IN_PROGRESS',
        sessionId: 'session-456',
      }

      const updateData: UpdateData = {
        taskId: 'task-123',
        message: { type: 'git', output: 'test' },
      }

      expect(isStatusData(statusData)).toBe(true)
      expect(isStatusData(updateData)).toBe(false)
    })

    it('should identify UpdateData correctly', () => {
      const statusData: StatusData = {
        taskId: 'task-123',
        status: 'IN_PROGRESS',
        sessionId: 'session-456',
      }

      const updateData: UpdateData = {
        taskId: 'task-123',
        message: { type: 'git', output: 'test' },
      }

      expect(isUpdateData(updateData)).toBe(true)
      expect(isUpdateData(statusData)).toBe(false)
    })

    it('should identify tasks channel correctly', () => {
      const tasksData: LatestData = {
        channel: 'tasks',
        topic: 'status',
        data: { taskId: 'task-123', status: 'IN_PROGRESS', sessionId: 'session-456' },
      }

      const otherData: LatestData = {
        channel: 'other',
        topic: 'status',
        data: { taskId: 'task-123', status: 'IN_PROGRESS', sessionId: 'session-456' },
      }

      expect(isTasksChannel(tasksData)).toBe(true)
      expect(isTasksChannel(otherData)).toBe(false)
    })

    it('should identify status topic correctly', () => {
      const statusData: LatestData = {
        channel: 'tasks',
        topic: 'status',
        data: { taskId: 'task-123', status: 'IN_PROGRESS', sessionId: 'session-456' },
      }

      const updateData: LatestData = {
        channel: 'tasks',
        topic: 'update',
        data: { taskId: 'task-123', message: { type: 'git' } },
      }

      expect(isStatusTopic(statusData)).toBe(true)
      expect(isStatusTopic(updateData)).toBe(false)
    })

    it('should identify update topic correctly', () => {
      const statusData: LatestData = {
        channel: 'tasks',
        topic: 'status',
        data: { taskId: 'task-123', status: 'IN_PROGRESS', sessionId: 'session-456' },
      }

      const updateData: LatestData = {
        channel: 'tasks',
        topic: 'update',
        data: { taskId: 'task-123', message: { type: 'git' } },
      }

      expect(isUpdateTopic(updateData)).toBe(true)
      expect(isUpdateTopic(statusData)).toBe(false)
    })

    it('should identify git messages correctly', () => {
      const gitMessage = { type: 'git', output: 'test' }
      const shellMessage = { type: 'local_shell_call', action: { command: ['ls'] } }

      expect(isGitMessage(gitMessage)).toBe(true)
      expect(isGitMessage(shellMessage)).toBe(false)
    })

    it('should identify shell call messages correctly', () => {
      const shellMessage = { type: 'local_shell_call', action: { command: ['ls'] } }
      const gitMessage = { type: 'git', output: 'test' }

      expect(isShellCallMessage(shellMessage)).toBe(true)
      expect(isShellCallMessage(gitMessage)).toBe(false)
    })

    it('should identify shell output messages correctly', () => {
      const shellOutputMessage = { type: 'local_shell_call_output', output: 'test' }
      const gitMessage = { type: 'git', output: 'test' }

      expect(isShellOutputMessage(shellOutputMessage)).toBe(true)
      expect(isShellOutputMessage(gitMessage)).toBe(false)
    })

    it('should identify completed assistant messages correctly', () => {
      const completedMessage = {
        type: 'message',
        status: 'completed',
        role: 'assistant',
        content: [{ text: 'response' }],
      }

      const incompleteMessage = {
        type: 'message',
        status: 'incomplete',
        role: 'assistant',
      }

      const userMessage = {
        type: 'message',
        status: 'completed',
        role: 'user',
      }

      expect(isCompletedAssistantMessage(completedMessage)).toBe(true)
      expect(isCompletedAssistantMessage(incompleteMessage)).toBe(false)
      expect(isCompletedAssistantMessage(userMessage)).toBe(false)
    })

    it('should identify messages with shell actions correctly', () => {
      const messageWithAction = {
        type: 'local_shell_call',
        action: { command: ['ls'] },
      }

      const messageWithoutAction = {
        type: 'local_shell_call',
      }

      expect(hasShellAction(messageWithAction)).toBe(true)
      expect(hasShellAction(messageWithoutAction)).toBe(false)
    })

    it('should identify messages with content correctly', () => {
      const messageWithContent = {
        type: 'message',
        content: [{ text: 'response' }],
      }

      const messageWithoutContent = {
        type: 'message',
      }

      expect(hasMessageContent(messageWithContent)).toBe(true)
      expect(hasMessageContent(messageWithoutContent)).toBe(false)
    })
  })
})
