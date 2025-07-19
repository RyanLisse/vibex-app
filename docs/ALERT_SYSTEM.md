# Claude Flow Alert System

A comprehensive critical error alerting system for real-time monitoring and notification of system failures.

## 🚨 Overview

The Claude Flow Alert System provides enterprise-grade error monitoring with intelligent detection, multi-channel notifications, and comprehensive management features. It automatically detects critical errors in your application logs and sends notifications through various channels including Slack, email, webhooks, Discord, and Teams.

## ✨ Features

### Core Capabilities
- **Real-time Error Detection**: Pattern-based detection of 10+ critical error types
- **Multi-Channel Notifications**: Slack, Email, Webhook, Discord, Teams, and Log transports
- **Rate Limiting**: Prevent alert fatigue with configurable rate limits
- **Deduplication**: Group similar errors to reduce noise
- **Escalation**: Automatic escalation for unresolved alerts
- **Rich Dashboard**: Real-time monitoring with metrics and management
- **Winston Integration**: Seamless integration with existing logging infrastructure

### Error Types Detected
1. Database connection failures
2. Redis connection failures
3. Authentication service failures
4. Workflow execution failures
5. Memory threshold exceeded
6. Error rate threshold exceeded
7. Third-party service failures
8. System health failures
9. API gateway failures
10. File system failures

## 🚀 Quick Start

### 1. Installation

The alert system is included in Claude Flow. Run the setup script to get started:

```bash
# Basic setup
bun run scripts/setup-alerts.ts

# Create environment template
bun run scripts/setup-alerts.ts --create-env

# Setup with testing
bun run scripts/setup-alerts.ts --test-channels
```

### 2. Environment Configuration

Add the following variables to your `.env` file:

```env
# Basic Configuration
ALERTS_ENABLED=true
ALERTS_MAX_PER_HOUR=10
ALERTS_COOLDOWN_MINUTES=15

# Slack Integration
ALERTS_SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
ALERTS_SLACK_CHANNEL=#alerts

# Email Integration
ALERTS_EMAIL_PROVIDER=smtp
ALERTS_EMAIL_FROM=alerts@yourdomain.com
ALERTS_EMAIL_TO=team@yourdomain.com

# Webhook Integration
ALERTS_WEBHOOK_URL=https://your-webhook-endpoint.com/alerts
ALERTS_WEBHOOK_TOKEN=your-bearer-token
```

### 3. Database Migration

Run the database migration to create alert tables:

```sql
-- Apply the migration
\i db/migrations/001_create_alert_tables.sql
```

### 4. Integration

```typescript
import { initializeAlerts } from '@/lib/alerts'

// Initialize the alert system
const alertService = await initializeAlerts()

// The system will automatically detect errors in your logs
```

## 📊 Dashboard

Access the alert dashboard at `/alerts` to:
- View active alerts
- Monitor alert history
- Configure alert channels
- View metrics and analytics
- Test alert channels
- Resolve alerts manually

## ⚙️ Configuration

### Alert Channels

Configure multiple alert channels with different priorities and error type filters:

```typescript
const config: AlertConfig = {
  enabled: true,
  channels: [
    {
      type: 'slack',
      name: 'critical-alerts',
      enabled: true,
      config: {
        webhookUrl: 'https://hooks.slack.com/...',
        channel: '#critical',
        mentionChannel: true
      },
      errorTypes: ['database_connection_failure', 'auth_service_failure'],
      priority: 'critical'
    },
    {
      type: 'email',
      name: 'team-notifications',
      enabled: true,
      config: {
        provider: 'smtp',
        from: 'alerts@company.com',
        to: ['team@company.com'],
        smtp: {
          host: 'smtp.company.com',
          port: 587,
          username: 'alerts@company.com',
          password: 'password'
        }
      },
      errorTypes: ['system_health_failure', 'memory_threshold_exceeded'],
      priority: 'high'
    }
  ],
  rateLimiting: {
    maxAlertsPerHour: 10,
    cooldownMinutes: 15
  },
  deduplication: {
    enabled: true,
    windowMinutes: 60
  }
}
```

### Channel Types

#### Slack
```typescript
{
  type: 'slack',
  config: {
    webhookUrl: 'https://hooks.slack.com/services/...',
    // OR
    botToken: 'xoxb-...',
    channel: '#alerts',
    username: 'Claude Flow Alerts',
    iconEmoji: ':rotating_light:',
    mentionChannel: true,
    mentionUsers: ['user1', 'user2']
  }
}
```

