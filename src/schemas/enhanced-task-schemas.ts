import { z } from "zod";

// Enhanced task schemas with additional validation and features

export const TaskPrioritySchema = z.enum(["low", "medium", "high", "urgent"]);
export const TaskStatusSchema = z.enum(["todo", "in_progress", "done", "archived"]);

export const EnhancedTaskSchema = z.object({
	taskId: z.string().uuid(),
	title: z.string().min(1, "Title is required").max(200, "Title too long"),
	description: z.string().max(1000, "Description too long").optional(),
	status: TaskStatusSchema.default("todo"),
	priority: TaskPrioritySchema.default("medium"),
	assigneeId: z.string().uuid().optional(),
	assigneeName: z.string().optional(),
	userId: z.string().uuid(),
	tags: z.array(z.string()).default([]),
	labels: z.array(z.string()).default([]),
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
	dependencies: z.array(z.string().uuid()).default([]),
	blockers: z.array(z.string()).default([]),

	// Screenshot and Bug Report fields
	screenshots: z
		.array(
			z.object({
				id: z.string().uuid(),
				url: z.string().url(),
				filename: z.string(),
				annotations: z
					.array(
						z.object({
							type: z.enum(["arrow", "rectangle", "circle", "text", "highlight"]),
							x: z.number(),
							y: z.number(),
							width: z.number().optional(),
							height: z.number().optional(),
							text: z.string().optional(),
							color: z.string().optional(),
						})
					)
					.default([]),
				createdAt: z.date(),
			})
		)
		.default([]),

	// Voice Recording fields
	voiceRecording: z
		.object({
			url: z.string().url().optional(),
			transcription: z.string().optional(),
			duration: z.number().optional(),
			confidence: z.number().min(0).max(1).optional(),
			language: z.string().optional(),
		})
		.optional(),

	// PR Integration fields
	linkedPRs: z
		.array(
			z.object({
				id: z.string(),
				number: z.number(),
				url: z.string().url(),
				title: z.string(),
				status: z.enum(["draft", "open", "merged", "closed"]),
				repository: z.string(),
				branch: z.object({
					source: z.string(),
					target: z.string(),
				}),
				author: z.string(),
				linkedAt: z.date(),
			})
		)
		.default([]),

	// Kanban positioning
	kanbanPosition: z
		.object({
			columnId: z.string(),
			position: z.number(),
			boardId: z.string().optional(),
		})
		.optional(),

	// Progress tracking
	progress: z.number().min(0).max(100).default(0),
	progressHistory: z
		.array(
			z.object({
				progress: z.number().min(0).max(100),
				timestamp: z.date(),
				updatedBy: z.string().uuid(),
				note: z.string().optional(),
			})
		)
		.default([]),

	// Time tracking
	timeEntries: z
		.array(
			z.object({
				id: z.string().uuid(),
				startTime: z.date(),
				endTime: z.date().optional(),
				duration: z.number().optional(), // in minutes
				description: z.string().optional(),
				userId: z.string().uuid(),
			})
		)
		.default([]),

	// Comments and activity
	comments: z
		.array(
			z.object({
				id: z.string().uuid(),
				content: z.string(),
				author: z.string().uuid(),
				authorName: z.string(),
				createdAt: z.date(),
				updatedAt: z.date().optional(),
				parentCommentId: z.string().uuid().optional(),
			})
		)
		.default([]),

	// Attachments
	attachments: z
		.array(
			z.object({
				id: z.string().uuid(),
				filename: z.string(),
				url: z.string().url(),
				size: z.number(),
				mimeType: z.string(),
				uploadedBy: z.string().uuid(),
				uploadedAt: z.date(),
			})
		)
		.default([]),

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
	completionPercentage: z.number().min(0).max(100),
	timeSpent: z.number().min(0).optional(),
	status: z.string().optional(),
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
	taskId: z.string().uuid(),
	voiceRecording: z.object({
		url: z.string().url().optional(),
		transcription: z.string().optional(),
		duration: z.number().optional(),
	}),
	title: z.string().min(1, "Title is required").max(200, "Title too long"),
	description: z.string().max(1000, "Description too long").optional(),
	priority: TaskPrioritySchema.default("medium"),
	userId: z.string().uuid(),
	assignee: z.string().optional(),
	dueDate: z.date().optional(),
	tags: z.array(z.string()).default([]),
	labels: z.array(z.string()).default([]),
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
		})
	),
	swimlanes: z
		.array(
			z.object({
				id: z.string(),
				title: z.string(),
			})
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
			})
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
			})
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
			})
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
			})
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
