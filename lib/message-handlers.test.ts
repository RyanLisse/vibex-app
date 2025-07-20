import { afterEach, beforeEach, describe, expect, it, spyOn, test, vi } from 'vitest'
import type { StatusData, UpdateData } from './container-types'
import { MessageHandlers } from './message-handlers'

describe('MessageHandlers', () => {
  let mockUpdateTask: ReturnType<typeof mock>
  let mockGetTaskById: ReturnType<typeof mock>
  let handlers: MessageHandlers

  beforeEach(() => {
    // Create fresh mock functions for each test
    mockUpdateTask = vi.fn()
    mockGetTaskById = vi.fn()

    handlers = new MessageHandlers({
      updateTask: mockUpdateTask,
      getTaskById: mockGetTaskById,
    })
  })

  describe('handleStatusUpdate', () => {
    it('should update task status', () => {
      const statusData: StatusData = {
        taskId: 'task-123',
        status: 'IN_PROGRESS',
        sessionId: 'session-456',
      }

      handlers.handleStatusUpdate(statusData)

      expect(mockUpdateTask).toHaveBeenCalledWith('task-123', {
        status: 'IN_PROGRESS',
        hasChanges: true,
        sessionId: 'session-456',
      })
    })
  })

  describe('handleGitMessage', () => {
    it('should handle git messages', () => {
      const updateData: UpdateData = {
        taskId: 'task-123',
        message: {
          type: 'git',
          output: 'Git operation completed',
        },
      }

      handlers.handleGitMessage(updateData)

      expect(mockUpdateTask).toHaveBeenCalledWith('task-123', {
        statusMessage: 'Git operation completed',
      })
    })

    it('should ignore non-git messages', () => {
      const updateData: UpdateData = {
        taskId: 'task-123',
        message: {
          type: 'other',
          output: 'Some output',
        },
      }

      handlers.handleGitMessage(updateData)

      expect(mockUpdateTask).not.toHaveBeenCalled()
    })
  })

  describe('handleShellCall', () => {
    it('should handle shell call messages', () => {
      const existingTask = {
        id: 'task-123',
        messages: [{ role: 'user', type: 'message', data: { text: 'existing' } }],
      }
      mockGetTaskById.mockReturnValue(existingTask)

      const updateData: UpdateData = {
        taskId: 'task-123',
        message: {
          type: 'local_shell_call',
          action: {
            command: ['npm', 'install'],
          },
        },
      }

      handlers.handleShellCall(updateData)

      expect(mockUpdateTask).toHaveBeenCalledWith('task-123', {
        statusMessage: 'Running command npm install',
        messages: [
          { role: 'user', type: 'message', data: { text: 'existing' } },
          {
            role: 'assistant',
            type: 'local_shell_call',
            data: updateData.message,
          },
        ],
      })
    })

    it('should handle tasks with no existing messages', () => {
      mockGetTaskById.mockReturnValue({ id: 'task-123', messages: undefined })

      const updateData: UpdateData = {
        taskId: 'task-123',
        message: {
          type: 'local_shell_call',
          action: {
            command: ['ls'],
          },
        },
      }

      handlers.handleShellCall(updateData)

      expect(mockUpdateTask).toHaveBeenCalledWith('task-123', {
        statusMessage: 'Running command ls',
        messages: [
          {
            role: 'assistant',
            type: 'local_shell_call',
            data: updateData.message,
          },
        ],
      })
    })
  })

  describe('handleShellOutput', () => {
    it('should handle shell output messages', () => {
      const existingTask = {
        id: 'task-123',
        messages: [{ role: 'user', type: 'message', data: { text: 'existing' } }],
      }
      mockGetTaskById.mockReturnValue(existingTask)

      const updateData: UpdateData = {
        taskId: 'task-123',
        message: {
          type: 'local_shell_call_output',
          output: 'Command completed successfully',
        },
      }

      handlers.handleShellOutput(updateData)

      expect(mockUpdateTask).toHaveBeenCalledWith('task-123', {
        messages: [
          { role: 'user', type: 'message', data: { text: 'existing' } },
          {
            role: 'assistant',
            type: 'local_shell_call_output',
            data: updateData.message,
          },
        ],
      })
    })
  })

  describe('handleAssistantMessage', () => {
    it('should handle completed assistant messages', () => {
      const existingTask = {
        id: 'task-123',
        messages: [{ role: 'user', type: 'message', data: { text: 'existing' } }],
      }
      mockGetTaskById.mockReturnValue(existingTask)

      const updateData: UpdateData = {
        taskId: 'task-123',
        message: {
          type: 'message',
          status: 'completed',
          role: 'assistant',
          content: [{ text: 'Assistant response' }],
        },
      }

      handlers.handleAssistantMessage(updateData)

      expect(mockUpdateTask).toHaveBeenCalledWith('task-123', {
        messages: [
          { role: 'user', type: 'message', data: { text: 'existing' } },
          {
            role: 'assistant',
            type: 'message',
            data: { text: 'Assistant response' },
          },
        ],
      })
    })

    it('should ignore incomplete assistant messages', () => {
      const updateData: UpdateData = {
        taskId: 'task-123',
        message: {
          type: 'message',
          status: 'incomplete',
          role: 'assistant',
        },
      }

      handlers.handleAssistantMessage(updateData)

      expect(mockUpdateTask).not.toHaveBeenCalled()
    })
  })

  describe('handleUpdateMessage', () => {
    it('should route to correct handler based on message type', () => {
      const gitData: UpdateData = {
        taskId: 'task-123',
        message: { type: 'git', output: 'test' },
      }

      const shellData: UpdateData = {
        taskId: 'task-123',
        message: { type: 'local_shell_call', action: { command: ['ls'] } },
      }

      handlers.handleUpdateMessage(gitData)
      handlers.handleUpdateMessage(shellData)

      expect(mockUpdateTask).toHaveBeenCalledTimes(2)
    })

    it('should ignore unknown message types', () => {
      const unknownData: UpdateData = {
        taskId: 'task-123',
        message: { type: 'unknown-type' },
      }

      handlers.handleUpdateMessage(unknownData)

      expect(mockUpdateTask).not.toHaveBeenCalled()
    })
  })
})
