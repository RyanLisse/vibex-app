// Main visualization engine
export { VisualizationEngine, VisualizationEngineWithProvider } from './visualization-engine'
export type { VisualizationEngineProps } from './visualization-engine'

// Node components
export { AgentNode } from './nodes/agent-node'
export { TaskNode } from './nodes/task-node'
export { EventNode } from './nodes/event-node'
export { MemoryNode } from './nodes/memory-node'
export type { AgentNodeData } from './nodes/agent-node'
export type { TaskNodeData } from './nodes/task-node'
export type { EventNodeData } from './nodes/event-node'
export type { MemoryNodeData } from './nodes/memory-node'

// Edge components
export { AnimatedEdge } from './edges/animated-edge'
export { DataFlowEdge } from './edges/data-flow-edge'
export { DependencyEdge } from './edges/dependency-edge'
export type { AnimatedEdgeData } from './edges/animated-edge'
export type { DataFlowEdgeData } from './edges/data-flow-edge'
export type { DependencyEdgeData } from './edges/dependency-edge'

// Control components
export { VisualizationControls } from './controls/visualization-controls'
export type { VisualizationControlsProps } from './controls/visualization-controls'

// Panel components
export { AgentDetailPanel } from './panels/agent-detail-panel'
export type { AgentDetailPanelProps } from './panels/agent-detail-panel'

// Monitor components
export { PerformanceMonitor } from './monitors/performance-monitor'
export type { PerformanceMetrics, PerformanceMonitorProps } from './monitors/performance-monitor'

// Hooks
export { useAmbientAgentData } from '../../hooks/ambient-agents/use-ambient-agent-data'
export { useVisualizationState } from '../../hooks/ambient-agents/use-visualization-state'
export { useWebSocket } from '../../hooks/ambient-agents/use-websocket'
export type { 
  AmbientAgentData, 
  Agent, 
  Task, 
  Event, 
  Communication, 
  Dependency, 
  MemoryNamespace 
} from '../../hooks/ambient-agents/use-ambient-agent-data'
export type { VisualizationState } from '../../hooks/ambient-agents/use-visualization-state'
export type { UseWebSocketOptions, UseWebSocketReturn } from '../../hooks/ambient-agents/use-websocket'

// Utilities
export { applyLayoutAlgorithm, layoutAlgorithms } from '../../lib/ambient-agents/layout-algorithms'
export type { LayoutOptions } from '../../lib/ambient-agents/layout-algorithms'