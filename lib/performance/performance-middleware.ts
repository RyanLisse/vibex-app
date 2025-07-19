import { SpanStatusCode, trace } from '@opentelemetry/api'
import type { NextRequest } from 'next/server'
import { metrics } from '@/lib/observability/metrics'

/**
 * withPerformanceMonitoring middleware
 *
 * Wraps an API route handler with OpenTelemetry tracing and basic latency metrics
 * so that every request is automatically measured and exported to the
 * observability pipeline.
 */
export function withPerformanceMonitoring<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  T extends (...args: any[]) => Promise<any> | any,
>(handler: T): T {
  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  return (async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    // Attempt to extract the Next.js request object (1st param in route handlers)
    const maybeRequest = args[0] as NextRequest | undefined
    const method = maybeRequest?.method ?? 'UNKNOWN'
    const path = maybeRequest?.url ? new URL(maybeRequest.url).pathname : 'unknown'

    const tracer = trace.getTracer('nextjs-api')
    const span = tracer.startSpan(`${method} ${path}`)
    const start = performance.now()

    try {
      // Execute the wrapped handler
      // eslint-disable-next-line @typescript-eslint/await-thenable
      const result = await handler(...args)

      // Record duration
      const durationMs = performance.now() - start
      metrics.queryDuration(durationMs, method, true)

      // Annotate span
      span.setAttributes({
        'http.method': method,
        'http.route': path,
        'http.duration_ms': durationMs,
      })
      span.setStatus({ code: SpanStatusCode.OK })

      return result as ReturnType<T>
    } catch (error) {
      const durationMs = performance.now() - start
      metrics.queryDuration(durationMs, method, false)

      span.recordException(error as Error)
      span.setAttributes({
        'http.method': method,
        'http.route': path,
        'http.duration_ms': durationMs,
      })
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: (error as Error).message,
      })
      throw error
    } finally {
      span.end()
    }
  }) as T
}

export default withPerformanceMonitoring
