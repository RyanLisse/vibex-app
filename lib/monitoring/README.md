# External Monitoring Integration

Comprehensive monitoring system for production-ready observability, including Prometheus metrics export, Grafana dashboards, alerting, notifications, health checks, SLA monitoring, and capacity planning.

## Features

### 1. Prometheus Metrics Exporter
- **Built-in Metrics**: HTTP requests, database queries, agent executions, system resources
- **Custom Metrics**: Database sync operations, WASM performance, vector search, replication lag
- **OpenTelemetry Integration**: Automatic metric collection from traces and spans
- **Export Endpoint**: `/metrics` endpoint for Prometheus scraping

### 2. Grafana Dashboards
Pre-configured dashboards for:
- **System Overview**: Request rates, error rates, response times, active users
- **Database Performance**: Query rates, connection pools, cache hit rates, table sizes
- **Agent Executions**: Execution rates, token usage, success rates, workflow status
- **System Health**: CPU, memory, disk usage, health check status
- **SLA Monitoring**: Availability, response time compliance, error budgets
- **Capacity Planning**: Growth trends, forecasts, resource recommendations

### 3. Alert Manager Integration
- **Pre-defined Alert Rules**: System, database, API, agent, SLA, and capacity alerts
- **Dynamic Alert Creation**: Automatic alerts from OpenTelemetry spans
- **Severity Levels**: Low, medium, high, critical
- **Alert Routing**: Integration with notification channels

### 4. Notification Systems
- **Email Notifications**: HTML-formatted alerts with SMTP support
- **Slack Integration**: Webhook-based Slack notifications
- **Generic Webhooks**: Custom webhook endpoints
- **Rate Limiting**: Prevents notification spam
- **Digest Mode**: Batch notifications for less critical alerts

### 5. Health Checks
- **Built-in Checks**: Database, memory, disk space, query performance, observability
- **Custom Checks**: Add your own health check functions
- **Health Endpoints**: 
  - `/health` - Detailed health status
  - `/health/live` - Simple liveness probe
  - `/health/ready` - Readiness probe
- **Automatic Monitoring**: Periodic health checks with configurable intervals

### 6. SLA Monitoring
- **Default SLA Targets**: Availability (99.9%), response times, error rates
- **Real-time Compliance**: Continuous SLA tracking
- **Error Budget Tracking**: Monitor remaining error budget
- **Automated Reports**: Periodic SLA compliance reports
- **Violation Alerts**: Immediate notifications for SLA breaches

### 7. Capacity Planning
- **Resource Monitoring**: Storage, memory, CPU, connections, API rate limits
- **Growth Analysis**: Automatic growth rate calculation
- **Predictive Forecasting**: 30-day capacity forecasts
- **Risk Assessment**: Overall system risk evaluation
- **Recommendations**: Categorized action items (immediate, short, medium, long-term)

## Configuration

### Environment Variables

```bash
# Prometheus
PROMETHEUS_ENABLED=true
PROMETHEUS_PORT=9090
PROMETHEUS_PATH=/metrics

# Grafana
GRAFANA_ENABLED=true
GRAFANA_DASHBOARD_PATH=./grafana/dashboards
GRAFANA_DATASOURCE=Prometheus

# Alert Manager
ALERT_MANAGER_ENABLED=true
ALERT_MANAGER_URL=http://localhost:9093

# Email Notifications
EMAIL_NOTIFICATIONS_ENABLED=true
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM=monitoring@codex-clone.com
EMAIL_TO=team@example.com,oncall@example.com

# Slack Notifications
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
SLACK_CHANNEL=#monitoring
SLACK_USERNAME=Monitoring Bot
SLACK_ICON=:robot:

# Generic Webhook
WEBHOOK_URL=https://your-webhook-endpoint.com
WEBHOOK_HEADERS={"Authorization": "Bearer token"}
WEBHOOK_METHOD=POST

# Health Checks
HEALTH_CHECKS_ENABLED=true
HEALTH_CHECK_PATH=/health
HEALTH_CHECK_PORT=3001

# SLA Monitoring
SLA_MONITORING_ENABLED=true
SLA_REPORTING_INTERVAL=3600000

# Capacity Planning
CAPACITY_PLANNING_ENABLED=true
CAPACITY_FORECAST_DAYS=30

# Service Info
SERVICE_NAME=codex-clone
SERVICE_VERSION=1.0.0
NODE_ENV=production
```

## Usage

### Initialize Monitoring

```typescript
import { initializeMonitoring } from '@/lib/monitoring'

// Initialize all monitoring systems
await initializeMonitoring()
```

### Record Custom Metrics

