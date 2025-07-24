import { relations } from "drizzle-orm";
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
} from "drizzle-orm/pg-core";

// Alert System Tables
export const alerts = pgTable(
	"alerts",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		timestamp: timestamp("timestamp").defaultNow().notNull(),
		severity: varchar("severity", { length: 20 }).notNull(),
		type: varchar("type", { length: 100 }).notNull(),
		message: text("message").notNull(),
		source: varchar("source", { length: 255 }).notNull(),
		metadata: jsonb("metadata"),
		stackTrace: text("stack_trace"),
		correlationId: varchar("correlation_id", { length: 255 }),
		environment: varchar("environment", { length: 50 }).notNull(),
		userId: varchar("user_id", { length: 255 }),
		sessionId: varchar("session_id", { length: 255 }),
		resolved: boolean("resolved").default(false),
		resolvedAt: timestamp("resolved_at"),
		resolvedBy: varchar("resolved_by", { length: 255 }),
		occurrenceCount: integer("occurrence_count").default(1),
		lastOccurrence: timestamp("last_occurrence").defaultNow().notNull(),
		firstOccurrence: timestamp("first_occurrence").defaultNow().notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
	(table) => ({
		severityIdx: index("alerts_severity_idx").on(table.severity),
		typeIdx: index("alerts_type_idx").on(table.type),
		sourceIdx: index("alerts_source_idx").on(table.source),
		environmentIdx: index("alerts_environment_idx").on(table.environment),
		resolvedIdx: index("alerts_resolved_idx").on(table.resolved),
		timestampIdx: index("alerts_timestamp_idx").on(table.timestamp),
		correlationIdIdx: index("alerts_correlation_id_idx").on(table.correlationId),
		userIdIdx: index("alerts_user_id_idx").on(table.userId),
	})
);

export const alertChannels = pgTable(
	"alert_channels",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		name: varchar("name", { length: 255 }).notNull(),
		type: varchar("type", { length: 50 }).notNull(),
		enabled: boolean("enabled").default(true),
		config: jsonb("config").notNull(),
		errorTypes: jsonb("error_types"), // Array of CriticalErrorType
		priority: varchar("priority", { length: 20 }).notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
	(table) => ({
		nameIdx: index("alert_channels_name_idx").on(table.name),
		typeIdx: index("alert_channels_type_idx").on(table.type),
		enabledIdx: index("alert_channels_enabled_idx").on(table.enabled),
		uniqueName: unique("alert_channels_name_unique").on(table.name),
	})
);

export const alertNotifications = pgTable(
	"alert_notifications",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		alertId: uuid("alert_id")
			.references(() => alerts.id)
			.notNull(),
		channelId: uuid("channel_id").references(() => alertChannels.id),
		channelType: varchar("channel_type", { length: 50 }).notNull(),
		channelName: varchar("channel_name", { length: 255 }).notNull(),
		status: varchar("status", { length: 20 }).notNull(),
		sentAt: timestamp("sent_at"),
		deliveredAt: timestamp("delivered_at"),
		failedAt: timestamp("failed_at"),
		errorMessage: text("error_message"),
		retryCount: integer("retry_count").default(0),
		maxRetries: integer("max_retries").default(3),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
	(table) => ({
		alertIdIdx: index("alert_notifications_alert_id_idx").on(table.alertId),
		statusIdx: index("alert_notifications_status_idx").on(table.status),
		channelTypeIdx: index("alert_notifications_channel_type_idx").on(table.channelType),
		sentAtIdx: index("alert_notifications_sent_at_idx").on(table.sentAt),
	})
);

export const alertMetrics = pgTable(
	"alert_metrics",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		date: timestamp("date").defaultNow().notNull(),
		totalAlerts: integer("total_alerts").default(0),
		alertsByType: jsonb("alerts_by_type"), // Record<CriticalErrorType, number>
		alertsByChannel: jsonb("alerts_by_channel"), // Record<AlertChannelType, number>
		averageResolutionTime: integer("average_resolution_time"), // in milliseconds
		unresolvedAlerts: integer("unresolved_alerts").default(0),
		meanTimeToAlert: integer("mean_time_to_alert"), // in milliseconds
		meanTimeToResolution: integer("mean_time_to_resolution"), // in milliseconds
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => ({
		dateIdx: index("alert_metrics_date_idx").on(table.date),
	})
);

