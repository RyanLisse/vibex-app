// Safe wrapper for logging that works during build

let loggingModule: any = null

// Only load the real module on the server
if (typeof window === 'undefined' && process.env.NODE_ENV !== 'production') {
  try {
    loggingModule = require('./index')
  } catch (e) {
    // Fallback during build
  }
}

// Default implementations
const defaultLogger = {
  debug: (...args: any[]) => console.debug(...args),
  info: (...args: any[]) => console.info(...args),
  warn: (...args: any[]) => console.warn(...args),
  error: (...args: any[]) => console.error(...args),
  child: () => defaultLogger,
  startTimer: () => ({ done: () => {} }),
  profile: () => {},
}

export const getLogger = (name: string) => {
  if (loggingModule?.getLogger) {
    try {
      return loggingModule.getLogger(name)
    } catch (e) {
      // Fallback
    }
  }
  return defaultLogger
}

export const createLogger = getLogger

// Stub out other exports
export const createDefaultLoggingConfig = () => ({})
export const validateLoggingConfig = () => true
export const CorrelationIdManager = class {}
export const ComponentLogger = class {}
export const LoggerFactory = class {
  static getInstance() {
    return { createLogger: getLogger }
  }
}
export const MetadataEnricher = class {}
export const createApiRouteLogger = () => () => {}
export const createLoggingMiddleware = () => () => {}
export const PerformanceTracker = class {}
export const SensitiveDataRedactor = class {}
export const AgentLogger = class {}
export const DatabaseLogger = class {}
export const PerformanceLogger = class {}
export const SecurityLogger = class {}
export const initializeLogging = () => {}
