import { describe, expect, it, vi, beforeEach } from 'vitest'

// Mock the inngest modules before imports
vi.mock('@/lib/inngest-factory', () => ({
  createInngestClient: vi.fn(() => ({
    id: 'clonedex',
    send: vi.fn().mockResolvedValue({ ids: ['test-id'] }),
  })),
  createTaskChannel: vi.fn(() => {
    const channel = vi.fn()
    channel.status = vi.fn()
    channel.update = vi.fn()
    channel.control = vi.fn()
    return channel
  }),
  createInngestFunctions: vi.fn(() => ({
    taskControl: {
      id: 'task-control',
      trigger: { event: 'clonedx/task.control' },
      handler: vi.fn().mockResolvedValue({ success: true }),
    },
    createTask: {
      id: 'create-task',
      trigger: { event: 'clonedx/create.task' },
      handler: vi.fn().mockResolvedValue({ message: 'Task created' }),
    },
  })),
}))

vi.mock('@/lib/inngest-instance', () => {
  const mockInngest = {
    id: 'clonedex',
    send: vi.fn().mockResolvedValue({ ids: ['test-id'] }),
  }

  const mockTaskChannel = vi.fn()
  mockTaskChannel.status = vi.fn()
  mockTaskChannel.update = vi.fn()
  mockTaskChannel.control = vi.fn()

  return {
    inngest: mockInngest,
    taskChannel: mockTaskChannel,
    taskControl: {
      id: 'task-control',
      trigger: { event: 'clonedx/task.control' },
      handler: vi.fn().mockResolvedValue({ success: true }),
    },
    createTask: {
      id: 'create-task',
      trigger: { event: 'clonedx/create.task' },
      handler: vi.fn().mockResolvedValue({ message: 'Task created' }),
    },
    getInngest: vi.fn(() => mockInngest),
    getTaskChannel: vi.fn(() => mockTaskChannel),
    getInngestFunctions: vi.fn(() => ({
      taskControl: {
        id: 'task-control',
        trigger: { event: 'clonedx/task.control' },
        handler: vi.fn().mockResolvedValue({ success: true }),
      },
      createTask: {
        id: 'create-task',
        trigger: { event: 'clonedx/create.task' },
        handler: vi.fn().mockResolvedValue({ message: 'Task created' }),
      },
    })),
  }
})

vi.mock('@/lib/inngest', () => {
  const mockInngest = {
    id: 'clonedex',
    send: vi.fn().mockResolvedValue({ ids: ['test-id'] }),
  }

  const mockTaskChannel = vi.fn()
  mockTaskChannel.status = vi.fn()
  mockTaskChannel.update = vi.fn()
  mockTaskChannel.control = vi.fn()

  return {
    inngest: mockInngest,
    taskChannel: mockTaskChannel,
    taskControl: {
      id: 'task-control',
      trigger: { event: 'clonedx/task.control' },
      handler: vi.fn().mockResolvedValue({ success: true }),
    },
    createTask: {
      id: 'create-task',
      trigger: { event: 'clonedx/create.task' },
      handler: vi.fn().mockResolvedValue({ message: 'Task created' }),
    },
    getInngestApp: vi.fn(() => ({
      id: typeof window !== 'undefined' ? 'client' : 'server',
      send: vi.fn().mockResolvedValue({ ids: ['test-id'] }),
    })),
  }
})

// Import modules after mocks are set up
import * as inngestModule from '@/lib/inngest'
import * as inngestFactoryModule from '@/lib/inngest-factory'
import * as inngestInstanceModule from '@/lib/inngest-instance'

