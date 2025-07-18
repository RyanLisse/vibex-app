import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { cookies } from 'next/headers'
import {
  createTaskAction,
  createPullRequestAction,
  pauseTaskAction,
  resumeTaskAction,
  cancelTaskAction,
  fetchRealtimeSubscriptionToken,
} from './inngest'
import { inngest } from '@/lib/inngest'
import { getSubscriptionToken } from '@inngest/realtime'
import type { Task } from '@/stores/tasks'

// Mock dependencies
vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}))

vi.mock('@/lib/inngest', () => ({
  inngest: {
    send: vi.fn(),
  },
  getInngestApp: vi.fn(),
  taskChannel: vi.fn(() => ({})),
}))

vi.mock('@inngest/realtime', () => ({
  getSubscriptionToken: vi.fn(),
}))

vi.mock('@/lib/telemetry', () => ({
  getTelemetryConfig: vi.fn(() => ({ isEnabled: false })),
}))

describe('Inngest Actions', () => {
  const mockCookies = {
    get: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(cookies).mockResolvedValue(mockCookies as any)
  })

  afterEach(() => {
    vi.resetModules()
  })

  describe('createTaskAction', () => {
    const mockTask: Task = {
      id: 'test-task-123',
      title: 'Test Task',
      status: 'pending',
      created_at: new Date(),
      updated_at: new Date(),
    }

    it('should create a task successfully with GitHub token', async () => {
      mockCookies.get.mockReturnValue({ value: 'github-token-123' })

      await createTaskAction({
        task: mockTask,
        sessionId: 'session-123',
        prompt: 'Test prompt',
      })

      expect(inngest.send).toHaveBeenCalledWith({
        name: 'clonedex/create.task',
        data: {
          task: mockTask,
          token: 'github-token-123',
          sessionId: 'session-123',
          prompt: 'Test prompt',
          telemetryConfig: undefined,
        },
      })
    })

    it('should throw error when GitHub token is missing', async () => {
      mockCookies.get.mockReturnValue(undefined)

      await expect(
        createTaskAction({
          task: mockTask,
          sessionId: 'session-123',
        })
      ).rejects.toThrow('No GitHub token found. Please authenticate first.')
    })

    it('should include telemetry config when enabled', async () => {
      mockCookies.get.mockReturnValue({ value: 'github-token-123' })
      const mockGetTelemetryConfig = vi.fn(() => ({
        isEnabled: true,
        endpoint: 'http://telemetry.example.com',
      }))
      vi.doMock('@/lib/telemetry', () => ({
        getTelemetryConfig: mockGetTelemetryConfig,
      }))

      await createTaskAction({ task: mockTask })

      expect(inngest.send).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            telemetryConfig: {
              isEnabled: true,
              endpoint: 'http://telemetry.example.com',
            },
          }),
        })
      )
    })
  })

  describe('createPullRequestAction', () => {
    it('should create a pull request successfully', async () => {
      mockCookies.get.mockReturnValue({ value: 'github-token-456' })

      await createPullRequestAction({ sessionId: 'session-456' })

      expect(inngest.send).toHaveBeenCalledWith({
        name: 'clonedex/create.pull-request',
        data: {
          token: 'github-token-456',
          sessionId: 'session-456',
          telemetryConfig: undefined,
        },
      })
    })

    it('should throw error when GitHub token is missing', async () => {
      mockCookies.get.mockReturnValue(undefined)

      await expect(createPullRequestAction({})).rejects.toThrow(
        'No GitHub token found. Please authenticate first.'
      )
    })
  })

  describe('Task Control Actions', () => {
    it('should pause a task', async () => {
      await pauseTaskAction('task-789')

      expect(inngest.send).toHaveBeenCalledWith({
        name: 'clonedx/task.control',
        data: {
          taskId: 'task-789',
          action: 'pause',
        },
      })
    })

    it('should resume a task', async () => {
      await resumeTaskAction('task-789')

      expect(inngest.send).toHaveBeenCalledWith({
        name: 'clonedx/task.control',
        data: {
          taskId: 'task-789',
          action: 'resume',
        },
      })
    })

    it('should cancel a task', async () => {
      await cancelTaskAction('task-789')

      expect(inngest.send).toHaveBeenCalledWith({
        name: 'clonedx/task.control',
        data: {
          taskId: 'task-789',
          action: 'cancel',
        },
      })
    })
  })

  describe('fetchRealtimeSubscriptionToken', () => {
    const originalEnv = process.env

    beforeEach(() => {
      process.env = { ...originalEnv }
    })

    afterEach(() => {
      process.env = originalEnv
    })

    it('should return null when Inngest is not configured', async () => {
      process.env.NODE_ENV = 'production'
      process.env.INNGEST_DEV = '0'
      process.env.INNGEST_SIGNING_KEY = undefined
      process.env.INNGEST_EVENT_KEY = undefined

      const token = await fetchRealtimeSubscriptionToken()

      expect(token).toBeNull()
      expect(getSubscriptionToken).not.toHaveBeenCalled()
    })

    it('should return token in development mode', async () => {
      process.env.NODE_ENV = 'development'
      const mockToken = { token: 'dev-token-123' }
      vi.mocked(getSubscriptionToken).mockResolvedValue(mockToken)

      const token = await fetchRealtimeSubscriptionToken()

      expect(token).toBe(mockToken)
      expect(getSubscriptionToken).toHaveBeenCalled()
    })

    it('should return token when INNGEST_DEV is set', async () => {
      process.env.NODE_ENV = 'production'
      process.env.INNGEST_DEV = '1'
      const mockToken = { token: 'dev-token-456' }
      vi.mocked(getSubscriptionToken).mockResolvedValue(mockToken)

      const token = await fetchRealtimeSubscriptionToken()

      expect(token).toBe(mockToken)
    })

    it('should validate signing key format', async () => {
      process.env.NODE_ENV = 'production'
      process.env.INNGEST_SIGNING_KEY = 'invalid-key'
      process.env.INNGEST_EVENT_KEY = '12345678901234567890123456789012345678901234567890'

      const token = await fetchRealtimeSubscriptionToken()

      expect(token).toBeNull()
    })

    it('should validate event key length', async () => {
      process.env.NODE_ENV = 'production'
      process.env.INNGEST_SIGNING_KEY = 'signkey-valid'
      process.env.INNGEST_EVENT_KEY = 'short-key'

      const token = await fetchRealtimeSubscriptionToken()

      expect(token).toBeNull()
    })

    it('should handle getSubscriptionToken errors', async () => {
      process.env.NODE_ENV = 'development'
      vi.mocked(getSubscriptionToken).mockRejectedValue(new Error('Network error'))

      const token = await fetchRealtimeSubscriptionToken()

      expect(token).toBeNull()
    })

    it('should handle authentication errors', async () => {
      process.env.NODE_ENV = 'development'
      vi.mocked(getSubscriptionToken).mockRejectedValue(new Error('401 Unauthorized'))

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const token = await fetchRealtimeSubscriptionToken()

      expect(token).toBeNull()
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('authentication failed')
      )
      consoleSpy.mockRestore()
    })

    it('should handle invalid token format', async () => {
      process.env.NODE_ENV = 'development'
      vi.mocked(getSubscriptionToken).mockResolvedValue(null as any)

      const token = await fetchRealtimeSubscriptionToken()

      expect(token).toBeNull()
    })

    it('should handle token as string', async () => {
      process.env.NODE_ENV = 'development'
      const mockToken = 'string-token-123'
      vi.mocked(getSubscriptionToken).mockResolvedValue(mockToken as any)

      const token = await fetchRealtimeSubscriptionToken()

      expect(token).toBe(mockToken)
    })
  })
})