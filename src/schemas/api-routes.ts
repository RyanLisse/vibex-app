import { z } from "zod";

// Base API Response Schemas
export const ApiSuccessResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
	z.object({
		success: z.literal(true),
		data: dataSchema,
		message: z.string().optional(),
		meta: z
			.object({
				timestamp: z.string(),
				version: z.string(),
				requestId: z.string(),
			})
			.optional(),
	});

export const ApiErrorResponseSchema = z.object({
	success: z.literal(false),
	error: z.object({
		code: z.string(),
		message: z.string(),
		details: z.any().optional(),
	}),
	timestamp: z.date().default(() => new Date()),
});

export const ValidationErrorSchema = z.object({
	success: z.literal(false),
	error: z.object({
		code: z.enum(["VALIDATION_ERROR", "INVALID_INPUT", "MISSING_FIELD"]),
		message: z.string(),
		details: z.array(
			z.object({
				field: z.string(),
				code: z.string(),
				message: z.string(),
			})
		),
	}),
	timestamp: z.date().default(() => new Date()),
});

// Pagination Schema
export const PaginatedResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
	z.object({
		success: z.literal(true),
		data: z.array(dataSchema),
		pagination: z.object({
			page: z.number().min(1),
			limit: z.number().min(1),
			total: z.number().min(0),
			totalPages: z.number().min(0),
			hasNext: z.boolean(),
			hasPrev: z.boolean(),
		}),
		message: z.string().optional(),
	});

// GitHub OAuth Schemas
export const GitHubOAuthCallbackSchema = z.object({
	code: z.string().min(1, "Authorization code is required"),
	state: z.string().optional(),
	error: z.string().optional(),
	error_description: z.string().optional(),
});

export const GitHubOAuthUrlSchema = z.object({
	redirect_uri: z.string().url("Invalid redirect URI format"),
	scope: z.string().default("user:email,public_repo"),
	state: z.string().optional(),
});

export const GitHubUserSchema = z.object({
	id: z.number(),
	login: z.string(),
	name: z.string().nullable(),
	email: z.string().email().nullable(),
	avatar_url: z.string().url(),
	html_url: z.string().url(),
	company: z.string().nullable(),
	location: z.string().nullable(),
	bio: z.string().nullable(),
	followers: z.number(),
	following: z.number(),
	public_repos: z.number(),
	created_at: z.string(),
	updated_at: z.string(),
});

export const GitHubRepositorySchema = z.object({
	id: z.number(),
	name: z.string(),
	full_name: z.string(),
	owner: GitHubUserSchema,
	private: z.boolean(),
	html_url: z.string().url(),
	description: z.string().nullable(),
	language: z.string().nullable(),
	stargazers_count: z.number(),
	clone_url: z.string().url(),
	ssh_url: z.string(),
	default_branch: z.string(),
	fork: z.boolean(),
	archived: z.boolean(),
	disabled: z.boolean(),
	watchers_count: z.number(),
	forks_count: z.number(),
	open_issues_count: z.number(),
	size: z.number(),
	created_at: z.string(),
	updated_at: z.string(),
	pushed_at: z.string(),
	permissions: z
		.object({
			admin: z.boolean(),
			push: z.boolean(),
			pull: z.boolean(),
		})
		.optional(),
});

export const GitHubBranchSchema = z.object({
	name: z.string(),
	commit: z.object({
		sha: z.string(),
		url: z.string().url(),
	}),
	protected: z.boolean(),
});

// Request Schemas
export const GitHubRepositoriesRequestSchema = z.object({
	visibility: z.enum(["all", "public", "private"]).default("all"),
	affiliation: z.enum(["owner", "collaborator", "organization_member"]).default("owner"),
	sort: z.enum(["created", "updated", "pushed", "full_name"]).default("updated"),
	direction: z.enum(["asc", "desc"]).default("desc"),
	per_page: z.number().min(1).max(100).default(30),
	page: z.number().min(1).default(1),
});

export const GitHubBranchesRequestSchema = z.object({
	owner: z.string().min(1, "Owner is required"),
	repo: z.string().min(1, "Repository name is required"),
	per_page: z.number().min(1).max(100).default(30),
	page: z.number().min(1).default(1),
});

// Task Schemas
export const TaskSchema = z.object({
	id: z.string().uuid(),
	title: z.string().min(1, "Title is required").max(200, "Title must be less than 200 characters"),
	description: z.string().optional(),
	status: z.enum(["todo", "in_progress", "done"]).default("todo"),
	priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
	assignee: z.string().optional(),
	tags: z.array(z.string()).default([]),
	created_at: z.date(),
	updated_at: z.date(),
	due_date: z.date().optional(),
});

export const CreateTaskSchema = z.object({
	title: z.string().min(1, "Title is required").max(200, "Title must be less than 200 characters"),
	description: z.string().optional(),
	status: z.enum(["todo", "in_progress", "done"]).default("todo"),
	priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
	assignee: z.string().optional(),
	tags: z.array(z.string()).default([]),
	due_date: z.date().optional(),
});

export const UpdateTaskSchema = CreateTaskSchema.partial();

export const TasksRequestSchema = z.object({
	status: z.enum(["todo", "in_progress", "done"]).optional(),
	priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
	assignee: z.string().optional(),
	tags: z.array(z.string()).optional(),
	per_page: z.number().min(1).max(100).default(30),
	page: z.number().min(1).default(1),
});

