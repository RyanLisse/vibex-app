import { SpanStatusCode, trace } from '@opentelemetry/api'
import { type NextRequest, NextResponse } from 'next/server'
import { type ZodSchema, z } from 'zod'
import { getLogger } from '@/lib/logging/safe-wrapper'
import { createApiErrorResponse, createApiSuccessResponse } from '@/src/schemas/api-routes'

interface HandlerOptions<TBody = any, TQuery = any, TParams = any> {
  bodySchema?: ZodSchema<TBody>
  querySchema?: ZodSchema<TQuery>
  paramsSchema?: ZodSchema<TParams>
  tracerName?: string
  operationName: string
}

type HandlerFunction<TBody, TQuery, TParams> = (context: {
  body?: TBody
  query?: TQuery
  params?: TParams
  request: NextRequest
}) => Promise<NextResponse | any>

export function createApiHandler<TBody = any, TQuery = any, TParams = any>(
  options: HandlerOptions<TBody, TQuery, TParams>,
  handler: HandlerFunction<TBody, TQuery, TParams>
) {
  return async (
    request: NextRequest,
    routeContext?: { params?: TParams }
  ): Promise<NextResponse> => {
    const tracer = trace.getTracer(options.tracerName || 'api')
    const span = tracer.startSpan(options.operationName)
    const logger = getLogger(options.operationName)

    try {
      let body: TBody | undefined
      let query: TQuery | undefined
      let params: TParams | undefined

      // Parse and validate body if schema provided
      if (options.bodySchema && ['POST', 'PUT', 'PATCH'].includes(request.method)) {
        try {
          const rawBody = await request.json()
          body = options.bodySchema.parse(rawBody)
        } catch (error) {
          if (error instanceof z.ZodError) {
            return createApiErrorResponse('Invalid request data', 400, error.issues)
          }
          throw error
        }
      }

      // Parse and validate query parameters if schema provided
      if (options.querySchema) {
        const { searchParams } = new URL(request.url)
        const queryParams = Object.fromEntries(searchParams.entries())
        query = options.querySchema.parse(queryParams)
      }

      // Validate route parameters if schema provided
      if (options.paramsSchema && routeContext?.params) {
        params = options.paramsSchema.parse(routeContext.params)
      }

      // Execute the handler
      const result = await handler({
        body,
        query,
        params,
        request,
      })

      // If handler returns a NextResponse, use it directly
      if (result instanceof NextResponse) {
        span.setStatus({ code: SpanStatusCode.OK })
        return result
      }

      // Otherwise, wrap in success response
      span.setStatus({ code: SpanStatusCode.OK })
      return createApiSuccessResponse(result)
    } catch (error) {
      span.recordException(error as Error)
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: (error as Error).message,
      })

      logger.error(`Error in ${options.operationName}`, error as Error)

      if (error instanceof z.ZodError) {
        return createApiErrorResponse('Invalid request data', 400, error.issues)
      }

      return createApiErrorResponse(
        error instanceof Error ? error.message : 'Internal server error',
        500
      )
    } finally {
      span.end()
    }
  }
}

// Helper to extract common patterns
export function createPaginatedHandler<T>(
  options: HandlerOptions<any, any, any> & {
    fetchData: (params: any) => Promise<{ items: T[]; total: number }>
  }
) {
  return createApiHandler(options, async ({ query }) => {
    const { items, total } = await options.fetchData(query)

    return {
      items,
      pagination: {
        page: query?.page || 1,
        limit: query?.limit || 20,
        total,
        totalPages: Math.ceil(total / (query?.limit || 20)),
      },
    }
  })
}
