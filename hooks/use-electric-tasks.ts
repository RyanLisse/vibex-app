"use client";

import type { Environment, NewEnvironment, NewTask, Task } from "@/db/schema";
electricDb, type SyncEvent } from "@/lib/electric/config";
import { useElectricQuery, useElectricSubscription } from "./use-electric";
	useEnvironmentsSubscription,
	useTasksSubscription,
} from "./use-electric-subscriptions";

interface ConflictEvent {
	type: "conflict";
	table: string;
	local: any;
	remote: any;
	resolved?: any;
}

// Enhanced hook for managing tasks with real-time sync
export function useElectricTasks(userId?: string) {
	// Use the new subscription system for real-time updates
	const {
		tasks: subscriptionTasks,
		loading: subscriptionLoading,
		error: subscriptionError,
		subscriptionActive,
		syncEvents,
		refetch: refetchTasks,
	} = useTasksSubscription(userId);

	// Fallback query for when subscription is not active
	const tasksQuery = useMemo(() => {
		if (!userId) return "SELECT * FROM tasks ORDER BY created_at DESC";
		return "SELECT * FROM tasks WHERE user_id = $1 ORDER BY created_at DESC";
	}, [userId]);

	const tasksParams = useMemo(() => {
		return userId ? [userId] : [];
	}, [userId]);

	// Fallback query when subscription is not available
	const {
		data: fallbackTasks,
		loading: fallbackLoading,
		error: fallbackError,
	} = useElectricQuery<Task>(tasksQuery, tasksParams, {
		enabled: !subscriptionActive,
		refetchInterval: 30_000,
	});

	// Use subscription data when available, fallback otherwise
	const tasks = subscriptionActive ? subscriptionTasks : fallbackTasks || [];
	const tasksLoading = subscriptionActive
		? subscriptionLoading
		: fallbackLoading;
	const tasksError = subscriptionActive ? subscriptionError : fallbackError;

	// Subscribe to real-time task updates
	const subscriptionFilter = userId ? `user_id = '${userId}'` : undefined;

	const {
		data: realtimeTasks,
		loading: realtimeLoading,
		error: realtimeError,
	} = useElectricSubscription<Task>("tasks", subscriptionFilter, {
		enabled: true,
		onInsert: (task) => {
			console.log("New task created:", task.title);
		},
		onUpdate: (task) => {
			console.log("Task updated:", task.title);
		},
		onDelete: (task) => {
			console.log("Task deleted:", task.title);
		},
	});

	// Use subscription data if available, otherwise use query data
	const finalTasks = realtimeTasks.length > 0 ? realtimeTasks : tasks;

	// State for sync events and conflicts
	const [localSyncEvents, setLocalSyncEvents] = useState<SyncEvent[]>([]);
	const [conflicts, setConflicts] = useState<ConflictEvent[]>([]);
	const [isOnline, setIsOnline] = useState(true);

	// Set up real-time sync event listeners
	useEffect(() => {
		const handleTaskSyncEvent = (event: SyncEvent) => {
			setLocalSyncEvents((prev) => [event, ...prev.slice(0, 9)]); // Keep last 10 events

			// Trigger data refetch when sync events occur
			if (event.table === "tasks") {
				refetchTasks();
			}
		};

		// Add listener for all task events
		electricDb.addSyncEventListener("tasks", handleTaskSyncEvent);

		// Monitor connection state
		const handleStateChange = (state: { connection: string; sync: string }) => {
			setIsOnline(state.connection === "connected");
		};

		electricDb.addStateListener(handleStateChange);

		return () => {
			electricDb.removeSyncEventListener("tasks", handleTaskSyncEvent);
			electricDb.removeStateListener(handleStateChange);
		};
	}, [refetchTasks]);

	// Subscribe to real-time updates for tasks table
	useEffect(() => {
		const subscribeToTasks = async () => {
			if (electricDb.isReady()) {
				try {
					const filters = userId ? { user_id: userId } : undefined;
					await electricDb.subscribeToTable("tasks", filters);
				} catch (error) {
					console.warn("Failed to subscribe to tasks table:", error);
				}
			}
		};

		subscribeToTasks();
	}, [userId]);

	// Create a new task with real-time sync
	const createTask = useCallback(
		async (taskData: Omit<NewTask, "id" | "createdAt" | "updatedAt">) => {
			const newTask: NewTask = {
				...taskData,
				userId: userId || taskData.userId,
			};

			try {
				// Use ElectricSQL client for real-time sync
				const result = await electricDb.executeRealtimeOperation(
					"tasks",
					"insert",
					newTask,
					true,
				);

				console.log("✅ Task created with real-time sync:", result);
				return result;
			} catch (error) {
				console.error("❌ Failed to create task:", error);

				// If online but operation failed, still try to refetch
				if (isOnline) {
					await refetchTasks();
				}

				throw error;
			}
		},
		[userId, refetchTasks, isOnline],
	);

	// Update a task with real-time sync and conflict resolution
	const updateTask = useCallback(
		async (taskId: string, updates: Partial<Task>) => {
			const updateData = {
				...updates,
				id: taskId,
				updatedAt: new Date(),
			};

			try {
				// Use ElectricSQL client for real-time sync
				const result = await electricDb.executeRealtimeOperation(
					"tasks",
					"update",
					updateData,
					true,
				);

				console.log("✅ Task updated with real-time sync:", result);
				return result;
			} catch (error) {
				console.error("❌ Failed to update task:", error);

				// If online but operation failed, still try to refetch
				if (isOnline) {
					await refetchTasks();
				}

				throw error;
			}
		},
		[refetchTasks, isOnline],
	);

	// Delete a task with real-time sync
	const deleteTask = useCallback(
		async (taskId: string) => {
			try {
				// Use ElectricSQL client for real-time sync
				const result = await electricDb.executeRealtimeOperation(
					"tasks",
					"delete",
					{ id: taskId },
					true,
				);

				console.log("✅ Task deleted with real-time sync:", result);
				return result;
			} catch (error) {
				console.error("❌ Failed to delete task:", error);

				// If online but operation failed, still try to refetch
				if (isOnline) {
					await refetchTasks();
				}

				throw error;
			}
		},
		[refetchTasks, isOnline],
	);

	// Batch update multiple tasks
	const batchUpdateTasks = useCallback(
		async (updates: Array<{ id: string; updates: Partial<Task> }>) => {
			const results = [];

			for (const { id, updates: taskUpdates } of updates) {
				try {
					const result = await updateTask(id, taskUpdates);
					results.push({ id, result, success: true });
				} catch (error) {
					results.push({ id, error, success: false });
				}
			}

			return results;
		},
		[updateTask],
	);

	// Optimistic task update (immediate UI update, sync later)
	const optimisticUpdateTask = useCallback(
		async (taskId: string, updates: Partial<Task>) => {
			// Immediately update local state for better UX
			const optimisticTask = { ...updates, id: taskId, updatedAt: new Date() };

			// Emit optimistic sync event
			setLocalSyncEvents((prev) => [
				{
					type: "update",
					table: "tasks",
					record: optimisticTask,
					timestamp: new Date(),
					userId,
				},
				...prev.slice(0, 9),
			]);

			// Perform actual update in background
			try {
				await updateTask(taskId, updates);
			} catch (error) {
				// Revert optimistic update on failure
				console.warn("Optimistic update failed, reverting:", error);
				await refetchTasks();
			}
		},
		[updateTask, refetchTasks, userId],
	);

	// Get tasks by status
	const getTasksByStatus = useCallback(
		(status: string) => {
			return finalTasks.filter((task) => task.status === status);
		},
		[finalTasks],
	);

	// Get tasks by priority
	const getTasksByPriority = useCallback(
		(priority: string) => {
			return finalTasks.filter((task) => task.priority === priority);
		},
		[finalTasks],
	);

	// Search tasks
	const searchTasks = useCallback(
		(query: string) => {
			const lowercaseQuery = query.toLowerCase();
			return finalTasks.filter(
				(task) =>
					task.title.toLowerCase().includes(lowercaseQuery) ||
					task.description?.toLowerCase().includes(lowercaseQuery),
			);
		},
		[finalTasks],
	);

	// Get task statistics
	const taskStats = useMemo(() => {
		const stats = {
			total: finalTasks.length,
			pending: 0,
			inProgress: 0,
			completed: 0,
			cancelled: 0,
			byPriority: {
				high: 0,
				medium: 0,
				low: 0,
			},
		};

		finalTasks.forEach((task) => {
			// Count by status
			switch (task.status) {
				case "pending":
					stats.pending++;
					break;
				case "in_progress":
					stats.inProgress++;
					break;
				case "completed":
					stats.completed++;
					break;
				case "cancelled":
					stats.cancelled++;
					break;
			}

			// Count by priority
			switch (task.priority) {
				case "high":
					stats.byPriority.high++;
					break;
				case "medium":
					stats.byPriority.medium++;
					break;
				case "low":
					stats.byPriority.low++;
					break;
			}
		});

		return stats;
	}, [finalTasks]);

	// Get sync and conflict statistics
	const syncStats = useMemo(() => {
		const realtimeStats = electricDb.getRealtimeStats();
		return {
			...realtimeStats,
			recentEvents: localSyncEvents.length,
			conflicts: conflicts.length,
			lastSyncEvent: localSyncEvents[0]?.timestamp,
		};
	}, [localSyncEvents, conflicts]);

	return {
		// Data
		tasks: finalTasks,
		taskStats,
		syncStats,

		// Real-time state
		isOnline,
		syncEvents: localSyncEvents.slice(0, 5), // Return last 5 events
		conflicts,

		// Loading states
		loading: tasksLoading || realtimeLoading,
		error: tasksError || realtimeError,

		// Actions
		createTask,
		updateTask,
		deleteTask,
		batchUpdateTasks,
		optimisticUpdateTask,
		refetch: refetchTasks,

		// Utilities
		getTasksByStatus,
		getTasksByPriority,
		searchTasks,

		// Real-time utilities
		manualSync: () => electricDb.sync(),
		forceRefresh: async () => {
			await refetchTasks();
			setLocalSyncEvents([]);
		},
	};
}

