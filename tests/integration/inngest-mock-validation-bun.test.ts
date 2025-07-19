import { beforeEach, describe, expect, it, mock } from 'bun:test'

// Mock the inngest modules
mock.module('@/lib/inngest-factory', () => ({
  createInngestClient: mock(() => ({
    id: 'clonedex',
    send: mock(() => Promise.resolve({ ids: ['test-id'] })),
  })),
  createTaskChannel: mock(() => {
    const channel = mock()
    channel.status = mock()
    channel.update = mock()
    channel.control = mock()
    return channel
  }),
  createInngestFunctions: mock(() => ({
    taskControl: {
      id: 'task-control',
      trigger: { event: 'clonedx/task.control' },
      handler: mock(() => Promise.resolve({ success: true })),
    },
    createTask: {
      id: 'create-task',
      trigger: { event: 'clonedx/create.task' },
      handler: mock(() => Promise.resolve({ message: 'Task created' })),
    },
  })),
}))

mock.module('@/lib/inngest-instance', () => {
  const mockInngest = {
    id: 'clonedex',
    send: mock(() => Promise.resolve({ ids: ['test-id'] })),
  }

  const mockTaskChannel = mock()
  mockTaskChannel.status = mock()
  mockTaskChannel.update = mock()
  mockTaskChannel.control = mock()

  return {
    inngest: mockInngest,
    taskChannel: mockTaskChannel,
    taskControl: {
      id: 'task-control',
      trigger: { event: 'clonedx/task.control' },
      handler: mock(() => Promise.resolve({ success: true })),
    },
    createTask: {
      id: 'create-task',
      trigger: { event: 'clonedx/create.task' },
      handler: mock(() => Promise.resolve({ message: 'Task created' })),
    },
    getInngest: mock(() => mockInngest),
    getTaskChannel: mock(() => mockTaskChannel),
    getInngestFunctions: mock(() => ({
      taskControl: {
        id: 'task-control',
        trigger: { event: 'clonedx/task.control' },
        handler: mock(() => Promise.resolve({ success: true })),
      },
      createTask: {
        id: 'create-task',
        trigger: { event: 'clonedx/create.task' },
        handler: mock(() => Promise.resolve({ message: 'Task created' })),
      },
    })),
  }
})

mock.module('@/lib/inngest', () => {
  const mockInngest = {
    id: 'clonedex',
    send: mock(() => Promise.resolve({ ids: ['test-id'] })),
  }

  const mockTaskChannel = mock()
  mockTaskChannel.status = mock()
  mockTaskChannel.update = mock()
  mockTaskChannel.control = mock()

  return {
    inngest: mockInngest,
    taskChannel: mockTaskChannel,
    taskControl: {
      id: 'task-control',
      trigger: { event: 'clonedx/task.control' },
      handler: mock(() => Promise.resolve({ success: true })),
    },
    createTask: {
      id: 'create-task',
      trigger: { event: 'clonedx/create.task' },
      handler: mock(() => Promise.resolve({ message: 'Task created' })),
    },
    getInngestApp: mock(() => ({
      id: typeof global !== 'undefined' && global.window ? 'client' : 'server',
      send: mock(() => Promise.resolve({ ids: ['test-id'] })),
    })),
  }
})

describe('inngest mock validation (Bun)', () => {
  beforeEach(() => {
    mock.restore()
  })

  describe('factory module mocks', () => {
    it('should have mocked createInngestClient', async () => {
      const { createInngestClient } = await import('@/lib/inngest-factory')
      expect(createInngestClient).toBeDefined()

      const client = createInngestClient()
      expect(client).toBeDefined()
      expect(client.id).toBe('clonedex')
    })

    it('should have mocked createTaskChannel', async () => {
      const { createTaskChannel } = await import('@/lib/inngest-factory')
      expect(createTaskChannel).toBeDefined()

      const channel = createTaskChannel()
      expect(channel).toBeDefined()
      expect(channel.status).toBeDefined()
      expect(channel.update).toBeDefined()
      expect(channel.control).toBeDefined()
    })

    it('should have mocked createInngestFunctions', async () => {
      const { createInngestFunctions } = await import('@/lib/inngest-factory')
      expect(createInngestFunctions).toBeDefined()

      const functions = createInngestFunctions({} as any)
      expect(functions.taskControl).toBeDefined()
      expect(functions.createTask).toBeDefined()
    })
  })

  describe('instance module mocks', () => {
    it('should have mocked inngest instance', async () => {
      const { inngest } = await import('@/lib/inngest-instance')
      expect(inngest).toBeDefined()
      expect(inngest.id).toBe('clonedex')
    })

    it('should have mocked taskChannel', async () => {
      const { taskChannel } = await import('@/lib/inngest-instance')
      expect(taskChannel).toBeDefined()

      // The taskChannel should be a function that returns an object with methods
      // In this case, since it's mocked, we'll just verify it exists and is callable
      expect(typeof taskChannel).toBe('function')
    })

    it('should have mocked task functions', async () => {
      const { taskControl, createTask } = await import('@/lib/inngest-instance')

      expect(taskControl).toBeDefined()
      expect(taskControl.id).toBe('task-control')
      expect(taskControl.trigger).toEqual({ event: 'clonedx/task.control' })

      expect(createTask).toBeDefined()
      expect(createTask.id).toBe('create-task')
      expect(createTask.trigger).toEqual({ event: 'clonedx/create.task' })
    })

    it('should have mocked getters', async () => {
      const { getInngest, getTaskChannel, getInngestFunctions } = await import(
        '@/lib/inngest-instance'
      )

      const inngest = getInngest()
      expect(inngest.id).toBe('clonedex')

      const channel = getTaskChannel()
      expect(channel).toBeDefined()

      const functions = getInngestFunctions()
      expect(functions.taskControl).toBeDefined()
      expect(functions.createTask).toBeDefined()
    })
  })

  describe('async operations', () => {
    it('should handle inngest.send without hanging', async () => {
      const { inngest } = await import('@/lib/inngest-instance')

      const result = await inngest.send({
        name: 'test.event',
        data: { test: true },
      })

      expect(result).toEqual({ ids: ['test-id'] })
    })

    it('should handle taskControl.handler without hanging', async () => {
      const { taskControl } = await import('@/lib/inngest-instance')

      const result = await taskControl.handler()
      expect(result).toEqual({ success: true })
    })

    it('should handle createTask.handler without hanging', async () => {
      const { createTask } = await import('@/lib/inngest-instance')

      const result = await createTask.handler()
      expect(result).toEqual({ message: 'Task created' })
    })
  })

  describe('main module exports', () => {
    it('should have all exports from main inngest module', async () => {
      const { inngest, taskChannel, taskControl, createTask, getInngestApp } = await import(
        '@/lib/inngest'
      )

      expect(inngest).toBeDefined()
      expect(taskChannel).toBeDefined()
      expect(taskControl).toBeDefined()
      expect(createTask).toBeDefined()
      expect(getInngestApp).toBeDefined()
    })

    it('should handle getInngestApp correctly', async () => {
      const { getInngestApp } = await import('@/lib/inngest')

      // Test server environment (default)
      const serverApp = getInngestApp()
      expect(serverApp).toBeDefined()
      expect(serverApp.id).toBe('server')
    })
  })
})
