/**
 * Agent Activity Tracker
 *
 * Monitors and tracks all agent activities across the system,
 * providing real-time insights and progress reporting.
 */

import { EventEmitter } from 'events'
import { snapshotManager } from '@/lib/time-travel/execution-snapshots'
import { observability } from './index'

// Agent types
export type AgentType =
  | 'frontend_developer'
  | 'backend_systems'
  | 'data_migration'
  | 'devops_engineer'
  | 'observability_engineer'
  | 'quality_assurance'
  | 'security_specialist'
  | 'performance_optimizer'

// Agent status
export type AgentStatus =
  | 'idle'
  | 'initializing'
  | 'active'
  | 'processing'
  | 'waiting'
  | 'error'
  | 'completed'

// Task status
export type TaskStatus = 'pending' | 'in_progress' | 'blocked' | 'completed' | 'failed'

// Agent activity interface
export interface AgentActivity {
  agentId: string
  agentType: AgentType
  status: AgentStatus
  currentTask?: {
    id: string
    name: string
    description: string
    status: TaskStatus
    progress: number
    startTime: Date
    estimatedCompletion?: Date
    blockers?: string[]
  }
  metrics: {
    tasksCompleted: number
    tasksFailed: number
    averageTaskTime: number
    resourceUsage: {
      cpu: number
      memory: number
      network: number
    }
  }
  lastActivity: Date
  errors: Array<{
    timestamp: Date
    message: string
    context?: any
  }>
}

// Agent coordination event
export interface CoordinationEvent {
  id: string
  timestamp: Date
  type:
    | 'task_assigned'
    | 'task_completed'
    | 'dependency_resolved'
    | 'collaboration_request'
    | 'status_update'
  sourceAgent: string
  targetAgent?: string
  data: any
}

// Agent activity tracker
export class AgentActivityTracker extends EventEmitter {
  private static instance: AgentActivityTracker
  private agents: Map<string, AgentActivity> = new Map()
  private coordinationEvents: CoordinationEvent[] = []
  private updateInterval: NodeJS.Timeout | null = null
  private readonly MAX_EVENTS = 1000

  private constructor() {
    super()
    this.initializeTracking()
  }

  static getInstance(): AgentActivityTracker {
    if (!AgentActivityTracker.instance) {
      AgentActivityTracker.instance = new AgentActivityTracker()
    }
    return AgentActivityTracker.instance
  }

  /**
   * Register a new agent
   */
  registerAgent(
    agentId: string,
    agentType: AgentType,
    initialStatus: AgentStatus = 'initializing'
  ): void {
    const activity: AgentActivity = {
      agentId,
      agentType,
      status: initialStatus,
      metrics: {
        tasksCompleted: 0,
        tasksFailed: 0,
        averageTaskTime: 0,
        resourceUsage: {
          cpu: 0,
          memory: 0,
          network: 0,
        },
      },
      lastActivity: new Date(),
      errors: [],
    }

    this.agents.set(agentId, activity)
    this.emit('agentRegistered', activity)

    // Record observability event
    observability.recordEvent('agent_registered', {
      agentId,
      agentType,
      status: initialStatus,
    })
  }

  /**
   * Update agent status
   */
  updateAgentStatus(agentId: string, status: AgentStatus, context?: any): void {
    const agent = this.agents.get(agentId)
    if (!agent) {
      console.warn(`Agent ${agentId} not found`)
      return
    }

    agent.status = status
    agent.lastActivity = new Date()

    this.emit('agentStatusChanged', { agentId, status, context })

    // Capture snapshot for significant status changes
    if (['active', 'error', 'completed'].includes(status)) {
      this.captureAgentSnapshot(agentId, 'status_change', { status, context })
    }
  }

  /**
   * Update agent task
   */
  updateAgentTask(
    agentId: string,
    task: {
      id: string
      name: string
      description: string
      status: TaskStatus
      progress: number
      estimatedCompletion?: Date
      blockers?: string[]
    }
  ): void {
    const agent = this.agents.get(agentId)
    if (!agent) {
      console.warn(`Agent ${agentId} not found`)
      return
    }

    if (!agent.currentTask || agent.currentTask.id !== task.id) {
      // New task
      task.startTime = new Date()
      agent.currentTask = task as any
    } else {
      // Update existing task
      Object.assign(agent.currentTask, task)
    }

    agent.lastActivity = new Date()

    this.emit('agentTaskUpdated', { agentId, task })

    // Track task completion
    if (task.status === 'completed') {
      agent.metrics.tasksCompleted++
      this.updateAverageTaskTime(agent)
    } else if (task.status === 'failed') {
      agent.metrics.tasksFailed++
    }
  }

