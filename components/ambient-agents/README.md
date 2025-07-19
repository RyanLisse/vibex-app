# Ambient Agent Visualization System

A comprehensive React Flow-based visualization system for monitoring and managing AI agent workflows in real-time.

## Overview

This system transforms invisible, event-driven AI agent operations into interactive, real-time visual experiences. It provides developers with powerful tools to monitor, debug, and optimize their ambient agent workflows.

## Features

### 🎯 Core Visualization Components

- **VisualizationEngine**: Main React Flow-based visualization with customizable layouts
- **AgentNode**: Interactive agent cards with real-time status and performance metrics
- **TaskNode**: Task visualization with progress indicators and dependency tracking
- **EventNode**: Event stream visualization with categorization and metrics
- **MemoryNode**: Memory namespace visualization with usage analytics

### 🔗 Advanced Edge Types

- **AnimatedEdge**: Real-time data flow visualization with animated particles
- **DataFlowEdge**: Bidirectional communication with throughput and latency metrics
- **DependencyEdge**: Task dependency visualization with strength indicators

### 🎛️ Interactive Controls

- **VisualizationControls**: Comprehensive control panel with view modes, layouts, and filters
- **AgentDetailPanel**: Detailed agent information with performance tabs
- **PerformanceMonitor**: Real-time system and rendering performance metrics

### 📊 Real-time Data Integration

- **useAmbientAgentData**: Hook for fetching and managing agent data with real-time updates
- **useVisualizationState**: State management for visualization settings and filters
- **useWebSocket**: Server-Sent Events integration for real-time updates

## Architecture

### Component Structure

```
components/ambient-agents/
├── visualization-engine.tsx       # Main visualization component
├── nodes/                        # Custom node components
│   ├── agent-node.tsx
│   ├── task-node.tsx
│   ├── event-node.tsx
│   └── memory-node.tsx
├── edges/                        # Custom edge components
│   ├── animated-edge.tsx
│   ├── data-flow-edge.tsx
│   └── dependency-edge.tsx
├── controls/                     # Control components
│   └── visualization-controls.tsx
├── panels/                       # Detail panels
│   └── agent-detail-panel.tsx
├── monitors/                     # Performance monitoring
│   └── performance-monitor.tsx
└── __tests__/                    # Test files
```

### API Structure

```
app/api/ambient-agents/
├── route.ts                      # Main data endpoint
├── sse/                         # Server-Sent Events
│   └── route.ts
└── ws/                          # WebSocket placeholder
    └── route.ts
```

### Hooks Structure

```
hooks/ambient-agents/
├── use-ambient-agent-data.ts     # Data fetching and management
├── use-visualization-state.ts    # Visualization state management
└── use-websocket.ts             # Real-time communication (SSE)
```

### Utilities

```
lib/ambient-agents/
└── layout-algorithms.ts         # Graph layout algorithms
```

## Usage

### Basic Implementation

```tsx
import { VisualizationEngineWithProvider } from '@/components/ambient-agents'

export default function Dashboard() {
  return (
    <div className="h-screen">
      <VisualizationEngineWithProvider
        viewMode="agent-centric"
        layoutAlgorithm="force-directed"
        showPerformanceMetrics={true}
        enableCollaboration={false}
      />
    </div>
  )
}
```

### Custom Integration

```tsx
import { 
  VisualizationEngine,
  useAmbientAgentData,
  useVisualizationState 
} from '@/components/ambient-agents'

export function CustomDashboard() {
  const { agentData, isLoading } = useAmbientAgentData('swarm-123')
  const { visualizationState, updateViewMode } = useVisualizationState()

  if (isLoading) return <LoadingSpinner />

  return (
    <ReactFlowProvider>
      <VisualizationEngine
        swarmId="swarm-123"
        viewMode={visualizationState.viewMode}
        layoutAlgorithm={visualizationState.layoutAlgorithm}
      />
    </ReactFlowProvider>
  )
}
```

## View Modes

### 1. Agent-Centric View
- Focuses on agent nodes and their relationships
- Shows agent status, performance metrics, and current tasks
- Displays communication flows between agents

### 2. Task-Centric View  
- Emphasizes task nodes and dependency graphs
- Shows task progress, execution timelines, and bottlenecks
- Visualizes workflow execution paths

### 3. Event-Centric View
- Displays event stream as flowing nodes
- Shows event categorization and frequency
- Tracks event propagation through the system

### 4. Memory-Centric View
- Focuses on memory namespaces and usage
- Shows memory connections and access patterns
- Displays capacity and performance metrics

## Layout Algorithms

### 1. Hierarchical Layout
- Uses Dagre for automatic hierarchical positioning
- Best for visualizing dependencies and workflows
- Supports different directions (top-bottom, left-right)

### 2. Force-Directed Layout
- Physics-based positioning with D3.js force simulation
- Ideal for exploring natural relationships
- Self-organizing with collision detection

### 3. Circular Layout
- Arranges nodes in circular patterns
- Good for showing equal relationships
- Adjustable radius based on node count

