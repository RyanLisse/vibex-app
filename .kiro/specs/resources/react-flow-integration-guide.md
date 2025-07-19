# React Flow Integration Guide

## Overview

This guide provides step-by-step instructions for integrating React Flow into the CodeClone application to create powerful ambient agents visualization capabilities.

## 🛠️ Prerequisites

- Node.js 18+ and Bun runtime
- Existing CodeClone project setup
- Understanding of React, TypeScript, and Zustand

## 📦 Installation

### 1. Install Dependencies

```bash
bun add @xyflow/react @tanstack/react-query dagre d3-force d3-selection ws
bun add -D @types/dagre @types/d3-force @types/d3-selection @types/ws
```

### 2. Update Package.json Scripts

Add visualization-specific scripts:

```json
{
  "scripts": {
    "dev:viz": "next dev --turbopack --experimental-https",
    "build:viz": "next build && next export",
    "test:viz": "vitest run tests/visualization",
    "storybook:viz": "storybook dev -p 6007"
  }
}
```

## 🏗️ Project Structure

Create the following directory structure:

```
src/
├── components/
│   ├── ambient-agents/
│   │   ├── visualization-engine.tsx
│   │   ├── nodes/
│   │   │   ├── agent-node.tsx
│   │   │   ├── task-node.tsx
│   │   │   ├── memory-node.tsx
│   │   │   └── event-node.tsx
│   │   ├── edges/
│   │   │   ├── animated-edge.tsx
│   │   │   ├── data-flow-edge.tsx
│   │   │   └── dependency-edge.tsx
│   │   ├── controls/
│   │   │   ├── visualization-controls.tsx
│   │   │   └── layout-controls.tsx
│   │   └── panels/
│   │       ├── agent-detail-panel.tsx
│   │       └── performance-monitor.tsx
│   └── ui/
│       ├── react-flow-provider.tsx
│       └── visualization-themes.tsx
├── hooks/
│   ├── use-ambient-agent-data.ts
│   ├── use-visualization-state.ts
│   ├── use-websocket.ts
│   └── use-layout-algorithms.ts
├── lib/
│   ├── ambient-agents/
│   │   ├── orchestrator.ts
│   │   ├── task-manager.ts
│   │   └── event-bus.ts
│   ├── visualization/
│   │   ├── layout-algorithms.ts
│   │   ├── data-transformers.ts
│   │   └── performance-utils.ts
│   └── websocket/
│       ├── client.ts
│       └── types.ts
└── pages/
    ├── api/
    │   ├── ambient-agents/
    │   │   ├── route.ts
    │   │   └── ws/
    │   │       └── route.ts
    │   └── visualization/
    │       └── route.ts
    └── visualization/
        └── page.tsx
```

## 🔧 Core Implementation

### 1. React Flow Provider Setup

Create `src/components/ui/react-flow-provider.tsx`:

```typescript
'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { ReactFlowProvider as BaseReactFlowProvider } from '@xyflow/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      refetchOnWindowFocus: false,
      retry: 3,
    },
  },
});

interface ReactFlowProviderProps {
  children: ReactNode;
}

export const ReactFlowProvider: React.FC<ReactFlowProviderProps> = ({ children }) => {
  return (
    <QueryClientProvider client={queryClient}>
      <BaseReactFlowProvider>
        {children}
      </BaseReactFlowProvider>
    </QueryClientProvider>
  );
};

export const withReactFlowProvider = <P extends object>(
  Component: React.ComponentType<P>
) => {
  return function WrappedComponent(props: P) {
    return (
      <ReactFlowProvider>
        <Component {...props} />
      </ReactFlowProvider>
    );
  };
};
```

### 2. Visualization State Management

Create `src/hooks/use-visualization-state.ts`:

