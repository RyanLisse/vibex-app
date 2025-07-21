# Terragon Labs Integration Guide

This guide provides comprehensive documentation for the Terragon Labs features integrated into the Vibex platform.

## Overview

Terragon Labs provides enterprise-grade AI agent orchestration and container-based development environments. This integration brings advanced capabilities for managing AI agents at scale.

## Features

### 1. Container-Use Integration

The Container-Use Integration module provides isolated serverless environments for AI agents using Modal Labs.

#### Key Components

- **ModalFunctionManager**: Manages Modal Labs serverless functions for agent isolation
- **GitWorktreeManager**: Handles Git worktrees for parallel development workflows
- **MultiSourceTaskCreator**: Creates tasks from various input sources
- **ContainerUseIntegration**: Orchestrates complete agent workflows

#### Setup

```bash
# Install Modal Labs dependencies
bun add @modal-labs/modal

# Configure environment variables
MODAL_API_KEY=your_modal_api_key
MODAL_WORKSPACE=your_workspace_name
```

#### Usage

```typescript
import { ContainerUseIntegration } from '@/lib/container-use-integration';

const integration = new ContainerUseIntegration({
  modal: {
    apiKey: process.env.MODAL_API_KEY!,
    workspace: 'your-workspace',
  },
  git: {
    repositoryPath: '/path/to/repo',
    baseBranch: 'main',
    worktreeBaseDir: '/tmp/worktrees',
  },
});

// Create agent task from GitHub issue
const result = await integration.createAgentTask({
  source: 'issue',
  sourceData: {
    id: 123,
    title: 'Add authentication',
    body: 'Implement JWT-based auth',
    repository: { full_name: 'org/repo' },
  },
});
```

### 2. Ambient Agent Visualization

Real-time visualization system for monitoring AI agent workflows using React Flow.

#### Features

- **Real-time Dashboard**: Interactive visualization of agent activities
- **Performance Monitoring**: Live tracking of resource usage
- **Event Stream**: Continuous event flow visualization
- **Custom Node Types**: Agent, Task, Event, and Memory nodes
- **Animated Edges**: Data flow visualization with real-time metrics

#### Access

Navigate to `/ambient-agents` in your browser to access the visualization dashboard.

#### API Endpoints

- `GET /api/ambient-agents` - Fetch agent data
- `GET /api/ambient-agents/sse` - Server-Sent Events for real-time updates

### 3. Voice & Audio Integration

Advanced voice interaction capabilities powered by Google's Gemini models.

#### Features

- **Real-time Audio Chat**: Direct voice interaction with AI models
- **Speech-to-Text**: Voice command processing for task creation
- **Audio Playback**: Integrated controls for AI-generated audio responses
- **Voice Brainstorming**: Collaborative voice-based ideation sessions

#### Setup

```bash
# Configure Google AI API key
GOOGLE_AI_API_KEY=your_google_ai_api_key
```

#### Usage

Access voice features at `/voice-brainstorm` or through the main chat interface.

### 4. Enterprise Observability

Comprehensive monitoring and alerting system with Sentry integration.

#### Components

- **Winston + Sentry Logging**: Centralized logging with automatic error capture
- **Performance Monitoring**: Real-time performance metrics
- **Alert System**: Multi-channel alerting (Slack, email, webhooks)
- **OpenTelemetry**: Distributed tracing and custom metrics

#### Configuration

```bash
# Sentry Configuration
NEXT_PUBLIC_SENTRY_DSN=https://your-dsn@sentry.io/project-id
SENTRY_ORG=your-sentry-org
SENTRY_PROJECT=your-sentry-project
SENTRY_AUTH_TOKEN=your-sentry-auth-token

# Alert System
ALERTS_ENABLED=true
ALERTS_SLACK_WEBHOOK_URL=your_slack_webhook
ALERTS_EMAIL_FROM=alerts@yourcompany.com
```

## Architecture

### System Components

