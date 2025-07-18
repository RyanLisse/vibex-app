import { relations } from 'drizzle-orm'
import {
  boolean,
  foreignKey,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
  vector,
} from 'drizzle-orm/pg-core'

// Core Tables
export const tasks = pgTable(
  'tasks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description'),
    status: varchar('status', { length: 50 }).notNull().default('pending'),
    priority: varchar('priority', { length: 20 }).default('medium'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    userId: varchar('user_id', { length: 255 }),
    metadata: jsonb('metadata'),
    // Vector embedding for semantic search
    embedding: vector('embedding', { dimensions: 1536 }),
  },
  (table) => ({
    statusIdx: index('tasks_status_idx').on(table.status),
    priorityIdx: index('tasks_priority_idx').on(table.priority),
    userIdIdx: index('tasks_user_id_idx').on(table.userId),
    createdAtIdx: index('tasks_created_at_idx').on(table.createdAt),
    embeddingIdx: index('tasks_embedding_idx').using('hnsw', table.embedding),
  })
)

export const environments = pgTable(
  'environments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 255 }).notNull(),
    config: jsonb('config').notNull(),
    isActive: boolean('is_active').default(false),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    userId: varchar('user_id', { length: 255 }),
    // Configuration validation schema version
    schemaVersion: integer('schema_version').default(1),
  },
  (table) => ({
    nameIdx: index('environments_name_idx').on(table.name),
    userIdIdx: index('environments_user_id_idx').on(table.userId),
    isActiveIdx: index('environments_is_active_idx').on(table.isActive),
    uniqueUserName: unique('environments_user_name_unique').on(table.userId, table.name),
  })
)

// Observability Tables
export const agentExecutions = pgTable(
  'agent_executions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    taskId: uuid('task_id').references(() => tasks.id, { onDelete: 'cascade' }),
    agentType: varchar('agent_type', { length: 100 }).notNull(),
    status: varchar('status', { length: 50 }).notNull(),
    startedAt: timestamp('started_at').defaultNow().notNull(),
    completedAt: timestamp('completed_at'),
    input: jsonb('input'),
    output: jsonb('output'),
    error: text('error'),
    metadata: jsonb('metadata'),
    traceId: varchar('trace_id', { length: 255 }),
    // Performance metrics
    executionTimeMs: integer('execution_time_ms'),
    tokenUsage: jsonb('token_usage'),
    cost: jsonb('cost'),
  },
  (table) => ({
    taskIdIdx: index('agent_executions_task_id_idx').on(table.taskId),
    agentTypeIdx: index('agent_executions_agent_type_idx').on(table.agentType),
    statusIdx: index('agent_executions_status_idx').on(table.status),
    startedAtIdx: index('agent_executions_started_at_idx').on(table.startedAt),
    traceIdIdx: index('agent_executions_trace_id_idx').on(table.traceId),
    completedAtIdx: index('agent_executions_completed_at_idx').on(table.completedAt),
  })
)

export const observabilityEvents = pgTable(
  'observability_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    executionId: uuid('execution_id').references(() => agentExecutions.id, { onDelete: 'cascade' }),
    eventType: varchar('event_type', { length: 100 }).notNull(),
    timestamp: timestamp('timestamp').defaultNow().notNull(),
    data: jsonb('data'),
    traceId: varchar('trace_id', { length: 255 }),
    spanId: varchar('span_id', { length: 255 }),
    // Event categorization
    severity: varchar('severity', { length: 20 }).default('info'),
    category: varchar('category', { length: 50 }),
  },
  (table) => ({
    executionIdIdx: index('observability_events_execution_id_idx').on(table.executionId),
    eventTypeIdx: index('observability_events_event_type_idx').on(table.eventType),
    timestampIdx: index('observability_events_timestamp_idx').on(table.timestamp),
    traceIdIdx: index('observability_events_trace_id_idx').on(table.traceId),
    severityIdx: index('observability_events_severity_idx').on(table.severity),
    categoryIdx: index('observability_events_category_idx').on(table.category),
  })
)