// Alert Relations
export const alertsRelations = relations(alerts, ({ many }) => ({
	notifications: many(alertNotifications),
}));

export const alertChannelsRelations = relations(alertChannels, ({ many }) => ({
	notifications: many(alertNotifications),
}));

export const alertNotificationsRelations = relations(alertNotifications, ({ one }) => ({
	alert: one(alerts, {
		fields: [alertNotifications.alertId],
		references: [alerts.id],
	}),
	channel: one(alertChannels, {
		fields: [alertNotifications.channelId],
		references: [alertChannels.id],
	}),
}));

// Core Tables
export const tasks = pgTable(
	"tasks",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		title: varchar("title", { length: 255 }).notNull(),
		description: text("description"),
		status: varchar("status", { length: 50 }).notNull().default("pending"),
		priority: varchar("priority", { length: 20 }).default("medium"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
		userId: varchar("user_id", { length: 255 }),
		metadata: jsonb("metadata"),
		// Vector embedding for semantic search
		embedding: vector("embedding", { dimensions: 1536 }),
		// Enhanced task management fields
		assigneeId: varchar("assignee_id", { length: 255 }),
		dueDate: timestamp("due_date"),
		creationMethod: varchar("creation_method", { length: 50 }).default("manual"),
		completionDate: timestamp("completion_date"),
		kanbanPosition: integer("kanban_position"),
		kanbanColumn: varchar("kanban_column", { length: 50 }).default("todo"),
	},
	(table) => ({
		statusIdx: index("tasks_status_idx").on(table.status),
		priorityIdx: index("tasks_priority_idx").on(table.priority),
		userIdIdx: index("tasks_user_id_idx").on(table.userId),
		createdAtIdx: index("tasks_created_at_idx").on(table.createdAt),
		embeddingIdx: index("tasks_embedding_idx").using("hnsw", table.embedding),
		assigneeIdIdx: index("tasks_assignee_id_idx").on(table.assigneeId),
		dueDateIdx: index("tasks_due_date_idx").on(table.dueDate),
		creationMethodIdx: index("tasks_creation_method_idx").on(table.creationMethod),
		kanbanColumnIdx: index("tasks_kanban_column_idx").on(table.kanbanColumn),
	})
);

export const environments = pgTable(
	"environments",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		name: varchar("name", { length: 255 }).notNull(),
		config: jsonb("config").notNull(),
		isActive: boolean("is_active").default(false),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
		userId: varchar("user_id", { length: 255 }),
		// Configuration validation schema version
		schemaVersion: integer("schema_version").default(1),
	},
	(table) => ({
		nameIdx: index("environments_name_idx").on(table.name),
		userIdIdx: index("environments_user_id_idx").on(table.userId),
		isActiveIdx: index("environments_is_active_idx").on(table.isActive),
		uniqueUserName: unique("environments_user_name_unique").on(table.userId, table.name),
	})
);

// Observability Tables
export const agentExecutions = pgTable(
	"agent_executions",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		taskId: uuid("task_id").references(() => tasks.id, { onDelete: "cascade" }),
		agentType: varchar("agent_type", { length: 100 }).notNull(),
		status: varchar("status", { length: 50 }).notNull(),
		startedAt: timestamp("started_at").defaultNow().notNull(),
		completedAt: timestamp("completed_at"),
		input: jsonb("input"),
		output: jsonb("output"),
		error: text("error"),
		metadata: jsonb("metadata"),
		traceId: varchar("trace_id", { length: 255 }),
		// Performance metrics
		executionTimeMs: integer("execution_time_ms"),
		tokenUsage: jsonb("token_usage"),
		cost: jsonb("cost"),
	},
	(table) => ({
		taskIdIdx: index("agent_executions_task_id_idx").on(table.taskId),
		agentTypeIdx: index("agent_executions_agent_type_idx").on(table.agentType),
		statusIdx: index("agent_executions_status_idx").on(table.status),
		startedAtIdx: index("agent_executions_started_at_idx").on(table.startedAt),
		traceIdIdx: index("agent_executions_trace_id_idx").on(table.traceId),
		completedAtIdx: index("agent_executions_completed_at_idx").on(table.completedAt),
	})
);

