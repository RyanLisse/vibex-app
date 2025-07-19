/**
 * Custom Prometheus Metrics
 *
 * Domain-specific metrics for database observability
 */

import { Counter, Gauge, Histogram } from 'prom-client'
import { prometheusRegistry } from './index'

// Database observability specific metrics
export const dbObservabilityMetrics = {
  // Sync metrics
  syncOperationsTotal: new Counter({
    name: 'db_sync_operations_total',
    help: 'Total number of database sync operations',
    labelNames: ['operation_type', 'source', 'destination', 'status'],
    registers: [prometheusRegistry],
  }),

  syncLatency: new Histogram({
    name: 'db_sync_latency_seconds',
    help: 'Database sync operation latency',
    labelNames: ['operation_type', 'source', 'destination'],
    buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10, 30],
    registers: [prometheusRegistry],
  }),

  syncConflictsTotal: new Counter({
    name: 'db_sync_conflicts_total',
    help: 'Total number of sync conflicts',
    labelNames: ['conflict_type', 'resolution'],
    registers: [prometheusRegistry],
  }),

  // Replication lag
  replicationLagSeconds: new Gauge({
    name: 'db_replication_lag_seconds',
    help: 'Database replication lag in seconds',
    labelNames: ['source', 'replica'],
    registers: [prometheusRegistry],
  }),

  // Schema migration metrics
  schemaMigrationsTotal: new Counter({
    name: 'db_schema_migrations_total',
    help: 'Total number of schema migrations',
    labelNames: ['migration_type', 'status'],
    registers: [prometheusRegistry],
  }),

  schemaMigrationDuration: new Histogram({
    name: 'db_schema_migration_duration_seconds',
    help: 'Schema migration duration',
    labelNames: ['migration_type'],
    buckets: [1, 5, 10, 30, 60, 300, 600, 1800],
    registers: [prometheusRegistry],
  }),

  // Index metrics
  indexUsage: new Gauge({
    name: 'db_index_usage_ratio',
    help: 'Index usage ratio (0-1)',
    labelNames: ['table', 'index_name'],
    registers: [prometheusRegistry],
  }),

  indexSize: new Gauge({
    name: 'db_index_size_bytes',
    help: 'Index size in bytes',
    labelNames: ['table', 'index_name'],
    registers: [prometheusRegistry],
  }),

  // Table metrics
  tableSize: new Gauge({
    name: 'db_table_size_bytes',
    help: 'Table size in bytes',
    labelNames: ['table'],
    registers: [prometheusRegistry],
  }),

  tableRowCount: new Gauge({
    name: 'db_table_row_count',
    help: 'Number of rows in table',
    labelNames: ['table'],
    registers: [prometheusRegistry],
  }),

  // Deadlock metrics
  deadlocksTotal: new Counter({
    name: 'db_deadlocks_total',
    help: 'Total number of deadlocks',
    labelNames: ['table', 'query_type'],
    registers: [prometheusRegistry],
  }),

  // Lock wait metrics
  lockWaitTime: new Histogram({
    name: 'db_lock_wait_time_seconds',
    help: 'Time spent waiting for locks',
    labelNames: ['lock_type', 'table'],
    buckets: [0.001, 0.01, 0.1, 0.5, 1, 5, 10],
    registers: [prometheusRegistry],
  }),

  // WASM integration metrics
  wasmOperationsTotal: new Counter({
    name: 'wasm_operations_total',
    help: 'Total number of WASM operations',
    labelNames: ['operation', 'module', 'status'],
    registers: [prometheusRegistry],
  }),

  wasmExecutionTime: new Histogram({
    name: 'wasm_execution_time_seconds',
    help: 'WASM operation execution time',
    labelNames: ['operation', 'module'],
    buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
    registers: [prometheusRegistry],
  }),

  wasmMemoryUsage: new Gauge({
    name: 'wasm_memory_usage_bytes',
    help: 'WASM memory usage in bytes',
    labelNames: ['module'],
    registers: [prometheusRegistry],
  }),

  // Vector search metrics
  vectorSearchOperations: new Counter({
    name: 'vector_search_operations_total',
    help: 'Total number of vector search operations',
    labelNames: ['index_type', 'dimension', 'status'],
    registers: [prometheusRegistry],
  }),

  vectorSearchLatency: new Histogram({
    name: 'vector_search_latency_seconds',
    help: 'Vector search operation latency',
    labelNames: ['index_type', 'dimension'],
    buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5],
    registers: [prometheusRegistry],
  }),

  vectorIndexSize: new Gauge({
    name: 'vector_index_size_entries',
    help: 'Number of entries in vector index',
    labelNames: ['index_name'],
    registers: [prometheusRegistry],
  }),
}