```typescript
import { metrics } from '@/lib/monitoring/prometheus'

// Record HTTP request
recordHttpRequest('POST', '/api/users', 201, 150) // 150ms

// Record database query
recordDatabaseQuery('SELECT', 'users', true, 25) // 25ms

// Record agent execution
recordAgentExecution('code-analyzer', 'success', 5000, 1500) // 5s, 1500 tokens

// Custom metrics
dbObservabilityMetrics.syncOperationsTotal.inc({
  operation_type: 'full_sync',
  source: 'primary',
  destination: 'replica',
  status: 'success'
})
```

### Create Custom Alerts

```typescript
import { alertManager } from '@/lib/monitoring/alerts'

alertManager.addCustomRule({
  name: 'CustomMetricAlert',
  expression: 'custom_metric > 100',
  for: '5m',
  severity: 'medium',
  labels: {
    category: 'custom',
    component: 'my-service'
  },
  annotations: {
    summary: 'Custom metric is too high',
    description: 'The custom metric has exceeded the threshold'
  }
})
```

### Send Notifications

```typescript
import { notify } from '@/lib/monitoring/notifications'

await notify(
  'Deployment Complete',
  'Successfully deployed version 2.0.0 to production',
  'low',
  {
    version: '2.0.0',
    environment: 'production',
    deployedBy: 'CI/CD'
  }
)
```

### Add Custom Health Check

```typescript
import { addCustomHealthCheck } from '@/lib/monitoring/health'

addCustomHealthCheck({
  name: 'redis_connection',
  type: 'service',
  interval: 30000, // 30 seconds
  timeout: 5000, // 5 seconds
  check: async () => {
    try {
      await redis.ping()
      return {
        status: 'healthy',
        message: 'Redis is responsive'
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        message: 'Redis connection failed',
        details: { error: error.message }
      }
    }
  }
})
```

### Get SLA Report

```typescript
import { getSLAReport } from '@/lib/monitoring/sla'

const report = await getSLAReport('day')
console.log(`Overall compliance: ${report.overallCompliance}%`)
console.log(`Error budget remaining: ${report.errorBudget.remaining}%`)
```

### Get Capacity Forecast

```typescript
import { getCapacityForecast } from '@/lib/monitoring/capacity'

const forecast = await getCapacityForecast('storage', 30)
for (const recommendation of forecast.recommendations) {
  console.log(recommendation)
}
```

## Grafana Dashboard Import

1. Access Grafana at `http://localhost:3000`
2. Go to Dashboards → Import
3. Upload JSON files from `./grafana/dashboards/`
4. Select Prometheus datasource
5. Import dashboards

## Alert Manager Configuration

Create `alertmanager.yml`:

```yaml
global:
  resolve_timeout: 5m

route:
  group_by: ['alertname', 'severity']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 1h
  receiver: 'default'
  
receivers:
  - name: 'default'
    webhook_configs:
      - url: 'http://localhost:3000/api/monitoring/alerts'
        send_resolved: true
```

## Production Deployment

1. **Prometheus**: Deploy with persistent storage for metrics retention
2. **Grafana**: Configure authentication and dashboard permissions
3. **Alert Manager**: Set up redundancy and proper routing rules
4. **Notifications**: Use dedicated email service and verify webhook security
5. **Health Checks**: Expose endpoints for Kubernetes probes or load balancers
6. **Security**: Implement authentication for metrics endpoints in production

## Monitoring the Monitors

The system includes self-monitoring capabilities:
- Health checks for the monitoring system itself
- Metrics about metric collection and export
- Alerts for monitoring system failures
- Automatic fallbacks for critical components

## Best Practices

1. **Metric Naming**: Follow Prometheus naming conventions
2. **Label Cardinality**: Avoid high-cardinality labels
3. **Alert Fatigue**: Tune alert thresholds to reduce noise
4. **Retention**: Configure appropriate metric retention periods
5. **Dashboards**: Keep dashboards focused and actionable
6. **Documentation**: Document custom metrics and alerts

## Troubleshooting

### Metrics Not Appearing
- Check Prometheus is running and accessible
- Verify metrics endpoint is exposed (`/metrics`)
- Check for errors in application logs
- Ensure Prometheus scrape config includes your service

### Alerts Not Firing
- Verify Alert Manager is running
- Check alert rule syntax
- Ensure metrics exist for the alert expressions
- Review Alert Manager logs

### Notifications Not Sent
- Verify notification channel configuration
- Check network connectivity
- Review notification channel logs
- Test with manual notification send

### Dashboard Issues
- Ensure Prometheus datasource is configured
- Check time range settings
- Verify metric names match queries
- Review Grafana logs