// Agent Memory System with Vector Search
export const agentMemory = pgTable(
  'agent_memory',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    agentType: varchar('agent_type', { length: 100 }).notNull(),
    contextKey: varchar('context_key', { length: 255 }).notNull(),
    content: text('content').notNull(),
    embedding: vector('embedding', { dimensions: 1536 }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    lastAccessedAt: timestamp('last_accessed_at').defaultNow().notNull(),
    accessCount: integer('access_count').default(0),
    metadata: jsonb('metadata'),
    // Memory management
    importance: integer('importance').default(1), // 1-10 scale
    expiresAt: timestamp('expires_at'),
  },
  (table) => ({
    agentTypeIdx: index('agent_memory_agent_type_idx').on(table.agentType),
    contextKeyIdx: index('agent_memory_context_key_idx').on(table.contextKey),
    embeddingIdx: index('agent_memory_embedding_idx').using('hnsw', table.embedding),
    lastAccessedIdx: index('agent_memory_last_accessed_idx').on(table.lastAccessedAt),
    importanceIdx: index('agent_memory_importance_idx').on(table.importance),
    expiresAtIdx: index('agent_memory_expires_at_idx').on(table.expiresAt),
    uniqueAgentContext: unique('agent_memory_agent_context_unique').on(
      table.agentType,
      table.contextKey
    ),
  })
)

// Workflow Orchestration
export const workflows = pgTable(
  'workflows',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 255 }).notNull(),
    definition: jsonb('definition').notNull(),
    version: integer('version').default(1),
    isActive: boolean('is_active').default(true),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    createdBy: varchar('created_by', { length: 255 }),
    // Workflow metadata
    tags: jsonb('tags'),
    description: text('description'),
  },
  (table) => ({
    nameIdx: index('workflows_name_idx').on(table.name),
    versionIdx: index('workflows_version_idx').on(table.version),
    isActiveIdx: index('workflows_is_active_idx').on(table.isActive),
    createdByIdx: index('workflows_created_by_idx').on(table.createdBy),
    uniqueNameVersion: unique('workflows_name_version_unique').on(table.name, table.version),
  })
)

export const workflowExecutions = pgTable(
  'workflow_executions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workflowId: uuid('workflow_id').references(() => workflows.id, { onDelete: 'cascade' }),
    status: varchar('status', { length: 50 }).notNull(),
    currentStep: integer('current_step').default(0),
    totalSteps: integer('total_steps'),
    state: jsonb('state'),
    startedAt: timestamp('started_at').defaultNow().notNull(),
    completedAt: timestamp('completed_at'),
    error: text('error'),
    // Execution context
    triggeredBy: varchar('triggered_by', { length: 255 }),
    parentExecutionId: uuid('parent_execution_id'),
  },
  (table) => ({
    workflowIdIdx: index('workflow_executions_workflow_id_idx').on(table.workflowId),
    statusIdx: index('workflow_executions_status_idx').on(table.status),
    startedAtIdx: index('workflow_executions_started_at_idx').on(table.startedAt),
    triggeredByIdx: index('workflow_executions_triggered_by_idx').on(table.triggeredBy),
    parentExecutionIdx: index('workflow_executions_parent_execution_idx').on(
      table.parentExecutionId
    ),
    parentExecutionFk: foreignKey({
      columns: [table.parentExecutionId],
      foreignColumns: [table.id],
      name: 'workflow_executions_parent_fk',
    }),
  })
)