```
Terragon Integration Layer
├── Container-Use Integration     # Modal Labs serverless environments
│   ├── ModalFunctionManager     # Function lifecycle management
│   ├── GitWorktreeManager       # Parallel development workflows
│   └── MultiSourceTaskCreator   # Task creation from various sources
├── Ambient Agent System         # Real-time visualization
│   ├── VisualizationEngine      # React Flow-based dashboard
│   ├── Real-time Data Hooks     # Server-Sent Events integration
│   └── Custom Node Components   # Agent/Task/Event/Memory nodes
├── Voice & Audio System         # Voice interaction capabilities
│   ├── Gemini Audio Chat        # Real-time voice with AI
│   ├── Speech Processing        # Voice command recognition
│   └── Audio Controls           # Playback and recording
└── Enterprise Observability     # Monitoring and alerting
    ├── Sentry Integration       # Error tracking and performance
    ├── Winston Logging          # Centralized log management
    ├── Alert System            # Multi-channel notifications
    └── OpenTelemetry            # Distributed tracing
```

### Data Flow

1. **Task Creation**: Multi-source input (GitHub issues, voice, screenshots) → Task processing
2. **Agent Orchestration**: Tasks → Modal Labs containers → Isolated execution environments
3. **Real-time Updates**: Agent activities → Server-Sent Events → Live dashboard updates
4. **Observability**: All activities → Logging/Monitoring → Alerts/Dashboards

## API Reference

### Container Integration API

```typescript
// Create agent environment
POST /api/environments
{
  "taskId": "task-123",
  "config": {
    "cpu": 2,
    "memory": 4096,
    "timeout": 3600
  }
}

// Execute function in environment
POST /api/environments/{id}/execute
{
  "command": "npm install && npm test",
  "timeout": 300
}
```

### Ambient Agents API

```typescript
// Get agent data
GET /api/ambient-agents?swarmId=swarm-123

// Subscribe to real-time updates
GET /api/ambient-agents/sse?swarmId=swarm-123
```

### Agent Memory API

```typescript
// Store agent memory
POST /api/agent-memory
{
  "agentId": "agent-123",
  "namespace": "project-context",
  "data": { "key": "value" }
}

// Search agent memory
GET /api/agent-memory/search?agentId=agent-123&query=authentication
```

## Best Practices

### Performance Optimization

1. **Container Management**
   - Monitor resource usage in Modal dashboard
   - Set appropriate timeout values
   - Use cost optimization strategies

2. **Real-time Updates**
   - Implement proper cleanup for SSE connections
   - Use filtering to limit data flow
   - Monitor memory usage in browsers

3. **Voice Features**
   - Ensure HTTPS for microphone access
   - Handle network interruptions gracefully
   - Implement audio compression for better performance

### Security Considerations

1. **API Keys Management**
   - Store sensitive keys in environment variables
   - Use different keys for development and production
   - Implement key rotation policies

2. **Container Security**
   - Limit container permissions appropriately
   - Monitor for suspicious activities
   - Implement proper authentication for container access

3. **Data Privacy**
   - Ensure voice data is processed securely
   - Implement proper data retention policies
   - Use encryption for sensitive data transmission

## Troubleshooting

### Common Issues

1. **Modal Labs Connection Issues**
   ```bash
   # Test Modal connection
   modal token set your_token_here
   modal app list
   ```

2. **Voice Features Not Working**
   - Ensure HTTPS connection
   - Check microphone permissions
   - Verify Google AI API key

3. **Visualization Performance**
   - Clear browser cache
   - Check SSE connection in dev tools
   - Monitor React Flow performance

### Debug Commands

```bash
# Check Terragon integration status
bun run debug:terragon-status

# Test voice features
bun run demo:voice-brainstorm

# Monitor agent activities
bun run debug:agent-monitor
```

## Support

For Terragon-specific support:

- **Documentation**: Check `/docs/TERRAGON_INTEGRATION.md`
- **Issues**: Report integration issues with `[Terragon]` tag
- **Performance**: Monitor via Sentry dashboard
- **Alerts**: Configure multi-channel notifications

---

**Terragon Labs Integration** - Enterprise AI Agent Orchestration Platform