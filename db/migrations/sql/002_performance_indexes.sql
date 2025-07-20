-- Migration: performance_indexes
-- Created: 2024-07-20T08:51:00.000Z
-- Description: Performance Optimization Indexes for all tables
-- Author: Database Query Analyzer and Index Optimizer
-- Tags: performance, indexes, optimization

-- Up
-- TASKS TABLE PERFORMANCE INDEXES
-- ============================================================================

-- Composite index for user-based task filtering (most common query pattern)
CREATE INDEX CONCURRENTLY IF NOT EXISTS "tasks_user_status_priority_idx" 
ON "tasks" ("user_id", "status", "priority");

-- Composite index for user-based task ordering
CREATE INDEX CONCURRENTLY IF NOT EXISTS "tasks_user_created_at_idx" 
ON "tasks" ("user_id", "created_at" DESC);

-- Composite index for task search queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS "tasks_user_title_search_idx" 
ON "tasks" ("user_id", "title" text_pattern_ops);

-- Partial index for active tasks only (reduces index size)
CREATE INDEX CONCURRENTLY IF NOT EXISTS "tasks_active_user_priority_idx" 
ON "tasks" ("user_id", "priority", "created_at" DESC) 
WHERE "status" IN ('pending', 'in_progress');

-- Partial index for completed tasks (for analytics)
CREATE INDEX CONCURRENTLY IF NOT EXISTS "tasks_completed_user_date_idx" 
ON "tasks" ("user_id", "updated_at" DESC) 
WHERE "status" = 'completed';

-- GIN index for metadata JSONB queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS "tasks_metadata_gin_idx" 
ON "tasks" USING gin ("metadata");

-- Optimized HNSW index for vector similarity search
DROP INDEX IF EXISTS "tasks_embedding_idx";
CREATE INDEX CONCURRENTLY IF NOT EXISTS "tasks_embedding_hnsw_idx" 
ON "tasks" USING hnsw ("embedding" vector_cosine_ops) 
WITH (m = 16, ef_construction = 64);

-- ============================================================================
-- ENVIRONMENTS TABLE PERFORMANCE INDEXES
-- ============================================================================

-- Composite index for user-based environment queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS "environments_user_active_idx" 
ON "environments" ("user_id", "is_active", "created_at" DESC);

-- Composite index for environment name searches
CREATE INDEX CONCURRENTLY IF NOT EXISTS "environments_user_name_idx" 
ON "environments" ("user_id", "name");

-- Partial index for active environments only
CREATE INDEX CONCURRENTLY IF NOT EXISTS "environments_active_user_idx" 
ON "environments" ("user_id", "updated_at" DESC) 
WHERE "is_active" = true;

-- GIN index for config JSONB queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS "environments_config_gin_idx" 
ON "environments" USING gin ("config");

-- ============================================================================
-- AGENT_EXECUTIONS TABLE PERFORMANCE INDEXES
-- ============================================================================

-- Composite index for task-based execution queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS "agent_executions_task_started_idx" 
ON "agent_executions" ("task_id", "started_at" DESC);

-- Composite index for execution status and timing
CREATE INDEX CONCURRENTLY IF NOT EXISTS "agent_executions_status_started_idx" 
ON "agent_executions" ("status", "started_at" DESC);

-- Index for agent type filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS "agent_executions_agent_type_idx" 
ON "agent_executions" ("agent_type", "started_at" DESC);

-- Partial index for running executions
CREATE INDEX CONCURRENTLY IF NOT EXISTS "agent_executions_running_idx" 
ON "agent_executions" ("started_at" DESC) 
WHERE "status" IN ('running', 'pending');

-- Index for trace ID lookups (observability)
CREATE INDEX CONCURRENTLY IF NOT EXISTS "agent_executions_trace_id_idx" 
ON "agent_executions" ("trace_id") 
WHERE "trace_id" IS NOT NULL;

-- Index for performance analysis
CREATE INDEX CONCURRENTLY IF NOT EXISTS "agent_executions_performance_idx" 
ON "agent_executions" ("execution_time_ms", "started_at" DESC) 
WHERE "execution_time_ms" IS NOT NULL;

