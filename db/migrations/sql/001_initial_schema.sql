-- Migration: initial_schema
-- Created: 2025-01-18T20:40:00.000Z

-- Up
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- Create migrations table first
CREATE TABLE IF NOT EXISTS "migrations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" varchar(255) NOT NULL UNIQUE,
  "executed_at" timestamp DEFAULT now() NOT NULL,
  "checksum" varchar(64) NOT NULL,
  "rollback_sql" text,
  "metadata" jsonb
);

CREATE INDEX IF NOT EXISTS "migrations_name_idx" ON "migrations" ("name");
CREATE INDEX IF NOT EXISTS "migrations_executed_at_idx" ON "migrations" ("executed_at");

-- Create core tables
CREATE TABLE IF NOT EXISTS "tasks" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "title" varchar(255) NOT NULL,
  "description" text,
  "status" varchar(50) NOT NULL DEFAULT 'pending',
  "priority" varchar(20) DEFAULT 'medium',
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  "user_id" varchar(255),
  "metadata" jsonb,
  "embedding" vector(1536)
);

CREATE INDEX IF NOT EXISTS "tasks_status_idx" ON "tasks" ("status");
CREATE INDEX IF NOT EXISTS "tasks_priority_idx" ON "tasks" ("priority");
CREATE INDEX IF NOT EXISTS "tasks_user_id_idx" ON "tasks" ("user_id");
CREATE INDEX IF NOT EXISTS "tasks_created_at_idx" ON "tasks" ("created_at");
CREATE INDEX IF NOT EXISTS "tasks_embedding_idx" ON "tasks" USING hnsw ("embedding" vector_cosine_ops);

CREATE TABLE IF NOT EXISTS "environments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" varchar(255) NOT NULL,
  "config" jsonb NOT NULL,
  "is_active" boolean DEFAULT false,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  "user_id" varchar(255),
  "schema_version" integer DEFAULT 1
);

CREATE INDEX IF NOT EXISTS "environments_name_idx" ON "environments" ("name");
CREATE INDEX IF NOT EXISTS "environments_user_id_idx" ON "environments" ("user_id");
CREATE INDEX IF NOT EXISTS "environments_is_active_idx" ON "environments" ("is_active");
CREATE UNIQUE INDEX IF NOT EXISTS "environments_user_name_unique" ON "environments" ("user_id", "name");

-- Create observability tables
CREATE TABLE IF NOT EXISTS "agent_executions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "task_id" uuid REFERENCES "tasks"("id") ON DELETE CASCADE,
  "agent_type" varchar(100) NOT NULL,
  "status" varchar(50) NOT NULL,
  "started_at" timestamp DEFAULT now() NOT NULL,
  "completed_at" timestamp,
  "input" jsonb,
  "output" jsonb,
  "error" text,
  "metadata" jsonb,
  "trace_id" varchar(255),
  "execution_time_ms" integer,
  "token_usage" jsonb,
  "cost" jsonb
);

CREATE INDEX IF NOT EXISTS "agent_executions_task_id_idx" ON "agent_executions" ("task_id");
CREATE INDEX IF NOT EXISTS "agent_executions_agent_type_idx" ON "agent_executions" ("agent_type");
CREATE INDEX IF NOT EXISTS "agent_executions_status_idx" ON "agent_executions" ("status");
CREATE INDEX IF NOT EXISTS "agent_executions_started_at_idx" ON "agent_executions" ("started_at");
CREATE INDEX IF NOT EXISTS "agent_executions_trace_id_idx" ON "agent_executions" ("trace_id");
CREATE INDEX IF NOT EXISTS "agent_executions_completed_at_idx" ON "agent_executions" ("completed_at");

CREATE TABLE IF NOT EXISTS "observability_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "execution_id" uuid REFERENCES "agent_executions"("id") ON DELETE CASCADE,
  "event_type" varchar(100) NOT NULL,
  "timestamp" timestamp DEFAULT now() NOT NULL,
  "data" jsonb,
  "trace_id" varchar(255),
  "span_id" varchar(255),
  "severity" varchar(20) DEFAULT 'info',
  "category" varchar(50)
);

CREATE INDEX IF NOT EXISTS "observability_events_execution_id_idx" ON "observability_events" ("execution_id");
CREATE INDEX IF NOT EXISTS "observability_events_event_type_idx" ON "observability_events" ("event_type");
CREATE INDEX IF NOT EXISTS "observability_events_timestamp_idx" ON "observability_events" ("timestamp");
CREATE INDEX IF NOT EXISTS "observability_events_trace_id_idx" ON "observability_events" ("trace_id");
CREATE INDEX IF NOT EXISTS "observability_events_severity_idx" ON "observability_events" ("severity");
CREATE INDEX IF NOT EXISTS "observability_events_category_idx" ON "observability_events" ("category");

-- Create agent memory table with vector search
CREATE TABLE IF NOT EXISTS "agent_memory" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "agent_type" varchar(100) NOT NULL,
  "context_key" varchar(255) NOT NULL,
  "content" text NOT NULL,
  "embedding" vector(1536),
  "created_at" timestamp DEFAULT now() NOT NULL,
  "last_accessed_at" timestamp DEFAULT now() NOT NULL,
  "access_count" integer DEFAULT 0,
  "metadata" jsonb,
  "importance" integer DEFAULT 1,
  "expires_at" timestamp
);