  /**
   * Update agent resource usage
   */
  updateResourceUsage(
    agentId: string,
    resources: {
      cpu: number
      memory: number
      network: number
    }
  ): void {
    const agent = this.agents.get(agentId)
    if (!agent) return

    agent.metrics.resourceUsage = resources
    agent.lastActivity = new Date()

    this.emit('resourceUsageUpdated', { agentId, resources })
  }

  /**
   * Record agent error
   */
  recordAgentError(agentId: string, error: string, context?: any): void {
    const agent = this.agents.get(agentId)
    if (!agent) return

    const errorRecord = {
      timestamp: new Date(),
      message: error,
      context,
    }

    agent.errors.push(errorRecord)

    // Keep only last 50 errors
    if (agent.errors.length > 50) {
      agent.errors = agent.errors.slice(-50)
    }

    agent.lastActivity = new Date()

    this.emit('agentError', { agentId, error: errorRecord })

    // Capture error snapshot
    this.captureAgentSnapshot(agentId, 'error', errorRecord)
  }

  /**
   * Record coordination event
   */
  recordCoordinationEvent(
    type: CoordinationEvent['type'],
    sourceAgent: string,
    targetAgent?: string,
    data?: any
  ): void {
    const event: CoordinationEvent = {
      id: `coord_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      type,
      sourceAgent,
      targetAgent,
      data,
    }

    this.coordinationEvents.push(event)

    // Maintain event limit
    if (this.coordinationEvents.length > this.MAX_EVENTS) {
      this.coordinationEvents = this.coordinationEvents.slice(-this.MAX_EVENTS)
    }

    this.emit('coordinationEvent', event)

    // Update last activity for involved agents
    this.updateLastActivity(sourceAgent)
    if (targetAgent) {
      this.updateLastActivity(targetAgent)
    }
  }

  /**
   * Get all agent activities
   */
  getAllAgentActivities(): AgentActivity[] {
    return Array.from(this.agents.values())
  }

  /**
   * Get agent activity by ID
   */
  getAgentActivity(agentId: string): AgentActivity | null {
    return this.agents.get(agentId) || null
  }

  /**
   * Get agents by type
   */
  getAgentsByType(agentType: AgentType): AgentActivity[] {
    return Array.from(this.agents.values()).filter((agent) => agent.agentType === agentType)
  }

  /**
   * Get active agents
   */
  getActiveAgents(): AgentActivity[] {
    return Array.from(this.agents.values()).filter((agent) =>
      ['active', 'processing'].includes(agent.status)
    )
  }

  /**
   * Get agent coordination events
   */
  getCoordinationEvents(limit = 100): CoordinationEvent[] {
    return this.coordinationEvents.slice(-limit)
  }

  /**
   * Get system overview
   */
  getSystemOverview(): {
    totalAgents: number
    activeAgents: number
    completedTasks: number
    failedTasks: number
    averageResourceUsage: {
      cpu: number
      memory: number
      network: number
    }
    recentErrors: number
    coordinationEvents: number
  } {
    const agents = Array.from(this.agents.values())
    const activeAgents = agents.filter((a) => ['active', 'processing'].includes(a.status))

    const totalCpu = agents.reduce((sum, a) => sum + a.metrics.resourceUsage.cpu, 0)
    const totalMemory = agents.reduce((sum, a) => sum + a.metrics.resourceUsage.memory, 0)
    const totalNetwork = agents.reduce((sum, a) => sum + a.metrics.resourceUsage.network, 0)

    const recentErrors = agents.reduce((sum, a) => {
      const recentErrorCount = a.errors.filter(
        (e) => Date.now() - e.timestamp.getTime() < 3_600_000 // Last hour
      ).length
      return sum + recentErrorCount
    }, 0)

    return {
      totalAgents: agents.length,
      activeAgents: activeAgents.length,
      completedTasks: agents.reduce((sum, a) => sum + a.metrics.tasksCompleted, 0),
      failedTasks: agents.reduce((sum, a) => sum + a.metrics.tasksFailed, 0),
      averageResourceUsage: {
        cpu: agents.length > 0 ? totalCpu / agents.length : 0,
        memory: agents.length > 0 ? totalMemory / agents.length : 0,
        network: agents.length > 0 ? totalNetwork / agents.length : 0,
      },
      recentErrors,
      coordinationEvents: this.coordinationEvents.length,
    }
  }

  /**
   * Get migration progress across all agents
   */
  getMigrationProgress(): {
    overallProgress: number
    agentProgress: Array<{
      agentId: string
      agentType: AgentType
      taskName: string
      progress: number
      status: TaskStatus
    }>
    blockers: string[]
    estimatedCompletion?: Date
  } {
    const migrationAgents = Array.from(this.agents.values()).filter(
      (agent) => agent.currentTask && agent.currentTask.name.toLowerCase().includes('migration')
    )

    const agentProgress = migrationAgents.map((agent) => ({
      agentId: agent.agentId,
      agentType: agent.agentType,
      taskName: agent.currentTask!.name,
      progress: agent.currentTask!.progress,
      status: agent.currentTask!.status,
    }))

    const totalProgress = agentProgress.reduce((sum, a) => sum + a.progress, 0)
    const overallProgress = agentProgress.length > 0 ? totalProgress / agentProgress.length : 0

    const blockers = migrationAgents
      .filter((a) => a.currentTask?.blockers && a.currentTask.blockers.length > 0)
      .flatMap((a) => a.currentTask!.blockers!)

    const latestEstimation = migrationAgents
      .filter((a) => a.currentTask?.estimatedCompletion)
      .map((a) => a.currentTask!.estimatedCompletion!)
      .sort((a, b) => b.getTime() - a.getTime())[0]

    return {
      overallProgress,
      agentProgress,
      blockers: [...new Set(blockers)], // Unique blockers
      estimatedCompletion: latestEstimation,
    }
  }

  /**
   * Initialize tracking
   */
  private initializeTracking(): void {
    // Start periodic status updates
    this.updateInterval = setInterval(() => {
      this.checkAgentHealth()
    }, 30_000) // Every 30 seconds
  }

  /**
   * Check agent health
   */
  private checkAgentHealth(): void {
    const now = Date.now()
    const staleThreshold = 5 * 60 * 1000 // 5 minutes

    for (const [agentId, agent] of this.agents) {
      const timeSinceLastActivity = now - agent.lastActivity.getTime()

      if (timeSinceLastActivity > staleThreshold && agent.status === 'active') {
        this.updateAgentStatus(agentId, 'waiting', {
          reason: 'No activity detected',
        })
        this.emit('agentStale', { agentId, lastActivity: agent.lastActivity })
      }
    }
  }

  /**
   * Update average task time
   */
  private updateAverageTaskTime(agent: AgentActivity): void {
    if (!(agent.currentTask && agent.currentTask.startTime)) return

    const taskDuration = Date.now() - agent.currentTask.startTime.getTime()
    const totalTasks = agent.metrics.tasksCompleted + agent.metrics.tasksFailed

    agent.metrics.averageTaskTime =
      (agent.metrics.averageTaskTime * (totalTasks - 1) + taskDuration) / totalTasks
  }

  /**
   * Update last activity
   */
  private updateLastActivity(agentId: string): void {
    const agent = this.agents.get(agentId)
    if (agent) {
      agent.lastActivity = new Date()
    }
  }

  /**
   * Capture agent snapshot
   */
  private async captureAgentSnapshot(agentId: string, reason: string, context: any): Promise<void> {
    const agent = this.agents.get(agentId)
    if (!agent) return

    try {
      await snapshotManager.captureSnapshot(
        `agent_${agentId}`,
        'checkpoint',
        0,
        {
          agentId,
          sessionId: `session_${agentId}`,
          currentStep: 0,
          memory: {
            shortTerm: {},
            longTerm: {},
            context: { agent },
            variables: {},
          },
          context: {
            environment: {},
            tools: [],
            permissions: [],
            constraints: {},
          },
          outputs: {
            messages: [],
            artifacts: [],
            sideEffects: [],
            metrics: agent.metrics,
          },
          performance: {
            memoryUsage: agent.metrics.resourceUsage.memory,
            cpuTime: agent.metrics.resourceUsage.cpu,
            networkCalls: agent.metrics.resourceUsage.network,
            databaseQueries: 0,
            wasmOperations: 0,
          },
        },
        `Agent snapshot: ${reason}`,
        ['agent', agentId, reason]
      )
    } catch (error) {
      console.error(`Failed to capture agent snapshot for ${agentId}:`, error)
    }
  }

  /**
   * Stop tracking
   */
  stopTracking(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval)
      this.updateInterval = null
    }
  }
}

// Export singleton instance
export const agentActivityTracker = AgentActivityTracker.getInstance()
