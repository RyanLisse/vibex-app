# Observability Integration

This guide covers how the base infrastructure integrates with observability tools for monitoring, tracing, and debugging APIs.

## Overview

The base infrastructure provides built-in observability through:
- **Distributed Tracing** - Track requests across services
- **Metrics Collection** - Monitor performance and usage
- **Event Logging** - Record important business events
- **Error Tracking** - Capture and analyze errors
- **Performance Monitoring** - Track response times and resource usage

## Tracing with OpenTelemetry

### 1. Automatic Span Creation

Every service method wrapped with `executeWithTracing` creates a span:

```typescript
class ProductService extends BaseAPIService {
  async getProduct(id: string, context: ServiceContext) {
    return this.executeWithTracing('getProduct', context, async (span) => {
      // Span is automatically created with:
      // - Operation name: 'products.getProduct'
      // - Service name: 'products'
      // - Context attributes (userId, sessionId, requestId)
      
      // Add custom attributes
      span.setAttributes({
        'product.id': id,
        'product.source': 'database'
      })
      
      // Add events for important steps
      span.addEvent('cache_check_start')
      const cached = await this.checkCache(id)
      span.addEvent('cache_check_complete', {
        'cache.hit': !!cached
      })
      
      if (cached) {
        return cached
      }
      
      // Nested spans for sub-operations
      const product = await this.fetchFromDatabase(id, span)
      
      return product
    })
  }
  
  private async fetchFromDatabase(id: string, parentSpan: Span) {
    const span = this.tracer.startSpan('fetchFromDatabase', {
      parent: parentSpan
    })
    
    try {
      const product = await db.query.products.findFirst({
        where: eq(products.id, id)
      })
      
      span.setAttributes({
        'db.operation': 'findFirst',
        'db.table': 'products',
        'db.found': !!product
      })
      
      return product
    } catch (error) {
      span.recordException(error as Error)
      span.setStatus({ code: SpanStatusCode.ERROR })
      throw error
    } finally {
      span.end()
    }
  }
}
```

### 2. Trace Context Propagation

```typescript
// Propagate trace context to external services
class ExternalAPIService extends BaseAPIService {
  async callExternalAPI(endpoint: string, data: any, context: ServiceContext) {
    return this.executeWithTracing('callExternalAPI', context, async (span) => {
      const headers: Record<string, string> = {}
      
      // Inject trace context into headers
      const carrier = {}
      propagation.inject(context.active(), carrier)
      Object.assign(headers, carrier)
      
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...headers
          },
          body: JSON.stringify(data)
        })
        
        span.setAttributes({
          'http.method': 'POST',
          'http.url': endpoint,
          'http.status_code': response.status
        })
        
        if (!response.ok) {
          span.setStatus({ 
            code: SpanStatusCode.ERROR,
            message: `HTTP ${response.status}`
          })
        }
        
        return response.json()
      } catch (error) {
        span.recordException(error as Error)
        throw new ExternalServiceError('ExternalAPI', error as Error)
      }
    })
  }
}
```

### 3. Custom Instrumentation

```typescript
import { trace, context, SpanKind } from '@opentelemetry/api'

// Custom tracer for specific components
const cacheTracer = trace.getTracer('cache-operations')

class CacheManager {
  async get(key: string): Promise<any> {
    const span = cacheTracer.startSpan('cache.get', {
      kind: SpanKind.INTERNAL,
      attributes: {
        'cache.key': key,
        'cache.operation': 'get'
      }
    })
    
    return context.with(trace.setSpan(context.active(), span), async () => {
      try {
        const startTime = performance.now()
        const value = await redis.get(key)
        const duration = performance.now() - startTime
        
        span.setAttributes({
          'cache.hit': !!value,
          'cache.duration_ms': duration
        })
        
        return value ? JSON.parse(value) : null
      } catch (error) {
        span.recordException(error as Error)
        span.setStatus({ code: SpanStatusCode.ERROR })
        throw error
      } finally {
        span.end()
      }
    })
  }
}
```

## Metrics Collection

### 1. Automatic Metrics