// Time-travel debugging support
export const executionSnapshots = pgTable(
  'execution_snapshots',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    executionId: uuid('execution_id').references(() => agentExecutions.id, { onDelete: 'cascade' }),
    stepNumber: integer('step_number').notNull(),
    timestamp: timestamp('timestamp').defaultNow().notNull(),
    state: jsonb('state').notNull(),
    // Snapshot metadata
    description: text('description'),
    checkpoint: boolean('checkpoint').default(false),
  },
  (table) => ({
    executionIdIdx: index('execution_snapshots_execution_id_idx').on(table.executionId),
    stepNumberIdx: index('execution_snapshots_step_number_idx').on(table.stepNumber),
    timestampIdx: index('execution_snapshots_timestamp_idx').on(table.timestamp),
    checkpointIdx: index('execution_snapshots_checkpoint_idx').on(table.checkpoint),
    uniqueExecutionStep: unique('execution_snapshots_execution_step_unique').on(
      table.executionId,
      table.stepNumber
    ),
  })
)

// Database migration tracking
export const migrations = pgTable(
  'migrations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 255 }).notNull().unique(),
    executedAt: timestamp('executed_at').defaultNow().notNull(),
    checksum: varchar('checksum', { length: 64 }).notNull(),
    rollbackSql: text('rollback_sql'),
    metadata: jsonb('metadata'),
  },
  (table) => ({
    nameIdx: index('migrations_name_idx').on(table.name),
    executedAtIdx: index('migrations_executed_at_idx').on(table.executedAt),
  })
)

// Relations
export const tasksRelations = relations(tasks, ({ many }) => ({
  agentExecutions: many(agentExecutions),
}))

export const agentExecutionsRelations = relations(agentExecutions, ({ one, many }) => ({
  task: one(tasks, {
    fields: [agentExecutions.taskId],
    references: [tasks.id],
  }),
  observabilityEvents: many(observabilityEvents),
  executionSnapshots: many(executionSnapshots),
}))

export const observabilityEventsRelations = relations(observabilityEvents, ({ one }) => ({
  execution: one(agentExecutions, {
    fields: [observabilityEvents.executionId],
    references: [agentExecutions.id],
  }),
}))

export const workflowsRelations = relations(workflows, ({ many }) => ({
  executions: many(workflowExecutions),
}))

export const workflowExecutionsRelations = relations(workflowExecutions, ({ one, many }) => ({
  workflow: one(workflows, {
    fields: [workflowExecutions.workflowId],
    references: [workflows.id],
  }),
  parentExecution: one(workflowExecutions, {
    fields: [workflowExecutions.parentExecutionId],
    references: [workflowExecutions.id],
    relationName: 'parentChild',
  }),
  childExecutions: many(workflowExecutions, {
    relationName: 'parentChild',
  }),
}))

export const executionSnapshotsRelations = relations(executionSnapshots, ({ one }) => ({
  execution: one(agentExecutions, {
    fields: [executionSnapshots.executionId],
    references: [agentExecutions.id],
  }),
}))

// Type exports
export type Task = typeof tasks.$inferSelect
export type NewTask = typeof tasks.$inferInsert
export type Environment = typeof environments.$inferSelect
export type NewEnvironment = typeof environments.$inferInsert
export type AgentExecution = typeof agentExecutions.$inferSelect
export type NewAgentExecution = typeof agentExecutions.$inferInsert
export type ObservabilityEvent = typeof observabilityEvents.$inferSelect
export type NewObservabilityEvent = typeof observabilityEvents.$inferInsert
export type AgentMemory = typeof agentMemory.$inferSelect
export type NewAgentMemory = typeof agentMemory.$inferInsert
export type Workflow = typeof workflows.$inferSelect
export type NewWorkflow = typeof workflows.$inferInsert
export type WorkflowExecution = typeof workflowExecutions.$inferSelect
export type NewWorkflowExecution = typeof workflowExecutions.$inferInsert
export type ExecutionSnapshot = typeof executionSnapshots.$inferSelect
export type NewExecutionSnapshot = typeof executionSnapshots.$inferInsert
export type Migration = typeof migrations.$inferSelect
export type NewMigration = typeof migrations.$inferInsert
