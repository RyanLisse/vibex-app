import React, { memo, useCallback } from 'react'
import { Handle, Position, NodeProps } from '@xyflow/react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import {
  Activity,
  Brain,
  Clock,
  Cpu,
  AlertTriangle,
  CheckCircle,
  Pause,
  Play,
  Square,
} from 'lucide-react'

export interface AgentNodeData {
  agent: {
    id: string
    name: string
    type: 'coder' | 'reviewer' | 'tester' | 'researcher' | 'optimizer'
    provider: 'claude' | 'openai' | 'gemini' | 'custom'
    status: 'idle' | 'busy' | 'error' | 'terminated'
    capabilities: string[]
  }
  metrics: {
    totalTasks: number
    completedTasks: number
    failedTasks: number
    averageResponseTime: number
    cpuUsage: number
    memoryUsage: number
  }
  currentTask?: {
    id: string
    name: string
    progress: number
    estimatedCompletion: Date
  }
}

export const AgentNode = memo<NodeProps<AgentNodeData>>(({ data, selected }) => {
  const { agent, metrics, currentTask } = data

  const getStatusIcon = useCallback(() => {
    switch (agent.status) {
      case 'idle':
        return <Pause className="w-4 h-4 text-yellow-500" />
      case 'busy':
        return <Play className="w-4 h-4 text-green-500" />
      case 'error':
        return <AlertTriangle className="w-4 h-4 text-red-500" />
      case 'terminated':
        return <Square className="w-4 h-4 text-gray-500" />
      default:
        return <Activity className="w-4 h-4 text-blue-500" />
    }
  }, [agent.status])

  const getStatusColor = useCallback(() => {
    switch (agent.status) {
      case 'idle':
        return 'border-yellow-500 bg-yellow-50'
      case 'busy':
        return 'border-green-500 bg-green-50'
      case 'error':
        return 'border-red-500 bg-red-50'
      case 'terminated':
        return 'border-gray-500 bg-gray-50'
      default:
        return 'border-blue-500 bg-blue-50'
    }
  }, [agent.status])

  const getProviderColor = useCallback(() => {
    switch (agent.provider) {
      case 'claude':
        return 'bg-orange-100 text-orange-800'
      case 'openai':
        return 'bg-green-100 text-green-800'
      case 'gemini':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }, [agent.provider])

  const successRate =
    metrics.totalTasks > 0 ? ((metrics.completedTasks / metrics.totalTasks) * 100).toFixed(1) : '0'

  return (
    <Card
      className={`
        w-80 transition-all duration-200 cursor-pointer
        ${getStatusColor()}
        ${selected ? 'ring-2 ring-blue-500 shadow-lg' : 'shadow-md hover:shadow-lg'}
      `}
    >
      {/* Input/Output handles for connections */}
      <Handle type="target" position={Position.Left} className="w-3 h-3 bg-blue-500" />
      <Handle type="source" position={Position.Right} className="w-3 h-3 bg-blue-500" />

      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {getStatusIcon()}
            <h3 className="font-semibold text-sm">{agent.name}</h3>
          </div>
          <Badge variant="secondary" className={getProviderColor()}>
            {agent.provider}
          </Badge>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="text-xs">
            {agent.type}
          </Badge>
          <Badge variant="outline" className="text-xs">
            {agent.capabilities.length} capabilities
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Current task progress */}
        {currentTask && agent.status === 'busy' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium">Current Task</span>
              <span className="text-gray-500">{currentTask.progress}%</span>
            </div>
            <Progress value={currentTask.progress} className="h-2" />
            <div className="text-xs text-gray-600 truncate">{currentTask.name}</div>
          </div>
        )}

        {/* Performance metrics */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center space-x-1">
            <CheckCircle className="w-3 h-3 text-green-500" />
            <span>{successRate}% success</span>
          </div>
          <div className="flex items-center space-x-1">
            <Clock className="w-3 h-3 text-blue-500" />
            <span>{metrics.averageResponseTime}ms avg</span>
          </div>
          <div className="flex items-center space-x-1">
            <Cpu className="w-3 h-3 text-purple-500" />
            <span>{metrics.cpuUsage}% CPU</span>
          </div>
          <div className="flex items-center space-x-1">
            <Brain className="w-3 h-3 text-indigo-500" />
            <span>{metrics.memoryUsage}% memory</span>
          </div>
        </div>

        {/* Task statistics */}
        <div className="flex justify-between text-xs text-gray-600">
          <span>{metrics.completedTasks} completed</span>
          <span>{metrics.failedTasks} failed</span>
          <span>{metrics.totalTasks} total</span>
        </div>
      </CardContent>
    </Card>
  )
})

AgentNode.displayName = 'AgentNode'