The base infrastructure automatically collects:

```typescript
// HTTP metrics (collected by BaseAPIHandler)
observability.metrics.httpRequestDuration(
  duration,
  method,      // GET, POST, etc.
  path,        // /api/users
  statusCode   // 200, 404, 500, etc.
)

// Query metrics (collected by BaseAPIService)
observability.metrics.queryDuration(
  duration,
  operation,   // getUser, createProduct, etc.
  success,     // true/false
  { service: serviceName }
)

// Error rate metrics
observability.metrics.errorRate(
  1,
  serviceName,
  {
    operation,
    error_type // VALIDATION_ERROR, NOT_FOUND, etc.
  }
)
```

### 2. Custom Business Metrics

```typescript
class OrderService extends BaseAPIService {
  async createOrder(orderData: CreateOrderData, context: ServiceContext) {
    return this.executeWithTracing('createOrder', context, async (span) => {
      const order = await this.processOrder(orderData)
      
      // Business metrics
      observability.metrics.increment('orders_created', {
        payment_method: order.paymentMethod,
        shipping_type: order.shippingType,
        customer_type: order.isNewCustomer ? 'new' : 'returning'
      })
      
      observability.metrics.gauge('order_total_amount', order.totalAmount, {
        currency: order.currency,
        region: order.shippingAddress.country
      })
      
      // Track order processing time
      observability.metrics.histogram(
        order.processingTime,
        'order_processing_duration',
        {
          payment_method: order.paymentMethod,
          item_count: order.items.length
        }
      )
      
      return order
    })
  }
  
  async trackInventory() {
    const inventory = await this.getInventoryLevels()
    
    inventory.forEach(item => {
      observability.metrics.gauge('inventory_level', item.quantity, {
        product_id: item.productId,
        warehouse: item.warehouse,
        status: item.quantity === 0 ? 'out_of_stock' : 
                item.quantity < 10 ? 'low_stock' : 'in_stock'
      })
    })
  }
}
```

### 3. Performance Metrics

```typescript
class PerformanceMonitor {
  trackApiPerformance(endpoint: string, duration: number, metadata: any) {
    // Response time histogram
    observability.metrics.histogram(duration, 'api_response_time', {
      endpoint,
      method: metadata.method,
      status_code_group: Math.floor(metadata.statusCode / 100) + 'xx'
    })
    
    // Percentile tracking
    this.updatePercentiles(endpoint, duration)
    
    // SLA compliance
    const slaThreshold = this.getSLAThreshold(endpoint)
    if (duration > slaThreshold) {
      observability.metrics.increment('sla_violations', {
        endpoint,
        threshold_ms: slaThreshold,
        actual_ms: duration
      })
    }
  }
  
  private updatePercentiles(endpoint: string, duration: number) {
    // Track p50, p95, p99
    const buckets = [50, 95, 99]
    buckets.forEach(percentile => {
      observability.metrics.histogram(
        duration,
        `api_response_time_p${percentile}`,
        { endpoint }
      )
    })
  }
}
```

## Event Logging

### 1. Business Event Recording

```typescript
// Automatic event recording in services
await this.recordEvent(
  'user_registered',              // action
  'New user registration',        // message
  {                              // metadata
    userId: user.id,
    email: user.email,
    registrationSource: 'web',
    referralCode: data.referralCode
  }
)

// Events are automatically enriched with:
// - Service name
// - Timestamp
// - Correlation ID
// - Environment info
```

### 2. Security Event Logging

```typescript
class SecurityEventLogger {
  async logSecurityEvent(event: SecurityEvent) {
    await observability.events.collector.collectEvent(
      event.action,
      event.severity, // 'info', 'warning', 'error', 'critical'
      event.message,
      {
        userId: event.userId,
        ipAddress: event.ipAddress,
        userAgent: event.userAgent,
        resource: event.resource,
        result: event.result,
        metadata: event.metadata
      },
      'security',
      ['security', event.type]
    )
    
    // Critical events trigger alerts
    if (event.severity === 'critical') {
      await this.triggerSecurityAlert(event)
    }
  }
  
  async logFailedLogin(email: string, ipAddress: string, reason: string) {
    await this.logSecurityEvent({
      action: 'login_failed',
      severity: 'warning',
      message: `Failed login attempt for ${email}`,
      type: 'authentication',
      ipAddress,
      resource: '/api/auth/login',
      result: 'failed',
      metadata: { email, reason }
    })
  }
}
```

