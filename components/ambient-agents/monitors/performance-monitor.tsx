import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  Cpu,
  Memory,
  Network,
  TrendingDown,
  TrendingUp,
} from 'lucide-react'
import type React from 'react'
import { useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'

export interface PerformanceMetrics {
  cpu: {
    usage: number
    trend: 'up' | 'down' | 'stable'
  }
  memory: {
    usage: number
    trend: 'up' | 'down' | 'stable'
  }
  network: {
    throughput: number
    latency: number
    trend: 'up' | 'down' | 'stable'
  }
  rendering: {
    fps: number
    nodeCount: number
    edgeCount: number
    renderTime: number
  }
  alerts: Array<{
    id: string
    type: 'warning' | 'error' | 'info'
    message: string
    timestamp: Date
  }>
}

export interface PerformanceMonitorProps {
  className?: string
}

export const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({ className = '' }) => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    cpu: { usage: 0, trend: 'stable' },
    memory: { usage: 0, trend: 'stable' },
    network: { throughput: 0, latency: 0, trend: 'stable' },
    rendering: { fps: 60, nodeCount: 0, edgeCount: 0, renderTime: 0 },
    alerts: [],
  })

  const [isCollapsed, setIsCollapsed] = useState(false)

  // Simulate real-time metrics updates
  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics((prev) => ({
        cpu: {
          usage: Math.max(0, Math.min(100, prev.cpu.usage + (Math.random() - 0.5) * 10)),
          trend: Math.random() > 0.7 ? (Math.random() > 0.5 ? 'up' : 'down') : 'stable',
        },
        memory: {
          usage: Math.max(0, Math.min(100, prev.memory.usage + (Math.random() - 0.5) * 5)),
          trend: Math.random() > 0.7 ? (Math.random() > 0.5 ? 'up' : 'down') : 'stable',
        },
        network: {
          throughput: Math.max(0, prev.network.throughput + (Math.random() - 0.5) * 100),
          latency: Math.max(0, prev.network.latency + (Math.random() - 0.5) * 50),
          trend: Math.random() > 0.7 ? (Math.random() > 0.5 ? 'up' : 'down') : 'stable',
        },
        rendering: {
          fps: Math.max(30, Math.min(60, prev.rendering.fps + (Math.random() - 0.5) * 5)),
          nodeCount: Math.max(0, prev.rendering.nodeCount + Math.floor((Math.random() - 0.5) * 3)),
          edgeCount: Math.max(0, prev.rendering.edgeCount + Math.floor((Math.random() - 0.5) * 5)),
          renderTime: Math.max(1, prev.rendering.renderTime + (Math.random() - 0.5) * 2),
        },
        alerts: prev.alerts.slice(0, 4), // Keep only recent alerts
      }))

      // Occasionally add new alerts
      if (Math.random() > 0.9) {
        setMetrics((prev) => ({
          ...prev,
          alerts: [
            {
              id: Date.now().toString(),
              type: Math.random() > 0.7 ? 'warning' : 'info',
              message: 'High network latency detected',
              timestamp: new Date(),
            },
            ...prev.alerts,
          ].slice(0, 5),
        }))
      }
    }, 2000)

    return () => clearInterval(interval)
  }, [])

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-3 w-3 text-red-500" />
      case 'down':
        return <TrendingDown className="h-3 w-3 text-green-500" />
      default:
        return <Activity className="h-3 w-3 text-gray-500" />
    }
  }

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'error':
        return <AlertTriangle className="h-3 w-3 text-red-500" />
      case 'warning':
        return <AlertTriangle className="h-3 w-3 text-yellow-500" />
      default:
        return <CheckCircle className="h-3 w-3 text-blue-500" />
    }
  }

  const formatNumber = (num: number, decimals = 1) => {
    if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(decimals)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(decimals)}K`
    return num.toFixed(decimals)
  }

  return (
    <Card className={`w-80 bg-white/95 shadow-lg backdrop-blur-sm ${className}`}>
      <CardHeader className="cursor-pointer pb-2" onClick={() => setIsCollapsed(!isCollapsed)}>
        <CardTitle className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-2">
            <Activity className="h-4 w-4" />
            <span>Performance Monitor</span>
          </div>
          <Badge className="text-xs" variant="outline">
            {isCollapsed ? '⊕' : '⊖'}
          </Badge>
        </CardTitle>
      </CardHeader>

      {!isCollapsed && (
        <CardContent className="space-y-4">
          {/* System Metrics */}
          <div className="space-y-3">
            <div className="font-medium text-gray-700 text-xs">System Metrics</div>

            {/* CPU Usage */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center space-x-1">
                  <Cpu className="h-3 w-3 text-purple-500" />
                  <span>CPU Usage</span>
                  {getTrendIcon(metrics.cpu.trend)}
                </div>
                <span>{metrics.cpu.usage.toFixed(1)}%</span>
              </div>
              <Progress className="h-1" value={metrics.cpu.usage} />
            </div>

            {/* Memory Usage */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center space-x-1">
                  <Memory className="h-3 w-3 text-indigo-500" />
                  <span>Memory Usage</span>
                  {getTrendIcon(metrics.memory.trend)}
                </div>
                <span>{metrics.memory.usage.toFixed(1)}%</span>
              </div>
              <Progress className="h-1" value={metrics.memory.usage} />
            </div>

            {/* Network */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center space-x-1">
                <Network className="h-3 w-3 text-blue-500" />
                <span>{formatNumber(metrics.network.throughput)} ops/s</span>
              </div>
              <div className="flex items-center space-x-1">
                <Clock className="h-3 w-3 text-green-500" />
                <span>{metrics.network.latency.toFixed(0)}ms</span>
              </div>
            </div>
          </div>

          {/* Rendering Performance */}
          <div className="space-y-3">
            <div className="font-medium text-gray-700 text-xs">Visualization Performance</div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <div className="text-gray-600">FPS</div>
                <div className="font-medium">{metrics.rendering.fps.toFixed(0)}</div>
              </div>
              <div>
                <div className="text-gray-600">Render Time</div>
                <div className="font-medium">{metrics.rendering.renderTime.toFixed(1)}ms</div>
              </div>
              <div>
                <div className="text-gray-600">Nodes</div>
                <div className="font-medium">{metrics.rendering.nodeCount}</div>
              </div>
              <div>
                <div className="text-gray-600">Edges</div>
                <div className="font-medium">{metrics.rendering.edgeCount}</div>
              </div>
            </div>

            {/* FPS indicator */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span>Frame Rate</span>
                <span
                  className={`font-medium ${
                    metrics.rendering.fps >= 50
                      ? 'text-green-600'
                      : metrics.rendering.fps >= 30
                        ? 'text-yellow-600'
                        : 'text-red-600'
                  }`}
                >
                  {metrics.rendering.fps.toFixed(0)} FPS
                </span>
              </div>
              <Progress className="h-1" value={(metrics.rendering.fps / 60) * 100} />
            </div>
          </div>

          {/* Alerts */}
          {metrics.alerts.length > 0 && (
            <div className="space-y-2">
              <div className="font-medium text-gray-700 text-xs">Recent Alerts</div>
              <div className="max-h-20 space-y-1 overflow-y-auto">
                {metrics.alerts.map((alert) => (
                  <div className="flex items-start space-x-2 text-xs" key={alert.id}>
                    {getAlertIcon(alert.type)}
                    <div className="flex-1">
                      <div className="text-gray-800">{alert.message}</div>
                      <div className="text-gray-500 text-xs">
                        {alert.timestamp.toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-2 border-t pt-2">
            <div className="text-center">
              <div className="text-gray-600 text-xs">Total Nodes</div>
              <div className="font-medium text-sm">{metrics.rendering.nodeCount}</div>
            </div>
            <div className="text-center">
              <div className="text-gray-600 text-xs">Connections</div>
              <div className="font-medium text-sm">{metrics.rendering.edgeCount}</div>
            </div>
            <div className="text-center">
              <div className="text-gray-600 text-xs">Latency</div>
              <div className="font-medium text-sm">{metrics.network.latency.toFixed(0)}ms</div>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  )
}
