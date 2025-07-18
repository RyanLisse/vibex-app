import { getTelemetryConfig, logTelemetryConfig } from '@/lib/telemetry'

export async function register() {
  const telemetryConfig = getTelemetryConfig()

  // Log configuration for debugging
  logTelemetryConfig(telemetryConfig)

  // Skip if telemetry is disabled
  if (!telemetryConfig.isEnabled) {
    return
  }

  // Optional: Set global telemetry attributes
  if (typeof globalThis !== 'undefined') {
    ;(globalThis as any).__OTEL_CONFIG__ = telemetryConfig
  }
}
