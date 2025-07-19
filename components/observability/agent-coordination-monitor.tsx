'use client'

/**
 * Agent Coordination Monitor Component
 * 
 * Real-time monitoring of parallel agent execution and coordination with
 * task distribution visualization, performance tracking, and status updates.
 */

import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { 
  Users, 
  Activity, 
  Zap, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  XCircle,
  Pause,
  Play,
  RefreshCw,
  Network,
  Cpu,
  MemoryStick,
  Database,
  TrendingUp,
  MessageSquare
} from 'lucide-react'
import { observability } from '@/lib/observability'

interface AgentTask {
  id: string
  name: string
  description: string
  status: 'pending' | 'assigned' | 'running' | 'completed' | 'failed'
  progress: number
  priority: 'low' | 'medium' | 'high' | 'critical'
  assignedAgent?: string
  startTime?: Date
  endTime?: Date
  duration?: number
  dependencies: string[]
  blockedBy: string[]
  error?: string
}

interface AgentInfo {
  id: string
  type: 'coordinator' | 'researcher' | 'coder' | 'analyst' | 'architect' | 'tester' | 'reviewer' | 'optimizer' | 'documenter' | 'monitor'
  name: string
  status: 'idle' | 'busy' | 'error' | 'offline'
  currentTask?: string
  tasksCompleted: number
  totalTasks: number
  performance: {
    averageTaskTime: number
    successRate: number
    cpuUsage: number
    memoryUsage: number
  }
  capabilities: string[]
  lastActivity: Date
}

interface CoordinationMetrics {
  totalAgents: number
  activeAgents: number
  totalTasks: number
  completedTasks: number
  failedTasks: number
  averageTaskTime: number
  systemLoad: number
  coordinationEfficiency: number
  throughput: number
}

interface AgentCoordinationMonitorProps {
  autoRefresh?: boolean
  refreshInterval?: number
  className?: string
}