#### Email
```typescript
{
  type: 'email',
  config: {
    provider: 'smtp', // smtp, sendgrid, ses, resend
    from: 'alerts@company.com',
    to: ['team@company.com'],
    // SMTP config
    smtp: {
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      username: 'your-email@gmail.com',
      password: 'your-password'
    },
    // OR API config
    apiKey: 'your-api-key',
    region: 'us-east-1'
  }
}
```

#### Webhook
```typescript
{
  type: 'webhook',
  config: {
    url: 'https://your-endpoint.com/alerts',
    method: 'POST',
    timeout: 30000,
    retries: 3,
    headers: {
      'X-Custom-Header': 'value'
    },
    authentication: {
      type: 'bearer',
      token: 'your-token'
    }
  }
}
```

#### Discord
```typescript
{
  type: 'discord',
  config: {
    webhookUrl: 'https://discord.com/api/webhooks/...',
    username: 'Claude Flow Alerts',
    mentionRoles: ['123456789'],
    mentionUsers: ['987654321'],
    mentionEveryone: false
  }
}
```

#### Teams
```typescript
{
  type: 'teams',
  config: {
    webhookUrl: 'https://outlook.office.com/webhook/...',
    mentionUsers: ['user@company.com'],
    mentionChannel: true
  }
}
```

## 🔧 Advanced Usage

### Custom Error Patterns

Add custom detection patterns for your specific error types:

```typescript
import { getAlertService, CriticalErrorType } from '@/lib/alerts'

const alertService = getAlertService()

// Add custom patterns
alertService?.addCustomErrorPattern(
  CriticalErrorType.THIRD_PARTY_SERVICE_FAILURE,
  /anthropic.*rate.*limit.*exceeded/i
)

alertService?.addCustomErrorPattern(
  CriticalErrorType.SYSTEM_HEALTH_FAILURE,
  /memory.*usage.*critical/i
)
```

### Manual Error Reporting

Report critical errors manually from your application code:

```typescript
import { reportCriticalError } from '@/lib/alerts/integration-example'

try {
  await riskyOperation()
} catch (error) {
  await reportCriticalError(error, {
    operation: 'user-registration',
    userId: 'user-123',
    severity: 'critical'
  })
  throw error
}
```

### API Integration

Use the REST API to manage alerts programmatically:

```typescript
// Get active alerts
const response = await fetch('/api/alerts/active')
const { alerts } = await response.json()

// Resolve an alert
await fetch(`/api/alerts/${alertId}/resolve`, {
  method: 'POST',
  body: JSON.stringify({ resolvedBy: 'admin-user' })
})

// Test a channel
await fetch(`/api/alerts/channels/slack-critical/test`, {
  method: 'POST'
})

// Update configuration
await fetch('/api/alerts/config', {
  method: 'PUT',
  body: JSON.stringify({ config: newConfig })
})
```

### Database Integration

Store and query alerts using the database schema:

```sql
-- Get recent critical alerts
SELECT * FROM alerts 
WHERE severity = 'critical' 
  AND timestamp > NOW() - INTERVAL '24 hours'
  AND resolved = false
ORDER BY timestamp DESC;

-- Get alert metrics
SELECT 
  type,
  COUNT(*) as total,
  SUM(CASE WHEN resolved THEN 1 ELSE 0 END) as resolved,
  AVG(occurrence_count) as avg_occurrences
FROM alerts 
WHERE timestamp > NOW() - INTERVAL '7 days'
GROUP BY type;

-- Get notification status
SELECT 
  a.type,
  a.message,
  an.channel_type,
  an.status,
  an.sent_at
FROM alerts a
JOIN alert_notifications an ON a.id = an.alert_id
WHERE a.timestamp > NOW() - INTERVAL '1 hour';
```

## 🔍 Monitoring & Metrics

### Dashboard Metrics
- Active alerts count
- Total alerts (all time)
- Average resolution time
- Alerts in last 24 hours
- Alerts by type breakdown
- Alerts by channel breakdown
- Unresolved alerts

### Inngest Functions
The system includes background functions for:
- Alert processing and routing
- Failed notification retries
- Alert escalation
- Metrics generation
- Old alert cleanup