```typescript
import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { Node, Edge, Viewport } from "@xyflow/react";

interface VisualizationState {
  // Core state
  nodes: Node[];
  edges: Edge[];
  viewport: Viewport;

  // UI state
  selectedNode: Node | null;
  selectedEdge: Edge | null;
  isDetailPanelOpen: boolean;

  // View configuration
  viewMode:
    | "agent-centric"
    | "task-centric"
    | "event-centric"
    | "memory-centric";
  layoutAlgorithm: "hierarchical" | "force-directed" | "circular" | "custom";

  // Filters
  filters: {
    showInactive: boolean;
    showMetrics: boolean;
    searchTerm: string;
    agentTypes: string[];
    taskStatuses: string[];
  };

  // Performance
  performance: {
    fps: number;
    nodeCount: number;
    edgeCount: number;
    renderTime: number;
    memoryUsage: number;
  };

  // Actions
  setNodes: (nodes: Node[]) => void;
  setEdges: (edges: Edge[]) => void;
  updateNode: (nodeId: string, updates: Partial<Node>) => void;
  updateEdge: (edgeId: string, updates: Partial<Edge>) => void;
  setViewport: (viewport: Viewport) => void;
  setSelectedNode: (node: Node | null) => void;
  setSelectedEdge: (edge: Edge | null) => void;
  setViewMode: (mode: string) => void;
  setLayoutAlgorithm: (algorithm: string) => void;
  applyFilters: (filters: Partial<VisualizationState["filters"]>) => void;
  updatePerformance: (
    metrics: Partial<VisualizationState["performance"]>,
  ) => void;
  resetVisualization: () => void;
}

export const useVisualizationStore = create<VisualizationState>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    nodes: [],
    edges: [],
    viewport: { x: 0, y: 0, zoom: 1 },
    selectedNode: null,
    selectedEdge: null,
    isDetailPanelOpen: false,
    viewMode: "agent-centric",
    layoutAlgorithm: "force-directed",
    filters: {
      showInactive: true,
      showMetrics: true,
      searchTerm: "",
      agentTypes: [],
      taskStatuses: [],
    },
    performance: {
      fps: 60,
      nodeCount: 0,
      edgeCount: 0,
      renderTime: 0,
      memoryUsage: 0,
    },

    // Actions
    setNodes: (nodes) => set({ nodes }),
    setEdges: (edges) => set({ edges }),

    updateNode: (nodeId, updates) =>
      set((state) => ({
        nodes: state.nodes.map((node) =>
          node.id === nodeId ? { ...node, ...updates } : node,
        ),
      })),

    updateEdge: (edgeId, updates) =>
      set((state) => ({
        edges: state.edges.map((edge) =>
          edge.id === edgeId ? { ...edge, ...updates } : edge,
        ),
      })),

    setViewport: (viewport) => set({ viewport }),
    setSelectedNode: (node) => set({ selectedNode: node }),
    setSelectedEdge: (edge) => set({ selectedEdge: edge }),
    setViewMode: (mode) => set({ viewMode: mode as any }),
    setLayoutAlgorithm: (algorithm) =>
      set({ layoutAlgorithm: algorithm as any }),

    applyFilters: (newFilters) =>
      set((state) => ({
        filters: { ...state.filters, ...newFilters },
      })),

    updatePerformance: (metrics) =>
      set((state) => ({
        performance: { ...state.performance, ...metrics },
      })),

    resetVisualization: () =>
      set({
        nodes: [],
        edges: [],
        viewport: { x: 0, y: 0, zoom: 1 },
        selectedNode: null,
        selectedEdge: null,
        isDetailPanelOpen: false,
      }),
  })),
);
```

### 3. WebSocket Integration

Create `src/hooks/use-websocket.ts`:

```typescript
import { useEffect, useRef, useState, useCallback } from "react";

interface WebSocketOptions {
  onOpen?: (event: Event) => void;
  onClose?: (event: CloseEvent) => void;
  onError?: (event: Event) => void;
  onMessage?: (event: MessageEvent) => void;
  reconnectAttempts?: number;
  reconnectInterval?: number;
}

export const useWebSocket = (url: string, options: WebSocketOptions = {}) => {
  const [connectionStatus, setConnectionStatus] = useState<
    "connecting" | "connected" | "disconnected"
  >("disconnected");
  const [lastMessage, setLastMessage] = useState<MessageEvent | null>(null);
  const [error, setError] = useState<Event | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);

  const {
    onOpen,
    onClose,
    onError,
    onMessage,
    reconnectAttempts = 5,
    reconnectInterval = 3000,
  } = options;

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.CONNECTING) return;

    setConnectionStatus("connecting");
    wsRef.current = new WebSocket(url);

    wsRef.current.onopen = (event) => {
      setConnectionStatus("connected");
      reconnectAttemptsRef.current = 0;
      setError(null);
      onOpen?.(event);
    };

    wsRef.current.onclose = (event) => {
      setConnectionStatus("disconnected");
      onClose?.(event);

      // Attempt to reconnect
      if (reconnectAttemptsRef.current < reconnectAttempts) {
        reconnectAttemptsRef.current++;
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, reconnectInterval);
      }
    };

    wsRef.current.onerror = (event) => {
      setError(event);
      onError?.(event);
    };

    wsRef.current.onmessage = (event) => {
      setLastMessage(event);
      onMessage?.(event);
    };
  }, [
    url,
    onOpen,
    onClose,
    onError,
    onMessage,
    reconnectAttempts,
    reconnectInterval,
  ]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    if (wsRef.current) {
      wsRef.current.close();
    }
  }, []);

  const sendMessage = useCallback((message: string | object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const messageString =
        typeof message === "string" ? message : JSON.stringify(message);
      wsRef.current.send(messageString);
    }
  }, []);

  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    connectionStatus,
    lastMessage,
    error,
    sendMessage,
    connect,
    disconnect,
  };
};
```

### 4. Layout Algorithms

Create `src/lib/visualization/layout-algorithms.ts`:

```typescript
import dagre from "dagre";
import { Node, Edge, Position } from "@xyflow/react";
import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
} from "d3-force";

export interface LayoutOptions {
  nodeWidth?: number;
  nodeHeight?: number;
  direction?: "TB" | "BT" | "LR" | "RL";
  spacing?: number;
  iterations?: number;
}

export const applyHierarchicalLayout = (
  nodes: Node[],
  edges: Edge[],
  options: LayoutOptions = {},
): Node[] => {
  const {
    nodeWidth = 250,
    nodeHeight = 150,
    direction = "TB",
    spacing = 50,
  } = options;

  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: direction, nodesep: spacing, ranksep: spacing });

  // Add nodes to graph
  nodes.forEach((node) => {
    g.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });

  // Add edges to graph
  edges.forEach((edge) => {
    g.setEdge(edge.source, edge.target);
  });

  // Apply layout
  dagre.layout(g);

  // Update node positions
  return nodes.map((node) => {
    const nodeWithPosition = g.node(node.id);
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - nodeWidth / 2,
        y: nodeWithPosition.y - nodeHeight / 2,
      },
    };
  });
};

export const applyForceDirectedLayout = (
  nodes: Node[],
  edges: Edge[],
  options: LayoutOptions = {},
): Node[] => {
  const { nodeWidth = 250, nodeHeight = 150, iterations = 300 } = options;

  const simulation = forceSimulation(nodes as any)
    .force(
      "link",
      forceLink(edges as any).id((d: any) => d.id),
    )
    .force("charge", forceManyBody().strength(-1000))
    .force("center", forceCenter(400, 300))
    .stop();

  // Run simulation
  for (let i = 0; i < iterations; i++) {
    simulation.tick();
  }

  return nodes.map((node, index) => ({
    ...node,
    position: {
      x: (simulation.nodes()[index] as any).x - nodeWidth / 2,
      y: (simulation.nodes()[index] as any).y - nodeHeight / 2,
    },
  }));
};

export const applyCircularLayout = (
  nodes: Node[],
  edges: Edge[],
  options: LayoutOptions = {},
): Node[] => {
  const { nodeWidth = 250, nodeHeight = 150, spacing = 300 } = options;

  const centerX = 400;
  const centerY = 300;
  const radius = Math.max(200, (nodes.length * spacing) / (2 * Math.PI));

  return nodes.map((node, index) => {
    const angle = (index / nodes.length) * 2 * Math.PI;
    return {
      ...node,
      position: {
        x: centerX + radius * Math.cos(angle) - nodeWidth / 2,
        y: centerY + radius * Math.sin(angle) - nodeHeight / 2,
      },
    };
  });
};

export const applyCustomLayout = (
  nodes: Node[],
  edges: Edge[],
  options: LayoutOptions = {},
): Node[] => {
  // Custom layout based on node types and relationships
  const agentNodes = nodes.filter((node) => node.type === "agent");
  const taskNodes = nodes.filter((node) => node.type === "task");
  const memoryNodes = nodes.filter((node) => node.type === "memory");

  const { nodeWidth = 250, nodeHeight = 150, spacing = 50 } = options;

  // Position agent nodes in a grid
  const agentGridCols = Math.ceil(Math.sqrt(agentNodes.length));
  const agentGridRows = Math.ceil(agentNodes.length / agentGridCols);

  const positionedNodes = [...nodes];

  // Layout agents
  agentNodes.forEach((node, index) => {
    const row = Math.floor(index / agentGridCols);
    const col = index % agentGridCols;

    const nodeIndex = nodes.findIndex((n) => n.id === node.id);
    positionedNodes[nodeIndex] = {
      ...node,
      position: {
        x: col * (nodeWidth + spacing),
        y: row * (nodeHeight + spacing),
      },
    };
  });

  // Layout tasks below agents
  taskNodes.forEach((node, index) => {
    const nodeIndex = nodes.findIndex((n) => n.id === node.id);
    positionedNodes[nodeIndex] = {
      ...node,
      position: {
        x: index * (nodeWidth + spacing),
        y: (agentGridRows + 1) * (nodeHeight + spacing),
      },
    };
  });

  // Layout memory nodes to the right
  memoryNodes.forEach((node, index) => {
    const nodeIndex = nodes.findIndex((n) => n.id === node.id);
    positionedNodes[nodeIndex] = {
      ...node,
      position: {
        x: (agentGridCols + 1) * (nodeWidth + spacing),
        y: index * (nodeHeight + spacing),
      },
    };
  });

  return positionedNodes;
};
```

