import { z } from 'zod'

// Task validation schemas
export const CreateTaskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255, 'Title too long'),
  description: z.string().optional(),
  status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']).default('pending'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  userId: z.string().optional(),
  metadata: z.record(z.any()).optional(),
})

export const UpdateTaskSchema = CreateTaskSchema.partial().extend({
  id: z.string().uuid('Invalid task ID'),
})

export const TaskQuerySchema = z.object({
  status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  userId: z.string().optional(),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
  search: z.string().optional(),
})

// Environment validation schemas
export const CreateEnvironmentSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name too long'),
  config: z.record(z.any(), 'Configuration must be a valid object'),
  isActive: z.boolean().default(false),
  userId: z.string().optional(),
  schemaVersion: z.number().int().positive().default(1),
})

export const UpdateEnvironmentSchema = CreateEnvironmentSchema.partial().extend({
  id: z.string().uuid('Invalid environment ID'),
})

// Agent execution validation schemas
export const CreateAgentExecutionSchema = z.object({
  taskId: z.string().uuid('Invalid task ID').optional(),
  agentType: z.string().min(1, 'Agent type is required').max(100, 'Agent type too long'),
  status: z.enum(['pending', 'running', 'completed', 'failed', 'cancelled']),
  input: z.record(z.any()).optional(),
  output: z.record(z.any()).optional(),
  error: z.string().optional(),
  metadata: z.record(z.any()).optional(),
  traceId: z.string().optional(),
  executionTimeMs: z.number().int().positive().optional(),
  tokenUsage: z.record(z.any()).optional(),
  cost: z.record(z.any()).optional(),
})

export const UpdateAgentExecutionSchema = CreateAgentExecutionSchema.partial().extend({
  id: z.string().uuid('Invalid execution ID'),
  completedAt: z.date().optional(),
})

// Observability event validation schemas
export const CreateObservabilityEventSchema = z.object({
  executionId: z.string().uuid('Invalid execution ID'),
  eventType: z.string().min(1, 'Event type is required').max(100, 'Event type too long'),
  data: z.record(z.any()).optional(),
  traceId: z.string().optional(),
  spanId: z.string().optional(),
  severity: z.enum(['debug', 'info', 'warn', 'error', 'fatal']).default('info'),
  category: z.string().max(50, 'Category too long').optional(),
})

// Agent memory validation schemas
export const CreateAgentMemorySchema = z.object({
  agentType: z.string().min(1, 'Agent type is required').max(100, 'Agent type too long'),
  contextKey: z.string().min(1, 'Context key is required').max(255, 'Context key too long'),
  content: z.string().min(1, 'Content is required'),
  metadata: z.record(z.any()).optional(),
  importance: z.number().int().min(1).max(10).default(1),
  expiresAt: z.date().optional(),
})

export const UpdateAgentMemorySchema = CreateAgentMemorySchema.partial().extend({
  id: z.string().uuid('Invalid memory ID'),
  lastAccessedAt: z.date().optional(),
  accessCount: z.number().int().min(0).optional(),
})

export const AgentMemorySearchSchema = z.object({
  agentType: z.string().min(1, 'Agent type is required'),
  query: z.string().min(1, 'Search query is required'),
  limit: z.number().min(1).max(50).default(10),
  threshold: z.number().min(0).max(1).default(0.7), // Similarity threshold
})

// Workflow validation schemas
export const CreateWorkflowSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name too long'),
  definition: z.record(z.any(), 'Definition must be a valid object'),
  version: z.number().int().positive().default(1),
  isActive: z.boolean().default(true),
  createdBy: z.string().optional(),
  tags: z.array(z.string()).optional(),
  description: z.string().optional(),
})

export const UpdateWorkflowSchema = CreateWorkflowSchema.partial().extend({
  id: z.string().uuid('Invalid workflow ID'),
})

export const CreateWorkflowExecutionSchema = z.object({
  workflowId: z.string().uuid('Invalid workflow ID'),
  status: z.enum(['pending', 'running', 'paused', 'completed', 'failed', 'cancelled']),
  currentStep: z.number().int().min(0).default(0),
  totalSteps: z.number().int().positive().optional(),
  state: z.record(z.any()).optional(),
  triggeredBy: z.string().optional(),
  parentExecutionId: z.string().uuid('Invalid parent execution ID').optional(),
})

export const UpdateWorkflowExecutionSchema = CreateWorkflowExecutionSchema.partial().extend({
  id: z.string().uuid('Invalid execution ID'),
  completedAt: z.date().optional(),
  error: z.string().optional(),
})

