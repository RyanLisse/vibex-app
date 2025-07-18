# ElectricSQL Real-time Sync Integration

This document describes the ElectricSQL integration for offline-first real-time database synchronization.

## Overview

ElectricSQL provides:
- **Offline-first architecture**: Local PGlite database with sync to Neon PostgreSQL
- **Real-time synchronization**: Bidirectional sync with conflict resolution
- **Conflict resolution**: Last-write-wins with custom strategies
- **Real-time subscriptions**: Live updates for tasks, environments, and executions

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React App     │    │   ElectricSQL   │    │ Neon PostgreSQL │
│                 │    │   Sync Service  │    │                 │
│ ┌─────────────┐ │    │                 │    │ ┌─────────────┐ │
│ │   PGlite    │◄┼────┼─────────────────┼────┤│  Production │ │
│ │  (Local)    │ │    │                 │    │ │  Database   │ │
│ └─────────────┘ │    │                 │    │ └─────────────┘ │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Installation

The required packages are already installed:

```bash
bun add @electric-sql/pglite @electric-sql/pglite-react @electric-sql/client electric-sql
```

## Configuration

### Environment Variables

Add to your `.env.local`:

```env
# ElectricSQL Configuration
ELECTRIC_URL=ws://localhost:5133
ELECTRIC_AUTH_TOKEN=your_electric_auth_token_here
ELECTRIC_DEBUG=true
```

### Database Schema Sync

The following tables are configured for real-time sync:

- **tasks**: User tasks with real-time updates
- **environments**: User environments and configurations
- **agent_executions**: Agent execution logs (server-authoritative)
- **observability_events**: Execution events (server-authoritative)
- **agent_memory**: AI agent memory (importance-based conflict resolution)
- **workflows**: Workflow definitions (admin-controlled)
- **workflow_executions**: Workflow execution instances

## Usage

### 1. Provider Setup

Wrap your app with the ElectricProvider:

```tsx
import { ElectricProvider } from '@/components/providers/electric-provider'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ElectricProvider>
          {children}
        </ElectricProvider>
      </body>
    </html>
  )
}
```

### 2. Using Tasks with Real-time Sync

```tsx
import { useElectricTasks } from '@/hooks/use-electric-tasks'

function TaskList({ userId }: { userId: string }) {
  const {
    tasks,
    loading,
    error,
    createTask,
    updateTask,
    deleteTask,
    taskStats,
  } = useElectricTasks(userId)

  if (loading) return <div>Loading tasks...</div>
  if (error) return <div>Error: {error.message}</div>

  return (
    <div>
      <h2>Tasks ({taskStats.total})</h2>
      <div className="stats">
        <span>Pending: {taskStats.pending}</span>
        <span>In Progress: {taskStats.inProgress}</span>
        <span>Completed: {taskStats.completed}</span>
      </div>
      
      {tasks.map(task => (
        <div key={task.id} className="task-item">
          <h3>{task.title}</h3>
          <p>{task.description}</p>
          <span className={`status ${task.status}`}>{task.status}</span>
          <button onClick={() => updateTask(task.id, { status: 'completed' })}>
            Complete
          </button>
        </div>
      ))}
    </div>
  )
}
```

### 3. Using Environments

```tsx
import { useElectricEnvironments } from '@/hooks/use-electric-tasks'

function EnvironmentSelector({ userId }: { userId: string }) {
  const {
    environments,
    activeEnvironment,
    loading,
    activateEnvironment,
  } = useElectricEnvironments(userId)

  return (
    <div>
      <h3>Environments</h3>
      {environments.map(env => (
        <button
          key={env.id}
          onClick={() => activateEnvironment(env.id)}
          className={env.isActive ? 'active' : ''}
        >
          {env.name}
        </button>
      ))}
    </div>
  )
}
```

### 4. Connection Status

```tsx
import { ElectricConnectionStatus, ElectricSyncButton } from '@/components/providers/electric-provider'

function Header() {
  return (
    <header>
      <h1>My App</h1>
      <div className="connection-status">
        <ElectricConnectionStatus />
        <ElectricSyncButton />
      </div>
    </header>
  )
}
```

