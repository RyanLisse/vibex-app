/**
 * Prometheus Metrics Integration
 * 
 * This module provides Prometheus metrics collection and export functionality
 * for monitoring application performance and health.
 */

import { register, collectDefaultMetrics, Counter, Histogram, Gauge } from 'prom-client';

// Initialize default metrics collection
collectDefaultMetrics({ register });

// Custom application metrics
export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10]
});

export const httpRequestTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code']
});

export const activeConnections = new Gauge({
  name: 'active_connections',
  help: 'Number of active connections'
});

export const databaseQueryDuration = new Histogram({
  name: 'database_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['query_type', 'table'],
  buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 3, 5]
});

export const databaseConnectionsActive = new Gauge({
  name: 'database_connections_active',
  help: 'Number of active database connections'
});

export const taskProcessingDuration = new Histogram({
  name: 'task_processing_duration_seconds',
  help: 'Duration of task processing in seconds',
  labelNames: ['task_type', 'status'],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60]
});

export const taskProcessingTotal = new Counter({
  name: 'task_processing_total',
  help: 'Total number of processed tasks',
  labelNames: ['task_type', 'status']
});

// Register custom metrics
register.registerMetric(httpRequestDuration);
register.registerMetric(httpRequestTotal);
register.registerMetric(activeConnections);
register.registerMetric(databaseQueryDuration);
register.registerMetric(databaseConnectionsActive);
register.registerMetric(taskProcessingDuration);
register.registerMetric(taskProcessingTotal);

/**
 * Get metrics in Prometheus format
 */
export async function getMetrics(): Promise<string> {
  return register.metrics();
}

/**
 * Clear all metrics (useful for testing)
 */
export function clearMetrics(): void {
  register.clear();
}

/**
 * Get the Prometheus registry
 */
export function getRegistry() {
  return register;
}

// Re-export custom metrics from other files
export * from './custom-metrics';

export default {
  httpRequestDuration,
  httpRequestTotal,
  activeConnections,
  databaseQueryDuration,
  databaseConnectionsActive,
  taskProcessingDuration,
  taskProcessingTotal,
  getMetrics,
  clearMetrics,
  getRegistry
};
