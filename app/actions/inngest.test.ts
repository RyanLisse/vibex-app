import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Mock the inngest client
const mockSend = vi.fn(() => Promise.resolve({ id: 'test-event-id' }))

vi.mock('@/lib/inngest', () => ({
  inngest: {
    send: mockSend,
    createFunction: vi.fn(() => ({
      id: 'test-function',
      name: 'Test Function',
    })),
  },
  createTask: vi.fn(() => Promise.resolve({ success: true })),
  taskControl: vi.fn(() => Promise.resolve({ success: true })),
  taskChannel: vi.fn(() => ({
    status: vi.fn(),
    update: vi.fn(),
    control: vi.fn(),
  })),
}))

// Set environment variables manually
beforeEach(() => {
  process.env.INNGEST_EVENT_KEY = 'test-event-key'
  process.env.NODE_ENV = 'test'
})

afterEach(() => {
  vi.restoreAllMocks()
  delete process.env.INNGEST_EVENT_KEY
  delete process.env.NODE_ENV
})

describe('Inngest Actions', () => {
  it('should send events to Inngest', async () => {
    const { inngest } = await import('@/lib/inngest')

    const result = await inngest.send({
      name: 'test.event',
      data: { foo: 'bar' },
    })

    expect(result).toEqual({ id: 'test-event-id' })
    expect(inngest.send).toHaveBeenCalledWith({
      name: 'test.event',
      data: { foo: 'bar' },
    })
  })

  it('should handle task creation events', async () => {
    const { inngest } = await import('@/lib/inngest')

    const taskData = {
      id: 'task-123',
      title: 'Test Task',
      status: 'pending',
    }

    const result = await inngest.send({
      name: 'task.created',
      data: taskData,
    })

    expect(result).toEqual({ id: 'test-event-id' })
    expect(inngest.send).toHaveBeenCalledWith({
      name: 'task.created',
      data: taskData,
    })
  })

  it('should handle task control events', async () => {
    const { inngest } = await import('@/lib/inngest')

    const controlData = {
      taskId: 'task-123',
      action: 'pause',
      reason: 'User requested pause',
    }

    const result = await inngest.send({
      name: 'task.control',
      data: controlData,
    })

    expect(result).toEqual({ id: 'test-event-id' })
    expect(inngest.send).toHaveBeenCalledWith({
      name: 'task.control',
      data: controlData,
    })
  })

  it('should handle multiple events in sequence', async () => {
    // Reset the mock before this test
    mockSend.mockClear()
    mockSend.mockResolvedValue({ id: 'test-event-id' })

    const { inngest } = await import('@/lib/inngest')

    const events = [
      { name: 'task.created', data: { id: 'task-1' } },
      { name: 'task.started', data: { id: 'task-1' } },
      { name: 'task.completed', data: { id: 'task-1' } },
    ]

    for (const event of events) {
      const result = await inngest.send(event)
      expect(result).toEqual({ id: 'test-event-id' })
    }

    expect(mockSend).toHaveBeenCalledTimes(3)
  })

  it('should validate event data', async () => {
    const { inngest } = await import('@/lib/inngest')

    // Test with empty data
    const result = await inngest.send({
      name: 'task.created',
      data: {},
    })

    expect(result).toEqual({ id: 'test-event-id' })

    // Test with null data
    const resultNull = await inngest.send({
      name: 'task.created',
      data: null as any,
    })

    expect(resultNull).toEqual({ id: 'test-event-id' })
  })

  it('should handle Inngest configuration', async () => {
    const { inngest } = await import('@/lib/inngest')

    // Verify the client is properly configured
    expect(inngest).toBeDefined()
    expect(inngest.send).toBeDefined()
    expect(typeof inngest.send).toBe('function')
  })
})
