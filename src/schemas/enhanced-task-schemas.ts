import { z } from "zod";

// Enhanced task schemas with additional validation and features

export const TaskPrioritySchema = z.enum(["low", "medium", "high", "urgent"]);
export const TaskStatusSchema = z.enum([
	"todo",
	"in_progress",
	"done",
	"archived",
]);

export const EnhancedTaskSchema = z.object({
	id: z.string().uuid(),
	title: z.string().min(1, "Title is required").max(200, "Title too long"),
	description: z.string().max(1000, "Description too long").optional(),
	status: TaskStatusSchema.default("todo"),
	priority: TaskPrioritySchema.default("medium"),
	assigneeId: z.string().uuid().optional(),
	assigneeName: z.string().optional(),
	tags: z.array(z.string()).default([]),
	estimatedHours: z.number().min(0).optional(),
	actualHours: z.number().min(0).optional(),
	dueDate: z.date().optional(),
	completedAt: z.date().optional(),
	createdAt: z.date().default(() => new Date()),
	updatedAt: z.date().default(() => new Date()),
	createdBy: z.string().uuid(),
	updatedBy: z.string().uuid().optional(),
	parentTaskId: z.string().uuid().optional(),
	subtasks: z.array(z.string().uuid()).default([]),
	customFields: z.record(z.string(), z.unknown()).default({}),
});

export const CreateEnhancedTaskSchema = EnhancedTaskSchema.omit({
	id: true,
	createdAt: true,
	updatedAt: true,
	completedAt: true,
	subtasks: true,
});

export const UpdateEnhancedTaskSchema = CreateEnhancedTaskSchema.partial();

export const VoiceTaskSchema = z.object({
	title: z.string().min(1, "Title is required"),
	description: z.string().optional(),
	priority: TaskPrioritySchema.default("medium"),
	audioTranscription: z.string().optional(),
	audioUrl: z.string().url().optional(),
});

// Type exports
export type EnhancedTask = z.infer<typeof EnhancedTaskSchema>;
// Task Progress Schema
export const TaskProgressSchema = z.object({
	taskId: z.string().uuid(),
	progress: z.number().min(0).max(100),
	milestone: z.string().optional(),
	notes: z.string().optional(),
	timestamp: z.string().datetime().optional(),
});

// Screenshot Bug Report Schema
export const ScreenshotBugReportSchema = z.object({
	taskId: z.string().uuid(),
	screenshot: z.string().url(), // Base64 data URL or file URL
	description: z.string().min(1, "Description is required"),
	severity: z.enum(["low", "medium", "high", "critical"]).default("medium"),
	steps: z.array(z.string()).optional(),
	expectedBehavior: z.string().optional(),
	actualBehavior: z.string().optional(),
	browserInfo: z
		.object({
			name: z.string(),
			version: z.string(),
			userAgent: z.string(),
		})
		.optional(),
});

// Voice Task Creation Schema
export const VoiceTaskCreationSchema = z.object({
	audioData: z.string(), // Base64 encoded audio data
	transcription: z.string().optional(),
	title: z.string().min(1, "Title is required").max(200, "Title too long"),
	description: z.string().max(1000, "Description too long").optional(),
	priority: TaskPrioritySchema.default("medium"),
	assigneeId: z.string().uuid().optional(),
	dueDate: z.string().datetime().optional(),
	tags: z.array(z.string()).default([]),
});

export type CreateEnhancedTask = z.infer<typeof CreateEnhancedTaskSchema>;
export type UpdateEnhancedTask = z.infer<typeof UpdateEnhancedTaskSchema>;
export type VoiceTask = z.infer<typeof VoiceTaskSchema>;
export type TaskPriority = z.infer<typeof TaskPrioritySchema>;
export type TaskStatus = z.infer<typeof TaskStatusSchema>;
export type TaskProgress = z.infer<typeof TaskProgressSchema>;
export type ScreenshotBugReport = z.infer<typeof ScreenshotBugReportSchema>;
export type VoiceTaskCreation = z.infer<typeof VoiceTaskCreationSchema>;

// Kanban Schemas
export const KanbanMoveSchema = z.object({
	taskId: z.string().uuid(),
	fromColumn: z.string(),
	toColumn: z.string(),
	position: z.number().optional(),
	userId: z.string().uuid().optional(),
});

export const KanbanBoardConfigSchema = z.object({
	columns: z.array(
		z.object({
			id: z.string(),
			title: z.string(),
			color: z.string().optional(),
			limit: z.number().optional(),
		}),
	),
	swimlanes: z
		.array(
			z.object({
				id: z.string(),
				title: z.string(),
			}),
		)
		.optional(),
	settings: z
		.object({
			enableWipLimits: z.boolean().default(true),
			autoAssignReviewer: z.boolean().default(true),
			allowMultipleAssignees: z.boolean().default(false),
			showTaskEstimates: z.boolean().default(true),
			autoAssign: z.boolean().default(false),
			notifications: z.boolean().default(true),
		})
		.optional(),
});

