/**
 * Type-safe query key factories for all database entities
 * Ensures consistent query key generation across the application
 */

export const queryKeys = {
  // Task-related queries
  tasks: {
    all: ['tasks'] as const,
    lists: () => [...queryKeys.tasks.all, 'list'] as const,
    list: (filters?: {
      status?: string
      priority?: string
      userId?: string
      search?: string
      archived?: boolean
      limit?: number
      offset?: number
    }) => [...queryKeys.tasks.lists(), { filters }] as const,
    details: () => [...queryKeys.tasks.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.tasks.details(), id] as const,
    search: (query: string, filters?: Record<string, any>) =>
      [...queryKeys.tasks.all, 'search', query, filters] as const,
    vector: (embedding: number[], limit?: number) =>
      [...queryKeys.tasks.all, 'vector', embedding, limit] as const,
    infinite: (filters?: Record<string, any>) =>
      [...queryKeys.tasks.all, 'infinite', filters] as const,
    byUser: (userId: string) => [...queryKeys.tasks.all, 'user', userId] as const,
    stats: (userId?: string) => [...queryKeys.tasks.all, 'stats', userId] as const,
  },

  // Environment-related queries
  environments: {
    all: ['environments'] as const,
    lists: () => [...queryKeys.environments.all, 'list'] as const,
    list: (filters?: { isActive?: boolean; userId?: string; search?: string }) =>
      [...queryKeys.environments.lists(), { filters }] as const,
    details: () => [...queryKeys.environments.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.environments.details(), id] as const,
    active: () => [...queryKeys.environments.all, 'active'] as const,
    byUser: (userId: string) => [...queryKeys.environments.all, 'user', userId] as const,
    validate: (config: any) => [...queryKeys.environments.all, 'validate', config] as const,
  },

  // Agent execution queries
  executions: {
    all: ['executions'] as const,
    lists: () => [...queryKeys.executions.all, 'list'] as const,
    list: (filters?: {
      taskId?: string
      agentType?: string
      status?: string
      traceId?: string
      startDate?: Date
      endDate?: Date
    }) => [...queryKeys.executions.lists(), { filters }] as const,
    details: () => [...queryKeys.executions.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.executions.details(), id] as const,
    byTask: (taskId: string) => [...queryKeys.executions.all, 'task', taskId] as const,
    byAgent: (agentType: string) => [...queryKeys.executions.all, 'agent', agentType] as const,
    byTrace: (traceId: string) => [...queryKeys.executions.all, 'trace', traceId] as const,
    infinite: (filters?: Record<string, any>) =>
      [...queryKeys.executions.all, 'infinite', filters] as const,
    stats: (filters?: Record<string, any>) =>
      [...queryKeys.executions.all, 'stats', filters] as const,
    performance: (executionId: string) =>
      [...queryKeys.executions.all, 'performance', executionId] as const,
  },

  // Observability events
  events: {
    all: ['events'] as const,
    lists: () => [...queryKeys.events.all, 'list'] as const,
    list: (filters?: {
      executionId?: string
      eventType?: string
      severity?: string
      category?: string
      traceId?: string
      startDate?: Date
      endDate?: Date
    }) => [...queryKeys.events.lists(), { filters }] as const,
    details: () => [...queryKeys.events.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.events.details(), id] as const,
    byExecution: (executionId: string) =>
      [...queryKeys.events.all, 'execution', executionId] as const,
    byTrace: (traceId: string) => [...queryKeys.events.all, 'trace', traceId] as const,
    bySeverity: (severity: string) => [...queryKeys.events.all, 'severity', severity] as const,
    infinite: (filters?: Record<string, any>) =>
      [...queryKeys.events.all, 'infinite', filters] as const,
    timeline: (executionId: string) => [...queryKeys.events.all, 'timeline', executionId] as const,
    aggregate: (groupBy: string, filters?: Record<string, any>) =>
      [...queryKeys.events.all, 'aggregate', groupBy, filters] as const,
  },

  // Agent memory queries
  memory: {
    all: ['memory'] as const,
    lists: () => [...queryKeys.memory.all, 'list'] as const,
    list: (filters?: {
      agentType?: string
      contextKey?: string
      minImportance?: number
      expired?: boolean
    }) => [...queryKeys.memory.lists(), { filters }] as const,
    details: () => [...queryKeys.memory.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.memory.details(), id] as const,
    search: (query: string, agentType?: string, limit?: number) =>
      [...queryKeys.memory.all, 'search', query, agentType, limit] as const,
    vector: (embedding: number[], agentType?: string, limit?: number) =>
      [...queryKeys.memory.all, 'vector', embedding, agentType, limit] as const,
    byAgent: (agentType: string) => [...queryKeys.memory.all, 'agent', agentType] as const,
    byContext: (agentType: string, contextKey: string) =>
      [...queryKeys.memory.all, 'context', agentType, contextKey] as const,
    stats: (agentType?: string) => [...queryKeys.memory.all, 'stats', agentType] as const,
    cleanup: () => [...queryKeys.memory.all, 'cleanup'] as const,
  },

  // Workflow queries
  workflows: {
    all: ['workflows'] as const,
    lists: () => [...queryKeys.workflows.all, 'list'] as const,
    list: (filters?: {
      isActive?: boolean
      version?: number
      tags?: string[]
      createdBy?: string
    }) => [...queryKeys.workflows.lists(), { filters }] as const,
    details: () => [...queryKeys.workflows.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.workflows.details(), id] as const,
    versions: (name: string) => [...queryKeys.workflows.all, 'versions', name] as const,
    byTags: (tags: string[]) => [...queryKeys.workflows.all, 'tags', tags] as const,
    validate: (definition: any) => [...queryKeys.workflows.all, 'validate', definition] as const,
  },

  // Workflow execution queries
  workflowExecutions: {
    all: ['workflowExecutions'] as const,
    lists: () => [...queryKeys.workflowExecutions.all, 'list'] as const,
    list: (filters?: {
      workflowId?: string
      status?: string
      triggeredBy?: string
      parentExecutionId?: string
      startDate?: Date
      endDate?: Date
    }) => [...queryKeys.workflowExecutions.lists(), { filters }] as const,
    details: () => [...queryKeys.workflowExecutions.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.workflowExecutions.details(), id] as const,
    byWorkflow: (workflowId: string) =>
      [...queryKeys.workflowExecutions.all, 'workflow', workflowId] as const,
    children: (parentExecutionId: string) =>
      [...queryKeys.workflowExecutions.all, 'children', parentExecutionId] as const,
    infinite: (filters?: Record<string, any>) =>
      [...queryKeys.workflowExecutions.all, 'infinite', filters] as const,
    stats: (workflowId?: string) =>
      [...queryKeys.workflowExecutions.all, 'stats', workflowId] as const,
  },

  // Execution snapshot queries
  snapshots: {
    all: ['snapshots'] as const,
    lists: () => [...queryKeys.snapshots.all, 'list'] as const,
    list: (executionId: string, checkpoint?: boolean) =>
      [...queryKeys.snapshots.lists(), executionId, { checkpoint }] as const,
    detail: (id: string) => [...queryKeys.snapshots.all, 'detail', id] as const,
    byExecution: (executionId: string) =>
      [...queryKeys.snapshots.all, 'execution', executionId] as const,
    checkpoints: (executionId: string) =>
      [...queryKeys.snapshots.all, 'checkpoints', executionId] as const,
    timeline: (executionId: string) =>
      [...queryKeys.snapshots.all, 'timeline', executionId] as const,
  },

  // User queries
  users: {
    all: ['users'] as const,
    lists: () => [...queryKeys.users.all, 'list'] as const,
    list: (filters?: { provider?: string; isActive?: boolean; search?: string }) =>
      [...queryKeys.users.lists(), { filters }] as const,
    details: () => [...queryKeys.users.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.users.details(), id] as const,
    current: () => [...queryKeys.users.all, 'current'] as const,
    byProvider: (provider: string, providerId: string) =>
      [...queryKeys.users.all, 'provider', provider, providerId] as const,
    stats: () => [...queryKeys.users.all, 'stats'] as const,
  },

  // Auth session queries
  authSessions: {
    all: ['authSessions'] as const,
    lists: () => [...queryKeys.authSessions.all, 'list'] as const,
    list: (userId: string, provider?: string) =>
      [...queryKeys.authSessions.lists(), userId, { provider }] as const,
    active: (userId: string) => [...queryKeys.authSessions.all, 'active', userId] as const,
    byProvider: (provider: string) =>
      [...queryKeys.authSessions.all, 'provider', provider] as const,
  },

  // File upload queries
  fileUploads: {
    all: ['fileUploads'] as const,
    lists: () => [...queryKeys.fileUploads.all, 'list'] as const,
    list: (filters?: {
      userId?: string
      category?: string
      mimeType?: string
      isPublic?: boolean
      isDeleted?: boolean
    }) => [...queryKeys.fileUploads.lists(), { filters }] as const,
    details: () => [...queryKeys.fileUploads.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.fileUploads.details(), id] as const,
    byUser: (userId: string) => [...queryKeys.fileUploads.all, 'user', userId] as const,
    byCategory: (category: string) => [...queryKeys.fileUploads.all, 'category', category] as const,
    stats: (userId?: string) => [...queryKeys.fileUploads.all, 'stats', userId] as const,
  },

  // Agent session queries
  agentSessions: {
    all: ['agentSessions'] as const,
    lists: () => [...queryKeys.agentSessions.all, 'list'] as const,
    list: (filters?: { userId?: string; sessionType?: string; isActive?: boolean }) =>
      [...queryKeys.agentSessions.lists(), { filters }] as const,
    details: () => [...queryKeys.agentSessions.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.agentSessions.details(), id] as const,
    active: (userId?: string) => [...queryKeys.agentSessions.all, 'active', userId] as const,
    byType: (sessionType: string) => [...queryKeys.agentSessions.all, 'type', sessionType] as const,
  },

  // GitHub repository queries
  githubRepositories: {
    all: ['githubRepositories'] as const,
    lists: () => [...queryKeys.githubRepositories.all, 'list'] as const,
    list: (filters?: {
      userId?: string
      language?: string
      isPrivate?: boolean
      isArchived?: boolean
      search?: string
    }) => [...queryKeys.githubRepositories.lists(), { filters }] as const,
    details: () => [...queryKeys.githubRepositories.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.githubRepositories.details(), id] as const,
    byUser: (userId: string) => [...queryKeys.githubRepositories.all, 'user', userId] as const,
    sync: (userId: string) => [...queryKeys.githubRepositories.all, 'sync', userId] as const,
  },

  // GitHub branch queries
  githubBranches: {
    all: ['githubBranches'] as const,
    lists: () => [...queryKeys.githubBranches.all, 'list'] as const,
    list: (repositoryId: string, isProtected?: boolean) =>
      [...queryKeys.githubBranches.lists(), repositoryId, { isProtected }] as const,
    detail: (id: string) => [...queryKeys.githubBranches.all, 'detail', id] as const,
    byRepository: (repositoryId: string) =>
      [...queryKeys.githubBranches.all, 'repository', repositoryId] as const,
    sync: (repositoryId: string) =>
      [...queryKeys.githubBranches.all, 'sync', repositoryId] as const,
  },

  // Migration queries
  migrations: {
    all: ['migrations'] as const,
    list: () => [...queryKeys.migrations.all, 'list'] as const,
    pending: () => [...queryKeys.migrations.all, 'pending'] as const,
    history: () => [...queryKeys.migrations.all, 'history'] as const,
  },

  // Real-time subscription queries
  realtime: {
    tasks: (filters?: Record<string, any>) => ['realtime', 'tasks', filters] as const,
    executions: (filters?: Record<string, any>) => ['realtime', 'executions', filters] as const,
    events: (filters?: Record<string, any>) => ['realtime', 'events', filters] as const,
    workflows: (filters?: Record<string, any>) => ['realtime', 'workflows', filters] as const,
    memory: (agentType?: string) => ['realtime', 'memory', agentType] as const,
  },

  // Analytics queries
  analytics: {
    execution: (timeRange?: { start: Date; end: Date }) =>
      ['analytics', 'execution', timeRange] as const,
    performance: (timeRange?: { start: Date; end: Date }) =>
      ['analytics', 'performance', timeRange] as const,
    errors: (timeRange?: { start: Date; end: Date }) => ['analytics', 'errors', timeRange] as const,
    memory: (agentType?: string, timeRange?: { start: Date; end: Date }) =>
      ['analytics', 'memory', agentType, timeRange] as const,
    usage: (userId?: string, timeRange?: { start: Date; end: Date }) =>
      ['analytics', 'usage', userId, timeRange] as const,
  },

  // WASM-optimized queries
  wasm: {
    vectorSearch: (table: string, embedding: number[], filters?: Record<string, any>) =>
      ['wasm', 'vector-search', table, embedding, filters] as const,
    sqliteQuery: (sql: string, params?: any[]) => ['wasm', 'sqlite', sql, params] as const,
    compute: (operation: string, data: any) => ['wasm', 'compute', operation, data] as const,
  },
} as const

