import { NextRequest } from 'next/server'

// Server-Sent Events implementation for real-time updates
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const swarmId = searchParams.get('swarmId')

  // Create a readable stream for SSE
  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection message
      const initialMessage = {
        type: 'connected',
        swarmId,
        timestamp: new Date().toISOString(),
        message: 'Connected to ambient agent event stream'
      }
      controller.enqueue(`data: ${JSON.stringify(initialMessage)}\n\n`)

      // Simulate real-time updates
      const sendUpdate = (type: string, data: any) => {
        const update = {
          type,
          timestamp: new Date().toISOString(),
          swarmId,
          ...data
        }
        controller.enqueue(`data: ${JSON.stringify(update)}\n\n`)
      }

      // Agent status updates
      const agentStatusInterval = setInterval(() => {
        const agents = ['agent-1', 'agent-2', 'agent-3', 'agent-4']
        const statuses = ['idle', 'busy', 'error']
        const randomAgent = agents[Math.floor(Math.random() * agents.length)]
        const randomStatus = statuses[Math.floor(Math.random() * statuses.length)]
        
        sendUpdate('agent.status.changed', {
          agentId: randomAgent,
          status: randomStatus,
          metrics: {
            cpuUsage: Math.floor(Math.random() * 100),
            memoryUsage: Math.floor(Math.random() * 100),
            averageResponseTime: Math.floor(Math.random() * 3000),
          }
        })
      }, 8000)

      // Task progress updates
      const taskProgressInterval = setInterval(() => {
        const tasks = ['task-1', 'task-2', 'task-3']
        const randomTask = tasks[Math.floor(Math.random() * tasks.length)]
        const progress = Math.floor(Math.random() * 100)
        
        sendUpdate('task.progress.updated', {
          taskId: randomTask,
          progress,
          status: progress === 100 ? 'completed' : 'running'
        })
      }, 12000)

      // Communication updates
      const communicationInterval = setInterval(() => {
        const connections = [
          { from: 'agent-1', to: 'agent-2' },
          { from: 'agent-2', to: 'agent-3' },
          { from: 'agent-1', to: 'agent-3' },
        ]
        const randomConnection = connections[Math.floor(Math.random() * connections.length)]
        
        sendUpdate('communication.updated', {
          from: randomConnection.from,
          to: randomConnection.to,
          throughput: Math.floor(Math.random() * 500),
          latency: Math.floor(Math.random() * 100),
          isActive: Math.random() > 0.3
        })
      }, 6000)

      // Event stream updates
      const eventStreamInterval = setInterval(() => {
        const eventTypes = [
          'agent.created',
          'agent.status.changed', 
          'task.started',
          'task.completed',
          'memory.updated',
          'communication.established'
        ]
        const severities = ['info', 'warning', 'error', 'success']
        const sources = ['agent-1', 'agent-2', 'agent-3', 'agent-4', 'system']
        
        const randomEventType = eventTypes[Math.floor(Math.random() * eventTypes.length)]
        const randomSeverity = severities[Math.floor(Math.random() * severities.length)]
        const randomSource = sources[Math.floor(Math.random() * sources.length)]
        
        const event = {
          id: `event-${Date.now()}`,
          type: randomEventType,
          severity: randomSeverity,
          source: randomSource,
          data: {
            message: `Random event from ${randomSource}`,
            details: `Event of type ${randomEventType}`
          },
          metrics: {
            frequency: Math.floor(Math.random() * 50),
            relatedEvents: Math.floor(Math.random() * 10)
          }
        }
        
        sendUpdate('event', { event })
      }, 10000)

      // Memory usage updates
      const memoryUpdateInterval = setInterval(() => {
        const memoryNodes = ['memory-1', 'memory-2', 'memory-3']
        const randomMemory = memoryNodes[Math.floor(Math.random() * memoryNodes.length)]
        
        sendUpdate('memory.updated', {
          memoryId: randomMemory,
          usage: {
            percentage: Math.floor(Math.random() * 100),
            used: Math.floor(Math.random() * 1024 * 1024 * 1024),
          },
          metrics: {
            readOps: Math.floor(Math.random() * 200),
            writeOps: Math.floor(Math.random() * 50),
            averageLatency: Math.floor(Math.random() * 50),
          }
        })
      }, 15000)

      // Performance metrics updates
      const performanceInterval = setInterval(() => {
        sendUpdate('performance.updated', {
          cpu: Math.floor(Math.random() * 100),
          memory: Math.floor(Math.random() * 100),
          network: {
            throughput: Math.floor(Math.random() * 1000),
            latency: Math.floor(Math.random() * 200),
          },
          rendering: {
            fps: Math.floor(Math.random() * 30) + 30,
            nodeCount: Math.floor(Math.random() * 20) + 10,
            edgeCount: Math.floor(Math.random() * 30) + 15,
            renderTime: Math.floor(Math.random() * 10) + 5,
          }
        })
      }, 5000)

      // Send periodic heartbeat
      const heartbeatInterval = setInterval(() => {
        sendUpdate('heartbeat', {
          message: 'Connection alive',
          clientCount: Math.floor(Math.random() * 10) + 1
        })
      }, 30000)

      // Cleanup on client disconnect
      request.signal.addEventListener('abort', () => {
        clearInterval(agentStatusInterval)
        clearInterval(taskProgressInterval)
        clearInterval(communicationInterval)
        clearInterval(eventStreamInterval)
        clearInterval(memoryUpdateInterval)
        clearInterval(performanceInterval)
        clearInterval(heartbeatInterval)
        controller.close()
      })
    }
  })

  // Return SSE response
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control',
    },
  })
}