// Environment Schemas
export const EnvironmentSchema = z.object({
	id: z.string().uuid(),
	name: z.string().min(1, "Environment name is required"),
	description: z.string().optional(),
	type: z.enum(["development", "staging", "production", "testing"]).default("development"),
	url: z.string().url().optional(),
	status: z.enum(["active", "inactive", "maintenance"]).default("active"),
	variables: z.record(z.string(), z.string()).default({}),
	created_at: z.date(),
	updated_at: z.date(),
});

export const CreateEnvironmentSchema = z.object({
	name: z.string().min(1, "Environment name is required"),
	description: z.string().optional(),
	type: z.enum(["development", "staging", "production", "testing"]).default("development"),
	url: z.string().url().optional(),
	status: z.enum(["active", "inactive", "maintenance"]).default("active"),
	variables: z.record(z.string(), z.string()).default({}),
});

// File Upload Schemas
export const FileUploadRequestSchema = z.object({
	filename: z.string().min(1, "Filename is required"),
	content_type: z
		.string()
		.min(1, "Content type is required")
		.refine(
			(type) =>
				["image/jpeg", "image/png", "image/gif", "application/pdf", "text/plain"].includes(type),
			"File type not supported"
		),
	size: z
		.number()
		.positive("File size must be positive")
		.max(10 * 1024 * 1024, "File size must be less than 10MB"),
});

export const FileUploadResponseSchema = z.object({
	upload_url: z.string().url(),
	file_id: z.string().uuid(),
	expires_at: z.date(),
});

// Webhook Schemas
export const WebhookPayloadSchema = z.object({
	event: z.string().min(1),
	timestamp: z.date().default(() => new Date()),
	data: z.any(),
	source: z.string().optional(),
});

export const WebhookResponseSchema = z.object({
	received: z.boolean(),
	processed: z.boolean(),
	message: z.string().optional(),
	error: z.string().optional(),
});

// Inngest Schemas
export const InngestEventSchema = z.object({
	name: z.string().min(1, "Event name is required"),
	data: z.any().default({}),
	user: z
		.object({
			id: z.string(),
			email: z.string().email().optional(),
		})
		.optional(),
	ts: z.number().optional(),
	v: z.string().optional(),
});

export const InngestFunctionSchema = z.object({
	id: z.string(),
	name: z.string(),
	trigger: z.object({
		event: z.string(),
		expression: z.string().optional(),
		cron: z.string().optional(),
	}),
	config: z
		.object({
			retries: z.number().default(3),
			timeout: z.string().default("30s"),
			rateLimit: z
				.object({
					limit: z.number(),
					period: z.string(),
				})
				.optional(),
		})
		.default({
			retries: 3,
			timeout: "30s",
		}),
});

// Helper Functions
export function createApiSuccessResponse<T>(data: T, message?: string) {
	return {
		success: true as const,
		data,
		message,
		meta: {
			timestamp: new Date().toISOString(),
			version: "1.0.0",
			requestId: crypto.randomUUID(),
		},
	};
}

export function createApiErrorResponse(
	message: string,
	statusCode = 400,
	details?: Array<{ field: string; message: string }>
) {
	return {
		success: false as const,
		error: {
			code: `HTTP_${statusCode}`,
			message,
			details,
		},
		message,
		statusCode,
		timestamp: new Date().toISOString(),
		validationErrors: details,
	};
}

export function createPaginatedResponse<T>(
	data: T[],
	pagination: { page: number; limit: number; total: number }
) {
	const totalPages = Math.ceil(pagination.total / pagination.limit);
	return {
		success: true as const,
		data,
		pagination: {
			...pagination,
			totalPages,
			hasNext: pagination.page < totalPages,
			hasPrev: pagination.page > 1,
		},
	};
}

export async function validateApiRequest<T>(
	request: Request,
	schema: z.ZodSchema<T>
): Promise<{ success: boolean; data?: T; error?: string }> {
	try {
		const body = await request.json();
		const result = schema.safeParse(body);
		if (!result.success) {
			return {
				success: false,
				error: `Validation failed: ${result.error.message}`,
			};
		}
		return { success: true, data: result.data };
	} catch (error) {
		return { success: false, error: "Invalid JSON in request body" };
	}
}

// Type exports
export type ApiSuccessResponse = z.infer<typeof ApiSuccessResponseSchema>;
export type ApiErrorResponse = z.infer<typeof ApiErrorResponseSchema>;
export type ValidationError = z.infer<typeof ValidationErrorSchema>;
export type PaginatedResponse = z.infer<typeof PaginatedResponseSchema>;
export type GitHubOAuthCallback = z.infer<typeof GitHubOAuthCallbackSchema>;
export type GitHubOAuthUrl = z.infer<typeof GitHubOAuthUrlSchema>;
export type GitHubUser = z.infer<typeof GitHubUserSchema>;
export type GitHubRepository = z.infer<typeof GitHubRepositorySchema>;
export type GitHubBranch = z.infer<typeof GitHubBranchSchema>;
export type Task = z.infer<typeof TaskSchema>;
export type CreateTask = z.infer<typeof CreateTaskSchema>;
export type UpdateTask = z.infer<typeof UpdateTaskSchema>;
export type Environment = z.infer<typeof EnvironmentSchema>;
export type CreateEnvironment = z.infer<typeof CreateEnvironmentSchema>;
export type FileUploadRequest = z.infer<typeof FileUploadRequestSchema>;
export type FileUploadResponse = z.infer<typeof FileUploadResponseSchema>;
export type WebhookPayload = z.infer<typeof WebhookPayloadSchema>;
export type WebhookResponse = z.infer<typeof WebhookResponseSchema>;
export type InngestEvent = z.infer<typeof InngestEventSchema>;
export type InngestFunction = z.infer<typeof InngestFunctionSchema>;
