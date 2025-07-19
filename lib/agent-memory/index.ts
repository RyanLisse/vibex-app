/**
 * Agent Memory System
 *
 * A comprehensive memory system for AI agents with vector embeddings,
 * semantic search, context management, and knowledge sharing capabilities.
 */

// Main system
export { AgentMemorySystem, agentMemorySystem } from './memory-system'

// Services
export { memoryRepository } from './repository'
export { memorySearchService } from './search-service'
export { memoryContextManager } from './context-manager'
export { memorySharingService } from './sharing-service'
export { memoryLifecycleManager } from './lifecycle-manager'
export { memorySuggestionEngine } from './suggestion-engine'

// Types
export type {
  // Memory types
  MemoryType,
  MemoryImportance,
  MemoryAccessPattern,
  MemoryMetadata,
  MemoryEntry,
  // Input/Output types
  CreateMemoryInput,
  UpdateMemoryInput,
  MemorySearchOptions,
  MemorySearchResult,
  MemoryContext,
  MemorySuggestion,
  // Configuration types
  MemorySystemConfig,
  MemorySharingConfig,
  MemoryTransformRule,
  MemoryMergeConfig,
  ConflictResolutionStrategy,
  // Analytics types
  MemoryAnalytics,
  MemoryLifecycleEvent,
  MemoryBatchResult,
  MemoryPerformanceMetrics,
  // Import/Export types
  MemoryExportFormat,
  MemoryImportOptions,
} from './types'
