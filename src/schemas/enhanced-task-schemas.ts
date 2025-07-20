import { z } from "zod";
import { IdSchema } from "@/src/shared/schemas/validation";

// Enhanced task-related schemas for task management enhancements

// Screenshot and file metadata schema
export const ScreenshotDataSchema = z.object({
	id: z.string(),
	imageBlob: z.instanceof(Blob),
	timestamp: z.date(),
	annotations: z.array(
		z.object({
			type: z.enum(["arrow", "text", "highlight", "rectangle"]),
			position: z.object({ x: z.number(), y: z.number() }),
			data: z.union([z.string(), z.record(z.string(), z.any())]),
		}),
	),
});

export const FileMetadataSchema = z.object({
	id: z.string(),
	filename: z.string(),
	mimeType: z.string(),
	size: z.number(),
	uploadedAt: z.date(),
	taskId: z.string(),
	type: z.enum(["screenshot", "voice_recording", "attachment"]),
	url: z.string(),
});

// Voice recording schema
export const VoiceRecordingSchema = z.object({
	id: z.string(),
	audioBlob: z.instanceof(Blob),
	duration: z.number(),
	timestamp: z.date(),
});

export const TranscriptionResultSchema = z.object({
	text: z.string(),
	confidence: z.number(),
	language: z.string(),
	segments: z.array(
		z.object({
			text: z.string(),
			start: z.number(),
			end: z.number(),
			confidence: z.number(),
		}),
	),
});

export const VoiceTaskSchema = z.object({
	transcription: TranscriptionResultSchema,
	extractedData: z.object({
		title: z.string(),
		description: z.string(),
		priority: z.string().optional(),
		assignee: z.string().optional(),
	}),
});

// Progress tracking schema
export const TaskProgressSchema = z.object({
	taskId: z.string(),
	status: z.enum(["pending", "in_progress", "completed", "cancelled"]),
	completionPercentage: z.number().min(0).max(100),
	timeSpent: z.number(), // in minutes
	estimatedTimeRemaining: z.number().optional(), // in minutes
	lastUpdated: z.date(),
	isOverdue: z.boolean(),
	isBlocked: z.boolean(),
});

export const ProgressMetricsSchema = z.object({
	totalTasks: z.number(),
	completedTasks: z.number(),
	inProgressTasks: z.number(),
	overdueTasks: z.number(),
	averageCompletionTime: z.number(),
});

// Kanban board schema
export const KanbanTaskSchema = z.object({
	id: z.string(),
	name: z.string(),
	column: z.string(),
	priority: z.enum(["low", "medium", "high", "urgent"]),
	assignee: z.string(),
	tags: z.array(z.string()),
	dueDate: z.date().optional(),
});

export const KanbanColumnSchema = z.object({
	id: z.string(),
	name: z.string(),
	maxItems: z.number().optional(),
	color: z.string(),
});

// PR status integration schema
export const PRStatusSchema = z.object({
	prId: z.string(),
	title: z.string(),
	status: z.enum(["draft", "open", "merged", "closed"]),
	reviewStatus: z.enum(["pending", "approved", "changes_requested"]),
	checks: z.array(
		z.object({
			name: z.string(),
			status: z.enum(["pending", "success", "failure"]),
			conclusion: z.string().optional(),
		}),
	),
	reviewers: z.array(
		z.object({
			login: z.string(),
			status: z.enum(["requested", "approved", "changes_requested"]),
		}),
	),
	mergeable: z.boolean(),
});

export const TaskPRLinkSchema = z.object({
	taskId: z.string(),
	prId: z.string(),
	repository: z.string(),
	branch: z.string(),
	autoUpdateStatus: z.boolean(),
});

// Enhanced task schema with all new fields
export const EnhancedTaskSchema = z.object({
	id: IdSchema,
	title: z.string().min(1).max(200),
	description: z.string().max(2000).optional(),
	status: z.enum(["pending", "in_progress", "completed", "cancelled"]),
	priority: z.enum(["low", "medium", "high", "urgent"]),
	assignee: z.string(),
	tags: z.array(z.string()),
	createdAt: z.date(),
	updatedAt: z.date(),
	dueDate: z.date().optional(),

	// New fields for enhancements
	creationMethod: z.enum(["manual", "voice", "bug_report"]),
	screenshots: z.array(ScreenshotDataSchema).default([]),
	voiceRecording: VoiceRecordingSchema.optional(),
	progress: TaskProgressSchema,
	prLinks: z.array(TaskPRLinkSchema).default([]),
	kanbanPosition: z.object({
		column: z.string(),
		order: z.number(),
	}),
});

