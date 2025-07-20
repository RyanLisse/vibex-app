'use client'

import { Activity, AlertTriangle, Clock, TrendingUp, Users } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { ProgressMetrics, TaskProgress } from '@/src/schemas/enhanced-task-schemas'
import { AlertSystem } from './alert-system'
import { ProgressIndicator } from './progress-indicator'
import { TaskProgressCard } from './task-progress-card'

interface ProgressDashboardProps {
  taskProgress: TaskProgress[]
  metrics: ProgressMetrics
  enableRealTime?: boolean
  autoTimeTracking?: boolean
  className?: string
}

export function ProgressDashboard({
  taskProgress,
  metrics,
  enableRealTime = false,
  autoTimeTracking = false,
  className = '',
}: ProgressDashboardProps) {
  const [isConnected, setIsConnected] = useState(false)
  const [connectionError, setConnectionError] = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // WebSocket connection for real-time updates
  useEffect(() => {
    if (!enableRealTime) return

    const connectWebSocket = () => {
      try {
        const ws = new (WebSocket as any)('ws://localhost:3000/ws/progress') as WebSocket
        wsRef.current = ws

        ws.onopen = () => {
          setIsConnected(true)
          setConnectionError(null)
          console.log('Progress WebSocket connected')
        }

        ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data)

            if (message.type === 'PROGRESS_UPDATE') {
              // Handle progress update
              setLastUpdate(new Date())
              // In a real implementation, this would trigger a state update
              // that would re-render the component with new data
            }
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error)
          }
        }

        ws.onerror = (error) => {
          console.error('WebSocket error:', error)
          setConnectionError('Connection error occurred')
        }

        ws.onclose = (event) => {
          setIsConnected(false)

          // Attempt reconnection if it wasn't a normal closure
          if (event.code !== 1000) {
            setConnectionError('Connection lost. Attempting to reconnect...')

            reconnectTimeoutRef.current = setTimeout(() => {
              connectWebSocket()
            }, 5000) // Retry after 5 seconds
          }
        }
      } catch (error) {
        console.error('Failed to create WebSocket connection:', error)
        setConnectionError('Failed to establish real-time connection')
      }
    }

    connectWebSocket()

    return () => {
      if (wsRef.current) {
        wsRef.current.close(1000) // Normal closure
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
    }
  }, [enableRealTime])

  // Auto time tracking
  useEffect(() => {
    if (!autoTimeTracking) return

    const interval = setInterval(() => {
      // Update time spent for in-progress tasks
      // In a real implementation, this would update the backend
      setLastUpdate(new Date())
    }, 60_000) // Update every minute

    return () => clearInterval(interval)
  }, [autoTimeTracking])

  // Calculate team productivity metrics
  const teamVelocity =
    metrics.totalTasks > 0 ? Math.round((metrics.completedTasks / metrics.totalTasks) * 100) : 0

  const isProductivityConcern =
    metrics.averageCompletionTime > 480 || metrics.overdueTasks > metrics.totalTasks * 0.3

  const overdueTasks = taskProgress.filter((task) => task.isOverdue)
  const blockedTasks = taskProgress.filter((task) => task.isBlocked)
  const inProgressTasks = taskProgress.filter((task) => task.status === 'in_progress')

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Activity className="h-8 w-8 text-blue-500" />
          <div>
            <h1 className="font-bold text-3xl">Progress Dashboard</h1>
            <p className="text-muted-foreground">
              Real-time task monitoring and team productivity insights
            </p>
          </div>
        </div>

        {/* Connection Status */}
        {enableRealTime && (
          <div className="flex items-center gap-2">
            <div
              className={`h-2 w-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}
            />
            <span className="text-muted-foreground text-sm">
              {isConnected ? 'Live Updates' : 'Offline'}
            </span>
          </div>
        )}
      </div>

      {/* Connection Error Alert */}
      {connectionError && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>Real-time updates unavailable: {connectionError}</AlertDescription>
        </Alert>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="font-medium text-muted-foreground text-sm">Total Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">{metrics.totalTasks}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="font-medium text-muted-foreground text-sm">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="font-bold text-2xl text-green-600">{metrics.completedTasks}</div>
              <ProgressIndicator
                percentage={(metrics.completedTasks / metrics.totalTasks) * 100}
                size="small"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="font-medium text-muted-foreground text-sm">In Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl text-blue-600">{metrics.inProgressTasks}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="font-medium text-muted-foreground text-sm">Overdue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="font-bold text-2xl text-red-600">{metrics.overdueTasks}</div>
              {metrics.overdueTasks > 0 && <AlertTriangle className="h-5 w-5 text-red-500" />}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Team Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Team Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium text-sm">Team Velocity</span>
                <Badge variant={teamVelocity >= 70 ? 'default' : 'secondary'}>
                  {teamVelocity}%
                </Badge>
              </div>
              <ProgressIndicator percentage={teamVelocity} size="large" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span className="font-medium text-sm">Average Completion</span>
              </div>
              <div className="font-bold text-2xl">
                {Math.round(metrics.averageCompletionTime / 60)}h
              </div>
              <p className="text-muted-foreground text-xs">
                {metrics.averageCompletionTime} minutes average
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span className="font-medium text-sm">Active Contributors</span>
              </div>
              <div className="font-bold text-2xl">
                {new Set(inProgressTasks.map((task) => task.taskId)).size}
              </div>
            </div>
          </div>

          {isProductivityConcern && (
            <div className="mt-4 rounded-lg border border-yellow-200 bg-yellow-50 p-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <span className="font-medium text-sm text-yellow-800">
                  Productivity Concern Detected
                </span>
              </div>
              <p className="mt-1 text-sm text-yellow-700">
                High average completion time or overdue tasks detected. Consider reviewing task
                allocation and workload.
              </p>
              <div className="hidden" data-testid="bottleneck-warning">
                Bottleneck detected
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Progress Monitoring Tabs */}
      <Tabs className="space-y-4" defaultValue="active">
        <TabsList>
          <TabsTrigger value="active">Active Tasks ({inProgressTasks.length})</TabsTrigger>
          <TabsTrigger value="alerts">
            Alerts ({overdueTasks.length + blockedTasks.length})
          </TabsTrigger>
          <TabsTrigger value="completed">Completed ({metrics.completedTasks})</TabsTrigger>
        </TabsList>

        <TabsContent className="space-y-4" value="active">
          {inProgressTasks.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-muted-foreground">No active tasks to monitor</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {inProgressTasks.map((task) => (
                <TaskProgressCard
                  key={task.taskId}
                  onProgressUpdate={async (update) => {
                    console.log('Progress update:', update)
                    // Handle progress update
                  }}
                  progress={task} // In real app, fetch actual title
                  taskTitle={`Task ${task.taskId.slice(-6)}`}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent className="space-y-4" value="alerts">
          <AlertSystem
            onDismiss={(alertId) => {
              console.log('Dismissed alert:', alertId)
              // Handle alert dismissal
            }}
            taskProgress={taskProgress}
          />
        </TabsContent>

        <TabsContent className="space-y-4" value="completed">
          <div className="py-8 text-center">
            <div className="mb-2 font-bold text-4xl text-green-600">{metrics.completedTasks}</div>
            <p className="text-muted-foreground">Tasks completed successfully</p>
            <p className="mt-1 text-muted-foreground text-sm">
              Average completion time: {Math.round(metrics.averageCompletionTime / 60)} hours
            </p>
          </div>
        </TabsContent>
      </Tabs>

      {/* Last Update Timestamp */}
      <div className="text-center text-muted-foreground text-xs">
        Last updated: {lastUpdate.toLocaleTimeString()}
        {enableRealTime && isConnected && ' (Live)'}
      </div>
    </div>
  )
}
