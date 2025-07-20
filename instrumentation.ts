import { getTelemetryConfig, logTelemetryConfig } from '@/lib/telemetry'

export async function register() {
  // Initialize Sentry based on runtime
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config')
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config')
  }

  const telemetryConfig = getTelemetryConfig()

  // Log configuration for debugging
  logTelemetryConfig(telemetryConfig)

  // Skip if telemetry is disabled
  if (!telemetryConfig.isEnabled) {
    return
  }

  // Optional: Set global telemetry attributes
  if (typeof globalThis !== 'undefined') {
    ;(
      globalThis as typeof globalThis & {
        __OTEL_CONFIG__?: typeof telemetryConfig
      }
    ).__OTEL_CONFIG__ = telemetryConfig
  }
}
