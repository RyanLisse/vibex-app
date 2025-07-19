# Ambient Agents API Specification

## Overview

This specification defines the API for ambient agents integration with the CodeClone system, providing endpoints for agent management, task orchestration, and real-time updates.

## 🔗 Base URL

```
Production: https://api.codeclone.dev/v1
Development: http://localhost:3000/api
```

## 🛡️ Authentication

All API endpoints require authentication using Bearer tokens:

```http
Authorization: Bearer <token>
```

## 📋 Agent Management API

### Create Agent

Creates a new ambient agent with specified configuration.

```http
POST /api/ambient-agents/create
```

**Request Body:**

```typescript
interface CreateAgentRequest {
  name: string;
  type: "coder" | "reviewer" | "tester" | "researcher" | "optimizer";
  provider: "claude" | "openai" | "gemini" | "custom";
  capabilities: string[];
  configuration: {
    temperature?: number;
    maxTokens?: number;
    systemPrompt?: string;
    tools?: string[];
  };
  ambient: {
    signals: AmbientSignal[];
    triggers: AmbientTrigger[];
    humanInTheLoop: HumanInTheLoopConfig;
  };
}

interface AmbientSignal {
  type:
    | "file_change"
    | "git_commit"
    | "error_detected"
    | "performance_threshold"
    | "custom";
  pattern: string;
  priority: "low" | "medium" | "high" | "critical";
  conditions: Record<string, any>;
}

interface AmbientTrigger {
  signal: string;
  action: "notify" | "question" | "review" | "auto_execute";
  parameters: Record<string, any>;
}

interface HumanInTheLoopConfig {
  notifyOnActions: string[];
  requireApprovalFor: string[];
  reviewThreshold: number;
  timeout: number;
}
```

**Response:**

```typescript
interface CreateAgentResponse {
  id: string;
  name: string;
  type: string;
  provider: string;
  status: "idle" | "busy" | "error" | "terminated";
  capabilities: string[];
  createdAt: string;
  metrics: {
    totalTasks: number;
    completedTasks: number;
    failedTasks: number;
    averageResponseTime: number;
  };
}
```

### List Agents

Retrieves a list of all ambient agents.

```http
GET /api/ambient-agents/list
```

**Query Parameters:**

- `filter`: Filter by status (`idle`, `busy`, `error`, `terminated`)
- `type`: Filter by agent type
- `provider`: Filter by provider
- `limit`: Maximum number of results (default: 50)
- `offset`: Pagination offset (default: 0)

**Response:**

```typescript
interface ListAgentsResponse {
  agents: Agent[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasNext: boolean;
  };
}
```

### Get Agent Details

Retrieves detailed information about a specific agent.

```http
GET /api/ambient-agents/{id}
```

**Response:**

```typescript
interface AgentDetailsResponse {
  id: string;
  name: string;
  type: string;
  provider: string;
  status: string;
  capabilities: string[];
  configuration: AgentConfiguration;
  ambient: AmbientConfiguration;
  metrics: AgentMetrics;
  currentTask?: CurrentTask;
  history: TaskHistory[];
  createdAt: string;
  updatedAt: string;
}

interface AgentMetrics {
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  averageResponseTime: number;
  cpuUsage: number;
  memoryUsage: number;
  successRate: number;
  uptime: number;
}

interface CurrentTask {
  id: string;
  name: string;
  progress: number;
  estimatedCompletion: string;
  priority: string;
  dependencies: string[];
}
```

### Update Agent

Updates an existing agent's configuration.

```http
PUT /api/ambient-agents/{id}
```

**Request Body:**

```typescript
interface UpdateAgentRequest {
  name?: string;
  capabilities?: string[];
  configuration?: Partial<AgentConfiguration>;
  ambient?: Partial<AmbientConfiguration>;
  status?: "idle" | "busy" | "paused" | "terminated";
}
```

### Delete Agent

Terminates and removes an agent.

```http
DELETE /api/ambient-agents/{id}
```

**Response:**

```typescript
interface DeleteAgentResponse {
  success: boolean;
  message: string;
  terminatedAt: string;
}
```

## 🎯 Task Management API

### Create Task

Creates a new task for ambient agents.

```http
POST /api/ambient-agents/tasks/create
```

**Request Body:**

```typescript
interface CreateTaskRequest {
  name: string;
  description: string;
  type:
    | "code_generation"
    | "code_review"
    | "testing"
    | "research"
    | "optimization";
  priority: "low" | "medium" | "high" | "critical";
  assignedAgent?: string;
  autoAssign?: boolean;
  dependencies: string[];
  parameters: Record<string, any>;
  ambient: {
    triggers: AmbientTrigger[];
    humanInTheLoop: HumanInTheLoopConfig;
  };
  deadline?: string;
  tags: string[];
}
```

