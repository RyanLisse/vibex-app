import { type NextRequest, NextResponse } from 'next/server'

// Sample data for demonstration - in production, this would come from your database/services
const generateSampleData = (swarmId?: string) => {
  const agents = [
    {
      id: 'agent-1',
      name: 'Code Generator',
      type: 'coder',
      provider: 'claude',
      status: 'busy',
      capabilities: ['TypeScript', 'React', 'Node.js', 'Database'],
      metrics: {
        totalTasks: 45,
        completedTasks: 42,
        failedTasks: 3,
        averageResponseTime: 1250,
        cpuUsage: 75,
        memoryUsage: 60,
      },
      currentTask: {
        id: 'task-1',
        name: 'Implement user authentication system',
        progress: 65,
        estimatedCompletion: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes from now
      },
      connections: [
        {
          target: 'agent-2',
          type: 'data',
          throughput: 120,
          latency: 45,
          isActive: true,
        },
      ],
    },
    {
      id: 'agent-2',
      name: 'Code Reviewer',
      type: 'reviewer',
      provider: 'openai',
      status: 'idle',
      capabilities: ['Code Review', 'Security Analysis', 'Performance Optimization'],
      metrics: {
        totalTasks: 28,
        completedTasks: 26,
        failedTasks: 2,
        averageResponseTime: 890,
        cpuUsage: 25,
        memoryUsage: 30,
      },
    },
    {
      id: 'agent-3',
      name: 'Test Engineer',
      type: 'tester',
      provider: 'gemini',
      status: 'busy',
      capabilities: ['Unit Testing', 'Integration Testing', 'E2E Testing'],
      metrics: {
        totalTasks: 32,
        completedTasks: 30,
        failedTasks: 2,
        averageResponseTime: 2100,
        cpuUsage: 80,
        memoryUsage: 55,
      },
      currentTask: {
        id: 'task-2',
        name: 'Write integration tests for API',
        progress: 40,
        estimatedCompletion: new Date(Date.now() + 45 * 60 * 1000),
      },
    },
    {
      id: 'agent-4',
      name: 'Research Assistant',
      type: 'researcher',
      provider: 'claude',
      status: 'error',
      capabilities: ['Documentation', 'API Research', 'Best Practices'],
      metrics: {
        totalTasks: 15,
        completedTasks: 12,
        failedTasks: 3,
        averageResponseTime: 3200,
        cpuUsage: 5,
        memoryUsage: 15,
      },
    },
  ]

  const tasks = [
    {
      id: 'task-1',
      name: 'Implement user authentication system',
      status: 'running',
      dependencies: [],
      assignedAgent: 'agent-1',
      progress: 65,
      startTime: new Date(Date.now() - 2 * 60 * 60 * 1000),
      priority: 'high',
      estimatedDuration: 3 * 60 * 60 * 1000,
      metrics: {
        executionTime: 2 * 60 * 60 * 1000,
        retryCount: 0,
        resourceUsage: 75,
      },
    },
    {
      id: 'task-2',
      name: 'Write integration tests for API',
      status: 'running',
      dependencies: ['task-1'],
      assignedAgent: 'agent-3',
      progress: 40,
      startTime: new Date(Date.now() - 1 * 60 * 60 * 1000),
      priority: 'medium',
      estimatedDuration: 2 * 60 * 60 * 1000,
      metrics: {
        executionTime: 1 * 60 * 60 * 1000,
        retryCount: 1,
        resourceUsage: 60,
      },
    },
    {
      id: 'task-3',
      name: 'Code review for authentication module',
      status: 'pending',
      dependencies: ['task-1'],
      assignedAgent: 'agent-2',
      progress: 0,
      priority: 'high',
      estimatedDuration: 1 * 60 * 60 * 1000,
    },
    {
      id: 'task-4',
      name: 'Research security best practices',
      status: 'failed',
      dependencies: [],
      assignedAgent: 'agent-4',
      progress: 0,
      priority: 'low',
      estimatedDuration: 30 * 60 * 1000,
      metrics: {
        executionTime: 15 * 60 * 1000,
        retryCount: 2,
        resourceUsage: 20,
      },
    },
  ]

  const events = [
    {
      id: 'event-1',
      type: 'agent.status.changed',
      timestamp: new Date(),
      source: 'agent-1',
      severity: 'info',
      data: { oldStatus: 'idle', newStatus: 'busy', taskId: 'task-1' },
      metrics: { frequency: 15, lastOccurrence: new Date(), relatedEvents: 3 },
    },
    {
      id: 'event-2',
      type: 'task.started',
      timestamp: new Date(Date.now() - 5 * 60 * 1000),
      source: 'task-1',
      target: 'agent-1',
      severity: 'success',
      data: { taskName: 'Implement user authentication system' },
      metrics: {
        frequency: 8,
        lastOccurrence: new Date(Date.now() - 5 * 60 * 1000),
        relatedEvents: 2,
      },
    },
    {
      id: 'event-3',
      type: 'system.error',
      timestamp: new Date(Date.now() - 10 * 60 * 1000),
      source: 'agent-4',
      severity: 'error',
      data: { error: 'Rate limit exceeded', code: 429 },
      metrics: {
        frequency: 2,
        lastOccurrence: new Date(Date.now() - 10 * 60 * 1000),
        relatedEvents: 1,
      },
    },
  ]

  const memory = [
    {
      id: 'memory-1',
      name: 'Shared Knowledge Base',
      type: 'shared',
      usage: { used: 750 * 1024 * 1024, total: 1024 * 1024 * 1024, percentage: 73.2 },
      connections: ['agent-1', 'agent-2', 'agent-3'],
      lastAccessed: new Date(Date.now() - 2 * 60 * 1000),
      accessCount: 156,
      metrics: { readOps: 89, writeOps: 12, averageLatency: 15, hitRate: 94.5 },
    },
    {
      id: 'memory-2',
      name: 'Code Cache',
      type: 'cache',
      usage: { used: 256 * 1024 * 1024, total: 512 * 1024 * 1024, percentage: 50.0 },
      connections: ['agent-1'],
      lastAccessed: new Date(Date.now() - 30 * 1000),
      accessCount: 234,
      metrics: { readOps: 180, writeOps: 54, averageLatency: 8, hitRate: 87.2 },
    },
    {
      id: 'memory-3',
      name: 'Agent State Storage',
      type: 'persistent',
      usage: { used: 128 * 1024 * 1024, total: 256 * 1024 * 1024, percentage: 50.0 },
      connections: ['agent-1', 'agent-2', 'agent-3', 'agent-4'],
      lastAccessed: new Date(Date.now() - 1 * 60 * 1000),
      accessCount: 67,
      metrics: { readOps: 45, writeOps: 22, averageLatency: 25 },
    },
  ]

  const communications = [
    {
      from: 'agent-1',
      to: 'agent-2',
      type: 'data',
      volume: 1024 * 512,
      throughput: 120,
      latency: 45,
      isActive: true,
      protocol: 'http',
    },
    {
      from: 'agent-1',
      to: 'agent-3',
      type: 'command',
      volume: 1024 * 256,
      throughput: 80,
      latency: 30,
      isActive: false,
      protocol: 'websocket',
    },
    {
      from: 'agent-2',
      to: 'agent-3',
      type: 'event',
      volume: 1024 * 128,
      throughput: 200,
      latency: 20,
      isActive: true,
      protocol: 'grpc',
    },
  ]

  const dependencies = [
    { from: 'task-1', to: 'task-3', type: 'task', status: 'active', strength: 'strong' },
    { from: 'task-1', to: 'task-2', type: 'task', status: 'active', strength: 'medium' },
    { from: 'memory-1', to: 'agent-1', type: 'resource', status: 'active', strength: 'critical' },
    { from: 'memory-2', to: 'agent-1', type: 'resource', status: 'active', strength: 'medium' },
  ]

  return {
    agents,
    tasks,
    events,
    memory,
    communications,
    dependencies,
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const swarmId = searchParams.get('swarmId')

    // Add a small delay to simulate real API behavior
    await new Promise((resolve) => setTimeout(resolve, 100))

    const data = generateSampleData(swarmId || undefined)

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
      },
    })
  } catch (error) {
    console.error('Error fetching ambient agent data:', error)
    return NextResponse.json({ error: 'Failed to fetch ambient agent data' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Handle different types of updates
    switch (body.type) {
      case 'agent.update':
        // Update agent status or configuration
        console.log('Updating agent:', body.agentId, body.data)
        break

      case 'task.create':
        // Create a new task
        console.log('Creating task:', body.data)
        break

      case 'swarm.configure':
        // Configure swarm settings
        console.log('Configuring swarm:', body.swarmId, body.data)
        break

      default:
        return NextResponse.json({ error: 'Unknown update type' }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating ambient agent data:', error)
    return NextResponse.json({ error: 'Failed to update ambient agent data' }, { status: 500 })
  }
}
