/**
 * Agent Memory System
 *
 * A comprehensive memory system for AI agents with vector embeddings,
 * semantic search, context management, and knowledge sharing capabilities.
 */

export { memoryContextManager } from "./context-manager";
export { memoryLifecycleManager } from "./lifecycle-manager";
// Main system
export { AgentMemorySystem, agentMemorySystem } from "./memory-system";
// Services
export { memoryRepository } from "./repository";
export { memorySearchService } from "./search-service";
export { memorySharingService } from "./sharing-service";
export { memorySuggestionEngine } from "./suggestion-engine";

// Types
export type {
	ConflictResolutionStrategy,
	// Input/Output types
	UpdateMemoryInput,
} from "./types";