-- GIN indexes for JSONB fields
CREATE INDEX CONCURRENTLY IF NOT EXISTS "agent_executions_input_gin_idx" 
ON "agent_executions" USING gin ("input");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "agent_executions_output_gin_idx" 
ON "agent_executions" USING gin ("output");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "agent_executions_metadata_gin_idx" 
ON "agent_executions" USING gin ("metadata");

-- ============================================================================
-- OBSERVABILITY_EVENTS TABLE PERFORMANCE INDEXES
-- ============================================================================

-- Composite index for execution-based event queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS "observability_events_execution_timestamp_idx" 
ON "observability_events" ("execution_id", "timestamp" DESC);

-- Index for event type filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS "observability_events_type_timestamp_idx" 
ON "observability_events" ("event_type", "timestamp" DESC);

-- Index for severity-based queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS "observability_events_severity_timestamp_idx" 
ON "observability_events" ("severity", "timestamp" DESC);

-- Index for category-based filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS "observability_events_category_timestamp_idx" 
ON "observability_events" ("category", "timestamp" DESC) 
WHERE "category" IS NOT NULL;

-- Composite index for trace/span lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS "observability_events_trace_span_idx" 
ON "observability_events" ("trace_id", "span_id", "timestamp" DESC) 
WHERE "trace_id" IS NOT NULL;

-- Partial index for error events
CREATE INDEX CONCURRENTLY IF NOT EXISTS "observability_events_errors_idx" 
ON "observability_events" ("timestamp" DESC) 
WHERE "severity" IN ('error', 'critical');

-- Time-based partitioning index for efficient cleanup
CREATE INDEX CONCURRENTLY IF NOT EXISTS "observability_events_timestamp_idx" 
ON "observability_events" ("timestamp" DESC);

-- GIN index for event data JSONB queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS "observability_events_data_gin_idx" 
ON "observability_events" USING gin ("data");

-- ============================================================================
-- AGENT_MEMORY TABLE PERFORMANCE INDEXES
-- ============================================================================

-- Composite index for agent memory lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS "agent_memory_agent_context_idx" 
ON "agent_memory" ("agent_type", "context_key");

-- Index for importance-based queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS "agent_memory_importance_accessed_idx" 
ON "agent_memory" ("importance" DESC, "last_accessed_at" DESC);

-- Index for memory cleanup (expired entries)
CREATE INDEX CONCURRENTLY IF NOT EXISTS "agent_memory_expires_at_idx" 
ON "agent_memory" ("expires_at") 
WHERE "expires_at" IS NOT NULL;

-- Optimized HNSW index for memory vector search
DROP INDEX IF EXISTS "agent_memory_embedding_idx";
CREATE INDEX CONCURRENTLY IF NOT EXISTS "agent_memory_embedding_hnsw_idx" 
ON "agent_memory" USING hnsw ("embedding" vector_cosine_ops) 
WITH (m = 16, ef_construction = 64);

-- Index for access pattern analysis
CREATE INDEX CONCURRENTLY IF NOT EXISTS "agent_memory_access_count_idx" 
ON "agent_memory" ("access_count" DESC, "last_accessed_at" DESC);

-- GIN index for metadata queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS "agent_memory_metadata_gin_idx" 
ON "agent_memory" USING gin ("metadata");

-- ============================================================================
-- WORKFLOWS TABLE PERFORMANCE INDEXES
-- ============================================================================

-- Index for workflow status and updates
CREATE INDEX CONCURRENTLY IF NOT EXISTS "workflows_status_updated_idx" 
ON "workflows" ("status", "updated_at" DESC);

-- Index for workflow version management
CREATE INDEX CONCURRENTLY IF NOT EXISTS "workflows_name_version_idx" 
ON "workflows" ("name", "version" DESC);

-- Partial index for active workflows
CREATE INDEX CONCURRENTLY IF NOT EXISTS "workflows_active_idx" 
ON "workflows" ("updated_at" DESC) 
WHERE "status" = 'active';

-- GIN index for workflow definition
CREATE INDEX CONCURRENTLY IF NOT EXISTS "workflows_definition_gin_idx" 
ON "workflows" USING gin ("definition");

-- ============================================================================
-- WORKFLOW_EXECUTIONS TABLE PERFORMANCE INDEXES
-- ============================================================================

-- Composite index for workflow execution queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS "workflow_executions_workflow_started_idx" 
ON "workflow_executions" ("workflow_id", "started_at" DESC);

