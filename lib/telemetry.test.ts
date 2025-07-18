import { test, expect, describe, it, beforeEach, afterEach, mock } from "bun:test"
import type { TelemetryBackend, TelemetryConfig } from '@/src/types/telemetry'
import {
  getDefaultEndpoint,
  getTelemetryConfig,
  logTelemetryConfig,
  validateTelemetryConfig,
} from './telemetry'

describe('telemetry', () => {
  // Store original env vars
  const originalEnv = process.env

  beforeEach(() => {
    // Reset environment variables
    process.env = { ...originalEnv }
    mock.restore()
    mock.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    process.env = originalEnv
    mock.restore()
  })

  describe('getTelemetryConfig', () => {
    it('should return disabled config when OTEL_ENABLED is not true', () => {
      process.env.OTEL_ENABLED = undefined

      const config = getTelemetryConfig()

      expect(config).toEqual({ isEnabled: false })
    })

    it('should return disabled config when OTEL_ENABLED is false', () => {
      process.env.OTEL_ENABLED = 'false'

      const config = getTelemetryConfig()

      expect(config).toEqual({ isEnabled: false })
    })

    it('should return enabled config with defaults', () => {
      process.env.OTEL_ENABLED = 'true'
      process.env.OTEL_ENDPOINT = 'http://localhost:4317'

      const config = getTelemetryConfig()

      expect(config).toEqual({
        isEnabled: true,
        endpoint: 'http://localhost:4317',
        serviceName: 'codex-clone',
        serviceVersion: '1.0.0',
        samplingRatio: 1.0,
      })
    })

    it('should use custom service name and version', () => {
      process.env.OTEL_ENABLED = 'true'
      process.env.OTEL_ENDPOINT = 'http://localhost:4317'
      process.env.OTEL_SERVICE_NAME = 'my-service'
      process.env.OTEL_SERVICE_VERSION = '2.0.0'

      const config = getTelemetryConfig()

      expect(config.serviceName).toBe('my-service')
      expect(config.serviceVersion).toBe('2.0.0')
    })

    it('should parse custom sampling ratio', () => {
      process.env.OTEL_ENABLED = 'true'
      process.env.OTEL_ENDPOINT = 'http://localhost:4317'
      process.env.OTEL_SAMPLING_RATIO = '0.5'

      const config = getTelemetryConfig()

      expect(config.samplingRatio).toBe(0.5)
    })

    it('should add authorization header when OTEL_AUTH_HEADER is set', () => {
      process.env.OTEL_ENABLED = 'true'
      process.env.OTEL_ENDPOINT = 'http://localhost:4317'
      process.env.OTEL_AUTH_HEADER = 'Bearer token123'

      const config = getTelemetryConfig()

      expect(config.headers).toEqual({
        Authorization: 'Bearer token123',
      })
    })

    it('should not include headers when OTEL_AUTH_HEADER is not set', () => {
      process.env.OTEL_ENABLED = 'true'
      process.env.OTEL_ENDPOINT = 'http://localhost:4317'

      const config = getTelemetryConfig()

      expect(config.headers).toBeUndefined()
    })
  })

  describe('getDefaultEndpoint', () => {
    const backends: [TelemetryBackend, string][] = [
      ['jaeger', 'http://localhost:14268/api/traces'],
      ['zipkin', 'http://localhost:9411/api/v2/spans'],
      ['datadog', 'https://trace.agent.datadoghq.com/v0.3/traces'],
      ['newrelic', 'https://otlp.nr-data.net:4317'],
      ['honeycomb', 'https://api.honeycomb.io/v1/traces'],
      ['tempo', 'http://localhost:4317'],
      ['otlp', 'http://localhost:4317'],
    ]

    it.each(backends)('should return correct endpoint for %s', (backend, expectedEndpoint) => {
      const endpoint = getDefaultEndpoint(backend)
      expect(endpoint).toBe(expectedEndpoint)
    })
  })

  describe('validateTelemetryConfig', () => {
    it('should validate disabled config', () => {
      const config: TelemetryConfig = { isEnabled: false }

      const result = validateTelemetryConfig(config)

      expect(result.isValid).toBe(true)
      expect(result.errors).toEqual([])
    })

    it('should validate enabled config with endpoint', () => {
      const config: TelemetryConfig = {
        isEnabled: true,
        endpoint: 'http://localhost:4317',
        serviceName: 'test-service',
        serviceVersion: '1.0.0',
        samplingRatio: 0.5,
      }

      const result = validateTelemetryConfig(config)

      expect(result.isValid).toBe(true)
      expect(result.errors).toEqual([])
    })

    it('should return error when enabled without endpoint', () => {
      const config: TelemetryConfig = {
        isEnabled: true,
        serviceName: 'test-service',
      }

      const result = validateTelemetryConfig(config)

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Telemetry is enabled but no endpoint is configured')
    })

    it('should validate sampling ratio bounds', () => {
      const config1: TelemetryConfig = {
        isEnabled: true,
        endpoint: 'http://localhost:4317',
        samplingRatio: -0.1,
      }

      const result1 = validateTelemetryConfig(config1)
      expect(result1.isValid).toBe(false)
      expect(result1.errors).toContain('Sampling ratio must be between 0.0 and 1.0')

      const config2: TelemetryConfig = {
        isEnabled: true,
        endpoint: 'http://localhost:4317',
        samplingRatio: 1.1,
      }

      const result2 = validateTelemetryConfig(config2)
      expect(result2.isValid).toBe(false)
      expect(result2.errors).toContain('Sampling ratio must be between 0.0 and 1.0')
    })

    it('should accept valid sampling ratios', () => {
      const validRatios = [0, 0.1, 0.5, 0.99, 1]

      for (const ratio of validRatios) {
        const config: TelemetryConfig = {
          isEnabled: true,
          endpoint: 'http://localhost:4317',
          samplingRatio: ratio,
        }

        const result = validateTelemetryConfig(config)
        expect(result.isValid).toBe(true)
        expect(result.errors).toEqual([])
      }
    })

    it('should handle undefined sampling ratio', () => {
      const config: TelemetryConfig = {
        isEnabled: true,
        endpoint: 'http://localhost:4317',
        samplingRatio: undefined,
      }

      const result = validateTelemetryConfig(config)

      expect(result.isValid).toBe(true)
      expect(result.errors).toEqual([])
    })
  })

  describe('logTelemetryConfig', () => {
    it('should log disabled message when telemetry is disabled', () => {
      const config: TelemetryConfig = { isEnabled: false }

      logTelemetryConfig(config)

      expect(console.log).toHaveBeenCalledWith('📊 OpenTelemetry: Disabled')
      expect(console.log).toHaveBeenCalledTimes(1)
    })

    it('should log enabled configuration', () => {
      const config: TelemetryConfig = {
        isEnabled: true,
        endpoint: 'http://localhost:4317',
        serviceName: 'test-service',
        serviceVersion: '1.2.3',
        samplingRatio: 0.75,
      }

      logTelemetryConfig(config)

      expect(console.log).toHaveBeenCalledWith('📊 OpenTelemetry: Enabled')
      expect(console.log).toHaveBeenCalledWith('   Service: test-service@1.2.3')
      expect(console.log).toHaveBeenCalledWith('   Endpoint: http://localhost:4317')
      expect(console.log).toHaveBeenCalledWith('   Sampling: 75%')
      expect(console.log).toHaveBeenCalledTimes(4)
    })

    it('should use default sampling ratio of 1 when not specified', () => {
      const config: TelemetryConfig = {
        isEnabled: true,
        endpoint: 'http://localhost:4317',
        serviceName: 'test-service',
        serviceVersion: '1.0.0',
      }

      logTelemetryConfig(config)

      expect(console.log).toHaveBeenCalledWith('   Sampling: 100%')
    })

    it('should log headers when present', () => {
      const config: TelemetryConfig = {
        isEnabled: true,
        endpoint: 'http://localhost:4317',
        serviceName: 'test-service',
        serviceVersion: '1.0.0',
        headers: {
          Authorization: 'Bearer token',
          'X-Custom-Header': 'value',
        },
      }

      logTelemetryConfig(config)

      expect(console.log).toHaveBeenCalledWith('   Headers: Authorization, X-Custom-Header')
    })

    it('should not log headers when not present', () => {
      const config: TelemetryConfig = {
        isEnabled: true,
        endpoint: 'http://localhost:4317',
        serviceName: 'test-service',
        serviceVersion: '1.0.0',
      }

      logTelemetryConfig(config)

      const logCalls = (console.log as any).mock.calls
      const hasHeadersLog = logCalls.some((call: any[]) => call[0].includes('Headers:'))
      expect(hasHeadersLog).toBe(false)
    })

    it('should handle edge case sampling ratios', () => {
      const testCases = [
        { ratio: 0, expected: '   Sampling: 0%' },
        { ratio: 1, expected: '   Sampling: 100%' },
        { ratio: 0.333, expected: '   Sampling: 33.3%' },
        { ratio: 0.999, expected: '   Sampling: 99.9%' },
      ]

      for (const { ratio, expected } of testCases) {
        mock.restore()

        const config: TelemetryConfig = {
          isEnabled: true,
          endpoint: 'http://localhost:4317',
          serviceName: 'test-service',
          serviceVersion: '1.0.0',
          samplingRatio: ratio,
        }

        logTelemetryConfig(config)

        expect(console.log).toHaveBeenCalledWith(expected)
      }
    })
  })
})
