# Winston Logging Integration

A comprehensive structured logging system using Winston with OpenTelemetry correlation, performance optimization, and seamless integration with the ambient agent architecture.

## Features

- **Structured JSON Logging**: Consistent schema with correlation IDs and contextual metadata
- **Correlation ID Management**: Request tracing across distributed components
- **Performance-Aware**: Asynchronous logging with intelligent sampling
- **Security**: Automatic sensitive data redaction and security audit logging
- **Specialized Loggers**: AI agent operations, database queries, security events
- **Health Monitoring**: System health checks and alerting
- **Multiple Transports**: Console, file rotation, HTTP, external platforms

## Quick Start

```typescript
import { initializeLogging, createLogger } from '@/lib/logging'

// Initialize logging system
initializeLogging({
  level: 'info',
  serviceName: 'my-service',
  serviceVersion: '1.0.0',
  environment: 'production'
})

// Create a component logger
const logger = createLogger('my-component')

logger.info('Application started', { version: '1.0.0' })
logger.error('Something went wrong', error, { context: 'startup' })
```

## Specialized Loggers

### Agent Logger
```typescript
import { AgentLogger } from '@/lib/logging'

const agentLogger = new AgentLogger()
agentLogger.agentStarted('agent-1', 'research-agent')
agentLogger.taskCompleted('agent-1', 'task-123', 5000, result)
```

### Database Logger
```typescript
import { DatabaseLogger } from '@/lib/logging'

const dbLogger = new DatabaseLogger()
dbLogger.queryExecuted('SELECT * FROM users', 150, 42)
dbLogger.slowQuery('SELECT * FROM large_table', 2500, 1000)
```

### Security Logger
```typescript
import { SecurityLogger } from '@/lib/logging'

const securityLogger = new SecurityLogger()
securityLogger.authenticationAttempt('user-123', 'oauth', true)
securityLogger.unauthorizedAccess('user-456', '/admin', 'read')
```

## Middleware Integration

### Next.js API Routes
```typescript
import { createApiRouteLogger } from '@/lib/logging'

const withLogging = createApiRouteLogger()

export const GET = withLogging(async (req) => {
  // Your API route logic
  return Response.json({ data: 'success' })
})
```

### Custom Middleware
```typescript
import { createLoggingMiddleware } from '@/lib/logging'

const loggingMiddleware = createLoggingMiddleware()

// Use in your middleware chain
```

## Configuration

Environment variables for logging configuration:

```bash
# Log level: error, warn, info, debug, trace
LOGGING_LEVEL=info

# Service Information
SERVICE_NAME=codex-clone
SERVICE_VERSION=1.0.0

# Console Logging
LOGGING_CONSOLE_ENABLED=true
LOGGING_CONSOLE_LEVEL=debug

# File Logging
LOGGING_FILE_ENABLED=true
LOGGING_FILE_PATH=logs/app.log
LOGGING_ERROR_FILE_PATH=logs/error.log
LOGGING_FILE_MAX_SIZE=10485760
LOGGING_FILE_MAX_FILES=5

# Security and Redaction
LOGGING_REDACTION_ENABLED=true
LOGGING_REDACTION_FIELDS=custom_secret,internal_token
```

## Health Monitoring

```typescript
import { LoggingHealthMonitor } from '@/lib/logging/health-monitor'

const healthMonitor = new LoggingHealthMonitor()
healthMonitor.startMonitoring(60000) // Check every minute

// Get health status
const status = await healthMonitor.checkHealth()
console.log(status.status) // 'healthy' | 'degraded' | 'unhealthy'
```

## Log Structure

Every log entry follows this structure:

```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "level": "info",
  "message": "Operation completed",
  "correlationId": "req-uuid-1234",
  "service": "codex-clone",
  "version": "1.0.0",
  "environment": "production",
  "component": "agent-system",
  "trace": {
    "traceId": "1234567890abcdef",
    "spanId": "abcdef1234567890"
  },
  "context": {
    "userId": "user-123",
    "operation": "task-execution"
  }
}
```

## Performance Considerations

- Asynchronous logging prevents blocking application threads
- Intelligent sampling reduces overhead in high-volume scenarios
- Automatic performance monitoring with configurable thresholds
- Memory-efficient log rotation and compression

## Security Features

- Automatic detection and redaction of sensitive data
- Configurable redaction patterns and field names
- Security audit logging with tamper-evident features
- Compliance-focused features for GDPR, HIPAA requirements

## External Integrations

The system supports integration with:
- ELK Stack (Elasticsearch, Logstash, Kibana)
- Splunk
- Datadog
- AWS CloudWatch
- Google Cloud Logging
- Azure Monitor

## Development and Debugging

- Enhanced development logging with detailed context
- Log streaming and real-time filtering
- Log capture for automated testing
- Correlation tools for issue tracing

## Best Practices

1. **Use Correlation IDs**: Always ensure requests have correlation IDs for tracing
2. **Structured Metadata**: Include relevant context in log metadata
3. **Appropriate Log Levels**: Use correct log levels (error, warn, info, debug, trace)
4. **Sensitive Data**: Let the redaction system handle sensitive information automatically
5. **Performance**: Use appropriate sampling in high-volume scenarios
6. **Health Monitoring**: Monitor logging system health in production

## Architecture

The logging system consists of:
- **Logger Factory**: Central logger management and configuration
- **Correlation Manager**: Request correlation and context propagation
- **Performance Tracker**: Logging performance monitoring and optimization
- **Metadata Enricher**: Automatic context enhancement
- **Data Redactor**: Sensitive information protection
- **Health Monitor**: System health monitoring and alerting
- **Specialized Loggers**: Domain-specific logging implementations

## Integration with Observability

This logging system integrates seamlessly with:
- OpenTelemetry for distributed tracing correlation
- Sentry for error correlation and enhanced context
- Langfuse for AI-specific logging and trace correlation
- Existing monitoring and alerting infrastructure