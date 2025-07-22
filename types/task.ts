// Task type definitions

export interface TaskMessage {
	id: string;
	role: "user" | "assistant" | "system" | "tool";
	type: string;
	content?: string;
	data?: any;
	timestamp?: Date | string;
	status?: "pending" | "streaming" | "complete" | "error";
	tool?: {
		name: string;
		input: any;
		output?: any;
	};
}

export interface TaskProgress {
	percentage: number;
	milestone?: string;
	notes?: string;
	timestamp?: string;
}

export interface TaskMetadata {
	source?: string;
	priority?: "low" | "medium" | "high" | "urgent";
	tags?: string[];
	estimatedHours?: number;
	actualHours?: number;
	complexity?: number;
	dependencies?: string[];
}

export interface Task {
	id: string;
	title: string;
	description?: string;
	status: "pending" | "in-progress" | "completed" | "cancelled" | "blocked";
	priority: "low" | "medium" | "high" | "urgent";
	userId: string;
	assignee?: string;
	createdAt: Date | string;
	updatedAt: Date | string;
	completedAt?: Date | string;
	dueDate?: Date | string;
	tags?: string[];
	metadata?: TaskMetadata;
	messages?: TaskMessage[];
	hasChanges?: boolean;
	sessionId?: string;
	progress?: TaskProgress;
	embedding?: number[];
}

export interface CreateTaskInput {
	title: string;
	description?: string;
	priority?: Task["priority"];
	assignee?: string;
	dueDate?: Date | string;
	tags?: string[];
	metadata?: TaskMetadata;
}

export interface UpdateTaskInput {
	title?: string;
	description?: string;
	status?: Task["status"];
	priority?: Task["priority"];
	assignee?: string;
	dueDate?: Date | string;
	tags?: string[];
	metadata?: TaskMetadata;
	hasChanges?: boolean;
	sessionId?: string;
	progress?: TaskProgress;
}

export interface TaskFilter {
	status?: Task["status"][];
	priority?: Task["priority"][];
	assignee?: string[];
	tags?: string[];
	search?: string;
	dateRange?: {
		start: Date | string;
		end: Date | string;
	};
}

export interface TaskSort {
	field:
		| "title"
		| "priority"
		| "status"
		| "createdAt"
		| "updatedAt"
		| "dueDate";
	direction: "asc" | "desc";
}

export interface TaskQuery {
	filter?: TaskFilter;
	sort?: TaskSort;
	pagination?: {
		page: number;
		limit: number;
	};
}

export interface TaskListResponse {
	tasks: Task[];
	total: number;
	page: number;
	limit: number;
	totalPages: number;
}

// Task-related utility types
export type TaskStatus = Task["status"];
export type TaskPriority = Task["priority"];
export type TaskRole = TaskMessage["role"];

// Task event types
export interface TaskEvent {
	id: string;
	taskId: string;
	type:
		| "created"
		| "updated"
		| "completed"
		| "deleted"
		| "assigned"
		| "commented";
	userId: string;
	data?: any;
	timestamp: Date | string;
}

export interface TaskSubscription {
	taskId: string;
	userId: string;
	events: TaskEvent["type"][];
	createdAt: Date | string;
}

export default Task;
