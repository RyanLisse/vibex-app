import { trace, context, SpanStatusCode, SpanKind } from '@opentelemetry/api'

// Observability service for tracking operations and events
export class ObservabilityService {
  private static instance: ObservabilityService | null = null
  private tracer = trace.getTracer('electric-sql-client')
  private events: Array<{ name: string; data: any; timestamp: Date }> = []
  private errors: Array<{ operation: string; error: Error; timestamp: Date }> = []
  private operations: Map<string, { startTime: Date; endTime?: Date; duration?: number }> = new Map()

  private constructor() {
    // Private constructor for singleton pattern
  }

  static getInstance(): ObservabilityService {
    if (!ObservabilityService.instance) {
      ObservabilityService.instance = new ObservabilityService()
    }
    return ObservabilityService.instance
  }

  /**
   * Track an operation with OpenTelemetry tracing
   */
  async trackOperation<T>(operationName: string, operation: () => Promise<T>): Promise<T> {
    const span = this.tracer.startSpan(operationName, {
      kind: SpanKind.INTERNAL,
    })

    const operationId = `${operationName}_${Date.now()}_${Math.random()}`
    this.operations.set(operationId, { startTime: new Date() })

    try {
      const result = await context.with(trace.setSpan(context.active(), span), operation)
      
      // Record successful completion
      const operationData = this.operations.get(operationId)
      if (operationData) {
        operationData.endTime = new Date()
        operationData.duration = operationData.endTime.getTime() - operationData.startTime.getTime()
      }

      span.setStatus({ code: SpanStatusCode.OK })
      return result
    } catch (error) {
      // Record error
      this.recordError(operationName, error as Error)
      
      const operationData = this.operations.get(operationId)
      if (operationData) {
        operationData.endTime = new Date()
        operationData.duration = operationData.endTime.getTime() - operationData.startTime.getTime()
      }

      span.recordException(error as Error)
      span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message })
      throw error
    } finally {
      span.end()
      // Clean up old operations (keep last 1000)
      if (this.operations.size > 1000) {
        const entries = Array.from(this.operations.entries())
        const toKeep = entries.slice(-1000)
        this.operations.clear()
        toKeep.forEach(([key, value]) => this.operations.set(key, value))
      }
    }
  }

  /**
   * Track a synchronous operation
   */
  trackOperationSync<T>(operationName: string, operation: () => T): T {
    const span = this.tracer.startSpan(operationName, {
      kind: SpanKind.INTERNAL,
    })

    const operationId = `${operationName}_${Date.now()}_${Math.random()}`
    this.operations.set(operationId, { startTime: new Date() })

    try {
      const result = context.with(trace.setSpan(context.active(), span), operation)
      
      // Record successful completion
      const operationData = this.operations.get(operationId)
      if (operationData) {
        operationData.endTime = new Date()
        operationData.duration = operationData.endTime.getTime() - operationData.startTime.getTime()
      }

      span.setStatus({ code: SpanStatusCode.OK })
      return result
    } catch (error) {
      // Record error
      this.recordError(operationName, error as Error)
      
      const operationData = this.operations.get(operationId)
      if (operationData) {
        operationData.endTime = new Date()
        operationData.duration = operationData.endTime.getTime() - operationData.startTime.getTime()
      }

      span.recordException(error as Error)
      span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message })
      throw error
    } finally {
      span.end()
    }
  }

  /**
   * Record an event
   */
  recordEvent(name: string, data: any): void {
    const event = {
      name,
      data,
      timestamp: new Date(),
    }

    this.events.push(event)

    // Keep only last 1000 events
    if (this.events.length > 1000) {
      this.events = this.events.slice(-1000)
    }

    // Add to current span if available
    const span = trace.getActiveSpan()
    if (span) {
      span.addEvent(name, data)
    }
  }

  /**
   * Record an error
   */
  recordError(operation: string, error: Error): void {
    const errorRecord = {
      operation,
      error,
      timestamp: new Date(),
    }

    this.errors.push(errorRecord)

    // Keep only last 500 errors
    if (this.errors.length > 500) {
      this.errors = this.errors.slice(-500)
    }

    // Add to current span if available
    const span = trace.getActiveSpan()
    if (span) {
      span.recordException(error)
    }

    console.error(`Operation ${operation} failed:`, error)
  }

  /**
   * Track agent execution with comprehensive metadata
   */
  async trackAgentExecution<T>(
    agentType: string,
    operation: string,
    execution: () => Promise<T>,
    metadata?: any
  ): Promise<T> {
    const operationName = `agent.${agentType}.${operation}`
    
    return this.trackOperation(operationName, async () => {
      const span = trace.getActiveSpan()
      if (span) {
        span.setAttributes({
          'agent.type': agentType,
          'agent.operation': operation,
          ...metadata,
        })
      }

      this.recordEvent('agent.execution.start', {
        agentType,
        operation,
        metadata,
      })

      try {
        const result = await execution()
        
        this.recordEvent('agent.execution.complete', {
          agentType,
          operation,
          success: true,
        })

        return result
      } catch (error) {
        this.recordEvent('agent.execution.error', {
          agentType,
          operation,
          error: (error as Error).message,
        })
        throw error
      }
    })
  }

  /**
   * Get recent events
   */
  getEvents(limit = 100): Array<{ name: string; data: any; timestamp: Date }> {
    return this.events.slice(-limit)
  }

  /**
   * Get recent errors
   */
  getErrors(limit = 50): Array<{ operation: string; error: Error; timestamp: Date }> {
    return this.errors.slice(-limit)
  }

  /**
   * Get operation statistics
   */
  getOperationStats(): {
    totalOperations: number
    averageDuration: number
    successRate: number
    recentOperations: Array<{ name: string; duration: number; timestamp: Date }>
  } {
    const operations = Array.from(this.operations.values())
    const completedOperations = operations.filter(op => op.endTime && op.duration !== undefined)
    
    const totalDuration = completedOperations.reduce((sum, op) => sum + (op.duration || 0), 0)
    const averageDuration = completedOperations.length > 0 ? totalDuration / completedOperations.length : 0
    
    const totalOperations = operations.length
    const errorCount = this.errors.length
    const successRate = totalOperations > 0 ? ((totalOperations - errorCount) / totalOperations) * 100 : 100

    const recentOperations = Array.from(this.operations.entries())
      .filter(([_, op]) => op.endTime && op.duration !== undefined)
      .slice(-20)
      .map(([name, op]) => ({
        name: name.split('_')[0], // Remove timestamp and random suffix
        duration: op.duration!,
        timestamp: op.startTime,
      }))

    return {
      totalOperations,
      averageDuration: Math.round(averageDuration),
      successRate: Math.round(successRate * 100) / 100,
      recentOperations,
    }
  }

  /**
   * Clear all stored data (for testing)
   */
  clear(): void {
    this.events = []
    this.errors = []
    this.operations.clear()
  }

  /**
   * Get health status
   */
  getHealthStatus(): {
    isHealthy: boolean
    recentErrorRate: number
    averageResponseTime: number
    lastActivity: Date | null
  } {
    const recentEvents = this.events.slice(-100)
    const recentErrors = this.errors.slice(-50)
    const recentOperations = Array.from(this.operations.values()).slice(-50)

    const recentErrorRate = recentEvents.length > 0 
      ? (recentErrors.length / recentEvents.length) * 100 
      : 0

    const completedOperations = recentOperations.filter(op => op.duration !== undefined)
    const averageResponseTime = completedOperations.length > 0
      ? completedOperations.reduce((sum, op) => sum + (op.duration || 0), 0) / completedOperations.length
      : 0

    const lastActivity = recentEvents.length > 0 
      ? recentEvents[recentEvents.length - 1].timestamp 
      : null

    const isHealthy = recentErrorRate < 10 && averageResponseTime < 5000 // Less than 10% errors and under 5s response time

    return {
      isHealthy,
      recentErrorRate: Math.round(recentErrorRate * 100) / 100,
      averageResponseTime: Math.round(averageResponseTime),
      lastActivity,
    }
  }
}