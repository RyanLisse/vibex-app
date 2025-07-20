/**
 * Base API Error Infrastructure
 *
 * Provides standardized error handling across all API routes with
 * automatic tracing, observability, and consistent error responses.
 */

import { SpanStatusCode, trace } from '@opentelemetry/api'

export interface APIErrorOptions {
  statusCode?: number
  code?: string
  details?: any
  context?: Record<string, any>
}

/**
 * Base API Error class for all API route errors
 * Automatically integrates with observability and tracing
 */
export class BaseAPIError extends Error {
  public readonly statusCode: number
  public readonly code: string
  public readonly details?: any
  public readonly context?: Record<string, any>
  public readonly timestamp: Date

  constructor(message: string, options: APIErrorOptions = {}) {
    super(message)
    this.name = 'BaseAPIError'
    this.statusCode = options.statusCode || 500
    this.code = options.code || 'INTERNAL_ERROR'
    this.details = options.details
    this.context = options.context
    this.timestamp = new Date()

    // Capture stack trace
    Error.captureStackTrace(this, this.constructor)

    // Record error in observability
    if (process.env.NEXT_PHASE !== 'phase-production-build') {
      this.recordError()
    }
  }

  private async recordError() {
    try {
      const { observability } = await import('@/lib/observability')

      // Record error metrics
      observability.metrics.errorRate(1, 'api_error', {
        error_code: this.code,
        status_code: String(this.statusCode),
      })

      // Record error event
      observability.events.collector
        .collectEvent(
          'api_error',
          'error',
          this.message,
          {
            code: this.code,
            statusCode: this.statusCode,
            details: this.details,
            context: this.context,
            stack: this.stack,
          },
          'api',
          ['error', this.code.toLowerCase()]
        )
        .catch(console.error)
    } catch (error) {
      // Ignore observability errors
    }
  }

  /**
   * Create a JSON response object for this error
   */
  toJSON() {
    return {
      success: false,
      error: this.message,
      code: this.code,
      statusCode: this.statusCode,
      details: this.details,
      timestamp: this.timestamp.toISOString(),
    }
  }

  /**
   * Record this error in the current trace span
   */
  recordInSpan(span: any) {
    span.recordException(this)
    span.setStatus({ code: SpanStatusCode.ERROR, message: this.message })
    span.setAttributes({
      'error.type': this.name,
      'error.code': this.code,
      'error.statusCode': this.statusCode,
      'error.message': this.message,
    })
  }
}

/**
 * Validation error for request validation failures
 */
export class ValidationError extends BaseAPIError {
  constructor(message: string, validationErrors?: any[]) {
    super(message, {
      statusCode: 400,
      code: 'VALIDATION_ERROR',
      details: validationErrors,
    })
    this.name = 'ValidationError'
  }
}

/**
 * Not found error for missing resources
 */
export class NotFoundError extends BaseAPIError {
  constructor(resource: string, id?: string) {
    const message = id ? `${resource} with id ${id} not found` : `${resource} not found`
    super(message, {
      statusCode: 404,
      code: 'NOT_FOUND',
      context: { resource, id },
    })
    this.name = 'NotFoundError'
  }
}

/**
 * Unauthorized error for authentication failures
 */
export class UnauthorizedError extends BaseAPIError {
  constructor(message = 'Unauthorized') {
    super(message, {
      statusCode: 401,
      code: 'UNAUTHORIZED',
    })
    this.name = 'UnauthorizedError'
  }
}

/**
 * Forbidden error for authorization failures
 */
export class ForbiddenError extends BaseAPIError {
  constructor(message = 'Forbidden') {
    super(message, {
      statusCode: 403,
      code: 'FORBIDDEN',
    })
    this.name = 'ForbiddenError'
  }
}

/**
 * Conflict error for resource conflicts
 */
export class ConflictError extends BaseAPIError {
  constructor(message: string, details?: any) {
    super(message, {
      statusCode: 409,
      code: 'CONFLICT',
      details,
    })
    this.name = 'ConflictError'
  }
}

/**
 * Rate limit error
 */
export class RateLimitError extends BaseAPIError {
  constructor(retryAfter?: number) {
    super('Rate limit exceeded', {
      statusCode: 429,
      code: 'RATE_LIMIT_EXCEEDED',
      details: { retryAfter },
    })
    this.name = 'RateLimitError'
  }
}

/**
 * Database error wrapper
 */
export class DatabaseError extends BaseAPIError {
  constructor(message: string, originalError?: Error) {
    super(message, {
      statusCode: 500,
      code: 'DATABASE_ERROR',
      details: originalError?.message,
    })
    this.name = 'DatabaseError'
  }
}

/**
 * External service error
 */
export class ExternalServiceError extends BaseAPIError {
  constructor(service: string, originalError?: Error) {
    super(`External service error: ${service}`, {
      statusCode: 502,
      code: 'EXTERNAL_SERVICE_ERROR',
      context: { service },
      details: originalError?.message,
    })
    this.name = 'ExternalServiceError'
  }
}