### 3. Audit Trail

```typescript
class AuditService extends BaseAPIService {
  async recordDataChange(
    entity: string,
    entityId: string,
    action: 'create' | 'update' | 'delete',
    changes: any,
    context: ServiceContext
  ) {
    const auditEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      entity,
      entityId,
      action,
      userId: context.userId,
      sessionId: context.sessionId,
      changes: action === 'update' ? this.diffChanges(changes) : changes,
      ipAddress: context.headers['x-forwarded-for'],
      userAgent: context.headers['user-agent']
    }
    
    // Store in database
    await db.insert(auditLogs).values(auditEntry)
    
    // Send to event stream
    await this.recordEvent(
      `${entity}_${action}`,
      `${entity} ${action}d by user ${context.userId}`,
      auditEntry
    )
  }
  
  private diffChanges(changes: any) {
    // Calculate what changed
    return Object.entries(changes).reduce((diff, [key, newValue]) => {
      if (changes.oldValues && changes.oldValues[key] !== newValue) {
        diff[key] = {
          old: changes.oldValues[key],
          new: newValue
        }
      }
      return diff
    }, {} as Record<string, any>)
  }
}
```

## Error Tracking

### 1. Automatic Error Capture

```typescript
// Errors thrown in services are automatically captured
class BaseAPIError {
  private recordError() {
    // Record error metrics
    observability.metrics.errorRate(1, 'api_error', {
      error_code: this.code,
      status_code: String(this.statusCode),
    })
    
    // Record error event with full context
    observability.events.collector.collectEvent(
      'api_error',
      'error',
      this.message,
      {
        code: this.code,
        statusCode: this.statusCode,
        details: this.details,
        context: this.context,
        stack: this.stack,
      },
      'api',
      ['error', this.code.toLowerCase()]
    )
  }
}
```

### 2. Error Analysis

```typescript
class ErrorAnalyzer {
  private errorPatterns = new Map<string, ErrorPattern[]>()
  
  async analyzeError(error: BaseAPIError, context: RequestContext) {
    // Group similar errors
    const pattern = this.findErrorPattern(error)
    
    if (pattern) {
      pattern.occurrences++
      pattern.lastSeen = new Date()
      
      // Check for error spike
      if (this.isErrorSpike(pattern)) {
        await this.alertOnErrorSpike(pattern, error)
      }
    } else {
      // New error pattern
      this.recordNewPattern(error)
    }
    
    // Analyze error context
    const analysis = {
      errorCode: error.code,
      endpoint: context.path,
      userId: context.userId,
      frequency: pattern?.occurrences || 1,
      firstSeen: pattern?.firstSeen || new Date(),
      relatedErrors: this.findRelatedErrors(error)
    }
    
    await observability.events.collector.collectEvent(
      'error_analysis',
      'info',
      'Error pattern analysis',
      analysis,
      'monitoring',
      ['error-analysis']
    )
  }
  
  private isErrorSpike(pattern: ErrorPattern): boolean {
    const recentErrors = pattern.timeline.filter(
      time => time > Date.now() - 60000 // Last minute
    )
    
    return recentErrors.length > pattern.normalRate * 3
  }
}
```

## Dashboard Integration

### 1. Grafana Dashboard Configuration