export const KanbanColumnSchema = z.object({
	id: z.string(),
	title: z.string(),
	color: z.string().optional(),
	limit: z.number().optional(),
	tasks: z.array(z.string().uuid()).default([]),
});

export const KanbanTaskSchema = z.object({
	id: z.string().uuid(),
	title: z.string(),
	description: z.string().optional(),
	status: z.string(),
	priority: TaskPrioritySchema,
	assignee: z.string().optional(),
	dueDate: z.string().datetime().optional(),
	tags: z.array(z.string()).default([]),
});

// PR Integration Schemas
export const TaskPRLinkSchema = z.object({
	taskId: z.string().uuid(),
	prUrl: z.string().url(),
	prNumber: z.number(),
	repository: z.string(),
	status: z.enum(["open", "closed", "merged", "draft"]),
	title: z.string(),
	author: z.string(),
	createdAt: z.string().datetime(),
	updatedAt: z.string().datetime(),
});

export const PRStatusSchema = z.enum(["open", "closed", "merged", "draft"]);

export const PRStatusUpdateSchema = z.object({
	prUrl: z.string().url(),
	status: PRStatusSchema,
	checks: z
		.array(
			z.object({
				name: z.string(),
				status: z.enum(["pending", "success", "failure", "error"]),
				conclusion: z.string().optional(),
			}),
		)
		.optional(),
});

// Progress Monitoring Schemas
export const ProgressMetricsSchema = z.object({
	taskId: z.string().uuid(),
	progress: z.number().min(0).max(100),
	velocity: z.number().optional(),
	estimatedCompletion: z.string().datetime().optional(),
	blockers: z.array(z.string()).default([]),
	milestones: z
		.array(
			z.object({
				name: z.string(),
				completed: z.boolean(),
				dueDate: z.string().datetime().optional(),
			}),
		)
		.default([]),
});

// Bug Report Schemas
export const BugReportSchema = z.object({
	id: z.string().uuid(),
	title: z.string().min(1, "Title is required"),
	description: z.string().min(1, "Description is required"),
	severity: z.enum(["low", "medium", "high", "critical"]),
	status: z.enum(["open", "in_progress", "resolved", "closed"]),
	reporter: z.string(),
	assignee: z.string().optional(),
	screenshots: z.array(z.string()).default([]),
	steps: z.array(z.string()).default([]),
	environment: z
		.object({
			browser: z.string().optional(),
			os: z.string().optional(),
			version: z.string().optional(),
		})
		.optional(),
	createdAt: z.string().datetime(),
	updatedAt: z.string().datetime(),
});

export const ScreenshotDataSchema = z.object({
	id: z.string().uuid(),
	url: z.string().url(),
	filename: z.string(),
	size: z.number(),
	mimeType: z.string(),
	annotations: z
		.array(
			z.object({
				type: z.enum(["arrow", "rectangle", "circle", "text"]),
				x: z.number(),
				y: z.number(),
				width: z.number().optional(),
				height: z.number().optional(),
				text: z.string().optional(),
				color: z.string().optional(),
			}),
		)
		.default([]),
	createdAt: z.string().datetime(),
});

// Transcription Schemas
export const TranscriptionResultSchema = z.object({
	text: z.string(),
	confidence: z.number().min(0).max(1),
	language: z.string(),
	duration: z.number(),
	segments: z
		.array(
			z.object({
				start: z.number(),
				end: z.number(),
				text: z.string(),
				confidence: z.number(),
			}),
		)
		.optional(),
});

// Type exports for all new schemas
export type KanbanMove = z.infer<typeof KanbanMoveSchema>;
export type KanbanBoardConfig = z.infer<typeof KanbanBoardConfigSchema>;
export type KanbanColumn = z.infer<typeof KanbanColumnSchema>;
export type KanbanTask = z.infer<typeof KanbanTaskSchema>;
export type TaskPRLink = z.infer<typeof TaskPRLinkSchema>;
export type PRStatus = z.infer<typeof PRStatusSchema>;
export type PRStatusUpdate = z.infer<typeof PRStatusUpdateSchema>;
export type ProgressMetrics = z.infer<typeof ProgressMetricsSchema>;
export type BugReport = z.infer<typeof BugReportSchema>;
export type ScreenshotData = z.infer<typeof ScreenshotDataSchema>;
export type TranscriptionResult = z.infer<typeof TranscriptionResultSchema>;