-- Index for execution status tracking
CREATE INDEX CONCURRENTLY IF NOT EXISTS "workflow_executions_status_started_idx" 
ON "workflow_executions" ("status", "started_at" DESC);

-- Partial index for running executions
CREATE INDEX CONCURRENTLY IF NOT EXISTS "workflow_executions_running_idx" 
ON "workflow_executions" ("started_at" DESC) 
WHERE "status" IN ('running', 'pending');

-- Index for trigger-based queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS "workflow_executions_trigger_idx" 
ON "workflow_executions" ("trigger_type", "started_at" DESC) 
WHERE "trigger_type" IS NOT NULL;

-- GIN indexes for JSONB fields
CREATE INDEX CONCURRENTLY IF NOT EXISTS "workflow_executions_input_gin_idx" 
ON "workflow_executions" USING gin ("input");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "workflow_executions_output_gin_idx" 
ON "workflow_executions" USING gin ("output");

-- ============================================================================
-- EXECUTION_SNAPSHOTS TABLE PERFORMANCE INDEXES
-- ============================================================================

-- Composite index for execution snapshot queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS "execution_snapshots_execution_timestamp_idx" 
ON "execution_snapshots" ("execution_id", "timestamp" DESC);

-- Index for snapshot type filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS "execution_snapshots_type_timestamp_idx" 
ON "execution_snapshots" ("snapshot_type", "timestamp" DESC);

-- GIN index for snapshot data
CREATE INDEX CONCURRENTLY IF NOT EXISTS "execution_snapshots_data_gin_idx" 
ON "execution_snapshots" USING gin ("data");

-- ============================================================================
-- PERFORMANCE MONITORING INDEXES
-- ============================================================================

-- Index for pg_stat_statements integration (if available)
-- This helps with query performance monitoring
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_stat_statements') THEN
        -- Reset statistics to start fresh
        PERFORM pg_stat_statements_reset();
    END IF;
END $$;

-- ============================================================================
-- INDEX MAINTENANCE AND MONITORING
-- ============================================================================

