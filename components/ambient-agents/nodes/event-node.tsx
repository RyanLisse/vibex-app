import React, { memo, useCallback } from 'react'
import { Handle, Position, NodeProps } from '@xyflow/react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import {
  Zap,
  AlertCircle,
  Info,
  CheckCircle,
  XCircle,
  Clock,
  User,
  Database,
  Network,
} from 'lucide-react'

export interface EventNodeData {
  event: {
    id: string
    type:
      | 'agent.created'
      | 'agent.status.changed'
      | 'task.started'
      | 'task.completed'
      | 'memory.updated'
      | 'system.error'
      | 'communication.established'
    timestamp: Date
    source: string
    target?: string
    severity: 'info' | 'warning' | 'error' | 'success'
    data: any
  }
  metrics?: {
    frequency: number
    lastOccurrence: Date
    relatedEvents: number
  }
}

export const EventNode = memo<NodeProps<EventNodeData>>(({ data, selected }) => {
  const { event, metrics } = data

  const getEventIcon = useCallback(() => {
    switch (event.type) {
      case 'agent.created':
        return <User className="w-4 h-4 text-blue-500" />
      case 'agent.status.changed':
        return <Zap className="w-4 h-4 text-yellow-500" />
      case 'task.started':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'task.completed':
        return <CheckCircle className="w-4 h-4 text-green-600" />
      case 'memory.updated':
        return <Database className="w-4 h-4 text-purple-500" />
      case 'system.error':
        return <XCircle className="w-4 h-4 text-red-500" />
      case 'communication.established':
        return <Network className="w-4 h-4 text-indigo-500" />
      default:
        return <Info className="w-4 h-4 text-gray-500" />
    }
  }, [event.type])

  const getSeverityIcon = useCallback(() => {
    switch (event.severity) {
      case 'error':
        return <AlertCircle className="w-3 h-3 text-red-500" />
      case 'warning':
        return <AlertCircle className="w-3 h-3 text-yellow-500" />
      case 'success':
        return <CheckCircle className="w-3 h-3 text-green-500" />
      case 'info':
      default:
        return <Info className="w-3 h-3 text-blue-500" />
    }
  }, [event.severity])

  const getSeverityColor = useCallback(() => {
    switch (event.severity) {
      case 'error':
        return 'border-red-500 bg-red-50'
      case 'warning':
        return 'border-yellow-500 bg-yellow-50'
      case 'success':
        return 'border-green-500 bg-green-50'
      case 'info':
      default:
        return 'border-blue-500 bg-blue-50'
    }
  }, [event.severity])

  const getEventTypeColor = useCallback(() => {
    switch (event.type) {
      case 'agent.created':
      case 'agent.status.changed':
        return 'bg-blue-100 text-blue-800'
      case 'task.started':
      case 'task.completed':
        return 'bg-green-100 text-green-800'
      case 'memory.updated':
        return 'bg-purple-100 text-purple-800'
      case 'system.error':
        return 'bg-red-100 text-red-800'
      case 'communication.established':
        return 'bg-indigo-100 text-indigo-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }, [event.type])

  const formatEventType = useCallback((type: string) => {
    return type
      .split('.')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ')
  }, [])

  const formatTimeAgo = useCallback((timestamp: Date) => {
    const now = new Date()
    const diff = now.getTime() - new Date(timestamp).getTime()

    if (diff < 1000) return 'Just now'
    if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
    return `${Math.floor(diff / 86400000)}d ago`
  }, [])

  const getEventData = useCallback(() => {
    if (!event.data || typeof event.data !== 'object') return null

    const entries = Object.entries(event.data).slice(0, 3) // Show first 3 entries
    return entries.map(([key, value]) => ({
      key,
      value:
        typeof value === 'object'
          ? JSON.stringify(value).slice(0, 20) + '...'
          : String(value).slice(0, 20),
    }))
  }, [event.data])

  return (
    <Card
      className={`
        w-64 transition-all duration-200 cursor-pointer
        ${getSeverityColor()}
        ${selected ? 'ring-2 ring-blue-500 shadow-lg' : 'shadow-md hover:shadow-lg'}
      `}
    >
      {/* Input/Output handles for connections */}
      <Handle type="target" position={Position.Left} className="w-2 h-2 bg-blue-500" />
      <Handle type="source" position={Position.Right} className="w-2 h-2 bg-blue-500" />

      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {getEventIcon()}
            <div className="flex items-center space-x-1">
              {getSeverityIcon()}
              <span className="text-xs font-medium">Event</span>
            </div>
          </div>
          <Badge variant="secondary" className={getEventTypeColor()}>
            {formatEventType(event.type)}
          </Badge>
        </div>

        <div className="text-xs text-gray-600">{formatTimeAgo(event.timestamp)}</div>
      </CardHeader>

      <CardContent className="space-y-2">
        {/* Source and Target */}
        <div className="text-xs space-y-1">
          <div className="flex items-center space-x-1">
            <span className="font-medium">From:</span>
            <span className="truncate">{event.source}</span>
          </div>
          {event.target && (
            <div className="flex items-center space-x-1">
              <span className="font-medium">To:</span>
              <span className="truncate">{event.target}</span>
            </div>
          )}
        </div>

        {/* Event data preview */}
        {getEventData() && (
          <div className="space-y-1">
            <div className="text-xs font-medium text-gray-700">Data:</div>
            <div className="text-xs space-y-1">
              {getEventData()?.map(({ key, value }) => (
                <div key={key} className="flex space-x-1">
                  <span className="font-medium">{key}:</span>
                  <span className="truncate text-gray-600">{value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Metrics */}
        {metrics && (
          <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t">
            <div className="flex items-center space-x-1">
              <Clock className="w-3 h-3 text-gray-500" />
              <span>{metrics.frequency}/min</span>
            </div>
            <div className="flex items-center space-x-1">
              <Network className="w-3 h-3 text-gray-500" />
              <span>{metrics.relatedEvents} related</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
})

EventNode.displayName = 'EventNode'
