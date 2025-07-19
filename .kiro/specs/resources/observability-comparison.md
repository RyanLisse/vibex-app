# Observability Tools Comparison for CodeClone

## Overview

This document compares observability tools for the CodeClone project, focusing on how to best monitor and debug the ambient agents system with React Flow visualization.

## 🎯 Observability Requirements

### Core Needs

1. **Error Tracking**: Catch and report errors across frontend and backend
2. **Performance Monitoring**: Track API latency, rendering performance, WebSocket health
3. **Session Replay**: Debug user interactions with visual replay
4. **Real-time Monitoring**: Live dashboards for agent activity
5. **Distributed Tracing**: Track requests across multiple services
6. **User Analytics**: Understand user behavior and feature usage
7. **Custom Metrics**: Agent-specific metrics and KPIs

## 📊 Tool Comparison Matrix

| Feature                  | Sentry     | OpenReplay | Datadog    | New Relic  | Grafana Stack | LogRocket  |
| ------------------------ | ---------- | ---------- | ---------- | ---------- | ------------- | ---------- |
| **Error Tracking**       | ⭐⭐⭐⭐⭐ | ⭐⭐       | ⭐⭐⭐⭐   | ⭐⭐⭐⭐   | ⭐⭐⭐        | ⭐⭐⭐     |
| **Performance APM**      | ⭐⭐⭐⭐   | ⭐⭐⭐     | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐      | ⭐⭐⭐     |
| **Session Replay**       | ⭐⭐       | ⭐⭐⭐⭐⭐ | ❌         | ❌         | ❌            | ⭐⭐⭐⭐⭐ |
| **Real-time Dashboards** | ⭐⭐⭐     | ⭐⭐⭐     | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐   | ⭐⭐⭐⭐⭐    | ⭐⭐⭐     |
| **Distributed Tracing**  | ⭐⭐⭐     | ❌         | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐      | ❌         |
| **Custom Metrics**       | ⭐⭐⭐     | ⭐⭐⭐     | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐   | ⭐⭐⭐⭐⭐    | ⭐⭐       |
| **Open Source Option**   | ⭐⭐       | ⭐⭐⭐⭐⭐ | ❌         | ❌         | ⭐⭐⭐⭐⭐    | ❌         |
| **Cost for Scale**       | $$$        | $$         | $$$$       | $$$$       | $             | $$$        |
| **React Flow Support**   | ⭐⭐⭐     | ⭐⭐⭐⭐⭐ | ⭐⭐       | ⭐⭐       | ⭐⭐⭐        | ⭐⭐⭐⭐   |
| **AI/ML Insights**       | ⭐⭐⭐     | ⭐⭐       | ⭐⭐⭐⭐   | ⭐⭐⭐⭐   | ⭐⭐          | ⭐⭐⭐     |

## 🏆 Recommended Stack

### Primary Stack: Sentry + OpenReplay + Grafana

This combination provides comprehensive observability:

1. **Sentry** (Already in use)
   - Error tracking and alerting
   - Performance monitoring
   - Release management
   - User context

2. **OpenReplay** (New addition)
   - Session replay with privacy controls
   - Network request inspection
   - Console log capture
   - Redux/Zustand state debugging
   - React Flow interaction tracking

3. **Grafana + Prometheus + Loki** (For metrics and logs)
   - Custom dashboards for agent metrics
   - Real-time visualization
   - Log aggregation and search
   - Alert management

## 🔧 Integration Architecture

### 1. Sentry Configuration (Enhanced)

```typescript
import * as Sentry from "@sentry/nextjs";
import { CaptureConsole } from "@sentry/integrations";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,

  // Performance Monitoring
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // Session Replay (limited)
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  // Custom integrations
  integrations: [
    new CaptureConsole({ levels: ["error", "warn"] }),
    new Sentry.BrowserTracing({
      routingInstrumentation: Sentry.nextRouterInstrumentation,
      tracingOrigins: ["localhost", process.env.NEXT_PUBLIC_APP_URL],
    }),
  ],

  // Before send hook for PII filtering
  beforeSend(event, hint) {
    // Filter out sensitive data
    if (event.request?.cookies) {
      delete event.request.cookies;
    }
    return event;
  },
});

// Custom breadcrumbs for ambient agents
export const trackAgentBreadcrumb = (
  message: string,
  data: Record<string, any>,
) => {
  Sentry.addBreadcrumb({
    message,
    category: "ambient-agent",
    level: "info",
    data,
  });
};
```

### 2. OpenReplay Integration

