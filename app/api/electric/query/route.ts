/**
 * ElectricSQL Query API Route
 *
 * Provides a server-side query endpoint for ElectricSQL to fallback to
 * when local PGlite queries fail or when using server-first sync mode.
 */

import { SpanStatusCode, trace } from '@opentelemetry/api'
import { sql } from 'drizzle-orm'
import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/db/config'
import { observability } from '@/lib/observability'
import {
  createApiErrorResponse,
  createApiSuccessResponse,
  validateApiRequest,
} from '@/src/schemas/api-routes'

// Request validation schema
const ElectricQueryRequestSchema = z.object({
  query: z.string().min(1, 'Query is required'),
  params: z.array(z.unknown()).optional().default([]),
  userId: z.string().optional(),
  syncMode: z.enum(['local-first', 'server-first', 'hybrid']).optional().default('hybrid'),
})

// Response schema
const ElectricQueryResponseSchema = z.object({
  data: z.array(z.record(z.unknown())),
  rowCount: z.number(),
  syncTimestamp: z.string(),
  source: z.literal('server'),
})

type ElectricQueryRequest = z.infer<typeof ElectricQueryRequestSchema>
type ElectricQueryResponse = z.infer<typeof ElectricQueryResponseSchema>

/**
 * POST /api/electric/query
 * Execute a query against the server database for ElectricSQL sync
 */
export async function POST(request: NextRequest) {
  const tracer = observability.getTracer('electric-query-api')

  return tracer.startActiveSpan('electric-query-post', async (span) => {
    try {
      span.setAttributes({
        'http.method': 'POST',
        'http.route': '/api/electric/query',
      })

      // Validate request
      const validationResult = await validateApiRequest(request, ElectricQueryRequestSchema)
      if (!validationResult.success) {
        span.recordException(new Error('Validation failed'))
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: 'Validation failed',
        })
        return createApiErrorResponse('Invalid request data', 400, validationResult.errors)
      }

      const { query, params, userId, syncMode } = validationResult.data

      // Security: Only allow SELECT queries for safety
      const trimmedQuery = query.trim().toLowerCase()
      if (!trimmedQuery.startsWith('select')) {
        span.recordException(new Error('Only SELECT queries are allowed'))
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: 'Invalid query type',
        })
        return createApiErrorResponse('Only SELECT queries are allowed', 400)
      }

      // Add user filtering if userId is provided
      let finalQuery = query
      let finalParams = params || []

      if (userId && !query.toLowerCase().includes('where')) {
        // Add user filter if not already present
        finalQuery = `${query} WHERE user_id = $${(params?.length || 0) + 1}`
        finalParams = [...(params || []), userId]
      }

      span.setAttributes({
        'electric.query.type': 'SELECT',
        'electric.query.hasUserId': !!userId,
        'electric.query.syncMode': syncMode,
        'electric.query.paramCount': finalParams.length,
      })

      // Execute query against the server database
      const startTime = Date.now()
      const result = await db.execute(sql.raw(finalQuery, finalParams))
      const executionTime = Date.now() - startTime

      span.setAttributes({
        'electric.query.executionTime': executionTime,
        'electric.query.rowCount': result.length,
      })

      // Format response
      const response: ElectricQueryResponse = {
        data: result as Record<string, unknown>[],
        rowCount: result.length,
        syncTimestamp: new Date().toISOString(),
        source: 'server',
      }

      span.setStatus({ code: SpanStatusCode.OK })
      return createApiSuccessResponse(response, {
        message: 'Query executed successfully',
        metadata: {
          executionTime,
          syncMode,
          source: 'server',
        },
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'

      span.recordException(error as Error)
      span.setStatus({ code: SpanStatusCode.ERROR, message: errorMessage })

      console.error('Electric query API error:', error)

      return createApiErrorResponse(
        'Failed to execute query',
        500,
        process.env.NODE_ENV === 'development' ? [errorMessage] : undefined
      )
    } finally {
      span.end()
    }
  })
}

/**
 * GET /api/electric/query
 * Health check and configuration endpoint
 */
export async function GET() {
  const tracer = observability.getTracer('electric-query-api')

  return tracer.startActiveSpan('electric-query-get', async (span) => {
    try {
      span.setAttributes({
        'http.method': 'GET',
        'http.route': '/api/electric/query',
      })

      // Basic health check
      const healthCheck = await db.execute(sql`SELECT 1 as health`)
      const isHealthy = healthCheck.length > 0

      const response = {
        status: 'ok',
        healthy: isHealthy,
        timestamp: new Date().toISOString(),
        config: {
          allowedQueryTypes: ['SELECT'],
          maxQueryLength: 10_000,
          supportedSyncModes: ['local-first', 'server-first', 'hybrid'],
        },
        message: 'ElectricSQL query endpoint is operational',
      }

      span.setStatus({ code: SpanStatusCode.OK })
      return createApiSuccessResponse(response)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'

      span.recordException(error as Error)
      span.setStatus({ code: SpanStatusCode.ERROR, message: errorMessage })

      return createApiErrorResponse('Health check failed', 500, [errorMessage])
    } finally {
      span.end()
    }
  })
}
