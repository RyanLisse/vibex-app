# Redis/Valkey Evaluation for CodeClone Ambient Agents

## Executive Summary

This document evaluates Redis and Valkey for the CodeClone project with ambient agents and React Flow visualization, considering the current state (July 2025) and specific project requirements.

## 🎯 Identified Use Cases

### 1. Real-time Data Management

- **WebSocket Connection State**: Managing 1000+ concurrent WebSocket connections
- **Agent State Synchronization**: Keeping agent states consistent across multiple servers
- **Task Queue Management**: Distributed task queue for ambient agents
- **Event Stream Processing**: Real-time event streaming for visualization updates

### 2. Caching Layer

- **API Response Caching**: Cache expensive AI model responses
- **Visualization Data Caching**: Cache computed layouts and node positions
- **Session Data**: Fast access to user sessions and auth tokens
- **Computed Metrics**: Cache agent performance metrics and aggregations

### 3. Pub/Sub Communication

- **Agent Coordination**: Inter-agent communication channels
- **Real-time Updates**: Broadcasting state changes to all connected clients
- **Event Distribution**: Distributing ambient signals across the system
- **Human-in-the-Loop Events**: Managing notification/question/review queues

### 4. Persistent Storage Augmentation

- **Hot Data Layer**: Frequently accessed agent configurations
- **Time-Series Data**: Recent performance metrics and events
- **Temporary Data**: WebSocket session data and temporary computations
- **Rate Limiting**: API and WebSocket connection rate limiting

## 📊 Performance Requirements Analysis

Based on the enhanced architecture specifications:

### Target Metrics

- **Latency**: < 50ms for WebSocket updates (requires < 5ms Redis operations)
- **Throughput**: 1000+ updates per second
- **Connections**: 1000+ concurrent WebSocket connections
- **Data Volume**: ~500MB active data in memory
- **Availability**: 99.9% uptime requirement

### Current Bottlenecks

1. **Zustand + localStorage**: Not suitable for multi-instance scaling
2. **In-memory state**: Lost on server restart
3. **No pub/sub**: Difficult to broadcast updates efficiently
4. **Limited caching**: Repeated expensive computations

## 🔍 Redis vs Valkey Comparison (July 2025 Update)

### Valkey Advantages for This Project

1. **Open Source**: BSD 3-clause license - no licensing concerns
2. **Better Multithreading**: Enhanced I/O threading ideal for high WebSocket concurrency
3. **Performance**: Up to 832K RPS with proper configuration
4. **Community Support**: Backed by AWS, Google Cloud, Oracle
5. **Cluster Features**: Automatic failover and improved scaling

### Redis Advantages

1. **Maturity**: More established ecosystem
2. **Documentation**: Extensive documentation and tutorials
3. **Client Libraries**: Better client library support
4. **Enterprise Features**: Advanced features in Redis Enterprise

### Recommendation: **Valkey**

Given the open-source nature of CodeClone and the performance requirements, Valkey is the better choice for this project.

## 🏗️ Proposed Architecture

### 1. Caching Strategy

```typescript
// Cache Layers Configuration
const cacheConfig = {
  layers: {
    L1: {
      name: "In-Memory Cache",
      implementation: "Node.js Map with LRU",
      ttl: 60, // seconds
      maxSize: 100, // MB
      use: ["hot paths", "active agent states"],
    },
    L2: {
      name: "Valkey Cache",
      implementation: "Valkey Cluster",
      ttl: 3600, // 1 hour
      maxSize: 2048, // MB
      use: ["session data", "API responses", "computed metrics"],
    },
    L3: {
      name: "Database",
      implementation: "PostgreSQL/MongoDB",
      ttl: Infinity,
      use: ["persistent data", "historical records"],
    },
  },
};
```

### 2. Valkey Cluster Configuration

```yaml
# valkey-cluster.yml
topology:
  mode: cluster
  nodes: 6 # 3 masters, 3 replicas
  sharding: automatic

performance:
  io-threads: 6
  io-threads-do-reads: yes
  tcp-backlog: 511
  tcp-keepalive: 300

memory:
  maxmemory: 2gb
  maxmemory-policy: allkeys-lru

persistence:
  save: "900 1 300 10 60 10000"
  appendonly: yes
  appendfsync: everysec
```

### 3. Data Models

```typescript
// Agent State in Valkey
interface ValkeyAgentState {
  key: `agent:${string}`; // agent:agent-123
  value: {
    id: string;
    status: "idle" | "busy" | "error" | "terminated";
    currentTask?: string;
    metrics: {
      totalTasks: number;
      completedTasks: number;
      cpuUsage: number;
      memoryUsage: number;
    };
    lastHeartbeat: number;
  };
  ttl: 300; // 5 minutes
}

// WebSocket Session
interface ValkeyWebSocketSession {
  key: `ws:session:${string}`; // ws:session:abc123
  value: {
    userId: string;
    connectedAt: number;
    subscriptions: string[];
    metadata: Record<string, any>;
  };
  ttl: 3600; // 1 hour
}

// Task Queue
interface ValkeyTaskQueue {
  key: "tasks:queue";
  type: "list";
  operations: ["LPUSH", "BRPOP"];
}

// Pub/Sub Channels
interface ValkeyPubSubChannels {
  "agent:updates": AgentUpdateEvent;
  "task:updates": TaskUpdateEvent;
  "visualization:updates": VisualizationUpdateEvent;
  "hitl:notifications": HumanInTheLoopEvent;
}
```

