-- Task Management Enhancements Migration
-- This migration adds fields required for the enhanced task management features

-- Add missing columns to tasks table
ALTER TABLE "tasks" 
ADD COLUMN IF NOT EXISTS "assignee_id" varchar(255),
ADD COLUMN IF NOT EXISTS "due_date" timestamp,
ADD COLUMN IF NOT EXISTS "creation_method" varchar(50) DEFAULT 'manual',
ADD COLUMN IF NOT EXISTS "completion_date" timestamp,
ADD COLUMN IF NOT EXISTS "kanban_position" integer,
ADD COLUMN IF NOT EXISTS "kanban_column" varchar(50) DEFAULT 'todo';

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS "tasks_assignee_id_idx" ON "tasks" ("assignee_id");
CREATE INDEX IF NOT EXISTS "tasks_due_date_idx" ON "tasks" ("due_date");
CREATE INDEX IF NOT EXISTS "tasks_creation_method_idx" ON "tasks" ("creation_method");
CREATE INDEX IF NOT EXISTS "tasks_kanban_column_idx" ON "tasks" ("kanban_column");

-- Create task_labels table for flexible tagging
CREATE TABLE IF NOT EXISTS "task_labels" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "task_id" uuid NOT NULL REFERENCES "tasks"("id") ON DELETE CASCADE,
  "label" varchar(50) NOT NULL,
  "color" varchar(7) DEFAULT '#6B7280',
  "created_at" timestamp DEFAULT now() NOT NULL,
  UNIQUE("task_id", "label")
);

CREATE INDEX IF NOT EXISTS "task_labels_task_id_idx" ON "task_labels" ("task_id");
CREATE INDEX IF NOT EXISTS "task_labels_label_idx" ON "task_labels" ("label");

-- Create task_attachments table for screenshots and voice recordings
CREATE TABLE IF NOT EXISTS "task_attachments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "task_id" uuid NOT NULL REFERENCES "tasks"("id") ON DELETE CASCADE,
  "type" varchar(50) NOT NULL, -- 'screenshot', 'voice_recording', 'document'
  "url" text NOT NULL,
  "filename" varchar(255),
  "size_bytes" integer,
  "mime_type" varchar(100),
  "metadata" jsonb, -- For annotations, transcriptions, etc.
  "created_at" timestamp DEFAULT now() NOT NULL,
  "created_by" varchar(255)
);

CREATE INDEX IF NOT EXISTS "task_attachments_task_id_idx" ON "task_attachments" ("task_id");
CREATE INDEX IF NOT EXISTS "task_attachments_type_idx" ON "task_attachments" ("type");

-- Create task_pr_links table for GitHub PR integration
CREATE TABLE IF NOT EXISTS "task_pr_links" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "task_id" uuid NOT NULL REFERENCES "tasks"("id") ON DELETE CASCADE,
  "pr_number" integer NOT NULL,
  "repository" varchar(255) NOT NULL,
  "pr_url" text NOT NULL,
  "pr_title" text,
  "pr_status" varchar(50), -- 'open', 'closed', 'merged', 'draft'
  "review_status" varchar(50), -- 'pending', 'approved', 'changes_requested'
  "author" varchar(255),
  "branch" varchar(255),
  "auto_update_status" boolean DEFAULT true,
  "last_synced_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  UNIQUE("task_id", "pr_number", "repository")
);

CREATE INDEX IF NOT EXISTS "task_pr_links_task_id_idx" ON "task_pr_links" ("task_id");
CREATE INDEX IF NOT EXISTS "task_pr_links_pr_status_idx" ON "task_pr_links" ("pr_status");

-- Create task_progress_snapshots table for real-time progress tracking
CREATE TABLE IF NOT EXISTS "task_progress_snapshots" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "task_id" uuid NOT NULL REFERENCES "tasks"("id") ON DELETE CASCADE,
  "progress_percentage" integer DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  "time_spent_minutes" integer DEFAULT 0,
  "blockers" jsonb,
  "notes" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "created_by" varchar(255)
);

CREATE INDEX IF NOT EXISTS "task_progress_snapshots_task_id_idx" ON "task_progress_snapshots" ("task_id");
CREATE INDEX IF NOT EXISTS "task_progress_snapshots_created_at_idx" ON "task_progress_snapshots" ("created_at");

-- Add check constraints
ALTER TABLE "tasks" 
ADD CONSTRAINT "valid_creation_method" CHECK ("creation_method" IN ('manual', 'voice', 'screenshot', 'template', 'api')),
ADD CONSTRAINT "valid_kanban_column" CHECK ("kanban_column" IN ('todo', 'in_progress', 'in_review', 'done', 'blocked'));

-- Add foreign key for assignee
ALTER TABLE "tasks"
ADD CONSTRAINT "tasks_assignee_id_fkey" FOREIGN KEY ("assignee_id") REFERENCES "users"("id") ON DELETE SET NULL;

-- Create function to update task status when PR is merged
CREATE OR REPLACE FUNCTION update_task_status_on_pr_merge()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.pr_status = 'merged' AND OLD.pr_status != 'merged' AND NEW.auto_update_status = true THEN
    UPDATE tasks 
    SET status = 'completed', 
        completion_date = now(),
        updated_at = now()
    WHERE id = NEW.task_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic task status updates
DROP TRIGGER IF EXISTS update_task_on_pr_merge ON task_pr_links;
CREATE TRIGGER update_task_on_pr_merge
  AFTER UPDATE ON task_pr_links
  FOR EACH ROW
  EXECUTE FUNCTION update_task_status_on_pr_merge();

-- Add comment for documentation
COMMENT ON TABLE "task_labels" IS 'Flexible tagging system for tasks';
COMMENT ON TABLE "task_attachments" IS 'Storage for task-related files including screenshots and voice recordings';
COMMENT ON TABLE "task_pr_links" IS 'Links tasks to GitHub pull requests with automatic status synchronization';
COMMENT ON TABLE "task_progress_snapshots" IS 'Historical tracking of task progress for analytics and monitoring';