```typescript
// lib/observability/dashboards/api-dashboard.ts
export const apiDashboard = {
  title: 'API Performance Dashboard',
  panels: [
    {
      title: 'Request Rate',
      query: 'rate(http_requests_total[5m])',
      visualization: 'graph'
    },
    {
      title: 'Response Time (p95)',
      query: 'histogram_quantile(0.95, http_request_duration_seconds_bucket)',
      visualization: 'graph'
    },
    {
      title: 'Error Rate',
      query: 'rate(api_errors_total[5m]) / rate(http_requests_total[5m])',
      visualization: 'graph',
      thresholds: [
        { value: 0.01, color: 'yellow' },
        { value: 0.05, color: 'red' }
      ]
    },
    {
      title: 'Top Slow Endpoints',
      query: `
        topk(10, 
          histogram_quantile(0.95, 
            http_request_duration_seconds_bucket
          ) by (endpoint)
        )
      `,
      visualization: 'table'
    }
  ]
}
```

### 2. Real-time Monitoring

```typescript
class RealtimeMonitor {
  private metrics = new Map<string, RealtimeMetric>()
  private websocket: WebSocket
  
  startMonitoring() {
    // Collect metrics every second
    setInterval(() => {
      this.collectMetrics()
      this.broadcastMetrics()
    }, 1000)
    
    // Check thresholds
    setInterval(() => {
      this.checkThresholds()
    }, 10000)
  }
  
  private collectMetrics() {
    // Current request rate
    const requestRate = this.calculateRate('http_requests')
    this.metrics.set('request_rate', {
      value: requestRate,
      timestamp: Date.now()
    })
    
    // Current error rate
    const errorRate = this.calculateRate('api_errors') / requestRate
    this.metrics.set('error_rate', {
      value: errorRate,
      timestamp: Date.now()
    })
    
    // Active connections
    const activeConnections = this.getActiveConnections()
    this.metrics.set('active_connections', {
      value: activeConnections,
      timestamp: Date.now()
    })
  }
  
  private broadcastMetrics() {
    const snapshot = Object.fromEntries(this.metrics)
    
    // Send to connected dashboards
    this.websocket.send(JSON.stringify({
      type: 'metrics_update',
      data: snapshot
    }))
  }
  
  private checkThresholds() {
    const errorRate = this.metrics.get('error_rate')?.value || 0
    
    if (errorRate > 0.05) {
      this.triggerAlert({
        level: 'critical',
        metric: 'error_rate',
        value: errorRate,
        threshold: 0.05,
        message: 'High error rate detected'
      })
    }
  }
}
```

## Logging Best Practices

### 1. Structured Logging

```typescript
// Use structured logging for better searchability
logger.info('Order processed', {
  orderId: order.id,
  userId: order.userId,
  total: order.total,
  processingTime: duration,
  paymentMethod: order.paymentMethod,
  itemCount: order.items.length
})

// Correlation IDs for request tracing
logger.info('Starting request processing', {
  correlationId: context.requestId,
  endpoint: context.path,
  method: context.method,
  userId: context.userId
})
```

### 2. Log Levels

```typescript
// Debug - Detailed information for debugging
logger.debug('Cache lookup', { key, found: !!value })

// Info - General operational information
logger.info('User login successful', { userId, loginMethod })

// Warning - Something unexpected but handled
logger.warn('Rate limit approaching', { 
  userId, 
  current: 95, 
  limit: 100 
})

// Error - Error that needs attention
logger.error('Payment processing failed', {
  error: error.message,
  orderId,
  paymentProvider
})

// Critical - System-wide issues
logger.critical('Database connection lost', {
  error: error.message,
  affectedServices: ['orders', 'users']
})
```

### 3. Sensitive Data Handling

```typescript
// Redact sensitive information
const safeLogger = {
  info: (message: string, data: any) => {
    const sanitized = redactSensitiveData(data)
    logger.info(message, sanitized)
  }
}

function redactSensitiveData(data: any): any {
  const sensitive = ['password', 'token', 'secret', 'ssn', 'creditCard']
  
  if (typeof data === 'object') {
    return Object.entries(data).reduce((safe, [key, value]) => {
      if (sensitive.some(s => key.toLowerCase().includes(s))) {
        safe[key] = '[REDACTED]'
      } else if (typeof value === 'object') {
        safe[key] = redactSensitiveData(value)
      } else {
        safe[key] = value
      }
      return safe
    }, {} as any)
  }
  
  return data
}
```

## Alerting

