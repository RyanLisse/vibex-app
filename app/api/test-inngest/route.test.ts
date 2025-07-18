import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from './route'
import { inngest } from '@/lib/inngest'

// Mock the inngest client
vi.mock('@/lib/inngest', () => ({
  inngest: {
    send: vi.fn(),
  },
}))

describe('GET /api/test-inngest', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Clear environment variables
    delete process.env.INNGEST_EVENT_KEY
    delete process.env.INNGEST_SIGNING_KEY
    delete process.env.INNGEST_DEV
  })

  it('should return ok status with config in development', async () => {
    process.env.NODE_ENV = 'development'
    process.env.INNGEST_EVENT_KEY = 'test-event-key'
    process.env.INNGEST_SIGNING_KEY = 'test-signing-key'
    
    vi.mocked(inngest.send).mockResolvedValue({})

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
    process.env.NODE_ENV = 'production'
    process.env.INNGEST_DEV = '1'
    process.env.INNGEST_EVENT_KEY = 'test-event-key'
    process.env.INNGEST_SIGNING_KEY = 'test-signing-key'
    
    vi.mocked(inngest.send).mockResolvedValue({})

    const response = await GET()
    const data = await response.json()

    expect(data.config.isDev).toBe(true)
    expect(data.status).toBe('ok')
  })

  it('should handle missing environment variables', async () => {
    process.env.NODE_ENV = 'production'
    
    vi.mocked(inngest.send).mockResolvedValue({})

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
    process.env.NODE_ENV = 'development'
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
    process.env.NODE_ENV = 'development'
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
    process.env.NODE_ENV = 'development'
    process.env.INNGEST_EVENT_KEY = 'test-event-key'
    process.env.INNGEST_SIGNING_KEY = 'test-signing-key'
    
    vi.mocked(inngest.send).mockResolvedValue({})

    await GET()

    expect(inngest.send).toHaveBeenCalledWith({
      name: 'test/ping',
      data: { timestamp: expect.any(String) },
    })
  })
})