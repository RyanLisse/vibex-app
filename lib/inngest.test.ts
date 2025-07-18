import { afterEach, beforeEach, describe, expect, it, mock, spyOn, test } from 'bun:test'
import { VibeKit } from '@vibe-kit/sdk'
import { Inngest } from 'inngest'

// Mock dependencies
mock('inngest', () => ({
  Inngest: mock().mockImplementation(() => ({
    createFunction: mock().mockImplementation((config, trigger, handler) => {
      return { config, trigger, handler }
    }),
  })),
}))

mock('@inngest/realtime', () => ({
  realtimeMiddleware: mock(() => ({ name: 'realtime' })),
  channel: mock((name) => ({
    addTopic: mock().mockReturnThis(),
    name,
  })),
  topic: mock((name) => ({
    type: mock(() => ({ name })),
  })),
}))

mock('@vibe-kit/sdk', () => ({
  VibeKit: mock().mockImplementation(() => ({
    setSession: mock(),
    generateCode: mock(),
    pause: mock(),
  })),
}))

describe('inngest', () => {
  beforeEach(() => {
    mock.restore()
    // Reset modules to ensure clean state
    mock.resetModules()
    // Reset environment variables
    process.env.INNGEST_EVENT_KEY = 'test-event-key'
    process.env.NODE_ENV = 'test'
    process.env.OPENAI_API_KEY = 'test-openai-key'
    process.env.E2B_API_KEY = 'test-e2b-key'
  })

  afterEach(() => {
    mock.restore()
  })

  describe('exports', () => {
    it('should export required functions and objects', async () => {
      const inngestModule = await import('@/lib/inngest')

      expect(inngestModule.inngest).toBeDefined()
      expect(inngestModule.taskChannel).toBeDefined()
      expect(inngestModule.createTask).toBeDefined()
      expect(inngestModule.taskControl).toBeDefined()
      expect(inngestModule.getInngestApp).toBeDefined()
    })
  })

  describe('inngest client', () => {
    it('should create client with correct configuration', async () => {
      const { inngest } = await import('@/lib/inngest')

      expect(Inngest).toHaveBeenCalledWith({
        id: 'clonedex',
        eventKey: 'test-event-key',
        middleware: expect.arrayContaining([{ name: 'realtime' }]),
        isDev: false,
      })
    })

    it('should enable dev mode in development', async () => {
      process.env.NODE_ENV = 'development'
      mock.resetModules()

      await import('@/lib/inngest')

      expect(Inngest).toHaveBeenCalledWith(
        expect.objectContaining({
          isDev: true,
        })
      )
    })

    it('should enable dev mode when INNGEST_DEV is set', async () => {
      process.env.INNGEST_DEV = '1'
      mock.resetModules()

      await import('@/lib/inngest')

      expect(Inngest).toHaveBeenCalledWith(
        expect.objectContaining({
          isDev: true,
        })
      )
    })
  })

  describe('taskChannel', () => {
    it('should create a channel with correct topics', async () => {
      const { channel, topic } = await import('@inngest/realtime')
      const { taskChannel } = await import('@/lib/inngest')

      expect(channel).toHaveBeenCalledWith('tasks')
      expect(topic).toHaveBeenCalledWith('status')
      expect(topic).toHaveBeenCalledWith('update')
      expect(topic).toHaveBeenCalledWith('control')
    })
  })

  describe('taskControl function', () => {
    it('should handle pause action', async () => {
      const { taskControl } = await import('@/lib/inngest')
      const mockPublish = mock()

      const handler = taskControl.handler
      const result = await handler({
        event: {
          data: {
            taskId: 'task-123',
            action: 'pause',
          },
        },
        publish: mockPublish,
      })

      expect(result).toEqual({
        success: true,
        action: 'pause',
        taskId: 'task-123',
      })

      expect(mockPublish).toHaveBeenCalled()
    })

    it('should handle resume action', async () => {
      const { taskControl } = await import('@/lib/inngest')
      const mockPublish = mock()

      const handler = taskControl.handler
      await handler({
        event: {
          data: {
            taskId: 'task-123',
            action: 'pause',
          },
        },
        publish: mockPublish,
      })

      const result = await handler({
        event: {
          data: {
            taskId: 'task-123',
            action: 'resume',
          },
        },
        publish: mockPublish,
      })

      expect(result).toEqual({
        success: true,
        action: 'resume',
        taskId: 'task-123',
      })
    })

    it('should handle cancel action', async () => {
      const { taskControl } = await import('@/lib/inngest')
      const mockPublish = mock()

      const handler = taskControl.handler
      const result = await handler({
        event: {
          data: {
            taskId: 'task-123',
            action: 'cancel',
          },
        },
        publish: mockPublish,
      })

      expect(result).toEqual({
        success: true,
        action: 'cancel',
        taskId: 'task-123',
      })
    })
  })

  describe('createTask function', () => {
    it('should create and execute a task successfully', async () => {
      const { createTask } = await import('@/lib/inngest')
      const mockPublish = mock()
      const mockStep = {
        run: mock().mockResolvedValue({
          stdout: `${JSON.stringify({ type: 'message', data: 'test' })}\n`,
          sandboxId: 'sandbox-123',
        }),
      }

      const handler = createTask.handler
      const result = await handler({
        event: {
          data: {
            task: {
              id: 'task-456',
              title: 'Test Task',
              repository: 'test/repo',
              mode: 'test',
            },
            token: 'github-token',
            sessionId: 'session-123',
            prompt: 'Test prompt',
          },
        },
        step: mockStep,
        publish: mockPublish,
      })

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
          token: 'github-token',
          repository: 'test/repo',
        },
      })

      expect(result).toEqual({
        message: [{ type: 'message', data: 'test' }],
      })

      expect(mockPublish).toHaveBeenCalled()
    })

    it('should handle task with callbacks', async () => {
      const { createTask } = await import('@/lib/inngest')
      const mockPublish = mock()
      let capturedCallback: any

      const mockStep = {
        run: mock().mockImplementation(async (_name, fn) => {
          // Mock VibeKit to capture the callbacks
          ;(VibeKit as any).mockImplementationOnce(() => ({
            setSession: mock(),
            generateCode: mock().mockImplementation(({ callbacks }) => {
              capturedCallback = callbacks
              return Promise.resolve({ result: 'success' })
            }),
            pause: mock(),
          }))

          const result = await fn()
          return result
        }),
      }

      const handler = createTask.handler
      await handler({
        event: {
          data: {
            task: {
              id: 'task-789',
              title: 'Test Task',
              repository: 'test/repo',
              mode: 'test',
            },
            token: 'github-token',
            sessionId: null,
            prompt: 'Test prompt',
          },
        },
        step: mockStep,
        publish: mockPublish,
      })

      // Test callback with JSON message
      capturedCallback.onUpdate(
        JSON.stringify({
          type: 'message',
          role: 'assistant',
          data: {
            text: 'This is a test message that should be streamed in chunks',
          },
        })
      )

      // Wait for all timeouts to complete
      await new Promise((resolve) => setTimeout(resolve, 300))

      // Should have been called multiple times for streaming
      expect(mockPublish.mock.calls.length).toBeGreaterThan(1)

      // Test callback with non-JSON message
      capturedCallback.onUpdate('Raw streaming output')

      expect(mockPublish).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({
            taskId: 'task-789',
            message: expect.objectContaining({
              type: 'message',
              role: 'assistant',
              data: expect.objectContaining({
                text: 'Raw streaming output',
                isStreaming: true,
                raw: true,
              }),
            }),
          }),
        })
      )
    })

    it('should handle task without sessionId', async () => {
      const mockSetSession = mock()
      ;(VibeKit as any).mockImplementationOnce(() => ({
        setSession: mockSetSession,
        generateCode: mock().mockResolvedValue({ result: 'success' }),
        pause: mock(),
      }))

      const { createTask } = await import('@/lib/inngest')
      const mockStep = {
        run: mock().mockImplementation(async (_name, fn) => fn()),
      }

      const handler = createTask.handler
      await handler({
        event: {
          data: {
            task: {
              id: 'task-no-session',
              title: 'Test Task',
              repository: 'test/repo',
              mode: 'test',
            },
            token: 'github-token',
            sessionId: null,
            prompt: 'Test prompt',
          },
        },
        step: mockStep,
        publish: mock(),
      })

      expect(mockSetSession).not.toHaveBeenCalled()
    })

    it('should handle non-stdout response', async () => {
      const { createTask } = await import('@/lib/inngest')
      const mockPublish = mock()
      const mockStep = {
        run: mock().mockResolvedValue({ result: 'direct result' }),
      }

      const handler = createTask.handler
      const result = await handler({
        event: {
          data: {
            task: {
              id: 'task-direct',
              title: 'Test Task',
              repository: 'test/repo',
              mode: 'test',
            },
            token: 'github-token',
            sessionId: null,
            prompt: 'Test prompt',
          },
        },
        step: mockStep,
        publish: mockPublish,
      })

      expect(result).toEqual({
        message: { result: 'direct result' },
      })
    })
  })

  describe('getInngestApp', () => {
    it('should create app instance with correct config', async () => {
      const { getInngestApp } = await import('@/lib/inngest')

      const app = getInngestApp()
      expect(app).toBeDefined()
      expect(Inngest).toHaveBeenCalledWith({
        id: 'server',
        middleware: expect.arrayContaining([{ name: 'realtime' }]),
      })
    })

    it('should return same instance on multiple calls', async () => {
      const { getInngestApp } = await import('@/lib/inngest')

      const app1 = getInngestApp()
      const app2 = getInngestApp()
      expect(app1).toBe(app2)
    })

    it('should use client id in browser environment', async () => {
      // Mock window object
      const originalWindow = global.window
      global.window = {} as any

      // Reset modules to pick up window change
      mock.resetModules()

      const { getInngestApp } = await import('@/lib/inngest')
      getInngestApp()

      expect(Inngest).toHaveBeenCalledWith({
        id: 'client',
        middleware: expect.arrayContaining([{ name: 'realtime' }]),
      })

      // Restore window
      global.window = originalWindow
    })
  })

  describe('chunkText generator', () => {
    it('should chunk text correctly', async () => {
      // This tests the internal chunkText function indirectly through createTask
      const { createTask } = await import('@/lib/inngest')
      const mockPublish = mock()
      let capturedCallback: any

      const mockStep = {
        run: mock().mockImplementation(async (_name, fn) => {
          ;(VibeKit as any).mockImplementationOnce(() => ({
            setSession: mock(),
            generateCode: mock().mockImplementation(({ callbacks }) => {
              capturedCallback = callbacks
              return Promise.resolve({ result: 'success' })
            }),
            pause: mock(),
          }))

          return await fn()
        }),
      }

      const handler = createTask.handler
      await handler({
        event: {
          data: {
            task: {
              id: 'task-chunk',
              title: 'Test Task',
              repository: 'test/repo',
              mode: 'test',
            },
            token: 'github-token',
            sessionId: null,
            prompt: 'Test prompt',
          },
        },
        step: mockStep,
        publish: mockPublish,
      })

      // Test with a short message that results in single chunk
      mockPublish.mockClear()
      capturedCallback.onUpdate(
        JSON.stringify({
          type: 'message',
          role: 'assistant',
          data: {
            text: 'Short message',
          },
        })
      )

      await new Promise((resolve) => setTimeout(resolve, 100))

      // Should have one publish call for the single chunk
      expect(mockPublish).toHaveBeenCalledTimes(1)
    })
  })
})
