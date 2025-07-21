/**
 * Base API Handler
 *
 * Provides standardized request handling for all API routes
 * Includes validation, error handling, and response formatting
 */
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { BaseAPIError } from './base-error'
import { createApiErrorResponse, createApiSuccessResponse } from '@/src/schemas/api-routes'

export type RouteHandler<T = any> = (
  request: NextRequest,
  context?: any
) => Promise<NextResponse<T>>

export interface HandlerOptions<TInput = any, TOutput = any> {
  schema?: z.ZodSchema<TInput>
  authenticate?: boolean
  rateLimit?: {
    requests: number
    window: number
  }
}

export abstract class BaseAPIHandler {
  /**
   * Create a standardized route handler
   */
  static createHandler<TInput = any, TOutput = any>(
    options: HandlerOptions<TInput, TOutput>,
    handler: (params: TInput, request: NextRequest) => Promise<TOutput>
  ): RouteHandler<TOutput> {
    return async (request: NextRequest, context?: any) => {
      try {
        // Parse and validate input
        const params = await this.parseInput<TInput>(request, options.schema)

        // Execute handler
        const result = await handler(params, request)

        // Return success response
        return this.successResponse(result, request.method === 'POST' ? 201 : 200)
      } catch (error) {
        return this.handleError(error)
      }
    }
  }

  /**
   * Parse request input based on method
   */
  private static async parseInput<T>(request: NextRequest, schema?: z.ZodSchema<T>): Promise<T> {
    let input: any = {}

    if (request.method === 'GET' || request.method === 'DELETE') {
      const { searchParams } = new URL(request.url)
      input = Object.fromEntries(searchParams.entries())

      // Convert numeric strings to numbers for common params
      if ('page' in input) input.page = parseInt(input.page, 10)
      if ('limit' in input) input.limit = parseInt(input.limit, 10)
    } else {
      const contentType = request.headers.get('content-type')

      if (contentType?.includes('application/json')) {
        input = await request.json()
      } else if (contentType?.includes('multipart/form-data')) {
        const formData = await request.formData()
        input = Object.fromEntries(formData.entries())
      }
    }

    // Validate with schema if provided
    if (schema) {
      return schema.parse(input)
    }

    return input as T
  }

  /**
   * Create success response
   */
  static successResponse<T>(data: T, statusCode = 200): NextResponse {
    return NextResponse.json(createApiSuccessResponse(data), { status: statusCode })
  }

  /**
   * Handle errors and create appropriate error response
   */
  static handleError(error: unknown): NextResponse {
    // Zod validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(createApiErrorResponse('Validation failed', 400, error.issues), {
        status: 400,
      })
    }

    // Our custom API errors
    if (error instanceof BaseAPIError) {
      return NextResponse.json(
        createApiErrorResponse(error.message, error.statusCode, error.details),
        { status: error.statusCode }
      )
    }

    // Generic errors
    if (error instanceof Error) {
      console.error('Unhandled error:', error)

      // Don't expose internal error details in production
      const message =
        process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message

      return NextResponse.json(createApiErrorResponse(message, 500), {
        status: 500,
      })
    }

    // Unknown errors
    console.error('Unknown error:', error)
    return NextResponse.json(createApiErrorResponse('Internal server error', 500), { status: 500 })
  }

  /**
   * Extract user from request (to be implemented based on auth strategy)
   */
  protected static async getUser(request: NextRequest): Promise<string | null> {
    // This should be implemented based on your authentication strategy
    // For example, extracting from JWT token, session, etc.
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return null
    }

    // TODO: Validate token and extract user
    return null
  }

  /**
   * Check rate limits (to be implemented with Redis or similar)
   */
  protected static async checkRateLimit(
    identifier: string,
    limits: { requests: number; window: number }
  ): Promise<boolean> {
    // TODO: Implement rate limiting logic
    return true
  }
}