### 5. Main Visualization Component

Create `src/components/ambient-agents/visualization-engine.tsx`:

```typescript
'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ReactFlow,
  Node,
  Edge,
  Controls,
  MiniMap,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Panel,
  NodeTypes,
  EdgeTypes,
  OnNodesChange,
  OnEdgesChange,
  OnConnect
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { AgentNode } from './nodes/agent-node';
import { TaskNode } from './nodes/task-node';
import { MemoryNode } from './nodes/memory-node';
import { EventNode } from './nodes/event-node';
import { AnimatedEdge } from './edges/animated-edge';
import { DataFlowEdge } from './edges/data-flow-edge';
import { DependencyEdge } from './edges/dependency-edge';
import { VisualizationControls } from './controls/visualization-controls';
import { AgentDetailPanel } from './panels/agent-detail-panel';
import { PerformanceMonitor } from './panels/performance-monitor';
import { useAmbientAgentData } from '../../hooks/use-ambient-agent-data';
import { useVisualizationStore } from '../../hooks/use-visualization-state';
import { applyHierarchicalLayout, applyForceDirectedLayout, applyCircularLayout, applyCustomLayout } from '../../lib/visualization/layout-algorithms';

const nodeTypes: NodeTypes = {
  agent: AgentNode,
  task: TaskNode,
  memory: MemoryNode,
  event: EventNode,
};

const edgeTypes: EdgeTypes = {
  animated: AnimatedEdge,
  dataFlow: DataFlowEdge,
  dependency: DependencyEdge,
};

export interface VisualizationEngineProps {
  swarmId?: string;
  className?: string;
}

export const VisualizationEngine: React.FC<VisualizationEngineProps> = ({
  swarmId,
  className = ''
}) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const {
    selectedNode,
    isDetailPanelOpen,
    viewMode,
    layoutAlgorithm,
    filters,
    setSelectedNode,
    setNodes: setStoreNodes,
    setEdges: setStoreEdges,
    applyFilters,
    updatePerformance
  } = useVisualizationStore();

  const {
    agentData,
    taskData,
    eventStream,
    memoryData,
    communications,
    isLoading,
    error,
    connectionStatus
  } = useAmbientAgentData(swarmId);

  // Transform data to React Flow format
  const { transformedNodes, transformedEdges } = useMemo(() => {
    if (!agentData || isLoading) {
      return { transformedNodes: [], transformedEdges: [] };
    }

    const allNodes = transformDataToNodes(agentData, taskData, eventStream, memoryData, viewMode);
    const allEdges = transformDataToEdges(agentData, taskData, communications, viewMode);

    // Apply filters
    const filteredNodes = applyNodeFilters(allNodes, filters);
    const filteredEdges = applyEdgeFilters(allEdges, filteredNodes, filters);

    // Apply layout
    const layoutedNodes = applySelectedLayout(filteredNodes, filteredEdges, layoutAlgorithm);

    return {
      transformedNodes: layoutedNodes,
      transformedEdges: filteredEdges
    };
  }, [agentData, taskData, eventStream, memoryData, communications, viewMode, layoutAlgorithm, filters, isLoading]);

  // Update React Flow state
  useEffect(() => {
    setNodes(transformedNodes);
    setEdges(transformedEdges);
    setStoreNodes(transformedNodes);
    setStoreEdges(transformedEdges);

    // Update performance metrics
    updatePerformance({
      nodeCount: transformedNodes.length,
      edgeCount: transformedEdges.length
    });
  }, [transformedNodes, transformedEdges, setNodes, setEdges, setStoreNodes, setStoreEdges, updatePerformance]);

  // Handle node connections
  const onConnect: OnConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  // Handle node selection
  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  }, [setSelectedNode]);

  // Handle layout changes
  const handleLayoutChange = useCallback((newLayout: string) => {
    // Layout change is handled by the store and will trigger re-render
  }, []);

  // Handle view mode changes
  const handleViewModeChange = useCallback((newViewMode: string) => {
    // View mode change is handled by the store and will trigger re-render
  }, []);

  // Handle filter changes
  const handleFilterChange = useCallback((newFilters: any) => {
    applyFilters(newFilters);
  }, [applyFilters]);

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-red-500">
          Error loading ambient agent data: {error.message}
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full h-full relative ${className}`}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        attributionPosition="bottom-left"
        className="ambient-agent-visualization"
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#aaa" gap={16} />
        <Controls />
        <MiniMap
          nodeColor={(node) => getNodeColor(node)}
          nodeStrokeWidth={3}
          zoomable
          pannable
        />

        {/* Control Panel */}
        <Panel position="top-left">
          <VisualizationControls
            viewMode={viewMode}
            layoutAlgorithm={layoutAlgorithm}
            onViewModeChange={handleViewModeChange}
            onLayoutChange={handleLayoutChange}
            onFilterChange={handleFilterChange}
          />
        </Panel>

        {/* Performance Monitor */}
        <Panel position="top-right">
          <PerformanceMonitor />
        </Panel>

        {/* Connection Status */}
        <Panel position="bottom-right">
          <div className={`px-2 py-1 rounded text-xs ${
            connectionStatus === 'connected'
              ? 'bg-green-100 text-green-800'
              : 'bg-red-100 text-red-800'
          }`}>
            {connectionStatus}
          </div>
        </Panel>
      </ReactFlow>

      {/* Detail Panel */}
      {selectedNode && (
        <AgentDetailPanel
          node={selectedNode}
          isOpen={isDetailPanelOpen}
          onClose={() => setSelectedNode(null)}
        />
      )}
    </div>
  );
};

