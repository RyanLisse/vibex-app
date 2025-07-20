'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CriticalError, AlertNotification, AlertMetrics, CriticalErrorType } from '@/lib/alerts/types'
import { formatDistanceToNow, format } from 'date-fns'
import { AlertTriangle, CheckCircle, Clock, TrendingUp, Bell, Activity } from 'lucide-react'

interface AlertDashboardProps {
  className?: string
}

export function AlertDashboard({ className }: AlertDashboardProps) {
  const [activeAlerts, setActiveAlerts] = useState<CriticalError[]>([])
  const [alertHistory, setAlertHistory] = useState<CriticalError[]>([])
  const [metrics, setMetrics] = useState<AlertMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadDashboardData()
    
    // Refresh data every 30 seconds
    const interval = setInterval(loadDashboardData, 30000)
    return () => clearInterval(interval)
  }, [])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      
      const [activeResponse, historyResponse, metricsResponse] = await Promise.all([
        fetch('/api/alerts/active'),
        fetch('/api/alerts/history'),
        fetch('/api/alerts/metrics')
      ])

      if (!activeResponse.ok || !historyResponse.ok || !metricsResponse.ok) {
        throw new Error('Failed to fetch alert data')
      }

      const [activeData, historyData, metricsData] = await Promise.all([
        activeResponse.json(),
        historyResponse.json(),
        metricsResponse.json()
      ])

      setActiveAlerts(activeData.alerts || [])
      setAlertHistory(historyData.alerts || [])
      setMetrics(metricsData)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load alert data')
    } finally {
      setLoading(false)
    }
  }

  const resolveAlert = async (alertId: string) => {
    try {
      const response = await fetch(`/api/alerts/${alertId}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolvedBy: 'user' })
      })

      if (!response.ok) {
        throw new Error('Failed to resolve alert')
      }

      // Refresh data
      await loadDashboardData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resolve alert')
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500'
      case 'high': return 'bg-orange-500'
      case 'medium': return 'bg-yellow-500'
      case 'low': return 'bg-blue-500'
      default: return 'bg-gray-500'
    }
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return '🚨'
      case 'high': return '⚠️'
      case 'medium': return '📢'
      case 'low': return 'ℹ️'
      default: return '🔔'
    }
  }

  const formatErrorType = (type: CriticalErrorType) => {
    return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  return (
    <div className={className}>
      {error && (
        <Alert className="mb-6 border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-red-800">{error}</AlertDescription>
        </Alert>
      )}

      {/* Metrics Overview */}
      {metrics && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{metrics.unresolvedAlerts}</div>
              <p className="text-xs text-muted-foreground">Requiring attention</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Alerts</CardTitle>
              <Bell className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.totalAlerts}</div>
              <p className="text-xs text-muted-foreground">All time</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Resolution</CardTitle>
              <Clock className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {metrics.averageResolutionTime ? 
                  `${Math.round(metrics.averageResolutionTime / 60000)}m` : 
                  'N/A'
                }
              </div>
              <p className="text-xs text-muted-foreground">Time to resolve</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Last 24h</CardTitle>
              <TrendingUp className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.alertsLast24Hours}</div>
              <p className="text-xs text-muted-foreground">Recent activity</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="active" className="space-y-4">
        <TabsList>
          <TabsTrigger value="active">
            Active Alerts ({activeAlerts.length})
          </TabsTrigger>
          <TabsTrigger value="history">
            Alert History
          </TabsTrigger>
          <TabsTrigger value="metrics">
            Metrics & Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          {activeAlerts.length === 0 ? (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <div className="text-center">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Alerts</h3>
                  <p className="text-gray-500">All systems are operating normally.</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {activeAlerts.map((alert) => (
                <Card key={alert.id} className="border-l-4 border-l-red-500">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{getSeverityIcon(alert.severity)}</span>
                          <CardTitle className="text-lg">
                            {formatErrorType(alert.type)}
                          </CardTitle>
                          <Badge className={getSeverityColor(alert.severity)}>
                            {alert.severity}
                          </Badge>
                        </div>
                        <CardDescription>
                          {alert.source} • {formatDistanceToNow(new Date(alert.timestamp))} ago
                        </CardDescription>
                      </div>
                      <Button
                        onClick={() => resolveAlert(alert.id)}
                        size="sm"
                        variant="outline"
                        className="ml-2"
                      >
                        Resolve
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-700 mb-4">{alert.message}</p>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <div className="font-medium text-gray-500">Environment</div>
                        <div>{alert.environment}</div>
                      </div>
                      <div>
                        <div className="font-medium text-gray-500">Occurrences</div>
                        <div>{alert.occurrenceCount}</div>
                      </div>
                      <div>
                        <div className="font-medium text-gray-500">First Seen</div>
                        <div>{format(new Date(alert.firstOccurrence), 'MMM d, HH:mm')}</div>
                      </div>
                      <div>
                        <div className="font-medium text-gray-500">Last Seen</div>
                        <div>{format(new Date(alert.lastOccurrence), 'MMM d, HH:mm')}</div>
                      </div>
                    </div>

                    {alert.correlationId && (
                      <div className="mt-4 p-3 bg-gray-50 rounded">
                        <div className="font-medium text-gray-500 text-sm">Correlation ID</div>
                        <code className="text-sm font-mono">{alert.correlationId}</code>
                      </div>
                    )}

                    {Object.keys(alert.metadata || {}).length > 0 && (
                      <details className="mt-4">
                        <summary className="cursor-pointer font-medium text-gray-700">
                          Additional Details
                        </summary>
                        <pre className="mt-2 p-3 bg-gray-50 rounded text-sm overflow-auto">
                          {JSON.stringify(alert.metadata, null, 2)}
                        </pre>
                      </details>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <div className="space-y-4">
            {alertHistory.slice(0, 20).map((alert) => (
              <Card key={alert.id} className={`${alert.resolved ? 'bg-gray-50' : ''}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{getSeverityIcon(alert.severity)}</span>
                        <CardTitle className="text-base">
                          {formatErrorType(alert.type)}
                        </CardTitle>
                        <Badge 
                          variant={alert.resolved ? "secondary" : "default"}
                          className={alert.resolved ? '' : getSeverityColor(alert.severity)}
                        >
                          {alert.resolved ? 'Resolved' : alert.severity}
                        </Badge>
                      </div>
                      <CardDescription>
                        {alert.source} • {format(new Date(alert.timestamp), 'MMM d, yyyy HH:mm')}
                        {alert.resolved && alert.resolvedAt && (
                          <> • Resolved {formatDistanceToNow(new Date(alert.resolvedAt))} ago</>
                        )}
                      </CardDescription>
                    </div>
                    {alert.resolved && (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-gray-700 text-sm">{alert.message}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="metrics" className="space-y-4">
          {metrics && (
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Alerts by Type
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(metrics.alertsByType || {}).map(([type, count]) => (
                      <div key={type} className="flex justify-between items-center">
                        <span className="text-sm">{formatErrorType(type as CriticalErrorType)}</span>
                        <Badge variant="secondary">{count}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Recent Activity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm">Last 24 hours</span>
                      <Badge variant="secondary">{metrics.alertsLast24Hours}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Last 7 days</span>
                      <Badge variant="secondary">{metrics.alertsLast7Days}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Unresolved</span>
                      <Badge variant={metrics.unresolvedAlerts > 0 ? "destructive" : "secondary"}>
                        {metrics.unresolvedAlerts}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}