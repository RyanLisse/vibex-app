import ReactFlow, {
  addEdge,
  Background,
  type Connection,
  Controls,
  type Edge,
  type EdgeTypes,
  MiniMap,
  type Node,
  type NodeTypes,
  Panel,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
} from '@xyflow/react'
import type React from 'react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import '@xyflow/react/dist/style.css'

import { useAmbientAgentData } from '../../hooks/ambient-agents/use-ambient-agent-data'
import { useVisualizationState } from '../../hooks/ambient-agents/use-visualization-state'
import { applyLayoutAlgorithm } from '../../lib/ambient-agents/layout-algorithms'
import { VisualizationControls } from './controls/visualization-controls'
import { AnimatedEdge } from './edges/animated-edge'
import { DataFlowEdge } from './edges/data-flow-edge'
import { DependencyEdge } from './edges/dependency-edge'
import { PerformanceMonitor } from './monitors/performance-monitor'
import { AgentNode } from './nodes/agent-node'
import { EventNode } from './nodes/event-node'
import { MemoryNode } from './nodes/memory-node'
import { TaskNode } from './nodes/task-node'
import { AgentDetailPanel } from './panels/agent-detail-panel'

// Custom node types for different agent system components
const nodeTypes: NodeTypes = {
  agent: AgentNode,
  task: TaskNode,
  event: EventNode,
  memory: MemoryNode,
}

// Custom edge types for different connection types
const edgeTypes: EdgeTypes = {
  animated: AnimatedEdge,
  dataFlow: DataFlowEdge,
  dependency: DependencyEdge,
}

export interface VisualizationEngineProps {
  swarmId?: string
  viewMode?: 'agent-centric' | 'task-centric' | 'event-centric' | 'memory-centric'
  layoutAlgorithm?: 'hierarchical' | 'force-directed' | 'circular' | 'grid' | 'clustered'
  showPerformanceMetrics?: boolean
  enableCollaboration?: boolean
  className?: string
}

