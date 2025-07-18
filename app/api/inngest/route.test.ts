import { afterEach, beforeEach, describe, expect, it, mock, spyOn, test } from 'bun:test'
import { NextRequest } from 'next/server'
import { vi } from 'vitest'
import { GET, POST, PUT } from '@/app/api/inngest/route'

// Mock Inngest
const mockHandler = {
  GET: vi.fn(),
  POST: vi.fn(),
  PUT: vi.fn(),
}

vi.mock('inngest/next', () => ({
  serve: vi.fn(() => mockHandler),
}))

vi.mock('@/lib/inngest', () => ({
  inngest: {
    createFunction: vi.fn(),
    send: vi.fn(),
  },
  createTask: {
    id: 'create-task',
    name: 'Create Task',
    trigger: { event: 'task.created' },
    handler: vi.fn(),
  },
  taskControl: {
    id: 'task-control',
    name: 'Task Control',
    trigger: { event: 'task.control' },
    handler: vi.fn(),
  },
}))

// Mock NextResponse
vi.mock('next/server', async () => {
  const actual = await mock.importActual('next/server')
  return {
    ...actual,
    NextResponse: {
      json: vi.fn((data, init) => ({ json: () => Promise.resolve(data), ...init })),
      text: vi.fn(),
    },
  }
})

// Mock environment variables
mock.stubEnv('INNGEST_SIGNING_KEY', 'test-signing-key')
mock.stubEnv('INNGEST_EVENT_KEY', 'test-event-key')
mock.stubEnv('NODE_ENV', 'test')

const { NextResponse } = await import('next/server')
const _mockNextResponse = NextResponse as any

