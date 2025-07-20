/**
 * Agent Memory System Types
 *
 * Defines types and interfaces for the agent memory system,
 * matching the database schema and providing type safety.
 */

import type { AgentMemory as DbAgentMemory } from "@/db/schema";

// Memory types based on agent context
export type MemoryType =
	| "conversation"
	| "task_execution"
	| "user_preference"
	| "learned_pattern"
	| "error_resolution"
	| "context_summary"
	| "knowledge_base"
	| "skill_acquisition";

// Memory importance levels
export type MemoryImportance = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

// Memory access patterns
export type MemoryAccessPattern =
	| "frequent"
	| "recent"
	| "contextual"
	| "archived";

// Memory metadata structure
export interface MemoryMetadata {
	type: MemoryType;
	source: string;
	confidence: number;
	tags: string[];
	context: Record<string, any>;
	relatedMemories: string[];
	accessPattern: MemoryAccessPattern;
	sessionId?: string;
	userId?: string;
}

// Memory entry interface extending database schema
export interface MemoryEntry extends Omit<DbAgentMemory, "metadata"> {
	metadata: MemoryMetadata;
}

// Memory search options
export interface MemorySearchOptions {
	query?: string;
	agentType?: string;
	contextKey?: string;
	types?: MemoryType[];
	importance?: {
		min?: number;
		max?: number;
	};
	tags?: string[];
	limit?: number;
	offset?: number;
	threshold?: number;
	useSemanticSearch?: boolean;
	includeArchived?: boolean;
	includeExpired?: boolean;
	orderBy?: "relevance" | "recency" | "importance" | "access_frequency";
}

// Memory context for agent sessions
export interface MemoryContext {
	agentType: string;
	contextKey: string;
	sessionId?: string;
	currentTask?: string;
	userContext: Record<string, any>;
	environmentContext: Record<string, any>;
	recentMemories: MemoryEntry[];
	relevantMemories: MemoryEntry[];
	sharedMemories: MemoryEntry[];
	summary: string;
	suggestions: MemorySuggestion[];
}

// Memory suggestion interface
export interface MemorySuggestion {
	memory: MemoryEntry;
	reason: string;
	relevanceScore: number;
	confidence: number;
}

// Memory creation input
export interface CreateMemoryInput {
	agentType: string;
	contextKey: string;
	content: string;
	embedding?: number[];
	metadata: MemoryMetadata;
	importance?: MemoryImportance;
	expiresAt?: Date;
}

// Memory update input
export interface UpdateMemoryInput {
	content?: string;
	embedding?: number[];
	metadata?: Partial<MemoryMetadata>;
	importance?: MemoryImportance;
	expiresAt?: Date | null;
}

// Memory sharing configuration
export interface MemorySharingConfig {
	sourceAgentType: string;
	targetAgentTypes: string[];
	memoryTypes: MemoryType[];
	minImportance: MemoryImportance;
	transformRules?: MemoryTransformRule[];
}

// Memory transform rule for cross-agent sharing
export interface MemoryTransformRule {
	field: string;
	from: string | RegExp;
	to: string;
}

// Memory analytics data
export interface MemoryAnalytics {
	totalMemories: number;
	memoryByType: Record<MemoryType, number>;
	memoryByImportance: Record<number, number>;
	averageAccessCount: number;
	mostAccessedMemories: MemoryEntry[];
	recentlyCreated: MemoryEntry[];
	expiringMemories: MemoryEntry[];
	storageSize: {
		total: number;
		byAgentType: Record<string, number>;
		byType: Record<MemoryType, number>;
	};
}

// Memory lifecycle event
export interface MemoryLifecycleEvent {
	memoryId: string;
	eventType:
		| "created"
		| "updated"
		| "accessed"
		| "archived"
		| "expired"
		| "deleted";
	timestamp: Date;
	metadata?: Record<string, any>;
}

// Memory batch operation result
export interface MemoryBatchResult {
	succeeded: string[];
	failed: Array<{
		id?: string;
		error: string;
		input: any;
	}>;
	totalProcessed: number;
}

// Memory search result with scoring
export interface MemorySearchResult {
	memory: MemoryEntry;
	score: {
		semantic: number;
		recency: number;
		importance: number;
		accessFrequency: number;
		total: number;
	};
	highlights?: string[];
}

// Memory conflict resolution strategy
export type ConflictResolutionStrategy =
	| "newest_wins"
	| "highest_importance"
	| "most_accessed"
	| "merge_content"
	| "keep_both";

// Memory merge configuration
export interface MemoryMergeConfig {
	strategy: ConflictResolutionStrategy;
	mergeMetadata: boolean;
	combineEmbeddings: boolean;
	updateImportance: boolean;
}

// Memory export format
export interface MemoryExportFormat {
	version: string;
	exportDate: Date;
	agentType: string;
	contextKey?: string;
	memories: Array<{
		memory: MemoryEntry;
		embeddings?: number[];
	}>;
	metadata: {
		totalCount: number;
		dateRange: {
			from: Date;
			to: Date;
		};
		includedTypes: MemoryType[];
	};
}

// Memory import options
export interface MemoryImportOptions {
	overwriteExisting: boolean;
	mergeStrategy: ConflictResolutionStrategy;
	validateEmbeddings: boolean;
	regenerateEmbeddings: boolean;
	importMetadata: boolean;
}

// Memory performance metrics
export interface MemoryPerformanceMetrics {
	searchLatency: {
		p50: number;
		p95: number;
		p99: number;
	};
	embeddingGenerationTime: number;
	storageOperationTime: number;
	cacheHitRate: number;
	vectorSearchAccuracy: number;
}

// Memory system configuration
export interface MemorySystemConfig {
	vectorDimensions: number;
	semanticSearchThreshold: number;
	maxMemoriesPerAgent: number;
	memoryExpirationDays: number;
	archiveAfterDays: number;
	enableAutoSummarization: boolean;
	enableCrossPollination: boolean;
	cacheConfig: {
		enabled: boolean;
		ttl: number;
		maxSize: number;
	};
}