export const observabilityEvents = pgTable(
	"observability_events",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		executionId: uuid("execution_id").references(() => agentExecutions.id, {
			onDelete: "cascade",
		}),
		type: varchar("type", { length: 100 }).notNull(),
		timestamp: timestamp("timestamp").defaultNow().notNull(),
		data: jsonb("data"),
		traceId: varchar("trace_id", { length: 255 }),
		spanId: varchar("span_id", { length: 255 }),
		// Event categorization
		severity: varchar("severity", { length: 20 }).default("info"),
		category: varchar("category", { length: 50 }),
		source: varchar("source", { length: 100 }).default("system"),
		message: text("message"),
		metadata: jsonb("metadata"),
		tags: jsonb("tags"),
	},
	(table) => ({
		executionIdIdx: index("observability_events_execution_id_idx").on(table.executionId),
		eventTypeIdx: index("observability_events_event_type_idx").on(table.type),
		timestampIdx: index("observability_events_timestamp_idx").on(table.timestamp),
		traceIdIdx: index("observability_events_trace_id_idx").on(table.traceId),
		severityIdx: index("observability_events_severity_idx").on(table.severity),
		categoryIdx: index("observability_events_category_idx").on(table.category),
	})
);

// Agent Memory System with Vector Search
export const agentMemory = pgTable(
	"agent_memory",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		agentType: varchar("agent_type", { length: 100 }).notNull(),
		contextKey: varchar("context_key", { length: 255 }).notNull(),
		content: text("content").notNull(),
		embedding: vector("embedding", { dimensions: 1536 }),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		lastAccessedAt: timestamp("last_accessed_at").defaultNow().notNull(),
		accessCount: integer("access_count").default(0),
		metadata: jsonb("metadata"),
		// Memory management
		importance: integer("importance").default(1), // 1-10 scale
		expiresAt: timestamp("expires_at"),
	},
	(table) => ({
		agentTypeIdx: index("agent_memory_agent_type_idx").on(table.agentType),
		contextKeyIdx: index("agent_memory_context_key_idx").on(table.contextKey),
		embeddingIdx: index("agent_memory_embedding_idx").using("hnsw", table.embedding),
		lastAccessedIdx: index("agent_memory_last_accessed_idx").on(table.lastAccessedAt),
		importanceIdx: index("agent_memory_importance_idx").on(table.importance),
		expiresAtIdx: index("agent_memory_expires_at_idx").on(table.expiresAt),
		uniqueAgentContext: unique("agent_memory_agent_context_unique").on(
			table.agentType,
			table.contextKey
		),
	})
);

// Workflow Orchestration
export const workflows = pgTable(
	"workflows",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		name: varchar("name", { length: 255 }).notNull(),
		definition: jsonb("definition").notNull(),
		version: integer("version").default(1),
		isActive: boolean("is_active").default(true),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		createdBy: varchar("created_by", { length: 255 }),
		// Workflow metadata
		tags: jsonb("tags"),
		description: text("description"),
	},
	(table) => ({
		nameIdx: index("workflows_name_idx").on(table.name),
		versionIdx: index("workflows_version_idx").on(table.version),
		isActiveIdx: index("workflows_is_active_idx").on(table.isActive),
		createdByIdx: index("workflows_created_by_idx").on(table.createdBy),
		uniqueNameVersion: unique("workflows_name_version_unique").on(table.name, table.version),
	})
);

