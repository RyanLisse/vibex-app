import { describe, expect, it } from 'vitest'
import type { TelemetryBackend, TelemetryConfig, TelemetryEnvironmentConfig } from './telemetry'

describe('TelemetryConfig', () => {
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

  it('should accept configuration with empty headers', () => {
    const config: TelemetryConfig = {
      isEnabled: true,
      headers: {},
    }

    expect(config.isEnabled).toBe(true)
    expect(config.headers).toEqual({})
  })

  it('should accept sampling ratio at boundaries', () => {
    const configZero: TelemetryConfig = {
      isEnabled: true,
      samplingRatio: 0.0,
    }

    const configOne: TelemetryConfig = {
      isEnabled: true,
      samplingRatio: 1.0,
    }

    expect(configZero.samplingRatio).toBe(0.0)
    expect(configOne.samplingRatio).toBe(1.0)
  })
})

describe('TelemetryBackend', () => {
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

    backends.forEach((backend) => {
      expect(['jaeger', 'zipkin', 'datadog', 'newrelic', 'honeycomb', 'tempo', 'otlp']).toContain(
        backend
      )
    })
  })

  it('should have specific backend values', () => {
    const jaeger: TelemetryBackend = 'jaeger'
    const zipkin: TelemetryBackend = 'zipkin'
    const datadog: TelemetryBackend = 'datadog'
    const newrelic: TelemetryBackend = 'newrelic'
    const honeycomb: TelemetryBackend = 'honeycomb'
    const tempo: TelemetryBackend = 'tempo'
    const otlp: TelemetryBackend = 'otlp'

    expect(jaeger).toBe('jaeger')
    expect(zipkin).toBe('zipkin')
    expect(datadog).toBe('datadog')
    expect(newrelic).toBe('newrelic')
    expect(honeycomb).toBe('honeycomb')
    expect(tempo).toBe('tempo')
    expect(otlp).toBe('otlp')
  })
})

describe('TelemetryEnvironmentConfig', () => {
  it('should accept valid environment configuration', () => {
    const envConfig: TelemetryEnvironmentConfig = {
      OTEL_ENABLED: 'true',
      OTEL_ENDPOINT: 'https://otel-collector.example.com/v1/traces',
      OTEL_SERVICE_NAME: 'test-service',
      OTEL_SERVICE_VERSION: '1.0.0',
      OTEL_AUTH_HEADER: 'Bearer token123',
      OTEL_SAMPLING_RATIO: '0.8',
    }

    expect(envConfig.OTEL_ENABLED).toBe('true')
    expect(envConfig.OTEL_ENDPOINT).toBe('https://otel-collector.example.com/v1/traces')
    expect(envConfig.OTEL_SERVICE_NAME).toBe('test-service')
    expect(envConfig.OTEL_SERVICE_VERSION).toBe('1.0.0')
    expect(envConfig.OTEL_AUTH_HEADER).toBe('Bearer token123')
    expect(envConfig.OTEL_SAMPLING_RATIO).toBe('0.8')
  })

  it('should accept empty environment configuration', () => {
    const envConfig: TelemetryEnvironmentConfig = {}

    expect(envConfig.OTEL_ENABLED).toBeUndefined()
    expect(envConfig.OTEL_ENDPOINT).toBeUndefined()
    expect(envConfig.OTEL_SERVICE_NAME).toBeUndefined()
    expect(envConfig.OTEL_SERVICE_VERSION).toBeUndefined()
    expect(envConfig.OTEL_AUTH_HEADER).toBeUndefined()
    expect(envConfig.OTEL_SAMPLING_RATIO).toBeUndefined()
  })

  it('should accept partial environment configuration', () => {
    const envConfig: TelemetryEnvironmentConfig = {
      OTEL_ENABLED: 'false',
      OTEL_SERVICE_NAME: 'minimal-service',
    }

    expect(envConfig.OTEL_ENABLED).toBe('false')
    expect(envConfig.OTEL_SERVICE_NAME).toBe('minimal-service')
    expect(envConfig.OTEL_ENDPOINT).toBeUndefined()
  })

  it('should accept string values for boolean and numeric fields', () => {
    const envConfig: TelemetryEnvironmentConfig = {
      OTEL_ENABLED: 'false',
      OTEL_SAMPLING_RATIO: '0.1',
    }

    expect(typeof envConfig.OTEL_ENABLED).toBe('string')
    expect(typeof envConfig.OTEL_SAMPLING_RATIO).toBe('string')
    expect(envConfig.OTEL_ENABLED).toBe('false')
    expect(envConfig.OTEL_SAMPLING_RATIO).toBe('0.1')
  })
})