/**
 * Mutation key factories
 */
export const mutationKeys = {
  tasks: {
    create: ['tasks', 'create'] as const,
    update: (id: string) => ['tasks', 'update', id] as const,
    delete: (id: string) => ['tasks', 'delete', id] as const,
    bulkUpdate: ['tasks', 'bulk-update'] as const,
    archive: (id: string) => ['tasks', 'archive', id] as const,
    unarchive: (id: string) => ['tasks', 'unarchive', id] as const,
  },
  environments: {
    create: ['environments', 'create'] as const,
    update: (id: string) => ['environments', 'update', id] as const,
    delete: (id: string) => ['environments', 'delete', id] as const,
    activate: (id: string) => ['environments', 'activate', id] as const,
    deactivate: (id: string) => ['environments', 'deactivate', id] as const,
  },
  executions: {
    create: ['executions', 'create'] as const,
    cancel: (id: string) => ['executions', 'cancel', id] as const,
    retry: (id: string) => ['executions', 'retry', id] as const,
  },
  events: {
    create: ['events', 'create'] as const,
    bulkCreate: ['events', 'bulk-create'] as const,
  },
  memory: {
    create: ['memory', 'create'] as const,
    update: (id: string) => ['memory', 'update', id] as const,
    delete: (id: string) => ['memory', 'delete', id] as const,
    cleanup: ['memory', 'cleanup'] as const,
    refresh: (id: string) => ['memory', 'refresh', id] as const,
  },
  workflows: {
    create: ['workflows', 'create'] as const,
    update: (id: string) => ['workflows', 'update', id] as const,
    delete: (id: string) => ['workflows', 'delete', id] as const,
    activate: (id: string) => ['workflows', 'activate', id] as const,
    deactivate: (id: string) => ['workflows', 'deactivate', id] as const,
    execute: (id: string) => ['workflows', 'execute', id] as const,
  },
  workflowExecutions: {
    pause: (id: string) => ['workflowExecutions', 'pause', id] as const,
    resume: (id: string) => ['workflowExecutions', 'resume', id] as const,
    cancel: (id: string) => ['workflowExecutions', 'cancel', id] as const,
  },
  snapshots: {
    create: ['snapshots', 'create'] as const,
    createCheckpoint: (executionId: string) => ['snapshots', 'checkpoint', executionId] as const,
  },
  users: {
    update: (id: string) => ['users', 'update', id] as const,
    updatePreferences: (id: string) => ['users', 'preferences', id] as const,
    deactivate: (id: string) => ['users', 'deactivate', id] as const,
  },
  fileUploads: {
    create: ['fileUploads', 'create'] as const,
    update: (id: string) => ['fileUploads', 'update', id] as const,
    delete: (id: string) => ['fileUploads', 'delete', id] as const,
    restore: (id: string) => ['fileUploads', 'restore', id] as const,
  },
  githubRepositories: {
    sync: (userId: string) => ['githubRepositories', 'sync', userId] as const,
    update: (id: string) => ['githubRepositories', 'update', id] as const,
  },
  githubBranches: {
    sync: (repositoryId: string) => ['githubBranches', 'sync', repositoryId] as const,
  },
} as const

export type QueryKeys = typeof queryKeys
export type MutationKeys = typeof mutationKeys
