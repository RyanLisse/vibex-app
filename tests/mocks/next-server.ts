import { vi } from 'vitest'

// Create a mock NextResponse that properly extends Response
export function createMockNextResponse() {
  const mockCookies = {
    set: vi.fn(),
    get: vi.fn(),
    delete: vi.fn(),
    getAll: vi.fn(() => []),
    has: vi.fn(() => false),
  }

  const createResponse = (body: any, init?: ResponseInit) => {
    const response = new Response(body ? JSON.stringify(body) : null, init)
    Object.defineProperty(response, 'cookies', { value: mockCookies })
    Object.defineProperty(response, Symbol.for('next.internal.response'), { value: {} })
    return response
  }

  return {
    json: vi.fn((body: any, init?: ResponseInit) => createResponse(body, init)),
    redirect: vi.fn((url: string | URL, status?: number) =>
      createResponse(null, {
        status: status || 302,
        headers: { Location: url.toString() },
      })
    ),
  }
}

// Export the mock setup function
export function setupNextServerMocks() {
  vi.mock('next/server', async () => {
    const actual = await vi.importActual('next/server')
    return {
      ...actual,
      NextResponse: createMockNextResponse(),
    }
  })
}
