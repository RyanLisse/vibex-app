import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { GET } from '@/app/api/test-inngest/route'

// The inngest module is already mocked in vitest.setup.inngest.ts

describe('GET /api/test-inngest', () => {
  let inngest: any

  beforeEach(async () => {
    vi.clearAllMocks()
    // Clear environment variables
    delete process.env.INNGEST_EVENT_KEY
    delete process.env.INNGEST_SIGNING_KEY
    delete process.env.INNGEST_DEV

    // Get the mocked inngest
    const inngestModule = await import('@/lib/inngest')
    inngest = inngestModule.inngest
  })

  it('should return ok status with config in development', async () => {
    vi.stubEnv('NODE_ENV', 'development')
    process.env.INNGEST_EVENT_KEY = 'test-event-key'
    process.env.INNGEST_SIGNING_KEY = 'test-signing-key'

    vi.mocked(inngest.send).mockResolvedValue({ ids: ['test-id'] })

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual({
      status: 'ok',
      config: {
        isDev: true,
        hasEventKey: true,
        hasSigningKey: true,
        environment: 'development',
      },
      eventTest: {
        sent: true,
        error: null,
      },
      message: 'Inngest configuration test endpoint',
    })
  })

  it('should return ok status with INNGEST_DEV=1', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    process.env.INNGEST_DEV = '1'
    process.env.INNGEST_EVENT_KEY = 'test-event-key'
    process.env.INNGEST_SIGNING_KEY = 'test-signing-key'

    vi.mocked(inngest.send).mockResolvedValue({ ids: ['test-id'] })

    const response = await GET()
    const data = await response.json()

    expect(data.config.isDev).toBe(true)
    expect(data.status).toBe('ok')
  })

  it('should handle missing environment variables', async () => {
    vi.stubEnv('NODE_ENV', 'production')

    vi.mocked(inngest.send).mockResolvedValue({ ids: ['test-id'] })

    const response = await GET()
    const data = await response.json()

    expect(data.config).toEqual({
      isDev: false,
      hasEventKey: false,
      hasSigningKey: false,
      environment: 'production',
    })
  })

  it('should handle event sending failure', async () => {
    vi.stubEnv('NODE_ENV', 'development')
    process.env.INNGEST_EVENT_KEY = 'test-event-key'
    process.env.INNGEST_SIGNING_KEY = 'test-signing-key'

    const error = new Error('Network error')
    vi.mocked(inngest.send).mockRejectedValue(error)

    const response = await GET()
    const data = await response.json()

    expect(data.status).toBe('ok')
    expect(data.eventTest).toEqual({
      sent: false,
      error: 'Network error',
    })
  })

  it('should handle unknown event sending error', async () => {
    vi.stubEnv('NODE_ENV', 'development')
    process.env.INNGEST_EVENT_KEY = 'test-event-key'
    process.env.INNGEST_SIGNING_KEY = 'test-signing-key'

    vi.mocked(inngest.send).mockRejectedValue('Unknown error type')

    const response = await GET()
    const data = await response.json()

    expect(data.eventTest).toEqual({
      sent: false,
      error: 'Unknown error',
    })
  })

  it('should handle general errors', async () => {
    // Mock inngest.send to throw an error during JSON parsing
    vi.mocked(inngest.send).mockImplementation(() => {
      throw new Error('Unexpected error')
    })

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data).toEqual({
      status: 'error',
      error: 'Unexpected error',
    })
  })

  it('should handle unknown general errors', async () => {
    // Mock inngest.send to throw a non-Error object
    vi.mocked(inngest.send).mockImplementation(() => {
      throw 'String error'
    })

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data).toEqual({
      status: 'error',
      error: 'Unknown error',
    })
  })

  it('should send correct test event', async () => {
    vi.stubEnv('NODE_ENV', 'development')
    process.env.INNGEST_EVENT_KEY = 'test-event-key'
    process.env.INNGEST_SIGNING_KEY = 'test-signing-key'

    vi.mocked(inngest.send).mockResolvedValue({ ids: ['test-id'] })

    await GET()

    expect(inngest.send).toHaveBeenCalledWith({
      name: 'test/ping',
      data: { timestamp: expect.any(String) },
    })
  })
})