CREATE INDEX IF NOT EXISTS "agent_memory_agent_type_idx" ON "agent_memory" ("agent_type");
CREATE INDEX IF NOT EXISTS "agent_memory_context_key_idx" ON "agent_memory" ("context_key");
CREATE INDEX IF NOT EXISTS "agent_memory_embedding_idx" ON "agent_memory" USING hnsw ("embedding" vector_cosine_ops);
CREATE INDEX IF NOT EXISTS "agent_memory_last_accessed_idx" ON "agent_memory" ("last_accessed_at");
CREATE INDEX IF NOT EXISTS "agent_memory_importance_idx" ON "agent_memory" ("importance");
CREATE INDEX IF NOT EXISTS "agent_memory_expires_at_idx" ON "agent_memory" ("expires_at");
CREATE UNIQUE INDEX IF NOT EXISTS "agent_memory_agent_context_unique" ON "agent_memory" ("agent_type", "context_key");

-- Create workflow tables
CREATE TABLE IF NOT EXISTS "workflows" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" varchar(255) NOT NULL,
  "definition" jsonb NOT NULL,
  "version" integer DEFAULT 1,
  "is_active" boolean DEFAULT true,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "created_by" varchar(255),
  "tags" jsonb,
  "description" text
);

CREATE INDEX IF NOT EXISTS "workflows_name_idx" ON "workflows" ("name");
CREATE INDEX IF NOT EXISTS "workflows_version_idx" ON "workflows" ("version");
CREATE INDEX IF NOT EXISTS "workflows_is_active_idx" ON "workflows" ("is_active");
CREATE INDEX IF NOT EXISTS "workflows_created_by_idx" ON "workflows" ("created_by");
CREATE UNIQUE INDEX IF NOT EXISTS "workflows_name_version_unique" ON "workflows" ("name", "version");

CREATE TABLE IF NOT EXISTS "workflow_executions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "workflow_id" uuid REFERENCES "workflows"("id") ON DELETE CASCADE,
  "status" varchar(50) NOT NULL,
  "current_step" integer DEFAULT 0,
  "total_steps" integer,
  "state" jsonb,
  "started_at" timestamp DEFAULT now() NOT NULL,
  "completed_at" timestamp,
  "error" text,
  "triggered_by" varchar(255),
  "parent_execution_id" uuid REFERENCES "workflow_executions"("id")
);

CREATE INDEX IF NOT EXISTS "workflow_executions_workflow_id_idx" ON "workflow_executions" ("workflow_id");
CREATE INDEX IF NOT EXISTS "workflow_executions_status_idx" ON "workflow_executions" ("status");
CREATE INDEX IF NOT EXISTS "workflow_executions_started_at_idx" ON "workflow_executions" ("started_at");
CREATE INDEX IF NOT EXISTS "workflow_executions_triggered_by_idx" ON "workflow_executions" ("triggered_by");
CREATE INDEX IF NOT EXISTS "workflow_executions_parent_execution_idx" ON "workflow_executions" ("parent_execution_id");

-- Create execution snapshots table for time-travel debugging
CREATE TABLE IF NOT EXISTS "execution_snapshots" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "execution_id" uuid REFERENCES "agent_executions"("id") ON DELETE CASCADE,
  "step_number" integer NOT NULL,
  "timestamp" timestamp DEFAULT now() NOT NULL,
  "state" jsonb NOT NULL,
  "description" text,
  "checkpoint" boolean DEFAULT false
);

CREATE INDEX IF NOT EXISTS "execution_snapshots_execution_id_idx" ON "execution_snapshots" ("execution_id");
CREATE INDEX IF NOT EXISTS "execution_snapshots_step_number_idx" ON "execution_snapshots" ("step_number");
CREATE INDEX IF NOT EXISTS "execution_snapshots_timestamp_idx" ON "execution_snapshots" ("timestamp");
CREATE INDEX IF NOT EXISTS "execution_snapshots_checkpoint_idx" ON "execution_snapshots" ("checkpoint");
CREATE UNIQUE INDEX IF NOT EXISTS "execution_snapshots_execution_step_unique" ON "execution_snapshots" ("execution_id", "step_number");

-- Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_environments_updated_at BEFORE UPDATE ON environments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Down
-- Drop triggers
DROP TRIGGER IF EXISTS update_tasks_updated_at ON tasks;
DROP TRIGGER IF EXISTS update_environments_updated_at ON environments;
DROP FUNCTION IF EXISTS update_updated_at_column();

-- Drop tables in reverse order (respecting foreign key constraints)
DROP TABLE IF EXISTS "execution_snapshots";
DROP TABLE IF EXISTS "workflow_executions";
DROP TABLE IF EXISTS "workflows";
DROP TABLE IF EXISTS "agent_memory";
DROP TABLE IF EXISTS "observability_events";
DROP TABLE IF EXISTS "agent_executions";
DROP TABLE IF EXISTS "environments";
DROP TABLE IF EXISTS "tasks";
DROP TABLE IF EXISTS "migrations";

-- Drop extensions (optional, as they might be used by other applications)
-- DROP EXTENSION IF EXISTS "pg_stat_statements";
-- DROP EXTENSION IF EXISTS "vector";
-- DROP EXTENSION IF EXISTS "uuid-ossp";