### 5. Offline Support

```tsx
import { useOfflineState } from '@/hooks/use-electric'
import { ElectricOfflineIndicator } from '@/components/providers/electric-provider'

function App() {
  const { isOffline, pendingChanges } = useOfflineState()

  return (
    <div>
      {/* Your app content */}
      
      {/* Offline indicator */}
      <ElectricOfflineIndicator />
      
      {/* Custom offline handling */}
      {isOffline && (
        <div className="offline-banner">
          You're offline. Changes will sync when you're back online.
          {pendingChanges > 0 && ` (${pendingChanges} pending changes)`}
        </div>
      )}
    </div>
  )
}
```

## Conflict Resolution

### Strategies

1. **Last-Write-Wins** (tasks, environments)
   - Uses `updated_at` timestamp
   - Most recent change wins

2. **Server-Wins** (agent_executions, observability_events)
   - Server is authoritative
   - Client changes are rejected if conflicts occur

3. **Importance-Based** (agent_memory)
   - Higher importance value wins
   - Custom resolver for memory conflicts

### Custom Conflict Resolution

```typescript
// Example custom resolver for agent memory
const memoryConflictResolver = (local: AgentMemory, remote: AgentMemory) => {
  // Higher importance wins
  if (local.importance !== remote.importance) {
    return local.importance > remote.importance ? local : remote
  }
  
  // More recent access wins
  if (local.lastAccessedAt !== remote.lastAccessedAt) {
    return local.lastAccessedAt > remote.lastAccessedAt ? local : remote
  }
  
  // Fall back to last-write-wins
  return local.updatedAt > remote.updatedAt ? local : remote
}
```

## Performance Optimization

### Sync Configuration

- **Batch Size**: 100 records per sync batch
- **Sync Interval**: 5 seconds
- **Compression**: Enabled for large payloads
- **Delta Sync**: Enabled for large tables

### Retention Policies

- **Agent Executions**: 30 days local retention
- **Observability Events**: 7 days local retention
- **Agent Memory**: Auto-expire based on `expires_at`

### Prefetching

Related data is automatically prefetched:
- Tasks → Agent Executions
- Agent Executions → Observability Events
- Workflows → Workflow Executions

## Monitoring

### Connection Status

Monitor connection state:
- `disconnected`: Not connected to sync service
- `connecting`: Attempting to connect
- `connected`: Successfully connected
- `error`: Connection error

### Sync Status

Monitor sync state:
- `idle`: No active sync
- `syncing`: Sync in progress
- `error`: Sync error

### Metrics

Available metrics:
- Connection uptime
- Sync frequency
- Pending changes count
- Conflict resolution stats
- Data transfer volume

## Troubleshooting

### Common Issues

1. **Connection Failures**
   - Check `ELECTRIC_URL` configuration
   - Verify Electric service is running
   - Check network connectivity

2. **Sync Conflicts**
   - Review conflict resolution strategies
   - Check timestamp synchronization
   - Verify user permissions

3. **Performance Issues**
   - Adjust batch size and sync interval
   - Enable compression for large datasets
   - Implement retention policies

### Debug Mode

Enable debug logging:

```env
ELECTRIC_DEBUG=true
```

This will log:
- Connection events
- Sync operations
- Conflict resolutions
- Performance metrics

## Security

### Authentication

- JWT tokens for Electric service authentication
- User-based data filtering
- Row-level security policies

### Data Privacy

- Only user's own data is synced locally
- Sensitive data can be excluded from sync
- Encryption in transit and at rest

## Migration from Existing Setup

1. **Database Schema**: Already compatible with ElectricSQL
2. **Data Migration**: Existing data will sync automatically
3. **Client Updates**: Replace direct database calls with Electric hooks
4. **Testing**: Verify offline functionality and conflict resolution

## Next Steps

1. Set up Electric sync service
2. Configure authentication tokens
3. Test offline functionality
4. Monitor sync performance
5. Implement custom conflict resolvers if needed