// OpenTelemetry integration metrics
export const otelMetrics = {
  tracesExported: new Counter({
    name: 'otel_traces_exported_total',
    help: 'Total number of traces exported',
    labelNames: ['exporter', 'status'],
    registers: [prometheusRegistry],
  }),

  spansExported: new Counter({
    name: 'otel_spans_exported_total',
    help: 'Total number of spans exported',
    labelNames: ['exporter', 'status'],
    registers: [prometheusRegistry],
  }),

  metricsExported: new Counter({
    name: 'otel_metrics_exported_total',
    help: 'Total number of metrics exported',
    labelNames: ['exporter', 'status'],
    registers: [prometheusRegistry],
  }),

  exportLatency: new Histogram({
    name: 'otel_export_latency_seconds',
    help: 'OpenTelemetry export latency',
    labelNames: ['exporter', 'signal_type'],
    buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
    registers: [prometheusRegistry],
  }),
}

// Helper functions for recording custom metrics
export const recordSyncOperation = (
  operationType: string,
  source: string,
  destination: string,
  status: 'success' | 'failure',
  latency: number
): void => {
  dbObservabilityMetrics.syncOperationsTotal.inc({
    operation_type: operationType,
    source,
    destination,
    status,
  })

  dbObservabilityMetrics.syncLatency.observe(
    {
      operation_type: operationType,
      source,
      destination,
    },
    latency / 1000
  )
}

export const recordSyncConflict = (
  conflictType: string,
  resolution: 'auto' | 'manual' | 'failed'
): void => {
  dbObservabilityMetrics.syncConflictsTotal.inc({
    conflict_type: conflictType,
    resolution,
  })
}

export const updateReplicationLag = (source: string, replica: string, lagSeconds: number): void => {
  dbObservabilityMetrics.replicationLagSeconds.set(
    {
      source,
      replica,
    },
    lagSeconds
  )
}

export const recordSchemaMigration = (
  migrationType: string,
  status: 'success' | 'failure',
  duration: number
): void => {
  dbObservabilityMetrics.schemaMigrationsTotal.inc({
    migration_type: migrationType,
    status,
  })

  dbObservabilityMetrics.schemaMigrationDuration.observe(
    {
      migration_type: migrationType,
    },
    duration / 1000
  )
}

export const updateIndexMetrics = (
  table: string,
  indexName: string,
  usageRatio: number,
  sizeBytes: number
): void => {
  dbObservabilityMetrics.indexUsage.set({ table, index_name: indexName }, usageRatio)
  dbObservabilityMetrics.indexSize.set({ table, index_name: indexName }, sizeBytes)
}

export const updateTableMetrics = (table: string, sizeBytes: number, rowCount: number): void => {
  dbObservabilityMetrics.tableSize.set({ table }, sizeBytes)
  dbObservabilityMetrics.tableRowCount.set({ table }, rowCount)
}

export const recordDeadlock = (table: string, queryType: string): void => {
  dbObservabilityMetrics.deadlocksTotal.inc({ table, query_type: queryType })
}

export const recordLockWait = (lockType: string, table: string, waitTime: number): void => {
  dbObservabilityMetrics.lockWaitTime.observe(
    {
      lock_type: lockType,
      table,
    },
    waitTime / 1000
  )
}

export const recordWasmOperation = (
  operation: string,
  module: string,
  status: 'success' | 'failure',
  executionTime: number
): void => {
  dbObservabilityMetrics.wasmOperationsTotal.inc({
    operation,
    module,
    status,
  })

  dbObservabilityMetrics.wasmExecutionTime.observe(
    {
      operation,
      module,
    },
    executionTime / 1000
  )
}

export const updateWasmMemoryUsage = (module: string, memoryBytes: number): void => {
  dbObservabilityMetrics.wasmMemoryUsage.set({ module }, memoryBytes)
}

export const recordVectorSearch = (
  indexType: string,
  dimension: string,
  status: 'success' | 'failure',
  latency: number
): void => {
  dbObservabilityMetrics.vectorSearchOperations.inc({
    index_type: indexType,
    dimension,
    status,
  })

  dbObservabilityMetrics.vectorSearchLatency.observe(
    {
      index_type: indexType,
      dimension,
    },
    latency / 1000
  )
}

export const updateVectorIndexSize = (indexName: string, entryCount: number): void => {
  dbObservabilityMetrics.vectorIndexSize.set({ index_name: indexName }, entryCount)
}

export const recordOtelExport = (
  exporter: string,
  signalType: 'traces' | 'metrics' | 'logs',
  status: 'success' | 'failure',
  count: number,
  latency: number
): void => {
  const counterMap = {
    traces: otelMetrics.tracesExported,
    metrics: otelMetrics.metricsExported,
    logs: otelMetrics.spansExported, // Using spans for logs
  }

  counterMap[signalType].inc({ exporter, status }, count)

  otelMetrics.exportLatency.observe(
    {
      exporter,
      signal_type: signalType,
    },
    latency / 1000
  )
}