**Response:**

```typescript
interface CreateTaskResponse {
  id: string;
  name: string;
  status: "pending" | "running" | "completed" | "failed" | "cancelled";
  assignedAgent?: string;
  progress: number;
  createdAt: string;
  estimatedCompletion?: string;
}
```

### List Tasks

Retrieves a list of tasks.

```http
GET /api/ambient-agents/tasks/list
```

**Query Parameters:**

- `status`: Filter by task status
- `assignedAgent`: Filter by assigned agent
- `priority`: Filter by priority
- `type`: Filter by task type
- `limit`: Maximum number of results
- `offset`: Pagination offset

### Get Task Details

Retrieves detailed information about a specific task.

```http
GET /api/ambient-agents/tasks/{id}
```

**Response:**

```typescript
interface TaskDetailsResponse {
  id: string;
  name: string;
  description: string;
  type: string;
  status: string;
  priority: string;
  assignedAgent?: string;
  progress: number;
  dependencies: TaskDependency[];
  results?: TaskResult[];
  logs: TaskLog[];
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  completedAt?: string;
}

interface TaskDependency {
  id: string;
  name: string;
  status: string;
  type: "prerequisite" | "resource" | "approval";
}

interface TaskResult {
  type: "code" | "file" | "report" | "data";
  content: string;
  metadata: Record<string, any>;
  createdAt: string;
}

interface TaskLog {
  level: "info" | "warn" | "error" | "debug";
  message: string;
  timestamp: string;
  context?: Record<string, any>;
}
```

### Update Task

Updates a task's status or configuration.

```http
PUT /api/ambient-agents/tasks/{id}
```

**Request Body:**

```typescript
interface UpdateTaskRequest {
  status?: "pending" | "running" | "completed" | "failed" | "cancelled";
  progress?: number;
  assignedAgent?: string;
  priority?: "low" | "medium" | "high" | "critical";
  parameters?: Record<string, any>;
  results?: TaskResult[];
}
```

### Cancel Task

Cancels a running or pending task.

```http
DELETE /api/ambient-agents/tasks/{id}
```

## 🌊 Real-time Updates API

### WebSocket Connection

Establishes a WebSocket connection for real-time updates.

```javascript
const ws = new WebSocket("wss://api.codeclone.dev/api/ambient-agents/ws");
```

**Authentication:**

```javascript
ws.send(
  JSON.stringify({
    type: "auth",
    token: "your-bearer-token",
  }),
);
```

### Event Types

#### Agent Events

```typescript
// Agent created
{
  type: 'agent.created',
  data: {
    agent: Agent,
    timestamp: string
  }
}

// Agent status changed
{
  type: 'agent.status.changed',
  data: {
    agentId: string,
    oldStatus: string,
    newStatus: string,
    timestamp: string
  }
}

// Agent metrics updated
{
  type: 'agent.metrics.updated',
  data: {
    agentId: string,
    metrics: AgentMetrics,
    timestamp: string
  }
}
```

#### Task Events

```typescript
// Task started
{
  type: 'task.started',
  data: {
    taskId: string,
    agentId: string,
    timestamp: string
  }
}

// Task progress updated
{
  type: 'task.progress',
  data: {
    taskId: string,
    progress: number,
    estimatedCompletion: string,
    timestamp: string
  }
}

// Task completed
{
  type: 'task.completed',
  data: {
    taskId: string,
    result: TaskResult,
    timestamp: string
  }
}

// Task failed
{
  type: 'task.failed',
  data: {
    taskId: string,
    error: string,
    timestamp: string
  }
}
```

#### Communication Events

```typescript
// Agent communication
{
  type: 'communication.established',
  data: {
    from: string,
    to: string,
    type: 'data' | 'command' | 'event' | 'memory',
    throughput: number,
    latency: number,
    timestamp: string
  }
}

// Memory updated
{
  type: 'memory.updated',
  data: {
    namespace: string,
    usage: MemoryUsage,
    timestamp: string
  }
}
```

#### Human-in-the-Loop Events

```typescript
// Notification
{
  type: 'hitl.notification',
  data: {
    agentId: string,
    message: string,
    priority: 'low' | 'medium' | 'high' | 'critical',
    timestamp: string
  }
}

// Question
{
  type: 'hitl.question',
  data: {
    agentId: string,
    questionId: string,
    question: string,
    options?: string[],
    timeout: number,
    timestamp: string
  }
}

// Review request
{
  type: 'hitl.review',
  data: {
    agentId: string,
    reviewId: string,
    content: any,
    type: 'code' | 'decision' | 'result',
    timestamp: string
  }
}
```

