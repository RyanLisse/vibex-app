import React, { memo, useCallback } from 'react'
import { Handle, Position, NodeProps } from '@xyflow/react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import {
  Play,
  Pause,
  CheckCircle,
  XCircle,
  Clock,
  User,
  GitBranch,
  AlertTriangle
} from 'lucide-react'

export interface TaskNodeData {
  task: {
    id: string
    name: string
    status: 'pending' | 'running' | 'completed' | 'failed'
    dependencies: string[]
    assignedAgent?: string
    progress: number
    startTime?: Date
    endTime?: Date
    priority: 'low' | 'medium' | 'high' | 'critical'
    estimatedDuration?: number
  }
  metrics?: {
    executionTime?: number
    retryCount?: number
    resourceUsage?: number
  }
}

export const TaskNode = memo<NodeProps<TaskNodeData>>(({ data, selected }) => {
  const { task, metrics } = data

  const getStatusIcon = useCallback(() => {
    switch (task.status) {
      case 'pending':
        return <Pause className="w-4 h-4 text-yellow-500" />
      case 'running':
        return <Play className="w-4 h-4 text-blue-500" />
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />
      default:
        return <Clock className="w-4 h-4 text-gray-500" />
    }
  }, [task.status])

  const getStatusColor = useCallback(() => {
    switch (task.status) {
      case 'pending':
        return 'border-yellow-500 bg-yellow-50'
      case 'running':
        return 'border-blue-500 bg-blue-50'
      case 'completed':
        return 'border-green-500 bg-green-50'
      case 'failed':
        return 'border-red-500 bg-red-50'
      default:
        return 'border-gray-500 bg-gray-50'
    }
  }, [task.status])

  const getPriorityColor = useCallback(() => {
    switch (task.priority) {
      case 'critical':
        return 'bg-red-100 text-red-800'
      case 'high':
        return 'bg-orange-100 text-orange-800'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800'
      case 'low':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }, [task.priority])

  const formatDuration = useCallback((ms?: number) => {
    if (!ms) return 'N/A'
    if (ms < 1000) return `${ms}ms`
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
    return `${(ms / 60000).toFixed(1)}m`
  }, [])

  const getExecutionTime = useCallback(() => {
    if (metrics?.executionTime) return metrics.executionTime
    if (task.startTime && task.endTime) {
      return new Date(task.endTime).getTime() - new Date(task.startTime).getTime()
    }
    if (task.startTime && task.status === 'running') {
      return Date.now() - new Date(task.startTime).getTime()
    }
    return undefined
  }, [task, metrics])

  return (
    <Card
      className={`
        w-72 transition-all duration-200 cursor-pointer
        ${getStatusColor()}
        ${selected ? 'ring-2 ring-blue-500 shadow-lg' : 'shadow-md hover:shadow-lg'}
      `}
    >
      {/* Input/Output handles for connections */}
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 bg-blue-500"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 bg-blue-500"
      />

      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {getStatusIcon()}
            <h3 className="font-semibold text-sm truncate">{task.name}</h3>
          </div>
          <Badge variant="secondary" className={getPriorityColor()}>
            {task.priority}
          </Badge>
        </div>
        
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="text-xs">
            {task.status}
          </Badge>
          {task.dependencies.length > 0 && (
            <Badge variant="outline" className="text-xs flex items-center space-x-1">
              <GitBranch className="w-3 h-3" />
              <span>{task.dependencies.length} deps</span>
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Progress bar for running tasks */}
        {(task.status === 'running' || task.status === 'completed') && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium">Progress</span>
              <span className="text-gray-500">{task.progress}%</span>
            </div>
            <Progress value={task.progress} className="h-2" />
          </div>
        )}

        {/* Task details */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          {task.assignedAgent && (
            <div className="flex items-center space-x-1 col-span-2">
              <User className="w-3 h-3 text-blue-500" />
              <span className="truncate">Agent: {task.assignedAgent}</span>
            </div>
          )}
          
          <div className="flex items-center space-x-1">
            <Clock className="w-3 h-3 text-purple-500" />
            <span>{formatDuration(getExecutionTime())}</span>
          </div>
          
          {task.estimatedDuration && (
            <div className="flex items-center space-x-1">
              <Clock className="w-3 h-3 text-gray-500" />
              <span>Est: {formatDuration(task.estimatedDuration)}</span>
            </div>
          )}

          {metrics?.retryCount && metrics.retryCount > 0 && (
            <div className="flex items-center space-x-1">
              <AlertTriangle className="w-3 h-3 text-yellow-500" />
              <span>{metrics.retryCount} retries</span>
            </div>
          )}

          {metrics?.resourceUsage && (
            <div className="flex items-center space-x-1">
              <GitBranch className="w-3 h-3 text-indigo-500" />
              <span>{metrics.resourceUsage}% resources</span>
            </div>
          )}
        </div>

        {/* Timestamps */}
        <div className="text-xs text-gray-600">
          {task.startTime && (
            <div>Started: {new Date(task.startTime).toLocaleTimeString()}</div>
          )}
          {task.endTime && (
            <div>Ended: {new Date(task.endTime).toLocaleTimeString()}</div>
          )}
        </div>
      </CardContent>
    </Card>
  )
})

TaskNode.displayName = 'TaskNode'