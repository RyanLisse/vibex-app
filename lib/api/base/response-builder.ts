/**
 * Response Builder Infrastructure
 *
 * Provides consistent API response formatting with metadata,
 * pagination support, and standardized error responses.
 */

import { BaseAPIError } from './errors'

export interface SuccessResponse<T = any> {
  success: true
  data: T
  message?: string
  meta: {
    timestamp: string
    version: string
    requestId: string
  }
}

export interface ErrorResponse {
  success: false
  error: string
  code: string
  statusCode: number
  details?: any
  timestamp: string
  meta: {
    requestId: string
    version: string
  }
}

export interface PaginatedResponse<T = any> extends SuccessResponse<T[]> {
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

/**
 * Builder for standardized API responses
 */
export class ResponseBuilder {
  private static readonly API_VERSION = '1.0.0'

  /**
   * Create a success response
   */
  static success<T>(
    data: T,
    message?: string,
    requestId = crypto.randomUUID()
  ): SuccessResponse<T> {
    return {
      success: true,
      data,
      message,
      meta: {
        timestamp: new Date().toISOString(),
        version: this.API_VERSION,
        requestId,
      },
    }
  }

  /**
   * Create an error response from BaseAPIError
   */
  static error(error: BaseAPIError, requestId = crypto.randomUUID()): ErrorResponse {
    return {
      success: false,
      error: error.message,
      code: error.code,
      statusCode: error.statusCode,
      details: error.details,
      timestamp: error.timestamp.toISOString(),
      meta: {
        requestId,
        version: this.API_VERSION,
      },
    }
  }

  /**
   * Create a paginated response
   */
  static paginated<T>(
    items: T[],
    pagination: {
      page: number
      limit: number
      total: number
      totalPages: number
      hasNext: boolean
      hasPrev: boolean
    },
    message?: string,
    requestId = crypto.randomUUID()
  ): PaginatedResponse<T> {
    return {
      success: true,
      data: items,
      message,
      pagination,
      meta: {
        timestamp: new Date().toISOString(),
        version: this.API_VERSION,
        requestId,
      },
    }
  }

  /**
   * Create a paginated response from query result
   */
  static fromQueryResult<T>(
    result: {
      items: T[]
      pagination: {
        page: number
        limit: number
        total: number
        totalPages: number
        hasNext: boolean
        hasPrev: boolean
      }
    },
    message?: string,
    requestId = crypto.randomUUID()
  ): PaginatedResponse<T> {
    return this.paginated(result.items, result.pagination, message, requestId)
  }

  /**
   * Create a created response (201)
   */
  static created<T>(
    data: T,
    message = 'Resource created successfully',
    requestId = crypto.randomUUID()
  ): SuccessResponse<T> {
    return this.success(data, message, requestId)
  }

  /**
   * Create an updated response
   */
  static updated<T>(
    data: T,
    message = 'Resource updated successfully',
    requestId = crypto.randomUUID()
  ): SuccessResponse<T> {
    return this.success(data, message, requestId)
  }

  /**
   * Create a deleted response
   */
  static deleted(
    message = 'Resource deleted successfully',
    requestId = crypto.randomUUID()
  ): SuccessResponse<null> {
    return this.success(null, message, requestId)
  }

  /**
   * Create a no content response (204)
   */
  static noContent(requestId = crypto.randomUUID()): SuccessResponse<null> {
    return this.success(null, undefined, requestId)
  }

  /**
   * Create an accepted response (202)
   */
  static accepted<T = any>(
    data: T,
    message = 'Request accepted for processing',
    requestId = crypto.randomUUID()
  ): SuccessResponse<T> {
    return this.success(data, message, requestId)
  }

  /**
   * Create a batch response with mixed results
   */
  static batch<T = any>(
    results: Array<{ success: boolean; data?: T; error?: string }>,
    message?: string,
    requestId = crypto.randomUUID()
  ): SuccessResponse<{
    succeeded: number
    failed: number
    results: typeof results
  }> {
    const succeeded = results.filter((r) => r.success).length
    const failed = results.filter((r) => !r.success).length

    return this.success(
      {
        succeeded,
        failed,
        results,
      },
      message,
      requestId
    )
  }
}