export const workflowExecutions = pgTable(
	"workflow_executions",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		workflowId: uuid("workflow_id").references(() => workflows.id, {
			onDelete: "cascade",
		}),
		status: varchar("status", { length: 50 }).notNull(),
		currentStep: integer("current_step").default(0),
		totalSteps: integer("total_steps"),
		state: jsonb("state"),
		startedAt: timestamp("started_at").defaultNow().notNull(),
		completedAt: timestamp("completed_at"),
		error: text("error"),
		// Execution context
		triggeredBy: varchar("triggered_by", { length: 255 }),
		parentExecutionId: uuid("parent_execution_id"),
	},
	(table) => ({
		workflowIdIdx: index("workflow_executions_workflow_id_idx").on(table.workflowId),
		statusIdx: index("workflow_executions_status_idx").on(table.status),
		startedAtIdx: index("workflow_executions_started_at_idx").on(table.startedAt),
		triggeredByIdx: index("workflow_executions_triggered_by_idx").on(table.triggeredBy),
		parentExecutionIdx: index("workflow_executions_parent_execution_idx").on(
			table.parentExecutionId
		),
		parentExecutionFk: foreignKey({
			columns: [table.parentExecutionId],
			foreignColumns: [table.id],
			name: "workflow_executions_parent_fk",
		}),
	})
);

// Time-travel debugging support
export const executionSnapshots = pgTable(
	"execution_snapshots",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		executionId: uuid("execution_id").references(() => agentExecutions.id, {
			onDelete: "cascade",
		}),
		stepNumber: integer("step_number").notNull(),
		timestamp: timestamp("timestamp").defaultNow().notNull(),
		state: jsonb("state").notNull(),
		// Snapshot metadata
		description: text("description"),
		checkpoint: boolean("checkpoint").default(false),
		type: varchar("type", { length: 50 }).notNull(),
		metadata: jsonb("metadata"),
	},
	(table) => ({
		executionIdIdx: index("execution_snapshots_execution_id_idx").on(table.executionId),
		stepNumberIdx: index("execution_snapshots_step_number_idx").on(table.stepNumber),
		timestampIdx: index("execution_snapshots_timestamp_idx").on(table.timestamp),
		checkpointIdx: index("execution_snapshots_checkpoint_idx").on(table.checkpoint),
		uniqueExecutionStep: unique("execution_snapshots_execution_step_unique").on(
			table.executionId,
			table.stepNumber
		),
	})
);

// User Management Tables
export const users = pgTable(
	"users",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		email: varchar("email", { length: 255 }).notNull().unique(),
		name: varchar("name", { length: 255 }),
		avatar: text("avatar"),
		provider: varchar("provider", { length: 50 }).notNull(), // 'github', 'openai', 'anthropic'
		providerId: varchar("provider_id", { length: 255 }).notNull(),
		profile: jsonb("profile"), // Store provider-specific profile data
		preferences: jsonb("preferences").default({}),
		isActive: boolean("is_active").default(true),
		lastLoginAt: timestamp("last_login_at"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
	(table) => ({
		emailIdx: index("users_email_idx").on(table.email),
		providerIdx: index("users_provider_idx").on(table.provider),
		providerIdIdx: index("users_provider_id_idx").on(table.providerId),
		isActiveIdx: index("users_is_active_idx").on(table.isActive),
		uniqueProviderUser: unique("users_provider_user_unique").on(table.provider, table.providerId),
	})
);

export const authSessions = pgTable(
	"auth_sessions",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
		provider: varchar("provider", { length: 50 }).notNull(),
		accessToken: text("access_token").notNull(),
		refreshToken: text("refresh_token"),
		idToken: text("id_token"),
		tokenType: varchar("token_type", { length: 50 }).default("Bearer"),
		expiresAt: timestamp("expires_at"),
		scope: text("scope"),
		organizationId: varchar("organization_id", { length: 255 }),
		creditsGranted: integer("credits_granted"),
		metadata: jsonb("metadata"),
		isActive: boolean("is_active").default(true),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
		lastUsedAt: timestamp("last_used_at").defaultNow().notNull(),
	},
	(table) => ({
		userIdIdx: index("auth_sessions_user_id_idx").on(table.userId),
		providerIdx: index("auth_sessions_provider_idx").on(table.provider),
		isActiveIdx: index("auth_sessions_is_active_idx").on(table.isActive),
		expiresAtIdx: index("auth_sessions_expires_at_idx").on(table.expiresAt),
		lastUsedIdx: index("auth_sessions_last_used_idx").on(table.lastUsedAt),
	})
);

