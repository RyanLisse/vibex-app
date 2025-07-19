# Agent Memory System

A comprehensive memory system for AI agents with vector embeddings, semantic search, context management, and knowledge sharing capabilities.

## Features

- **Vector Embeddings**: Semantic search using pgvector and WASM-optimized operations
- **Context Management**: Session-based memory contexts with relevant memory retrieval
- **Knowledge Sharing**: Cross-agent memory sharing and knowledge transfer
- **Lifecycle Management**: Automatic expiration, archival, and importance optimization
- **Smart Suggestions**: Context-aware memory recommendations using multiple strategies
- **Performance Optimized**: Caching, batch operations, and WASM acceleration

## Architecture

```
lib/agent-memory/
├── index.ts              # Main exports
├── types.ts              # TypeScript types and interfaces
├── memory-system.ts      # Main system interface
├── repository.ts         # Database operations
├── search-service.ts     # Semantic and text search
├── context-manager.ts    # Context building and management
├── sharing-service.ts    # Cross-agent knowledge sharing
├── lifecycle-manager.ts  # Memory expiration and archival
└── suggestion-engine.ts  # Intelligent memory suggestions
```

## Usage

### Basic Usage

```typescript
import { agentMemorySystem } from '@/lib/agent-memory'

// Initialize the system
await agentMemorySystem.initialize()

// Store a memory
const memory = await agentMemorySystem.storeMemory({
  agentType: 'task_executor',
  contextKey: 'project_setup',
  content: 'Successfully configured Docker environment with PostgreSQL and Redis',
  metadata: {
    type: 'task_execution',
    source: 'agent',
    confidence: 0.95,
    tags: ['docker', 'setup', 'infrastructure'],
    context: { project: 'my-app' },
    relatedMemories: [],
    accessPattern: 'recent',
  },
  importance: 7,
})

// Search memories
const results = await agentMemorySystem.searchMemories('Docker configuration', {
  agentType: 'task_executor',
  limit: 10,
  useSemanticSearch: true,
})

// Get memory context for a session
const context = await agentMemorySystem.getMemoryContext(
  'task_executor',
  'project_setup',
  {
    sessionId: 'session-123',
    currentTask: 'Deploy application',
    userContext: { skill_level: 'intermediate' },
  }
)

// Get memory suggestions
const suggestions = await agentMemorySystem.getMemorySuggestions(context, {
  maxSuggestions: 5,
  minConfidence: 0.7,
})
```

### Memory Types

```typescript
type MemoryType =
  | 'conversation'       // Dialog and interaction history
  | 'task_execution'     // Task completion records
  | 'user_preference'    // User-specific preferences
  | 'learned_pattern'    // Discovered patterns and insights
  | 'error_resolution'   // Error fixes and solutions
  | 'context_summary'    // Summarized contexts
  | 'knowledge_base'     // General knowledge
  | 'skill_acquisition'  // Learned skills and capabilities
```

### Memory Sharing

```typescript
// Share memory with specific agents
await agentMemorySystem.shareMemory(memory, ['workflow_orchestrator', 'code_analyzer'])

// Cross-pollinate knowledge between agents
const sharedCount = await agentMemorySystem.crossPollinate(
  'task_executor',
  'workflow_orchestrator',
  {
    query: 'deployment strategies',
    types: ['learned_pattern', 'knowledge_base'],
    minImportance: 6,
  }
)

// Register custom sharing configuration
agentMemorySystem.registerSharingConfig({
  sourceAgentType: 'code_analyzer',
  targetAgentTypes: ['task_executor', 'test_runner'],
  memoryTypes: ['error_resolution', 'learned_pattern'],
  minImportance: 5,
  transformRules: [
    { field: 'content', from: /internal/g, to: 'external' }
  ],
})
```

### Memory Lifecycle

```typescript
// Set memory expiration
await agentMemorySystem.setMemoryExpiration('memory-id', new Date('2024-12-31'))

// Extend memory lifetime
await agentMemorySystem.extendMemoryLifetime('memory-id', 30) // 30 days

// Promote important memory
await agentMemorySystem.promoteMemory('memory-id', 9) // Importance 9

// Run maintenance manually
const results = await agentMemorySystem.runMaintenance()
console.log(`Expired: ${results.expired}, Archived: ${results.archived}`)
```

