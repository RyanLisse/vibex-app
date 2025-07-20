import { trace, SpanStatusCode } from '@opentelemetry/api'
import { observability } from '@/lib/observability'
import { getLogger } from '@/lib/logging/safe-wrapper'

export interface ServiceOptions {
  serviceName: string
  tracerName?: string
}

export interface QueryMetadata {
  duration: number
  resultCount?: number
  totalCount?: number
  operation: string
  success: boolean
}

export abstract class BaseService {
  protected serviceName: string
  protected tracer: ReturnType<typeof trace.getTracer>
  protected logger: ReturnType<typeof getLogger>

  constructor(options: ServiceOptions) {
    this.serviceName = options.serviceName
    this.tracer = trace.getTracer(options.tracerName || options.serviceName)
    this.logger = getLogger(options.serviceName)
  }

  protected async executeWithObservability<T>(
    operation: string,
    fn: () => Promise<T>,
    attributes?: Record<string, any>
  ): Promise<T> {
    const span = this.tracer.startSpan(`${this.serviceName}.${operation}`)
    const startTime = Date.now()

    try {
      if (attributes) {
        span.setAttributes(attributes)
      }

      const result = await fn()
      const duration = Date.now() - startTime

      this.recordMetrics({
        duration,
        operation,
        success: true,
      })

      span.setStatus({ code: SpanStatusCode.OK })
      return result
    } catch (error) {
      const duration = Date.now() - startTime

      span.recordException(error as Error)
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: (error as Error).message,
      })

      this.recordMetrics({
        duration,
        operation,
        success: false,
      })

      observability.metrics.errorRate(1, this.serviceName)
      this.logger.error(`Error in ${operation}`, error as Error)

      throw error
    } finally {
      span.end()
    }
  }

  protected recordMetrics(metadata: QueryMetadata): void {
    observability.metrics.queryDuration(metadata.duration, metadata.operation, metadata.success)
  }

  protected async recordEvent(
    eventType: string,
    level: string,
    message: string,
    data: Record<string, any>,
    tags?: string[]
  ): Promise<void> {
    await observability.events.collector.collectEvent(
      eventType,
      level,
      message,
      data,
      this.serviceName,
      tags || [this.serviceName]
    )
  }

  protected buildPaginationResponse<T>(items: T[], page: number, limit: number, total: number) {
    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }
  }
}
