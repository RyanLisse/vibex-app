// Task API integration layer
import type { z } from "zod";
import {
	EnhancedTaskSchema,
	ScreenshotBugReportSchema,
	VoiceTaskCreationSchema,
} from "@/src/schemas/enhanced-task-schemas";

// Types
export type EnhancedTask = z.infer<typeof EnhancedTaskSchema>;
export type ScreenshotBugReport = z.infer<typeof ScreenshotBugReportSchema>;
export type VoiceTaskCreation = z.infer<typeof VoiceTaskCreationSchema>;

export interface TaskFilters {
	status?: string[];
	priority?: string[];
	assignee?: string[];
	labels?: string[];
	dueDate?: {
		from?: Date;
		to?: Date;
	};
	search?: string;
}

export interface TaskSortOptions {
	field: "createdAt" | "updatedAt" | "dueDate" | "priority" | "title";
	direction: "asc" | "desc";
}

export interface PaginationOptions {
	page: number;
	limit: number;
}

export interface TaskListResponse {
	tasks: EnhancedTask[];
	total: number;
	page: number;
	limit: number;
	hasMore: boolean;
}

// Base API configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "/api";

class TaskAPIError extends Error {
	constructor(
		message: string,
		public status: number,
		public code?: string
	) {
		super(message);
		this.name = "TaskAPIError";
	}
}

// HTTP client wrapper
async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
	const url = `${API_BASE_URL}${endpoint}`;

	const config: RequestInit = {
		headers: {
			"Content-Type": "application/json",
			...options.headers,
		},
		...options,
	};

	try {
		const response = await fetch(url, config);

		if (!response.ok) {
			const errorData = await response.json().catch(() => ({}));
			throw new TaskAPIError(
				errorData.message || `HTTP ${response.status}: ${response.statusText}`,
				response.status,
				errorData.code
			);
		}

		return await response.json();
	} catch (error) {
		if (error instanceof TaskAPIError) {
			throw error;
		}

		throw new TaskAPIError(
			`Network error: ${error instanceof Error ? error.message : "Unknown error"}`,
			0
		);
	}
}

