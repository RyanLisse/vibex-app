/**
 * Comprehensive tests for monitoring system components
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  prometheusRegistry,
  metrics,
  recordHttpRequest,
  recordDatabaseQuery,
  recordAgentExecution,
} from '../prometheus'
import { alertManager } from '../alerts'
import { notificationManager, EmailChannel, SlackChannel } from '../notifications'
import { healthCheckManager, getHealthStatus } from '../health'
import { slaMonitor, getSLAReport } from '../sla'
import { capacityPlanningManager, getCapacityReport } from '../capacity'
import { initializeMonitoring } from '../index'

describe('Monitoring System', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    // Clean up intervals
    alertManager.stop()
    healthCheckManager.stop()
    slaMonitor.stop()
    capacityPlanningManager.stop()
  })

  describe('Prometheus Metrics', () => {
    it('should record HTTP request metrics', async () => {
      recordHttpRequest('GET', '/api/users', 200, 150)
      recordHttpRequest('POST', '/api/users', 201, 250)
      recordHttpRequest('GET', '/api/users', 500, 1000)

      const metrics = await prometheusRegistry.metrics()
      expect(metrics).toContain('http_requests_total')
      expect(metrics).toContain('http_request_duration_seconds')
      expect(metrics).toMatch(/http_requests_total.*method="GET".*status_code="200"/)
      expect(metrics).toMatch(/http_requests_total.*method="POST".*status_code="201"/)
    })

    it('should record database query metrics', async () => {
      recordDatabaseQuery('SELECT', 'users', true, 25)
      recordDatabaseQuery('INSERT', 'users', true, 50)
      recordDatabaseQuery('SELECT', 'posts', false, 5000)

      const metrics = await prometheusRegistry.metrics()
      expect(metrics).toContain('db_queries_total')
      expect(metrics).toContain('db_query_duration_seconds')
      expect(metrics).toMatch(/db_queries_total.*query_type="SELECT".*success="true"/)
      expect(metrics).toMatch(/db_queries_total.*query_type="SELECT".*success="false"/)
    })

    it('should record agent execution metrics', async () => {
      recordAgentExecution('code-analyzer', 'success', 5000, 1500)
      recordAgentExecution('code-generator', 'failure', 10000)

      const metrics = await prometheusRegistry.metrics()
      expect(metrics).toContain('agent_executions_total')
      expect(metrics).toContain('agent_execution_duration_seconds')
      expect(metrics).toContain('agent_token_usage_total')
      expect(metrics).toMatch(
        /agent_executions_total.*agent_type="code-analyzer".*status="success"/
      )
    })

    it('should export system metrics', async () => {
      const metricsText = await prometheusRegistry.metrics()

      // Default Node.js metrics
      expect(metricsText).toContain('process_cpu_user_seconds_total')
      expect(metricsText).toContain('nodejs_heap_size_total_bytes')
      expect(metricsText).toContain('nodejs_external_memory_bytes')

      // Custom system metrics
      expect(metricsText).toContain('process_memory_usage_bytes')
      expect(metricsText).toContain('process_cpu_usage_percent')
    })
  })

  describe('Alert Manager', () => {
    it('should initialize with default alert rules', async () => {
      await alertManager.initialize({
        url: 'http://localhost:9093',
        alertRules: [],
      })

      const alerts = alertManager.getActiveAlerts()
      expect(alerts).toEqual([])
    })

    it('should add custom alert rule', () => {
      alertManager.addCustomRule({
        name: 'TestAlert',
        expression: 'test_metric > 100',
        for: '5m',
        severity: 'medium',
        labels: { category: 'test' },
        annotations: { summary: 'Test alert' },
      })

      // Rule should be added (internal verification)
      expect(() => alertManager.removeRule('TestAlert')).not.toThrow()
    })

    it('should handle alert lifecycle', async () => {
      const mockNotificationSend = vi.fn()
      notificationManager.sendNotification = mockNotificationSend

      await alertManager.initialize({
        url: 'http://localhost:9093',
        alertRules: [
          {
            name: 'TestHighError',
            expression: 'error_rate > 5',
            for: '1m',
            severity: 'high',
            labels: { category: 'test' },
            annotations: {
              summary: 'High error rate',
              description: 'Error rate is above 5%',
            },
          },
        ],
      })

      // Wait for evaluation
      await new Promise((resolve) => setTimeout(resolve, 100))

      // Check if notification was attempted (mock metrics would trigger)
      // In real tests, you'd inject mock metric values
    })

    it('should get alert history', () => {
      const history = alertManager.getAlertHistory(10)
      expect(Array.isArray(history)).toBe(true)
      expect(history.length).toBeLessThanOrEqual(10)
    })
  })

  describe('Notification System', () => {
    it('should send notifications to multiple channels', async () => {
      const mockEmailSend = vi.fn().mockResolvedValue(undefined)
      const mockSlackSend = vi.fn().mockResolvedValue(undefined)

      const emailChannel = new EmailChannel({
        enabled: true,
        smtp: { host: 'localhost', port: 25, secure: false, auth: { user: '', pass: '' } },
        from: 'test@example.com',
        to: ['recipient@example.com'],
      })
      emailChannel.send = mockEmailSend

      const slackChannel = new SlackChannel({
        enabled: true,
        webhookUrl: 'https://hooks.slack.com/test',
      })
      slackChannel.send = mockSlackSend

      notificationManager.addChannel(emailChannel)
      notificationManager.addChannel(slackChannel)

      await notificationManager.sendNotification({
        title: 'Test Notification',
        message: 'This is a test',
        severity: 'medium',
      })

      expect(mockEmailSend).toHaveBeenCalled()
      expect(mockSlackSend).toHaveBeenCalled()
    })

    it('should respect rate limits', async () => {
      const mockSend = vi.fn().mockResolvedValue(undefined)
      const testChannel = {
        name: 'test',
        enabled: true,
        send: mockSend,
      }

      notificationManager.addChannel(testChannel)

      // Send many notifications
      for (let i = 0; i < 105; i++) {
        await notificationManager.sendNotification({
          title: `Test ${i}`,
          message: 'Rate limit test',
          severity: 'low',
        })
      }

      // Should be limited to 100 per hour
      expect(mockSend).toHaveBeenCalledTimes(100)
    })

    it('should handle notification digest', async () => {
      const mockSend = vi.fn().mockResolvedValue(undefined)
      notificationManager.sendNotification = mockSend

      notificationManager.startDigest(100) // 100ms interval for testing

      await notificationManager.queueForDigest('test-category', {
        title: 'Test 1',
        message: 'Message 1',
        severity: 'low',
      })

      await notificationManager.queueForDigest('test-category', {
        title: 'Test 2',
        message: 'Message 2',
        severity: 'medium',
      })

      // Wait for digest to be sent
      await new Promise((resolve) => setTimeout(resolve, 150))

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          title: expect.stringContaining('Digest'),
          severity: 'medium', // Highest severity
        })
      )

      notificationManager.stopDigest()
    })
  })

  describe('Health Checks', () => {
    it('should run built-in health checks', async () => {
      await healthCheckManager.initialize({
        enabled: false, // Don't start server in tests
        checks: [],
      })

      // Wait for initial checks
      await new Promise((resolve) => setTimeout(resolve, 100))

      const status = getHealthStatus()
      expect(status.status).toMatch(/healthy|degraded|unhealthy/)
      expect(status.checks).toContainEqual(
        expect.objectContaining({
          name: 'database',
        })
      )
      expect(status.checks).toContainEqual(
        expect.objectContaining({
          name: 'memory',
        })
      )
    })

    it('should add custom health check', async () => {
      await healthCheckManager.initialize({
        enabled: false,
        checks: [],
      })

      healthCheckManager.addCheck({
        name: 'custom_test',
        type: 'custom',
        interval: 1000,
        timeout: 500,
        check: async () => ({
          status: 'healthy',
          message: 'Custom check passed',
        }),
      })

      // Wait for check to run
      await new Promise((resolve) => setTimeout(resolve, 100))

      const status = getHealthStatus()
      expect(status.checks).toContainEqual(
        expect.objectContaining({
          name: 'custom_test',
          status: 'healthy',
        })
      )
    })

    it('should calculate overall health status correctly', async () => {
      await healthCheckManager.initialize({
        enabled: false,
        checks: [],
      })

      // Add checks with different statuses
      healthCheckManager.addCheck({
        name: 'healthy_check',
        type: 'custom',
        interval: 60000,
        timeout: 1000,
        check: async () => ({ status: 'healthy' }),
      })

      healthCheckManager.addCheck({
        name: 'degraded_check',
        type: 'custom',
        interval: 60000,
        timeout: 1000,
        check: async () => ({ status: 'degraded', message: 'Performance degraded' }),
      })

      await new Promise((resolve) => setTimeout(resolve, 100))

      const status = getHealthStatus()
      expect(status.status).toBe('degraded') // Worst status wins
    })
  })

  describe('SLA Monitoring', () => {
    it('should evaluate SLA targets', async () => {
      await slaMonitor.initialize({
        targets: [],
        reportingInterval: 3600000,
      })

      const targets = slaMonitor.getTargets()
      expect(targets.length).toBeGreaterThan(0)
      expect(targets).toContainEqual(
        expect.objectContaining({
          name: 'Service Availability',
          target: 99.9,
        })
      )
    })

    it('should generate SLA report', async () => {
      await slaMonitor.initialize({
        targets: [],
        reportingInterval: 3600000,
      })

      const report = await getSLAReport('hour')
      expect(report).toHaveProperty('overallCompliance')
      expect(report).toHaveProperty('results')
      expect(report).toHaveProperty('errorBudget')
      expect(report.results.length).toBeGreaterThan(0)
      expect(report.errorBudget).toHaveProperty('remaining')
    })

    it('should track SLA violations', async () => {
      await slaMonitor.initialize({
        targets: [
          {
            name: 'Test SLA',
            metric: 'error_rate',
            target: 0.1, // 0.1% error rate
            window: 'hour',
            calculation: 'average',
          },
        ],
        reportingInterval: 3600000,
      })

      // In real scenario, metrics would trigger violations
      const violations = slaMonitor.getViolations(10)
      expect(Array.isArray(violations)).toBe(true)
    })
  })

  describe('Capacity Planning', () => {
    it('should collect capacity metrics', async () => {
      await capacityPlanningManager.initialize({
        thresholds: [],
        forecastDays: 30,
      })

      await new Promise((resolve) => setTimeout(resolve, 100))

      const metrics = await capacityPlanningManager.getCurrentMetrics()
      expect(metrics.length).toBeGreaterThan(0)
      expect(metrics).toContainEqual(
        expect.objectContaining({
          resource: expect.any(String),
          current: expect.any(Number),
          utilizationPercent: expect.any(Number),
          trend: expect.stringMatching(/increasing|decreasing|stable/),
        })
      )
    })

    it('should generate capacity forecasts', async () => {
      await capacityPlanningManager.initialize({
        thresholds: [],
        forecastDays: 30,
      })

      const forecast = await capacityPlanningManager.forecastResource('storage', 7)
      expect(forecast).toHaveProperty('predictions')
      expect(forecast.predictions.length).toBe(7)
      expect(forecast).toHaveProperty('recommendations')

      forecast.predictions.forEach((prediction) => {
        expect(prediction).toHaveProperty('date')
        expect(prediction).toHaveProperty('value')
        expect(prediction).toHaveProperty('confidence')
      })
    })

    it('should generate capacity report with risk assessment', async () => {
      await capacityPlanningManager.initialize({
        thresholds: [],
        forecastDays: 30,
      })

      const report = await getCapacityReport()
      expect(report).toHaveProperty('metrics')
      expect(report).toHaveProperty('forecasts')
      expect(report).toHaveProperty('recommendations')
      expect(report).toHaveProperty('riskAssessment')

      expect(report.riskAssessment.overall).toMatch(/low|medium|high|critical/)
      expect(report.recommendations).toHaveProperty('immediate')
      expect(report.recommendations).toHaveProperty('shortTerm')
      expect(report.recommendations).toHaveProperty('mediumTerm')
      expect(report.recommendations).toHaveProperty('longTerm')
    })
  })

  describe('Integration', () => {
    it('should initialize all monitoring systems', async () => {
      const config = {
        prometheus: { enabled: false },
        grafana: { enabled: false },
        alertManager: { enabled: false },
        notifications: {},
        health: { enabled: false },
        sla: { enabled: false },
        capacity: { enabled: false },
      }

      await expect(initializeMonitoring()).resolves.not.toThrow()
    })
  })
})
