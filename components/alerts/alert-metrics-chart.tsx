'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { AlertMetrics, CriticalErrorType, AlertChannelType } from '@/lib/alerts/types'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts'
import { TrendingUp, AlertTriangle, Clock, Activity } from 'lucide-react'

interface AlertMetricsChartProps {
  className?: string
}

export function AlertMetricsChart({ className }: AlertMetricsChartProps) {
  const [metrics, setMetrics] = useState<AlertMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [timeframe, setTimeframe] = useState('24h')
  const [error, setError] = useState<string | null>(null)

  const loadMetrics = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/alerts/metrics?timeframe=${timeframe}`)

      if (!response.ok) {
        throw new Error('Failed to fetch metrics')
      }

      const data = await response.json()
      setMetrics(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load metrics')
    } finally {
      setLoading(false)
    }
  }, [timeframe])

  useEffect(() => {
    loadMetrics()

    // Refresh metrics every minute
    const interval = setInterval(loadMetrics, 60000)
    return () => clearInterval(interval)
  }, [loadMetrics])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  if (error || !metrics) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            <span>{error || 'No metrics available'}</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Prepare data for charts
  const alertsByTypeData = Object.entries(metrics.alertsByType || {}).map(([type, count]) => ({
    name: type.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
    value: count,
    type,
  }))

  const alertsByChannelData = Object.entries(metrics.alertsByChannel || {}).map(
    ([channel, count]) => ({
      name: channel.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
      value: count,
      channel,
    })
  )

  // Colors for charts
  const SEVERITY_COLORS = ['#ef4444', '#f97316', '#eab308', '#3b82f6', '#6b7280']
  const CHANNEL_COLORS = ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444']

  const formatDuration = (ms: number) => {
    if (ms < 60000) return `${Math.round(ms / 1000)}s`
    if (ms < 3600000) return `${Math.round(ms / 60000)}m`
    return `${Math.round(ms / 3600000)}h`
  }

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-medium">Alert Analytics</h3>
          <p className="text-gray-600">Detailed metrics and visualizations</p>
        </div>
        <Select value={timeframe} onValueChange={setTimeframe}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1h">Last Hour</SelectItem>
            <SelectItem value="24h">Last 24h</SelectItem>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resolution Time</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics.averageResolutionTime
                ? formatDuration(metrics.averageResolutionTime)
                : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">Average time to resolve</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Alert Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {timeframe === '24h' ? metrics.alertsLast24Hours : metrics.totalAlerts}
            </div>
            <p className="text-xs text-muted-foreground">Alerts in {timeframe}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mean Time to Alert</CardTitle>
            <Activity className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics.meanTimeToAlert ? formatDuration(metrics.meanTimeToAlert) : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">Detection to notification</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resolution Rate</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics.totalAlerts > 0
                ? Math.round(
                    ((metrics.totalAlerts - metrics.unresolvedAlerts) / metrics.totalAlerts) * 100
                  )
                : 0}
              %
            </div>
            <p className="text-xs text-muted-foreground">Alerts resolved</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 mb-6">
        {/* Alerts by Type */}
        <Card>
          <CardHeader>
            <CardTitle>Alerts by Type</CardTitle>
            <CardDescription>Distribution of error types</CardDescription>
          </CardHeader>
          <CardContent>
            {alertsByTypeData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={alertsByTypeData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} fontSize={12} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-64 text-gray-500">
                No alerts in selected timeframe
              </div>
            )}
          </CardContent>
        </Card>

        {/* Alerts by Channel */}
        <Card>
          <CardHeader>
            <CardTitle>Alerts by Channel</CardTitle>
            <CardDescription>Notification distribution</CardDescription>
          </CardHeader>
          <CardContent>
            {alertsByChannelData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={alertsByChannelData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {alertsByChannelData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={CHANNEL_COLORS[index % CHANNEL_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-64 text-gray-500">
                No channel data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detailed Breakdown */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Error Type Details</CardTitle>
            <CardDescription>Breakdown by error category</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {alertsByTypeData.map((item, index) => (
                <div key={item.type} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: SEVERITY_COLORS[index % SEVERITY_COLORS.length] }}
                    />
                    <span className="text-sm font-medium">{item.name}</span>
                  </div>
                  <div className="text-sm text-gray-600">{item.value}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Performance Metrics</CardTitle>
            <CardDescription>System performance indicators</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Mean Time to Resolution</span>
                <span className="text-sm text-gray-600">
                  {metrics.meanTimeToResolution
                    ? formatDuration(metrics.meanTimeToResolution)
                    : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Total Alerts</span>
                <span className="text-sm text-gray-600">{metrics.totalAlerts}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Unresolved Alerts</span>
                <span className="text-sm text-gray-600">{metrics.unresolvedAlerts}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Last 7 Days</span>
                <span className="text-sm text-gray-600">{metrics.alertsLast7Days}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