```typescript
import OpenReplay from "@openreplay/tracker";
import trackerAssist from "@openreplay/tracker-assist";
import trackerFetch from "@openreplay/tracker-fetch";
import trackerGraphQL from "@openreplay/tracker-graphql";

class ObservabilityManager {
  private openReplayTracker: OpenReplay | null = null;

  initializeOpenReplay() {
    if (typeof window === "undefined") return;

    this.openReplayTracker = new OpenReplay({
      projectKey: process.env.NEXT_PUBLIC_OPENREPLAY_KEY!,
      ingestPoint: process.env.NEXT_PUBLIC_OPENREPLAY_INGEST,

      // Privacy settings
      obscureTextEmails: true,
      obscureTextNumbers: true,
      obscureInputDates: false,
      obscureInputEmails: true,

      // Performance settings
      capturePerformance: true,
      captureResourceTimings: true,
      captureCrossOriginIframes: false,

      // Sampling
      sampleRate: process.env.NODE_ENV === "production" ? 80 : 100,

      // Custom sanitizer for PII
      sanitizer: (data) => {
        // Remove sensitive fields
        const sanitized = { ...data };
        delete sanitized.password;
        delete sanitized.token;
        delete sanitized.apiKey;
        return sanitized;
      },
    });

    // Enhanced plugins
    this.openReplayTracker.use(
      trackerAssist({
        socket: true, // Track WebSocket for real-time updates
        fetch: true,
        xhr: true,
        sessionReset: true,
      }),
    );

    this.openReplayTracker.use(
      trackerFetch({
        sanitiser: (data) => {
          // Sanitize API requests
          if (data.url.includes("/api/auth")) {
            data.body = "[REDACTED]";
          }
          return data;
        },
      }),
    );

    // Start tracking
    this.openReplayTracker.start();

    // Integrate with Sentry
    if (window.Sentry) {
      const sessionURL = this.openReplayTracker.getSessionURL();
      Sentry.setContext("openReplay", {
        sessionURL,
        sessionId: this.openReplayTracker.getSessionID(),
      });
    }
  }

  // Custom event tracking for React Flow
  trackReactFlowEvent(eventType: string, data: any) {
    this.openReplayTracker?.event("reactflow_interaction", {
      type: eventType,
      timestamp: Date.now(),
      ...data,
    });
  }

  // Track agent events
  trackAgentEvent(agentId: string, event: string, metadata: any) {
    this.openReplayTracker?.event("agent_event", {
      agentId,
      event,
      metadata,
      timestamp: Date.now(),
    });

    // Also send to custom metrics
    this.sendMetric("agent.event", 1, {
      agent_id: agentId,
      event_type: event,
    });
  }

  // Track performance metrics
  trackPerformanceMetric(
    metric: string,
    value: number,
    tags?: Record<string, string>,
  ) {
    this.openReplayTracker?.event("performance_metric", {
      metric,
      value,
      tags,
    });

    // Send to Prometheus
    this.sendMetric(metric, value, tags);
  }

  private sendMetric(
    name: string,
    value: number,
    labels?: Record<string, string>,
  ) {
    // Send to Prometheus push gateway or use OpenTelemetry
    fetch("/api/metrics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, value, labels }),
    });
  }
}

export const observability = new ObservabilityManager();
```

### 3. Grafana Stack Setup

```yaml
# docker-compose.yml for Grafana stack
version: "3.8"

services:
  prometheus:
    image: prom/prometheus:latest
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus-data:/prometheus
    ports:
      - "9090:9090"
    command:
      - "--config.file=/etc/prometheus/prometheus.yml"
      - "--storage.tsdb.path=/prometheus"
      - "--web.enable-lifecycle"
      - "--web.enable-admin-api"

  loki:
    image: grafana/loki:latest
    volumes:
      - ./loki-config.yml:/etc/loki/local-config.yaml
      - loki-data:/loki
    ports:
      - "3100:3100"
    command: -config.file=/etc/loki/local-config.yaml

  promtail:
    image: grafana/promtail:latest
    volumes:
      - ./promtail-config.yml:/etc/promtail/config.yml
      - /var/log:/var/log
    command: -config.file=/etc/promtail/config.yml

  grafana:
    image: grafana/grafana:latest
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
      - GF_INSTALL_PLUGINS=redis-datasource,vertamedia-clickhouse-datasource
    volumes:
      - grafana-data:/var/lib/grafana
      - ./grafana/dashboards:/etc/grafana/provisioning/dashboards
      - ./grafana/datasources:/etc/grafana/provisioning/datasources
    ports:
      - "3000:3000"

volumes:
  prometheus-data:
  loki-data:
  grafana-data:
```