### Advanced Search

```typescript
// Semantic search with filters
const results = await agentMemorySystem.searchMemories('error handling patterns', {
  agentType: 'task_executor',
  types: ['error_resolution', 'learned_pattern'],
  importance: { min: 5, max: 10 },
  tags: ['javascript', 'async'],
  orderBy: 'relevance',
  limit: 20,
})

// Find similar memories
const similar = await agentMemorySystem.findSimilarMemories('memory-id', {
  limit: 10,
  threshold: 0.8,
})
```

### Memory Context

```typescript
// Get full context with suggestions
const context = await agentMemorySystem.getMemoryContext(
  'workflow_orchestrator',
  'deployment_workflow',
  {
    currentTask: 'Deploy to production',
    environmentContext: {
      environment: 'production',
      hasRecentErrors: true,
      currentTool: 'kubernetes',
    },
  }
)

// Update context dynamically
const updatedContext = await agentMemorySystem.updateMemoryContext(context, {
  currentTask: 'Monitor deployment',
  userContext: { alert_preferences: 'critical_only' },
})
```

## Configuration

```typescript
const config = {
  vectorDimensions: 1536,           // Embedding dimensions
  semanticSearchThreshold: 0.7,     // Similarity threshold
  maxMemoriesPerAgent: 10000,       // Max memories per agent
  memoryExpirationDays: 90,         // Default expiration
  archiveAfterDays: 30,             // Archive threshold
  enableAutoSummarization: true,    // Auto-summarize contexts
  enableCrossPollination: true,     // Share between agents
  cacheConfig: {
    enabled: true,
    ttl: 5 * 60 * 1000,            // 5 minutes
    maxSize: 1000,
  },
}

const memorySystem = AgentMemorySystem.getInstance(config)
```

## Performance Considerations

1. **Vector Search**: Uses pgvector with HNSW indexing for fast similarity search
2. **Caching**: Multiple levels of caching for search results and contexts
3. **Batch Operations**: Support for bulk memory operations
4. **WASM Optimization**: Leverages WebAssembly for embedding generation
5. **Lazy Loading**: Context and suggestions are loaded on-demand

## Database Schema

The system uses the `agentMemory` table with the following structure:

```sql
CREATE TABLE agent_memory (
  id UUID PRIMARY KEY,
  agent_type VARCHAR(100) NOT NULL,
  context_key VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  embedding VECTOR(1536),
  importance INTEGER DEFAULT 1,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  last_accessed_at TIMESTAMP DEFAULT NOW(),
  access_count INTEGER DEFAULT 0,
  expires_at TIMESTAMP,
  
  -- Indexes for performance
  INDEX agent_memory_agent_type_idx (agent_type),
  INDEX agent_memory_context_key_idx (context_key),
  INDEX agent_memory_embedding_idx USING hnsw (embedding),
  INDEX agent_memory_importance_idx (importance),
  INDEX agent_memory_last_accessed_idx (last_accessed_at),
  
  -- Unique constraint
  UNIQUE agent_memory_agent_context_unique (agent_type, context_key)
);
```

## Observability

All operations are tracked through the observability system:

- Operation metrics (latency, success rate)
- Memory access patterns
- Search performance
- Sharing statistics
- Lifecycle events

## Testing

Run the test suite:

```bash
bun test lib/agent-memory
```

## Best Practices

1. **Memory Types**: Use appropriate memory types for better organization
2. **Importance Levels**: Set importance (1-10) based on long-term value
3. **Context Keys**: Use meaningful context keys for grouping related memories
4. **Tags**: Add relevant tags for improved searchability
5. **Expiration**: Set expiration for temporary memories
6. **Sharing**: Configure sharing rules for knowledge transfer
7. **Maintenance**: Let the system run automatic maintenance

## Future Enhancements

- [ ] LLM-based summarization for context generation
- [ ] Advanced embedding models support
- [ ] Memory compression for old entries
- [ ] Distributed memory across multiple databases
- [ ] Real-time memory synchronization
- [ ] Memory versioning and history tracking