// Helper functions
function transformDataToNodes(agentData: any, taskData: any, eventStream: any, memoryData: any, viewMode: string): Node[] {
  const nodes: Node[] = [];

  // Add agent nodes
  agentData?.forEach((agent: any, index: number) => {
    nodes.push({
      id: agent.id,
      type: 'agent',
      position: { x: index * 300, y: 100 },
      data: { agent }
    });
  });

  // Add task nodes in task-centric view
  if (viewMode === 'task-centric' && taskData?.tasks) {
    taskData.tasks.forEach((task: any, index: number) => {
      nodes.push({
        id: task.id,
        type: 'task',
        position: { x: index * 300, y: 400 },
        data: { task }
      });
    });
  }

  // Add memory nodes in memory-centric view
  if (viewMode === 'memory-centric' && memoryData?.namespaces) {
    memoryData.namespaces.forEach((namespace: any, index: number) => {
      nodes.push({
        id: namespace.id,
        type: 'memory',
        position: { x: index * 300, y: 200 },
        data: { namespace }
      });
    });
  }

  return nodes;
}

function transformDataToEdges(agentData: any, taskData: any, communications: any, viewMode: string): Edge[] {
  const edges: Edge[] = [];

  // Add communication edges
  communications?.forEach((comm: any) => {
    edges.push({
      id: `comm-${comm.from}-${comm.to}`,
      source: comm.from,
      target: comm.to,
      type: 'dataFlow',
      data: { communication: comm },
      animated: comm.isActive
    });
  });

  // Add task dependency edges
  if (taskData?.dependencies) {
    taskData.dependencies.forEach((dep: any) => {
      edges.push({
        id: `dep-${dep.from}-${dep.to}`,
        source: dep.from,
        target: dep.to,
        type: 'dependency',
        data: { dependency: dep }
      });
    });
  }

  return edges;
}

