// Database migration schemas for enhanced task management features
import { z } from "zod";

// Migration version schema
export const MigrationVersionSchema = z.object({
	version: z.string(),
	name: z.string(),
	description: z.string(),
	appliedAt: z.date(),
	rollbackSql: z.string().optional(),
});

// Database table schemas for SQL generation
export const TaskTableSchema = z.object({
	task_id: z.string().uuid(),
	title: z.string().max(200),
	description: z.string().max(1000).nullable(),
	status: z.enum(["todo", "in_progress", "done", "archived"]),
	priority: z.enum(["low", "medium", "high", "urgent"]),
	assignee_id: z.string().uuid().nullable(),
	assignee_name: z.string().nullable(),
	user_id: z.string().uuid(),
	tags: z.string(), // JSON array as string
	labels: z.string(), // JSON array as string
	estimated_hours: z.number().nullable(),
	actual_hours: z.number().nullable(),
	due_date: z.date().nullable(),
	completed_at: z.date().nullable(),
	created_at: z.date(),
	updated_at: z.date(),
	created_by: z.string().uuid(),
	updated_by: z.string().uuid().nullable(),
	parent_task_id: z.string().uuid().nullable(),
	dependencies: z.string(), // JSON array as string
	blockers: z.string(), // JSON array as string
	progress: z.number().min(0).max(100).default(0),
	kanban_column_id: z.string().nullable(),
	kanban_position: z.number().nullable(),
	kanban_board_id: z.string().nullable(),
	custom_fields: z.string(), // JSON object as string
});

export const TaskScreenshotSchema = z.object({
	id: z.string().uuid(),
	task_id: z.string().uuid(),
	url: z.string().url(),
	filename: z.string(),
	annotations: z.string(), // JSON array as string
	created_at: z.date(),
});

export const TaskVoiceRecordingSchema = z.object({
	id: z.string().uuid(),
	task_id: z.string().uuid(),
	url: z.string().url().nullable(),
	transcription: z.string().nullable(),
	duration: z.number().nullable(),
	confidence: z.number().min(0).max(1).nullable(),
	language: z.string().nullable(),
	created_at: z.date(),
});

export const TaskPRLinkTableSchema = z.object({
	id: z.string().uuid(),
	task_id: z.string().uuid(),
	pr_id: z.string(),
	pr_number: z.number(),
	pr_url: z.string().url(),
	pr_title: z.string(),
	pr_status: z.enum(["draft", "open", "merged", "closed"]),
	repository: z.string(),
	source_branch: z.string(),
	target_branch: z.string(),
	author: z.string(),
	linked_at: z.date(),
	created_at: z.date(),
	updated_at: z.date(),
});

export const TaskProgressHistorySchema = z.object({
	id: z.string().uuid(),
	task_id: z.string().uuid(),
	progress: z.number().min(0).max(100),
	timestamp: z.date(),
	updated_by: z.string().uuid(),
	note: z.string().nullable(),
});

export const TaskTimeEntrySchema = z.object({
	id: z.string().uuid(),
	task_id: z.string().uuid(),
	user_id: z.string().uuid(),
	start_time: z.date(),
	end_time: z.date().nullable(),
	duration: z.number().nullable(), // in minutes
	description: z.string().nullable(),
	created_at: z.date(),
});

export const TaskCommentSchema = z.object({
	id: z.string().uuid(),
	task_id: z.string().uuid(),
	content: z.string(),
	author_id: z.string().uuid(),
	author_name: z.string(),
	parent_comment_id: z.string().uuid().nullable(),
	created_at: z.date(),
	updated_at: z.date().nullable(),
});

export const TaskAttachmentSchema = z.object({
	id: z.string().uuid(),
	task_id: z.string().uuid(),
	filename: z.string(),
	url: z.string().url(),
	size: z.number(),
	mime_type: z.string(),
	uploaded_by: z.string().uuid(),
	uploaded_at: z.date(),
});

export const KanbanBoardSchema = z.object({
	id: z.string().uuid(),
	name: z.string(),
	description: z.string().nullable(),
	created_by: z.string().uuid(),
	created_at: z.date(),
	updated_at: z.date(),
	settings: z.string(), // JSON object as string
});

export const KanbanColumnTableSchema = z.object({
	id: z.string().uuid(),
	board_id: z.string().uuid(),
	title: z.string(),
	color: z.string().nullable(),
	position: z.number(),
	task_limit: z.number().nullable(),
	created_at: z.date(),
	updated_at: z.date(),
});