describe('inngest mock validation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('factory module mocks', () => {
    it('should have mocked createInngestClient', () => {
      const { createInngestClient } = inngestFactoryModule
      expect(createInngestClient).toBeDefined()
      expect(vi.isMockFunction(createInngestClient)).toBe(true)

      const client = createInngestClient()
      expect(client).toBeDefined()
      expect(client.id).toBe('clonedex')
      expect(vi.isMockFunction(client.send)).toBe(true)
    })

    it('should have mocked createTaskChannel', () => {
      const { createTaskChannel } = inngestFactoryModule
      expect(createTaskChannel).toBeDefined()
      expect(vi.isMockFunction(createTaskChannel)).toBe(true)

      const channel = createTaskChannel()
      expect(channel).toBeDefined()
      expect(typeof channel).toBe('function')
      expect(channel.status).toBeDefined()
      expect(channel.update).toBeDefined()
      expect(channel.control).toBeDefined()
    })

    it('should have mocked createInngestFunctions', () => {
      const { createInngestFunctions } = inngestFactoryModule
      expect(createInngestFunctions).toBeDefined()
      expect(vi.isMockFunction(createInngestFunctions)).toBe(true)

      const functions = createInngestFunctions({} as any)
      expect(functions.taskControl).toBeDefined()
      expect(functions.createTask).toBeDefined()
    })
  })

  describe('instance module mocks', () => {
    it('should have mocked inngest instance', () => {
      const { inngest } = inngestInstanceModule
      expect(inngest).toBeDefined()
      expect(inngest.id).toBe('clonedex')
      expect(vi.isMockFunction(inngest.send)).toBe(true)
    })

    it('should have mocked taskChannel', () => {
      const { taskChannel } = inngestInstanceModule
      expect(taskChannel).toBeDefined()
      expect(typeof taskChannel).toBe('function')

      // Call it as a function
      const channelInstance = taskChannel()
      expect(channelInstance.status).toBeDefined()
      expect(channelInstance.update).toBeDefined()
      expect(channelInstance.control).toBeDefined()
    })

    it('should have mocked task functions', () => {
      const { taskControl, createTask } = inngestInstanceModule

      expect(taskControl).toBeDefined()
      expect(taskControl.id).toBe('task-control')
      expect(taskControl.trigger).toEqual({ event: 'clonedx/task.control' })
      expect(vi.isMockFunction(taskControl.handler)).toBe(true)

      expect(createTask).toBeDefined()
      expect(createTask.id).toBe('create-task')
      expect(createTask.trigger).toEqual({ event: 'clonedx/create.task' })
      expect(vi.isMockFunction(createTask.handler)).toBe(true)
    })

    it('should have mocked getters', () => {
      const { getInngest, getTaskChannel, getInngestFunctions } = inngestInstanceModule

      expect(vi.isMockFunction(getInngest)).toBe(true)
      expect(vi.isMockFunction(getTaskChannel)).toBe(true)
      expect(vi.isMockFunction(getInngestFunctions)).toBe(true)

      const inngest = getInngest()
      expect(inngest.id).toBe('clonedex')

      const channel = getTaskChannel()
      expect(typeof channel).toBe('function')

      const functions = getInngestFunctions()
      expect(functions.taskControl).toBeDefined()
      expect(functions.createTask).toBeDefined()
    })
  })

  describe('async operations', () => {
    it('should handle inngest.send without hanging', async () => {
      const { inngest } = inngestInstanceModule

      const result = await inngest.send({
        name: 'test.event',
        data: { test: true },
      })

      expect(result).toEqual({ ids: ['test-id'] })
      expect(inngest.send).toHaveBeenCalledWith({
        name: 'test.event',
        data: { test: true },
      })
    })

    it('should handle taskControl.handler without hanging', async () => {
      const { taskControl } = inngestInstanceModule

      const result = await taskControl.handler()
      expect(result).toEqual({ success: true })
      expect(taskControl.handler).toHaveBeenCalled()
    })

    it('should handle createTask.handler without hanging', async () => {
      const { createTask } = inngestInstanceModule

      const result = await createTask.handler()
      expect(result).toEqual({ message: 'Task created' })
      expect(createTask.handler).toHaveBeenCalled()
    })
  })

  describe('streaming simulation', () => {
    it('should not use setTimeout in mocks', async () => {
      const setTimeoutSpy = vi.spyOn(global, 'setTimeout')

      // Run various mock operations
      const { inngest, taskControl, createTask } = inngestInstanceModule
      await inngest.send({ name: 'test', data: {} })
      await taskControl.handler()
      await createTask.handler()

      // Should not have called setTimeout
      expect(setTimeoutSpy).not.toHaveBeenCalled()

      setTimeoutSpy.mockRestore()
    })
  })

  describe('main module exports', () => {
    it('should have all exports from main inngest module', () => {
      const { inngest, taskChannel, taskControl, createTask, getInngestApp } = inngestModule

      expect(inngest).toBeDefined()
      expect(taskChannel).toBeDefined()
      expect(taskControl).toBeDefined()
      expect(createTask).toBeDefined()
      expect(getInngestApp).toBeDefined()
    })

    it('should handle getInngestApp correctly', () => {
      const { getInngestApp } = inngestModule

      // Test server environment (default)
      const serverApp = getInngestApp()
      expect(serverApp).toBeDefined()
      expect(serverApp.id).toBe('server')

      // Test client environment
      const originalWindow = global.window
      // @ts-expect-error - Mocking window for test
      global.window = {}

      const clientApp = getInngestApp()
      expect(clientApp.id).toBe('client')

      // Restore
      global.window = originalWindow
    })
  })
})
