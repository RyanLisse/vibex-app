# Database Observability UI Components

This document describes the new UI components implemented for the database observability integration, including time-travel debugging, agent memory browser, and workflow designer.

## 🎯 Overview

The UI components are built using:
- **origin-ui** and **shadcn/ui** for base components
- **React Flow** for workflow visualization
- **Recharts** for data visualization
- **Lucide React** for icons
- **Tailwind CSS** for styling

## 📂 Component Structure

```
components/
├── time-travel/
│   └── time-travel-debugger.tsx     # Time-travel debugging interface
├── agent-memory/
│   └── memory-browser.tsx           # Agent memory management
├── workflow/
│   └── workflow-designer.tsx        # Visual workflow designer
├── shared/
│   ├── data-table.tsx              # Reusable data table
│   └── status-indicator.tsx        # Status display component
├── observability/
│   └── observability-dashboard.tsx # Main dashboard
└── ui/
    ├── chart.tsx                   # Chart components
    └── line-clamp.tsx              # Text truncation utility
```

## 🕰️ Time-Travel Debugger

### Features
- **Timeline View**: Visual timeline of execution snapshots
- **Replay Controls**: Play, pause, speed control for execution replay
- **Snapshot Comparison**: Side-by-side diff analysis
- **Performance Analysis**: Charts and metrics for execution performance

### Usage
```tsx
import { TimeTravelDebugger } from '@/components/time-travel/time-travel-debugger';

<TimeTravelDebugger 
  executionId="exec-123" 
  onClose={() => setShowDebugger(false)}
/>
```

### Key Props
- `executionId`: ID of the execution to debug
- `onClose`: Callback when debugger is closed

### API Integration
- `GET /api/time-travel/snapshots` - Fetch execution snapshots
- `POST /api/time-travel/replay` - Start replay session
- `POST /api/time-travel/compare` - Compare snapshots

## 🧠 Agent Memory Browser

### Features
- **Semantic Search**: Vector-based search across memories
- **Memory Categories**: Learned patterns, context, preferences, etc.
- **CRUD Operations**: Create, read, update, delete memories
- **Statistics Dashboard**: Memory analytics and insights

### Usage
```tsx
import { MemoryBrowser } from '@/components/agent-memory/memory-browser';

<MemoryBrowser />
```

### Memory Types
- `learned_pattern`: Patterns learned by agents
- `context`: Contextual information
- `preference`: User/agent preferences
- `error_resolution`: Error handling patterns
- `optimization`: Performance optimizations

### API Integration
- `GET /api/agent-memory` - List and filter memories
- `POST /api/agent-memory` - Create new memory
- `POST /api/agent-memory/search` - Semantic search

## ⚡ Workflow Designer

### Features
- **Visual Editor**: Drag-and-drop workflow creation
- **Node Types**: Action, condition, wait, API, code, database nodes
- **Real-time Execution**: Live workflow execution monitoring
- **Version Control**: Workflow versioning and management

### Usage
```tsx
import { WorkflowDesigner } from '@/components/workflow/workflow-designer';

<WorkflowDesigner />
```

### Node Types
- **Action Nodes**: API calls, code execution, database operations
- **Condition Nodes**: Branching logic with true/false paths
- **Wait Nodes**: Delays and timeouts
- **Notification Nodes**: Email, Slack, webhook notifications

### API Integration
- `GET /api/workflows` - List workflows
- `POST /api/workflows` - Create workflow
- `POST /api/workflows/[id]/execute` - Execute workflow

## 📊 Shared Components

### DataTable
Reusable data table with filtering, sorting, and pagination.

```tsx
import { DataTable } from '@/components/shared/data-table';

<DataTable
  data={executions}
  columns={[
    { key: 'id', label: 'ID', sortable: true },
    { key: 'status', label: 'Status', render: (value) => <StatusIndicator status={value} /> }
  ]}
  pagination={{
    page: 1,
    pageSize: 25,
    total: 100,
    onPageChange: (page) => setPage(page),
    onPageSizeChange: (size) => setPageSize(size)
  }}
/>
```

### StatusIndicator
Consistent status display across the application.

```tsx
import { StatusIndicator } from '@/components/shared/status-indicator';

<StatusIndicator status="running" variant="detailed" />
```

**Supported Statuses:**
- `running`, `completed`, `failed`, `paused`, `pending`
- `draft`, `active`, `archived`
- `processing`, `error`, `warning`, `stopped`

## 🎨 Design System

### Color Scheme
- **Primary**: Blue (#3b82f6)
- **Success**: Green (#10b981)
- **Warning**: Yellow (#f59e0b)
- **Error**: Red (#ef4444)
- **Muted**: Gray (#6b7280)

### Typography
- **Headings**: Font weight 600-700
- **Body**: Font weight 400
- **Monospace**: For IDs, timestamps, code

### Spacing
- **Component padding**: 1rem (p-4)
- **Section spacing**: 1.5rem (space-y-6)
- **Element spacing**: 0.5-1rem (space-x-2 to space-x-4)

## 🔧 Customization

### Theme Support
All components support light/dark theme switching via the Tailwind CSS dark mode.

### Responsive Design
Components are mobile-responsive with breakpoints:
- `sm`: 640px
- `md`: 768px
- `lg`: 1024px
- `xl`: 1280px

### Accessibility
- Keyboard navigation support
- ARIA labels and roles
- Screen reader compatibility
- Focus management

## 📱 Usage Examples

### Complete Dashboard
```tsx
import { ObservabilityDashboard } from '@/components/observability/observability-dashboard';

export default function ObservabilityPage() {
  return <ObservabilityDashboard defaultTab="overview" />;
}
```

### Individual Components
```tsx
// Time-travel debugging for specific execution
<TimeTravelDebugger executionId="exec-123" />

// Agent memory with search
<MemoryBrowser />

// Workflow design interface
<WorkflowDesigner />
```

## 🔌 Integration Points

### API Routes
All components integrate with the corresponding API routes:
- `/api/time-travel/*` - Time-travel debugging
- `/api/agent-memory/*` - Memory management
- `/api/workflows/*` - Workflow operations
- `/api/observability/*` - Events and metrics

### State Management
Components use React hooks for local state and integrate with:
- **TanStack Query** for server state
- **ElectricSQL** for real-time sync
- **Local Storage** for UI preferences

### Real-time Updates
Components support real-time updates via:
- WebSocket connections
- Server-sent events
- ElectricSQL sync

## 🧪 Testing

### Demo Page
Visit `/demo/observability` to see all components in action with sample data.

### Mock Data
Components include mock data generators for testing:
- Sample executions with various statuses
- Mock agent memories with different categories
- Example workflows with different node types

## 🚀 Performance

### Optimization Features
- **Virtual scrolling** in large data tables
- **Lazy loading** of component content
- **Memoization** of expensive calculations
- **Debounced search** for better UX

### Bundle Size
- Individual components can be imported separately
- Tree-shaking supported for smaller bundles
- Shared dependencies optimized

## 🔮 Future Enhancements

### Planned Features
- **Export/Import**: Workflow and memory backup/restore
- **Collaboration**: Multi-user workflow editing
- **Analytics**: Advanced metrics and insights
- **AI Integration**: Smart suggestions and automation

### Extension Points
- Custom node types for workflows
- Plugin system for memory processors
- Themeable component variants
- Custom chart types

---

For more detailed API documentation, see the individual API route files in `/app/api/`.