// Migration SQL templates
export const MigrationSQLTemplates = {
	// Add new columns to existing tasks table
	addScreenshotSupport: `
		ALTER TABLE tasks 
		ADD COLUMN IF NOT EXISTS screenshots JSONB DEFAULT '[]'::jsonb;
	`,

	addVoiceRecordingSupport: `
		ALTER TABLE tasks 
		ADD COLUMN IF NOT EXISTS voice_recording JSONB DEFAULT NULL;
	`,

	addPRLinkSupport: `
		ALTER TABLE tasks 
		ADD COLUMN IF NOT EXISTS linked_prs JSONB DEFAULT '[]'::jsonb;
	`,

	addKanbanSupport: `
		ALTER TABLE tasks 
		ADD COLUMN IF NOT EXISTS kanban_column_id VARCHAR(255),
		ADD COLUMN IF NOT EXISTS kanban_position INTEGER,
		ADD COLUMN IF NOT EXISTS kanban_board_id VARCHAR(255);
	`,

	addProgressTracking: `
		ALTER TABLE tasks 
		ADD COLUMN IF NOT EXISTS progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
		ADD COLUMN IF NOT EXISTS progress_history JSONB DEFAULT '[]'::jsonb;
	`,

	addTimeTracking: `
		ALTER TABLE tasks 
		ADD COLUMN IF NOT EXISTS time_entries JSONB DEFAULT '[]'::jsonb;
	`,

	addCommentsAndAttachments: `
		ALTER TABLE tasks 
		ADD COLUMN IF NOT EXISTS comments JSONB DEFAULT '[]'::jsonb,
		ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;
	`,

	// Create new tables for normalized data
	createTaskScreenshotsTable: `
		CREATE TABLE IF NOT EXISTS task_screenshots (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			task_id UUID NOT NULL REFERENCES tasks(task_id) ON DELETE CASCADE,
			url TEXT NOT NULL,
			filename VARCHAR(255) NOT NULL,
			annotations JSONB DEFAULT '[]'::jsonb,
			created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
		);
		CREATE INDEX IF NOT EXISTS idx_task_screenshots_task_id ON task_screenshots(task_id);
	`,

	createTaskVoiceRecordingsTable: `
		CREATE TABLE IF NOT EXISTS task_voice_recordings (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			task_id UUID NOT NULL REFERENCES tasks(task_id) ON DELETE CASCADE,
			url TEXT,
			transcription TEXT,
			duration INTEGER,
			confidence DECIMAL(3,2),
			language VARCHAR(10),
			created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
		);
		CREATE INDEX IF NOT EXISTS idx_task_voice_recordings_task_id ON task_voice_recordings(task_id);
	`,

	createTaskPRLinksTable: `
		CREATE TABLE IF NOT EXISTS task_pr_links (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			task_id UUID NOT NULL REFERENCES tasks(task_id) ON DELETE CASCADE,
			pr_id VARCHAR(255) NOT NULL,
			pr_number INTEGER NOT NULL,
			pr_url TEXT NOT NULL,
			pr_title TEXT NOT NULL,
			pr_status VARCHAR(20) NOT NULL CHECK (pr_status IN ('draft', 'open', 'merged', 'closed')),
			repository VARCHAR(255) NOT NULL,
			source_branch VARCHAR(255) NOT NULL,
			target_branch VARCHAR(255) NOT NULL,
			author VARCHAR(255) NOT NULL,
			linked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
			created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
			updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
		);
		CREATE INDEX IF NOT EXISTS idx_task_pr_links_task_id ON task_pr_links(task_id);
		CREATE INDEX IF NOT EXISTS idx_task_pr_links_pr_id ON task_pr_links(pr_id);
	`,

	createKanbanBoardsTable: `
		CREATE TABLE IF NOT EXISTS kanban_boards (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			name VARCHAR(255) NOT NULL,
			description TEXT,
			created_by UUID NOT NULL,
			created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
			updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
			settings JSONB DEFAULT '{}'::jsonb
		);
	`,

	createKanbanColumnsTable: `
		CREATE TABLE IF NOT EXISTS kanban_columns (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			board_id UUID NOT NULL REFERENCES kanban_boards(id) ON DELETE CASCADE,
			title VARCHAR(255) NOT NULL,
			color VARCHAR(7),
			position INTEGER NOT NULL,
			task_limit INTEGER,
			created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
			updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
		);
		CREATE INDEX IF NOT EXISTS idx_kanban_columns_board_id ON kanban_columns(board_id);
	`,

	// Indexes for performance
	createPerformanceIndexes: `
		CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
		CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
		CREATE INDEX IF NOT EXISTS idx_tasks_assignee_id ON tasks(assignee_id);
		CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
		CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at);
		CREATE INDEX IF NOT EXISTS idx_tasks_updated_at ON tasks(updated_at);
		CREATE INDEX IF NOT EXISTS idx_tasks_kanban_column ON tasks(kanban_column_id, kanban_position);
		CREATE INDEX IF NOT EXISTS idx_tasks_progress ON tasks(progress);
	`,
};

// Type exports
export type MigrationVersion = z.infer<typeof MigrationVersionSchema>;
export type TaskTable = z.infer<typeof TaskTableSchema>;
export type TaskScreenshot = z.infer<typeof TaskScreenshotSchema>;
export type TaskVoiceRecording = z.infer<typeof TaskVoiceRecordingSchema>;
export type TaskPRLinkTable = z.infer<typeof TaskPRLinkTableSchema>;
export type TaskProgressHistory = z.infer<typeof TaskProgressHistorySchema>;
export type TaskTimeEntry = z.infer<typeof TaskTimeEntrySchema>;
export type TaskComment = z.infer<typeof TaskCommentSchema>;
export type TaskAttachment = z.infer<typeof TaskAttachmentSchema>;
export type KanbanBoard = z.infer<typeof KanbanBoardSchema>;
export type KanbanColumnTable = z.infer<typeof KanbanColumnTableSchema>;