export const fileUploads = pgTable(
	"file_uploads",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
		filename: varchar("filename", { length: 255 }).notNull(),
		originalName: varchar("original_name", { length: 255 }).notNull(),
		mimeType: varchar("mime_type", { length: 100 }).notNull(),
		size: integer("size").notNull(),
		category: varchar("category", { length: 50 }).default("attachment"),
		description: text("description"),
		url: text("url").notNull(),
		storageProvider: varchar("storage_provider", { length: 50 }).notNull(), // 'local', 's3', 'gcs'
		storagePath: text("storage_path").notNull(),
		metadata: jsonb("metadata"),
		isPublic: boolean("is_public").default(false),
		isDeleted: boolean("is_deleted").default(false),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		deletedAt: timestamp("deleted_at"),
	},
	(table) => ({
		userIdIdx: index("file_uploads_user_id_idx").on(table.userId),
		filenameIdx: index("file_uploads_filename_idx").on(table.filename),
		categoryIdx: index("file_uploads_category_idx").on(table.category),
		isDeletedIdx: index("file_uploads_is_deleted_idx").on(table.isDeleted),
		createdAtIdx: index("file_uploads_created_at_idx").on(table.createdAt),
	})
);

export const agentSessions = pgTable(
	"agent_sessions",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
		sessionType: varchar("session_type", { length: 50 }).notNull(), // 'chat', 'voice', 'brainstorm', 'multi-agent'
		sessionData: jsonb("session_data").notNull(),
		currentStage: varchar("current_stage", { length: 100 }),
		totalStages: integer("total_stages"),
		isActive: boolean("is_active").default(true),
		startedAt: timestamp("started_at").defaultNow().notNull(),
		endedAt: timestamp("ended_at"),
		lastInteractionAt: timestamp("last_interaction_at").defaultNow().notNull(),
		metadata: jsonb("metadata"),
	},
	(table) => ({
		userIdIdx: index("agent_sessions_user_id_idx").on(table.userId),
		sessionTypeIdx: index("agent_sessions_session_type_idx").on(table.sessionType),
		isActiveIdx: index("agent_sessions_is_active_idx").on(table.isActive),
		startedAtIdx: index("agent_sessions_started_at_idx").on(table.startedAt),
		lastInteractionIdx: index("agent_sessions_last_interaction_idx").on(table.lastInteractionAt),
	})
);

export const githubRepositories = pgTable(
	"github_repositories",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
		githubId: integer("github_id").notNull(),
		name: varchar("name", { length: 255 }).notNull(),
		fullName: varchar("full_name", { length: 255 }).notNull(),
		description: text("description"),
		htmlUrl: text("html_url").notNull(),
		cloneUrl: text("clone_url").notNull(),
		sshUrl: text("ssh_url").notNull(),
		defaultBranch: varchar("default_branch", { length: 100 }).notNull(),
		isPrivate: boolean("is_private").notNull(),
		isFork: boolean("is_fork").notNull(),
		isArchived: boolean("is_archived").notNull(),
		language: varchar("language", { length: 50 }),
		stargazersCount: integer("stargazers_count").default(0),
		forksCount: integer("forks_count").default(0),
		openIssuesCount: integer("open_issues_count").default(0),
		size: integer("size").default(0),
		permissions: jsonb("permissions"),
		lastSyncAt: timestamp("last_sync_at").defaultNow().notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
	(table) => ({
		userIdIdx: index("github_repositories_user_id_idx").on(table.userId),
		githubIdIdx: index("github_repositories_github_id_idx").on(table.githubId),
		fullNameIdx: index("github_repositories_full_name_idx").on(table.fullName),
		lastSyncIdx: index("github_repositories_last_sync_idx").on(table.lastSyncAt),
		uniqueUserRepo: unique("github_repositories_user_repo_unique").on(table.userId, table.githubId),
	})
);

