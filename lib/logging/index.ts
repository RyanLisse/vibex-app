// Main logging exports

// Configuration
export { createDefaultLoggingConfig, validateLoggingConfig } from './config'
export { CorrelationIdManager } from './correlation-id-manager'
export { ComponentLogger, LoggerFactory } from './logger-factory'
export { MetadataEnricher } from './metadata-enricher'
// Middleware
export { createApiRouteLogger, createLoggingMiddleware } from './middleware'
export { PerformanceTracker } from './performance-tracker'
export { SensitiveDataRedactor } from './sensitive-data-redactor'
// Specialized loggers
export {
  AgentLogger,
  DatabaseLogger,
  PerformanceLogger,
  SecurityLogger,
} from './specialized-loggers'
// Types
export type {
  LogContext,
  LoggingConfig,
  LoggingMetrics,
  LogLevel,
  OperationMetrics,
} from './types'

// Convenience function to create a logger
export function createLogger(component: string) {
  const config = createDefaultLoggingConfig()
  const factory = LoggerFactory.getInstance(config)
  return factory.createLogger(component)
}

// Global logger instance getter
export function getLogger(component: string) {
  try {
    const factory = LoggerFactory.getInstance()
    return factory.createLogger(component)
  } catch (error) {
    // Fallback if not initialized
    const config = createDefaultLoggingConfig()
    const factory = LoggerFactory.getInstance(config)
    return factory.createLogger(component)
  }
}

// Initialize logging system
export function initializeLogging(config?: Partial<LoggingConfig>) {
  const fullConfig = {
    ...createDefaultLoggingConfig(),
    ...config,
  }

  validateLoggingConfig(fullConfig)
  return LoggerFactory.getInstance(fullConfig)
}

// Export default logger instance
const defaultLogger = createLogger('app')
export default defaultLogger
