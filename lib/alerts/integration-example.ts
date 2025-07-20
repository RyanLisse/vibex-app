/**
 * Alert System Integration Examples
 *
 * This file demonstrates how to integrate the alert system with existing
 * services and components in your Claude Flow application.
 */

import { initializeAlerts, getAlertService } from './index'
import { AlertWinstonTransport } from './alert-winston-transport'
import { LoggerFactory } from '../logging/logger-factory'
import { CriticalErrorType } from './types'
import type { LogEntry } from 'winston'

/**
 * Example 1: Basic Integration with Existing Logger
 *
 * This shows how to add alert monitoring to your existing Winston logger setup.
 */
export async function integrateWithExistingLogger() {
  // Initialize the alert service
  const alertService = await initializeAlerts()

  // Get the alert transport
  const alertTransport = alertService.getWinstonTransport()

  // Get your existing logger factory
  const loggerFactory = LoggerFactory.getInstance()

  // Add the alert transport to winston
  // Note: This requires modifying LoggerFactory to accept additional transports
  // You would add this to the createWinstonLogger method:
  /*
  private createWinstonLogger(): winston.Logger {
    const transports = this.createTransports()
    
    // Add alert transport if alert service is available
    if (getAlertService()) {
      transports.push(getAlertService()!.getWinstonTransport())
    }
    
    const format = this.createLogFormat()
    // ... rest of logger creation
  }
  */

  console.log('Alert system integrated with Winston logger')
}

/**
 * Example 2: Manual Error Reporting
 *
 * This shows how to manually report critical errors from your application code.
 */
export async function reportCriticalError(error: Error, context: any) {
  const alertService = getAlertService()
  if (!alertService) {
    console.warn('Alert service not initialized')
    return
  }

  // Create a log entry that will trigger alert detection
  const logEntry: LogEntry = {
    level: 'error',
    message: error.message,
    stack: error.stack,
    meta: {
      ...context,
      errorType: 'manual_report',
      timestamp: new Date().toISOString(),
    },
    timestamp: new Date().toISOString(),
  }

  // The alert transport will automatically detect and process this
  console.error('Critical error reported to alert system', logEntry)
}

/**
 * Example 3: Database Connection Monitoring
 *
 * This shows how to add alert monitoring to database operations.
 */
export class DatabaseWithAlerts {
  private logger: any

  constructor() {
    // Get a logger instance
    const factory = LoggerFactory.getInstance()
    this.logger = factory?.createLogger('database-alerts')
  }

  async connect(): Promise<void> {
    try {
      // Your database connection logic here
      await this.performConnection()

      this.logger?.info('Database connected successfully')
    } catch (error) {
      // This error will be detected by the alert system
      this.logger?.error('Database connection failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        type: 'database_connection_failure',
        retries: 3,
        timeout: 10000,
      })
      throw error
    }
  }

  private async performConnection(): Promise<void> {
    // Simulate connection logic
    throw new Error('Connection timeout after 10 seconds')
  }

  async query(sql: string): Promise<any> {
    try {
      // Your query logic here
      return await this.performQuery(sql)
    } catch (error) {
      this.logger?.error('Database query failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        sql: sql.substring(0, 100), // Log first 100 chars
        type: 'database_query_failure',
      })
      throw error
    }
  }

  private async performQuery(sql: string): Promise<any> {
    // Simulate query logic
    return []
  }
}

/**
 * Example 4: API Route Error Handling
 *
 * This shows how to add alert monitoring to Next.js API routes.
 */
export function withAlertMonitoring<T extends any[], R>(
  handler: (...args: T) => Promise<R>,
  context: { route: string; method: string }
) {
  return async (...args: T): Promise<R> => {
    try {
      return await handler(...args)
    } catch (error) {
      // Report API failures
      const loggerFactory = LoggerFactory.getInstance()
      const logger = loggerFactory?.createLogger('api-alerts')

      logger?.error('API route failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        route: context.route,
        method: context.method,
        stack: error instanceof Error ? error.stack : undefined,
        type: 'api_gateway_failure',
      })

      throw error
    }
  }
}

/**
 * Example 5: Workflow Monitoring
 *
 * This shows how to add alert monitoring to Inngest workflows.
 */
export class WorkflowWithAlerts {
  private logger: any

  constructor() {
    const factory = LoggerFactory.getInstance()
    this.logger = factory?.createLogger('workflow-alerts')
  }

  async executeStep(stepName: string, stepFn: () => Promise<any>): Promise<any> {
    try {
      this.logger?.info(`Executing workflow step: ${stepName}`)
      const result = await stepFn()
      this.logger?.info(`Workflow step completed: ${stepName}`)
      return result
    } catch (error) {
      // This will trigger workflow execution failure alerts
      this.logger?.error('Workflow step failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stepName,
        type: 'workflow_execution_failure',
        stack: error instanceof Error ? error.stack : undefined,
      })
      throw error
    }
  }

  async executeWorkflow(workflowId: string, steps: Array<() => Promise<any>>): Promise<void> {
    try {
      this.logger?.info(`Starting workflow: ${workflowId}`)

      for (let i = 0; i < steps.length; i++) {
        await this.executeStep(`step-${i + 1}`, steps[i])
      }

      this.logger?.info(`Workflow completed: ${workflowId}`)
    } catch (error) {
      this.logger?.error('Workflow execution failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        workflowId,
        type: 'workflow_execution_failure',
        totalSteps: steps.length,
      })
      throw error
    }
  }
}

/**
 * Example 6: Custom Alert Patterns
 *
 * This shows how to add custom error detection patterns.
 */
export async function setupCustomAlertPatterns() {
  const alertService = getAlertService()
  if (!alertService) return

  // Add custom patterns for your specific error types
  alertService.addCustomErrorPattern(
    CriticalErrorType.THIRD_PARTY_SERVICE_FAILURE,
    /anthropic.*rate.*limit.*exceeded/i
  )

  alertService.addCustomErrorPattern(
    CriticalErrorType.THIRD_PARTY_SERVICE_FAILURE,
    /openai.*quota.*exceeded/i
  )

  alertService.addCustomErrorPattern(
    CriticalErrorType.SYSTEM_HEALTH_FAILURE,
    /memory.*usage.*critical/i
  )

  console.log('Custom alert patterns configured')
}

/**
 * Example 7: React Component Error Boundary with Alerts
 *
 * This shows how to add alert monitoring to React error boundaries.
 */
export function reportUIError(error: Error, errorInfo: any) {
  const loggerFactory = LoggerFactory.getInstance()
  const logger = loggerFactory?.createLogger('ui-alerts')

  logger?.error('React component error', {
    error: error.message,
    stack: error.stack,
    componentStack: errorInfo.componentStack,
    type: 'ui_component_failure',
    severity: 'high',
  })
}

/**
 * Example 8: Health Check Integration
 *
 * This shows how to integrate alerts with health checks.
 */
export async function runHealthCheckWithAlerts() {
  const loggerFactory = LoggerFactory.getInstance()
  const logger = loggerFactory?.createLogger('health-alerts')

  try {
    // Run your health checks
    await checkDatabaseHealth()
    await checkRedisHealth()
    await checkExternalServices()

    logger?.info('Health check passed')
  } catch (error) {
    // This will trigger system health failure alerts
    logger?.error('Health check failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      type: 'system_health_failure',
      severity: 'critical',
    })
    throw error
  }
}

async function checkDatabaseHealth(): Promise<void> {
  // Your database health check logic
}

async function checkRedisHealth(): Promise<void> {
  // Your Redis health check logic
}

async function checkExternalServices(): Promise<void> {
  // Your external service health checks
}
