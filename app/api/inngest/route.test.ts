import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST, PUT } from './route'

// Mock Inngest
const mockInngest = {
  createFunction: vi.fn(),
  send: vi.fn(),
  serve: vi.fn()
}

vi.mock('@/lib/inngest', () => ({
  inngest: mockInngest,
  taskProcessor: {
    id: 'task-processor',
    name: 'Task Processor',
    trigger: { event: 'task.created' },
    handler: vi.fn()
  },
  workflowEngine: {
    id: 'workflow-engine',
    name: 'Workflow Engine',
    trigger: { event: 'workflow.started' },
    handler: vi.fn()
  }
}))

// Mock NextResponse
vi.mock('next/server', async () => {
  const actual = await vi.importActual('next/server')
  return {
    ...actual,
    NextResponse: {
      json: vi.fn(),
      text: vi.fn()
    }
  }
})

// Mock environment variables
vi.mock('@/lib/env', () => ({
  env: {
    INNGEST_SIGNING_KEY: 'test-signing-key',
    INNGEST_EVENT_KEY: 'test-event-key',
    NODE_ENV: 'test'
  }
}))

const { NextResponse } = await import('next/server')
const mockNextResponse = vi.mocked(NextResponse)

describe('Inngest API Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/inngest', () => {
    it('should return Inngest serve response', async () => {
      const mockServeResponse = new Response('Inngest endpoint ready')
      mockInngest.serve.mockReturnValue(mockServeResponse)

      const request = new NextRequest('https://app.example.com/api/inngest')
      
      const response = await GET(request)

      expect(mockInngest.serve).toHaveBeenCalledWith(
        'Task Processing API',
        expect.arrayContaining([
          expect.objectContaining({ id: 'task-processor' }),
          expect.objectContaining({ id: 'workflow-engine' })
        ])
      )
      expect(response).toBe(mockServeResponse)
    })

    it('should handle Inngest serve errors', async () => {
      mockInngest.serve.mockImplementation(() => {
        throw new Error('Inngest serve failed')
      })
      mockNextResponse.json.mockReturnValue(new Response(JSON.stringify({ error: 'Inngest serve failed' })))

      const request = new NextRequest('https://app.example.com/api/inngest')
      
      const response = await GET(request)

      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: 'Inngest serve failed' },
        { status: 500 }
      )
    })

    it('should handle missing environment variables', async () => {
      vi.doMock('@/lib/env', () => ({
        env: {
          INNGEST_SIGNING_KEY: undefined,
          INNGEST_EVENT_KEY: undefined
        }
      }))

      mockNextResponse.json.mockReturnValue(new Response(JSON.stringify({ error: 'Missing Inngest configuration' })))

      const request = new NextRequest('https://app.example.com/api/inngest')
      
      const response = await GET(request)

      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: 'Missing Inngest configuration' },
        { status: 500 }
      )
    })
  })

  describe('POST /api/inngest', () => {
    it('should return Inngest serve response for POST', async () => {
      const mockServeResponse = new Response('Inngest webhook handled')
      mockInngest.serve.mockReturnValue(mockServeResponse)

      const request = new NextRequest('https://app.example.com/api/inngest', {
        method: 'POST',
        body: JSON.stringify({ event: 'task.created', data: { taskId: 'task-123' } })
      })
      
      const response = await POST(request)

      expect(mockInngest.serve).toHaveBeenCalledWith(
        'Task Processing API',
        expect.arrayContaining([
          expect.objectContaining({ id: 'task-processor' }),
          expect.objectContaining({ id: 'workflow-engine' })
        ])
      )
      expect(response).toBe(mockServeResponse)
    })

    it('should handle webhook signature validation', async () => {
      const mockServeResponse = new Response('Invalid signature', { status: 401 })
      mockInngest.serve.mockReturnValue(mockServeResponse)

      const request = new NextRequest('https://app.example.com/api/inngest', {
        method: 'POST',
        headers: {
          'x-inngest-signature': 'invalid-signature'
        },
        body: JSON.stringify({ event: 'task.created', data: { taskId: 'task-123' } })
      })
      
      const response = await POST(request)

      expect(response).toBe(mockServeResponse)
    })

    it('should handle malformed request body', async () => {
      mockInngest.serve.mockImplementation(() => {
        throw new Error('Invalid request body')
      })
      mockNextResponse.json.mockReturnValue(new Response(JSON.stringify({ error: 'Invalid request body' })))

      const request = new NextRequest('https://app.example.com/api/inngest', {
        method: 'POST',
        body: 'invalid-json'
      })
      
      const response = await POST(request)

      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: 'Invalid request body' },
        { status: 400 }
      )
    })

    it('should handle function execution errors', async () => {
      mockInngest.serve.mockImplementation(() => {
        throw new Error('Function execution failed')
      })
      mockNextResponse.json.mockReturnValue(new Response(JSON.stringify({ error: 'Function execution failed' })))

      const request = new NextRequest('https://app.example.com/api/inngest', {
        method: 'POST',
        body: JSON.stringify({ event: 'task.created', data: { taskId: 'task-123' } })
      })
      
      const response = await POST(request)

      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: 'Function execution failed' },
        { status: 500 }
      )
    })
  })

  describe('PUT /api/inngest', () => {
    it('should return Inngest serve response for PUT', async () => {
      const mockServeResponse = new Response('Inngest function updated')
      mockInngest.serve.mockReturnValue(mockServeResponse)

      const request = new NextRequest('https://app.example.com/api/inngest', {
        method: 'PUT',
        body: JSON.stringify({ functionId: 'task-processor', enabled: false })
      })
      
      const response = await PUT(request)

      expect(mockInngest.serve).toHaveBeenCalledWith(
        'Task Processing API',
        expect.arrayContaining([
          expect.objectContaining({ id: 'task-processor' }),
          expect.objectContaining({ id: 'workflow-engine' })
        ])
      )
      expect(response).toBe(mockServeResponse)
    })

    it('should handle function configuration updates', async () => {
      const mockServeResponse = new Response('Function configuration updated')
      mockInngest.serve.mockReturnValue(mockServeResponse)

      const request = new NextRequest('https://app.example.com/api/inngest', {
        method: 'PUT',
        body: JSON.stringify({ 
          functionId: 'workflow-engine',
          config: { retries: 3, timeout: 30000 }
        })
      })
      
      const response = await PUT(request)

      expect(response).toBe(mockServeResponse)
    })

    it('should handle invalid function updates', async () => {
      mockInngest.serve.mockImplementation(() => {
        throw new Error('Function not found')
      })
      mockNextResponse.json.mockReturnValue(new Response(JSON.stringify({ error: 'Function not found' })))

      const request = new NextRequest('https://app.example.com/api/inngest', {
        method: 'PUT',
        body: JSON.stringify({ functionId: 'non-existent-function' })
      })
      
      const response = await PUT(request)

      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: 'Function not found' },
        { status: 404 }
      )
    })

    it('should handle authorization errors', async () => {
      mockInngest.serve.mockImplementation(() => {
        throw new Error('Unauthorized')
      })
      mockNextResponse.json.mockReturnValue(new Response(JSON.stringify({ error: 'Unauthorized' })))

      const request = new NextRequest('https://app.example.com/api/inngest', {
        method: 'PUT',
        headers: {
          'Authorization': 'Bearer invalid-token'
        },
        body: JSON.stringify({ functionId: 'task-processor', enabled: false })
      })
      
      const response = await PUT(request)

      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    })
  })

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      mockInngest.serve.mockImplementation(() => {
        throw new Error('Network error')
      })
      mockNextResponse.json.mockReturnValue(new Response(JSON.stringify({ error: 'Network error' })))

      const request = new NextRequest('https://app.example.com/api/inngest')
      
      const response = await GET(request)

      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: 'Network error' },
        { status: 500 }
      )
    })

    it('should handle timeout errors', async () => {
      mockInngest.serve.mockImplementation(() => {
        return new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Timeout')), 100)
        })
      })
      mockNextResponse.json.mockReturnValue(new Response(JSON.stringify({ error: 'Timeout' })))

      const request = new NextRequest('https://app.example.com/api/inngest')
      
      const response = await GET(request)

      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: 'Timeout' },
        { status: 500 }
      )
    })

    it('should handle rate limiting', async () => {
      mockInngest.serve.mockImplementation(() => {
        const error = new Error('Rate limit exceeded')
        error.name = 'RateLimitError'
        throw error
      })
      mockNextResponse.json.mockReturnValue(new Response(JSON.stringify({ error: 'Rate limit exceeded' })))

      const request = new NextRequest('https://app.example.com/api/inngest')
      
      const response = await GET(request)

      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: 'Rate limit exceeded' },
        { status: 429 }
      )
    })
  })

  describe('Function Registration', () => {
    it('should register all functions correctly', async () => {
      const mockServeResponse = new Response('Functions registered')
      mockInngest.serve.mockReturnValue(mockServeResponse)

      const request = new NextRequest('https://app.example.com/api/inngest')
      
      const response = await GET(request)

      expect(mockInngest.serve).toHaveBeenCalledWith(
        'Task Processing API',
        expect.arrayContaining([
          expect.objectContaining({ 
            id: 'task-processor',
            name: 'Task Processor'
          }),
          expect.objectContaining({ 
            id: 'workflow-engine',
            name: 'Workflow Engine'
          })
        ])
      )
    })

    it('should handle function registration errors', async () => {
      mockInngest.serve.mockImplementation(() => {
        throw new Error('Function registration failed')
      })
      mockNextResponse.json.mockReturnValue(new Response(JSON.stringify({ error: 'Function registration failed' })))

      const request = new NextRequest('https://app.example.com/api/inngest')
      
      const response = await GET(request)

      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: 'Function registration failed' },
        { status: 500 }
      )
    })
  })

  describe('Environment Configuration', () => {
    it('should handle development environment', async () => {
      vi.doMock('@/lib/env', () => ({
        env: {
          NODE_ENV: 'development',
          INNGEST_SIGNING_KEY: 'dev-signing-key',
          INNGEST_EVENT_KEY: 'dev-event-key'
        }
      }))

      const mockServeResponse = new Response('Development mode')
      mockInngest.serve.mockReturnValue(mockServeResponse)

      const request = new NextRequest('https://app.example.com/api/inngest')
      
      const response = await GET(request)

      expect(response).toBe(mockServeResponse)
    })

    it('should handle production environment', async () => {
      vi.doMock('@/lib/env', () => ({
        env: {
          NODE_ENV: 'production',
          INNGEST_SIGNING_KEY: 'prod-signing-key',
          INNGEST_EVENT_KEY: 'prod-event-key'
        }
      }))

      const mockServeResponse = new Response('Production mode')
      mockInngest.serve.mockReturnValue(mockServeResponse)

      const request = new NextRequest('https://app.example.com/api/inngest')
      
      const response = await GET(request)

      expect(response).toBe(mockServeResponse)
    })
  })
})