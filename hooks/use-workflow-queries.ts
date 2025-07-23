/**
 * React Query hooks for workflow management
 */

import { type UseQueryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { observability } from "@/lib/observability";

// Types
export interface Workflow {
	id: string;
	name: string;
	description?: string;
	definition: WorkflowDefinition;
	version: number;
	isActive: boolean;
	createdAt: string;
	createdBy?: string;
	tags?: string[];
}

export interface WorkflowDefinition {
	id: string;
	name: string;
	description?: string;
	version: number;
	steps: WorkflowStep[];
	triggers?: WorkflowTrigger[];
	variables?: Record<string, unknown>;
	timeout?: number;
	tags?: string[];
}

export interface WorkflowStep {
	id: string;
	name: string;
	type: "action" | "condition" | "parallel" | "sequential";
	config: Record<string, unknown>;
	dependencies?: string[];
	timeout?: number;
	retryPolicy?: {
		maxRetries: number;
		backoffMs: number;
		exponential: boolean;
	};
}

export interface WorkflowTrigger {
	type: "manual" | "scheduled" | "event";
	config: Record<string, unknown>;
}

export interface WorkflowExecution {
	id: string;
	workflowId: string;
	status: "pending" | "running" | "paused" | "completed" | "failed" | "cancelled";
	currentStep: number;
	totalSteps?: number;
	state: WorkflowExecutionState;
	startedAt: string;
	completedAt?: string;
	error?: string;
	triggeredBy?: string;
	parentExecutionId?: string;
}

export interface WorkflowExecutionState {
	currentStep: number;
	stepStates: Record<
		string,
		{
			status: "pending" | "running" | "completed" | "failed" | "skipped";
			startedAt?: Date;
			completedAt?: Date;
			result?: unknown;
			error?: string;
			retryCount: number;
		}
	>;
	variables: Record<string, unknown>;
	checkpoints: Array<{
		stepNumber: number;
		timestamp: Date;
		state: Record<string, unknown>;
	}>;
}

export interface WorkflowProgress {
	executionId: string;
	workflowId: string;
	status: "pending" | "running" | "paused" | "completed" | "failed" | "cancelled";
	currentStep: number;
	totalSteps: number;
	completedSteps: number;
	progress: number;
	currentStepName?: string;
	estimatedTimeRemaining?: number;
	startedAt: string;
	lastUpdated: string;
	error?: string;
}

export interface CreateWorkflowData {
	name: string;
	description?: string;
	version: number;
	steps: WorkflowStep[];
	triggers?: WorkflowTrigger[];
	variables?: Record<string, unknown>;
	timeout?: number;
	tags?: string[];
}

export interface StartExecutionData {
	workflowId: string;
	triggeredBy: string;
	initialVariables?: Record<string, unknown>;
	parentExecutionId?: string;
}

// Query Keys
export const workflowQueryKeys = {
	all: ["workflows"] as const,
	lists: () => [...workflowQueryKeys.all, "list"] as const,
	list: (filters: Record<string, unknown>) => [...workflowQueryKeys.lists(), filters] as const,
	details: () => [...workflowQueryKeys.all, "detail"] as const,
	detail: (id: string) => [...workflowQueryKeys.details(), id] as const,
	executions: (workflowId?: string) => ["workflow-executions", workflowId] as const,
	execution: (id: string) => ["workflow-execution", id] as const,
	progress: (executionId: string) => ["workflow-progress", executionId] as const,
};

// API Functions
async function fetchWorkflows(
	params: { isActive?: boolean; limit?: number; offset?: number } = {}
): Promise<Workflow[]> {
	const searchParams = new URLSearchParams();

	if (params.isActive !== undefined) {
		searchParams.set("isActive", params.isActive.toString());
	}
	if (params.limit) {
		searchParams.set("limit", params.limit.toString());
	}
	if (params.offset) {
		searchParams.set("offset", params.offset.toString());
	}

	const response = await fetch(`/api/workflows?${searchParams}`);
	if (!response.ok) {
		throw new Error("Failed to fetch workflows");
	}

	const result = await response.json();
	if (!result.success) {
		throw new Error(result.error || "Failed to fetch workflows");
	}

	return result.data;
}

async function fetchWorkflow(id: string): Promise<Workflow> {
	const response = await fetch(`/api/workflows?workflowId=${id}`);
	if (!response.ok) {
		throw new Error("Failed to fetch workflow");
	}

	const result = await response.json();
	if (!result.success) {
		throw new Error(result.error || "Failed to fetch workflow");
	}

	return result.data;
}

async function createWorkflow(data: CreateWorkflowData): Promise<Workflow> {
	const response = await fetch("/api/workflows", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(data),
	});

	if (!response.ok) {
		throw new Error("Failed to create workflow");
	}

	const result = await response.json();
	if (!result.success) {
		throw new Error(result.error || "Failed to create workflow");
	}

	return result.data;
}