export function AgentCoordinationMonitor({
  autoRefresh = true,
  refreshInterval = 3000,
  className = ''
}: AgentCoordinationMonitorProps) {
  const [agents, setAgents] = useState<AgentInfo[]>([])
  const [tasks, setTasks] = useState<AgentTask[]>([])
  const [metrics, setMetrics] = useState<CoordinationMetrics | null>(null)
  const [selectedAgent, setSelectedAgent] = useState<AgentInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isPaused, setIsPaused] = useState(false)
  const [showDetails, setShowDetails] = useState(false)

  // Fetch coordination status
  const fetchCoordinationStatus = useCallback(async () => {
    if (isPaused) return

    try {
      setError(null)
      
      // Simulate fetching agent coordination data
      const mockAgents: AgentInfo[] = [
        {
          id: 'agent_coordinator_001',
          type: 'coordinator',
          name: 'Master Coordinator',
          status: 'busy',
          currentTask: 'task_001',
          tasksCompleted: 12,
          totalTasks: 15,
          performance: {
            averageTaskTime: 45000,
            successRate: 95.8,
            cpuUsage: 23,
            memoryUsage: 156
          },
          capabilities: ['task_distribution', 'resource_management', 'conflict_resolution'],
          lastActivity: new Date()
        },
        {
          id: 'agent_researcher_001',
          type: 'researcher',
          name: 'Research Agent Alpha',
          status: 'busy',
          currentTask: 'task_002',
          tasksCompleted: 8,
          totalTasks: 10,
          performance: {
            averageTaskTime: 67000,
            successRate: 92.5,
            cpuUsage: 34,
            memoryUsage: 234
          },
          capabilities: ['web_search', 'data_analysis', 'documentation_review'],
          lastActivity: new Date(Date.now() - 5000)
        },
        {
          id: 'agent_coder_001',
          type: 'coder',
          name: 'Code Generator Beta',
          status: 'busy',
          currentTask: 'task_003',
          tasksCompleted: 15,
          totalTasks: 18,
          performance: {
            averageTaskTime: 89000,
            successRate: 97.2,
            cpuUsage: 45,
            memoryUsage: 312
          },
          capabilities: ['code_generation', 'file_operations', 'testing'],
          lastActivity: new Date(Date.now() - 2000)
        },
        {
          id: 'agent_analyst_001',
          type: 'analyst',
          name: 'System Analyzer',
          status: 'idle',
          tasksCompleted: 6,
          totalTasks: 6,
          performance: {
            averageTaskTime: 76000,
            successRate: 88.9,
            cpuUsage: 12,
            memoryUsage: 98
          },
          capabilities: ['performance_analysis', 'error_detection', 'optimization'],
          lastActivity: new Date(Date.now() - 30000)
        },
        {
          id: 'agent_tester_001',
          type: 'tester',
          name: 'Quality Assurance',
          status: 'error',
          currentTask: 'task_004',
          tasksCompleted: 4,
          totalTasks: 7,
          performance: {
            averageTaskTime: 54000,
            successRate: 71.4,
            cpuUsage: 8,
            memoryUsage: 67
          },
          capabilities: ['test_execution', 'validation', 'quality_checks'],
          lastActivity: new Date(Date.now() - 10000)
        }
      ]

      const mockTasks: AgentTask[] = [
        {
          id: 'task_001',
          name: 'Architecture Analysis',
          description: 'Analyze current system architecture and identify optimization opportunities',
          status: 'running',
          progress: 65,
          priority: 'high',
          assignedAgent: 'agent_coordinator_001',
          startTime: new Date(Date.now() - 120000),
          dependencies: [],
          blockedBy: []
        },
        {
          id: 'task_002',
          name: 'Research Integration',
          description: 'Research best practices for system integration',
          status: 'running',
          progress: 85,
          priority: 'medium',
          assignedAgent: 'agent_researcher_001',
          startTime: new Date(Date.now() - 180000),
          dependencies: [],
          blockedBy: []
        },
        {
          id: 'task_003',
          name: 'Component Implementation',
          description: 'Implement new observability components',
          status: 'running',
          progress: 42,
          priority: 'high',
          assignedAgent: 'agent_coder_001',
          startTime: new Date(Date.now() - 95000),
          dependencies: ['task_001'],
          blockedBy: []
        },
        {
          id: 'task_004',
          name: 'Integration Testing',
          description: 'Test integration of new components',
          status: 'failed',
          progress: 30,
          priority: 'critical',
          assignedAgent: 'agent_tester_001',
          startTime: new Date(Date.now() - 60000),
          endTime: new Date(Date.now() - 10000),
          duration: 50000,
          dependencies: ['task_003'],
          blockedBy: [],
          error: 'Test environment initialization failed'
        },
        {
          id: 'task_005',
          name: 'Performance Optimization',
          description: 'Optimize system performance based on analysis',
          status: 'pending',
          progress: 0,
          priority: 'medium',
          dependencies: ['task_001', 'task_002'],
          blockedBy: []
        }
      ]

      const mockMetrics: CoordinationMetrics = {
        totalAgents: mockAgents.length,
        activeAgents: mockAgents.filter(a => a.status === 'busy').length,
        totalTasks: mockTasks.length,
        completedTasks: mockTasks.filter(t => t.status === 'completed').length,
        failedTasks: mockTasks.filter(t => t.status === 'failed').length,
        averageTaskTime: 67000,
        systemLoad: 34,
        coordinationEfficiency: 87.5,
        throughput: 2.3
      }

      setAgents(mockAgents)
      setTasks(mockTasks)
      setMetrics(mockMetrics)

      if (!selectedAgent && mockAgents.length > 0) {
        setSelectedAgent(mockAgents[0])
      }

      // Record observability event
      await observability.recordEvent('agent_coordination_status_fetched', {
        agentCount: mockAgents.length,
        activeAgents: mockMetrics.activeAgents,
        systemLoad: mockMetrics.systemLoad
      })
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch coordination status')
      console.error('Failed to fetch coordination status:', err)
    } finally {
      setLoading(false)
    }
  }, [selectedAgent, isPaused])

  // Auto refresh effect
  useEffect(() => {
    fetchCoordinationStatus()
    
    if (autoRefresh && !isPaused) {
      const interval = setInterval(fetchCoordinationStatus, refreshInterval)
      return () => clearInterval(interval)
    }
  }, [fetchCoordinationStatus, autoRefresh, refreshInterval, isPaused])

  // Get agent status icon
  const getAgentStatusIcon = useCallback((status: string) => {
    switch (status) {
      case 'busy':
        return <Activity className="w-4 h-4 text-blue-600 animate-pulse" />
      case 'idle':
        return <Pause className="w-4 h-4 text-gray-400" />
      case 'error':
        return <XCircle className="w-4 h-4 text-red-600" />
      case 'offline':
        return <XCircle className="w-4 h-4 text-gray-600" />
      default:
        return <Clock className="w-4 h-4 text-gray-400" />
    }
  }, [])

  // Get task status color
  const getTaskStatusColor = useCallback((status: string) => {
    switch (status) {
      case 'running':
        return 'bg-blue-500'
      case 'completed':
        return 'bg-green-500'
      case 'failed':
        return 'bg-red-500'
      case 'assigned':
        return 'bg-yellow-500'
      default:
        return 'bg-gray-400'
    }
  }, [])

  // Get priority color
  const getPriorityColor = useCallback((priority: string) => {
    switch (priority) {
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
  }, [])

  // Format duration
  const formatDuration = useCallback((milliseconds: number): string => {
    const seconds = Math.floor(milliseconds / 1000)
    const minutes = Math.floor(seconds / 60)
    
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`
    } else {
      return `${seconds}s`
    }
  }, [])

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Activity className="w-5 h-5 animate-spin mr-2" />
            Loading agent coordination status...
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="flex items-center text-red-600">
            <AlertTriangle className="w-5 h-5 mr-2" />
            {error}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Coordination Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center">
              <Users className="w-5 h-5 mr-2" />
              Agent Coordination Monitor
            </CardTitle>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsPaused(!isPaused)}
              >
                {isPaused ? (
                  <Play className="w-4 h-4" />
                ) : (
                  <Pause className="w-4 h-4" />
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchCoordinationStatus}
                disabled={loading}
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDetails(!showDetails)}
              >
                <TrendingUp className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          {metrics && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{metrics.activeAgents}</div>
                <div className="text-sm text-gray-600">Active Agents</div>
                <div className="text-xs text-gray-500">of {metrics.totalAgents}</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{metrics.completedTasks}</div>
                <div className="text-sm text-gray-600">Completed Tasks</div>
                <div className="text-xs text-gray-500">of {metrics.totalTasks}</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{metrics.coordinationEfficiency}%</div>
                <div className="text-sm text-gray-600">Efficiency</div>
                <div className="text-xs text-gray-500">coordination</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{metrics.throughput}</div>
                <div className="text-sm text-gray-600">Throughput</div>
                <div className="text-xs text-gray-500">tasks/min</div>
              </div>
            </div>
          )}

          {/* System Load Indicator */}
          {metrics && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">System Load</span>
                <span className="text-sm text-gray-600">{metrics.systemLoad}%</span>
              </div>
              <Progress value={metrics.systemLoad} className="w-full" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Agent Status Grid */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Network className="w-5 h-5 mr-2" />
            Agent Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {agents.map(agent => (
              <div
                key={agent.id}
                className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                  selectedAgent?.id === agent.id 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setSelectedAgent(agent)}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    {getAgentStatusIcon(agent.status)}
                    <div>
                      <h3 className="font-medium">{agent.name}</h3>
                      <p className="text-sm text-gray-600">{agent.type}</p>
                    </div>
                  </div>
                  <Badge variant={agent.status === 'busy' ? 'default' : 'secondary'}>
                    {agent.status}
                  </Badge>
                </div>

                {agent.currentTask && (
                  <div className="mb-3">
                    <div className="text-sm text-gray-600">Current Task:</div>
                    <div className="text-sm font-medium truncate">{agent.currentTask}</div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-gray-500">Tasks:</span>
                    <span className="ml-1">{agent.tasksCompleted}/{agent.totalTasks}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Success:</span>
                    <span className="ml-1">{agent.performance.successRate}%</span>
                  </div>
                  <div className="flex items-center">
                    <Cpu className="w-3 h-3 mr-1 text-gray-400" />
                    <span>{agent.performance.cpuUsage}%</span>
                  </div>
                  <div className="flex items-center">
                    <MemoryStick className="w-3 h-3 mr-1 text-gray-400" />
                    <span>{agent.performance.memoryUsage}MB</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Task Queue */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Database className="w-5 h-5 mr-2" />
            Task Queue
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {tasks.map(task => {
              const assignedAgent = agents.find(a => a.id === task.assignedAgent)
              return (
                <div key={task.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className={`w-3 h-3 rounded-full ${getTaskStatusColor(task.status)}`} />
                      <div>
                        <h4 className="font-medium">{task.name}</h4>
                        <p className="text-sm text-gray-600">{task.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge className={getPriorityColor(task.priority)}>
                        {task.priority}
                      </Badge>
                      <Badge variant="outline">
                        {task.status}
                      </Badge>
                    </div>
                  </div>

                  {task.status !== 'pending' && (
                    <div className="mb-3">
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span>Progress</span>
                        <span>{task.progress}%</span>
                      </div>
                      <Progress value={task.progress} className="w-full" />
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    {assignedAgent && (
                      <div>
                        <span className="text-gray-600">Assigned to:</span>
                        <span className="ml-1">{assignedAgent.name}</span>
                      </div>
                    )}
                    {task.startTime && (
                      <div>
                        <span className="text-gray-600">Started:</span>
                        <span className="ml-1">{task.startTime.toLocaleTimeString()}</span>
                      </div>
                    )}
                    {task.dependencies.length > 0 && (
                      <div>
                        <span className="text-gray-600">Dependencies:</span>
                        <span className="ml-1">{task.dependencies.length}</span>
                      </div>
                    )}
                    {task.duration && (
                      <div>
                        <span className="text-gray-600">Duration:</span>
                        <span className="ml-1">{formatDuration(task.duration)}</span>
                      </div>
                    )}
                  </div>

                  {task.error && (
                    <div className="mt-3 p-2 bg-red-50 rounded text-red-700 text-sm">
                      <strong>Error:</strong> {task.error}
                    </div>
                  )}

                  {task.blockedBy.length > 0 && (
                    <div className="mt-3 p-2 bg-yellow-50 rounded text-yellow-700 text-sm">
                      <strong>Blocked by:</strong> {task.blockedBy.join(', ')}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Detailed Agent Info */}
      {showDetails && selectedAgent && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <MessageSquare className="w-5 h-5 mr-2" />
              Agent Details - {selectedAgent.name}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Agent Type</label>
                  <div className="text-lg">{selectedAgent.type}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Current Status</label>
                  <div className="flex items-center space-x-2">
                    {getAgentStatusIcon(selectedAgent.status)}
                    <span className="text-lg">{selectedAgent.status}</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-600">Capabilities</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {selectedAgent.capabilities.map(capability => (
                    <Badge key={capability} variant="secondary">
                      {capability}
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-600">Performance Metrics</label>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div>
                    <span className="text-gray-600">Average Task Time:</span>
                    <span className="ml-1 font-medium">{formatDuration(selectedAgent.performance.averageTaskTime)}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Success Rate:</span>
                    <span className="ml-1 font-medium">{selectedAgent.performance.successRate}%</span>
                  </div>
                  <div>
                    <span className="text-gray-600">CPU Usage:</span>
                    <span className="ml-1 font-medium">{selectedAgent.performance.cpuUsage}%</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Memory Usage:</span>
                    <span className="ml-1 font-medium">{selectedAgent.performance.memoryUsage}MB</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-600">Last Activity</label>
                <div className="text-lg">{selectedAgent.lastActivity.toLocaleString()}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}