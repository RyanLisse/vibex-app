import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { testApiHandler } from 'next-test-api-route-handler'
import handler from '@/app/api/tasks/route'

describe('/api/tasks', () => {
  beforeEach(() => {
    // Setup test database or mock services
  })

  afterEach(() => {
    // Cleanup test data
  })

  it('creates a new task successfully', async () => {
    await testApiHandler({
      appHandler: handler,
      test: async ({ fetch }) => {
        const response = await fetch({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            description: 'Test task',
            repository: 'user/test-repo',
            environment: 'node',
          }),
        })

        expect(response.status).toBe(201)

        const data = await response.json()
        expect(data).toHaveProperty('id')
        expect(data).toHaveProperty('description', 'Test task')
        expect(data).toHaveProperty('status', 'pending')
      },
    })
  })

  it('validates required fields', async () => {
    await testApiHandler({
      appHandler: handler,
      test: async ({ fetch }) => {
        const response = await fetch({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({}),
        })

        expect(response.status).toBe(400)

        const data = await response.json()
        expect(data).toHaveProperty('error')
        expect(data.error).toContain('description is required')
      },
    })
  })

  it('handles authentication errors', async () => {
    await testApiHandler({
      appHandler: handler,
      test: async ({ fetch }) => {
        const response = await fetch({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            description: 'Test task',
            repository: 'user/test-repo',
          }),
        })

        expect(response.status).toBe(401)

        const data = await response.json()
        expect(data).toHaveProperty('error', 'Authentication required')
      },
    })
  })
})