function applyNodeFilters(nodes: Node[], filters: any): Node[] {
  return nodes.filter(node => {
    // Apply search filter
    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      const nodeName = node.data?.agent?.name || node.data?.task?.name || node.data?.namespace?.name || '';
      if (!nodeName.toLowerCase().includes(searchLower)) {
        return false;
      }
    }

    // Apply type filters
    if (filters.agentTypes.length > 0 && node.type === 'agent') {
      if (!filters.agentTypes.includes(node.data?.agent?.type)) {
        return false;
      }
    }

    // Apply status filters
    if (filters.taskStatuses.length > 0 && node.type === 'task') {
      if (!filters.taskStatuses.includes(node.data?.task?.status)) {
        return false;
      }
    }

    // Apply inactive filter
    if (!filters.showInactive) {
      if (node.data?.agent?.status === 'idle' || node.data?.task?.status === 'completed') {
        return false;
      }
    }

    return true;
  });
}

function applyEdgeFilters(edges: Edge[], nodes: Node[], filters: any): Edge[] {
  const nodeIds = new Set(nodes.map(node => node.id));

  return edges.filter(edge => {
    // Only include edges where both source and target nodes are visible
    return nodeIds.has(edge.source) && nodeIds.has(edge.target);
  });
}

function applySelectedLayout(nodes: Node[], edges: Edge[], algorithm: string): Node[] {
  switch (algorithm) {
    case 'hierarchical':
      return applyHierarchicalLayout(nodes, edges);
    case 'force-directed':
      return applyForceDirectedLayout(nodes, edges);
    case 'circular':
      return applyCircularLayout(nodes, edges);
    case 'custom':
      return applyCustomLayout(nodes, edges);
    default:
      return nodes;
  }
}

function getNodeColor(node: Node): string {
  switch (node.type) {
    case 'agent':
      return node.data?.agent?.status === 'busy' ? '#10b981' : '#6b7280';
    case 'task':
      return node.data?.task?.status === 'running' ? '#3b82f6' : '#9ca3af';
    case 'memory':
      return '#8b5cf6';
    case 'event':
      return '#f59e0b';
    default:
      return '#6b7280';
  }
}
```

## 🚀 Integration with Existing System

### 1. Update App Router

Create `src/app/visualization/page.tsx`:

```typescript
import { VisualizationEngine } from '@/components/ambient-agents/visualization-engine';
import { ReactFlowProvider } from '@/components/ui/react-flow-provider';

