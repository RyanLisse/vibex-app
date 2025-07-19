export interface GrafanaDashboard {
  id?: number
  uid?: string
  title: string
  tags: string[]
  timezone: string
  panels: GrafanaPanel[]
  templating: {
    list: GrafanaTemplate[]
  }
  time: {
    from: string
    to: string
  }
  refresh: string
}

export interface GrafanaPanel {
  id: number
  title: string
  type: string
  targets: GrafanaTarget[]
  gridPos: {
    h: number
    w: number
    x: number
    y: number
  }
  options?: any
  fieldConfig?: any
}

export interface GrafanaTarget {
  expr: string
  legendFormat: string
  refId: string
}

export interface GrafanaTemplate {
  name: string
  type: 'query' | 'custom' | 'constant'
  query?: string
  options?: any[]
  refresh: number
}

export class GrafanaDashboardBuilder {
  static createAgentOverviewDashboard(): GrafanaDashboard {
    return {
      title: 'AI Agent Overview',
      tags: ['ai-agents', 'overview'],
      timezone: 'browser',
      panels: [
        {
          id: 1,
          title: 'Active Agents',
          type: 'stat',
          targets: [
            {
              expr: 'sum(agent_active_count)',
              legendFormat: 'Total Active Agents',
              refId: 'A',
            },
          ],
          gridPos: { h: 8, w: 6, x: 0, y: 0 },
        },
        {
          id: 2,
          title: 'Agent Operations Rate',
          type: 'graph',
          targets: [
            {
              expr: 'rate(agent_operations_total[5m])',
              legendFormat: '{{agent_type}} - {{operation}}',
              refId: 'A',
            },
          ],
          gridPos: { h: 8, w: 18, x: 6, y: 0 },
        },
        {
          id: 3,
          title: 'Agent Execution Duration',
          type: 'heatmap',
          targets: [
            {
              expr: 'rate(agent_execution_duration_seconds_bucket[5m])',
              legendFormat: '{{le}}',
              refId: 'A',
            },
          ],
          gridPos: { h: 8, w: 12, x: 0, y: 8 },
        },
        {
          id: 4,
          title: 'Token Usage by Provider',
          type: 'piechart',
          targets: [
            {
              expr: 'sum by (provider) (rate(agent_token_usage_total[1h]))',
              legendFormat: '{{provider}}',
              refId: 'A',
            },
          ],
          gridPos: { h: 8, w: 12, x: 12, y: 8 },
        },
        {
          id: 5,
          title: 'Cost Analysis',
          type: 'bargauge',
          targets: [
            {
              expr: 'sum by (provider) (rate(agent_cost_total[1h]) * 3600)',
              legendFormat: '{{provider}} ($/hour)',
              refId: 'A',
            },
          ],
          gridPos: { h: 8, w: 24, x: 0, y: 16 },
        },
      ],
      templating: {
        list: [
          {
            name: 'agent_type',
            type: 'query',
            query: 'label_values(agent_operations_total, agent_type)',
            refresh: 1,
          },
          {
            name: 'provider',
            type: 'query',
            query: 'label_values(agent_operations_total, provider)',
            refresh: 1,
          },
        ],
      },
      time: {
        from: 'now-1h',
        to: 'now',
      },
      refresh: '30s',
    }
  }

  static createSystemHealthDashboard(): GrafanaDashboard {
    return {
      title: 'System Health & Performance',
      tags: ['system', 'health', 'performance'],
      timezone: 'browser',
      panels: [
        {
          id: 1,
          title: 'HTTP Request Rate',
          type: 'graph',
          targets: [
            {
              expr: 'rate(http_requests_total[5m])',
              legendFormat: '{{method}} {{route}}',
              refId: 'A',
            },
          ],
          gridPos: { h: 8, w: 12, x: 0, y: 0 },
        },
        {
          id: 2,
          title: 'HTTP Response Times',
          type: 'graph',
          targets: [
            {
              expr: 'histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))',
              legendFormat: '95th percentile',
              refId: 'A',
            },
            {
              expr: 'histogram_quantile(0.50, rate(http_request_duration_seconds_bucket[5m]))',
              legendFormat: '50th percentile',
              refId: 'B',
            },
          ],
          gridPos: { h: 8, w: 12, x: 12, y: 0 },
        },
        {
          id: 3,
          title: 'Database Connections',
          type: 'graph',
          targets: [
            {
              expr: 'database_connections_active',
              legendFormat: '{{database}} - {{pool}}',
              refId: 'A',
            },
          ],
          gridPos: { h: 8, w: 12, x: 0, y: 8 },
        },
        {
          id: 4,
          title: 'Database Query Performance',
          type: 'graph',
          targets: [
            {
              expr: 'histogram_quantile(0.95, rate(database_query_duration_seconds_bucket[5m]))',
              legendFormat: '{{operation}} - 95th percentile',
              refId: 'A',
            },
          ],
          gridPos: { h: 8, w: 12, x: 12, y: 8 },
        },
      ],
      templating: {
        list: [],
      },
      time: {
        from: 'now-1h',
        to: 'now',
      },
      refresh: '30s',
    }
  }

  static createBusinessMetricsDashboard(): GrafanaDashboard {
    return {
      title: 'Business Metrics & KPIs',
      tags: ['business', 'kpi', 'metrics'],
      timezone: 'browser',
      panels: [
        {
          id: 1,
          title: 'Active User Sessions',
          type: 'stat',
          targets: [
            {
              expr: 'user_sessions_active',
              legendFormat: 'Active Sessions',
              refId: 'A',
            },
          ],
          gridPos: { h: 8, w: 6, x: 0, y: 0 },
        },
        {
          id: 2,
          title: 'Feature Usage Trends',
          type: 'graph',
          targets: [
            {
              expr: 'rate(feature_usage_total[1h])',
              legendFormat: '{{feature}}',
              refId: 'A',
            },
          ],
          gridPos: { h: 8, w: 18, x: 6, y: 0 },
        },
        {
          id: 3,
          title: 'Cost per Operation',
          type: 'table',
          targets: [
            {
              expr: 'sum by (provider) (rate(agent_cost_total[1h])) / sum by (provider) (rate(agent_operations_total[1h]))',
              legendFormat: '{{provider}}',
              refId: 'A',
            },
          ],
          gridPos: { h: 8, w: 12, x: 0, y: 8 },
        },
        {
          id: 4,
          title: 'System Efficiency',
          type: 'gauge',
          targets: [
            {
              expr: 'sum(rate(agent_operations_total{status="success"}[5m])) / sum(rate(agent_operations_total[5m]))',
              legendFormat: 'Success Rate',
              refId: 'A',
            },
          ],
          gridPos: { h: 8, w: 12, x: 12, y: 8 },
        },
      ],
      templating: {
        list: [],
      },
      time: {
        from: 'now-24h',
        to: 'now',
      },
      refresh: '5m',
    }
  }
}
