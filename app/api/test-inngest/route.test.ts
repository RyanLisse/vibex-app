import { test, expect, describe, it, beforeEach, afterEach, mock } from "bun:test"
import { inngest } from '@/lib/inngest'
import { GET } from '@/app/api/test-inngest/route'

// Mock the inngest client
mock('@/lib/inngest', () => ({
  inngest: {
    send: mock(),
  },
}))

describe('GET /api/test-inngest', () => {
  beforeEach(() => {
    mock.restore()
    // Clear environment variables
    process.env.INNGEST_EVENT_KEY = undefined
    process.env.INNGEST_SIGNING_KEY = undefined
    process.env.INNGEST_DEV = undefined
  })

  it('should return ok status with config in development', async () => {
    mock.stubEnv('NODE_ENV', 'development')
    process.env.INNGEST_EVENT_KEY = 'test-event-key'
    process.env.INNGEST_SIGNING_KEY = 'test-signing-key'

    mocked(inngest.send).mockResolvedValue({ ids: ['test-id'] } as any)

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
    mock.stubEnv('NODE_ENV', 'production')
    process.env.INNGEST_DEV = '1'
    process.env.INNGEST_EVENT_KEY = 'test-event-key'
    process.env.INNGEST_SIGNING_KEY = 'test-signing-key'

    mocked(inngest.send).mockResolvedValue({ ids: ['test-id'] } as any)

    const response = await GET()
    const data = await response.json()

    expect(data.config.isDev).toBe(true)
    expect(data.status).toBe('ok')
  })

  it('should handle missing environment variables', async () => {
    mock.stubEnv('NODE_ENV', 'production')

    mocked(inngest.send).mockResolvedValue({ ids: ['test-id'] } as any)

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
    mock.stubEnv('NODE_ENV', 'development')
    process.env.INNGEST_EVENT_KEY = 'test-event-key'
    process.env.INNGEST_SIGNING_KEY = 'test-signing-key'

    const error = new Error('Network error')
    mocked(inngest.send).mockRejectedValue(error)

    const response = await GET()
    const data = await response.json()

    expect(data.status).toBe('ok')
    expect(data.eventTest).toEqual({
      sent: false,
      error: 'Network error',
    })
  })

  it('should handle unknown event sending error', async () => {
    mock.stubEnv('NODE_ENV', 'development')
    process.env.INNGEST_EVENT_KEY = 'test-event-key'
    process.env.INNGEST_SIGNING_KEY = 'test-signing-key'

    mocked(inngest.send).mockRejectedValue('Unknown error type')

    const response = await GET()
    const data = await response.json()

    expect(data.eventTest).toEqual({
      sent: false,
      error: 'Unknown error',
    })
  })

  it('should handle general errors', async () => {
    // Mock inngest.send to throw an error during JSON parsing
    mocked(inngest.send).mockImplementation(() => {
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
    mocked(inngest.send).mockImplementation(() => {
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
    mock.stubEnv('NODE_ENV', 'development')
    process.env.INNGEST_EVENT_KEY = 'test-event-key'
    process.env.INNGEST_SIGNING_KEY = 'test-signing-key'

    mocked(inngest.send).mockResolvedValue({ ids: ['test-id'] } as any)

    await GET()

    expect(inngest.send).toHaveBeenCalledWith({
      name: 'test/ping',
      data: { timestamp: expect.any(String) },
    })
  })
})