export default function VisualizationPage() {
  return (
    <ReactFlowProvider>
      <div className="h-screen w-full">
        <VisualizationEngine />
      </div>
    </ReactFlowProvider>
  );
}
```

### 2. Update Navigation

Add visualization link to your navigation:

```typescript
const navigationItems = [
  { name: "Home", href: "/" },
  { name: "Agents", href: "/agents" },
  { name: "Tasks", href: "/tasks" },
  { name: "Visualization", href: "/visualization" }, // Add this
];
```

### 3. API Routes

Create WebSocket API route `src/app/api/ambient-agents/ws/route.ts`:

```typescript
import { NextRequest } from "next/server";
import { WebSocket } from "ws";

export async function GET(request: NextRequest) {
  const upgrade = request.headers.get("upgrade");

  if (upgrade?.toLowerCase() !== "websocket") {
    return new Response("Expected Websocket", { status: 400 });
  }

  // WebSocket upgrade logic here
  // This is a simplified example - implement full WebSocket server

  return new Response("WebSocket connection established", {
    status: 101,
    headers: {
      Upgrade: "websocket",
      Connection: "Upgrade",
    },
  });
}
```

## 🧪 Testing the Integration

### 1. Unit Tests

Create `src/components/ambient-agents/__tests__/visualization-engine.test.tsx`:

```typescript
import { render, screen } from '@testing-library/react';
import { VisualizationEngine } from '../visualization-engine';
import { ReactFlowProvider } from '@/components/ui/react-flow-provider';

describe('VisualizationEngine', () => {
  const renderWithProviders = (ui: React.ReactElement) => {
    return render(
      <ReactFlowProvider>
        {ui}
      </ReactFlowProvider>
    );
  };

  it('renders without crashing', () => {
    renderWithProviders(<VisualizationEngine />);
    expect(screen.getByTestId('visualization-engine')).toBeInTheDocument();
  });

  it('displays loading state', () => {
    renderWithProviders(<VisualizationEngine />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });
});
```

### 2. Integration Tests

Test the complete visualization flow:

```typescript
// tests/integration/visualization.test.ts
import { test, expect } from "@playwright/test";

test.describe("Visualization Integration", () => {
  test("loads visualization page", async ({ page }) => {
    await page.goto("/visualization");

    // Wait for React Flow to load
    await page.waitForSelector(".react-flow");

    // Check if controls are present
    await expect(page.locator(".react-flow__controls")).toBeVisible();

    // Check if nodes are rendered
    await expect(page.locator(".react-flow__node")).toBeVisible();
  });

  test("handles node interactions", async ({ page }) => {
    await page.goto("/visualization");

    // Wait for nodes to load
    await page.waitForSelector(".react-flow__node");

    // Click on a node
    await page.click(".react-flow__node");

    // Check if detail panel opens
    await expect(
      page.locator('[data-testid="agent-detail-panel"]'),
    ).toBeVisible();
  });
});
```

## 🎨 Styling and Themes

Create custom CSS for React Flow:

```css
/* styles/react-flow.css */
.react-flow {
  background: #f8fafc;
}

.react-flow__node-agent {
  background: #ffffff;
  border: 2px solid #3b82f6;
  border-radius: 8px;
  padding: 10px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.react-flow__node-agent.selected {
  border-color: #1d4ed8;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.react-flow__edge-animated {
  stroke-dasharray: 5;
  animation: dashdraw 0.5s linear infinite;
}

@keyframes dashdraw {
  to {
    stroke-dashoffset: -10;
  }
}
```

## 📝 Next Steps

1. **Implement remaining node types** (Task, Memory, Event nodes)
2. **Add more edge types** (Dependency, Communication edges)
3. **Implement detail panels** for different node types
4. **Add performance monitoring** and optimization
5. **Implement collaborative features** (if needed)
6. **Add export/import capabilities** for visualizations
7. **Create custom themes** and styling options

This integration guide provides a comprehensive foundation for adding React Flow visualization to your CodeClone application with ambient agents capabilities.
