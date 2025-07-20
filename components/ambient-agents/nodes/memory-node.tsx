import { Handle, type NodeProps, Position } from '@xyflow/react'
import {
  AlertTriangle,
  Archive,
  Clock,
  Database,
  HardDrive,
  Network,
  Users,
  Zap,
} from 'lucide-react'
import React, { memo, useCallback } from 'react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'

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
        return <Users className="h-4 w-4 text-blue-500" />
      case 'private':
        return <Database className="h-4 w-4 text-green-500" />
      case 'cache':
        return <Zap className="h-4 w-4 text-yellow-500" />
      case 'persistent':
        return <Archive className="h-4 w-4 text-purple-500" />
      default:
        return <HardDrive className="h-4 w-4 text-gray-500" />
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
    return Number.parseFloat((bytes / k ** i).toFixed(1)) + ' ' + sizes[i]
  }, [])

  const formatTimeAgo = useCallback((date: Date) => {
    const now = new Date()
    const diff = now.getTime() - new Date(date).getTime()

    if (diff < 1000) return 'Just now'
    if (diff < 60_000) return `${Math.floor(diff / 1000)}s ago`
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
    if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`
    return `${Math.floor(diff / 86_400_000)}d ago`
  }, [])

  const getProgressColor = useCallback(() => {
    const percentage = memory.usage.percentage
    if (percentage >= 90) return 'bg-red-500'
    if (percentage >= 75) return 'bg-yellow-500'
    return 'bg-blue-500'
  }, [memory.usage.percentage])

  return (
    <Card
      className={`w-72 cursor-pointer transition-all duration-200 ${getUsageColor()} ${selected ? 'shadow-lg ring-2 ring-blue-500' : 'shadow-md hover:shadow-lg'} `}
    >
      {/* Input/Output handles for connections */}
      <Handle className="h-3 w-3 bg-purple-500" position={Position.Left} type="target" />
      <Handle className="h-3 w-3 bg-purple-500" position={Position.Right} type="source" />

      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {getTypeIcon()}
            <h3 className="truncate font-semibold text-sm">{memory.name}</h3>
          </div>
          <Badge className={getTypeColor()} variant="secondary">
            {memory.type}
          </Badge>
        </div>

        <div className="flex items-center space-x-2">
          <Badge className="flex items-center space-x-1 text-xs" variant="outline">
            <Network className="h-3 w-3" />
            <span>{memory.connections.length} connections</span>
          </Badge>
          {memory.usage.percentage >= 90 && (
            <Badge className="flex items-center space-x-1 text-xs" variant="destructive">
              <AlertTriangle className="h-3 w-3" />
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
          <Progress className={`h-2 ${getProgressColor()}`} value={memory.usage.percentage} />
          <div className="flex justify-between text-gray-600 text-xs">
            <span>{formatBytes(memory.usage.used)} used</span>
            <span>{formatBytes(memory.usage.total)} total</span>
          </div>
        </div>

        {/* Access statistics */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center space-x-1">
            <Clock className="h-3 w-3 text-blue-500" />
            <span>{formatTimeAgo(memory.lastAccessed)}</span>
          </div>
          <div className="flex items-center space-x-1">
            <Zap className="h-3 w-3 text-yellow-500" />
            <span>{memory.accessCount} accesses</span>
          </div>

          {metrics && (
            <>
              <div className="flex items-center space-x-1">
                <HardDrive className="h-3 w-3 text-green-500" />
                <span>{metrics.readOps} reads</span>
              </div>
              <div className="flex items-center space-x-1">
                <Database className="h-3 w-3 text-purple-500" />
                <span>{metrics.writeOps} writes</span>
              </div>
              <div className="flex items-center space-x-1">
                <Clock className="h-3 w-3 text-indigo-500" />
                <span>{metrics.averageLatency}ms avg</span>
              </div>
              {metrics.hitRate !== undefined && (
                <div className="flex items-center space-x-1">
                  <Zap className="h-3 w-3 text-orange-500" />
                  <span>{metrics.hitRate.toFixed(1)}% hit</span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Connected agents/systems */}
        {memory.connections.length > 0 && (
          <div className="space-y-1">
            <div className="font-medium text-gray-700 text-xs">Connected to:</div>
            <div className="flex flex-wrap gap-1">
              {memory.connections.slice(0, 3).map((connection, index) => (
                <Badge className="text-xs" key={index} variant="outline">
                  {connection}
                </Badge>
              ))}
              {memory.connections.length > 3 && (
                <Badge className="text-xs" variant="outline">
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
