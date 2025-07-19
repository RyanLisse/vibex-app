/**
 * Performance Monitoring Middleware
 *
 * Provides automatic performance monitoring, tracing, and metrics collection
 * for API routes with OpenTelemetry integration.
 */

import { SpanStatusCode, trace } from '@opentelemetry/api'
import type { NextRequest, NextResponse } from 'next/server'
import { queryPerformanceMonitor } from './query-performance-monitor'
import { observability } from '@/lib/observability'
import { metrics } from '@/lib/observability/metrics'

/**
 * Performance monitoring wrapper for API route handlers
 */
export function withPerformanceMonitoring<T>(
  handler: (request: NextRequest) => Promise<T>
): (request: NextRequest) => Promise<T> {
  return async function monitoredHandler(request: NextRequest): Promise<T> {
    const startTime = Date.now()
    const tracer = trace.getTracer('api-performance')
    
    // Extract route information
    const route = request.nextUrl.pathname
    const method = request.method
    const queryParams = Object.fromEntries(request.nextUrl.searchParams)
    
    // Create span for the API route
    const span = tracer.startSpan(`api.${method.toLowerCase()}.${route.replace(/\//g, '.')}`)
    
    try {
      // Set span attributes
      span.setAttributes({
        'http.method': method,
        'http.route': route,
        'http.url': request.url,
        'http.query_params': JSON.stringify(queryParams),
        'user_agent': request.headers.get('user-agent') || '',
        'client_ip': request.ip || '',
      })

      // Record request start
      metrics.apiRequestStart(method, route)
      
      // Execute the handler
      const result = await handler(request)
      
      // Calculate duration
      const duration = Date.now() - startTime
      
      // Record successful request
      metrics.apiRequestSuccess(method, route, duration)
      
      // Record query performance if it's a database-related route
      if (route.includes('/api/') && (method === 'GET' || method === 'POST' || method === 'PUT')) {
        queryPerformanceMonitor.recordQuery({
          query: `${method} ${route}`,
          executionTime: duration,
          planningTime: 0, // Not applicable for API routes
          rows: 0, // Not applicable for API routes
          bufferHits: 0,
          bufferReads: 0,
          success: true,
          endpoint: route,
        })
      }
      
      // Set span status and attributes
      span.setStatus({ code: SpanStatusCode.OK })
      span.setAttributes({
        'http.status_code': 200,
        'duration_ms': duration,
        'success': true,
      })
      
      return result
    } catch (error) {
      const duration = Date.now() - startTime
      const errorMessage = error instanceof Error ? error.message : String(error)
      
      // Record failed request
      metrics.apiRequestError(method, route, duration, errorMessage)
      
      // Record query performance for failed requests
      if (route.includes('/api/') && (method === 'GET' || method === 'POST' || method === 'PUT')) {
        queryPerformanceMonitor.recordQuery({
          query: `${method} ${route}`,
          executionTime: duration,
          planningTime: 0,
          rows: 0,
          bufferHits: 0,
          bufferReads: 0,
          success: false,
          error: errorMessage,
          endpoint: route,
        })
      }
      
      // Set span status and attributes for error
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: errorMessage,
      })
      span.setAttributes({
        'http.status_code': 500,
        'duration_ms': duration,
        'success': false,
        'error.message': errorMessage,
      })
      
      // Record exception
      span.recordException(error as Error)
      
      throw error
    } finally {
      // End the span
      span.end()
      
      // Log performance event
      observability.recordEvent('api_performance', {
        route,
        method,
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      })
    }
  }
}

/**
 * Performance monitoring wrapper for Next.js middleware
 */
export function createPerformanceMiddleware() {
  return async function performanceMiddleware(
    request: NextRequest,
    next: () => Promise<NextResponse>
  ): Promise<NextResponse> {
    const startTime = Date.now()
    const route = request.nextUrl.pathname
    const method = request.method
    
    // Only monitor API routes
    if (!route.startsWith('/api/')) {
      return next()
    }
    
    const tracer = trace.getTracer('middleware-performance')
    const span = tracer.startSpan(`middleware.${method.toLowerCase()}.${route.replace(/\//g, '.')}`)
    
    try {
      span.setAttributes({
        'http.method': method,
        'http.route': route,
        'http.url': request.url,
        'middleware.type': 'performance',
      })
      
      const response = await next()
      const duration = Date.now() - startTime
      
      span.setStatus({ code: SpanStatusCode.OK })
      span.setAttributes({
        'http.status_code': response.status,
        'duration_ms': duration,
      })
      
      return response
    } catch (error) {
      const duration = Date.now() - startTime
      const errorMessage = error instanceof Error ? error.message : String(error)
      
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: errorMessage,
      })
      span.setAttributes({
        'duration_ms': duration,
        'error.message': errorMessage,
      })
      span.recordException(error as Error)
      
      throw error
    } finally {
      span.end()
    }
  }
}

/**
 * Performance monitoring for specific database operations
 */
export function withDatabasePerformanceMonitoring<T>(
  operationName: string,
  handler: () => Promise<T>
): () => Promise<T> {
  return async function monitoredDatabaseOperation(): Promise<T> {
    const startTime = Date.now()
    const tracer = trace.getTracer('database-performance')
    const span = tracer.startSpan(`database.${operationName}`)
    
    try {
      span.setAttributes({
        'db.operation': operationName,
        'db.system': 'postgresql',
      })
      
      const result = await handler()
      const duration = Date.now() - startTime
      
      span.setStatus({ code: SpanStatusCode.OK })
      span.setAttributes({
        'duration_ms': duration,
        'success': true,
      })
      
      return result
    } catch (error) {
      const duration = Date.now() - startTime
      const errorMessage = error instanceof Error ? error.message : String(error)
      
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: errorMessage,
      })
      span.setAttributes({
        'duration_ms': duration,
        'success': false,
        'error.message': errorMessage,
      })
      span.recordException(error as Error)
      
      throw error
    } finally {
      span.end()
    }
  }
}