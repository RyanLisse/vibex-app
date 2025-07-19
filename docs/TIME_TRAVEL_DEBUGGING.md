# Time-Travel Debugging System

## Overview

The Time-Travel Debugging System provides comprehensive debugging capabilities for agent executions, allowing developers to step through execution history, inspect state at any point, and analyze performance issues.

## Key Features

### 🕰️ Execution Timeline Navigation
- Step forward and backward through execution history
- Jump to specific steps or checkpoints
- Variable playback speed (0.25x to 8x)
- Visual timeline with execution type indicators

### 🔍 State Inspection
- Complete state viewer at each execution step
- Memory inspection (short-term, long-term, context)
- Watch variables with real-time updates
- State search and filtering

### 🔧 Debugging Tools
- Breakpoint management
- Step-by-step execution control
- Continue to next breakpoint
- Error tracking and analysis

### 📊 Execution Comparison
- Compare states between different steps
- Identify state differences and changes
- Pattern detection across executions
- Performance metric comparison

### 💾 Session Management
- Persistent debug sessions
- Session export/import
- Debug notes and annotations
- Multi-user session support

## Architecture

### Core Components

1. **Execution Snapshots** (`/lib/time-travel/execution-snapshots.ts`)
   - Captures complete state at each execution step
   - Stores snapshots in the database
   - Supports checkpoints for rollback

2. **Replay Engine** (`/lib/time-travel/replay-engine.ts`)
   - Controls playback of execution history
   - Manages replay sessions
   - Handles timeline navigation

3. **Debug Session Manager** (`/lib/debug/session-manager.ts`)
   - Creates and manages debug sessions
   - Tracks breakpoints and watched variables
   - Handles session persistence

4. **Comparison Engine** (`/lib/debug/execution-comparison.ts`)
   - Compares execution states
   - Identifies differences and patterns
   - Generates insights and recommendations

### Database Schema

```sql
-- Execution snapshots table
CREATE TABLE execution_snapshots (
  id UUID PRIMARY KEY,
  execution_id UUID REFERENCES agent_executions(id),
  step_number INTEGER NOT NULL,
  timestamp TIMESTAMP NOT NULL,
  state JSONB NOT NULL,
  type VARCHAR(50) NOT NULL,
  checkpoint BOOLEAN DEFAULT FALSE,
  metadata JSONB,
  UNIQUE(execution_id, step_number)
);

-- Observability events table
CREATE TABLE observability_events (
  id UUID PRIMARY KEY,
  execution_id UUID REFERENCES agent_executions(id),
  type VARCHAR(100) NOT NULL,
  severity VARCHAR(20) DEFAULT 'info',
  message TEXT,
  metadata JSONB,
  timestamp TIMESTAMP NOT NULL,
  source VARCHAR(100) DEFAULT 'system',
  tags JSONB
);
```

## Usage

### Starting a Debug Session

```typescript
import { debug } from '@/lib/debug'

// Create a new debug session
const session = await debug.startDebugSession(executionId, userId)

// Or use the session manager directly
import { debugSessionManager } from '@/lib/debug/session-manager'

const session = await debugSessionManager.createSession(
  executionId,
  userId,
  {
    breakpoints: [10, 20, 30], // Optional: Set initial breakpoints
    watchedVariables: ['memory.userId', 'outputs.result'],
    tags: ['bug-investigation', 'performance']
  }
)
```

### Using React Hooks

```typescript
import { useDebugSession, useTimeTravelReplay } from '@/hooks/use-time-travel-debug'

function DebugComponent({ sessionId }) {
  // Get session info
  const { session, isLoading } = useDebugSession(sessionId)
  
  // Control replay
  const {
    currentSnapshot,
    isPlaying,
    stepTo,
    togglePlayback,
    continueToBreakpoint
  } = useTimeTravelReplay(sessionId)
  
  // Manage breakpoints
  const { breakpoints, toggleBreakpoint } = useBreakpoints(sessionId)
  
  // Watch variables
  const { watchedVariables, watchedValues, addWatch } = useWatchedVariables(sessionId)
}
```

### Capturing Snapshots

```typescript
import { timeTravel } from '@/lib/time-travel'

// Capture a snapshot during execution
await timeTravel.captureSnapshot(
  executionId,
  'step_start',
  stepNumber,
  currentState,
  'Processing user input',
  ['input-processing'],
  false // isCheckpoint
)

// Create a checkpoint for rollback
await timeTravel.createCheckpoint(
  executionId,
  stepNumber,
  currentState,
  'Before critical operation'
)
```

### Comparing Executions

```typescript
import { comparisonEngine } from '@/lib/debug/execution-comparison'

// Compare two snapshots
const comparison = await comparisonEngine.compareSnapshots(
  leftSnapshot,
  rightSnapshot,
  {
    includeUnchanged: false,
    ignorePaths: ['timestamp', 'id']
  }
)

// Find patterns across executions
const patterns = await comparisonEngine.findPatterns(snapshots, {
  minOccurrences: 3
})
```

## UI Components

### Time-Travel Debug Dashboard

```tsx
import { TimeTravelDebugDashboard } from '@/components/debug/time-travel-debug-dashboard'

<TimeTravelDebugDashboard sessionId={sessionId} />
```

### Individual Components

```tsx
import { ExecutionTimeline } from '@/components/debug/execution-timeline'
import { StateReplayViewer } from '@/components/debug/state-replay-viewer'
import { StateDiffViewer } from '@/components/debug/state-diff-viewer'

// Timeline component
<ExecutionTimeline
  sessionId={sessionId}
  snapshots={snapshots}
  currentIndex={currentIndex}
  onStepTo={handleStepTo}
  onBreakpointToggle={handleBreakpointToggle}
/>

// State viewer
<StateReplayViewer
  snapshot={currentSnapshot}
  watchedVariables={watchedVariables}
  onAddWatch={handleAddWatch}
  onRemoveWatch={handleRemoveWatch}
/>

// Diff viewer
<StateDiffViewer comparison={comparison} />
```

## Best Practices

### 1. Snapshot Frequency
- Capture snapshots at key decision points
- Create checkpoints before critical operations
- Balance detail with storage requirements

### 2. Performance Considerations
- Snapshots are buffered and flushed periodically
- Use selective snapshot capture for long executions
- Enable compression for large state objects

### 3. Debug Session Management
- Close sessions when debugging is complete
- Export important sessions for archival
- Set appropriate session expiry times

### 4. State Inspection
- Use watched variables for key state elements
- Leverage state search for large objects
- Compare states to identify issues

## Troubleshooting

### Common Issues

1. **Missing Snapshots**
   - Ensure snapshot capture is enabled
   - Check database connectivity
   - Verify execution ID is correct

2. **Performance Issues**
   - Reduce snapshot frequency
   - Limit state size in snapshots
   - Use checkpoints instead of full snapshots

3. **Session Errors**
   - Verify user permissions
   - Check session expiry
   - Ensure execution exists

## Future Enhancements

- [ ] Real-time collaborative debugging
- [ ] AI-powered issue detection
- [ ] Automated test generation from debug sessions
- [ ] Integration with CI/CD pipelines
- [ ] Advanced performance profiling

## Related Documentation

- [Observability System](./OBSERVABILITY.md)
- [Agent Execution](./AGENT_EXECUTION.md)
- [Database Schema](./DATABASE_SCHEMA.md)