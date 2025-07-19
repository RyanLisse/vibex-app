/**
 * Enhanced API Testing Utilities
 * Patterns for testing Next.js API routes and server components
 */

import { NextRequest, NextResponse } from 'next/server'
import { expect } from 'vitest'

/**
 * Mock request factory for API route testing
 */
export class MockRequestFactory {
  /**
   * Create a mock GET request
   */
  static createGetRequest(url: string, headers: Record<string, string> = {}) {
    return new NextRequest(url, {
      method: 'GET',
      headers: new Headers(headers),
    })
  }

  /**
   * Create a mock POST request with JSON body
   */
  static createPostRequest(url: string, body: any, headers: Record<string, string> = {}) {
    return new NextRequest(url, {
      method: 'POST',
      headers: new Headers({
        'Content-Type': 'application/json',
        ...headers,
      }),
      body: JSON.stringify(body),
    })
  }

  /**
   * Create a mock PUT request with JSON body
   */
  static createPutRequest(url: string, body: any, headers: Record<string, string> = {}) {
    return new NextRequest(url, {
      method: 'PUT',
      headers: new Headers({
        'Content-Type': 'application/json',
        ...headers,
      }),
      body: JSON.stringify(body),
    })
  }

  /**
   * Create a mock DELETE request
   */
  static createDeleteRequest(url: string, headers: Record<string, string> = {}) {
    return new NextRequest(url, {
      method: 'DELETE',
      headers: new Headers(headers),
    })
  }

  /**
   * Create a request with authentication headers
   */
  static createAuthenticatedRequest(
    method: string,
    url: string,
    token: string,
    body?: any,
    additionalHeaders: Record<string, string> = {}
  ) {
    const headers = {
      Authorization: `Bearer ${token}`,
      ...additionalHeaders,
    }

    if (body) {
      headers['Content-Type'] = 'application/json'
    }

    return new NextRequest(url, {
      method,
      headers: new Headers(headers),
      body: body ? JSON.stringify(body) : undefined,
    })
  }

  /**
   * Create a multipart form request
   */
  static createFormRequest(url: string, formData: FormData, headers: Record<string, string> = {}) {
    return new NextRequest(url, {
      method: 'POST',
      headers: new Headers(headers),
      body: formData,
    })
  }

  /**
   * Create a request with query parameters
   */
  static createRequestWithQuery(
    method: string,
    baseUrl: string,
    params: Record<string, string>,
    headers: Record<string, string> = {}
  ) {
    const url = new URL(baseUrl)
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value)
    })

    return new NextRequest(url.toString(), {
      method,
      headers: new Headers(headers),
    })
  }
}

/**
 * Response assertion helpers
 */
export class ResponseAssertions {
  /**
   * Assert response status
   */
  static assertStatus(response: Response, expectedStatus: number) {
    expect(response.status).toBe(expectedStatus)
  }

  /**
   * Assert response headers
   */
  static assertHeaders(response: Response, expectedHeaders: Record<string, string>) {
    Object.entries(expectedHeaders).forEach(([key, value]) => {
      expect(response.headers.get(key)).toBe(value)
    })
  }

  /**
   * Assert JSON response
   */
  static async assertJsonResponse(response: Response, expectedData: any) {
    expect(response.headers.get('content-type')).toContain('application/json')
    const data = await response.json()
    expect(data).toEqual(expectedData)
    return data
  }

  /**
   * Assert partial JSON response
   */
  static async assertPartialJsonResponse(response: Response, expectedPartial: any) {
    expect(response.headers.get('content-type')).toContain('application/json')
    const data = await response.json()
    expect(data).toMatchObject(expectedPartial)
    return data
  }

  /**
   * Assert text response
   */
  static async assertTextResponse(response: Response, expectedText: string) {
    const text = await response.text()
    expect(text).toBe(expectedText)
    return text
  }

  /**
   * Assert response contains text
   */
  static async assertResponseContains(response: Response, expectedSubstring: string) {
    const text = await response.text()
    expect(text).toContain(expectedSubstring)
    return text
  }

  /**
   * Assert error response
   */
  static async assertErrorResponse(response: Response, expectedStatus: number, expectedMessage?: string) {
    expect(response.status).toBe(expectedStatus)
    
    if (expectedMessage) {
      const data = await response.json()
      expect(data.error || data.message).toContain(expectedMessage)
    }
  }

  /**
   * Assert CORS headers
   */
  static assertCorsHeaders(response: Response, allowedOrigin: string = '*') {
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe(allowedOrigin)
    expect(response.headers.get('Access-Control-Allow-Methods')).toBeTruthy()
    expect(response.headers.get('Access-Control-Allow-Headers')).toBeTruthy()
  }

  /**
   * Assert streaming response
   */
  static assertStreamingResponse(response: Response) {
    expect(response.headers.get('content-type')).toContain('text/stream')
    expect(response.body).toBeTruthy()
  }