async function startExecution(data: StartExecutionData): Promise<{ executionId: string }> {
	const response = await fetch("/api/workflows/executions", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(data),
	});

	if (!response.ok) {
		throw new Error("Failed to start execution");
	}

	const result = await response.json();
	if (!result.success) {
		throw new Error(result.error || "Failed to start execution");
	}

	return result.data;
}

async function fetchExecutions(
	params: { workflowId?: string; status?: string; limit?: number } = {}
): Promise<WorkflowExecution[]> {
	const searchParams = new URLSearchParams();

	if (params.workflowId) {
		searchParams.set("workflowId", params.workflowId);
	}
	if (params.status) {
		searchParams.set("status", params.status);
	}
	if (params.limit) {
		searchParams.set("limit", params.limit.toString());
	}

	const response = await fetch(`/api/workflows/executions?${searchParams}`);
	if (!response.ok) {
		throw new Error("Failed to fetch executions");
	}

	const result = await response.json();
	if (!result.success) {
		throw new Error(result.error || "Failed to fetch executions");
	}

	return result.data;
}

async function fetchExecution(id: string): Promise<WorkflowExecution> {
	const response = await fetch(`/api/workflows/executions/${id}`);
	if (!response.ok) {
		throw new Error("Failed to fetch execution");
	}

	const result = await response.json();
	if (!result.success) {
		throw new Error(result.error || "Failed to fetch execution");
	}

	return result.data;
}

async function controlExecution(id: string, action: "pause" | "resume" | "cancel"): Promise<void> {
	const response = await fetch(`/api/workflows/executions/${id}`, {
		method: "PATCH",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ action }),
	});

	if (!response.ok) {
		throw new Error(`Failed to ${action} execution`);
	}

	const result = await response.json();
	if (!result.success) {
		throw new Error(result.error || `Failed to ${action} execution`);
	}
}

async function fetchProgress(executionId: string): Promise<WorkflowProgress> {
	const response = await fetch(`/api/workflows/executions/${executionId}/progress`);
	if (!response.ok) {
		throw new Error("Failed to fetch progress");
	}

	const result = await response.json();
	if (!result.success) {
		throw new Error(result.error || "Failed to fetch progress");
	}

	return result.data;
}

async function rollbackExecution(executionId: string, checkpointIndex: number): Promise<void> {
	const response = await fetch(`/api/workflows/executions/${executionId}/rollback`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ checkpointIndex }),
	});

	if (!response.ok) {
		throw new Error("Failed to rollback execution");
	}

	const result = await response.json();
	if (!result.success) {
		throw new Error(result.error || "Failed to rollback execution");
	}
}

// React Query Hooks

/**
 * Hook to fetch workflows
 */
export function useWorkflows(
	params: {
		isActive?: boolean;
		limit?: number;
		offset?: number;
	} = {},
	options?: Omit<UseQueryOptions<Workflow[]>, "queryKey" | "queryFn">
) {
	return useQuery({
		queryKey: workflowQueryKeys.list(params),
		queryFn: () => fetchWorkflows(params),
		staleTime: 30000, // 30 seconds
		...options,
	});
}

/**
 * Hook to fetch a single workflow
 */
