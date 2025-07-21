/**
 * Enhanced Observability Types for Database Integration
 *
 * Comprehensive type definitions for the database observability system
 * including agent executions, events, workflows, and memory management.
 */

// Base entity types
export interface BaseEntity {
	id: string;
	createdAt: string;
	updatedAt: string;
}

// Agent Execution Types
export interface AgentExecution extends BaseEntity {
	taskId: string | null;
	agentType: string;
	status: "pending" | "running" | "completed" | "failed" | "cancelled";
	startedAt: string;
	endedAt: string | null;
	input: any | null;
	output: any | null;
	error: string | null;
	metadata: any | null;
	traceId: string | null;
	executionTimeMs: number | null;
	tokenUsage: any | null;
	cost: any | null;
	progress: number;
}

export interface ExecutionFilter {
	status?: string;
	agentType?: string;
	taskId?: string;
	startDate?: Date;
	endDate?: Date;
	limit?: number;
	offset?: number;
}

export interface ExecutionUpdate {
	status?: AgentExecution["status"];
	output?: any;
	error?: string;
	metadata?: any;
	executionTimeMs?: number;
	tokenUsage?: any;
	cost?: any;
	progress?: number;
}

// Observability Event Types
export type EventType =
	| "execution_started"
	| "execution_completed"
	| "execution_failed"
	| "step_started"
	| "step_completed"
	| "performance_metric"
	| "system_event"
	| "error"
	| "warning"
	| "info"
	| "debug";

export type EventSeverity = "low" | "medium" | "high" | "critical";

export interface ObservabilityEvent extends BaseEntity {
	executionId: string | null;
	eventType: EventType;
	timestamp: string;
	data: any | null;
	traceId: string | null;
	spanId: string | null;
	severity: EventSeverity;
	category: string | null;
	source?: string;
	message?: string;
	tags?: string[];
}

export interface EventFilter {
	eventType?: string;
	executionId?: string;
	agentType?: string;
	severity?: string;
	startDate?: Date;
	endDate?: Date;
	traceId?: string;
	search?: string;
	tags?: string[];
	limit?: number;
	offset?: number;
}

// Workflow Types
export interface Workflow extends BaseEntity {
	name: string;
	description: string | null;
	definition: any;
	version: number;
	isActive: boolean;
	createdBy: string | null;
	tags: any | null;
}

export interface WorkflowStep {
	id: string;
	name: string;
	type: string;
	status: "pending" | "running" | "completed" | "failed" | "skipped";
	input: any | null;
	output: any | null;
	error: string | null;
	startedAt: string | null;
	completedAt: string | null;
	order: number;
}

export interface WorkflowExecution extends BaseEntity {
	workflowId: string;
	status:
		| "pending"
		| "running"
		| "paused"
		| "completed"
		| "failed"
		| "cancelled";
	currentStep: number;
	totalSteps: number | null;
	state: any | null;
	startedAt: string;
	completedAt: string | null;
	pausedAt: string | null;
	resumedAt: string | null;
	error: string | null;
	triggeredBy: string | null;
	parentExecutionId: string | null;
	steps: WorkflowStep[];
}

export interface WorkflowFilter {
	status?: string;
	category?: string;
	tags?: string[];
	search?: string;
	limit?: number;
	offset?: number;
}

export interface WorkflowExecutionFilter {
	workflowId?: string;
	status?: string[];
	triggeredBy?: string;
	startDate?: Date;
	endDate?: Date;
	parentExecutionId?: string;
	limit?: number;
	offset?: number;
}

export interface CreateWorkflowRequest {
	name: string;
	description?: string;
	definition: any;
	tags?: any;
	isActive?: boolean;
}

export interface UpdateWorkflowRequest {
	name?: string;
	description?: string;
	definition?: any;
	tags?: any;
	isActive?: boolean;
}

export interface ExecuteWorkflowRequest {
	input?: any;
	triggeredBy?: string;
	parentExecutionId?: string;
}

// Agent Memory Types
export type MemoryType =
	| "conversation"
	| "task_context"
	| "system_knowledge"
	| "user_preference"
	| "execution_result"
	| "error_pattern"
	| "performance_data";

export interface AgentMemory extends BaseEntity {
	agentType: string;
	memoryType: MemoryType;
	contextKey: string;
	content: string;
	embedding?: number[];
	importance: number; // 1-10 scale
	lastAccessedAt: string;
	accessCount: number;
	metadata: any | null;
	tags?: string[];
	expiresAt: string | null;
}