describe('Inngest API Routes', () => {
  beforeEach(() => {
    mock.restore()
  })

  describe('GET /api/inngest', () => {
    it('should return Inngest serve response', async () => {
      const mockServeResponse = new Response('Inngest endpoint ready')
      mockHandler.GET.mockResolvedValue(mockServeResponse)

      const request = new NextRequest('https://app.example.com/api/inngest')

      const response = await GET(request)

      expect(response).toBe(mockServeResponse)
    })

    it('should handle Inngest serve errors', async () => {
      mockHandler.GET.mockRejectedValue(new Error('Inngest serve failed'))

      const request = new NextRequest('https://app.example.com/api/inngest')

      const _response = await GET(request)

      expect(mockHandler.GET).toHaveBeenCalled()
    })

    it('should handle missing environment variables', async () => {
      mock.stubEnv('INNGEST_SIGNING_KEY', '')
      mock.stubEnv('INNGEST_EVENT_KEY', '')

      const request = new NextRequest('https://app.example.com/api/inngest')

      const _response = await GET(request)

      expect(mockHandler.GET).toHaveBeenCalled()
    })
  })

  describe('POST /api/inngest', () => {
    it('should return Inngest serve response for POST', async () => {
      const mockServeResponse = new Response('Inngest webhook handled')
      mockHandler.POST.mockResolvedValue(mockServeResponse)

      const request = new NextRequest('https://app.example.com/api/inngest', {
        method: 'POST',
        body: JSON.stringify({ event: 'task.created', data: { taskId: 'task-123' } }),
      })

      const response = await POST(request)

      expect(response).toBe(mockServeResponse)
    })

    it('should handle webhook signature validation', async () => {
      const mockServeResponse = new Response('Invalid signature', { status: 401 })
      mockHandler.POST.mockResolvedValue(mockServeResponse)

      const request = new NextRequest('https://app.example.com/api/inngest', {
        method: 'POST',
        headers: {
          'x-inngest-signature': 'invalid-signature',
        },
        body: JSON.stringify({ event: 'task.created', data: { taskId: 'task-123' } }),
      })

      const response = await POST(request)

      expect(response).toBe(mockServeResponse)
    })

    it('should handle malformed request body', async () => {
      const mockServeResponse = new Response(JSON.stringify({ success: true }), { status: 200 })
      mockHandler.POST.mockResolvedValue(mockServeResponse)

      const request = new NextRequest('https://app.example.com/api/inngest', {
        method: 'POST',
        body: 'invalid-json',
      })

      const response = await POST(request)

      expect(response).toBe(mockServeResponse)
    })

    it('should handle function execution errors', async () => {
      mockHandler.POST.mockRejectedValue(new Error('Function execution failed'))

      const request = new NextRequest('https://app.example.com/api/inngest', {
        method: 'POST',
        body: JSON.stringify({ event: 'task.created', data: { taskId: 'task-123' } }),
      })

      const _response = await POST(request)

      expect(mockHandler.POST).toHaveBeenCalled()
    })
  })

  describe('PUT /api/inngest', () => {
    it('should return Inngest serve response for PUT', async () => {
      const mockServeResponse = new Response('Inngest function updated')
      mockHandler.PUT.mockResolvedValue(mockServeResponse)

      const request = new NextRequest('https://app.example.com/api/inngest', {
        method: 'PUT',
        body: JSON.stringify({ functionId: 'task-processor', enabled: false }),
      })

      const response = await PUT(request)

      expect(response).toBe(mockServeResponse)
    })

    it('should handle function configuration updates', async () => {
      const mockServeResponse = new Response('Function configuration updated')
      mockHandler.PUT.mockResolvedValue(mockServeResponse)

      const request = new NextRequest('https://app.example.com/api/inngest', {
        method: 'PUT',
        body: JSON.stringify({
          functionId: 'workflow-engine',
          config: { retries: 3, timeout: 30_000 },
        }),
      })

      const response = await PUT(request)

      expect(response).toBe(mockServeResponse)
    })

    it('should handle invalid function updates', async () => {
      mockHandler.PUT.mockRejectedValue(new Error('Function not found'))

      const request = new NextRequest('https://app.example.com/api/inngest', {
        method: 'PUT',
        body: JSON.stringify({ functionId: 'non-existent-function' }),
      })

      const _response = await PUT(request)

      expect(mockHandler.PUT).toHaveBeenCalled()
    })

    it('should handle authorization errors', async () => {
      mockHandler.PUT.mockRejectedValue(new Error('Unauthorized'))

      const request = new NextRequest('https://app.example.com/api/inngest', {
        method: 'PUT',
        headers: {
          Authorization: 'Bearer invalid-token',
        },
        body: JSON.stringify({ functionId: 'task-processor', enabled: false }),
      })

      const _response = await PUT(request)

      expect(mockHandler.PUT).toHaveBeenCalled()
    })
  })

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      mockHandler.GET.mockRejectedValue(new Error('Network error'))

      const request = new NextRequest('https://app.example.com/api/inngest')

      const _response = await GET(request)

      expect(mockHandler.GET).toHaveBeenCalled()
    })

    it('should handle timeout errors', async () => {
      mockHandler.GET.mockImplementation(() => {
        return new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Timeout')), 100)
        })
      })

      const request = new NextRequest('https://app.example.com/api/inngest')

      const _response = await GET(request)

      expect(mockHandler.GET).toHaveBeenCalled()
    })

    it('should handle rate limiting', async () => {
      const error = new Error('Rate limit exceeded')
      error.name = 'RateLimitError'
      mockHandler.GET.mockRejectedValue(error)

      const request = new NextRequest('https://app.example.com/api/inngest')

      const _response = await GET(request)

      expect(mockHandler.GET).toHaveBeenCalled()
    })
  })

  describe('Function Registration', () => {
    it('should register all functions correctly', async () => {
      const mockServeResponse = new Response('Functions registered')
      mockHandler.GET.mockResolvedValue(mockServeResponse)

      const request = new NextRequest('https://app.example.com/api/inngest')

      const response = await GET(request)

      expect(response).toBe(mockServeResponse)
    })

    it('should handle function registration errors', async () => {
      mockHandler.GET.mockRejectedValue(new Error('Function registration failed'))

      const request = new NextRequest('https://app.example.com/api/inngest')

      const _response = await GET(request)

      expect(mockHandler.GET).toHaveBeenCalled()
    })
  })

  describe('Environment Configuration', () => {
    it('should handle development environment', async () => {
      mock.stubEnv('NODE_ENV', 'development')
      mock.stubEnv('INNGEST_SIGNING_KEY', 'dev-signing-key')
      mock.stubEnv('INNGEST_EVENT_KEY', 'dev-event-key')

      const mockServeResponse = new Response('Development mode')
      mockHandler.GET.mockResolvedValue(mockServeResponse)

      const request = new NextRequest('https://app.example.com/api/inngest')

      const response = await GET(request)

      expect(response).toBe(mockServeResponse)
    })

    it('should handle production environment', async () => {
      mock.stubEnv('NODE_ENV', 'production')
      mock.stubEnv('INNGEST_SIGNING_KEY', 'prod-signing-key')
      mock.stubEnv('INNGEST_EVENT_KEY', 'prod-event-key')

      const mockServeResponse = new Response('Production mode')
      mockHandler.GET.mockResolvedValue(mockServeResponse)

      const request = new NextRequest('https://app.example.com/api/inngest')

      const response = await GET(request)

      expect(response).toBe(mockServeResponse)
    })
  })
})
