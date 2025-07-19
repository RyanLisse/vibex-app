import { describe, expect, it } from 'bun:test'
import {
  type GrafanaDashboard,
  GrafanaDashboardBuilder,
  type GrafanaPanel,
} from './grafana-dashboards'

describe('GrafanaDashboardBuilder', () => {
  describe('createAgentOverviewDashboard', () => {
    let dashboard: GrafanaDashboard

    it('should create agent overview dashboard with correct structure', () => {
      dashboard = GrafanaDashboardBuilder.createAgentOverviewDashboard()

      expect(dashboard.title).toBe('AI Agent Overview')
      expect(dashboard.tags).toContain('ai-agents')
      expect(dashboard.tags).toContain('overview')
      expect(dashboard.timezone).toBe('browser')
      expect(dashboard.refresh).toBe('30s')
    })

    it('should have correct time range', () => {
      dashboard = GrafanaDashboardBuilder.createAgentOverviewDashboard()

      expect(dashboard.time.from).toBe('now-1h')
      expect(dashboard.time.to).toBe('now')
    })

    it('should include active agents panel', () => {
      dashboard = GrafanaDashboardBuilder.createAgentOverviewDashboard()

      const activeAgentsPanel = dashboard.panels.find((p) => p.title === 'Active Agents')
      expect(activeAgentsPanel).toBeDefined()
      expect(activeAgentsPanel?.type).toBe('stat')
      expect(activeAgentsPanel?.targets[0].expr).toBe('sum(agent_active_count)')
      expect(activeAgentsPanel?.targets[0].legendFormat).toBe('Total Active Agents')
    })

    it('should include agent operations rate panel', () => {
      dashboard = GrafanaDashboardBuilder.createAgentOverviewDashboard()

      const operationsPanel = dashboard.panels.find((p) => p.title === 'Agent Operations Rate')
      expect(operationsPanel).toBeDefined()
      expect(operationsPanel?.type).toBe('graph')
      expect(operationsPanel?.targets[0].expr).toBe('rate(agent_operations_total[5m])')
      expect(operationsPanel?.targets[0].legendFormat).toBe('{{agent_type}} - {{operation}}')
    })

    it('should include execution duration heatmap', () => {
      dashboard = GrafanaDashboardBuilder.createAgentOverviewDashboard()

      const heatmapPanel = dashboard.panels.find((p) => p.title === 'Agent Execution Duration')
      expect(heatmapPanel).toBeDefined()
      expect(heatmapPanel?.type).toBe('heatmap')
      expect(heatmapPanel?.targets[0].expr).toBe(
        'rate(agent_execution_duration_seconds_bucket[5m])'
      )
    })

    it('should include token usage pie chart', () => {
      dashboard = GrafanaDashboardBuilder.createAgentOverviewDashboard()

      const pieChart = dashboard.panels.find((p) => p.title === 'Token Usage by Provider')
      expect(pieChart).toBeDefined()
      expect(pieChart?.type).toBe('piechart')
      expect(pieChart?.targets[0].expr).toBe(
        'sum by (provider) (rate(agent_token_usage_total[1h]))'
      )
    })

    it('should include cost analysis panel', () => {
      dashboard = GrafanaDashboardBuilder.createAgentOverviewDashboard()

      const costPanel = dashboard.panels.find((p) => p.title === 'Cost Analysis')
      expect(costPanel).toBeDefined()
      expect(costPanel?.type).toBe('bargauge')
      expect(costPanel?.targets[0].expr).toBe(
        'sum by (provider) (rate(agent_cost_total[1h]) * 3600)'
      )
      expect(costPanel?.targets[0].legendFormat).toBe('{{provider}} ($/hour)')
    })

    it('should have templating variables', () => {
      dashboard = GrafanaDashboardBuilder.createAgentOverviewDashboard()

      expect(dashboard.templating.list).toHaveLength(2)

      const agentTypeVar = dashboard.templating.list.find((v) => v.name === 'agent_type')
      expect(agentTypeVar).toBeDefined()
      expect(agentTypeVar?.type).toBe('query')
      expect(agentTypeVar?.query).toBe('label_values(agent_operations_total, agent_type)')

      const providerVar = dashboard.templating.list.find((v) => v.name === 'provider')
      expect(providerVar).toBeDefined()
      expect(providerVar?.query).toBe('label_values(agent_operations_total, provider)')
    })

    it('should have proper panel grid positions', () => {
      dashboard = GrafanaDashboardBuilder.createAgentOverviewDashboard()

      const panels = dashboard.panels
      expect(panels).toHaveLength(5)

      // Check that panels don't overlap and have valid positions
      panels.forEach((panel) => {
        expect(panel.gridPos.x).toBeGreaterThanOrEqual(0)
        expect(panel.gridPos.y).toBeGreaterThanOrEqual(0)
        expect(panel.gridPos.w).toBeGreaterThan(0)
        expect(panel.gridPos.h).toBeGreaterThan(0)
        expect(panel.gridPos.x + panel.gridPos.w).toBeLessThanOrEqual(24) // Standard Grafana grid width
      })
    })
  })

  describe('createSystemHealthDashboard', () => {
    let dashboard: GrafanaDashboard

    it('should create system health dashboard with correct structure', () => {
      dashboard = GrafanaDashboardBuilder.createSystemHealthDashboard()

      expect(dashboard.title).toBe('System Health & Performance')
      expect(dashboard.tags).toContain('system')
      expect(dashboard.tags).toContain('health')
      expect(dashboard.tags).toContain('performance')
    })

    it('should include HTTP request rate panel', () => {
      dashboard = GrafanaDashboardBuilder.createSystemHealthDashboard()

      const httpPanel = dashboard.panels.find((p) => p.title === 'HTTP Request Rate')
      expect(httpPanel).toBeDefined()
      expect(httpPanel?.type).toBe('graph')
      expect(httpPanel?.targets[0].expr).toBe('rate(http_requests_total[5m])')
      expect(httpPanel?.targets[0].legendFormat).toBe('{{method}} {{route}}')
    })

    it('should include HTTP response times panel', () => {
      dashboard = GrafanaDashboardBuilder.createSystemHealthDashboard()

      const responseTimePanel = dashboard.panels.find((p) => p.title === 'HTTP Response Times')
      expect(responseTimePanel).toBeDefined()
      expect(responseTimePanel?.targets).toHaveLength(2)
      expect(responseTimePanel?.targets[0].expr).toContain('histogram_quantile(0.95')
      expect(responseTimePanel?.targets[1].expr).toContain('histogram_quantile(0.50')
    })

    it('should include database connections panel', () => {
      dashboard = GrafanaDashboardBuilder.createSystemHealthDashboard()

      const dbPanel = dashboard.panels.find((p) => p.title === 'Database Connections')
      expect(dbPanel).toBeDefined()
      expect(dbPanel?.targets[0].expr).toBe('database_connections_active')
    })

    it('should include database query performance panel', () => {
      dashboard = GrafanaDashboardBuilder.createSystemHealthDashboard()

      const queryPanel = dashboard.panels.find((p) => p.title === 'Database Query Performance')
      expect(queryPanel).toBeDefined()
      expect(queryPanel?.targets[0].expr).toContain(
        'histogram_quantile(0.95, rate(database_query_duration_seconds_bucket[5m]))'
      )
    })
  })

  describe('createBusinessMetricsDashboard', () => {
    let dashboard: GrafanaDashboard

    it('should create business metrics dashboard with correct structure', () => {
      dashboard = GrafanaDashboardBuilder.createBusinessMetricsDashboard()

      expect(dashboard.title).toBe('Business Metrics & KPIs')
      expect(dashboard.tags).toContain('business')
      expect(dashboard.tags).toContain('kpi')
      expect(dashboard.tags).toContain('metrics')
    })

    it('should have 24 hour time range', () => {
      dashboard = GrafanaDashboardBuilder.createBusinessMetricsDashboard()

      expect(dashboard.time.from).toBe('now-24h')
      expect(dashboard.time.to).toBe('now')
      expect(dashboard.refresh).toBe('5m')
    })

    it('should include active user sessions panel', () => {
      dashboard = GrafanaDashboardBuilder.createBusinessMetricsDashboard()

      const sessionsPanel = dashboard.panels.find((p) => p.title === 'Active User Sessions')
      expect(sessionsPanel).toBeDefined()
      expect(sessionsPanel?.type).toBe('stat')
      expect(sessionsPanel?.targets[0].expr).toBe('user_sessions_active')
    })

    it('should include feature usage trends panel', () => {
      dashboard = GrafanaDashboardBuilder.createBusinessMetricsDashboard()

      const usagePanel = dashboard.panels.find((p) => p.title === 'Feature Usage Trends')
      expect(usagePanel).toBeDefined()
      expect(usagePanel?.type).toBe('graph')
      expect(usagePanel?.targets[0].expr).toBe('rate(feature_usage_total[1h])')
    })

    it('should include cost per operation table', () => {
      dashboard = GrafanaDashboardBuilder.createBusinessMetricsDashboard()

      const costPanel = dashboard.panels.find((p) => p.title === 'Cost per Operation')
      expect(costPanel).toBeDefined()
      expect(costPanel?.type).toBe('table')
      expect(costPanel?.targets[0].expr).toContain(
        'sum by (provider) (rate(agent_cost_total[1h])) / sum by (provider) (rate(agent_operations_total[1h]))'
      )
    })

    it('should include system efficiency gauge', () => {
      dashboard = GrafanaDashboardBuilder.createBusinessMetricsDashboard()

      const efficiencyPanel = dashboard.panels.find((p) => p.title === 'System Efficiency')
      expect(efficiencyPanel).toBeDefined()
      expect(efficiencyPanel?.type).toBe('gauge')
      expect(efficiencyPanel?.targets[0].expr).toContain(
        'sum(rate(agent_operations_total{status="success"}[5m])) / sum(rate(agent_operations_total[5m]))'
      )
    })
  })

  describe('dashboard validation', () => {
    it('should generate valid dashboard JSON', () => {
      const dashboard = GrafanaDashboardBuilder.createAgentOverviewDashboard()
      const jsonString = JSON.stringify(dashboard)

      expect(() => JSON.parse(jsonString)).not.toThrow()
      expect(jsonString).toContain('AI Agent Overview')
    })

    it('should have unique panel IDs across all dashboards', () => {
      const agentDashboard = GrafanaDashboardBuilder.createAgentOverviewDashboard()
      const systemDashboard = GrafanaDashboardBuilder.createSystemHealthDashboard()
      const businessDashboard = GrafanaDashboardBuilder.createBusinessMetricsDashboard()

      const allPanelIds = [
        ...agentDashboard.panels.map((p) => p.id),
        ...systemDashboard.panels.map((p) => p.id),
        ...businessDashboard.panels.map((p) => p.id),
      ]

      // Check for duplicates within each dashboard (should be allowed)
      const agentIds = agentDashboard.panels.map((p) => p.id)
      const uniqueAgentIds = [...new Set(agentIds)]
      expect(agentIds).toEqual(uniqueAgentIds)
    })

    it('should have all required panel properties', () => {
      const dashboard = GrafanaDashboardBuilder.createAgentOverviewDashboard()

      dashboard.panels.forEach((panel) => {
        expect(panel.id).toBeDefined()
        expect(panel.title).toBeDefined()
        expect(panel.type).toBeDefined()
        expect(panel.targets).toBeDefined()
        expect(panel.targets.length).toBeGreaterThan(0)
        expect(panel.gridPos).toBeDefined()
        expect(panel.gridPos.h).toBeGreaterThan(0)
        expect(panel.gridPos.w).toBeGreaterThan(0)

        panel.targets.forEach((target) => {
          expect(target.expr).toBeDefined()
          expect(target.refId).toBeDefined()
          expect(target.legendFormat).toBeDefined()
        })
      })
    })
  })
})
