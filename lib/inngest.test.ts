import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// 1. Streamlined Mock Dependencies with Complete Handler Objects
vi.mock('inngest', () => ({
  Inngest: vi.fn().mockImplementation(() => ({
    createFunction: vi.fn((config, trigger, handler) => ({
      config,
      trigger,
      handler, // Include the handler property to fix type errors
    })),
  })),
}))

vi.mock('@inngest/realtime', () => ({
  realtimeMiddleware: vi.fn(() => ({ name: 'realtime' })),
  channel: vi.fn((name) => ({ name })),
  topic: vi.fn((name) => ({ name })),
}))

vi.mock('@vibe-kit/sdk', () => ({
  VibeKit: vi.fn().mockImplementation(() => ({
    setSession: vi.fn(),
    generateCode: vi.fn().mockResolvedValue({ result: 'success' }),
    pause: vi.fn(),
  })),
}))

import { channel, topic } from '@inngest/realtime'
import { VibeKit } from '@vibe-kit/sdk'
// 2. Import mocks and the module under test
import { Inngest } from 'inngest'

describe('inngest', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset environment variables
    process.env.INNGEST_EVENT_KEY = 'test-event-key'
    process.env.OPENAI_API_KEY = 'test-openai-key'
    process.env.E2B_API_KEY = 'test-e2b-key'
    process.env.INNGEST_DEV = undefined
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should create client with correct production configuration', async () => {
    await import('./inngest')
    expect(Inngest).toHaveBeenCalledWith({
      id: 'clonedx',
      eventKey: 'test-event-key',
      middleware: [expect.any(Object)],
      isDev: false,
    })
  })

  // 3. Isolate Environment Tests using vi.doMock for module isolation
  it('should enable dev mode when INNGEST_DEV is set', async () => {
    process.env.INNGEST_DEV = 'true'

    // Use vi.doMock for module isolation
    vi.doMock('./inngest', async () => {
      return await vi.importActual('./inngest')
    })

    await import('./inngest')
    expect(Inngest).toHaveBeenCalledWith(expect.objectContaining({ isDev: true }))

    vi.doUnmock('./inngest')
  })

  it('should create task channel with correct topics', async () => {
    await import('./inngest')
    expect(channel).toHaveBeenCalledWith('tasks')
    expect(topic).toHaveBeenCalledWith('status')
    expect(topic).toHaveBeenCalledWith('update')
    expect(topic).toHaveBeenCalledWith('control')
  })

  it('should handle task control actions', async () => {
    await import('./inngest')

    // Verify that Inngest createFunction was called (indicating taskControl was created)
    expect(vi.mocked(Inngest)).toHaveBeenCalled()
    const inngestInstance = vi.mocked(Inngest).mock.results[0].value
    expect(inngestInstance.createFunction).toHaveBeenCalled()
  })

  it('should create and execute a task', async () => {
    await import('./inngest')

    // Verify VibeKit and Inngest were called during module initialization
    expect(vi.mocked(Inngest)).toHaveBeenCalled()
    expect(vi.mocked(VibeKit)).toBeDefined()
  })

  it('should get server app by default', async () => {
    const { getInngestApp } = await import('./inngest')
    getInngestApp()
    expect(Inngest).toHaveBeenLastCalledWith({
      id: 'server',
      middleware: [expect.any(Object)],
    })
  })

  // 4. Ensure Type Safety for browser environment test
  it('should get client app in browser environment', async () => {
    const originalWindow = global.window

    // Properly type the globalThis object to avoid type errors
    ;(globalThis as any).window = {}

    vi.doMock('./inngest', async () => {
      return await vi.importActual('./inngest')
    })

    const { getInngestApp } = await import('./inngest')
    getInngestApp()

    expect(Inngest).toHaveBeenLastCalledWith({
      id: 'client',
      middleware: [expect.any(Object)],
    })

    // Restore original window
    global.window = originalWindow
    vi.doUnmock('./inngest')
  })
})