// Task API service
export const taskAPI = {
	// Get all tasks with filtering, sorting, and pagination
	async getTasks(
		filters?: TaskFilters,
		sort?: TaskSortOptions,
		pagination?: PaginationOptions
	): Promise<TaskListResponse> {
		const params = new URLSearchParams();

		if (filters) {
			if (filters.status?.length) {
				params.append("status", filters.status.join(","));
			}
			if (filters.priority?.length) {
				params.append("priority", filters.priority.join(","));
			}
			if (filters.assignee?.length) {
				params.append("assignee", filters.assignee.join(","));
			}
			if (filters.labels?.length) {
				params.append("labels", filters.labels.join(","));
			}
			if (filters.search) {
				params.append("search", filters.search);
			}
			if (filters.dueDate?.from) {
				params.append("dueDateFrom", filters.dueDate.from.toISOString());
			}
			if (filters.dueDate?.to) {
				params.append("dueDateTo", filters.dueDate.to.toISOString());
			}
		}

		if (sort) {
			params.append("sortBy", sort.field);
			params.append("sortOrder", sort.direction);
		}

		if (pagination) {
			params.append("page", pagination.page.toString());
			params.append("limit", pagination.limit.toString());
		}

		const queryString = params.toString();
		const endpoint = `/tasks${queryString ? `?${queryString}` : ""}`;

		return apiRequest<TaskListResponse>(endpoint);
	},

	// Get a single task by ID
	async getTask(taskId: string): Promise<EnhancedTask> {
		return apiRequest<EnhancedTask>(`/tasks/${taskId}`);
	},

	// Create a new task
	async createTask(task: Partial<EnhancedTask>): Promise<EnhancedTask> {
		const validatedTask = EnhancedTaskSchema.parse({
			...task,
			taskId: task.taskId || crypto.randomUUID(),
			createdAt: task.createdAt || new Date(),
			updatedAt: task.updatedAt || new Date(),
		});

		return apiRequest<EnhancedTask>("/tasks", {
			method: "POST",
			body: JSON.stringify(validatedTask),
		});
	},

	// Update an existing task
	async updateTask(taskId: string, updates: Partial<EnhancedTask>): Promise<EnhancedTask> {
		const updateData = {
			...updates,
			updatedAt: new Date(),
		};

		return apiRequest<EnhancedTask>(`/tasks/${taskId}`, {
			method: "PATCH",
			body: JSON.stringify(updateData),
		});
	},

	// Delete a task
	async deleteTask(taskId: string): Promise<void> {
		await apiRequest<void>(`/tasks/${taskId}`, {
			method: "DELETE",
		});
	},

	// Bulk operations
	async bulkUpdateTasks(
		taskIds: string[],
		updates: Partial<EnhancedTask>
	): Promise<EnhancedTask[]> {
		return apiRequest<EnhancedTask[]>("/tasks/bulk", {
			method: "PATCH",
			body: JSON.stringify({
				taskIds,
				updates: {
					...updates,
					updatedAt: new Date(),
				},
			}),
		});
	},

	async bulkDeleteTasks(taskIds: string[]): Promise<void> {
		await apiRequest<void>("/tasks/bulk", {
			method: "DELETE",
			body: JSON.stringify({ taskIds }),
		});
	},

	// Screenshot bug report creation
	async createBugReport(bugReport: ScreenshotBugReport): Promise<EnhancedTask> {
		const validatedBugReport = ScreenshotBugReportSchema.parse(bugReport);

		return apiRequest<EnhancedTask>("/tasks/bug-report", {
			method: "POST",
			body: JSON.stringify(validatedBugReport),
		});
	},

	// Voice task creation
	async createVoiceTask(voiceTask: VoiceTaskCreation): Promise<EnhancedTask> {
		const validatedVoiceTask = VoiceTaskCreationSchema.parse(voiceTask);

		return apiRequest<EnhancedTask>("/tasks/voice", {
			method: "POST",
			body: JSON.stringify(validatedVoiceTask),
		});
	},

	// Task analytics
	async getTaskAnalytics(
		filters?: TaskFilters,
		dateRange?: { from: Date; to: Date }
	): Promise<{
		totalTasks: number;
		completedTasks: number;
		inProgressTasks: number;
		overdueTasks: number;
		tasksByPriority: Record<string, number>;
		tasksByStatus: Record<string, number>;
		tasksByAssignee: Record<string, number>;
		completionRate: number;
		averageCompletionTime: number;
	}> {
		const params = new URLSearchParams();

		if (filters) {
			if (filters.assignee?.length) {
				params.append("assignee", filters.assignee.join(","));
			}
			if (filters.labels?.length) {
				params.append("labels", filters.labels.join(","));
			}
		}

		if (dateRange) {
			params.append("from", dateRange.from.toISOString());
			params.append("to", dateRange.to.toISOString());
		}

		const queryString = params.toString();
		const endpoint = `/tasks/analytics${queryString ? `?${queryString}` : ""}`;

		return apiRequest(endpoint);
	},

	// Export tasks
	async exportTasks(format: "json" | "csv" | "xlsx", filters?: TaskFilters): Promise<Blob> {
		const params = new URLSearchParams();
		params.append("format", format);

		if (filters) {
			if (filters.status?.length) {
				params.append("status", filters.status.join(","));
			}
			if (filters.priority?.length) {
				params.append("priority", filters.priority.join(","));
			}
			if (filters.assignee?.length) {
				params.append("assignee", filters.assignee.join(","));
			}
		}

		const response = await fetch(`${API_BASE_URL}/tasks/export?${params.toString()}`);

		if (!response.ok) {
			throw new TaskAPIError(`Export failed: ${response.statusText}`, response.status);
		}

		return response.blob();
	},
};