export const githubBranches = pgTable(
	"github_branches",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		repositoryId: uuid("repository_id").references(() => githubRepositories.id, {
			onDelete: "cascade",
		}),
		name: varchar("name", { length: 255 }).notNull(),
		commitSha: varchar("commit_sha", { length: 40 }).notNull(),
		commitUrl: text("commit_url").notNull(),
		isProtected: boolean("is_protected").default(false),
		isDefault: boolean("is_default").default(false),
		lastSyncAt: timestamp("last_sync_at").defaultNow().notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => ({
		repositoryIdIdx: index("github_branches_repository_id_idx").on(table.repositoryId),
		nameIdx: index("github_branches_name_idx").on(table.name),
		isDefaultIdx: index("github_branches_is_default_idx").on(table.isDefault),
		lastSyncIdx: index("github_branches_last_sync_idx").on(table.lastSyncAt),
		uniqueRepoBranch: unique("github_branches_repo_branch_unique").on(
			table.repositoryId,
			table.name
		),
	})
);

// Database migration tracking
export const migrations = pgTable(
	"migrations",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		name: varchar("name", { length: 255 }).notNull().unique(),
		executedAt: timestamp("executed_at").defaultNow().notNull(),
		checksum: varchar("checksum", { length: 64 }).notNull(),
		rollbackSql: text("rollback_sql"),
		metadata: jsonb("metadata"),
	},
	(table) => ({
		nameIdx: index("migrations_name_idx").on(table.name),
		executedAtIdx: index("migrations_executed_at_idx").on(table.executedAt),
	})
);

// Task Enhancement Tables
export const taskLabels = pgTable(
	"task_labels",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		taskId: uuid("task_id")
			.references(() => tasks.id, { onDelete: "cascade" })
			.notNull(),
		label: varchar("label", { length: 50 }).notNull(),
		color: varchar("color", { length: 7 }).default("#6B7280"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => ({
		taskIdIdx: index("task_labels_task_id_idx").on(table.taskId),
		labelIdx: index("task_labels_label_idx").on(table.label),
		uniqueTaskLabel: unique("task_labels_task_label_unique").on(table.taskId, table.label),
	})
);

export const taskAttachments = pgTable(
	"task_attachments",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		taskId: uuid("task_id")
			.references(() => tasks.id, { onDelete: "cascade" })
			.notNull(),
		type: varchar("type", { length: 50 }).notNull(), // 'screenshot', 'voice_recording', 'document'
		url: text("url").notNull(),
		filename: varchar("filename", { length: 255 }),
		sizeBytes: integer("size_bytes"),
		mimeType: varchar("mime_type", { length: 100 }),
		metadata: jsonb("metadata"), // For annotations, transcriptions, etc.
		createdAt: timestamp("created_at").defaultNow().notNull(),
		createdBy: varchar("created_by", { length: 255 }),
	},
	(table) => ({
		taskIdIdx: index("task_attachments_task_id_idx").on(table.taskId),
		typeIdx: index("task_attachments_type_idx").on(table.type),
	})
);