### Subscribe to Events

Subscribe to specific event types:

```javascript
ws.send(
  JSON.stringify({
    type: "subscribe",
    events: ["agent.status.changed", "task.progress", "task.completed"],
  }),
);
```

### Unsubscribe from Events

```javascript
ws.send(
  JSON.stringify({
    type: "unsubscribe",
    events: ["agent.status.changed"],
  }),
);
```

## 📊 Visualization Data API

### Get Visualization Data

Retrieves data optimized for React Flow visualization.

```http
GET /api/visualization/data
```

**Query Parameters:**

- `view`: View mode (`agent-centric`, `task-centric`, `event-centric`, `memory-centric`)
- `timeRange`: Time range for data (`1h`, `24h`, `7d`, `30d`)
- `includeInactive`: Include inactive agents (default: false)

**Response:**

```typescript
interface VisualizationDataResponse {
  nodes: VisualizationNode[];
  edges: VisualizationEdge[];
  metadata: {
    nodeCount: number;
    edgeCount: number;
    lastUpdated: string;
    timeRange: string;
  };
}

interface VisualizationNode {
  id: string;
  type: "agent" | "task" | "memory" | "event";
  position: { x: number; y: number };
  data: Record<string, any>;
  style?: Record<string, any>;
}

interface VisualizationEdge {
  id: string;
  source: string;
  target: string;
  type: "communication" | "dependency" | "data-flow";
  data: Record<string, any>;
  animated?: boolean;
  style?: Record<string, any>;
}
```

### Update Layout

Updates the layout configuration for visualization.

```http
POST /api/visualization/layout
```

**Request Body:**

```typescript
interface UpdateLayoutRequest {
  algorithm: "hierarchical" | "force-directed" | "circular" | "custom";
  parameters: {
    nodeSpacing?: number;
    edgeLength?: number;
    gravity?: number;
    iterations?: number;
  };
  viewMode:
    | "agent-centric"
    | "task-centric"
    | "event-centric"
    | "memory-centric";
}
```

## 🔧 Error Handling

### Error Response Format

All API errors follow a consistent format:

```typescript
interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, any>;
    timestamp: string;
    requestId: string;
  };
}
```

### Common Error Codes

- `AGENT_NOT_FOUND`: Agent with specified ID not found
- `TASK_NOT_FOUND`: Task with specified ID not found
- `INVALID_CONFIGURATION`: Invalid agent or task configuration
- `RESOURCE_LIMIT_EXCEEDED`: Maximum number of agents or tasks exceeded
- `AUTHENTICATION_FAILED`: Invalid or expired authentication token
- `PERMISSION_DENIED`: Insufficient permissions for operation
- `RATE_LIMIT_EXCEEDED`: Too many requests
- `INTERNAL_ERROR`: Internal server error

### HTTP Status Codes

- `200 OK`: Successful operation
- `201 Created`: Resource created successfully
- `400 Bad Request`: Invalid request parameters
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: Permission denied
- `404 Not Found`: Resource not found
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error

## 🚀 Rate Limiting

API endpoints are rate-limited to ensure fair usage:

- **Standard endpoints**: 100 requests per minute per user
- **Real-time endpoints**: 1000 requests per minute per user
- **WebSocket connections**: 10 concurrent connections per user

Rate limit headers are included in responses:

- `X-RateLimit-Limit`: Maximum requests per window
- `X-RateLimit-Remaining`: Remaining requests in current window
- `X-RateLimit-Reset`: Time when rate limit resets

## 📚 SDK Examples

### JavaScript/TypeScript SDK

```typescript
import { AmbientAgentsClient } from "@codeclone/ambient-agents-sdk";

const client = new AmbientAgentsClient({
  apiKey: "your-api-key",
  baseUrl: "https://api.codeclone.dev/v1",
});

// Create an agent
const agent = await client.agents.create({
  name: "Code Reviewer",
  type: "reviewer",
  provider: "claude",
  capabilities: ["code-review", "security-analysis"],
  ambient: {
    signals: [
      {
        type: "git_commit",
        pattern: "*.ts",
        priority: "medium",
        conditions: { branch: "main" },
      },
    ],
    triggers: [
      {
        signal: "git_commit",
        action: "review",
        parameters: { autoApprove: false },
      },
    ],
  },
});

// Subscribe to real-time updates
client.realtime.subscribe(
  ["agent.status.changed", "task.completed"],
  (event) => {
    console.log("Received event:", event);
  },
);
```

This API specification provides a comprehensive foundation for building ambient agents with real-time visualization capabilities.