// Hook for managing task executions with real-time sync
export function useElectricTaskExecutions(taskId?: string) {
	// Query for task executions
	const executionsQuery = useMemo(() => {
		if (!taskId)
			return "SELECT * FROM agent_executions ORDER BY started_at DESC";
		return "SELECT * FROM agent_executions WHERE task_id = $1 ORDER BY started_at DESC";
	}, [taskId]);

	const executionsParams = useMemo(() => {
		return taskId ? [taskId] : [];
	}, [taskId]);

	// Get executions with real-time updates
	const {
		data: executions,
		loading: executionsLoading,
		error: executionsError,
		refetch: refetchExecutions,
	} = useElectricQuery(executionsQuery, executionsParams, {
		enabled: true,
	});

	// Subscribe to real-time execution updates
	const executionSubscriptionFilter = taskId
		? `task_id = '${taskId}'`
		: undefined;

	const {
		data: realtimeExecutions,
		loading: realtimeExecLoading,
		error: realtimeExecError,
	} = useElectricSubscription("agent_executions", executionSubscriptionFilter, {
		enabled: true,
		onInsert: (execution) => {
			console.log("New execution started:", execution.agentType);
		},
		onUpdate: (execution) => {
			console.log("Execution updated:", execution.agentType, execution.status);
		},
	});

	// Use subscription data if available, otherwise use query data
	const finalExecutions =
		realtimeExecutions.length > 0 ? realtimeExecutions : executions;

	// Get execution statistics
	const executionStats = useMemo(() => {
		const stats = {
			total: finalExecutions.length,
			running: 0,
			completed: 0,
			failed: 0,
			cancelled: 0,
			averageExecutionTime: 0,
			byAgentType: {} as Record<string, number>,
		};

		let totalExecutionTime = 0;
		let completedCount = 0;

		finalExecutions.forEach((execution) => {
			// Count by status
			switch (execution.status) {
				case "running":
					stats.running++;
					break;
				case "completed":
					stats.completed++;
					completedCount++;
					if (execution.executionTimeMs) {
						totalExecutionTime += execution.executionTimeMs;
					}
					break;
				case "failed":
					stats.failed++;
					break;
				case "cancelled":
					stats.cancelled++;
					break;
			}

			// Count by agent type
			stats.byAgentType[execution.agentType] =
				(stats.byAgentType[execution.agentType] || 0) + 1;
		});

		// Calculate average execution time
		if (completedCount > 0) {
			stats.averageExecutionTime = Math.round(
				totalExecutionTime / completedCount,
			);
		}

		return stats;
	}, [finalExecutions]);

	return {
		// Data
		executions: finalExecutions,
		executionStats,

		// Loading states
		loading: executionsLoading || realtimeExecLoading,
		error: executionsError || realtimeExecError,

		// Actions
		refetch: refetchExecutions,
	};
}

