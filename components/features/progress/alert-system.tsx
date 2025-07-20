'use client'

import { AlertTriangle, Bell, Clock, Lock, X } from 'lucide-react'
import { useState } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { TaskProgress } from '@/src/schemas/enhanced-task-schemas'

interface AlertSystemProps {
  taskProgress: TaskProgress[]
  onDismiss: (alertId: string) => void
  className?: string
}

interface TaskAlert {
  id: string
  type: 'overdue' | 'blocked' | 'stale'
  severity: 'high' | 'medium' | 'low'
  title: string
  description: string
  taskId: string
  timestamp: Date
}

export function AlertSystem({ taskProgress, onDismiss, className = '' }: AlertSystemProps) {
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set())

  // Generate alerts from task progress data
  const generateAlerts = (): TaskAlert[] => {
    const alerts: TaskAlert[] = []

    taskProgress.forEach((task) => {
      // Overdue tasks
      if (task.isOverdue) {
        alerts.push({
          id: `overdue-alert-${task.taskId}`,
          type: 'overdue',
          severity: 'high',
          title: 'Task Overdue',
          description: `Task ${task.taskId.slice(-6)} is past its due date and needs immediate attention.`,
          taskId: task.taskId,
          timestamp: new Date(),
        })
      }

      // Blocked tasks
      if (task.isBlocked) {
        alerts.push({
          id: `blocked-alert-${task.taskId}`,
          type: 'blocked',
          severity: 'high',
          title: 'Task Blocked',
          description: `Task ${task.taskId.slice(-6)} appears to be blocked and may need assistance.`,
          taskId: task.taskId,
          timestamp: new Date(),
        })
      }

      // Stale tasks (no progress for a while)
      const daysSinceUpdate =
        (Date.now() - new Date(task.lastUpdated).getTime()) / (1000 * 60 * 60 * 24)
      if (task.status === 'in_progress' && daysSinceUpdate > 2) {
        alerts.push({
          id: `stale-alert-${task.taskId}`,
          type: 'stale',
          severity: 'medium',
          title: 'Stale Task',
          description: `Task ${task.taskId.slice(-6)} hasn't been updated in ${Math.floor(daysSinceUpdate)} days.`,
          taskId: task.taskId,
          timestamp: new Date(),
        })
      }
    })

    // Sort by severity (high first) and timestamp
    return alerts
      .filter((alert) => !dismissedAlerts.has(alert.id))
      .sort((a, b) => {
        if (a.severity !== b.severity) {
          const severityOrder = { high: 3, medium: 2, low: 1 }
          return severityOrder[b.severity] - severityOrder[a.severity]
        }
        return b.timestamp.getTime() - a.timestamp.getTime()
      })
  }

  const alerts = generateAlerts()

  // Group alerts by type for summary
  const alertGroups = alerts.reduce(
    (groups, alert) => {
      if (!groups[alert.type]) {
        groups[alert.type] = []
      }
      groups[alert.type].push(alert)
      return groups
    },
    {} as Record<string, TaskAlert[]>
  )

  const handleDismiss = (alertId: string) => {
    setDismissedAlerts((prev) => new Set([...prev, alertId]))
    onDismiss(alertId)
  }

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'overdue':
        return <Clock className="h-4 w-4" />
      case 'blocked':
        return <Lock className="h-4 w-4" />
      case 'stale':
        return <AlertTriangle className="h-4 w-4" />
      default:
        return <Bell className="h-4 w-4" />
    }
  }

  const getAlertColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'destructive'
      case 'medium':
        return 'default'
      case 'low':
        return 'secondary'
      default:
        return 'secondary'
    }
  }

  if (alerts.length === 0) {
    return (
      <div className={`py-8 text-center ${className}`}>
        <div className="mb-2 text-green-600">
          <Bell className="mx-auto h-12 w-12" />
        </div>
        <h3 className="font-semibold text-green-800 text-lg">All Clear!</h3>
        <p className="text-muted-foreground">No active alerts for your tasks.</p>
      </div>
    )
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Alert Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            Alert Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            {Object.entries(alertGroups).map(([type, typeAlerts]) => (
              <div className="text-center" key={type}>
                <div className="mb-2 flex items-center justify-center gap-2">
                  {getAlertIcon(type)}
                  <span className="font-medium capitalize">{type}</span>
                </div>
                <div className="font-bold text-2xl text-red-600">{typeAlerts.length}</div>
                <p className="text-muted-foreground text-xs">
                  {type === 'overdue' && typeAlerts.length > 1
                    ? `${typeAlerts.length} tasks are overdue`
                    : type === 'blocked' && typeAlerts.length > 1
                      ? `${typeAlerts.length} tasks are blocked`
                      : typeAlerts.length === 1
                        ? `1 task is ${type}`
                        : `${typeAlerts.length} ${type} tasks`}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Individual Alerts */}
      <div className="space-y-3">
        {alerts.map((alert) => (
          <Alert
            data-testid={alert.id}
            key={alert.id}
            variant={getAlertColor(alert.severity) as any}
          >
            <div className="flex w-full items-start justify-between">
              <div className="flex items-start gap-3">
                {getAlertIcon(alert.type)}
                <div className="flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <h4 className="font-medium">{alert.title}</h4>
                    <Badge className="text-xs" variant="outline">
                      {alert.severity}
                    </Badge>
                  </div>
                  <AlertDescription className="mb-2">{alert.description}</AlertDescription>
                  <div className="text-muted-foreground text-xs">
                    Task ID: {alert.taskId.slice(-6)} • {alert.timestamp.toLocaleTimeString()}
                  </div>
                </div>
              </div>

              <Button
                aria-label="Dismiss alert"
                className="h-6 w-6 p-0 hover:bg-transparent"
                onClick={() => handleDismiss(alert.id)}
                size="sm"
                variant="ghost"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </Alert>
        ))}
      </div>

      {/* Bulk Actions */}
      {alerts.length > 3 && (
        <div className="pt-4 text-center">
          <Button
            className="gap-2"
            onClick={() => {
              alerts.forEach((alert) => handleDismiss(alert.id))
            }}
            variant="outline"
          >
            <X className="h-4 w-4" />
            Dismiss All Alerts
          </Button>
        </div>
      )}
    </div>
  )
}