export const taskPrLinks = pgTable(
	"task_pr_links",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		taskId: uuid("task_id")
			.references(() => tasks.id, { onDelete: "cascade" })
			.notNull(),
		prNumber: integer("pr_number").notNull(),
		repository: varchar("repository", { length: 255 }).notNull(),
		prUrl: text("pr_url").notNull(),
		prTitle: text("pr_title"),
		prStatus: varchar("pr_status", { length: 50 }), // 'open', 'closed', 'merged', 'draft'
		reviewStatus: varchar("review_status", { length: 50 }), // 'pending', 'approved', 'changes_requested'
		author: varchar("author", { length: 255 }),
		branch: varchar("branch", { length: 255 }),
		autoUpdateStatus: boolean("auto_update_status").default(true),
		lastSyncedAt: timestamp("last_synced_at"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
	(table) => ({
		taskIdIdx: index("task_pr_links_task_id_idx").on(table.taskId),
		prStatusIdx: index("task_pr_links_pr_status_idx").on(table.prStatus),
		uniqueTaskPr: unique("task_pr_links_unique").on(table.taskId, table.prNumber, table.repository),
	})
);

export const taskProgressSnapshots = pgTable(
	"task_progress_snapshots",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		taskId: uuid("task_id")
			.references(() => tasks.id, { onDelete: "cascade" })
			.notNull(),
		progressPercentage: integer("progress_percentage").default(0),
		timeSpentMinutes: integer("time_spent_minutes").default(0),
		blockers: jsonb("blockers"),
		notes: text("notes"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		createdBy: varchar("created_by", { length: 255 }),
	},
	(table) => ({
		taskIdIdx: index("task_progress_snapshots_task_id_idx").on(table.taskId),
		createdAtIdx: index("task_progress_snapshots_created_at_idx").on(table.createdAt),
	})
);

// Relations
export const usersRelations = relations(users, ({ many }) => ({
	authSessions: many(authSessions),
	fileUploads: many(fileUploads),
	agentSessions: many(agentSessions),
	githubRepositories: many(githubRepositories),
	environments: many(environments),
	tasks: many(tasks),
}));

export const authSessionsRelations = relations(authSessions, ({ one }) => ({
	user: one(users, {
		fields: [authSessions.userId],
		references: [users.id],
	}),
}));

export const fileUploadsRelations = relations(fileUploads, ({ one }) => ({
	user: one(users, {
		fields: [fileUploads.userId],
		references: [users.id],
	}),
}));

export const agentSessionsRelations = relations(agentSessions, ({ one }) => ({
	user: one(users, {
		fields: [agentSessions.userId],
		references: [users.id],
	}),
}));

export const githubRepositoriesRelations = relations(githubRepositories, ({ one, many }) => ({
	user: one(users, {
		fields: [githubRepositories.userId],
		references: [users.id],
	}),
	branches: many(githubBranches),
}));

export const githubBranchesRelations = relations(githubBranches, ({ one }) => ({
	repository: one(githubRepositories, {
		fields: [githubBranches.repositoryId],
		references: [githubRepositories.id],
	}),
}));

export const tasksRelations = relations(tasks, ({ many, one }) => ({
	agentExecutions: many(agentExecutions),
	user: one(users, {
		fields: [tasks.userId],
		references: [users.id],
	}),
	assignee: one(users, {
		fields: [tasks.assigneeId],
		references: [users.id],
	}),
	labels: many(taskLabels),
	attachments: many(taskAttachments),
	prLinks: many(taskPrLinks),
	progressSnapshots: many(taskProgressSnapshots),
}));

export const taskLabelsRelations = relations(taskLabels, ({ one }) => ({
	task: one(tasks, {
		fields: [taskLabels.taskId],
		references: [tasks.id],
	}),
}));

export const taskAttachmentsRelations = relations(taskAttachments, ({ one }) => ({
	task: one(tasks, {
		fields: [taskAttachments.taskId],
		references: [tasks.id],
	}),
}));

export const taskPrLinksRelations = relations(taskPrLinks, ({ one }) => ({
	task: one(tasks, {
		fields: [taskPrLinks.taskId],
		references: [tasks.id],
	}),
}));

export const taskProgressSnapshotsRelations = relations(taskProgressSnapshots, ({ one }) => ({
	task: one(tasks, {
		fields: [taskProgressSnapshots.taskId],
		references: [tasks.id],
	}),
}));

export const environmentsRelations = relations(environments, ({ one }) => ({
	user: one(users, {
		fields: [environments.userId],
		references: [users.id],
	}),
}));

export const agentExecutionsRelations = relations(agentExecutions, ({ one, many }) => ({
	task: one(tasks, {
		fields: [agentExecutions.taskId],
		references: [tasks.id],
	}),
	observabilityEvents: many(observabilityEvents),
	executionSnapshots: many(executionSnapshots),
}));

export const observabilityEventsRelations = relations(observabilityEvents, ({ one }) => ({
	execution: one(agentExecutions, {
		fields: [observabilityEvents.executionId],
		references: [agentExecutions.id],
	}),
}));

export const workflowsRelations = relations(workflows, ({ many }) => ({
	executions: many(workflowExecutions),
}));

export const workflowExecutionsRelations = relations(workflowExecutions, ({ one, many }) => ({
	workflow: one(workflows, {
		fields: [workflowExecutions.workflowId],
		references: [workflows.id],
	}),
	parentExecution: one(workflowExecutions, {
		fields: [workflowExecutions.parentExecutionId],
		references: [workflowExecutions.id],
		relationName: "parentChild",
	}),
	childExecutions: many(workflowExecutions, {
		relationName: "parentChild",
	}),
}));

export const executionSnapshotsRelations = relations(executionSnapshots, ({ one }) => ({
	execution: one(agentExecutions, {
		fields: [executionSnapshots.executionId],
		references: [agentExecutions.id],
	}),
}));

// Auth Tokens Table (for secure token storage)
export const authTokens = pgTable(
	"auth_tokens",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		userId: varchar("user_id", { length: 255 }).notNull(),
		providerId: varchar("provider_id", { length: 255 }).notNull(),
		encryptedToken: text("encrypted_token").notNull(),
		tokenType: varchar("token_type", { length: 20 }).notNull(), // 'oauth' or 'api'
		expiresAt: timestamp("expires_at"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
	(table) => ({
		userProviderUnique: unique("auth_tokens_user_provider_unique").on(
			table.userId,
			table.providerId
		),
		userIdIdx: index("auth_tokens_user_id_idx").on(table.userId),
		providerIdIdx: index("auth_tokens_provider_id_idx").on(table.providerId),
		expiresAtIdx: index("auth_tokens_expires_at_idx").on(table.expiresAt),
	})
);

// Type exports converted to regular exports for build compatibility
export const User = users;
export const NewUser = users;
export const AuthSession = authSessions;
export const NewAuthSession = authSessions;
export const FileUpload = fileUploads;
export const NewFileUpload = fileUploads;
export const AgentSession = agentSessions;
export const NewAgentSession = agentSessions;
export const GitHubRepository = githubRepositories;
export const NewGitHubRepository = githubRepositories;
export const GitHubBranch = githubBranches;
export const NewGitHubBranch = githubBranches;
export const Task = tasks;
export const NewTask = tasks;
export const TaskLabel = taskLabels;
export const NewTaskLabel = taskLabels;
export const TaskAttachment = taskAttachments;
export const NewTaskAttachment = taskAttachments;
export const TaskPrLink = taskPrLinks;
export const NewTaskPrLink = taskPrLinks;
export const TaskProgressSnapshot = taskProgressSnapshots;
export const NewTaskProgressSnapshot = taskProgressSnapshots;
export const Environment = environments;
export const NewEnvironment = environments;
export const AgentExecution = agentExecutions;
export const NewAgentExecution = agentExecutions;
export const ObservabilityEvent = observabilityEvents;
export const NewObservabilityEvent = observabilityEvents;
export const AgentMemory = agentMemory;
export const NewAgentMemory = agentMemory;
export const Workflow = workflows;
export const NewWorkflow = workflows;
export const WorkflowExecution = workflowExecutions;
export const NewWorkflowExecution = workflowExecutions;
export const ExecutionSnapshot = executionSnapshots;
export const NewExecutionSnapshot = executionSnapshots;
export const Migration = migrations;
export const NewMigration = migrations;
export const AuthToken = authTokens;
export const NewAuthToken = authTokens;

// Message types for compatibility
export const StreamingMessage = {
	id: "",
	role: "user",
	type: "",
	content: "",
	status: "streaming",
	timestamp: new Date(),
	data: null,
};
