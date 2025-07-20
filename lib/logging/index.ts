// Main logging exports

// Configuration
export { validateLoggingConfig } from './config'
export { createDefaultLoggingConfig } from './defaults'
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
  // During build, return a no-op logger
  try {
    const { createDefaultLoggingConfig } = require('./defaults')
    const config = createDefaultLoggingConfig()
    const factory = LoggerFactory.getInstance(config)
    return factory.createLogger(component)
  } catch (error) {
    return getLogger(component)
  }
}

// Global logger instance getter
export function getLogger(component: string) {
  // During build, use build logger
  if (process.env.NEXT_PHASE === 'phase-production-build' || process.env.NODE_ENV === 'test') {
    const { createBuildLogger } = require('./build-logger')
    return createBuildLogger(component)
  }

  // During browser runtime, use console logger
  if (typeof window !== 'undefined') {
    const { createBuildLogger } = require('./build-logger')
    return createBuildLogger(component)
  }

  // Server runtime - use full logger
  try {
    const factory = LoggerFactory.getInstance()
    return factory.createLogger(component)
  } catch (error) {
    // If LoggerFactory not initialized, initialize with defaults
    try {
      const { createDefaultLoggingConfig } = require('./defaults')
      const config = createDefaultLoggingConfig()
      const factory = LoggerFactory.getInstance(config)
      return factory.createLogger(component)
    } catch (initError) {
      // Final fallback
      const { createBuildLogger } = require('./build-logger')
      return createBuildLogger(component)
    }
  }
}

// Initialize logging system
export function initializeLogging(config?: Partial<LoggingConfig>) {
  const { createDefaultLoggingConfig } = require('./defaults')
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