### 4. Implementation Architecture

```typescript
// Valkey Client Singleton
import { createClient, RedisClientType } from "valkey";

class ValkeyManager {
  private client: RedisClientType;
  private subscriber: RedisClientType;
  private publisher: RedisClientType;

  constructor() {
    const config = {
      socket: {
        host: process.env.VALKEY_HOST || "localhost",
        port: parseInt(process.env.VALKEY_PORT || "6379"),
      },
      password: process.env.VALKEY_PASSWORD,
      database: parseInt(process.env.VALKEY_DB || "0"),
    };

    this.client = createClient(config);
    this.subscriber = this.client.duplicate();
    this.publisher = this.client.duplicate();
  }

  // Cache operations
  async cacheSet(key: string, value: any, ttl?: number) {
    const serialized = JSON.stringify(value);
    if (ttl) {
      await this.client.setEx(key, ttl, serialized);
    } else {
      await this.client.set(key, serialized);
    }
  }

  async cacheGet<T>(key: string): Promise<T | null> {
    const value = await this.client.get(key);
    return value ? JSON.parse(value) : null;
  }

  // Pub/Sub operations
  async publish(channel: string, message: any) {
    await this.publisher.publish(channel, JSON.stringify(message));
  }

  async subscribe(channel: string, handler: (message: any) => void) {
    await this.subscriber.subscribe(channel, (message) => {
      handler(JSON.parse(message));
    });
  }

  // Distributed locks
  async acquireLock(
    resource: string,
    ttl: number = 5000,
  ): Promise<string | null> {
    const token = crypto.randomUUID();
    const result = await this.client.set(`lock:${resource}`, token, {
      NX: true,
      PX: ttl,
    });
    return result === "OK" ? token : null;
  }

  async releaseLock(resource: string, token: string): Promise<boolean> {
    const script = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
    `;
    const result = await this.client.eval(script, {
      keys: [`lock:${resource}`],
      arguments: [token],
    });
    return result === 1;
  }
}

export const valkeyManager = new ValkeyManager();
```

### 5. WebSocket Scaling with Valkey

```typescript
// WebSocket Manager with Valkey
class ScalableWebSocketManager {
  private connections: Map<string, WebSocket> = new Map();

  async handleConnection(ws: WebSocket, userId: string) {
    const sessionId = crypto.randomUUID();

    // Store session in Valkey
    await valkeyManager.cacheSet(
      `ws:session:${sessionId}`,
      { userId, connectedAt: Date.now() },
      3600, // 1 hour TTL
    );

    // Subscribe to user's channels
    await valkeyManager.subscribe(`user:${userId}:updates`, (message) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
      }
    });

    // Handle disconnection
    ws.on("close", async () => {
      await valkeyManager.del(`ws:session:${sessionId}`);
      this.connections.delete(sessionId);
    });

    this.connections.set(sessionId, ws);
  }

  // Broadcast to all instances
  async broadcast(channel: string, message: any) {
    await valkeyManager.publish(channel, message);
  }
}
```

### 6. Session Management

```typescript
// Session Store with Valkey
class ValkeySessionStore {
  private prefix = "session:";
  private ttl = 86400; // 24 hours

  async get(sessionId: string): Promise<Session | null> {
    return await valkeyManager.cacheGet(`${this.prefix}${sessionId}`);
  }

  async set(sessionId: string, session: Session): Promise<void> {
    await valkeyManager.cacheSet(
      `${this.prefix}${sessionId}`,
      session,
      this.ttl,
    );
  }

  async destroy(sessionId: string): Promise<void> {
    await valkeyManager.del(`${this.prefix}${sessionId}`);
  }

  async touch(sessionId: string): Promise<void> {
    await valkeyManager.expire(`${this.prefix}${sessionId}`, this.ttl);
  }
}
```

## 📊 Observability Integration

### OpenReplay vs Sentry Comparison

#### Current Sentry Coverage

- ✅ Error tracking and reporting
- ✅ Performance monitoring
- ✅ Release tracking
- ✅ User context
- ❌ Session replay
- ❌ User journey visualization
- ❌ Heatmaps and click tracking

#### OpenReplay Advantages

- **Session Replay**: Full video replay of user sessions
- **Network Monitoring**: Track API calls and WebSocket messages
- **Redux/State Debugging**: Inspect state changes over time
- **Console Logs**: Capture frontend console output
- **Performance Metrics**: Detailed performance waterfall
- **Privacy First**: Self-hosted option available

#### Integration Recommendation

Use **both** Sentry and OpenReplay for comprehensive observability:

- **Sentry**: Error tracking, performance monitoring, alerting
- **OpenReplay**: Session replay, user behavior analysis, debugging

### OpenReplay Integration

```typescript
// OpenReplay Configuration
import OpenReplay from "@openreplay/tracker";
import trackerAssist from "@openreplay/tracker-assist";

