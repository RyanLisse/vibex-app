import { describe, expect, it, test } from 'vitest'
import type { TelemetryBackend, TelemetryConfig, TelemetryEnvironmentConfig } from './telemetry'

describe('TelemetryConfig interface', () => {
  it('should accept valid telemetry configuration', () => {
    const config: TelemetryConfig = {
      isEnabled: true,
      endpoint: 'https://otel-collector.example.com/v1/traces',
      serviceName: 'test-service',
      serviceVersion: '2.0.0',
      headers: { 'x-api-key': 'test-key' },
      samplingRatio: 0.5,
    }

    expect(config.isEnabled).toBe(true)
    expect(config.endpoint).toBe('https://otel-collector.example.com/v1/traces')
    expect(config.serviceName).toBe('test-service')
    expect(config.serviceVersion).toBe('2.0.0')
    expect(config.headers).toEqual({ 'x-api-key': 'test-key' })
    expect(config.samplingRatio).toBe(0.5)
  })

  it('should accept minimal configuration with just isEnabled', () => {
    const config: TelemetryConfig = {
      isEnabled: false,
    }

    expect(config.isEnabled).toBe(false)
    expect(config.endpoint).toBeUndefined()
    expect(config.serviceName).toBeUndefined()
    expect(config.serviceVersion).toBeUndefined()
    expect(config.headers).toBeUndefined()
    expect(config.samplingRatio).toBeUndefined()
  })

  it('should handle disabled telemetry configuration', () => {
    const config: TelemetryConfig = {
      isEnabled: false,
      endpoint: 'https://example.com',
      serviceName: 'test-service',
      serviceVersion: '1.0.0',
      headers: { Authorization: 'Bearer token' },
      samplingRatio: 0.5,
    }

    expect(config.isEnabled).toBe(false)
    expect(config.endpoint).toBe('https://example.com')
    expect(config.serviceName).toBe('test-service')
    expect(config.serviceVersion).toBe('1.0.0')
    expect(config.headers).toEqual({ Authorization: 'Bearer token' })
    expect(config.samplingRatio).toBe(0.5)
  })
})

describe('TelemetryBackend type', () => {
  it('should accept all valid backend types', () => {
    const backends: TelemetryBackend[] = [
      'jaeger',
      'zipkin',
      'datadog',
      'newrelic',
      'honeycomb',
      'tempo',
      'otlp',
    ]

    expect(backends).toHaveLength(7)
    expect(backends[0]).toBe('jaeger')
    expect(backends[1]).toBe('zipkin')
    expect(backends[2]).toBe('datadog')
  })
})

describe('TelemetryEnvironmentConfig interface', () => {
  it('should accept all environment configuration properties', () => {
    const envConfig: TelemetryEnvironmentConfig = {
      OTEL_ENABLED: 'true',
      OTEL_ENDPOINT: 'https://api.honeycomb.io/v1/traces',
      OTEL_SERVICE_NAME: 'my-app',
      OTEL_SERVICE_VERSION: '1.2.3',
      OTEL_AUTH_HEADER: 'x-honeycomb-team=abc123',
      OTEL_SAMPLING_RATIO: '0.1',
    }

    expect(envConfig.OTEL_ENABLED).toBe('true')
    expect(envConfig.OTEL_ENDPOINT).toBe('https://api.honeycomb.io/v1/traces')
    expect(envConfig.OTEL_SERVICE_NAME).toBe('my-app')
    expect(envConfig.OTEL_SERVICE_VERSION).toBe('1.2.3')
    expect(envConfig.OTEL_AUTH_HEADER).toBe('x-honeycomb-team=abc123')
    expect(envConfig.OTEL_SAMPLING_RATIO).toBe('0.1')
  })

  it('should handle empty string values', () => {
    const envConfig: TelemetryEnvironmentConfig = {
      OTEL_ENABLED: '',
      OTEL_ENDPOINT: '',
      OTEL_SERVICE_NAME: '',
      OTEL_SERVICE_VERSION: '',
      OTEL_AUTH_HEADER: '',
      OTEL_SAMPLING_RATIO: '',
    }

    expect(envConfig.OTEL_ENABLED).toBe('')
    expect(envConfig.OTEL_ENDPOINT).toBe('')
    expect(envConfig.OTEL_SERVICE_NAME).toBe('')
    expect(envConfig.OTEL_SERVICE_VERSION).toBe('')
    expect(envConfig.OTEL_AUTH_HEADER).toBe('')
    expect(envConfig.OTEL_SAMPLING_RATIO).toBe('')
  })
})
