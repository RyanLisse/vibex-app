import React from 'react'
import { X, Activity, Clock, Cpu, Brain, CheckCircle, AlertTriangle, Play, Pause } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Node } from '@xyflow/react'
import { AgentNodeData } from '../nodes/agent-node'

export interface AgentDetailPanelProps {
  node: Node<AgentNodeData> | null
  isOpen: boolean
  onClose: () => void
}

export const AgentDetailPanel: React.FC<AgentDetailPanelProps> = ({
  node,
  isOpen,
  onClose,
}) => {
  if (!isOpen || !node || node.type !== 'agent') {
    return null
  }

  const { agent, metrics, currentTask } = node.data

  const getStatusIcon = () => {
    switch (agent.status) {
      case 'idle':
        return <Pause className="w-4 h-4 text-yellow-500" />
      case 'busy':
        return <Play className="w-4 h-4 text-green-500" />
      case 'error':
        return <AlertTriangle className="w-4 h-4 text-red-500" />
      case 'terminated':
        return <X className="w-4 h-4 text-gray-500" />
      default:
        return <Activity className="w-4 h-4 text-blue-500" />
    }
  }

  const getProviderColor = () => {
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
  }

  const successRate = metrics.totalTasks > 0
    ? ((metrics.completedTasks / metrics.totalTasks) * 100).toFixed(1)
    : '0'

  const errorRate = metrics.totalTasks > 0
    ? ((metrics.failedTasks / metrics.totalTasks) * 100).toFixed(1)
    : '0'

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-white shadow-xl border-l z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center space-x-2">
          {getStatusIcon()}
          <h2 className="text-lg font-semibold">{agent.name}</h2>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* Basic Info */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Agent Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Provider</span>
                <Badge variant="secondary" className={getProviderColor()}>
                  {agent.provider}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Type</span>
                <Badge variant="outline">{agent.type}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Status</span>
                <div className="flex items-center space-x-1">
                  {getStatusIcon()}
                  <span className="text-sm capitalize">{agent.status}</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Node ID</span>
                <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">
                  {agent.id}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Current Task */}
          {currentTask && agent.status === 'busy' && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Current Task</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="font-medium">{currentTask.name}</span>
                    <span className="text-gray-500">{currentTask.progress}%</span>
                  </div>
                  <Progress value={currentTask.progress} className="h-2" />
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Task ID</span>
                    <span className="font-mono text-xs">{currentTask.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Est. Completion</span>
                    <span>{new Date(currentTask.estimatedCompletion).toLocaleTimeString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Capabilities */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Capabilities</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-1">
                {agent.capabilities.map((capability, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {capability}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Metrics */}
          <Tabs defaultValue="performance" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="performance">Performance</TabsTrigger>
              <TabsTrigger value="tasks">Tasks</TabsTrigger>
            </TabsList>

            <TabsContent value="performance" className="space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Resource Usage</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center space-x-1">
                        <Cpu className="w-3 h-3 text-purple-500" />
                        <span>CPU Usage</span>
                      </div>
                      <span>{metrics.cpuUsage}%</span>
                    </div>
                    <Progress value={metrics.cpuUsage} className="h-2" />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center space-x-1">
                        <Brain className="w-3 h-3 text-indigo-500" />
                        <span>Memory Usage</span>
                      </div>
                      <span>{metrics.memoryUsage}%</span>
                    </div>
                    <Progress value={metrics.memoryUsage} className="h-2" />
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-1">
                      <Clock className="w-3 h-3 text-blue-500" />
                      <span>Avg Response Time</span>
                    </div>
                    <span>{metrics.averageResponseTime}ms</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Success Metrics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Success Rate</span>
                      <span className="text-green-600 font-medium">{successRate}%</span>
                    </div>
                    <Progress value={Number.parseFloat(successRate)} className="h-2" />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Error Rate</span>
                      <span className="text-red-600 font-medium">{errorRate}%</span>
                    </div>
                    <Progress value={Number.parseFloat(errorRate)} className="h-2" />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="tasks" className="space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Task Statistics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-gray-900">{metrics.totalTasks}</div>
                      <div className="text-xs text-gray-600">Total</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-green-600">{metrics.completedTasks}</div>
                      <div className="text-xs text-gray-600">Completed</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-red-600">{metrics.failedTasks}</div>
                      <div className="text-xs text-gray-600">Failed</div>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center space-x-1">
                        <CheckCircle className="w-3 h-3 text-green-500" />
                        <span>Completed Tasks</span>
                      </div>
                      <span>{metrics.completedTasks}</span>
                    </div>
                    <Progress 
                      value={metrics.totalTasks > 0 ? (metrics.completedTasks / metrics.totalTasks) * 100 : 0} 
                      className="h-2" 
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center space-x-1">
                        <AlertTriangle className="w-3 h-3 text-red-500" />
                        <span>Failed Tasks</span>
                      </div>
                      <span>{metrics.failedTasks}</span>
                    </div>
                    <Progress 
                      value={metrics.totalTasks > 0 ? (metrics.failedTasks / metrics.totalTasks) * 100 : 0} 
                      className="h-2" 
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Actions */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" size="sm" className="w-full">
                View Full History
              </Button>
              <Button variant="outline" size="sm" className="w-full">
                Restart Agent
              </Button>
              <Button variant="outline" size="sm" className="w-full">
                Export Metrics
              </Button>
            </CardContent>
          </Card>
        </div>
      </ScrollArea>
    </div>
  )
}