### 4. Custom Metrics for Ambient Agents

```typescript
// Prometheus metrics for ambient agents
import { register, Counter, Gauge, Histogram } from "prom-client";

// Agent metrics
export const agentMetrics = {
  activeAgents: new Gauge({
    name: "ambient_agents_active_total",
    help: "Total number of active agents",
    labelNames: ["type", "provider"],
  }),

  taskCompletions: new Counter({
    name: "ambient_agent_tasks_completed_total",
    help: "Total number of completed tasks",
    labelNames: ["agent_type", "status"],
  }),

  taskDuration: new Histogram({
    name: "ambient_agent_task_duration_seconds",
    help: "Task execution duration in seconds",
    labelNames: ["agent_type", "task_type"],
    buckets: [0.1, 0.5, 1, 5, 10, 30, 60, 120, 300],
  }),

  webSocketConnections: new Gauge({
    name: "websocket_connections_active",
    help: "Number of active WebSocket connections",
    labelNames: ["server_id"],
  }),

  reactFlowNodeCount: new Gauge({
    name: "reactflow_nodes_total",
    help: "Total number of nodes in visualization",
    labelNames: ["view_mode"],
  }),

  valkeyOperations: new Counter({
    name: "valkey_operations_total",
    help: "Total Valkey operations",
    labelNames: ["operation", "status"],
  }),
};

// Register all metrics
Object.values(agentMetrics).forEach((metric) =>
  register.registerMetric(metric),
);
```

### 5. Integrated Dashboard Example

```typescript
// React component for real-time metrics
import { useEffect, useState } from 'react';
import { observability } from '@/lib/observability';

export const MetricsDashboard = () => {
  const [metrics, setMetrics] = useState({
    activeAgents: 0,
    taskQueue: 0,
    avgResponseTime: 0,
    errorRate: 0,
  });

  useEffect(() => {
    const fetchMetrics = async () => {
      const response = await fetch('/api/metrics/summary');
      const data = await response.json();
      setMetrics(data);

      // Track dashboard view
      observability.trackReactFlowEvent('dashboard_viewed', {
        metrics: data,
      });
    };

    const interval = setInterval(fetchMetrics, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="grid grid-cols-4 gap-4">
      <MetricCard
        title="Active Agents"
        value={metrics.activeAgents}
        trend={+5.2}
      />
      <MetricCard
        title="Task Queue"
        value={metrics.taskQueue}
        trend={-2.1}
      />
      <MetricCard
        title="Avg Response Time"
        value={`${metrics.avgResponseTime}ms`}
        trend={-10.5}
      />
      <MetricCard
        title="Error Rate"
        value={`${metrics.errorRate}%`}
        trend={-0.3}
      />
    </div>
  );
};
```

## 🚀 Implementation Strategy

### Phase 1: Enhanced Error Tracking (Current)

- ✅ Sentry basic integration
- ⬜ Add custom breadcrumbs for agents
- ⬜ Implement PII filtering
- ⬜ Set up alert rules

### Phase 2: Session Replay (Week 1-2)

- ⬜ Deploy OpenReplay
- ⬜ Integrate with React Flow
- ⬜ Add custom events
- ⬜ Set up privacy controls

### Phase 3: Metrics & Dashboards (Week 3-4)

- ⬜ Deploy Grafana stack
- ⬜ Create agent dashboards
- ⬜ Implement custom metrics
- ⬜ Set up alerting

### Phase 4: Advanced Features (Week 5-6)

- ⬜ Distributed tracing
- ⬜ AI-powered insights
- ⬜ Predictive alerting
- ⬜ Cost optimization

## 📊 Expected Outcomes

### Debugging Efficiency

- **90% reduction** in time to identify issues
- **Session replay** for exact reproduction
- **Network timeline** for API debugging
- **State inspection** for Redux/Zustand

### Performance Insights

- **Real-time metrics** for all components
- **P99 latency tracking** for critical paths
- **Resource usage** monitoring
- **User experience** scoring

### Operational Excellence

- **Proactive alerting** before users notice
- **Root cause analysis** with full context
- **Capacity planning** with trend analysis
- **Cost optimization** through usage insights

## 🎯 Success Metrics

1. **MTTR (Mean Time To Resolution)**: < 30 minutes
2. **Error Detection Rate**: > 99%
3. **Performance Degradation Detection**: < 5 minutes
4. **User Session Insights Coverage**: > 80%
5. **Alert Accuracy**: > 95% (low false positives)

This comprehensive observability strategy ensures complete visibility into the CodeClone ambient agents system while maintaining user privacy and system performance.