// Execution snapshot validation schemas
export const CreateExecutionSnapshotSchema = z.object({
  executionId: z.string().uuid('Invalid execution ID'),
  stepNumber: z.number().int().min(0),
  state: z.record(z.any(), 'State must be a valid object'),
  description: z.string().optional(),
  checkpoint: z.boolean().default(false),
})

// Migration validation schemas
export const CreateMigrationSchema = z.object({
  name: z.string().min(1, 'Migration name is required').max(255, 'Name too long'),
  checksum: z.string().length(64, 'Invalid checksum format'),
  rollbackSql: z.string().optional(),
  metadata: z.record(z.any()).optional(),
})

// Database health check schema
export const DatabaseHealthSchema = z.object({
  status: z.enum(['healthy', 'degraded', 'unhealthy']),
  timestamp: z.date(),
  checks: z.object({
    connection: z.boolean(),
    migrations: z.boolean(),
    extensions: z.boolean(),
    performance: z.object({
      avgQueryTime: z.number(),
      activeConnections: z.number(),
      maxConnections: z.number(),
    }),
  }),
  errors: z.array(z.string()).optional(),
})

// Pagination schema
export const PaginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
})

// Vector search schema
export const VectorSearchSchema = z.object({
  embedding: z.array(z.number()).length(1536, 'Invalid embedding dimensions'),
  limit: z.number().int().min(1).max(100).default(10),
  threshold: z.number().min(0).max(1).default(0.7),
})

// Export all schemas as a collection
export const DatabaseSchemas = {
  // Tasks
  CreateTask: CreateTaskSchema,
  UpdateTask: UpdateTaskSchema,
  TaskQuery: TaskQuerySchema,

  // Environments
  CreateEnvironment: CreateEnvironmentSchema,
  UpdateEnvironment: UpdateEnvironmentSchema,

  // Agent Executions
  CreateAgentExecution: CreateAgentExecutionSchema,
  UpdateAgentExecution: UpdateAgentExecutionSchema,

  // Observability Events
  CreateObservabilityEvent: CreateObservabilityEventSchema,

  // Agent Memory
  CreateAgentMemory: CreateAgentMemorySchema,
  UpdateAgentMemory: UpdateAgentMemorySchema,
  AgentMemorySearch: AgentMemorySearchSchema,

  // Workflows
  CreateWorkflow: CreateWorkflowSchema,
  UpdateWorkflow: UpdateWorkflowSchema,
  CreateWorkflowExecution: CreateWorkflowExecutionSchema,
  UpdateWorkflowExecution: UpdateWorkflowExecutionSchema,

  // Execution Snapshots
  CreateExecutionSnapshot: CreateExecutionSnapshotSchema,

  // Migrations
  CreateMigration: CreateMigrationSchema,

  // Utilities
  DatabaseHealth: DatabaseHealthSchema,
  Pagination: PaginationSchema,
  VectorSearch: VectorSearchSchema,
} as const

// Type exports
export type CreateTaskInput = z.infer<typeof CreateTaskSchema>
export type UpdateTaskInput = z.infer<typeof UpdateTaskSchema>
export type TaskQueryInput = z.infer<typeof TaskQuerySchema>
export type CreateEnvironmentInput = z.infer<typeof CreateEnvironmentSchema>
export type UpdateEnvironmentInput = z.infer<typeof UpdateEnvironmentSchema>
export type CreateAgentExecutionInput = z.infer<typeof CreateAgentExecutionSchema>
export type UpdateAgentExecutionInput = z.infer<typeof UpdateAgentExecutionSchema>
export type CreateObservabilityEventInput = z.infer<typeof CreateObservabilityEventSchema>
export type CreateAgentMemoryInput = z.infer<typeof CreateAgentMemorySchema>
export type UpdateAgentMemoryInput = z.infer<typeof UpdateAgentMemorySchema>
export type AgentMemorySearchInput = z.infer<typeof AgentMemorySearchSchema>
export type CreateWorkflowInput = z.infer<typeof CreateWorkflowSchema>
export type UpdateWorkflowInput = z.infer<typeof UpdateWorkflowSchema>
export type CreateWorkflowExecutionInput = z.infer<typeof CreateWorkflowExecutionSchema>
export type UpdateWorkflowExecutionInput = z.infer<typeof UpdateWorkflowExecutionSchema>
export type CreateExecutionSnapshotInput = z.infer<typeof CreateExecutionSnapshotSchema>
export type DatabaseHealthInput = z.infer<typeof DatabaseHealthSchema>
export type PaginationInput = z.infer<typeof PaginationSchema>
export type VectorSearchInput = z.infer<typeof VectorSearchSchema>
