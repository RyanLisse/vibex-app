# OpenTelemetry Integration Guide

This guide explains how to set up and use OpenTelemetry with the Codex Clone application for distributed tracing and observability.

## Overview

The application integrates OpenTelemetry to provide observability into:

- VibeKit AI agent operations
- Code generation requests and responses
- GitHub API interactions
- Environment setup and teardown
- Task creation and management
- Error tracking and debugging

## Configuration

### Environment Variables

Add the following environment variables to your `.env.local` file:

```bash
# Enable or disable telemetry
OTEL_ENABLED=true

# OTLP trace export endpoint (see examples below)
OTEL_ENDPOINT=http://localhost:4317

# Service identification
OTEL_SERVICE_NAME=codex-clone
OTEL_SERVICE_VERSION=1.0.0

# Authentication header (if required by your backend)
OTEL_AUTH_HEADER=Bearer your-api-key

# Trace sampling ratio (0.0 to 1.0)
OTEL_SAMPLING_RATIO=1.0
```

### Supported Backends

The application supports various telemetry backends:

| Backend       | Endpoint Example                                | Notes                         |
| ------------- | ----------------------------------------------- | ----------------------------- |
| Jaeger        | `http://localhost:14268/api/traces`             | Popular open-source tracing   |
| Zipkin        | `http://localhost:9411/api/v2/spans`            | Distributed tracing system    |
| DataDog       | `https://trace.agent.datadoghq.com/v0.3/traces` | Requires API key              |
| New Relic     | `https://otlp.nr-data.net:4317`                 | Requires license key          |
| Honeycomb     | `https://api.honeycomb.io/v1/traces`            | Requires API key              |
| Grafana Tempo | `http://localhost:4317`                         | OTLP-compatible               |
| Generic OTLP  | `http://localhost:4317`                         | Any OTLP-compatible collector |

## Setup Examples

### Local Development with Jaeger

1. Start Jaeger using Docker:

```bash
docker run -d --name jaeger \
  -e COLLECTOR_OTLP_ENABLED=true \
  -p 16686:16686 \
  -p 14268:14268 \
  jaegertracing/all-in-one:latest
```

2. Configure environment:

```bash
OTEL_ENABLED=true
OTEL_ENDPOINT=http://localhost:14268/api/traces
OTEL_SERVICE_NAME=codex-clone-dev
```

3. Access Jaeger UI at http://localhost:16686

### Production with DataDog

1. Configure environment:

```bash
OTEL_ENABLED=true
OTEL_ENDPOINT=https://trace.agent.datadoghq.com/v0.3/traces
OTEL_AUTH_HEADER=DD-API-KEY your-datadog-api-key
OTEL_SERVICE_NAME=codex-clone-prod
OTEL_SAMPLING_RATIO=0.1  # Sample 10% in production
```

### Vercel Deployment

For Vercel deployments, the application automatically detects and uses Vercel's OpenTelemetry integration when available. Simply:

1. Install an OTel integration from the Vercel Marketplace
2. Enable traces for the integration
3. Set `OTEL_ENABLED=true` in your Vercel environment variables

## What Gets Traced

### VibeKit Operations

- `vibekit.createPullRequest` - Full PR creation workflow
- `vibekit.agent.*` - Agent decision making
- `vibekit.environment.*` - Environment setup/teardown
- `vibekit.github.*` - GitHub API operations

### Inngest Events

- `inngest.create.task` - Task creation workflow
- `inngest.create.pull-request` - PR creation via Inngest
- `inngest.realtime.*` - Real-time updates

### Automatic Instrumentation

- HTTP requests (incoming and outgoing)
- Database queries (if configured)
- File system operations
- Process execution

## Viewing Traces

Once configured, you can view traces in your chosen backend:

1. **Trace List**: See all operations and their durations
2. **Trace Details**: Drill down into specific operations
3. **Service Map**: Visualize dependencies and flow
4. **Error Tracking**: Identify and debug failures

## Performance Considerations

- **Sampling**: Use `OTEL_SAMPLING_RATIO` to control trace volume
  - Development: 1.0 (100% sampling)
  - Production: 0.1-0.5 (10-50% sampling)
- **Overhead**: Minimal performance impact (<1% in most cases)
- **Data Volume**: Monitor your telemetry data usage

## Troubleshooting

### Traces Not Appearing

1. Check `OTEL_ENABLED=true` is set
2. Verify endpoint is accessible: `curl -X POST $OTEL_ENDPOINT`
3. Check console logs for telemetry messages
4. Ensure authentication headers are correct

### High Data Volume

1. Reduce `OTEL_SAMPLING_RATIO`
2. Disable specific instrumentations in code
3. Use head-based sampling at collector level

### Debug Mode

Enable verbose logging:

```typescript
// In lib/telemetry.ts
export function logTelemetryConfig(config: TelemetryConfig): void {
  console.log("📊 OpenTelemetry Debug:", JSON.stringify(config, null, 2));
}
```

## Security Considerations

- **Never commit** API keys or auth headers to version control
- Use environment variables for all sensitive configuration
- Restrict telemetry endpoint access in production
- Consider data privacy regulations for trace data

## Further Reading

- [OpenTelemetry Documentation](https://opentelemetry.io/docs/)
- [VibeKit Telemetry Guide](https://docs.vibekit.sh/open-telemetry)
- [Vercel OpenTelemetry](https://vercel.com/docs/observability/otel-overview)
