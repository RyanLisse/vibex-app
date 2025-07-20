/**
 * TanStack Query hooks for Workflow Orchestration
 *
 * Comprehensive workflow management with execution tracking,
 * pause/resume functionality, and real-time progress monitoring.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { observability } from "@/lib/observability";
import { queryKeys } from "../config";

// Workflow schemas
const WorkflowSchema = z.object({
	id: z.string(),
	name: z.string(),
	definition: z.any(),
	version: z.number(),
	isActive: z.boolean(),
	createdAt: z.date(),
	createdBy: z.string().nullable(),
	tags: z.any().nullable(),
	description: z.string().nullable(),
});

const WorkflowExecutionSchema = z.object({
	id: z.string(),
	workflowId: z.string(),
	status: z.enum([
		"pending",
		"running",
		"paused",
		"completed",
		"failed",
		"cancelled",
	]),
	currentStep: z.number(),
	totalSteps: z.number().nullable(),
	state: z.any().nullable(),
	startedAt: z.date(),
	completedAt: z.date().nullable(),
	error: z.string().nullable(),
	triggeredBy: z.string().nullable(),
	parentExecutionId: z.string().nullable(),
});

const CreateWorkflowSchema = z.object({
	name: z.string().min(1),
	definition: z.any(),
	description: z.string().optional(),
	tags: z.any().optional(),
	isActive: z.boolean().default(true),
});

const UpdateWorkflowSchema = z.object({
	name: z.string().optional(),
	definition: z.any().optional(),
	description: z.string().optional(),
	tags: z.any().optional(),
	isActive: z.boolean().optional(),
});

const ExecuteWorkflowSchema = z.object({
	input: z.any().optional(),
	triggeredBy: z.string().optional(),
	parentExecutionId: z.string().optional(),
});

// Types
export type Workflow = z.infer<typeof WorkflowSchema>;
export type WorkflowExecution = z.infer<typeof WorkflowExecutionSchema>;
export type CreateWorkflowInput = z.infer<typeof CreateWorkflowSchema>;
export type UpdateWorkflowInput = z.infer<typeof UpdateWorkflowSchema>;
export type ExecuteWorkflowInput = z.infer<typeof ExecuteWorkflowSchema>;

export interface WorkflowFilters {
	isActive?: boolean;
	createdBy?: string;
	tags?: string[];
	search?: string;
}

export interface WorkflowExecutionFilters {
	workflowId?: string;
	status?: string[];
	triggeredBy?: string;
	timeRange?: { start: Date; end: Date };
	parentExecutionId?: string;
}

export interface WorkflowStats {
	totalWorkflows: number;
	activeWorkflows: number;
	totalExecutions: number;
	runningExecutions: number;
	completedExecutions: number;
	failedExecutions: number;
	averageExecutionTime: number;
	successRate: number;
}

// API functions
async function fetchWorkflows(params: {
	page?: number;
	limit?: number;
	filters?: WorkflowFilters;
}): Promise<{ workflows: Workflow[]; total: number; hasMore: boolean }> {
	const searchParams = new URLSearchParams();

	if (params.page) searchParams.append("page", params.page.toString());
	if (params.limit) searchParams.append("limit", params.limit.toString());

	if (params.filters) {
		Object.entries(params.filters).forEach(([key, value]) => {
			if (value !== undefined && value !== null) {
				if (Array.isArray(value)) {
					value.forEach((item) => searchParams.append(key, item));
				} else {
					searchParams.append(key, String(value));
				}
			}
		});
	}

	return observability.trackOperation("api.fetch-workflows", async () => {
		const response = await fetch(`/api/workflows?${searchParams}`);
		if (!response.ok) {
			throw new Error("Failed to fetch workflows");
		}
		return response.json();
	});
}

async function fetchWorkflow(id: string): Promise<Workflow> {
	return observability.trackOperation("api.fetch-workflow", async () => {
		const response = await fetch(`/api/workflows/${id}`);
		if (!response.ok) {
			throw new Error("Failed to fetch workflow");
		}
		return response.json();
	});
}

async function createWorkflow(data: CreateWorkflowInput): Promise<Workflow> {
	return observability.trackOperation("api.create-workflow", async () => {
		const response = await fetch("/api/workflows", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(data),
		});

		if (!response.ok) {
			throw new Error("Failed to create workflow");
		}

		return response.json();
	});
}

async function updateWorkflow(
	id: string,
	data: UpdateWorkflowInput,
): Promise<Workflow> {
	return observability.trackOperation("api.update-workflow", async () => {
		const response = await fetch(`/api/workflows/${id}`, {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(data),
		});

		if (!response.ok) {
			throw new Error("Failed to update workflow");
		}

		return response.json();
	});
}

async function deleteWorkflow(id: string): Promise<void> {
	return observability.trackOperation("api.delete-workflow", async () => {
		const response = await fetch(`/api/workflows/${id}`, {
			method: "DELETE",
		});

		if (!response.ok) {
			throw new Error("Failed to delete workflow");
		}
	});
}

async function executeWorkflow(
	id: string,
	input: ExecuteWorkflowInput,
): Promise<WorkflowExecution> {
	return observability.trackOperation("api.execute-workflow", async () => {
		const response = await fetch(`/api/workflows/${id}/execute`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(input),
		});

		if (!response.ok) {
			throw new Error("Failed to execute workflow");
		}

		return response.json();
	});
}

// Workflow execution API functions
async function fetchWorkflowExecutions(params: {
	page?: number;
	limit?: number;
	filters?: WorkflowExecutionFilters;
}): Promise<{
	executions: WorkflowExecution[];
	total: number;
	hasMore: boolean;
}> {
	const searchParams = new URLSearchParams();

	if (params.page) searchParams.append("page", params.page.toString());
	if (params.limit) searchParams.append("limit", params.limit.toString());

	if (params.filters) {
		Object.entries(params.filters).forEach(([key, value]) => {
			if (value !== undefined && value !== null) {
				if (key === "timeRange" && value) {
					searchParams.append("startTime", value.start.toISOString());
					searchParams.append("endTime", value.end.toISOString());
				} else if (Array.isArray(value)) {
					value.forEach((item) => searchParams.append(key, item));
				} else {
					searchParams.append(key, String(value));
				}
			}
		});
	}

	return observability.trackOperation(
		"api.fetch-workflow-executions",
		async () => {
			const response = await fetch(`/api/workflows/executions?${searchParams}`);
			if (!response.ok) {
				throw new Error("Failed to fetch workflow executions");
			}
			return response.json();
		},
	);
}

async function fetchWorkflowExecution(id: string): Promise<WorkflowExecution> {
	return observability.trackOperation(
		"api.fetch-workflow-execution",
		async () => {
			const response = await fetch(`/api/workflows/executions/${id}`);
			if (!response.ok) {
				throw new Error("Failed to fetch workflow execution");
			}
			return response.json();
		},
	);
}

async function pauseWorkflowExecution(id: string): Promise<WorkflowExecution> {
	return observability.trackOperation(
		"api.pause-workflow-execution",
		async () => {
			const response = await fetch(`/api/workflows/executions/${id}/pause`, {
				method: "POST",
			});

			if (!response.ok) {
				throw new Error("Failed to pause workflow execution");
			}

			return response.json();
		},
	);
}

async function resumeWorkflowExecution(id: string): Promise<WorkflowExecution> {
	return observability.trackOperation(
		"api.resume-workflow-execution",
		async () => {
			const response = await fetch(`/api/workflows/executions/${id}/resume`, {
				method: "POST",
			});

			if (!response.ok) {
				throw new Error("Failed to resume workflow execution");
			}

			return response.json();
		},
	);
}

async function cancelWorkflowExecution(id: string): Promise<WorkflowExecution> {
	return observability.trackOperation(
		"api.cancel-workflow-execution",
		async () => {
			const response = await fetch(`/api/workflows/executions/${id}/cancel`, {
				method: "POST",
			});

			if (!response.ok) {
				throw new Error("Failed to cancel workflow execution");
			}

			return response.json();
		},
	);
}

async function retryWorkflowExecution(id: string): Promise<WorkflowExecution> {
	return observability.trackOperation(
		"api.retry-workflow-execution",
		async () => {
			const response = await fetch(`/api/workflows/executions/${id}/retry`, {
				method: "POST",
			});

			if (!response.ok) {
				throw new Error("Failed to retry workflow execution");
			}

			return response.json();
		},
	);
}

async function fetchWorkflowStats(timeRange?: {
	start: Date;
	end: Date;
}): Promise<WorkflowStats> {
	const searchParams = new URLSearchParams();

	if (timeRange) {
		searchParams.append("startTime", timeRange.start.toISOString());
		searchParams.append("endTime", timeRange.end.toISOString());
	}

	return observability.trackOperation("api.fetch-workflow-stats", async () => {
		const response = await fetch(`/api/workflows/stats?${searchParams}`);
		if (!response.ok) {
			throw new Error("Failed to fetch workflow stats");
		}
		return response.json();
	});
}

// Workflow query hooks
export function useWorkflows(filters: WorkflowFilters = {}) {
	return useQuery({
		queryKey: queryKeys.workflows.list(filters),
		queryFn: () => fetchWorkflows({ filters, limit: 100 }),
		staleTime: 1000 * 60 * 2, // 2 minutes
		gcTime: 1000 * 60 * 10, // 10 minutes
	});
}

export function useWorkflow(id: string) {
	return useQuery({
		queryKey: queryKeys.workflows.detail(id),
		queryFn: () => fetchWorkflow(id),
		enabled: !!id,
		staleTime: 1000 * 60 * 5, // 5 minutes
		gcTime: 1000 * 60 * 30, // 30 minutes
	});
}

export function useActiveWorkflows() {
	return useWorkflows({ isActive: true });
}

// Workflow execution query hooks
export function useWorkflowExecutions(filters: WorkflowExecutionFilters = {}) {
	return useQuery({
		queryKey: [...queryKeys.workflows.all, "executions", filters],
		queryFn: () => fetchWorkflowExecutions({ filters, limit: 100 }),
		staleTime: 1000 * 30, // 30 seconds
		gcTime: 1000 * 60 * 5, // 5 minutes
		refetchInterval: 5000, // Real-time updates every 5 seconds
	});
}

export function useWorkflowExecution(id: string) {
	return useQuery({
		queryKey: [...queryKeys.workflows.all, "execution", id],
		queryFn: () => fetchWorkflowExecution(id),
		enabled: !!id,
		staleTime: 1000 * 30, // 30 seconds
		refetchInterval: 2000, // Real-time updates for active executions
	});
}

export function useWorkflowExecutionsByWorkflow(workflowId: string) {
	return useQuery({
		queryKey: queryKeys.workflows.executions(workflowId),
		queryFn: () =>
			fetchWorkflowExecutions({ filters: { workflowId }, limit: 100 }),
		enabled: !!workflowId,
		staleTime: 1000 * 60, // 1 minute
		refetchInterval: 10_000, // 10 seconds
	});
}

export function useRunningWorkflowExecutions() {
	return useWorkflowExecutions({ status: ["running", "paused"] });
}

// Workflow mutation hooks
export function useCreateWorkflow() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: createWorkflow,
		onSuccess: (newWorkflow) => {
			// Update the workflows list cache
			queryClient.setQueryData(queryKeys.workflows.lists(), (old: any) => {
				if (!old) return { workflows: [newWorkflow], total: 1, hasMore: false };
				return {
					...old,
					workflows: [newWorkflow, ...old.workflows],
					total: old.total + 1,
				};
			});

			// Set the individual workflow cache
			queryClient.setQueryData(
				queryKeys.workflows.detail(newWorkflow.id),
				newWorkflow,
			);

			// Invalidate and refetch workflows lists
			queryClient.invalidateQueries({ queryKey: queryKeys.workflows.lists() });
		},
	});
}

export function useUpdateWorkflow() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({ id, data }: { id: string; data: UpdateWorkflowInput }) =>
			updateWorkflow(id, data),
		onMutate: async ({ id, data }) => {
			// Cancel outgoing refetches
			await queryClient.cancelQueries({
				queryKey: queryKeys.workflows.detail(id),
			});

			// Snapshot previous value
			const previousWorkflow = queryClient.getQueryData(
				queryKeys.workflows.detail(id),
			);

			// Optimistically update
			queryClient.setQueryData(
				queryKeys.workflows.detail(id),
				(old: Workflow) => ({
					...old,
					...data,
				}),
			);

			return { previousWorkflow };
		},
		onSuccess: (updatedWorkflow) => {
			// Update the individual workflow cache
			queryClient.setQueryData(
				queryKeys.workflows.detail(updatedWorkflow.id),
				updatedWorkflow,
			);

			// Update workflows in lists
			queryClient.setQueriesData(
				{ queryKey: queryKeys.workflows.lists() },
				(old: any) => {
					if (!old) return old;
					return {
						...old,
						workflows: old.workflows.map((workflow: Workflow) =>
							workflow.id === updatedWorkflow.id ? updatedWorkflow : workflow,
						),
					};
				},
			);
		},
		onError: (err, variables, context) => {
			// Rollback on error
			if (context?.previousWorkflow) {
				queryClient.setQueryData(
					queryKeys.workflows.detail(variables.id),
					context.previousWorkflow,
				);
			}
		},
	});
}

export function useDeleteWorkflow() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: deleteWorkflow,
		onSuccess: (_, deletedId) => {
			// Remove from individual workflow cache
			queryClient.removeQueries({
				queryKey: queryKeys.workflows.detail(deletedId),
			});

			// Update workflows in lists
			queryClient.setQueriesData(
				{ queryKey: queryKeys.workflows.lists() },
				(old: any) => {
					if (!old) return old;
					return {
						...old,
						workflows: old.workflows.filter(
							(workflow: Workflow) => workflow.id !== deletedId,
						),
						total: old.total - 1,
					};
				},
			);

			// Remove related executions
			queryClient.removeQueries({
				queryKey: queryKeys.workflows.executions(deletedId),
			});
		},
	});
}

export function useExecuteWorkflow() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({ id, input }: { id: string; input: ExecuteWorkflowInput }) =>
			executeWorkflow(id, input),
		onSuccess: (newExecution) => {
			// Update workflow executions cache
			queryClient.setQueryData(
				queryKeys.workflows.executions(newExecution.workflowId),
				(old: any) => {
					if (!old)
						return { executions: [newExecution], total: 1, hasMore: false };
					return {
						...old,
						executions: [newExecution, ...old.executions],
						total: old.total + 1,
					};
				},
			);

			// Set individual execution cache
			queryClient.setQueryData(
				[...queryKeys.workflows.all, "execution", newExecution.id],
				newExecution,
			);

			// Invalidate related queries
			queryClient.invalidateQueries({
				queryKey: [...queryKeys.workflows.all, "executions"],
			});
		},
	});
}

// Workflow execution control hooks
export function usePauseWorkflowExecution() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: pauseWorkflowExecution,
		onMutate: async (id) => {
			// Optimistically update status
			queryClient.setQueryData(
				[...queryKeys.workflows.all, "execution", id],
				(old: WorkflowExecution) => ({
					...old,
					status: "paused" as const,
				}),
			);
		},
		onSuccess: (updatedExecution) => {
			// Update with actual data
			queryClient.setQueryData(
				[...queryKeys.workflows.all, "execution", updatedExecution.id],
				updatedExecution,
			);

			queryClient.invalidateQueries({
				queryKey: queryKeys.workflows.executions(updatedExecution.workflowId),
			});
		},
	});
}

export function useResumeWorkflowExecution() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: resumeWorkflowExecution,
		onMutate: async (id) => {
			// Optimistically update status
			queryClient.setQueryData(
				[...queryKeys.workflows.all, "execution", id],
				(old: WorkflowExecution) => ({
					...old,
					status: "running" as const,
				}),
			);
		},
		onSuccess: (updatedExecution) => {
			// Update with actual data
			queryClient.setQueryData(
				[...queryKeys.workflows.all, "execution", updatedExecution.id],
				updatedExecution,
			);

			queryClient.invalidateQueries({
				queryKey: queryKeys.workflows.executions(updatedExecution.workflowId),
			});
		},
	});
}

export function useCancelWorkflowExecution() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: cancelWorkflowExecution,
		onSuccess: (updatedExecution) => {
			queryClient.setQueryData(
				[...queryKeys.workflows.all, "execution", updatedExecution.id],
				updatedExecution,
			);

			queryClient.invalidateQueries({
				queryKey: queryKeys.workflows.executions(updatedExecution.workflowId),
			});
		},
	});
}

export function useRetryWorkflowExecution() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: retryWorkflowExecution,
		onSuccess: (newExecution) => {
			queryClient.setQueryData(
				[...queryKeys.workflows.all, "execution", newExecution.id],
				newExecution,
			);

			queryClient.invalidateQueries({
				queryKey: queryKeys.workflows.executions(newExecution.workflowId),
			});
		},
	});
}

// Stats and analytics hooks
export function useWorkflowStats(timeRange?: { start: Date; end: Date }) {
	return useQuery({
		queryKey: [...queryKeys.workflows.all, "stats", timeRange],
		queryFn: () => fetchWorkflowStats(timeRange),
		staleTime: 1000 * 60 * 2, // 2 minutes
		gcTime: 1000 * 60 * 10, // 10 minutes
		refetchInterval: 30_000, // Update every 30 seconds
	});
}

// Convenience hooks
export function useRecentWorkflowExecutions(limit = 20) {
	const timeRange = {
		start: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
		end: new Date(),
	};

	return useQuery({
		queryKey: [...queryKeys.workflows.all, "recent-executions", limit],
		queryFn: () =>
			fetchWorkflowExecutions({
				filters: { timeRange },
				limit,
			}),
		staleTime: 1000 * 60, // 1 minute
		refetchInterval: 10_000, // 10 seconds
	});
}

export function useFailedWorkflowExecutions() {
	return useWorkflowExecutions({ status: ["failed"] });
}

export function usePausedWorkflowExecutions() {
	return useWorkflowExecutions({ status: ["paused"] });
}

// Export utility functions
export const workflowQueries = {
	all: () => queryKeys.workflows.all,
	list: (filters: WorkflowFilters) => queryKeys.workflows.list(filters),
	detail: (id: string) => queryKeys.workflows.detail(id),
	executions: (workflowId: string) =>
		queryKeys.workflows.executions(workflowId),
};
