/**
 * Agent Memory System
 *
 * A comprehensive memory system for AI agents with vector embeddings,
 * semantic search, context management, and knowledge sharing capabilities.
 */

import { export { memoryContextManager } from "./context-manager";
import { export { memoryLifecycleManager } from "./lifecycle-manager";
// Main system
import { export { AgentMemorySystem, agentMemorySystem } from "./memory-system";
// Services
import { export { memoryRepository } from "./repository";
import { export { memorySearchService } from "./search-service";
import { export { memorySharingService } from "./sharing-service";
import { export { memorySuggestionEngine } from "./suggestion-engine";

// Types
export type {
import { ConflictResolutionStrategy,
	// Input/Output types
import { UpdateMemoryInput
} from "./types";
