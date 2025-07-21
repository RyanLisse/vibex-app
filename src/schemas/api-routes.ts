import { z } from "zod";

// Base API Response Schemas
export const ApiSuccessResponseSchema = z.object({
	success: z.literal(true),
	data: z.any(),
	timestamp: z.date().default(() => new Date()),
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
		code: z.literal("VALIDATION_ERROR"),
		message: z.string(),
		details: z.array(
			z.object({
				field: z.string(),
				code: z.string(),
				message: z.string(),
			}),
		),
	}),
	timestamp: z.date().default(() => new Date()),
});

// Pagination Schema
export const PaginatedResponseSchema = z.object({
	success: z.literal(true),
	data: z.array(z.any()),
	pagination: z.object({
		page: z.number(),
		limit: z.number(),
		total: z.number(),
		totalPages: z.number(),
	}),
	timestamp: z.date().default(() => new Date()),
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
});

export const GitHubRepositorySchema = z.object({
	id: z.number(),
	name: z.string(),
	full_name: z.string(),
	owner: GitHubUserSchema.pick({ login: true, avatar_url: true }),
	private: z.boolean(),
	html_url: z.string().url(),
	description: z.string().nullable(),
	language: z.string().nullable(),
	stargazers_count: z.number(),
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
	affiliation: z
		.enum(["owner", "collaborator", "organization_member"])
		.default("owner"),
	sort: z
		.enum(["created", "updated", "pushed", "full_name"])
		.default("updated"),
	direction: z.enum(["asc", "desc"]).default("desc"),
	per_page: z.number().min(1).max(100).default(30),
	page: z.number().min(1).default(1),
});

export const GitHubBranchesRequestSchema = z.object({
	owner: z.string(),
	repo: z.string(),
	per_page: z.number().min(1).max(100).default(30),
	page: z.number().min(1).default(1),
});

// Task Schemas
export const TaskSchema = z.object({
	id: z.string().uuid(),
	title: z.string().min(1, "Title is required"),
	description: z.string().optional(),
	status: z.enum(["todo", "in_progress", "done"]).default("todo"),
	priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
	assignee: z.string().optional(),
	tags: z.array(z.string()).default([]),
	created_at: z.date().default(() => new Date()),
	updated_at: z.date().default(() => new Date()),
	due_date: z.date().optional(),
});

export const CreateTaskSchema = TaskSchema.omit({
	id: true,
	created_at: true,
	updated_at: true,
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
	variables: z.record(z.string(), z.string()).default({}),
	created_at: z.date().default(() => new Date()),
	updated_at: z.date().default(() => new Date()),
});

export const CreateEnvironmentSchema = EnvironmentSchema.omit({
	id: true,
	created_at: true,
	updated_at: true,
});

// File Upload Schemas
export const FileUploadRequestSchema = z.object({
	filename: z.string().min(1, "Filename is required"),
	content_type: z.string().min(1, "Content type is required"),
	size: z.number().positive("File size must be positive"),
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
	received: z.boolean().default(true),
	processed: z.boolean().default(false),
	timestamp: z.date().default(() => new Date()),
});

// Inngest Schemas
export const InngestEventSchema = z.object({
	name: z.string().min(1, "Event name is required"),
	data: z.any(),
	user: z
		.object({
			id: z.string(),
			email: z.string().email().optional(),
		})
		.optional(),
	ts: z.number().optional(),
});

export const InngestFunctionSchema = z.object({
	id: z.string(),
	name: z.string(),
	status: z.enum(["active", "paused", "disabled"]),
	trigger: z.object({
		event: z.string(),
		cron: z.string().optional(),
	}),
});

// Helper Functions
export function createApiSuccessResponse<T>(data: T, message?: string) {
	return {
		success: true as const,
		data,
		message,
		timestamp: new Date(),
	};
}

export function createApiErrorResponse(
	message: string,
	statusCode: number = 400,
	details?: Array<{ field: string; message: string }>,
) {
	return {
		success: false as const,
		error: {
			code: `HTTP_${statusCode}`,
			message,
			details,
		},
		timestamp: new Date(),
	};
}

export function createPaginatedResponse<T>(
	data: T[],
	pagination: { page: number; limit: number; total: number },
) {
	return PaginatedResponseSchema.parse({
		success: true,
		data,
		pagination: {
			...pagination,
			totalPages: Math.ceil(pagination.total / pagination.limit),
		},
	});
}

export async function validateApiRequest<T>(
	request: Request,
	schema: z.ZodSchema<T>,
): Promise<{ data?: T; error?: string }> {
	try {
		const body = await request.json();
		const result = schema.safeParse(body);
		if (!result.success) {
			return {
				error: `Validation failed: ${result.error.message}`,
			};
		}
		return { data: result.data };
	} catch (error) {
		return { error: "Invalid JSON in request body" };
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
