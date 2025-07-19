'use client'

/**
 * Database Performance Dashboard
 * 
 * Real-time dashboard for monitoring database performance, query optimization results,
 * and system health metrics with interactive visualizations.
 */

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { 
  Activity, 
  Database, 
  Zap, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle,
  Clock,
  BarChart3,
  Settings
} from 'lucide-react'

interface PerformanceMetrics {
  totalQueries: number
  averageExecutionTime: number
  slowQueries: number
  errorRate: number
  cacheHitRatio: number
  indexUsage: number
  recentAlerts: Array<{
    id: string
    type: string
    severity: string
    message: string
    timestamp: Date
  }>
}

interface OptimizationResults {
  indexesCreated: number
  performanceImprovement: number
  queriesOptimized: number
  storageOverhead: number
  estimatedSavings: string
}

interface BenchmarkResults {
  suites: Array<{
    name: string
    averageExecutionTime: number
    throughput: number
    passed: number
    failed: number
  }>
  overallScore: number
  regressions: number
  improvements: number
}

export function DatabasePerformanceDashboard() {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    totalQueries: 0,
    averageExecutionTime: 0,
    slowQueries: 0,
    errorRate: 0,
    cacheHitRatio: 0,
    indexUsage: 0,
    recentAlerts: []
  })

  const [optimizationResults, setOptimizationResults] = useState<OptimizationResults>({
    indexesCreated: 0,
    performanceImprovement: 0,
    queriesOptimized: 0,
    storageOverhead: 0,
    estimatedSavings: '0ms'
  })

  const [benchmarkResults, setBenchmarkResults] = useState<BenchmarkResults>({
    suites: [],
    overallScore: 0,
    regressions: 0,
    improvements: 0
  })

  const [isLoading, setIsLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())

  // Simulate real-time data updates
  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        // In a real implementation, these would be API calls
        setMetrics({
          totalQueries: 1247,
          averageExecutionTime: 45.2,
          slowQueries: 3,
          errorRate: 0.8,
          cacheHitRatio: 96.5,
          indexUsage: 89.2,
          recentAlerts: [
            {
              id: '1',
              type: 'slow_query',
              severity: 'medium',
              message: 'Query execution time exceeded 500ms',
              timestamp: new Date(Date.now() - 5 * 60 * 1000)
            },
            {
              id: '2',
              type: 'performance_regression',
              severity: 'low',
              message: 'Task list query 15% slower than baseline',
              timestamp: new Date(Date.now() - 15 * 60 * 1000)
            }
          ]
        })

        setOptimizationResults({
          indexesCreated: 8,
          performanceImprovement: 34.5,
          queriesOptimized: 12,
          storageOverhead: 45.2,
          estimatedSavings: '156ms'
        })

        setBenchmarkResults({
          suites: [
            { name: 'Database Operations', averageExecutionTime: 23.4, throughput: 42.7, passed: 5, failed: 0 },
            { name: 'Query Performance', averageExecutionTime: 67.8, throughput: 14.7, passed: 4, failed: 0 },
            { name: 'ElectricSQL Sync', averageExecutionTime: 12.1, throughput: 82.6, passed: 2, failed: 0 },
            { name: 'Vector Search', averageExecutionTime: 89.3, throughput: 11.2, passed: 1, failed: 0 },
            { name: 'Concurrent Operations', averageExecutionTime: 156.7, throughput: 6.4, passed: 2, failed: 0 }
          ],
          overallScore: 87.3,
          regressions: 1,
          improvements: 4
        })

        setLastUpdated(new Date())
        setIsLoading(false)
      } catch (error) {
        console.error('Failed to fetch performance metrics:', error)
        setIsLoading(false)
      }
    }

    fetchMetrics()
    const interval = setInterval(fetchMetrics, 30000) // Update every 30 seconds

    return () => clearInterval(interval)
  }, [])

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive'
      case 'high': return 'destructive'
      case 'medium': return 'default'
      case 'low': return 'secondary'
      default: return 'secondary'
    }
  }

  const getPerformanceStatus = (value: number, threshold: number, inverse = false) => {
    const isGood = inverse ? value < threshold : value > threshold
    return isGood ? 'good' : 'warning'
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Activity className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p>Loading performance metrics...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Database Performance Dashboard</h1>
          <p className="text-muted-foreground">
            Real-time monitoring and optimization results
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </Badge>
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Configure
          </Button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Query Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.averageExecutionTime}ms</div>
            <p className="text-xs text-muted-foreground">
              {getPerformanceStatus(metrics.averageExecutionTime, 100, true) === 'good' ? (
                <span className="text-green-600">Excellent performance</span>
              ) : (
                <span className="text-yellow-600">Room for improvement</span>
              )}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cache Hit Ratio</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.cacheHitRatio}%</div>
            <Progress value={metrics.cacheHitRatio} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {metrics.cacheHitRatio > 95 ? 'Excellent' : 'Good'} cache performance
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Slow Queries</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.slowQueries}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.slowQueries === 0 ? (
                <span className="text-green-600">No slow queries detected</span>
              ) : (
                <span className="text-yellow-600">Queries &gt; 100ms</span>
              )}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.errorRate}%</div>
            <p className="text-xs text-muted-foreground">
              {metrics.errorRate < 1 ? (
                <span className="text-green-600">Very low error rate</span>
              ) : (
                <span className="text-yellow-600">Monitor closely</span>
              )}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="optimizations">Optimizations</TabsTrigger>
          <TabsTrigger value="benchmarks">Benchmarks</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Query Performance Trends</CardTitle>
                <CardDescription>
                  Real-time query execution metrics
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span>Total Queries (Last Hour)</span>
                    <Badge variant="outline">{metrics.totalQueries}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Index Usage</span>
                    <div className="flex items-center space-x-2">
                      <Progress value={metrics.indexUsage} className="w-20" />
                      <span className="text-sm">{metrics.indexUsage}%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Query Optimization</span>
                    <Badge variant="secondary">
                      {optimizationResults.queriesOptimized} optimized
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>System Health</CardTitle>
                <CardDescription>
                  Database and application health indicators
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span>Database Connection</span>
                    <Badge variant="secondary">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Healthy
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>ElectricSQL Sync</span>
                    <Badge variant="secondary">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Active
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Performance Monitoring</span>
                    <Badge variant="secondary">
                      <Activity className="h-3 w-3 mr-1" />
                      Running
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="optimizations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Optimization Results</CardTitle>
              <CardDescription>
                Recent database optimization improvements
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {optimizationResults.indexesCreated}
                  </div>
                  <p className="text-sm text-muted-foreground">Indexes Created</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {optimizationResults.performanceImprovement}%
                  </div>
                  <p className="text-sm text-muted-foreground">Performance Gain</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {optimizationResults.queriesOptimized}
                  </div>
                  <p className="text-sm text-muted-foreground">Queries Optimized</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {optimizationResults.estimatedSavings}
                  </div>
                  <p className="text-sm text-muted-foreground">Time Saved</p>
                </div>
              </div>
              
              <div className="mt-6">
                <h4 className="font-medium mb-2">Storage Impact</h4>
                <div className="flex items-center space-x-2">
                  <span className="text-sm">Additional storage used:</span>
                  <Badge variant="outline">{optimizationResults.storageOverhead}MB</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="benchmarks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance Benchmarks</CardTitle>
              <CardDescription>
                Comprehensive performance test results
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Overall Performance Score</span>
                  <div className="flex items-center space-x-2">
                    <Progress value={benchmarkResults.overallScore} className="w-32" />
                    <Badge variant="secondary">{benchmarkResults.overallScore}/100</Badge>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                  <div>
                    <h4 className="font-medium mb-2 flex items-center">
                      <TrendingUp className="h-4 w-4 mr-2 text-green-600" />
                      Improvements ({benchmarkResults.improvements})
                    </h4>
                    <div className="text-sm text-muted-foreground">
                      Vector search optimization, index usage improvements
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2 flex items-center">
                      <TrendingDown className="h-4 w-4 mr-2 text-red-600" />
                      Regressions ({benchmarkResults.regressions})
                    </h4>
                    <div className="text-sm text-muted-foreground">
                      Concurrent operations slightly slower
                    </div>
                  </div>
                </div>

                <div className="mt-6">
                  <h4 className="font-medium mb-3">Benchmark Suite Results</h4>
                  <div className="space-y-2">
                    {benchmarkResults.suites.map((suite, index) => (
                      <div key={index} className="flex items-center justify-between p-2 border rounded">
                        <div>
                          <span className="font-medium">{suite.name}</span>
                          <div className="text-sm text-muted-foreground">
                            {suite.averageExecutionTime}ms avg • {suite.throughput} ops/sec
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant={suite.failed === 0 ? 'secondary' : 'destructive'}>
                            {suite.passed}/{suite.passed + suite.failed}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance Alerts</CardTitle>
              <CardDescription>
                Recent performance issues and notifications
              </CardDescription>
            </CardHeader>
            <CardContent>
              {metrics.recentAlerts.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-2" />
                  <p className="text-muted-foreground">No recent alerts</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {metrics.recentAlerts.map((alert) => (
                    <Alert key={alert.id}>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle className="flex items-center justify-between">
                        <span>{alert.type.replace('_', ' ').toUpperCase()}</span>
                        <Badge variant={getSeverityColor(alert.severity) as any}>
                          {alert.severity}
                        </Badge>
                      </AlertTitle>
                      <AlertDescription>
                        {alert.message}
                        <div className="text-xs text-muted-foreground mt-1">
                          {alert.timestamp.toLocaleString()}
                        </div>
                      </AlertDescription>
                    </Alert>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
