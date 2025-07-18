export type LogLevel = 'error' | 'warn' | 'info' | 'debug' | 'trace'

export interface LoggingConfig {
  level: LogLevel
  serviceName: string
  serviceVersion: string
  environment: string
  silent?: boolean

  console: {
    enabled: boolean
    level?: LogLevel
  }

  file: {
    enabled: boolean
    filename: string
    errorFilename: string
    maxSize: number
    maxFiles: number
    level?: LogLevel
  }

  http: {
    enabled: boolean
    host?: string
    port?: number
    path?: string
    ssl?: boolean
    level?: LogLevel
  }

  sampling: {
    enabled: boolean
    rate: number
    highVolumeThreshold: number
  }

  redaction: {
    enabled: boolean
    customFields?: string[]
    customPatterns?: RegExp[]
  }

  performance: {
    trackOperations: boolean
    slowOperationThreshold: number
  }
}

export interface LogContext {
  correlationId?: string
  userId?: string
  sessionId?: string
  component?: string
  operation?: string
  metadata?: Record<string, any>
}

export interface LoggingMetrics {
  totalLogs: number
  logsByLevel: Record<LogLevel, number>
  averageLoggingTime: number
  operationMetrics: Map<string, OperationMetrics>
  errors: number
  startTime: number
  uptime?: number
}

export interface OperationMetrics {
  count: number
  totalDuration: number
  averageDuration: number
  minDuration: number
  maxDuration: number
}
