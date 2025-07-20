"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";
import type { Environment, Task } from "@/db/schema";
import { type SyncEvent, useElectric } from "./use-electric";

/**
 * Enhanced real-time subscription hook for tasks with user filtering
 */
export function useTasksSubscription(userId?: string) {
	const { isConnected, getPGlite } = useElectric();
	const queryClient = useQueryClient();
	const [tasks, setTasks] = useState<Task[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<Error | null>(null);
	const [subscriptionActive, setSubscriptionActive] = useState(false);
	const [syncEvents, setSyncEvents] = useState<SyncEvent[]>([]);

	// Fetch initial tasks data
	const fetchTasks = useCallback(async () => {
		const pglite = getPGlite();
		if (!pglite) return;

		try {
			setLoading(true);
			setError(null);

			const query = userId
				? "SELECT * FROM tasks WHERE user_id = $1 ORDER BY created_at DESC"
				: "SELECT * FROM tasks ORDER BY created_at DESC";

			const params = userId ? [userId] : [];
			const result = await pglite.query(query, params);

			setTasks(result.rows as Task[]);

			// Invalidate related TanStack Query cache
			queryClient.invalidateQueries({ queryKey: ["tasks"] });
		} catch (err) {
			const error = err as Error;
			setError(error);
			console.error("Failed to fetch tasks:", error);
		} finally {
			setLoading(false);
		}
	}, [userId, getPGlite, queryClient]);

	// Handle real-time sync events
	const handleSyncEvent = useCallback(
		(event: SyncEvent) => {
			if (event.table !== "tasks") return;

			// Filter events by user if userId is provided
			if (userId && event.userId !== userId) return;

			setSyncEvents((prev) => [...prev.slice(-4), event]);

			switch (event.type) {
				case "insert":
					if (event.record) {
						setTasks((prev) => [event.record as Task, ...prev]);
					}
					break;

				case "update":
					if (event.record) {
						setTasks((prev) =>
							prev.map((task) =>
								task.id === (event.record as Task).id
									? (event.record as Task)
									: task,
							),
						);
					}
					break;

				case "delete":
					if (event.record) {
						setTasks((prev) =>
							prev.filter((task) => task.id !== (event.record as Task).id),
						);
					}
					break;
			}

			// Invalidate TanStack Query cache on changes
			queryClient.invalidateQueries({ queryKey: ["tasks"] });
		},
		[userId, queryClient],
	);

	// Setup subscription
	useEffect(() => {
		if (!isConnected) {
			setSubscriptionActive(false);
			return;
		}

		setSubscriptionActive(true);

		// Initial fetch
		fetchTasks();

		// Setup real-time event listener using ElectricDB
		const { electricDb } = require("@/lib/electric/config");
		electricDb.addSyncEventListener("tasks", handleSyncEvent);

		// Subscribe to real-time updates
		let unsubscribeRealtime: (() => void) | null = null;
		electricDb
			.subscribeToTable("tasks", { user_id: userId })
			.then((unsub: () => void) => {
				unsubscribeRealtime = unsub;
			})
			.catch(console.error);

		// Fallback: periodic refetch for when real-time fails
		const interval = setInterval(fetchTasks, 60_000); // Refetch every 60 seconds as fallback

		return () => {
			clearInterval(interval);
			electricDb.removeSyncEventListener("tasks", handleSyncEvent);
			if (unsubscribeRealtime) {
				unsubscribeRealtime();
			}
			setSubscriptionActive(false);
		};
	}, [isConnected, fetchTasks]);

	return {
		tasks,
		loading,
		error,
		subscriptionActive,
		syncEvents,
		refetch: fetchTasks,
	};
}

/**
 * Enhanced real-time subscription hook for environments with user filtering
 */
export function useEnvironmentsSubscription(userId?: string) {
	const { isConnected, getPGlite } = useElectric();
	const queryClient = useQueryClient();
	const [environments, setEnvironments] = useState<Environment[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<Error | null>(null);
	const [subscriptionActive, setSubscriptionActive] = useState(false);
	const [syncEvents, setSyncEvents] = useState<SyncEvent[]>([]);

	// Fetch initial environments data
	const fetchEnvironments = useCallback(async () => {
		const pglite = getPGlite();
		if (!pglite) return;

		try {
			setLoading(true);
			setError(null);

			const query = userId
				? "SELECT * FROM environments WHERE user_id = $1 ORDER BY created_at DESC"
				: "SELECT * FROM environments ORDER BY created_at DESC";

			const params = userId ? [userId] : [];
			const result = await pglite.query(query, params);

			setEnvironments(result.rows as Environment[]);

			// Invalidate related TanStack Query cache
			queryClient.invalidateQueries({ queryKey: ["environments"] });
		} catch (err) {
			const error = err as Error;
			setError(error);
			console.error("Failed to fetch environments:", error);
		} finally {
			setLoading(false);
		}
	}, [userId, getPGlite, queryClient]);

	// Handle real-time sync events
	const handleSyncEvent = useCallback(
		(event: SyncEvent) => {
			if (event.table !== "environments") return;

			// Filter events by user if userId is provided
			if (userId && event.userId !== userId) return;

			setSyncEvents((prev) => [...prev.slice(-4), event]);

			switch (event.type) {
				case "insert":
					if (event.record) {
						setEnvironments((prev) => [event.record as Environment, ...prev]);
					}
					break;

				case "update":
					if (event.record) {
						setEnvironments((prev) =>
							prev.map((env) =>
								env.id === (event.record as Environment).id
									? (event.record as Environment)
									: env,
							),
						);
					}
					break;

				case "delete":
					if (event.record) {
						setEnvironments((prev) =>
							prev.filter((env) => env.id !== (event.record as Environment).id),
						);
					}
					break;
			}

			// Invalidate TanStack Query cache on changes
			queryClient.invalidateQueries({ queryKey: ["environments"] });
		},
		[userId, queryClient],
	);

	// Setup subscription
	useEffect(() => {
		if (!isConnected) {
			setSubscriptionActive(false);
			return;
		}

		setSubscriptionActive(true);

		// Initial fetch
		fetchEnvironments();

		// Setup real-time event listener using ElectricDB
		const { electricDb } = require("@/lib/electric/config");
		electricDb.addSyncEventListener("environments", handleSyncEvent);

		// Subscribe to real-time updates
		let unsubscribeRealtime: (() => void) | null = null;
		electricDb
			.subscribeToTable("environments", { user_id: userId })
			.then((unsub: () => void) => {
				unsubscribeRealtime = unsub;
			})
			.catch(console.error);

		// Fallback: periodic refetch for when real-time fails
		const interval = setInterval(fetchEnvironments, 60_000); // Refetch every 60 seconds as fallback

		return () => {
			clearInterval(interval);
			electricDb.removeSyncEventListener("environments", handleSyncEvent);
			if (unsubscribeRealtime) {
				unsubscribeRealtime();
			}
			setSubscriptionActive(false);
		};
	}, [isConnected, fetchEnvironments]);

	return {
		environments,
		loading,
		error,
		subscriptionActive,
		syncEvents,
		refetch: fetchEnvironments,
	};
}

/**
 * Combined subscription hook for both tasks and environments
 */
export function useElectricSubscriptions(userId?: string) {
	const tasksSubscription = useTasksSubscription(userId);
	const environmentsSubscription = useEnvironmentsSubscription(userId);

	return {
		tasks: tasksSubscription,
		environments: environmentsSubscription,
		isConnected:
			tasksSubscription.subscriptionActive &&
			environmentsSubscription.subscriptionActive,
		loading: tasksSubscription.loading || environmentsSubscription.loading,
		error: tasksSubscription.error || environmentsSubscription.error,
	};
}
