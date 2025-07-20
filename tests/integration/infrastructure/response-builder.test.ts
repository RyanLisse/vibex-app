import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  ResponseBuilder,
  type SuccessResponse,
  type ErrorResponse,
  type PaginatedResponse,
} from '../../../lib/api/base/response-builder'
import { BaseAPIError, ValidationError, NotFoundError } from '../../../lib/api/base/errors'

// Mock crypto.randomUUID
const mockUUID = 'test-uuid-1234-5678-90ab-cdef'
vi.stubGlobal('crypto', {
  randomUUID: vi.fn(() => mockUUID),
})

describe('ResponseBuilder Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Success responses', () => {
    it('should create basic success response', () => {
      const data = { id: 1, name: 'Test' }
      const response = ResponseBuilder.success(data)

      expect(response).toMatchObject({
        success: true,
        data,
        message: undefined,
        meta: {
          timestamp: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
          version: '1.0.0',
          requestId: mockUUID,
        },
      })
    })

    it('should create success response with message', () => {
      const data = { created: true }
      const message = 'Operation completed successfully'
      const response = ResponseBuilder.success(data, message)

      expect(response).toMatchObject({
        success: true,
        data,
        message,
        meta: {
          timestamp: expect.any(String),
          version: '1.0.0',
          requestId: mockUUID,
        },
      })
    })

    it('should create success response with custom requestId', () => {
      const customRequestId = 'custom-request-id'
      const response = ResponseBuilder.success({ test: true }, undefined, customRequestId)

      expect(response.meta.requestId).toBe(customRequestId)
    })

    it('should handle null data', () => {
      const response = ResponseBuilder.success(null)

      expect(response.success).toBe(true)
      expect(response.data).toBeNull()
    })

    it('should handle array data', () => {
      const data = [{ id: 1 }, { id: 2 }, { id: 3 }]
      const response = ResponseBuilder.success(data)

      expect(response.data).toEqual(data)
    })

    it('should handle nested object data', () => {
      const data = {
        user: {
          id: 1,
          profile: {
            name: 'John',
            settings: {
              theme: 'dark',
              notifications: true,
            },
          },
        },
      }
      const response = ResponseBuilder.success(data)

      expect(response.data).toEqual(data)
    })
  })

  describe('Error responses', () => {
    it('should create error response from BaseAPIError', () => {
      const error = new BaseAPIError('Something went wrong', {
        statusCode: 500,
        code: 'INTERNAL_ERROR',
        details: { reason: 'Database connection failed' },
      })

      const response = ResponseBuilder.error(error)

      expect(response).toMatchObject({
        success: false,
        error: 'Something went wrong',
        code: 'INTERNAL_ERROR',
        statusCode: 500,
        details: { reason: 'Database connection failed' },
        timestamp: error.timestamp.toISOString(),
        meta: {
          requestId: mockUUID,
          version: '1.0.0',
        },
      })
    })

    it('should create error response from ValidationError', () => {
      const validationDetails = [
        { field: 'email', message: 'Invalid email format' },
        { field: 'password', message: 'Too short' },
      ]
      const error = new ValidationError('Validation failed', validationDetails)

      const response = ResponseBuilder.error(error)

      expect(response).toMatchObject({
        success: false,
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        statusCode: 400,
        details: validationDetails,
      })
    })

    it('should create error response from NotFoundError', () => {
      const error = new NotFoundError('User', '123')
      const response = ResponseBuilder.error(error)

      expect(response).toMatchObject({
        success: false,
        error: 'User with id 123 not found',
        code: 'NOT_FOUND',
        statusCode: 404,
      })
    })

    it('should use custom requestId for error', () => {
      const error = new BaseAPIError('Error')
      const customRequestId = 'error-request-id'
      const response = ResponseBuilder.error(error, customRequestId)

      expect(response.meta.requestId).toBe(customRequestId)
    })
  })

  describe('Paginated responses', () => {
    it('should create paginated response', () => {
      const items = [
        { id: 1, name: 'Item 1' },
        { id: 2, name: 'Item 2' },
        { id: 3, name: 'Item 3' },
      ]
      const pagination = {
        page: 2,
        limit: 10,
        total: 25,
        totalPages: 3,
        hasNext: true,
        hasPrev: true,
      }

      const response = ResponseBuilder.paginated(items, pagination)

      expect(response).toMatchObject({
        success: true,
        data: items,
        message: undefined,
        pagination,
        meta: {
          timestamp: expect.any(String),
          version: '1.0.0',
          requestId: mockUUID,
        },
      })
    })

    it('should create paginated response with message', () => {
      const items: any[] = []
      const pagination = {
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false,
      }
      const message = 'No results found'

      const response = ResponseBuilder.paginated(items, pagination, message)

      expect(response.message).toBe(message)
      expect(response.data).toEqual([])
      expect(response.pagination).toEqual(pagination)
    })

    it('should handle first page pagination', () => {
      const items = Array(10).fill({ id: 1 })
      const pagination = {
        page: 1,
        limit: 10,
        total: 50,
        totalPages: 5,
        hasNext: true,
        hasPrev: false,
      }

      const response = ResponseBuilder.paginated(items, pagination)

      expect(response.pagination.hasPrev).toBe(false)
      expect(response.pagination.hasNext).toBe(true)
    })

    it('should handle last page pagination', () => {
      const items = Array(5).fill({ id: 1 })
      const pagination = {
        page: 5,
        limit: 10,
        total: 45,
        totalPages: 5,
        hasNext: false,
        hasPrev: true,
      }

      const response = ResponseBuilder.paginated(items, pagination)

      expect(response.pagination.hasPrev).toBe(true)
      expect(response.pagination.hasNext).toBe(false)
    })
  })

  describe('fromQueryResult', () => {
    it('should create paginated response from query result', () => {
      const queryResult = {
        items: [
          { id: 1, title: 'Post 1' },
          { id: 2, title: 'Post 2' },
        ],
        pagination: {
          page: 1,
          limit: 10,
          total: 2,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        },
      }

      const response = ResponseBuilder.fromQueryResult(queryResult)

      expect(response).toMatchObject({
        success: true,
        data: queryResult.items,
        pagination: queryResult.pagination,
        meta: {
          timestamp: expect.any(String),
          version: '1.0.0',
          requestId: mockUUID,
        },
      })
    })

    it('should pass message and requestId through', () => {
      const queryResult = {
        items: [],
        pagination: {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false,
        },
      }
      const message = 'Query returned no results'
      const requestId = 'query-request-id'

      const response = ResponseBuilder.fromQueryResult(queryResult, message, requestId)

      expect(response.message).toBe(message)
      expect(response.meta.requestId).toBe(requestId)
    })
  })

  describe('Specialized response methods', () => {
    it('should create created response (201)', () => {
      const newResource = { id: 123, name: 'New Resource' }
      const response = ResponseBuilder.created(newResource)

      expect(response).toMatchObject({
        success: true,
        data: newResource,
        message: 'Resource created successfully',
      })
    })

    it('should create created response with custom message', () => {
      const response = ResponseBuilder.created({ id: 1 }, 'User account created')

      expect(response.message).toBe('User account created')
    })

    it('should create updated response', () => {
      const updatedResource = { id: 123, name: 'Updated Resource' }
      const response = ResponseBuilder.updated(updatedResource)

      expect(response).toMatchObject({
        success: true,
        data: updatedResource,
        message: 'Resource updated successfully',
      })
    })

    it('should create deleted response', () => {
      const response = ResponseBuilder.deleted()

      expect(response).toMatchObject({
        success: true,
        data: null,
        message: 'Resource deleted successfully',
      })
    })

    it('should create deleted response with custom message', () => {
      const response = ResponseBuilder.deleted('User permanently removed')

      expect(response.message).toBe('User permanently removed')
    })

    it('should create no content response (204)', () => {
      const response = ResponseBuilder.noContent()

      expect(response).toMatchObject({
        success: true,
        data: null,
        message: undefined,
      })
    })

    it('should create accepted response (202)', () => {
      const jobData = { jobId: 'job-123', status: 'queued' }
      const response = ResponseBuilder.accepted(jobData)

      expect(response).toMatchObject({
        success: true,
        data: jobData,
        message: 'Request accepted for processing',
      })
    })

    it('should create accepted response with custom message', () => {
      const response = ResponseBuilder.accepted({ taskId: 'task-456' }, 'Export job queued')

      expect(response.message).toBe('Export job queued')
    })
  })

  describe('Batch response', () => {
    it('should create batch response with all successful results', () => {
      const results = [
        { success: true, data: { id: 1, processed: true } },
        { success: true, data: { id: 2, processed: true } },
        { success: true, data: { id: 3, processed: true } },
      ]

      const response = ResponseBuilder.batch(results)

      expect(response).toMatchObject({
        success: true,
        data: {
          succeeded: 3,
          failed: 0,
          results,
        },
      })
    })

    it('should create batch response with mixed results', () => {
      const results = [
        { success: true, data: { id: 1 } },
        { success: false, error: 'Validation failed' },
        { success: true, data: { id: 3 } },
        { success: false, error: 'Not found' },
      ]

      const response = ResponseBuilder.batch(results)

      expect(response).toMatchObject({
        success: true,
        data: {
          succeeded: 2,
          failed: 2,
          results,
        },
      })
    })

    it('should create batch response with all failed results', () => {
      const results = [
        { success: false, error: 'Error 1' },
        { success: false, error: 'Error 2' },
      ]

      const response = ResponseBuilder.batch(results)

      expect(response.data.succeeded).toBe(0)
      expect(response.data.failed).toBe(2)
    })

    it('should handle empty batch', () => {
      const response = ResponseBuilder.batch([])

      expect(response).toMatchObject({
        success: true,
        data: {
          succeeded: 0,
          failed: 0,
          results: [],
        },
      })
    })

    it('should include custom message for batch', () => {
      const results = [{ success: true, data: { processed: true } }]
      const response = ResponseBuilder.batch(results, 'Batch processing complete')

      expect(response.message).toBe('Batch processing complete')
    })
  })

  describe('Type safety', () => {
    it('should maintain type safety for success response', () => {
      interface User {
        id: number
        name: string
        email: string
      }

      const user: User = { id: 1, name: 'John', email: 'john@example.com' }
      const response: SuccessResponse<User> = ResponseBuilder.success(user)

      // TypeScript should enforce these types
      expect(response.data.id).toBe(1)
      expect(response.data.name).toBe('John')
      expect(response.data.email).toBe('john@example.com')
    })

    it('should maintain type safety for paginated response', () => {
      interface Product {
        id: number
        name: string
        price: number
      }

      const products: Product[] = [
        { id: 1, name: 'Product 1', price: 10.99 },
        { id: 2, name: 'Product 2', price: 20.99 },
      ]

      const response: PaginatedResponse<Product> = ResponseBuilder.paginated(products, {
        page: 1,
        limit: 10,
        total: 2,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      })

      expect(response.data[0].price).toBe(10.99)
      expect(response.data[1].price).toBe(20.99)
    })
  })

  describe('Response metadata', () => {
    it('should include consistent API version', () => {
      const responses = [
        ResponseBuilder.success({}),
        ResponseBuilder.created({}),
        ResponseBuilder.updated({}),
        ResponseBuilder.deleted(),
        ResponseBuilder.paginated([], {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false,
        }),
      ]

      responses.forEach((response) => {
        expect(response.meta.version).toBe('1.0.0')
      })
    })

    it('should generate valid ISO timestamps', () => {
      const response = ResponseBuilder.success({})
      const timestamp = new Date(response.meta.timestamp)

      expect(timestamp.toISOString()).toBe(response.meta.timestamp)
      expect(timestamp.getTime()).toBeLessThanOrEqual(Date.now())
    })

    it('should use provided requestId consistently', () => {
      const requestId = 'consistent-request-id'

      const successResponse = ResponseBuilder.success({}, undefined, requestId)
      const errorResponse = ResponseBuilder.error(new BaseAPIError('Error'), requestId)
      const paginatedResponse = ResponseBuilder.paginated(
        [],
        {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false,
        },
        undefined,
        requestId
      )

      expect(successResponse.meta.requestId).toBe(requestId)
      expect(errorResponse.meta.requestId).toBe(requestId)
      expect(paginatedResponse.meta.requestId).toBe(requestId)
    })
  })

  describe('Real-world scenarios', () => {
    it('should handle user registration response', () => {
      const newUser = {
        id: 'user-123',
        email: 'newuser@example.com',
        createdAt: new Date().toISOString(),
      }

      const response = ResponseBuilder.created(
        newUser,
        'User registration successful. Please check your email for verification.'
      )

      expect(response.success).toBe(true)
      expect(response.data).toEqual(newUser)
      expect(response.message).toContain('verification')
    })

    it('should handle search results response', () => {
      const searchResults = {
        items: [
          { id: 1, title: 'Result 1', score: 0.95 },
          { id: 2, title: 'Result 2', score: 0.87 },
        ],
        pagination: {
          page: 1,
          limit: 20,
          total: 2,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        },
      }

      const response = ResponseBuilder.fromQueryResult(
        searchResults,
        `Found ${searchResults.pagination.total} results`
      )

      expect(response.message).toBe('Found 2 results')
      expect(response.data).toHaveLength(2)
    })

    it('should handle bulk operation response', () => {
      const bulkResults = [
        { success: true, data: { id: 1, status: 'imported' } },
        { success: true, data: { id: 2, status: 'imported' } },
        { success: false, error: 'Duplicate entry' },
        { success: true, data: { id: 4, status: 'imported' } },
        { success: false, error: 'Invalid data format' },
      ]

      const response = ResponseBuilder.batch(bulkResults, 'Bulk import completed with errors')

      expect(response.data.succeeded).toBe(3)
      expect(response.data.failed).toBe(2)
      expect(response.message).toContain('errors')
    })

    it('should handle async job submission', () => {
      const jobInfo = {
        jobId: 'export-job-456',
        estimatedTime: 300, // seconds
        queuePosition: 5,
      }

      const response = ResponseBuilder.accepted(
        jobInfo,
        'Export job submitted. You will receive an email when complete.'
      )

      expect(response.data.jobId).toBe('export-job-456')
      expect(response.message).toContain('email')
    })
  })
})