export function useWorkflow(
	id: string,
	options?: Omit<UseQueryOptions<Workflow>, "queryKey" | "queryFn">
) {
	return useQuery({
		queryKey: workflowQueryKeys.detail(id),
		queryFn: () => fetchWorkflow(id),
		enabled: !!id,
		staleTime: 60000, // 1 minute
		...options,
	});
}

/**
 * Hook to create a workflow
 */
export function useCreateWorkflow() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: createWorkflow,
		onSuccess: () => {
			// Invalidate workflows list
			queryClient.invalidateQueries({ queryKey: workflowQueryKeys.lists() });

			observability.recordEvent("workflow.created-via-hook", {
				timestamp: new Date().toISOString(),
			});
		},
		onError: (error) => {
			observability.recordError("workflow.create-failed", error as Error);
		},
	});
}

/**
 * Hook to start workflow execution
 */
export function useStartExecution() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: startExecution,
		onSuccess: (data, variables) => {
			// Invalidate executions list
			queryClient.invalidateQueries({
				queryKey: workflowQueryKeys.executions(variables.workflowId),
			});

			observability.recordEvent("workflow.execution-started-via-hook", {
				executionId: data.executionId,
				workflowId: variables.workflowId,
			});
		},
		onError: (error) => {
			observability.recordError("workflow.start-execution-failed", error as Error);
		},
	});
}

/**
 * Hook to fetch workflow executions
 */
export function useWorkflowExecutions(
	params: {
		workflowId?: string;
		status?: string;
		limit?: number;
	} = {},
	options?: Omit<UseQueryOptions<WorkflowExecution[]>, "queryKey" | "queryFn">
) {
	return useQuery({
		queryKey: workflowQueryKeys.executions(params.workflowId),
		queryFn: () => fetchExecutions(params),
		refetchInterval: 5000, // Refetch every 5 seconds for real-time updates
		staleTime: 10000, // 10 seconds
		...options,
	});
}

/**
 * Hook to fetch a single execution
 */
export function useWorkflowExecution(
	id: string,
	options?: Omit<UseQueryOptions<WorkflowExecution>, "queryKey" | "queryFn">
) {
	return useQuery({
		queryKey: workflowQueryKeys.execution(id),
		queryFn: () => fetchExecution(id),
		enabled: !!id,
		refetchInterval: 2000, // Refetch every 2 seconds for real-time updates
		staleTime: 5000, // 5 seconds
		...options,
	});
}

/**
 * Hook to control workflow execution
 */
export function useControlExecution() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({ id, action }: { id: string; action: "pause" | "resume" | "cancel" }) =>
			controlExecution(id, action),
		onSuccess: (_, variables) => {
			// Invalidate execution details
			queryClient.invalidateQueries({
				queryKey: workflowQueryKeys.execution(variables.id),
			});

			observability.recordEvent("workflow.execution-controlled-via-hook", {
				executionId: variables.id,
				action: variables.action,
			});
		},
		onError: (error) => {
			observability.recordError("workflow.control-execution-failed", error as Error);
		},
	});
}

/**
 * Hook to fetch workflow execution progress
 */
export function useWorkflowProgress(
	executionId: string,
	options?: Omit<UseQueryOptions<WorkflowProgress>, "queryKey" | "queryFn">
) {
	return useQuery({
		queryKey: workflowQueryKeys.progress(executionId),
		queryFn: () => fetchProgress(executionId),
		enabled: !!executionId,
		refetchInterval: 1000, // Refetch every second for real-time progress
		staleTime: 500, // 500ms
		...options,
	});
}

/**
 * Hook to rollback workflow execution
 */
export function useRollbackExecution() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({
			executionId,
			checkpointIndex,
		}: {
			executionId: string;
			checkpointIndex: number;
		}) => rollbackExecution(executionId, checkpointIndex),
		onSuccess: (_, variables) => {
			// Invalidate execution details
			queryClient.invalidateQueries({
				queryKey: workflowQueryKeys.execution(variables.executionId),
			});

			observability.recordEvent("workflow.execution-rolled-back-via-hook", {
				executionId: variables.executionId,
				checkpointIndex: variables.checkpointIndex,
			});
		},
		onError: (error) => {
			observability.recordError("workflow.rollback-failed", error as Error);
		},
	});
}
