import { afterEach, beforeEach, describe, expect, it, mock, spyOn, test } from 'bun:test'
import { VibeKit } from '@vibe-kit/sdk'
import { cookies } from 'next/headers'
import { createPullRequestAction } from '@/app/actions/vibekit'
import { getTelemetryConfig } from '@/lib/telemetry'
import type { Task } from '@/stores/tasks'

// Mock dependencies
mock('next/headers', () => ({
  cookies: mock(() => Promise.resolve({
    get: mock(),
  })),
}))

mock('@vibe-kit/sdk', () => ({
  VibeKit: mock(),
}))

mock('@/lib/telemetry', () => ({
  getTelemetryConfig: mock(),
}))

describe('vibekit actions', () => {
  const mockCookies = {
    get: mock(),
  }

  const mockVibeKitInstance = {
    createPullRequest: mock(),
  }

  const mockTask: Task = {
    id: 'task-123',
    title: 'Test Task',
    description: '',
    messages: [],
    repository: 'user/repo',
    sessionId: 'session-456',
    status: 'IN_PROGRESS',
    branch: 'main',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isArchived: false,
    mode: 'code',
    hasChanges: false,
  }

  beforeEach(() => {
    mock.restore()
    ;(cookies as any).mockResolvedValue(mockCookies as any)
    ;(VibeKit as any).mockImplementation(() => mockVibeKitInstance as any)
    process.env.OPENAI_API_KEY = 'test-openai-key'
    process.env.E2B_API_KEY = 'test-e2b-key'
  })

  describe('createPullRequestAction', () => {
    it('should create pull request successfully', async () => {
      const mockPR = {
        number: 42,
        html_url: 'https://github.com/user/repo/pull/42',
        title: 'Feature implementation',
      }

      mockCookies.get.mockReturnValue({ value: 'github-token-123' })
      ;(getTelemetryConfig as any).mockReturnValue({ isEnabled: false })
      mockVibeKitInstance.createPullRequest.mockResolvedValue(mockPR)

      const result = await createPullRequestAction({ task: mockTask })

      expect(cookies).toHaveBeenCalled()
      expect(mockCookies.get).toHaveBeenCalledWith('github_access_token')

      expect(VibeKit).toHaveBeenCalledWith({
        agent: {
          type: 'codex',
          model: {
            apiKey: 'test-openai-key',
          },
        },
        environment: {
          e2b: {
            apiKey: 'test-e2b-key',
          },
        },
        github: {
          token: 'github-token-123',
          repository: 'user/repo',
        },
        sessionId: 'session-456',
        telemetry: undefined,
      })

      expect(mockVibeKitInstance.createPullRequest).toHaveBeenCalled()
      expect(result).toEqual(mockPR)
    })

    it('should include telemetry config when enabled', async () => {
      const telemetryConfig = {
        isEnabled: true,
        endpoint: 'http://localhost:4317',
        serviceName: 'test-service',
        serviceVersion: '1.0.0',
      }

      mockCookies.get.mockReturnValue({ value: 'github-token-123' })
      ;(getTelemetryConfig as any).mockReturnValue(telemetryConfig)
      mockVibeKitInstance.createPullRequest.mockResolvedValue({})

      await createPullRequestAction({ task: mockTask })

      expect(VibeKit).toHaveBeenCalledWith(
        expect.objectContaining({
          telemetry: telemetryConfig,
        })
      )
    })

    it('should throw error when no GitHub token is found', async () => {
      mockCookies.get.mockReturnValue(undefined)

      await expect(createPullRequestAction({ task: mockTask })).rejects.toThrow(
        'No GitHub token found. Please authenticate first.'
      )

      expect(VibeKit).not.toHaveBeenCalled()
      expect(mockVibeKitInstance.createPullRequest).not.toHaveBeenCalled()
    })

    it('should handle empty GitHub token', async () => {
      mockCookies.get.mockReturnValue({ value: '' })

      await expect(createPullRequestAction({ task: mockTask })).rejects.toThrow(
        'No GitHub token found. Please authenticate first.'
      )
    })

    it('should pass task repository to VibeKit config', async () => {
      const customTask = {
        ...mockTask,
        repository: 'custom/repository',
      }

      mockCookies.get.mockReturnValue({ value: 'github-token' })
      ;(getTelemetryConfig as any).mockReturnValue({ isEnabled: false })
      mockVibeKitInstance.createPullRequest.mockResolvedValue({})

      await createPullRequestAction({ task: customTask })

      expect(VibeKit).toHaveBeenCalledWith(
        expect.objectContaining({
          github: expect.objectContaining({
            repository: 'custom/repository',
          }),
        })
      )
    })

    it('should pass task sessionId to VibeKit config', async () => {
      const customTask = {
        ...mockTask,
        sessionId: 'custom-session-id',
      }

      mockCookies.get.mockReturnValue({ value: 'github-token' })
      ;(getTelemetryConfig as any).mockReturnValue({ isEnabled: false })
      mockVibeKitInstance.createPullRequest.mockResolvedValue({})

      await createPullRequestAction({ task: customTask })

      expect(VibeKit).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionId: 'custom-session-id',
        })
      )
    })

    it('should handle VibeKit createPullRequest error', async () => {
      const error = new Error('Failed to create PR')

      mockCookies.get.mockReturnValue({ value: 'github-token' })
      ;(getTelemetryConfig as any).mockReturnValue({ isEnabled: false })
      mockVibeKitInstance.createPullRequest.mockRejectedValue(error)

      await expect(createPullRequestAction({ task: mockTask })).rejects.toThrow(
        'Failed to create PR'
      )
    })

    it('should use environment variables for API keys', async () => {
      process.env.OPENAI_API_KEY = 'custom-openai-key'
      process.env.E2B_API_KEY = 'custom-e2b-key'

      mockCookies.get.mockReturnValue({ value: 'github-token' })
      ;(getTelemetryConfig as any).mockReturnValue({ isEnabled: false })
      mockVibeKitInstance.createPullRequest.mockResolvedValue({})

      await createPullRequestAction({ task: mockTask })

      expect(VibeKit).toHaveBeenCalledWith(
        expect.objectContaining({
          agent: {
            type: 'codex',
            model: {
              apiKey: 'custom-openai-key',
            },
          },
          environment: {
            e2b: {
              apiKey: 'custom-e2b-key',
            },
          },
        })
      )
    })

    it('should handle task without sessionId', async () => {
      const taskWithoutSession = {
        ...mockTask,
        sessionId: undefined as any,
      }

      mockCookies.get.mockReturnValue({ value: 'github-token' })
      ;(getTelemetryConfig as any).mockReturnValue({ isEnabled: false })
      mockVibeKitInstance.createPullRequest.mockResolvedValue({})

      await createPullRequestAction({ task: taskWithoutSession })

      expect(VibeKit).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionId: undefined,
        })
      )
    })
  })
})
