# Workflow Orchestration Engine

## Overview

The Workflow Orchestration Engine provides a comprehensive system for defining, executing, and monitoring complex multi-step workflows with pause/resume functionality, checkpoint recovery, and real-time progress tracking.

## Features Implemented

### ✅ 1. Workflow Definition Storage with Versioning Support

- **Database Schema**: Uses existing `workflows` and `workflow_executions` tables from the database schema
- **Versioning**: Full version control for workflow definitions
- **Storage**: Persistent storage in PostgreSQL with Drizzle ORM
- **API Routes**: Complete CRUD operations via REST API

### ✅ 2. Workflow Execution Engine with Pause/Resume Functionality

- **Execution Engine**: Full workflow execution with step-by-step processing
- **Pause/Resume**: Ability to pause running workflows and resume from exact point
- **Step Types**: Support for action, condition, parallel, and sequential steps
- **Error Handling**: Comprehensive error handling with retry policies
- **Timeout Management**: Configurable timeouts for individual steps

### ✅3. Checkpoint System for Reliable Workflow Recovery

- **Automatic Checkpoints**: Creates checkpoints after each successful step
- **State Persistence**: Complete workflow state saved at each checkpoint
- **Rollback Capability**: Ability to rollback to any previous checkpoint
- **Recovery**: Automatic recovery from failures using checkpoints
- **Checkpoint Management**: Keeps last 10 checkpoints to prevent storage bloat

### ✅ 4. Real-time Workflow Progress Tracking and Monitoring

- **Progress Tracking**: Real-time progress updates with percentage completion
- **WebSocket Support**: Real-time progress updates via subscription system
- **Progress API**: REST API endpoints for querying current progress
- **Step Monitoring**: Individual step status and timing information
- **Execution Statistics**: Comprehensive statistics and success rates

## Architecture

### Core Components

1. **WorkflowEngine Class** (`lib/workflow/workflow-engine.ts`)
   - Main orchestration engine
   - Handles workflow creation, execution, and management
   - Manages step executors and progress tracking

2. **API Routes** (`app/api/workflows/`)
   - `/api/workflows` - Workflow CRUD operations
   - `/api/workflows/executions` - Execution management
   - `/api/workflows/executions/[id]` - Individual execution control
   - `/api/workflows/executions/[id]/progress` - Progress tracking
   - `/api/workflows/executions/[id]/rollback` - Checkpoint rollback

3. **React Hooks** (`hooks/use-workflow-queries.ts`)
   - `useWorkflows()` - List and manage workflows
   - `useWorkflowExecution()` - Monitor individual executions
   - `useWorkflowProgress()` - Real-time progress tracking
   - `useControlExecution()` - Pause/resume/cancel operations
   - `useRollbackExecution()` - Checkpoint rollback

4. **UI Components** (`components/workflow/`)
   - `WorkflowDashboard` - Main dashboard for workflow management
   - `WorkflowForm` - Create and edit workflows
   - `WorkflowExecutionDetails` - Detailed execution monitoring

### Database Schema

The system uses the existing database schema with these key tables:

- `workflows` - Workflow definitions with versioning
- `workflow_executions` - Execution instances and state
- `execution_snapshots` - Checkpoint data for recovery

### Step Execution System

The engine supports multiple step types:

- **Action Steps**: HTTP requests, database queries, AI agent calls
- **Condition Steps**: Boolean logic evaluation
- **Parallel Steps**: Concurrent execution of multiple sub-steps
- **Sequential Steps**: Ordered execution of sub-steps

### Progress Tracking

Real-time progress tracking includes:

- Current step number and total steps
- Percentage completion
- Step-by-step status (pending, running, completed, failed, skipped)
- Estimated time remaining
- Current step name and details

### Error Handling and Recovery

Comprehensive error handling with:

- Retry policies with exponential backoff
- Circuit breaker patterns
- Automatic checkpoint creation
- Rollback to previous stable states
- Error correlation and tracing

## Usage Examples

### Creating a Workflow

```typescript
const workflowEngine = new WorkflowEngine();

const workflow = await workflowEngine.createWorkflow({
  name: "Data Processing Pipeline",
  description: "Process and validate incoming data",
  version: 1,
  steps: [
    {
      id: "fetch-data",
      name: "Fetch Data",
      type: "action",
      config: { type: "http_request", url: "https://api.example.com/data" }
    },
    {
      id: "validate-data",
      name: "Validate Data",
      type: "condition",
      config: { condition: "data.length > 0" }
    },
    {
      id: "process-data",
      name: "Process Data",
      type: "action",
      config: { type: "ai_agent_call", agent: "data-processor" }
    }
  ]
});
```

### Starting an Execution

```typescript
const executionId = await workflowEngine.startExecution(
  workflow.id,
  "user-123",
  { inputData: "sample data" }
);
```

### Monitoring Progress

```typescript
// Using React hooks
const { data: progress } = useWorkflowProgress(executionId);

// Direct API call
const progress = await workflowEngine.getProgress(executionId);
```

### Controlling Execution

```typescript
// Pause execution
await workflowEngine.pauseExecution(executionId);

// Resume execution
await workflowEngine.resumeExecution(executionId);

// Cancel execution
await workflowEngine.cancelExecution(executionId);
```

### Rollback to Checkpoint

```typescript
await workflowEngine.rollbackToCheckpoint(executionId, checkpointIndex);
```

## API Endpoints

### Workflows

- `GET /api/workflows` - List workflows
- `POST /api/workflows` - Create workflow
- `GET /api/workflows?workflowId={id}` - Get specific workflow

### Executions

- `GET /api/workflows/executions` - List executions
- `POST /api/workflows/executions` - Start execution
- `GET /api/workflows/executions/{id}` - Get execution details
- `PATCH /api/workflows/executions/{id}` - Control execution (pause/resume/cancel)
- `GET /api/workflows/executions/{id}/progress` - Get progress
- `POST /api/workflows/executions/{id}/rollback` - Rollback to checkpoint

## Testing

Comprehensive test suite includes:

- Unit tests for workflow engine core functionality
- Integration tests for API endpoints
- Mock implementations for external dependencies
- Progress tracking and checkpoint system tests

## Requirements Satisfied

This implementation satisfies all requirements from the specification:

- **6.1**: ✅ Workflow definitions stored in database with versioning
- **6.2**: ✅ Workflow execution tracking with step state management
- **6.3**: ✅ Workflow execution failure recovery from checkpoints
- **6.4**: ✅ Real-time workflow progress and status monitoring
- **6.5**: ✅ Workflow state preservation and continuation after interruption

## Future Enhancements

Potential future improvements:

1. **Advanced Scheduling**: Cron-based workflow scheduling
2. **Workflow Templates**: Pre-built workflow templates
3. **Visual Editor**: Drag-and-drop workflow designer
4. **Advanced Analytics**: Detailed performance analytics and optimization suggestions
5. **Distributed Execution**: Multi-node workflow execution
6. **Workflow Composition**: Nested and composite workflows

## Dependencies

- Drizzle ORM for database operations
- OpenTelemetry for observability and tracing
- TanStack Query for React state management
- Next.js API routes for REST endpoints
- PostgreSQL for persistent storage