// Enhanced hook for managing environments with real-time sync
export function useElectricEnvironments(userId?: string) {
	// Use the new subscription system for real-time updates
	const {
		environments: subscriptionEnvironments,
		loading: subscriptionLoading,
		error: subscriptionError,
		subscriptionActive,
		syncEvents,
		refetch: refetchEnvironments,
	} = useEnvironmentsSubscription(userId);

	// Fallback query for when subscription is not active
	const environmentsQuery = useMemo(() => {
		if (!userId) return "SELECT * FROM environments ORDER BY created_at DESC";
		return "SELECT * FROM environments WHERE user_id = $1 ORDER BY created_at DESC";
	}, [userId]);

	const environmentsParams = useMemo(() => {
		return userId ? [userId] : [];
	}, [userId]);

	// Fallback query when subscription is not available
	const {
		data: fallbackEnvironments,
		loading: fallbackLoading,
		error: fallbackError,
	} = useElectricQuery<Environment>(environmentsQuery, environmentsParams, {
		enabled: !subscriptionActive,
		refetchInterval: 30_000,
	});

	// Use subscription data when available, fallback otherwise
	const environments = subscriptionActive
		? subscriptionEnvironments
		: fallbackEnvironments || [];
	const environmentsLoading = subscriptionActive
		? subscriptionLoading
		: fallbackLoading;
	const environmentsError = subscriptionActive
		? subscriptionError
		: fallbackError;

	// Subscribe to real-time environment updates
	const envSubscriptionFilter = userId ? `user_id = '${userId}'` : undefined;

	const {
		data: realtimeEnvironments,
		loading: realtimeEnvLoading,
		error: realtimeEnvError,
	} = useElectricSubscription("environments", envSubscriptionFilter, {
		enabled: true,
		onInsert: (environment) => {
			console.log("New environment created:", environment.name);
		},
		onUpdate: (environment) => {
			console.log("Environment updated:", environment.name);
		},
		onDelete: (environment) => {
			console.log("Environment deleted:", environment.name);
		},
	});

	// Use subscription data if available, otherwise use query data
	const finalEnvironments =
		realtimeEnvironments.length > 0 ? realtimeEnvironments : environments;

	// State for sync events
	const [envSyncEvents, setEnvSyncEvents] = useState<SyncEvent[]>([]);
	const [isOnline, setIsOnline] = useState(true);

	// Set up real-time sync event listeners for environments
	useEffect(() => {
		const handleEnvironmentSyncEvent = (event: SyncEvent) => {
			setEnvSyncEvents((prev) => [event, ...prev.slice(0, 9)]); // Keep last 10 events

			// Trigger data refetch when sync events occur
			if (event.table === "environments") {
				refetchEnvironments();
			}
		};

		// Add listener for environment events
		electricDb.addSyncEventListener("environments", handleEnvironmentSyncEvent);

		// Monitor connection state
		const handleStateChange = (state: { connection: string; sync: string }) => {
			setIsOnline(state.connection === "connected");
		};

		electricDb.addStateListener(handleStateChange);

		return () => {
			electricDb.removeSyncEventListener(
				"environments",
				handleEnvironmentSyncEvent,
			);
			electricDb.removeStateListener(handleStateChange);
		};
	}, [refetchEnvironments]);

	// Subscribe to real-time updates for environments table
	useEffect(() => {
		const subscribeToEnvironments = async () => {
			if (electricDb.isReady()) {
				try {
					const filters = userId ? { user_id: userId } : undefined;
					await electricDb.subscribeToTable("environments", filters);
				} catch (error) {
					console.warn("Failed to subscribe to environments table:", error);
				}
			}
		};

		subscribeToEnvironments();
	}, [userId]);

	// Get active environment
	const activeEnvironment = useMemo(() => {
		return finalEnvironments.find((env) => env.isActive);
	}, [finalEnvironments]);

	// Create a new environment with real-time sync
	const createEnvironment = useCallback(
		async (environmentData: any) => {
			const newEnvironment = {
				...environmentData,
				userId: userId || environmentData.userId,
			};

			try {
				// Use ElectricSQL client for real-time sync
				const result = await electricDb.executeRealtimeOperation(
					"environments",
					"insert",
					newEnvironment,
					true,
				);

				console.log("✅ Environment created with real-time sync:", result);
				return result;
			} catch (error) {
				console.error("❌ Failed to create environment:", error);

				// If online but operation failed, still try to refetch
				if (isOnline) {
					await refetchEnvironments();
				}

				throw error;
			}
		},
		[userId, refetchEnvironments, isOnline],
	);

	// Update an environment with real-time sync
	const updateEnvironment = useCallback(
		async (environmentId: string, updates: any) => {
			const updateData = {
				...updates,
				id: environmentId,
				updatedAt: new Date(),
			};

			try {
				// Use ElectricSQL client for real-time sync
				const result = await electricDb.executeRealtimeOperation(
					"environments",
					"update",
					updateData,
					true,
				);

				console.log("✅ Environment updated with real-time sync:", result);
				return result;
			} catch (error) {
				console.error("❌ Failed to update environment:", error);

				// If online but operation failed, still try to refetch
				if (isOnline) {
					await refetchEnvironments();
				}

				throw error;
			}
		},
		[refetchEnvironments, isOnline],
	);

	// Delete an environment with real-time sync
	const deleteEnvironment = useCallback(
		async (environmentId: string) => {
			try {
				// Use ElectricSQL client for real-time sync
				const result = await electricDb.executeRealtimeOperation(
					"environments",
					"delete",
					{ id: environmentId },
					true,
				);

				console.log("✅ Environment deleted with real-time sync:", result);
				return result;
			} catch (error) {
				console.error("❌ Failed to delete environment:", error);

				// If online but operation failed, still try to refetch
				if (isOnline) {
					await refetchEnvironments();
				}

				throw error;
			}
		},
		[refetchEnvironments, isOnline],
	);

	// Activate an environment with batch operations
	const activateEnvironment = useCallback(
		async (environmentId: string) => {
			try {
				// First deactivate all environments for this user
				const deactivatePromises = finalEnvironments
					.filter((env) => env.isActive && env.id !== environmentId)
					.map((env) => updateEnvironment(env.id, { isActive: false }));

				await Promise.all(deactivatePromises);

				// Then activate the selected environment
				await updateEnvironment(environmentId, { isActive: true });

				console.log("✅ Environment activated:", environmentId);
			} catch (error) {
				console.error("❌ Failed to activate environment:", error);
				throw error;
			}
		},
		[finalEnvironments, updateEnvironment],
	);

	return {
		// Data
		environments: finalEnvironments,
		activeEnvironment,

		// Real-time state
		isOnline,
		syncEvents: envSyncEvents.slice(0, 5), // Return last 5 events

		// Loading states
		loading: environmentsLoading || realtimeEnvLoading,
		error: environmentsError || realtimeEnvError,

		// Actions
		createEnvironment,
		updateEnvironment,
		deleteEnvironment,
		activateEnvironment,
		refetch: refetchEnvironments,

		// Real-time utilities
		manualSync: () => electricDb.sync(),
		forceRefresh: async () => {
			await refetchEnvironments();
			setEnvSyncEvents([]);
		},
	};
}