### Health Monitoring
The alert system monitors its own health:
- Transport connectivity
- Rate limiting status
- Deduplication effectiveness
- Channel health checks

## 🛡️ Security

### Authentication
- API endpoints require authentication
- Channel configurations stored securely
- Sensitive data redaction in logs

### Data Protection
- Alert data encrypted at rest
- Webhook authentication supported
- HTTPS required for all external communications

### Rate Limiting
- Per-channel rate limiting
- Global rate limiting
- Cooldown periods
- Circuit breaker pattern

## 🧪 Testing

### Channel Testing
Test alert channels directly from the dashboard or API:

```bash
# Test via API
curl -X POST http://localhost:3000/api/alerts/channels/slack-critical/test

# Test via CLI
bun run scripts/setup-alerts.ts --test-channels
```

### Unit Testing
The system includes comprehensive unit tests:

```bash
# Run alert system tests
bun test tests/alerts --timeout=10000

# Run specific tests
bun test tests/alerts/critical-error-detector.test.ts
bun test tests/alerts/transport/webhook-transport.test.ts
```

## 📝 Troubleshooting

### Common Issues

#### Alerts Not Triggering
1. Check if alert system is enabled: `ALERTS_ENABLED=true`
2. Verify Winston transport is integrated
3. Check error patterns match your log messages
4. Verify log level is 'error'

#### Channel Not Receiving Notifications
1. Test the channel configuration
2. Check channel is enabled
3. Verify error type is in channel's errorTypes array
4. Check rate limiting hasn't been triggered
5. Review notification logs in database

#### High Alert Volume
1. Enable deduplication
2. Adjust rate limiting settings
3. Review error patterns for false positives
4. Consider increasing cooldown periods

### Debug Mode
Enable debug logging for detailed troubleshooting:

```env
LOGGING_LEVEL=debug
```

### Health Checks
Monitor alert system health:

```typescript
import { getAlertService } from '@/lib/alerts'

const alertService = getAlertService()
const isHealthy = alertService?.isEnabled()
const config = alertService?.getConfig()
```

## 🔄 Maintenance

### Database Cleanup
Old alerts are automatically cleaned up by Inngest functions:

```typescript
// Customize retention period
process.env.ALERTS_RETENTION_DAYS = '30'
```

### Performance Optimization
- Alerts are stored in Redis for fast access
- Database queries are optimized with indexes
- Rate limiting prevents system overload
- Deduplication reduces processing overhead

### Backup & Recovery
- Alert configuration stored in database
- Redis data is transient (can be rebuilt)
- Export alert history via API for archival

## 📚 API Reference

### REST Endpoints

#### Alerts
- `GET /api/alerts/active` - Get active alerts
- `GET /api/alerts/history` - Get alert history
- `GET /api/alerts/metrics` - Get alert metrics
- `POST /api/alerts/{id}/resolve` - Resolve alert

#### Configuration
- `GET /api/alerts/config` - Get configuration
- `PUT /api/alerts/config` - Update configuration

#### Channels
- `POST /api/alerts/channels/{name}/test` - Test channel

### TypeScript Types

```typescript
interface CriticalError {
  id: string
  timestamp: Date
  severity: 'critical' | 'high' | 'medium' | 'low'
  type: CriticalErrorType
  message: string
  source: string
  metadata: Record<string, any>
  environment: string
  resolved: boolean
  occurrenceCount: number
}

interface AlertChannel {
  type: AlertChannelType
  name: string
  enabled: boolean
  config: Record<string, any>
  errorTypes: CriticalErrorType[]
  priority: AlertPriority
}
```

## 📈 Roadmap

### Planned Features
- Machine learning-based error classification
- Anomaly detection for unusual error patterns
- Integration with monitoring tools (Prometheus, Grafana)
- Mobile app notifications
- Advanced analytics and reporting
- Custom webhook templates
- Alert templates and runbooks

## 🤝 Contributing

To contribute to the alert system:

1. Add new transport types in `lib/alerts/transport/`
2. Extend error detection patterns in `critical-error-detector.ts`
3. Add new dashboard components in `components/alerts/`
4. Update tests and documentation

## 📄 License

The Claude Flow Alert System is part of Claude Flow and follows the same licensing terms.

---

For additional support, please refer to the Claude Flow documentation or create an issue in the repository.