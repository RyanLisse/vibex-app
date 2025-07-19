// ElectricSQL schema configuration for real-time sync
// This maps our Drizzle schema to ElectricSQL's sync configuration

export const electricSchema = {
  // Core tables that should be synced
  tables: {
    // Tasks table - main entity for task management
    tasks: {
      sync: true,
      conflictResolution: 'last-write-wins',
      filters: {
        // Only sync tasks for the current user
        user_id: '${auth.user_id}',
      },
      indexes: ['status', 'priority', 'created_at', 'user_id'],
      realtime: true,
    },

    // Environments table - configuration environments
    environments: {
      sync: true,
      conflictResolution: 'last-write-wins',
      filters: {
        // Only sync environments for the current user
        user_id: '${auth.user_id}',
      },
      indexes: ['name', 'is_active', 'user_id'],
      realtime: true,
    },

    // Agent executions - observability data
    agent_executions: {
      sync: true,
      conflictResolution: 'server-wins', // Server authoritative for execution data
      filters: {
        // Sync executions for user's tasks only
        task_id: {
          in: 'SELECT id FROM tasks WHERE user_id = ${auth.user_id}',
        },
      },
      indexes: ['task_id', 'agent_type', 'status', 'started_at'],
      realtime: true,
      // Retention policy - only keep recent executions locally
      retention: {
        days: 30,
        field: 'started_at',
      },
    },

    // Observability events - detailed execution events
    observability_events: {
      sync: true,
      conflictResolution: 'server-wins',
      filters: {
        // Sync events for user's executions only
        execution_id: {
          in: `SELECT id FROM agent_executions 
               WHERE task_id IN (SELECT id FROM tasks WHERE user_id = \${auth.user_id})`,
        },
      },
      indexes: ['execution_id', 'event_type', 'timestamp', 'severity'],
      realtime: true,
      // Retention policy - only keep recent events locally
      retention: {
        days: 7,
        field: 'timestamp',
      },
    },

    // Agent memory - AI agent memory system
    agent_memory: {
      sync: true,
      conflictResolution: 'last-write-wins',
      filters: {
        // Sync memory that's not expired and has been accessed recently
        expires_at: {
          gt: 'NOW()',
        },
        last_accessed_at: {
          gt: "NOW() - INTERVAL '30 days'",
        },
      },
      indexes: ['agent_type', 'context_key', 'importance', 'last_accessed_at'],
      realtime: false, // Memory doesn't need real-time sync
    },

    // Workflows - workflow definitions
    workflows: {
      sync: true,
      conflictResolution: 'last-write-wins',
      filters: {
        // Only sync active workflows
        is_active: true,
      },
      indexes: ['name', 'version', 'is_active', 'created_by'],
      realtime: true,
    },

    // Workflow executions - workflow execution instances
    workflow_executions: {
      sync: true,
      conflictResolution: 'server-wins',
      filters: {
        // Sync executions for workflows the user has access to
        workflow_id: {
          in: 'SELECT id FROM workflows WHERE is_active = true',
        },
      },
      indexes: ['workflow_id', 'status', 'started_at', 'triggered_by'],
      realtime: true,
      // Retention policy
      retention: {
        days: 90,
        field: 'started_at',
      },
    },

    // Execution snapshots - debugging snapshots
    execution_snapshots: {
      sync: false, // Too large for client sync, fetch on demand
      conflictResolution: 'server-wins',
      indexes: ['execution_id', 'step_number', 'timestamp', 'checkpoint'],
      realtime: false,
    },
  },

  // Sync rules and permissions
  permissions: {
    // User can only access their own tasks
    tasks: {
      select: 'user_id = ${auth.user_id}',
      insert: 'user_id = ${auth.user_id}',
      update: 'user_id = ${auth.user_id}',
      delete: 'user_id = ${auth.user_id}',
    },

    // User can only access their own environments
    environments: {
      select: 'user_id = ${auth.user_id}',
      insert: 'user_id = ${auth.user_id}',
      update: 'user_id = ${auth.user_id}',
      delete: 'user_id = ${auth.user_id}',
    },

    // Agent executions are read-only for users
    agent_executions: {
      select: 'task_id IN (SELECT id FROM tasks WHERE user_id = ${auth.user_id})',
      insert: false, // Only system can create executions
      update: false,
      delete: false,
    },

    // Observability events are read-only for users
    observability_events: {
      select: `execution_id IN (
        SELECT id FROM agent_executions 
        WHERE task_id IN (SELECT id FROM tasks WHERE user_id = \${auth.user_id})
      )`,
      insert: false,
      update: false,
      delete: false,
    },

    // Agent memory has special access rules
    agent_memory: {
      select: true, // All users can read non-expired memory
      insert: true, // All users can create memory
      update: "created_at > NOW() - INTERVAL '1 hour'", // Can only update recent memory
      delete: false, // Memory expires automatically
    },

    // Workflows are read-only for most users
    workflows: {
      select: 'is_active = true',
      insert: "${auth.role} = 'admin'",
      update: "${auth.role} = 'admin'",
      delete: "${auth.role} = 'admin'",
    },

    // Workflow executions are mostly read-only
    workflow_executions: {
      select: 'workflow_id IN (SELECT id FROM workflows WHERE is_active = true)',
      insert: false, // Only system creates executions
      update: false,
      delete: false,
    },
  },

  // Real-time subscriptions
  subscriptions: {
    // Subscribe to user's tasks
    userTasks: {
      table: 'tasks',
      filter: 'user_id = ${auth.user_id}',
      events: ['insert', 'update', 'delete'],
    },

    // Subscribe to user's environments
    userEnvironments: {
      table: 'environments',
      filter: 'user_id = ${auth.user_id}',
      events: ['insert', 'update', 'delete'],
    },

    // Subscribe to task executions
    taskExecutions: {
      table: 'agent_executions',
      filter: 'task_id IN (SELECT id FROM tasks WHERE user_id = ${auth.user_id})',
      events: ['insert', 'update'],
    },

    // Subscribe to execution events
    executionEvents: {
      table: 'observability_events',
      filter: `execution_id IN (
        SELECT id FROM agent_executions 
        WHERE task_id IN (SELECT id FROM tasks WHERE user_id = \${auth.user_id})
      )`,
      events: ['insert'],
    },

    // Subscribe to workflow executions
    workflowExecutions: {
      table: 'workflow_executions',
      filter: 'workflow_id IN (SELECT id FROM workflows WHERE is_active = true)',
      events: ['insert', 'update'],
    },
  },

  // Conflict resolution strategies
  conflictResolution: {
    // Default strategy
    default: 'last-write-wins',

    // Custom strategies for specific tables
    strategies: {
      // Tasks use last-write-wins with timestamp comparison
      tasks: {
        strategy: 'last-write-wins',
        timestampField: 'updated_at',
      },

      // Environments use last-write-wins
      environments: {
        strategy: 'last-write-wins',
        timestampField: 'updated_at',
      },

      // Agent executions are server-authoritative
      agent_executions: {
        strategy: 'server-wins',
      },

      // Observability events are append-only
      observability_events: {
        strategy: 'server-wins',
      },

      // Agent memory uses importance-based resolution
      agent_memory: {
        strategy: 'custom',
        resolver: 'importance-based',
      },

      // Workflows are admin-controlled
      workflows: {
        strategy: 'server-wins',
      },

      // Workflow executions are server-controlled
      workflow_executions: {
        strategy: 'server-wins',
      },
    },
  },

  // Sync optimization
  optimization: {
    // Batch size for sync operations
    batchSize: 100,

    // Sync frequency in milliseconds
    syncInterval: 5000,

    // Enable compression for large payloads
    compression: true,

    // Enable delta sync for large tables
    deltaSync: {
      enabled: true,
      tables: ['agent_executions', 'observability_events'],
    },

    // Prefetch related data
    prefetch: {
      tasks: ['agent_executions'],
      agent_executions: ['observability_events'],
      workflows: ['workflow_executions'],
    },
  },
}

// Export schema for use in Electric configuration
export default electricSchema
