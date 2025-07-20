import type { LoggingConfig } from './types'

export function createDefaultLoggingConfig(): LoggingConfig {
  const isDev = process.env.NODE_ENV === 'development'
  const isProd = process.env.NODE_ENV === 'production'

  return {
    level: isDev ? 'debug' : 'info',
    serviceName: process.env.SERVICE_NAME || 'vibex',
    serviceVersion: process.env.SERVICE_VERSION || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    silent: false,

    console: {
      enabled: isDev || process.env.LOGGING_CONSOLE_ENABLED === 'true',
      level: (process.env.LOGGING_CONSOLE_LEVEL as any) || undefined,
    },

    file: {
      enabled: isProd || process.env.LOGGING_FILE_ENABLED === 'true',
      filename: process.env.LOGGING_FILE_PATH || 'logs/app.log',
      errorFilename: process.env.LOGGING_ERROR_FILE_PATH || 'logs/error.log',
      maxSize: Number.parseInt(process.env.LOGGING_FILE_MAX_SIZE || '10485760'), // 10MB
      maxFiles: Number.parseInt(process.env.LOGGING_FILE_MAX_FILES || '5'),
      level: (process.env.LOGGING_FILE_LEVEL as any) || undefined,
    },

    http: {
      enabled: process.env.LOGGING_HTTP_ENABLED === 'true',
      host: process.env.LOGGING_HTTP_HOST,
      port: Number.parseInt(process.env.LOGGING_HTTP_PORT || '80'),
      path: process.env.LOGGING_HTTP_PATH || '/logs',
      ssl: process.env.LOGGING_HTTP_SSL === 'true',
      level: (process.env.LOGGING_HTTP_LEVEL as any) || undefined,
    },

    sampling: {
      enabled: process.env.LOGGING_SAMPLING_ENABLED === 'true',
      rate: Number.parseFloat(process.env.LOGGING_SAMPLING_RATE || '0.1'),
      highVolumeThreshold: Number.parseInt(process.env.LOGGING_HIGH_VOLUME_THRESHOLD || '1000'),
    },

    redaction: {
      enabled: process.env.LOGGING_REDACTION_ENABLED !== 'false',
      customFields: process.env.LOGGING_REDACTION_FIELDS?.split(',') || [],
      customPatterns: [],
    },

    performance: {
      trackOperations: process.env.LOGGING_TRACK_OPERATIONS !== 'false',
      slowOperationThreshold: Number.parseInt(process.env.LOGGING_SLOW_THRESHOLD || '1000'),
    },
  }
}

export function validateLoggingConfig(config: LoggingConfig): void {
  if (!config.serviceName) {
    throw new Error('serviceName is required in logging configuration')
  }

  if (!config.serviceVersion) {
    throw new Error('serviceVersion is required in logging configuration')
  }

  if (!config.environment) {
    throw new Error('environment is required in logging configuration')
  }

  const validLevels = ['error', 'warn', 'info', 'debug', 'trace']
  if (!validLevels.includes(config.level)) {
    throw new Error(`Invalid log level: ${config.level}. Must be one of: ${validLevels.join(', ')}`)
  }
}
