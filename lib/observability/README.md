# Enhanced Observability Events System

A comprehensive observability system for tracking AI agent executions, performance metrics, and real-time event streaming with OpenTelemetry integration.

## Overview

The Enhanced Observability Events System provides:

- **Comprehensive Agent Execution Tracking**: Track AI agent operations from start to completion with detailed metadata
- **Real-time Event Streaming**: Live event broadcasting with filtering and subscription management
- **Performance Metrics Collection**: Detailed performance analytics with aggregation and trend analysis
- **OpenTelemetry Integration**: Full integration with OpenTelemetry for distributed tracing and metrics
- **Database Integration**: Persistent storage of events and metrics using Drizzle ORM
- **Health Monitoring**: System health metrics and alerting capabilities

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Enhanced Observability System                │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │ Agent Execution │  │ Event Streaming │  │ Performance     │  │
│  │ Tracking        │  │ & Real-time     │  │ Metrics         │  │
│  │                 │  │ Subscriptions   │  │ Aggregation     │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │ OpenTelemetry   │  │ Database        │  │ API Routes      │  │
│  │ Integration     │  │ Storage         │  │ & Dashboard     │  │
│  │                 │  │ (PostgreSQL)    │  │                 │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Key Components

### 1. Enhanced Events System (`enhanced-events-system.ts`)

The core service that manages agent execution tracking and event collection.

```typescript
import { enhancedObservability, agentTracking } from "@/lib/observability";

// Track a complete agent execution
const result = await agentTracking.trackExecution(
  "code-generator",
  "generate-component",
  async () => {
    // Your agent logic here
    return await generateComponent(prompt);
  },
  { prompt, options },
  taskId,
  userId,
  sessionId
);

// Manual execution tracking
const executionId = await enhancedObservability.startAgentExecution(
  "code-reviewer",
  "review-code",
  { codebase: "react-app" },
  taskId,
  userId
);

// Record execution steps
await enhancedObservability.recordExecutionStep(
  executionId,
  "analyze-code",
  { linesAnalyzed: 1500 },
  250 // duration in ms
);

// Complete execution
await enhancedObservability.completeAgentExecution(
  executionId,
  { suggestions: [...] },
  { executionTime: 2500, memoryUsage: 1024 * 1024 }
);
```

### 2. Real-time Event Streaming (`streaming.ts`)

Provides real-time event broadcasting with filtering and subscription management.

```typescript
import { eventStream } from "@/lib/observability/streaming";

// Subscribe to all events
const subscriptionId = eventStream.subscribeToAll((event) => {
  console.log("New event:", event);
});

// Subscribe to errors only
const errorSubscriptionId = eventStream.subscribeToErrors((event) => {
  console.error("Error event:", event);
});

// Subscribe to specific execution
const executionSubscriptionId = eventStream.subscribeToExecution(
  "execution-123",
  (event) => {
    console.log("Execution event:", event);
  }
);

// Advanced subscription with filtering and rate limiting
const advancedSubscriptionId = eventStream.manager.subscribeWithAdvancedFilter(
  {
    types: ["execution_start", "execution_end"],
    severities: ["info", "error"],
    rateLimit: {
      maxEventsPerSecond: 10,
      burstSize: 20
    },
    aggregation: {
      enabled: true,
      windowMs: 5000,
      groupBy: ["agentType"]
    }
  },
  (events) => {
    console.log("Aggregated events:", events);
  }
);

// Unsubscribe
eventStream.unsubscribe(subscriptionId);
```

### 3. Performance Metrics Aggregation (`performance-aggregation.ts`)

Collects and analyzes performance metrics with comprehensive health monitoring.

```typescript
import { performanceAggregation } from "@/lib/observability/performance-aggregation";

// Get performance metrics for the last hour
const metrics = await performanceAggregation.collectPerformanceMetrics(60);

// Get comprehensive system health
const healthMetrics = await performanceAggregation.getSystemHealthMetrics();

console.log("System Health:", {
  status: healthMetrics.overall.status,
  score: healthMetrics.overall.score,
  successRate: healthMetrics.executions.successRate,
  averageResponseTime: healthMetrics.executions.averageDuration,
  errorRate: healthMetrics.errors.rate
});
```

### 4. OpenTelemetry Integration (`opentelemetry-integration.ts`)

Configures OpenTelemetry for distributed tracing and metrics export.

```typescript
import { telemetry } from "@/lib/observability/opentelemetry-integration";

// Initialize OpenTelemetry (done automatically if enabled)
await telemetry.initialize();

// Create custom tracer
const tracer = telemetry.createTracer("my-service", "1.0.0");

// Create custom meter
const meter = telemetry.createMeter("my-metrics", "1.0.0");

// Get configuration
const config = telemetry.getConfig();
```

## Configuration

Configure the observability system through environment variables:

```bash
# Basic OpenTelemetry configuration
OTEL_ENABLED=true
OTEL_SERVICE_NAME=vibex
OTEL_SERVICE_VERSION=1.0.0
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318/v1/traces
OTEL_EXPORTER_OTLP_METRICS_ENDPOINT=http://localhost:4318/v1/metrics
OTEL_SAMPLING_RATIO=1.0

# Enhanced agent tracking
OTEL_AGENT_TRACKING_ENABLED=true
OTEL_AGENT_INCLUDE_IO=true
OTEL_AGENT_MAX_PAYLOAD_SIZE=10240
OTEL_AGENT_TRACK_MEMORY=true
OTEL_AGENT_TRACK_PERFORMANCE=true

# Real-time streaming
OTEL_STREAMING_ENABLED=true
OTEL_STREAMING_BUFFER_SIZE=1000
OTEL_STREAMING_FLUSH_INTERVAL=5000
OTEL_STREAMING_MAX_SUBSCRIPTIONS=100

# Performance metrics
OTEL_METRICS_ENABLED=true
OTEL_METRICS_COLLECT_INTERVAL=10000
OTEL_METRICS_RETENTION_HOURS=24
OTEL_METRICS_AGGREGATION_WINDOW=60000
```

## API Routes

### Health Metrics (`/api/observability/health`)

```typescript
// GET - Get comprehensive system health
const response = await fetch("/api/observability/health");
const { health, realtime, system } = await response.json();

// POST - Administrative actions
await fetch("/api/observability/health", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ action: "clear_cache" })
});
```

### Performance Metrics (`/api/observability/metrics`)

```typescript
// GET - Get performance metrics
const response = await fetch("/api/observability/metrics?timeRange=60");
const { metrics } = await response.json();

// GET - Prometheus format
const response = await fetch("/api/observability/metrics?format=prometheus");
const prometheusMetrics = await response.text();
```

### Real-time Event Stream (`/api/observability/events/stream`)

```typescript
// Server-Sent Events (SSE) for real-time streaming
const eventSource = new EventSource(
  "/api/observability/events/stream?types=execution_start,execution_end&severities=info,error"
);

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log("Real-time event:", data);
};
```

## Dashboard Component

Use the pre-built dashboard component for comprehensive monitoring:

```typescript
import { ObservabilityDashboard } from "@/components/observability/ObservabilityDashboard";

export default function MonitoringPage() {
  return (
    <div className="container mx-auto py-8">
      <ObservabilityDashboard />
    </div>
  );
}
```

The dashboard provides:
- Real-time system health overview
- Agent execution statistics
- Error monitoring and analysis
- Performance metrics visualization
- Live event streaming
- Administrative controls

## Database Schema

The system uses the following database tables:

- `agent_executions`: Core execution tracking
- `observability_events`: Event storage with metadata
- `agent_memory`: Agent context and memory management
- `workflows`: Workflow definitions and executions
- `execution_snapshots`: Time-travel debugging support

## Testing

Run the observability tests:

```bash
# Integration tests
bun test lib/observability/integration.test.ts

# Enhanced system tests
bun test lib/observability/enhanced-events-system.test.ts

# All observability tests
bun test lib/observability/
```

## Performance Considerations

- **Event Buffering**: Events are buffered and flushed in batches to reduce database load
- **Caching**: Metrics are cached with configurable TTL to improve response times
- **Rate Limiting**: Real-time subscriptions support rate limiting to prevent overwhelming clients
- **Memory Management**: Active executions and event buffers are automatically cleaned up
- **Database Indexing**: Proper indexes on timestamp, execution ID, and agent type columns

## Monitoring and Alerting

The system provides built-in health monitoring:

- **Health Score**: 0-100 score based on success rate, error rate, and performance
- **Status Levels**: Healthy (80+), Degraded (60-79), Critical (<60)
- **Automatic Alerts**: Integration with existing alert system for critical issues
- **Performance Thresholds**: Configurable thresholds for response time and error rates

## Best Practices

1. **Use Structured Metadata**: Include relevant context in execution metadata
2. **Implement Proper Error Handling**: Always handle execution failures gracefully
3. **Monitor Resource Usage**: Track memory and CPU usage for long-running operations
4. **Use Appropriate Sampling**: Configure sampling rates based on traffic volume
5. **Regular Cleanup**: Implement retention policies for old events and metrics
6. **Security**: Sanitize sensitive data before logging or storing

## Troubleshooting

### Common Issues

1. **High Memory Usage**: Reduce buffer sizes or increase flush frequency
2. **Slow Performance**: Check database indexes and query optimization
3. **Missing Events**: Verify OpenTelemetry configuration and network connectivity
4. **Connection Issues**: Check database connectivity and authentication

### Debug Mode

Enable debug logging:

```bash
NODE_ENV=development
OTEL_LOG_LEVEL=debug
```

### Health Checks

Monitor system health:

```bash
curl http://localhost:3000/api/observability/health
```

## Migration from Legacy System

The enhanced observability system is backward compatible with the existing observability service. Existing code will continue to work while new features are available through the enhanced API.

## Contributing

When adding new observability features:

1. Follow the established patterns for event collection
2. Add appropriate tests for new functionality
3. Update documentation and type definitions
4. Consider performance impact and resource usage
5. Ensure backward compatibility where possible