  /**
   * Assert rate limit headers
   */
  static assertRateLimitHeaders(response: Response) {
    expect(response.headers.get('X-RateLimit-Limit')).toBeTruthy()
    expect(response.headers.get('X-RateLimit-Remaining')).toBeTruthy()
    expect(response.headers.get('X-RateLimit-Reset')).toBeTruthy()
  }
}

/**
 * API route test runner
 */
export class ApiRouteTestRunner {
  private baseUrl: string
  private defaultHeaders: Record<string, string>

  constructor(baseUrl: string = 'http://localhost:3000', defaultHeaders: Record<string, string> = {}) {
    this.baseUrl = baseUrl
    this.defaultHeaders = defaultHeaders
  }

  /**
   * Test GET endpoint
   */
  async testGet(
    path: string,
    handler: (request: NextRequest) => Promise<Response>,
    expectedStatus: number = 200,
    headers: Record<string, string> = {}
  ) {
    const url = `${this.baseUrl}${path}`
    const request = MockRequestFactory.createGetRequest(url, { ...this.defaultHeaders, ...headers })
    
    const response = await handler(request)
    ResponseAssertions.assertStatus(response, expectedStatus)
    
    return response
  }

  /**
   * Test POST endpoint
   */
  async testPost(
    path: string,
    body: any,
    handler: (request: NextRequest) => Promise<Response>,
    expectedStatus: number = 200,
    headers: Record<string, string> = {}
  ) {
    const url = `${this.baseUrl}${path}`
    const request = MockRequestFactory.createPostRequest(url, body, { ...this.defaultHeaders, ...headers })
    
    const response = await handler(request)
    ResponseAssertions.assertStatus(response, expectedStatus)
    
    return response
  }

  /**
   * Test PUT endpoint
   */
  async testPut(
    path: string,
    body: any,
    handler: (request: NextRequest) => Promise<Response>,
    expectedStatus: number = 200,
    headers: Record<string, string> = {}
  ) {
    const url = `${this.baseUrl}${path}`
    const request = MockRequestFactory.createPutRequest(url, body, { ...this.defaultHeaders, ...headers })
    
    const response = await handler(request)
    ResponseAssertions.assertStatus(response, expectedStatus)
    
    return response
  }

  /**
   * Test DELETE endpoint
   */
  async testDelete(
    path: string,
    handler: (request: NextRequest) => Promise<Response>,
    expectedStatus: number = 200,
    headers: Record<string, string> = {}
  ) {
    const url = `${this.baseUrl}${path}`
    const request = MockRequestFactory.createDeleteRequest(url, { ...this.defaultHeaders, ...headers })
    
    const response = await handler(request)
    ResponseAssertions.assertStatus(response, expectedStatus)
    
    return response
  }

  /**
   * Test authenticated endpoint
   */
  async testAuthenticatedEndpoint(
    method: string,
    path: string,
    token: string,
    handler: (request: NextRequest) => Promise<Response>,
    body?: any,
    expectedStatus: number = 200
  ) {
    const url = `${this.baseUrl}${path}`
    const request = MockRequestFactory.createAuthenticatedRequest(method, url, token, body, this.defaultHeaders)
    
    const response = await handler(request)
    ResponseAssertions.assertStatus(response, expectedStatus)
    
    return response
  }

  /**
   * Test endpoint with query parameters
   */
  async testWithQuery(
    method: string,
    path: string,
    params: Record<string, string>,
    handler: (request: NextRequest) => Promise<Response>,
    expectedStatus: number = 200
  ) {
    const url = `${this.baseUrl}${path}`
    const request = MockRequestFactory.createRequestWithQuery(method, url, params, this.defaultHeaders)
    
    const response = await handler(request)
    ResponseAssertions.assertStatus(response, expectedStatus)
    
    return response
  }
}

/**
 * Database test helpers
 */
export class DatabaseTestHelpers {
  /**
   * Create test data setup
   */
  static createTestData<T>(factory: () => T, count: number = 1): T[] {
    return Array.from({ length: count }, () => factory())
  }

  /**
   * Mock database operations
   */
  static mockDatabase() {
    const data = new Map<string, any[]>()

    return {
      // Find operations
      find: (table: string, query: any = {}) => {
        const items = data.get(table) || []
        return items.filter(item => 
          Object.entries(query).every(([key, value]) => item[key] === value)
        )
      },

      // Find by ID
      findById: (table: string, id: string) => {
        const items = data.get(table) || []
        return items.find(item => item.id === id)
      },

      // Insert operations
      insert: (table: string, item: any) => {
        if (!data.has(table)) {
          data.set(table, [])
        }
        const items = data.get(table)!
        const newItem = { ...item, id: item.id || `test-id-${Date.now()}` }
        items.push(newItem)
        return newItem
      },

      // Update operations
      update: (table: string, id: string, updates: any) => {
        const items = data.get(table) || []
        const index = items.findIndex(item => item.id === id)
        if (index >= 0) {
          items[index] = { ...items[index], ...updates }
          return items[index]
        }
        return null
      },

      // Delete operations
      delete: (table: string, id: string) => {
        const items = data.get(table) || []
        const index = items.findIndex(item => item.id === id)
        if (index >= 0) {
          return items.splice(index, 1)[0]
        }
        return null
      },

      // Clear all data
      clear: () => {
        data.clear()
      },

      // Get all data for a table
      getAll: (table: string) => {
        return data.get(table) || []
      },
    }
  }
}