const tracker = new OpenReplay({
  projectKey: process.env.NEXT_PUBLIC_OPENREPLAY_KEY,
  ingestPoint: process.env.NEXT_PUBLIC_OPENREPLAY_INGEST,
  // Privacy settings
  obscureTextEmails: true,
  obscureTextNumbers: true,
  obscureInputEmails: true,
  // Performance settings
  capturePerformance: true,
  __DISABLE_SECURE_MODE: process.env.NODE_ENV === "development",
});

// Enhanced tracking for ambient agents
tracker.use(
  trackerAssist({
    socket: true, // Track WebSocket connections
    fetch: true, // Track API calls
    axiosInstances: [], // If using axios
  }),
);

// Custom events for agent visualization
export const trackAgentEvent = (event: string, data: any) => {
  tracker.event(event, data);
};

// Track React Flow interactions
export const trackVisualizationInteraction = (
  action: string,
  nodeType: string,
  metadata: any,
) => {
  tracker.event("visualization_interaction", {
    action,
    nodeType,
    ...metadata,
  });
};
```

## 🚀 Implementation Plan

### Phase 1: Infrastructure Setup (Week 1)

1. Deploy Valkey cluster (3 masters, 3 replicas)
2. Set up monitoring and alerting
3. Configure backup and persistence
4. Implement connection pooling

### Phase 2: Core Integration (Week 2)

1. Implement ValkeyManager singleton
2. Migrate session storage from Zustand
3. Implement pub/sub for WebSocket scaling
4. Add caching layer for API responses

### Phase 3: Advanced Features (Week 3)

1. Implement distributed locks for agent coordination
2. Add rate limiting with sliding windows
3. Implement task queue with priorities
4. Add circuit breakers for resilience

### Phase 4: Observability (Week 4)

1. Integrate OpenReplay for session replay
2. Add custom events for agent interactions
3. Set up performance dashboards
4. Configure alerting rules

## 📈 Expected Benefits

### Performance Improvements

- **50% reduction** in API response times with caching
- **10x increase** in WebSocket connection capacity
- **Sub-5ms** pub/sub latency for real-time updates
- **99.9%** uptime with cluster redundancy

### Scalability Benefits

- Horizontal scaling across multiple servers
- Stateless application servers
- Efficient resource utilization
- Better load distribution

### Developer Experience

- Simplified state management
- Better debugging with OpenReplay
- Consistent data across instances
- Easier testing with Redis mocks

## 🔧 Configuration Requirements

### Environment Variables

```bash
# Valkey Configuration
VALKEY_HOST=localhost
VALKEY_PORT=6379
VALKEY_PASSWORD=your-secure-password
VALKEY_CLUSTER_NODES=node1:6379,node2:6379,node3:6379
VALKEY_DB=0

# OpenReplay Configuration
NEXT_PUBLIC_OPENREPLAY_KEY=your-project-key
NEXT_PUBLIC_OPENREPLAY_INGEST=https://openreplay.your-domain.com/ingest
```

### Docker Compose Setup

```yaml
version: "3.8"

services:
  valkey-master-1:
    image: valkey/valkey:8.0-alpine
    command: valkey-server /etc/valkey/valkey.conf
    volumes:
      - ./valkey-master-1.conf:/etc/valkey/valkey.conf
      - valkey-master-1-data:/data
    ports:
      - "6379:6379"
    networks:
      - valkey-net

  valkey-replica-1:
    image: valkey/valkey:8.0-alpine
    command: valkey-server /etc/valkey/valkey.conf --replicaof valkey-master-1 6379
    volumes:
      - ./valkey-replica-1.conf:/etc/valkey/valkey.conf
      - valkey-replica-1-data:/data
    depends_on:
      - valkey-master-1
    networks:
      - valkey-net

  # Add more masters and replicas as needed

volumes:
  valkey-master-1-data:
  valkey-replica-1-data:

networks:
  valkey-net:
    driver: bridge
```

## 🎯 Success Metrics

### Technical Metrics

- Cache hit rate > 80%
- P99 latency < 100ms
- Zero message loss in pub/sub
- < 1% error rate

### Business Metrics

- 50% reduction in infrastructure costs
- 3x improvement in concurrent user capacity
- 90% reduction in debugging time with session replay
- 99.9% uptime SLA achievement

This comprehensive evaluation and implementation plan provides a clear path for integrating Valkey and enhancing observability in the CodeClone project with ambient agents.
