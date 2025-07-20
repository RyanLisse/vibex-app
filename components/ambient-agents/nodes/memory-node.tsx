import React, { memo, useCallback } from 'react'
import { Handle, Position, NodeProps } from '@xyflow/react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import {
  Database,
  HardDrive,
  Network,
  Users,
  Clock,
  Zap,
  Archive,
  AlertTriangle,
} from 'lucide-react'

export interface MemoryNodeData {
  memory: {
    id: string
    name: string
    type: 'shared' | 'private' | 'cache' | 'persistent'
    usage: {
      used: number
      total: number
      percentage: number
    }
    connections: string[]
    lastAccessed: Date
    accessCount: number
  }
  metrics?: {
    readOps: number
    writeOps: number
    averageLatency: number
    hitRate?: number
  }
}

export const MemoryNode = memo<NodeProps<MemoryNodeData>>(({ data, selected }) => {
  const { memory, metrics } = data

  const getTypeIcon = useCallback(() => {
    switch (memory.type) {
      case 'shared':
        return <Users className="w-4 h-4 text-blue-500" />
      case 'private':
        return <Database className="w-4 h-4 text-green-500" />
      case 'cache':
        return <Zap className="w-4 h-4 text-yellow-500" />
      case 'persistent':
        return <Archive className="w-4 h-4 text-purple-500" />
      default:
        return <HardDrive className="w-4 h-4 text-gray-500" />
    }
  }, [memory.type])

  const getTypeColor = useCallback(() => {
    switch (memory.type) {
      case 'shared':
        return 'bg-blue-100 text-blue-800'
      case 'private':
        return 'bg-green-100 text-green-800'
      case 'cache':
        return 'bg-yellow-100 text-yellow-800'
      case 'persistent':
        return 'bg-purple-100 text-purple-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }, [memory.type])

  const getUsageColor = useCallback(() => {
    const percentage = memory.usage.percentage
    if (percentage >= 90) return 'border-red-500 bg-red-50'
    if (percentage >= 75) return 'border-yellow-500 bg-yellow-50'
    if (percentage >= 50) return 'border-blue-500 bg-blue-50'
    return 'border-green-500 bg-green-50'
  }, [memory.usage.percentage])

  const formatBytes = useCallback((bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }, [])

  const formatTimeAgo = useCallback((date: Date) => {
    const now = new Date()
    const diff = now.getTime() - new Date(date).getTime()

    if (diff < 1000) return 'Just now'
    if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
    return `${Math.floor(diff / 86400000)}d ago`
  }, [])

  const getProgressColor = useCallback(() => {
    const percentage = memory.usage.percentage
    if (percentage >= 90) return 'bg-red-500'
    if (percentage >= 75) return 'bg-yellow-500'
    return 'bg-blue-500'
  }, [memory.usage.percentage])

  return (
    <Card
      className={`
        w-72 transition-all duration-200 cursor-pointer
        ${getUsageColor()}
        ${selected ? 'ring-2 ring-blue-500 shadow-lg' : 'shadow-md hover:shadow-lg'}
      `}
    >
      {/* Input/Output handles for connections */}
      <Handle type="target" position={Position.Left} className="w-3 h-3 bg-purple-500" />
      <Handle type="source" position={Position.Right} className="w-3 h-3 bg-purple-500" />

      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {getTypeIcon()}
            <h3 className="font-semibold text-sm truncate">{memory.name}</h3>
          </div>
          <Badge variant="secondary" className={getTypeColor()}>
            {memory.type}
          </Badge>
        </div>

        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="text-xs flex items-center space-x-1">
            <Network className="w-3 h-3" />
            <span>{memory.connections.length} connections</span>
          </Badge>
          {memory.usage.percentage >= 90 && (
            <Badge variant="destructive" className="text-xs flex items-center space-x-1">
              <AlertTriangle className="w-3 h-3" />
              <span>High usage</span>
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Memory usage */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium">Memory Usage</span>
            <span className="text-gray-500">{memory.usage.percentage.toFixed(1)}%</span>
          </div>
          <Progress value={memory.usage.percentage} className={`h-2 ${getProgressColor()}`} />
          <div className="flex justify-between text-xs text-gray-600">
            <span>{formatBytes(memory.usage.used)} used</span>
            <span>{formatBytes(memory.usage.total)} total</span>
          </div>
        </div>

        {/* Access statistics */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center space-x-1">
            <Clock className="w-3 h-3 text-blue-500" />
            <span>{formatTimeAgo(memory.lastAccessed)}</span>
          </div>
          <div className="flex items-center space-x-1">
            <Zap className="w-3 h-3 text-yellow-500" />
            <span>{memory.accessCount} accesses</span>
          </div>

          {metrics && (
            <>
              <div className="flex items-center space-x-1">
                <HardDrive className="w-3 h-3 text-green-500" />
                <span>{metrics.readOps} reads</span>
              </div>
              <div className="flex items-center space-x-1">
                <Database className="w-3 h-3 text-purple-500" />
                <span>{metrics.writeOps} writes</span>
              </div>
              <div className="flex items-center space-x-1">
                <Clock className="w-3 h-3 text-indigo-500" />
                <span>{metrics.averageLatency}ms avg</span>
              </div>
              {metrics.hitRate !== undefined && (
                <div className="flex items-center space-x-1">
                  <Zap className="w-3 h-3 text-orange-500" />
                  <span>{metrics.hitRate.toFixed(1)}% hit</span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Connected agents/systems */}
        {memory.connections.length > 0 && (
          <div className="space-y-1">
            <div className="text-xs font-medium text-gray-700">Connected to:</div>
            <div className="flex flex-wrap gap-1">
              {memory.connections.slice(0, 3).map((connection, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {connection}
                </Badge>
              ))}
              {memory.connections.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{memory.connections.length - 3} more
                </Badge>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
})

MemoryNode.displayName = 'MemoryNode'
