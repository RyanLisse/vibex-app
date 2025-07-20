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
  try {
    const { createDefaultLoggingConfig: createConfig } = require('./config')
    const config = createConfig()
    const factory = LoggerFactory.getInstance(config)
    return factory.createLogger(component)
  } catch {
    return getLogger(component)
  }
}

// Global logger instance getter
export function getLogger(component: string) {
  // During build or in browser, return a no-op logger
  if (
    typeof window !== 'undefined' ||
    (process.env.NODE_ENV === 'production' && !global.process?.versions?.node)
  ) {
    return {
      debug: (...args: any[]) => console.debug(`[${component}]`, ...args),
      info: (...args: any[]) => console.info(`[${component}]`, ...args),
      warn: (...args: any[]) => console.warn(`[${component}]`, ...args),
      error: (...args: any[]) => console.error(`[${component}]`, ...args),
      child: () => getLogger(component),
      startTimer: () => ({ done: () => {} }),
      profile: () => {},
    }
  }

  try {
    const factory = LoggerFactory.getInstance()
    return factory.createLogger(component)
  } catch (error) {
    // Fallback if not initialized
    try {
      const { createDefaultLoggingConfig: createConfig } = require('./config')
      const config = createConfig()
      const factory = LoggerFactory.getInstance(config)
      return factory.createLogger(component)
    } catch {
      // Return basic console logger as last resort
      return {
        debug: (...args: any[]) => console.debug(`[${component}]`, ...args),
        info: (...args: any[]) => console.info(`[${component}]`, ...args),
        warn: (...args: any[]) => console.warn(`[${component}]`, ...args),
        error: (...args: any[]) => console.error(`[${component}]`, ...args),
        child: () => getLogger(component),
        startTimer: () => ({ done: () => {} }),
        profile: () => {},
      }
    }
  }
}

// Initialize logging system
export function initializeLogging(config?: Partial<LoggingConfig>) {
  const { createDefaultLoggingConfig: createConfig } = require('./config')
  const fullConfig = {
    ...createConfig(),
    ...config,
  }

  validateLoggingConfig(fullConfig)
  return LoggerFactory.getInstance(fullConfig)
}

// Export default logger instance
const defaultLogger = createLogger('app')
export default defaultLogger