/**
 * E2E API mocking patterns
 */
export class E2EApiMockPatterns {
  /**
   * Mock successful API responses
   */
  static mockSuccessfulResponses() {
    return {
      '/api/tasks': {
        GET: { tasks: [{ id: '1', title: 'Test Task', status: 'pending' }] },
        POST: { id: '2', title: 'New Task', status: 'pending' },
      },
      '/api/auth/status': {
        GET: { authenticated: true, user: { id: 'test-user', name: 'Test User' } },
      },
      '/api/environments': {
        GET: { environments: [{ id: '1', name: 'Test Environment' }] },
        POST: { id: '2', name: 'New Environment' },
      },
    }
  }

  /**
   * Mock error responses
   */
  static mockErrorResponses() {
    return {
      '/api/tasks/999': {
        GET: { status: 404, error: 'Task not found' },
      },
      '/api/unauthorized': {
        GET: { status: 401, error: 'Unauthorized' },
      },
      '/api/server-error': {
        GET: { status: 500, error: 'Internal server error' },
      },
    }
  }

  /**
   * Mock streaming responses
   */
  static mockStreamingResponses() {
    return {
      '/api/ai/stream': {
        POST: {
          stream: true,
          chunks: [
            'Hello',
            ' ',
            'World',
            '!',
          ],
        },
      },
    }
  }

  /**
   * Create mock route handler for Playwright
   */
  static createPlaywrightMockHandler(mockResponses: Record<string, any>) {
    return async (route: any) => {
      const url = new URL(route.request().url())
      const path = url.pathname
      const method = route.request().method()

      const mockResponse = mockResponses[path]?.[method]

      if (mockResponse) {
        if (mockResponse.stream) {
          // Handle streaming responses
          await route.fulfill({
            status: 200,
            headers: { 'Content-Type': 'text/stream' },
            body: mockResponse.chunks.join(''),
          })
        } else if (mockResponse.status) {
          // Handle error responses
          await route.fulfill({
            status: mockResponse.status,
            contentType: 'application/json',
            body: JSON.stringify({ error: mockResponse.error }),
          })
        } else {
          // Handle successful responses
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(mockResponse),
          })
        }
      } else {
        // Pass through unmatched requests
        await route.continue()
      }
    }
  }
}

/**
 * Test scenario builders
 */
export const TestScenarios = {
  /**
   * Create a CRUD test scenario
   */
  createCrudScenario: (resourceName: string, basePath: string) => ({
    name: `${resourceName} CRUD operations`,
    tests: [
      {
        name: `should create ${resourceName}`,
        method: 'POST',
        path: basePath,
        body: { name: `Test ${resourceName}` },
        expectedStatus: 201,
      },
      {
        name: `should get ${resourceName} list`,
        method: 'GET',
        path: basePath,
        expectedStatus: 200,
      },
      {
        name: `should get ${resourceName} by id`,
        method: 'GET',
        path: `${basePath}/1`,
        expectedStatus: 200,
      },
      {
        name: `should update ${resourceName}`,
        method: 'PUT',
        path: `${basePath}/1`,
        body: { name: `Updated ${resourceName}` },
        expectedStatus: 200,
      },
      {
        name: `should delete ${resourceName}`,
        method: 'DELETE',
        path: `${basePath}/1`,
        expectedStatus: 204,
      },
    ],
  }),

  /**
   * Create an authentication test scenario
   */
  createAuthScenario: () => ({
    name: 'Authentication flow',
    tests: [
      {
        name: 'should reject unauthenticated requests',
        method: 'GET',
        path: '/api/protected',
        expectedStatus: 401,
      },
      {
        name: 'should accept valid token',
        method: 'GET',
        path: '/api/protected',
        headers: { Authorization: 'Bearer valid-token' },
        expectedStatus: 200,
      },
      {
        name: 'should reject invalid token',
        method: 'GET',
        path: '/api/protected',
        headers: { Authorization: 'Bearer invalid-token' },
        expectedStatus: 401,
      },
    ],
  }),

  /**
   * Create an error handling test scenario
   */
  createErrorHandlingScenario: () => ({
    name: 'Error handling',
    tests: [
      {
        name: 'should handle validation errors',
        method: 'POST',
        path: '/api/tasks',
        body: { invalidField: 'value' },
        expectedStatus: 400,
      },
      {
        name: 'should handle not found errors',
        method: 'GET',
        path: '/api/tasks/999',
        expectedStatus: 404,
      },
      {
        name: 'should handle method not allowed',
        method: 'PATCH',
        path: '/api/tasks',
        expectedStatus: 405,
      },
    ],
  }),
}