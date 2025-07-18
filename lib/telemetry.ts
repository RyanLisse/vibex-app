import type { TelemetryBackend, TelemetryConfig } from '@/src/types/telemetry'

/**
 * Get telemetry configuration from environment variables
 */
export function getTelemetryConfig(): TelemetryConfig {
  const isEnabled = process.env.OTEL_ENABLED === 'true'

  if (!isEnabled) {
    return { isEnabled: false }
  }

  const config: TelemetryConfig = {
    isEnabled,
    endpoint: process.env.OTEL_ENDPOINT,
    serviceName: process.env.OTEL_SERVICE_NAME || 'codex-clone',
    serviceVersion: process.env.OTEL_SERVICE_VERSION || '1.0.0',
    samplingRatio: process.env.OTEL_SAMPLING_RATIO
      ? Number.parseFloat(process.env.OTEL_SAMPLING_RATIO)
      : 1.0,
  }

  // Add authentication header if provided
  if (process.env.OTEL_AUTH_HEADER) {
    config.headers = {
      Authorization: process.env.OTEL_AUTH_HEADER,
    }
  }

  return config
}

/**
 * Get default endpoint for specific telemetry backend
 */
export function getDefaultEndpoint(backend: TelemetryBackend): string {
  const endpoints: Record<TelemetryBackend, string> = {
    jaeger: 'http://localhost:14268/api/traces',
    zipkin: 'http://localhost:9411/api/v2/spans',
    datadog: 'https://trace.agent.datadoghq.com/v0.3/traces',
    newrelic: 'https://otlp.nr-data.net:4317',
    honeycomb: 'https://api.honeycomb.io/v1/traces',
    tempo: 'http://localhost:4317',
    otlp: 'http://localhost:4317',
  }

  return endpoints[backend]
}

/**
 * Validate telemetry configuration
 */
export function validateTelemetryConfig(config: TelemetryConfig): {
  isValid: boolean
  errors: string[]
} {
  const errors: string[] = []

  if (config.isEnabled && !config.endpoint) {
    errors.push('Telemetry is enabled but no endpoint is configured')
  }

  if (
    config.samplingRatio !== undefined &&
    (config.samplingRatio < 0 || config.samplingRatio > 1)
  ) {
    errors.push('Sampling ratio must be between 0.0 and 1.0')
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

/**
 * Log telemetry configuration (for debugging)
 */
export function logTelemetryConfig(config: TelemetryConfig): void {
  if (!config.isEnabled) {
    console.log('📊 OpenTelemetry: Disabled')
    return
  }

  console.log('📊 OpenTelemetry: Enabled')
  console.log(`   Service: ${config.serviceName}@${config.serviceVersion}`)
  console.log(`   Endpoint: ${config.endpoint}`)
  console.log(`   Sampling: ${(config.samplingRatio || 1) * 100}%`)

  if (config.headers) {
    console.log(`   Headers: ${Object.keys(config.headers).join(', ')}`)
  }
}