export const VisualizationEngine: React.FC<VisualizationEngineProps> = ({
  swarmId,
  viewMode: initialViewMode = 'agent-centric',
  layoutAlgorithm: initialLayoutAlgorithm = 'force-directed',
  showPerformanceMetrics = true,
  enableCollaboration = false,
  className = '',
}) => {
  // State management for React Flow
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [selectedNode, setSelectedNode] = useState<Node | null>(null)
  const [isDetailPanelOpen, setIsDetailPanelOpen] = useState(false)

  // Custom hooks for data and state management
  const {
    agentData,
    taskData,
    eventStream,
    memoryData,
    communications,
    isLoading,
    error,
    connectionStatus,
    refreshData,
  } = useAmbientAgentData(swarmId)

  const { visualizationState, updateLayout, applyFilters, toggleNodeVisibility, updateViewMode } =
    useVisualizationState({
      viewMode: initialViewMode,
      layoutAlgorithm: initialLayoutAlgorithm,
    })

  // Transform raw data into React Flow nodes and edges
  const { transformedNodes, transformedEdges } = useMemo(() => {
    if (!agentData || isLoading) {
      return { transformedNodes: [], transformedEdges: [] }
    }

    const nodes = transformDataToNodes(
      agentData,
      taskData,
      eventStream,
      memoryData,
      visualizationState.viewMode,
      visualizationState.filters
    )
    const edges = transformDataToEdges(
      agentData,
      taskData,
      eventStream,
      memoryData,
      communications,
      visualizationState.viewMode
    )

    return {
      transformedNodes: applyLayoutAlgorithm(nodes, edges, visualizationState.layoutAlgorithm),
      transformedEdges: edges,
    }
  }, [
    agentData,
    taskData,
    eventStream,
    memoryData,
    communications,
    visualizationState.viewMode,
    visualizationState.layoutAlgorithm,
    visualizationState.filters,
    isLoading,
  ])

  // Update React Flow state when data changes
  useEffect(() => {
    setNodes(transformedNodes)
    setEdges(transformedEdges)
  }, [transformedNodes, transformedEdges, setNodes, setEdges])

  // Handle node connections (for interactive editing)
  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  )

  // Handle node selection
  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    setSelectedNode(node)
    setIsDetailPanelOpen(true)
  }, [])

  // Handle layout changes
  const handleLayoutChange = useCallback(
    (newLayout: string) => {
      updateLayout(newLayout as any)
    },
    [updateLayout]
  )

  // Handle view mode changes
  const handleViewModeChange = useCallback(
    (newViewMode: string) => {
      updateViewMode(newViewMode as any)
    },
    [updateViewMode]
  )

  // Navigation controls
  const { zoomIn, zoomOut, fitView } = useReactFlow()

  const handleZoomIn = useCallback(() => {
    zoomIn({ duration: 300 })
  }, [zoomIn])

  const handleZoomOut = useCallback(() => {
    zoomOut({ duration: 300 })
  }, [zoomOut])

  const handleFitView = useCallback(() => {
    fitView({ duration: 500, padding: 0.1 })
  }, [fitView])

  const handleReset = useCallback(() => {
    refreshData()
    fitView({ duration: 500, padding: 0.1 })
  }, [refreshData, fitView])

  const handleExport = useCallback(() => {
    // TODO: Implement export functionality
    console.log('Export visualization')
  }, [])

  const handleShare = useCallback(() => {
    // TODO: Implement share functionality
    console.log('Share visualization')
  }, [])

  if (error) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="space-y-4 text-center">
          <div className="font-semibold text-lg text-red-500">Error loading ambient agent data</div>
          <div className="text-gray-600">{error.message}</div>
          <button
            className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
            onClick={refreshData}
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={`relative h-full w-full ${className}`}>
      {/* Connection status indicator */}
      <div className="absolute top-4 left-4 z-10">
        <div
          className={`rounded px-2 py-1 font-medium text-xs ${connectionStatus === 'Open' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'} `}
        >
          {connectionStatus === 'Open' ? '🟢 Connected' : '🔴 Disconnected'}
        </div>
      </div>

      <ReactFlow
        attributionPosition="bottom-left"
        className="ambient-agent-visualization"
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
        edges={edges}
        edgeTypes={edgeTypes}
        fitView
        maxZoom={2}
        minZoom={0.1}
        nodes={nodes}
        nodeTypes={nodeTypes}
        onConnect={onConnect}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onNodesChange={onNodesChange}
        snapGrid={[15, 15]}
        snapToGrid
      >
        {/* Background pattern */}
        <Background color="#aaa" gap={16} variant="dots" />

        {/* Navigation controls */}
        <Controls position="bottom-right" showFitView showInteractive showZoom />

        {/* Minimap for navigation */}
        <MiniMap
          nodeColor={(node) => getNodeColor(node)}
          nodeStrokeWidth={3}
          pannable
          position="bottom-left"
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            border: '1px solid #ccc',
          }}
          zoomable
        />

        {/* Control panels */}
        <Panel position="top-left">
          <VisualizationControls
            layoutAlgorithm={visualizationState.layoutAlgorithm}
            onExport={handleExport}
            onFilterChange={applyFilters}
            onFitView={handleFitView}
            onLayoutChange={handleLayoutChange}
            onReset={handleReset}
            onShare={handleShare}
            onViewModeChange={handleViewModeChange}
            onZoomIn={handleZoomIn}
            onZoomOut={handleZoomOut}
            viewMode={visualizationState.viewMode}
          />
        </Panel>

        {/* Performance monitor */}
        {showPerformanceMetrics && (
          <Panel position="top-right">
            <PerformanceMonitor />
          </Panel>
        )}

        {/* Loading indicator */}
        {isLoading && (
          <Panel position="bottom-center">
            <div className="rounded-md bg-white px-4 py-2 text-sm shadow-md">
              Loading ambient agent data...
            </div>
          </Panel>
        )}
      </ReactFlow>

      {/* Detail panel for selected nodes */}
      <AgentDetailPanel
        isOpen={isDetailPanelOpen}
        node={selectedNode}
        onClose={() => setIsDetailPanelOpen(false)}
      />

      {/* Custom styles */}
      <style global jsx>{`
        .ambient-agent-visualization {
          background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
        }
        
        .react-flow__node {
          border-radius: 8px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }
        
        .react-flow__edge.selected {
          stroke-width: 3;
        }
        
        .react-flow__node.selected {
          box-shadow: 0 0 0 2px #3b82f6;
        }
      `}</style>
    </div>
  )
}