// Bug report schema
export const BugReportSchema = z.object({
	id: z.string(),
	title: z.string(),
	description: z.string(),
	screenshot: ScreenshotDataSchema,
	priority: z.enum(["low", "medium", "high", "critical"]),
	tags: z.array(z.string()),
});

// Create schemas for API endpoints
export const CreateBugReportSchema = z.object({
	title: z.string().min(1).max(200),
	description: z.string().max(2000),
	screenshot: z.object({
		imageData: z.string(), // base64 encoded image
		annotations: z.array(
			z.object({
				type: z.enum(["arrow", "text", "highlight", "rectangle"]),
				position: z.object({ x: z.number(), y: z.number() }),
				data: z.union([z.string(), z.record(z.string(), z.any())]),
			}),
		),
	}),
	priority: z.enum(["low", "medium", "high", "critical"]).default("medium"),
});

export const CreateVoiceTaskSchema = z.object({
	audioData: z.string(), // base64 encoded audio
	language: z.string().default("en-US"),
});

export const UpdateTaskProgressSchema = z.object({
	taskId: z.string(),
	completionPercentage: z.number().min(0).max(100).optional(),
	timeSpent: z.number().optional(),
	estimatedTimeRemaining: z.number().optional(),
	isBlocked: z.boolean().optional(),
	statusMessage: z.string().optional(),
});

export const MoveKanbanTaskSchema = z.object({
	taskId: z.string(),
	fromColumn: z.string(),
	toColumn: z.string(),
	newOrder: z.number(),
});

// Type exports
export type ScreenshotData = z.infer<typeof ScreenshotDataSchema>;
export type FileMetadata = z.infer<typeof FileMetadataSchema>;
export type VoiceRecording = z.infer<typeof VoiceRecordingSchema>;
export type TranscriptionResult = z.infer<typeof TranscriptionResultSchema>;
export type VoiceTask = z.infer<typeof VoiceTaskSchema>;
export type TaskProgress = z.infer<typeof TaskProgressSchema>;
export type ProgressMetrics = z.infer<typeof ProgressMetricsSchema>;
export type KanbanTask = z.infer<typeof KanbanTaskSchema>;
export type KanbanColumn = z.infer<typeof KanbanColumnSchema>;
export type PRStatus = z.infer<typeof PRStatusSchema>;
export type TaskPRLink = z.infer<typeof TaskPRLinkSchema>;
export type EnhancedTask = z.infer<typeof EnhancedTaskSchema>;
export type BugReport = z.infer<typeof BugReportSchema>;
export type CreateBugReport = z.infer<typeof CreateBugReportSchema>;
export type CreateVoiceTask = z.infer<typeof CreateVoiceTaskSchema>;
export type UpdateTaskProgress = z.infer<typeof UpdateTaskProgressSchema>;
export type MoveKanbanTask = z.infer<typeof MoveKanbanTaskSchema>;
// Screenshot Bug Report Schema
export const ScreenshotBugReportSchema = z.object({
	screenshot: z.string(), // base64 encoded
	description: z.string(),
	severity: z.enum(["low", "medium", "high", "critical"]),
	browser: z.string().optional(),
	viewport: z
		.object({
			width: z.number(),
			height: z.number(),
		})
		.optional(),
	url: z.string().optional(),
	userAgent: z.string().optional(),
});

// Voice Task Creation Schema
export const VoiceTaskCreationSchema = z.object({
	audioData: z.string(), // base64 encoded audio
	transcript: z.string().optional(),
	language: z.string().default("en-US"),
	confidence: z.number().min(0).max(1).optional(),
	metadata: z.record(z.string(), z.any()).optional(),
});

// Export additional types
export type ScreenshotBugReport = z.infer<typeof ScreenshotBugReportSchema>;
export type VoiceTaskCreation = z.infer<typeof VoiceTaskCreationSchema>;

// Aliases for expected schema names
export const KanbanMoveSchema = MoveKanbanTaskSchema;
export const KanbanBoardConfigSchema = KanbanColumnSchema;
export const PRStatusUpdateSchema = PRStatusSchema;
export const TaskProgressUpdateSchema = UpdateTaskProgressSchema;
