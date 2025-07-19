'use client'

/**
 * Unified Progress Dashboard
 *
 * Comprehensive dashboard for monitoring all agent activities,
 * migration progress, and system performance in real-time.
 */

import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Activity,
  Users,
  CheckCircle,
  AlertTriangle,
  Clock,
  TrendingUp,
  Database,
  Cpu,
  HardDrive,
  Network,
  RefreshCw,
  Play,
  Pause,
  Eye,
  GitBranch,
} from 'lucide-react'
import {
  agentActivityTracker,
  type AgentActivity,
  type AgentType,
} from '@/lib/observability/agent-activity-tracker'
import { MigrationProgressMonitor } from './migration-progress-monitor'
import { TimelineVisualization } from './timeline-visualization'
import { AgentCoordinationMonitor } from './agent-coordination-monitor'

interface UnifiedProgressDashboardProps {
  className?: string
  autoRefresh?: boolean
  refreshInterval?: number
}

export function UnifiedProgressDashboard({
  className = '',
  autoRefresh = true,
  refreshInterval = 5000,
}: UnifiedProgressDashboardProps) {
  const [agents, setAgents] = useState<AgentActivity[]>([])
  const [systemOverview, setSystemOverview] = useState<any>(null)
  const [migrationProgress, setMigrationProgress] = useState<any>(null)
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null)
  const [isPaused, setIsPaused] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  const [loading, setLoading] = useState(true)

  // Fetch all data
  const fetchData = useCallback(async () => {
    if (isPaused) return

    try {
      // Get agent activities
      const agentActivities = agentActivityTracker.getAllAgentActivities()
      setAgents(agentActivities)

      // Get system overview
      const overview = agentActivityTracker.getSystemOverview()
      setSystemOverview(overview)

      // Get migration progress
      const progress = agentActivityTracker.getMigrationProgress()
      setMigrationProgress(progress)

      setLoading(false)
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
    }
  }, [isPaused])

  // Auto refresh
  useEffect(() => {
    fetchData()

    if (autoRefresh && !isPaused) {
      const interval = setInterval(fetchData, refreshInterval)
      return () => clearInterval(interval)
    }
  }, [fetchData, autoRefresh, refreshInterval, isPaused])

  // Get agent type color
  const getAgentTypeColor = useCallback((type: AgentType) => {
    const colors: Record<AgentType, string> = {
      frontend_developer: 'bg-blue-500',
      backend_systems: 'bg-green-500',
      data_migration: 'bg-purple-500',
      devops_engineer: 'bg-orange-500',
      observability_engineer: 'bg-pink-500',
      quality_assurance: 'bg-yellow-500',
      security_specialist: 'bg-red-500',
      performance_optimizer: 'bg-indigo-500',
    }
    return colors[type] || 'bg-gray-500'
  }, [])

  // Get status icon
  const getStatusIcon = useCallback((status: string) => {
    switch (status) {
      case 'active':
      case 'processing':
        return <Activity className="w-4 h-4 animate-spin text-blue-600" />
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-600" />
      case 'error':
      case 'failed':
        return <AlertTriangle className="w-4 h-4 text-red-600" />
      case 'waiting':
        return <Clock className="w-4 h-4 text-yellow-600" />
      default:
        return <Clock className="w-4 h-4 text-gray-400" />
    }
  }, [])

  // Format agent type for display
  const formatAgentType = (type: AgentType): string => {
    return type
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Activity className="w-5 h-5 animate-spin mr-2" />
            Loading dashboard...
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center text-2xl">
              <Users className="w-6 h-6 mr-2" />
              Unified Progress Dashboard
            </CardTitle>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" onClick={() => setIsPaused(!isPaused)}>
                {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
              </Button>
              <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* System Overview */}
      {systemOverview && (
        <Card>
          <CardHeader>
            <CardTitle>System Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-3xl font-bold">{systemOverview.totalAgents}</div>
                <div className="text-sm text-gray-600">Total Agents</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">
                  {systemOverview.activeAgents}
                </div>
                <div className="text-sm text-gray-600">Active Agents</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">
                  {systemOverview.completedTasks}
                </div>
                <div className="text-sm text-gray-600">Completed Tasks</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-red-600">{systemOverview.failedTasks}</div>
                <div className="text-sm text-gray-600">Failed Tasks</div>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-3 gap-4">
              <div className="flex items-center">
                <Cpu className="w-5 h-5 mr-2 text-blue-600" />
                <div>
                  <div className="text-sm font-medium">CPU Usage</div>
                  <Progress value={systemOverview.averageResourceUsage.cpu} className="mt-1" />
                  <div className="text-xs text-gray-600 mt-1">
                    {systemOverview.averageResourceUsage.cpu.toFixed(1)}%
                  </div>
                </div>
              </div>
              <div className="flex items-center">
                <HardDrive className="w-5 h-5 mr-2 text-green-600" />
                <div>
                  <div className="text-sm font-medium">Memory Usage</div>
                  <Progress value={systemOverview.averageResourceUsage.memory} className="mt-1" />
                  <div className="text-xs text-gray-600 mt-1">
                    {systemOverview.averageResourceUsage.memory.toFixed(1)}%
                  </div>
                </div>
              </div>
              <div className="flex items-center">
                <Network className="w-5 h-5 mr-2 text-purple-600" />
                <div>
                  <div className="text-sm font-medium">Network Usage</div>
                  <Progress value={systemOverview.averageResourceUsage.network} className="mt-1" />
                  <div className="text-xs text-gray-600 mt-1">
                    {systemOverview.averageResourceUsage.network.toFixed(1)}%
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs for different views */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="agents">Agents</TabsTrigger>
          <TabsTrigger value="migration">Migration</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          {/* Migration Progress Summary */}
          {migrationProgress && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Database className="w-5 h-5 mr-2" />
                  Migration Progress Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium">Overall Progress</span>
                      <span className="text-sm text-gray-600">
                        {migrationProgress.overallProgress.toFixed(1)}%
                      </span>
                    </div>
                    <Progress value={migrationProgress.overallProgress} className="h-3" />
                  </div>

                  {migrationProgress.estimatedCompletion && (
                    <div className="text-sm text-gray-600">
                      Estimated Completion:{' '}
                      {migrationProgress.estimatedCompletion.toLocaleTimeString()}
                    </div>
                  )}

                  {migrationProgress.blockers.length > 0 && (
                    <div className="mt-4 p-3 bg-yellow-50 rounded">
                      <div className="flex items-center text-yellow-700">
                        <AlertTriangle className="w-4 h-4 mr-2" />
                        <span className="font-medium">Blockers Detected</span>
                      </div>
                      <ul className="mt-2 text-sm text-yellow-600 list-disc list-inside">
                        {migrationProgress.blockers.map((blocker: string, index: number) => (
                          <li key={index}>{blocker}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="agents">
          {/* Agent Activities Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {agents.map((agent) => (
              <Card
                key={agent.agentId}
                className={`cursor-pointer transition-all ${
                  selectedAgent === agent.agentId ? 'ring-2 ring-blue-500' : ''
                }`}
                onClick={() =>
                  setSelectedAgent(selectedAgent === agent.agentId ? null : agent.agentId)
                }
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center text-white ${getAgentTypeColor(agent.agentType)}`}
                      >
                        {agent.agentType.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-medium">{formatAgentType(agent.agentType)}</h3>
                        <p className="text-xs text-gray-600">{agent.agentId}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(agent.status)}
                      <Badge variant={agent.status === 'active' ? 'default' : 'secondary'}>
                        {agent.status}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {agent.currentTask ? (
                    <div className="space-y-3">
                      <div>
                        <div className="font-medium text-sm">{agent.currentTask.name}</div>
                        <div className="text-xs text-gray-600">{agent.currentTask.description}</div>
                      </div>
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-xs text-gray-600">Progress</span>
                          <span className="text-xs font-medium">{agent.currentTask.progress}%</span>
                        </div>
                        <Progress value={agent.currentTask.progress} className="h-2" />
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-gray-600">Tasks Completed:</span>
                          <span className="ml-1 font-medium">{agent.metrics.tasksCompleted}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Tasks Failed:</span>
                          <span className="ml-1 font-medium text-red-600">
                            {agent.metrics.tasksFailed}
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-gray-600">No active task</div>
                  )}

                  {/* Resource Usage */}
                  <div className="mt-4 pt-4 border-t">
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="text-center">
                        <Cpu className="w-4 h-4 mx-auto mb-1 text-blue-600" />
                        <div>{agent.metrics.resourceUsage.cpu.toFixed(1)}%</div>
                      </div>
                      <div className="text-center">
                        <HardDrive className="w-4 h-4 mx-auto mb-1 text-green-600" />
                        <div>{agent.metrics.resourceUsage.memory.toFixed(1)}%</div>
                      </div>
                      <div className="text-center">
                        <Network className="w-4 h-4 mx-auto mb-1 text-purple-600" />
                        <div>{agent.metrics.resourceUsage.network.toFixed(1)}%</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="migration">
          <MigrationProgressMonitor />
        </TabsContent>

        <TabsContent value="timeline">
          <TimelineVisualization />
        </TabsContent>
      </Tabs>

      {/* Agent Coordination Monitor */}
      <AgentCoordinationMonitor />
    </div>
  )
}