-- Create a function to monitor index usage
CREATE OR REPLACE FUNCTION get_index_usage_stats()
RETURNS TABLE (
    schemaname text,
    tablename text,
    indexname text,
    idx_scan bigint,
    idx_tup_read bigint,
    idx_tup_fetch bigint,
    size text
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.schemaname::text,
        s.tablename::text,
        s.indexrelname::text,
        s.idx_scan,
        s.idx_tup_read,
        s.idx_tup_fetch,
        pg_size_pretty(pg_relation_size(s.indexrelname::regclass))::text
    FROM pg_stat_user_indexes s
    ORDER BY s.idx_scan DESC;
END;
$$ LANGUAGE plpgsql;

-- Create a function to identify unused indexes
CREATE OR REPLACE FUNCTION get_unused_indexes()
RETURNS TABLE (
    schemaname text,
    tablename text,
    indexname text,
    size text
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.schemaname::text,
        s.tablename::text,
        s.indexrelname::text,
        pg_size_pretty(pg_relation_size(s.indexrelname::regclass))::text
    FROM pg_stat_user_indexes s
    WHERE s.idx_scan = 0 
    AND s.indexrelname NOT LIKE '%_pkey'
    AND s.indexrelname NOT LIKE '%_unique%'
    ORDER BY pg_relation_size(s.indexrelname::regclass) DESC;
END;
$$ LANGUAGE plpgsql;

-- Update table statistics for better query planning
ANALYZE;

-- Log completion
DO $$
BEGIN
    RAISE NOTICE 'Performance indexes created successfully. Run get_index_usage_stats() to monitor usage.';
END $$;

-- Down
-- Drop all performance indexes in reverse order

-- Drop monitoring functions
DROP FUNCTION IF EXISTS get_unused_indexes();
DROP FUNCTION IF EXISTS get_index_usage_stats();

-- Drop observability_events indexes
DROP INDEX CONCURRENTLY IF EXISTS "observability_events_data_gin_idx";
DROP INDEX CONCURRENTLY IF EXISTS "observability_events_timestamp_idx";
DROP INDEX CONCURRENTLY IF EXISTS "observability_events_errors_idx";
DROP INDEX CONCURRENTLY IF EXISTS "observability_events_trace_span_idx";
DROP INDEX CONCURRENTLY IF EXISTS "observability_events_category_timestamp_idx";
DROP INDEX CONCURRENTLY IF EXISTS "observability_events_severity_timestamp_idx";
DROP INDEX CONCURRENTLY IF EXISTS "observability_events_type_timestamp_idx";
DROP INDEX CONCURRENTLY IF EXISTS "observability_events_execution_timestamp_idx";

-- Drop execution_snapshots indexes
DROP INDEX CONCURRENTLY IF EXISTS "execution_snapshots_data_gin_idx";
DROP INDEX CONCURRENTLY IF EXISTS "execution_snapshots_type_timestamp_idx";
DROP INDEX CONCURRENTLY IF EXISTS "execution_snapshots_execution_timestamp_idx";

-- Drop workflow_executions indexes
DROP INDEX CONCURRENTLY IF EXISTS "workflow_executions_output_gin_idx";
DROP INDEX CONCURRENTLY IF EXISTS "workflow_executions_input_gin_idx";
DROP INDEX CONCURRENTLY IF EXISTS "workflow_executions_trigger_idx";
DROP INDEX CONCURRENTLY IF EXISTS "workflow_executions_running_idx";
DROP INDEX CONCURRENTLY IF EXISTS "workflow_executions_status_started_idx";
DROP INDEX CONCURRENTLY IF EXISTS "workflow_executions_workflow_started_idx";

-- Drop workflows indexes
DROP INDEX CONCURRENTLY IF EXISTS "workflows_definition_gin_idx";
DROP INDEX CONCURRENTLY IF EXISTS "workflows_active_idx";
DROP INDEX CONCURRENTLY IF EXISTS "workflows_name_version_idx";
DROP INDEX CONCURRENTLY IF EXISTS "workflows_status_updated_idx";

-- Drop agent_memory indexes
DROP INDEX CONCURRENTLY IF EXISTS "agent_memory_metadata_gin_idx";
DROP INDEX CONCURRENTLY IF EXISTS "agent_memory_access_count_idx";
DROP INDEX CONCURRENTLY IF EXISTS "agent_memory_embedding_hnsw_idx";
DROP INDEX CONCURRENTLY IF EXISTS "agent_memory_expires_at_idx";
DROP INDEX CONCURRENTLY IF EXISTS "agent_memory_importance_accessed_idx";
DROP INDEX CONCURRENTLY IF EXISTS "agent_memory_agent_context_idx";

-- Drop agent_executions indexes
DROP INDEX CONCURRENTLY IF EXISTS "agent_executions_metadata_gin_idx";
DROP INDEX CONCURRENTLY IF EXISTS "agent_executions_output_gin_idx";
DROP INDEX CONCURRENTLY IF EXISTS "agent_executions_input_gin_idx";
DROP INDEX CONCURRENTLY IF EXISTS "agent_executions_performance_idx";
DROP INDEX CONCURRENTLY IF EXISTS "agent_executions_trace_id_idx";
DROP INDEX CONCURRENTLY IF EXISTS "agent_executions_running_idx";
DROP INDEX CONCURRENTLY IF EXISTS "agent_executions_agent_type_idx";
DROP INDEX CONCURRENTLY IF EXISTS "agent_executions_status_started_idx";
DROP INDEX CONCURRENTLY IF EXISTS "agent_executions_task_started_idx";

-- Drop environments indexes
DROP INDEX CONCURRENTLY IF EXISTS "environments_config_gin_idx";
DROP INDEX CONCURRENTLY IF EXISTS "environments_active_user_idx";
DROP INDEX CONCURRENTLY IF EXISTS "environments_user_name_idx";
DROP INDEX CONCURRENTLY IF EXISTS "environments_user_active_idx";

-- Drop tasks indexes
DROP INDEX CONCURRENTLY IF EXISTS "tasks_embedding_hnsw_idx";
DROP INDEX CONCURRENTLY IF EXISTS "tasks_metadata_gin_idx";
DROP INDEX CONCURRENTLY IF EXISTS "tasks_completed_user_date_idx";
DROP INDEX CONCURRENTLY IF EXISTS "tasks_active_user_priority_idx";
DROP INDEX CONCURRENTLY IF EXISTS "tasks_user_title_search_idx";
DROP INDEX CONCURRENTLY IF EXISTS "tasks_user_created_at_idx";
DROP INDEX CONCURRENTLY IF EXISTS "tasks_user_status_priority_idx";
