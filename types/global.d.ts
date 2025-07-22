// Global type declarations for vibex-app

declare global {
	// Vitest globals
	var vi: typeof import("vitest").vi;
	var describe: typeof import("vitest").describe;
	var it: typeof import("vitest").it;
	var test: typeof import("vitest").test;
	var expect: typeof import("vitest").expect;
	var beforeEach: typeof import("vitest").beforeEach;
	var afterEach: typeof import("vitest").afterEach;
	var beforeAll: typeof import("vitest").beforeAll;
	var afterAll: typeof import("vitest").afterAll;

	// Environment variables
	var LETTA_API_KEY: string | undefined;
	var ANTHROPIC_API_KEY: string | undefined;
	var OPENAI_API_KEY: string | undefined;
	var GITHUB_TOKEN: string | undefined;
	var DATABASE_URL: string | undefined;
	var REDIS_URL: string | undefined;
	var NODE_ENV: "development" | "production" | "test";

	// Common utility types
	type ID = string;
	type Timestamp = string | Date | number;
	type JSONValue = string | number | boolean | null | JSONObject | JSONArray;
	type JSONObject = { [key: string]: JSONValue };
	type JSONArray = JSONValue[];

	// Task related types
	interface Task {
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
		metadata?: Record<string, any>;
		messages?: Message[];
		hasChanges?: boolean;
		sessionId?: string;
		progress?: number;
		embedding?: number[];
	}

	// Message types
	interface Message {
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

	// User types
	interface User {
		id: string;
		email: string;
		name?: string;
		avatar?: string;
		role: "user" | "admin" | "moderator";
		createdAt: Date | string;
		updatedAt: Date | string;
		preferences?: Record<string, any>;
	}

	// Environment types
	interface Environment {
		id: string;
		name: string;
		description?: string;
		type: "development" | "staging" | "production";
		url?: string;
		variables: Record<string, string>;
		isActive: boolean;
		userId: string;
		createdAt: Date | string;
		updatedAt: Date | string;
	}

	// API Response types
	interface ApiResponse<T = any> {
		data?: T;
		error?: string;
		message?: string;
		success: boolean;
		timestamp: string;
	}

	interface PaginatedResponse<T = any> {
		items: T[];
		total: number;
		page: number;
		limit: number;
		totalPages: number;
	}

	// Form types
	interface FormField {
		name: string;
		label: string;
		type:
			| "text"
			| "email"
			| "password"
			| "textarea"
			| "select"
			| "checkbox"
			| "radio";
		required?: boolean;
		placeholder?: string;
		options?: { label: string; value: string }[];
		validation?: {
			pattern?: string;
			minLength?: number;
			maxLength?: number;
			min?: number;
			max?: number;
		};
	}

	// Component prop types
	interface BaseComponentProps {
		className?: string;
		children?: React.ReactNode;
		id?: string;
		"data-testid"?: string;
	}

	// Event types
	interface ObservabilityEvent {
		id: string;
		type: string;
		level: "info" | "warn" | "error" | "debug";
		message: string;
		data?: Record<string, any>;
		source: string;
		tags: string[];
		timestamp: Date | string;
		userId?: string;
		sessionId?: string;
	}

	// Progress types
	interface ProgressMetrics {
		taskId: string;
		progress: number;
		blockers: string[];
		milestones: {
			name: string;
			completed: boolean;
			dueDate?: string;
		}[];
		velocity?: number;
		estimatedCompletion?: string;
	}

	// Auth types
	interface AuthSession {
		id: string;
		userId: string;
		token: string;
		expiresAt: Date | string;
		createdAt: Date | string;
		lastUsed?: Date | string;
	}

	// GitHub types
	interface GitHubRepository {
		id: string;
		name: string;
		fullName: string;
		description?: string;
		url: string;
		private: boolean;
		owner: {
			login: string;
			avatar_url: string;
		};
		defaultBranch: string;
		language?: string;
		stargazersCount: number;
		forksCount: number;
		updatedAt: string;
	}

	interface GitHubBranch {
		name: string;
		commit: {
			sha: string;
			url: string;
		};
		protected: boolean;
	}

	// Workflow types
	interface WorkflowStep {
		id: string;
		name: string;
		type: string;
		status: "pending" | "running" | "completed" | "failed" | "skipped";
		input?: any;
		output?: any;
		error?: string;
		startedAt?: Date | string;
		completedAt?: Date | string;
		duration?: number;
	}

	interface Workflow {
		id: string;
		name: string;
		description?: string;
		status: "pending" | "running" | "completed" | "failed" | "cancelled";
		steps: WorkflowStep[];
		createdAt: Date | string;
		updatedAt: Date | string;
		startedAt?: Date | string;
		completedAt?: Date | string;
		userId: string;
	}

	// Redis types
	type RedisKey = string;
	type RedisValue = string | number | Buffer;

	// Database types
	interface DatabaseConnection {
		query: (sql: string, params?: any[]) => Promise<any>;
		execute: (sql: string, params?: any[]) => Promise<any>;
		close: () => Promise<void>;
	}

	// Utility function types
	type AsyncFunction<T = any> = (...args: any[]) => Promise<T>;
	type SyncFunction<T = any> = (...args: any[]) => T;
	type EventHandler<T = any> = (event: T) => void | Promise<void>;

	// Mock types for testing
	interface MockFunction<
		T extends (...args: any[]) => any = (...args: any[]) => any,
	> {
		(...args: Parameters<T>): ReturnType<T>;
		mockReturnValue(value: ReturnType<T>): this;
		mockResolvedValue(value: Awaited<ReturnType<T>>): this;
		mockRejectedValue(value: any): this;
		mockImplementation(fn: T): this;
		mockClear(): this;
		mockReset(): this;
		mockRestore(): this;
	}
}

export {};