export interface MemoryFilter {
	agentType?: string;
	memoryType?: MemoryType;
	contextKey?: string;
	minImportance?: number;
	maxImportance?: number;
	startDate?: Date;
	endDate?: Date;
	tags?: string[];
	includeExpired?: boolean;
	limit?: number;
	offset?: number;
}

export interface MemorySearchQuery {
	query: string;
	agentType?: string;
	memoryTypes?: MemoryType[];
	limit?: number;
	threshold?: number;
	useSemanticSearch?: boolean;
}

export interface MemorySearchResult {
	memory: AgentMemory;
	score: number;
	relevance: number;
}

export interface CreateMemoryRequest {
	agentType: string;
	memoryType: MemoryType;
	contextKey: string;
	content: string;
	importance?: number;
	metadata?: any;
	tags?: string[];
	expiresAt?: Date;
}

export interface UpdateMemoryRequest {
	content?: string;
	importance?: number;
	metadata?: any;
	tags?: string[];
	expiresAt?: Date;
}

export interface MemoryContext {
	memories: AgentMemory[];
	agentType: string;
	contextType: "conversation" | "task" | "session" | "global";
	contextId?: string;
	totalMemories: number;
	averageImportance: number;
}

// Performance and Analytics Types
export interface PerformanceMetrics {
	executionTime: number;
	memoryUsage: number;
	cpuUsage: number;
	tokenCount: number;
	apiCalls: number;
	cacheHits: number;
	cacheMisses: number;
}

export interface AnalyticsData {
	totalExecutions: number;
	successRate: number;
	averageExecutionTime: number;
	errorRate: number;
	resourceUtilization: PerformanceMetrics;
	trends: {
		period: string;
		executions: number;
		errors: number;
		avgTime: number;
	}[];
}

// Real-time Subscription Types
export interface RealtimeSubscriptionOptions {
	executionId?: string;
	agentType?: string;
	eventTypes?: EventType[];
	severityLevels?: EventSeverity[];
}

export interface SubscriptionEvent {
	type: "data" | "error" | "connected" | "disconnected";
	data?: any;
	error?: Error;
	timestamp: Date;
}

// Time-Travel Debugging Types
export interface ExecutionSnapshot {
	id: string;
	executionId: string;
	timestamp: string;
	state: any;
	variables: Record<string, any>;
	stackTrace: string[];
	metadata: any;
}

export interface TimelineEvent {
	timestamp: string;
	type: "execution" | "event" | "snapshot";
	data: AgentExecution | ObservabilityEvent | ExecutionSnapshot;
	duration?: number;
}

// Cache Invalidation Types
export interface CacheInvalidationEvent {
	table: string;
	operation: "insert" | "update" | "delete";
	recordId: string;
	timestamp: Date;
	affectedQueries: string[];
}

// Error Types
export interface ObservabilityError extends Error {
	code: string;
	context: Record<string, any>;
	severity: EventSeverity;
	recoverable: boolean;
}

// Utility Types
export type QueryStatus = "idle" | "loading" | "error" | "success";

export interface QueryResult<T> {
	data: T | undefined;
	isLoading: boolean;
	isError: boolean;
	error: Error | null;
	refetch: () => void;
}

export interface PaginatedResult<T> {
	data: T[];
	total: number;
	hasMore: boolean;
	nextCursor?: string | number;
}

export interface InfiniteQueryResult<T> {
	pages: PaginatedResult<T>[];
	pageParams: any[];
	hasNextPage: boolean;
	fetchNextPage: () => void;
	isFetchingNextPage: boolean;
}

// Export all types for convenience
export type {
	BaseEntity,
	AgentExecution,
	ExecutionFilter,
	ExecutionUpdate,
	EventType,
	EventSeverity,
	ObservabilityEvent,
	EventFilter,
	Workflow,
	WorkflowStep,
	WorkflowExecution,
	WorkflowFilter,
	WorkflowExecutionFilter,
	CreateWorkflowRequest,
	UpdateWorkflowRequest,
	ExecuteWorkflowRequest,
	MemoryType,
	AgentMemory,
	MemoryFilter,
	MemorySearchQuery,
	MemorySearchResult,
	CreateMemoryRequest,
	UpdateMemoryRequest,
	MemoryContext,
	PerformanceMetrics,
	AnalyticsData,
	RealtimeSubscriptionOptions,
	SubscriptionEvent,
	ExecutionSnapshot,
	TimelineEvent,
	CacheInvalidationEvent,
	ObservabilityError,
	QueryStatus,
	QueryResult,
	PaginatedResult,
	InfiniteQueryResult,
};