### 4. Grid Layout
- Simple grid-based positioning
- Fast rendering for large datasets
- Predictable and consistent positioning

### 5. Clustered Layout
- Groups nodes by type or properties
- Combines circular layout within clusters
- Excellent for categorized data

## Real-time Features

### Server-Sent Events Integration

The system uses Server-Sent Events (SSE) for real-time updates, providing:

- **Agent Status Changes**: Real-time agent state updates
- **Task Progress**: Live task execution progress
- **Communication Metrics**: Dynamic connection throughput and latency
- **Event Stream**: Continuous event flow visualization
- **Performance Metrics**: System and rendering performance data

### Event Types

```typescript
// Agent events
'agent.status.changed'
'agent.created'

// Task events  
'task.started'
'task.completed'
'task.progress.updated'

// System events
'communication.updated'
'memory.updated'
'performance.updated'
```

## Performance Optimizations

### React Flow Optimizations
- Custom node and edge components with `memo`
- Efficient re-rendering with proper dependency arrays
- Virtualization for large datasets
- Level-of-detail rendering

### Data Management
- TanStack Query for intelligent caching
- Incremental updates via real-time streams
- Filtered rendering based on view modes
- Optimized layout algorithms

### Memory Management
- Automatic cleanup of event listeners
- Limited event stream history (100 events)
- Efficient state updates with minimal re-renders
- Proper component unmounting

## Testing

### Unit Tests
- Individual component testing with React Testing Library
- Mock implementations for React Flow dependencies
- Hook testing with custom providers
- Edge case handling and error scenarios

### Integration Tests
- Full visualization engine testing
- Real-time data flow testing
- API endpoint testing
- Performance benchmarking

### Running Tests

```bash
# Unit tests
bun run test:unit

# Integration tests  
bun run test:integration

# All tests
bun run test
```

## Development

### Prerequisites
- Bun v1.0+
- React 19+
- Next.js 15+
- TypeScript 5.8+

### Setup

```bash
# Install dependencies
bun install

# Start development server
bun run dev

# Navigate to ambient agents dashboard
open http://localhost:3000/ambient-agents
```

### Building

```bash
# Production build
bun run build

# Type checking
bun run typecheck

# Linting
bun run lint
```

## API Documentation

### GET /api/ambient-agents
Fetches current ambient agent data including agents, tasks, events, memory, and communications.

**Query Parameters:**
- `swarmId` (optional): Filter data by swarm ID

**Response:**
```typescript
{
  agents: Agent[]
  tasks: Task[]
  events: Event[]
  memory: MemoryNamespace[]
  communications: Communication[]
  dependencies: Dependency[]
}
```

### GET /api/ambient-agents/sse
Server-Sent Events endpoint for real-time updates.

**Query Parameters:**
- `swarmId` (optional): Subscribe to specific swarm updates

**Event Types:**
- `agent.status.changed`
- `task.progress.updated`
- `communication.updated`
- `event`
- `memory.updated`
- `performance.updated`

## Configuration

### Environment Variables

```bash
# Optional: Configure external services
PUSHER_APP_ID=your_pusher_app_id
PUSHER_KEY=your_pusher_key
PUSHER_SECRET=your_pusher_secret
PUSHER_CLUSTER=your_pusher_cluster
```

### Customization

The system is highly customizable through:

- **Theme Configuration**: Tailwind CSS classes and custom styling
- **Layout Options**: Multiple algorithms with configurable parameters
- **Filter Settings**: Extensive filtering and search capabilities
- **Performance Settings**: Adjustable update intervals and optimization levels

## Troubleshooting

### Common Issues

1. **React Flow Not Rendering**
   - Ensure container has explicit height
   - Check for CSS conflicts with global styles

2. **Real-time Updates Not Working**
   - Verify SSE endpoint is accessible
   - Check browser developer tools for connection errors

3. **Performance Issues**
   - Reduce update frequency for large datasets
   - Enable virtualization for 100+ nodes
   - Use filtering to limit visible elements

4. **TypeScript Errors**
   - Ensure all React Flow types are properly imported
   - Check for version compatibility between dependencies

### Debug Mode

Enable debug logging:

```typescript
const debug = process.env.NODE_ENV === 'development'

// Add to visualization engine
<VisualizationEngineWithProvider
  debug={debug}
  // ... other props
/>
```

## Contributing

1. Follow the existing code style and patterns
2. Add comprehensive tests for new features
3. Update documentation for API changes
4. Ensure TypeScript strict mode compliance
5. Test with multiple data scenarios

## Future Enhancements

- **WebGL Rendering**: For handling 1000+ nodes
- **Plugin System**: Custom node and edge types
- **Collaboration Features**: Multi-user editing and annotations
- **Export Capabilities**: PNG, SVG, and PDF export
- **Advanced Analytics**: Historical trend analysis
- **Mobile Optimization**: Touch-friendly interactions

## License

Part of Claude Flow - Terragon Labs Internal Project