### 1. Alert Configuration

```typescript
interface AlertRule {
  name: string
  condition: string
  threshold: number
  duration: string
  severity: 'warning' | 'critical'
  channels: string[]
}

const alertRules: AlertRule[] = [
  {
    name: 'High Error Rate',
    condition: 'error_rate',
    threshold: 0.05,
    duration: '5m',
    severity: 'critical',
    channels: ['pagerduty', 'slack']
  },
  {
    name: 'Slow Response Time',
    condition: 'p95_response_time',
    threshold: 1000,
    duration: '10m',
    severity: 'warning',
    channels: ['slack']
  },
  {
    name: 'Memory Usage High',
    condition: 'memory_usage_percent',
    threshold: 90,
    duration: '5m',
    severity: 'critical',
    channels: ['pagerduty']
  }
]
```

### 2. Alert Manager

```typescript
class AlertManager {
  async checkAlerts() {
    for (const rule of alertRules) {
      const value = await this.getMetricValue(rule.condition)
      
      if (value > rule.threshold) {
        const duration = await this.getConditionDuration(
          rule.condition,
          rule.threshold
        )
        
        if (duration >= this.parseDuration(rule.duration)) {
          await this.triggerAlert(rule, value)
        }
      }
    }
  }
  
  private async triggerAlert(rule: AlertRule, value: number) {
    const alert = {
      id: crypto.randomUUID(),
      rule: rule.name,
      severity: rule.severity,
      value,
      threshold: rule.threshold,
      timestamp: new Date(),
      message: `${rule.name}: ${value} exceeds threshold ${rule.threshold}`
    }
    
    // Send to channels
    for (const channel of rule.channels) {
      await this.sendToChannel(channel, alert)
    }
    
    // Record alert
    await observability.events.collector.collectEvent(
      'alert_triggered',
      rule.severity,
      alert.message,
      alert,
      'monitoring',
      ['alert', rule.severity]
    )
  }
}
```

## Integration Examples

### 1. Datadog Integration

```typescript
import { StatsD } from 'node-dogstatsd'

const dogstatsd = new StatsD()

// Wrap observability metrics
observability.metrics = {
  increment: (metric: string, tags?: Record<string, string>) => {
    dogstatsd.increment(metric, 1, tags)
  },
  
  gauge: (value: number, metric: string, tags?: Record<string, string>) => {
    dogstatsd.gauge(metric, value, tags)
  },
  
  histogram: (value: number, metric: string, tags?: Record<string, string>) => {
    dogstatsd.histogram(metric, value, tags)
  }
}
```

### 2. New Relic Integration

```typescript
import newrelic from 'newrelic'

// Wrap service methods
class InstrumentedService extends BaseAPIService {
  async executeWithTracing<T>(
    operation: string,
    context: ServiceContext,
    fn: (span: Span) => Promise<T>
  ): Promise<T> {
    return newrelic.startSegment(
      `${this.serviceName}.${operation}`,
      true,
      async () => {
        return super.executeWithTracing(operation, context, fn)
      }
    )
  }
}
```

## Observability Checklist

### Tracing
- [ ] All service methods wrapped with tracing
- [ ] Custom span attributes added
- [ ] Important events recorded in spans
- [ ] Trace context propagated to external services
- [ ] Error spans properly marked

### Metrics
- [ ] HTTP metrics collected automatically
- [ ] Business metrics defined and collected
- [ ] Performance metrics tracked
- [ ] Custom metrics for key operations
- [ ] Metric dashboards configured

### Logging
- [ ] Structured logging implemented
- [ ] Log levels used appropriately
- [ ] Sensitive data redacted
- [ ] Correlation IDs included
- [ ] Log aggregation configured

### Monitoring
- [ ] Real-time monitoring active
- [ ] Alert rules defined
- [ ] Alert channels configured
- [ ] SLA monitoring in place
- [ ] Capacity planning metrics

### Integration
- [ ] APM tool integrated
- [ ] Log aggregation service connected
- [ ] Metrics backend configured
- [ ] Alerting system integrated
- [ ] Dashboards created