// Helper functions for data transformation
function transformDataToNodes(
  agentData: any,
  taskData: any,
  eventStream: any,
  memoryData: any,
  viewMode: string,
  filters: any
): Node[] {
  const nodes: Node[] = []

  // Transform agents to nodes
  if (agentData) {
    agentData.forEach((agent: any, index: number) => {
      // Apply filters
      if (
        filters.searchTerm &&
        !agent.name.toLowerCase().includes(filters.searchTerm.toLowerCase())
      ) {
        return
      }
      if (!filters.showInactive && agent.status === 'idle') {
        return
      }
      if (filters.statusFilters.length > 0 && !filters.statusFilters.includes(agent.status)) {
        return
      }

      nodes.push({
        id: agent.id,
        type: 'agent',
        position: { x: index * 300, y: 100 },
        data: {
          agent,
          metrics: agent.metrics || {
            totalTasks: 0,
            completedTasks: 0,
            failedTasks: 0,
            averageResponseTime: 0,
            cpuUsage: 0,
            memoryUsage: 0,
          },
          currentTask: agent.currentTask,
        },
      })
    })
  }

  // Transform tasks to nodes (if in task-centric view)
  if (viewMode === 'task-centric' && taskData?.tasks) {
    taskData.tasks.forEach((task: any, index: number) => {
      nodes.push({
        id: task.id,
        type: 'task',
        position: { x: index * 250, y: 300 },
        data: {
          task: {
            ...task,
            priority: task.priority || 'medium',
          },
          metrics: task.metrics,
        },
      })
    })
  }

  // Transform events to nodes (if in event-centric view)
  if (viewMode === 'event-centric' && eventStream) {
    eventStream.slice(0, 10).forEach((event: any, index: number) => {
      nodes.push({
        id: event.id,
        type: 'event',
        position: { x: index * 200, y: 400 },
        data: {
          event: {
            ...event,
            severity: event.severity || 'info',
          },
          metrics: event.metrics,
        },
      })
    })
  }

  // Transform memory nodes (if in memory-centric view)
  if (viewMode === 'memory-centric' && memoryData?.namespaces) {
    memoryData.namespaces.forEach((namespace: any, index: number) => {
      nodes.push({
        id: namespace.id,
        type: 'memory',
        position: { x: index * 280, y: 200 },
        data: {
          memory: {
            ...namespace,
            type: namespace.type || 'shared',
          },
          metrics: namespace.metrics,
        },
      })
    })
  }

  return nodes
}

function transformDataToEdges(
  agentData: any,
  taskData: any,
  eventStream: any,
  memoryData: any,
  communications: any,
  viewMode: string
): Edge[] {
  const edges: Edge[] = []

  // Create edges based on agent communications
  if (communications) {
    communications.forEach((comm: any) => {
      edges.push({
        id: `comm-${comm.from}-${comm.to}`,
        source: comm.from,
        target: comm.to,
        type: 'dataFlow',
        data: {
          dataFlow: {
            type: 'bidirectional',
            volume: comm.volume || 0,
            bandwidth: comm.throughput || 0,
            latency: comm.latency || 0,
            isActive: comm.isActive,
            protocol: comm.protocol || 'http',
          },
        },
        animated: comm.isActive,
      })
    })
  }

  // Create edges for task dependencies
  if (taskData?.dependencies) {
    taskData.dependencies.forEach((dep: any) => {
      edges.push({
        id: `dep-${dep.from}-${dep.to}`,
        source: dep.from,
        target: dep.to,
        type: 'dependency',
        data: {
          dependency: {
            type: dep.type || 'task',
            status: dep.status || 'active',
            strength: dep.strength || 'medium',
            condition: dep.condition,
            isOptional: dep.isOptional,
          },
        },
      })
    })
  }

  // Create animated edges for active connections
  if (agentData) {
    agentData.forEach((agent: any) => {
      if (agent.connections) {
        agent.connections.forEach((connection: any) => {
          edges.push({
            id: `anim-${agent.id}-${connection.target}`,
            source: agent.id,
            target: connection.target,
            type: 'animated',
            data: {
              communication: {
                type: connection.type || 'data',
                throughput: connection.throughput || 0,
                latency: connection.latency || 0,
                isActive: connection.isActive,
              },
              animated: connection.isActive,
            },
            animated: connection.isActive,
          })
        })
      }
    })
  }

  return edges
}

function getNodeColor(node: Node): string {
  switch (node.type) {
    case 'agent': {
      const agentStatus = node.data?.agent?.status
      switch (agentStatus) {
        case 'busy':
          return '#10b981'
        case 'idle':
          return '#f59e0b'
        case 'error':
          return '#ef4444'
        case 'terminated':
          return '#6b7280'
        default:
          return '#3b82f6'
      }
    }
    case 'task': {
      const taskStatus = node.data?.task?.status
      switch (taskStatus) {
        case 'running':
          return '#3b82f6'
        case 'completed':
          return '#10b981'
        case 'failed':
          return '#ef4444'
        case 'pending':
          return '#f59e0b'
        default:
          return '#9ca3af'
      }
    }
    case 'memory':
      return '#8b5cf6'
    case 'event': {
      const eventSeverity = node.data?.event?.severity
      switch (eventSeverity) {
        case 'error':
          return '#ef4444'
        case 'warning':
          return '#f59e0b'
        case 'success':
          return '#10b981'
        default:
          return '#3b82f6'
      }
    }
    default:
      return '#6b7280'
  }
}

// Wrap with ReactFlowProvider
export const VisualizationEngineWithProvider: React.FC<VisualizationEngineProps> = (props) => (
  <ReactFlowProvider>
    <VisualizationEngine {...props} />
  </ReactFlowProvider>
)
