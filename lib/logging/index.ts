// Main logging exports
export { LoggerFactory, ComponentLogger } from './logger-factory'
export { CorrelationIdManager } from './correlation-id-manager'
export { SensitiveDataRedactor } from './sensitive-data-redactor'
export { PerformanceTracker } from './performance-tracker'
export { MetadataEnricher } from './metadata-enricher'

// Configuration
export { createDefaultLoggingConfig, validateLoggingConfig } from './config'

// Types
export type {
  LogLevel,
  LoggingConfig,
  LogContext,
  LoggingMetrics,
  OperationMetrics,
} from './types'

// Middleware
export { createLoggingMiddleware, createApiRouteLogger } from './middleware'

// Specialized loggers
export {
  AgentLogger,
  DatabaseLogger,
  SecurityLogger,
  PerformanceLogger,
} from './specialized-loggers'

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
