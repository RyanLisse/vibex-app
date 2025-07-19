/**
 * Grafana Dashboard Configurations
 *
 * Provides dashboard configurations and provisioning for Grafana
 */

import { writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'

export interface GrafanaDashboard {
  uid: string
  title: string
  description: string
  tags: string[]
  timezone: string
  editable: boolean
  panels: GrafanaPanel[]
  templating?: {
    list: GrafanaVariable[]
  }
  time?: {
    from: string
    to: string
  }
  refresh?: string
}

export interface GrafanaPanel {
  id: number
  title: string
  type: 'graph' | 'stat' | 'gauge' | 'table' | 'heatmap' | 'piechart' | 'timeseries'
  gridPos: {
    x: number
    y: number
    w: number
    h: number
  }
  targets: GrafanaTarget[]
  options?: any
  fieldConfig?: any
}

export interface GrafanaTarget {
  expr: string
  refId: string
  legendFormat?: string
  interval?: string
  datasource?: string
}

export interface GrafanaVariable {
  name: string
  label: string
  type: 'query' | 'interval' | 'datasource' | 'custom' | 'constant'
  query?: string
  options?: any[]
  current?: any
  hide?: number
  refresh?: number
}

// Dashboard definitions
export const dashboards = {
  // Main overview dashboard
  overview: createOverviewDashboard(),

  // Database performance dashboard
  database: createDatabaseDashboard(),

  // Agent execution dashboard
  agents: createAgentsDashboard(),

  // System health dashboard
  health: createHealthDashboard(),

  // SLA monitoring dashboard
  sla: createSLADashboard(),

  // Capacity planning dashboard
  capacity: createCapacityDashboard(),
}

// Create overview dashboard
function createOverviewDashboard(): GrafanaDashboard {
  return {
    uid: 'codex-overview',
    title: 'Codex Clone - Overview',
    description: 'System overview and key metrics',
    tags: ['codex', 'overview'],
    timezone: 'browser',
    editable: true,
    refresh: '30s',
    time: {
      from: 'now-6h',
      to: 'now',
    },
    templating: {
      list: [
        {
          name: 'interval',
          label: 'Interval',
          type: 'interval',
          options: [
            { value: '30s', text: '30s' },
            { value: '1m', text: '1m' },
            { value: '5m', text: '5m' },
            { value: '10m', text: '10m' },
            { value: '30m', text: '30m' },
            { value: '1h', text: '1h' },
          ],
          current: { value: '1m', text: '1m' },
          hide: 0,
        },
      ],
    },
    panels: [
      // Request rate
      {
        id: 1,
        title: 'Request Rate',
        type: 'timeseries',
        gridPos: { x: 0, y: 0, w: 12, h: 8 },
        targets: [
          {
            expr: 'rate(http_requests_total[5m])',
            refId: 'A',
            legendFormat: '{{method}} {{route}}',
          },
        ],
        fieldConfig: {
          defaults: {
            unit: 'reqps',
          },
        },
      },
      // Error rate
      {
        id: 2,
        title: 'Error Rate',
        type: 'timeseries',
        gridPos: { x: 12, y: 0, w: 12, h: 8 },
        targets: [
          {
            expr: 'rate(errors_total[5m])',
            refId: 'A',
            legendFormat: '{{type}} - {{severity}}',
          },
        ],
        fieldConfig: {
          defaults: {
            unit: 'percent',
            custom: {
              thresholdsStyle: {
                mode: 'area',
              },
            },
            thresholds: {
              mode: 'absolute',
              steps: [
                { value: 0, color: 'green' },
                { value: 0.05, color: 'yellow' },
                { value: 0.1, color: 'red' },
              ],
            },
          },
        },
      },
      // Response time
      {
        id: 3,
        title: 'Response Time (p95)',
        type: 'timeseries',
        gridPos: { x: 0, y: 8, w: 12, h: 8 },
        targets: [
          {
            expr: 'histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))',
            refId: 'A',
            legendFormat: 'p95',
          },
        ],
        fieldConfig: {
          defaults: {
            unit: 's',
          },
        },
      },
      // Active users
      {
        id: 4,
        title: 'Active Users',
        type: 'stat',
        gridPos: { x: 12, y: 8, w: 6, h: 4 },
        targets: [
          {
            expr: 'active_users_count{timeframe="1h"}',
            refId: 'A',
          },
        ],
        fieldConfig: {
          defaults: {
            unit: 'short',
          },
        },
      },
      // Database connections
      {
        id: 5,
        title: 'Database Connections',
        type: 'gauge',
        gridPos: { x: 18, y: 8, w: 6, h: 4 },
        targets: [
          {
            expr: 'sum(db_connection_pool_size)',
            refId: 'A',
          },
        ],
        fieldConfig: {
          defaults: {
            unit: 'short',
            max: 100,
            thresholds: {
              mode: 'absolute',
              steps: [
                { value: 0, color: 'green' },
                { value: 50, color: 'yellow' },
                { value: 80, color: 'red' },
              ],
            },
          },
        },
      },
      // Memory usage
      {
        id: 6,
        title: 'Memory Usage',
        type: 'timeseries',
        gridPos: { x: 12, y: 12, w: 12, h: 8 },
        targets: [
          {
            expr: 'process_memory_usage_bytes',
            refId: 'A',
            legendFormat: '{{type}}',
          },
        ],
        fieldConfig: {
          defaults: {
            unit: 'bytes',
          },
        },
      },
    ],
  }
}

// Create database performance dashboard
function createDatabaseDashboard(): GrafanaDashboard {
  return {
    uid: 'codex-database',
    title: 'Codex Clone - Database Performance',
    description: 'Database performance metrics and monitoring',
    tags: ['codex', 'database', 'performance'],
    timezone: 'browser',
    editable: true,
    refresh: '30s',
    panels: [
      // Query rate
      {
        id: 1,
        title: 'Query Rate by Type',
        type: 'timeseries',
        gridPos: { x: 0, y: 0, w: 12, h: 8 },
        targets: [
          {
            expr: 'rate(db_queries_total[5m])',
            refId: 'A',
            legendFormat: '{{query_type}}',
          },
        ],
      },
      // Query duration
      {
        id: 2,
        title: 'Query Duration (p95)',
        type: 'timeseries',
        gridPos: { x: 12, y: 0, w: 12, h: 8 },
        targets: [
          {
            expr: 'histogram_quantile(0.95, rate(db_query_duration_seconds_bucket[5m]))',
            refId: 'A',
            legendFormat: '{{query_type}}',
          },
        ],
        fieldConfig: {
          defaults: {
            unit: 's',
          },
        },
      },
      // Connection pool
      {
        id: 3,
        title: 'Connection Pool Status',
        type: 'timeseries',
        gridPos: { x: 0, y: 8, w: 12, h: 8 },
        targets: [
          {
            expr: 'db_connection_pool_size',
            refId: 'A',
            legendFormat: '{{state}}',
          },
        ],
      },
      // Replication lag
      {
        id: 4,
        title: 'Replication Lag',
        type: 'gauge',
        gridPos: { x: 12, y: 8, w: 6, h: 8 },
        targets: [
          {
            expr: 'max(db_replication_lag_seconds)',
            refId: 'A',
          },
        ],
        fieldConfig: {
          defaults: {
            unit: 's',
            thresholds: {
              mode: 'absolute',
              steps: [
                { value: 0, color: 'green' },
                { value: 1, color: 'yellow' },
                { value: 5, color: 'red' },
              ],
            },
          },
        },
      },
      // Cache hit rate
      {
        id: 5,
        title: 'Cache Hit Rate',
        type: 'stat',
        gridPos: { x: 18, y: 8, w: 6, h: 8 },
        targets: [
          {
            expr: 'rate(cache_hits_total[5m]) / (rate(cache_hits_total[5m]) + rate(cache_misses_total[5m]))',
            refId: 'A',
          },
        ],
        fieldConfig: {
          defaults: {
            unit: 'percentunit',
            min: 0,
            max: 1,
          },
        },
      },
      // Table sizes
      {
        id: 6,
        title: 'Table Sizes',
        type: 'table',
        gridPos: { x: 0, y: 16, w: 12, h: 8 },
        targets: [
          {
            expr: 'db_table_size_bytes',
            refId: 'A',
          },
        ],
      },
      // Lock waits
      {
        id: 7,
        title: 'Lock Wait Time',
        type: 'heatmap',
        gridPos: { x: 12, y: 16, w: 12, h: 8 },
        targets: [
          {
            expr: 'increase(db_lock_wait_time_seconds_bucket[5m])',
            refId: 'A',
          },
        ],
      },
    ],
  }
}

// Create agents dashboard
function createAgentsDashboard(): GrafanaDashboard {
  return {
    uid: 'codex-agents',
    title: 'Codex Clone - Agent Executions',
    description: 'Agent execution monitoring and performance',
    tags: ['codex', 'agents', 'ai'],
    timezone: 'browser',
    editable: true,
    refresh: '30s',
    panels: [
      // Execution rate
      {
        id: 1,
        title: 'Agent Execution Rate',
        type: 'timeseries',
        gridPos: { x: 0, y: 0, w: 12, h: 8 },
        targets: [
          {
            expr: 'rate(agent_executions_total[5m])',
            refId: 'A',
            legendFormat: '{{agent_type}} - {{status}}',
          },
        ],
      },
      // Execution duration
      {
        id: 2,
        title: 'Agent Execution Duration',
        type: 'timeseries',
        gridPos: { x: 12, y: 0, w: 12, h: 8 },
        targets: [
          {
            expr: 'histogram_quantile(0.95, rate(agent_execution_duration_seconds_bucket[5m]))',
            refId: 'A',
            legendFormat: '{{agent_type}}',
          },
        ],
        fieldConfig: {
          defaults: {
            unit: 's',
          },
        },
      },
      // Token usage
      {
        id: 3,
        title: 'Token Usage',
        type: 'timeseries',
        gridPos: { x: 0, y: 8, w: 12, h: 8 },
        targets: [
          {
            expr: 'rate(agent_token_usage_total[5m])',
            refId: 'A',
            legendFormat: '{{agent_type}}',
          },
        ],
      },
      // Success rate
      {
        id: 4,
        title: 'Agent Success Rate',
        type: 'stat',
        gridPos: { x: 12, y: 8, w: 12, h: 8 },
        targets: [
          {
            expr: 'rate(agent_executions_total{status="success"}[5m]) / rate(agent_executions_total[5m])',
            refId: 'A',
          },
        ],
        fieldConfig: {
          defaults: {
            unit: 'percentunit',
            min: 0,
            max: 1,
            thresholds: {
              mode: 'absolute',
              steps: [
                { value: 0.95, color: 'green' },
                { value: 0.8, color: 'yellow' },
                { value: 0, color: 'red' },
              ],
            },
          },
        },
      },
      // Workflow executions
      {
        id: 5,
        title: 'Workflow Executions',
        type: 'timeseries',
        gridPos: { x: 0, y: 16, w: 24, h: 8 },
        targets: [
          {
            expr: 'rate(workflow_executions_total[5m])',
            refId: 'A',
            legendFormat: '{{workflow_name}} - {{status}}',
          },
        ],
      },
    ],
  }
}

// Create health dashboard
function createHealthDashboard(): GrafanaDashboard {
  return {
    uid: 'codex-health',
    title: 'Codex Clone - System Health',
    description: 'System health monitoring and alerting',
    tags: ['codex', 'health', 'monitoring'],
    timezone: 'browser',
    editable: true,
    refresh: '30s',
    panels: [
      // System uptime
      {
        id: 1,
        title: 'System Uptime',
        type: 'stat',
        gridPos: { x: 0, y: 0, w: 6, h: 4 },
        targets: [
          {
            expr: 'process_start_time_seconds',
            refId: 'A',
          },
        ],
        fieldConfig: {
          defaults: {
            unit: 'dateTimeFromNow',
          },
        },
      },
      // CPU usage
      {
        id: 2,
        title: 'CPU Usage',
        type: 'gauge',
        gridPos: { x: 6, y: 0, w: 6, h: 4 },
        targets: [
          {
            expr: 'process_cpu_usage_percent',
            refId: 'A',
          },
        ],
        fieldConfig: {
          defaults: {
            unit: 'percent',
            max: 100,
            thresholds: {
              mode: 'absolute',
              steps: [
                { value: 0, color: 'green' },
                { value: 70, color: 'yellow' },
                { value: 90, color: 'red' },
              ],
            },
          },
        },
      },
      // Memory usage
      {
        id: 3,
        title: 'Memory Usage',
        type: 'gauge',
        gridPos: { x: 12, y: 0, w: 6, h: 4 },
        targets: [
          {
            expr: 'process_memory_usage_bytes{type="rss"} / 1024 / 1024 / 1024',
            refId: 'A',
          },
        ],
        fieldConfig: {
          defaults: {
            unit: 'GB',
            thresholds: {
              mode: 'absolute',
              steps: [
                { value: 0, color: 'green' },
                { value: 2, color: 'yellow' },
                { value: 4, color: 'red' },
              ],
            },
          },
        },
      },
      // Error rate
      {
        id: 4,
        title: 'Error Rate',
        type: 'stat',
        gridPos: { x: 18, y: 0, w: 6, h: 4 },
        targets: [
          {
            expr: 'rate(errors_total[5m]) / rate(http_requests_total[5m])',
            refId: 'A',
          },
        ],
        fieldConfig: {
          defaults: {
            unit: 'percentunit',
            thresholds: {
              mode: 'absolute',
              steps: [
                { value: 0, color: 'green' },
                { value: 0.01, color: 'yellow' },
                { value: 0.05, color: 'red' },
              ],
            },
          },
        },
      },
      // Health check status
      {
        id: 5,
        title: 'Health Check Status',
        type: 'table',
        gridPos: { x: 0, y: 4, w: 24, h: 8 },
        targets: [
          {
            expr: 'up',
            refId: 'A',
          },
        ],
      },
      // Alert status
      {
        id: 6,
        title: 'Active Alerts',
        type: 'table',
        gridPos: { x: 0, y: 12, w: 24, h: 8 },
        targets: [
          {
            expr: 'ALERTS{alertstate="firing"}',
            refId: 'A',
          },
        ],
      },
    ],
  }
}

// Create SLA dashboard
function createSLADashboard(): GrafanaDashboard {
  return {
    uid: 'codex-sla',
    title: 'Codex Clone - SLA Monitoring',
    description: 'Service Level Agreement monitoring',
    tags: ['codex', 'sla', 'compliance'],
    timezone: 'browser',
    editable: true,
    refresh: '1m',
    panels: [
      // Availability
      {
        id: 1,
        title: 'Service Availability',
        type: 'stat',
        gridPos: { x: 0, y: 0, w: 8, h: 6 },
        targets: [
          {
            expr: '(1 - (sum(rate(errors_total{severity="critical"}[5m])) / sum(rate(http_requests_total[5m])))) * 100',
            refId: 'A',
          },
        ],
        fieldConfig: {
          defaults: {
            unit: 'percent',
            decimals: 2,
            thresholds: {
              mode: 'absolute',
              steps: [
                { value: 99.9, color: 'green' },
                { value: 99, color: 'yellow' },
                { value: 0, color: 'red' },
              ],
            },
          },
        },
      },
      // Response time SLA
      {
        id: 2,
        title: 'Response Time SLA',
        type: 'stat',
        gridPos: { x: 8, y: 0, w: 8, h: 6 },
        targets: [
          {
            expr: '(sum(rate(http_request_duration_seconds_bucket{le="1"}[5m])) / sum(rate(http_request_duration_seconds_count[5m]))) * 100',
            refId: 'A',
          },
        ],
        fieldConfig: {
          defaults: {
            unit: 'percent',
            decimals: 2,
            thresholds: {
              mode: 'absolute',
              steps: [
                { value: 95, color: 'green' },
                { value: 90, color: 'yellow' },
                { value: 0, color: 'red' },
              ],
            },
          },
        },
      },
      // Error budget
      {
        id: 3,
        title: 'Error Budget Remaining',
        type: 'gauge',
        gridPos: { x: 16, y: 0, w: 8, h: 6 },
        targets: [
          {
            expr: '100 - ((sum(increase(errors_total[30d])) / sum(increase(http_requests_total[30d]))) * 100)',
            refId: 'A',
          },
        ],
        fieldConfig: {
          defaults: {
            unit: 'percent',
            min: 0,
            max: 100,
            thresholds: {
              mode: 'absolute',
              steps: [
                { value: 50, color: 'green' },
                { value: 20, color: 'yellow' },
                { value: 0, color: 'red' },
              ],
            },
          },
        },
      },
      // SLA compliance over time
      {
        id: 4,
        title: 'SLA Compliance Over Time',
        type: 'timeseries',
        gridPos: { x: 0, y: 6, w: 24, h: 10 },
        targets: [
          {
            expr: '(1 - (sum(rate(errors_total[5m])) by (severity) / sum(rate(http_requests_total[5m])))) * 100',
            refId: 'A',
            legendFormat: 'Availability',
          },
          {
            expr: '(sum(rate(http_request_duration_seconds_bucket{le="1"}[5m])) / sum(rate(http_request_duration_seconds_count[5m]))) * 100',
            refId: 'B',
            legendFormat: 'Response Time SLA',
          },
        ],
        fieldConfig: {
          defaults: {
            unit: 'percent',
            custom: {
              fillOpacity: 10,
              lineWidth: 2,
            },
          },
        },
      },
    ],
  }
}

// Create capacity planning dashboard
function createCapacityDashboard(): GrafanaDashboard {
  return {
    uid: 'codex-capacity',
    title: 'Codex Clone - Capacity Planning',
    description: 'Resource utilization and capacity forecasting',
    tags: ['codex', 'capacity', 'planning'],
    timezone: 'browser',
    editable: true,
    refresh: '5m',
    panels: [
      // Database growth trend
      {
        id: 1,
        title: 'Database Growth Trend',
        type: 'timeseries',
        gridPos: { x: 0, y: 0, w: 12, h: 8 },
        targets: [
          {
            expr: 'db_table_size_bytes',
            refId: 'A',
            legendFormat: '{{table}}',
          },
          {
            expr: 'predict_linear(db_table_size_bytes[7d], 30 * 24 * 3600)',
            refId: 'B',
            legendFormat: '{{table}} - 30d forecast',
          },
        ],
        fieldConfig: {
          defaults: {
            unit: 'bytes',
          },
        },
      },
      // Memory usage forecast
      {
        id: 2,
        title: 'Memory Usage Forecast',
        type: 'timeseries',
        gridPos: { x: 12, y: 0, w: 12, h: 8 },
        targets: [
          {
            expr: 'process_memory_usage_bytes{type="rss"}',
            refId: 'A',
            legendFormat: 'Current',
          },
          {
            expr: 'predict_linear(process_memory_usage_bytes{type="rss"}[7d], 30 * 24 * 3600)',
            refId: 'B',
            legendFormat: '30d forecast',
          },
        ],
        fieldConfig: {
          defaults: {
            unit: 'bytes',
          },
        },
      },
      // Connection pool utilization
      {
        id: 3,
        title: 'Connection Pool Utilization',
        type: 'timeseries',
        gridPos: { x: 0, y: 8, w: 12, h: 8 },
        targets: [
          {
            expr: 'db_connection_pool_size{state="active"} / sum(db_connection_pool_size)',
            refId: 'A',
            legendFormat: 'Utilization %',
          },
        ],
        fieldConfig: {
          defaults: {
            unit: 'percentunit',
            custom: {
              thresholdsStyle: {
                mode: 'area',
              },
            },
            thresholds: {
              mode: 'absolute',
              steps: [
                { value: 0, color: 'green' },
                { value: 0.7, color: 'yellow' },
                { value: 0.9, color: 'red' },
              ],
            },
          },
        },
      },
      // Storage capacity
      {
        id: 4,
        title: 'Storage Capacity',
        type: 'stat',
        gridPos: { x: 12, y: 8, w: 6, h: 4 },
        targets: [
          {
            expr: 'sum(db_table_size_bytes) / 1024 / 1024 / 1024',
            refId: 'A',
          },
        ],
        fieldConfig: {
          defaults: {
            unit: 'GB',
            thresholds: {
              mode: 'absolute',
              steps: [
                { value: 0, color: 'green' },
                { value: 100, color: 'yellow' },
                { value: 500, color: 'red' },
              ],
            },
          },
        },
      },
      // Days until capacity limit
      {
        id: 5,
        title: 'Days Until Capacity Limit',
        type: 'stat',
        gridPos: { x: 18, y: 8, w: 6, h: 4 },
        targets: [
          {
            expr: '(1000 * 1024 * 1024 * 1024 - sum(db_table_size_bytes)) / (increase(sum(db_table_size_bytes)[7d]) / 7)',
            refId: 'A',
          },
        ],
        fieldConfig: {
          defaults: {
            unit: 'days',
            decimals: 0,
            thresholds: {
              mode: 'absolute',
              steps: [
                { value: 90, color: 'green' },
                { value: 30, color: 'yellow' },
                { value: 0, color: 'red' },
              ],
            },
          },
        },
      },
      // Resource recommendations
      {
        id: 6,
        title: 'Resource Recommendations',
        type: 'table',
        gridPos: { x: 0, y: 16, w: 24, h: 8 },
        targets: [
          {
            expr: 'topk(5, predict_linear(db_table_size_bytes[7d], 30 * 24 * 3600) - db_table_size_bytes)',
            refId: 'A',
          },
        ],
      },
    ],
  }
}

// Export dashboards to files
export async function exportDashboards(outputPath: string): Promise<void> {
  if (!existsSync(outputPath)) {
    mkdirSync(outputPath, { recursive: true })
  }

  for (const [name, dashboard] of Object.entries(dashboards)) {
    const filename = join(outputPath, `${name}-dashboard.json`)
    writeFileSync(filename, JSON.stringify(dashboard, null, 2))
    console.log(`📊 Exported Grafana dashboard: ${filename}`)
  }
}

// Generate datasource configuration
export function generateDatasourceConfig(prometheusUrl: string): any {
  return {
    apiVersion: 1,
    datasources: [
      {
        name: 'Prometheus',
        type: 'prometheus',
        url: prometheusUrl,
        access: 'proxy',
        isDefault: true,
        jsonData: {
          httpMethod: 'POST',
          timeInterval: '30s',
        },
      },
    ],
  }
}

// Generate dashboard provisioning configuration
export function generateDashboardProvisioning(dashboardPath: string): any {
  return {
    apiVersion: 1,
    providers: [
      {
        name: 'Codex Clone Dashboards',
        orgId: 1,
        folder: 'Codex Clone',
        type: 'file',
        disableDeletion: false,
        updateIntervalSeconds: 10,
        allowUiUpdates: true,
        options: {
          path: dashboardPath,
        },
      },
    ],
  }
}
