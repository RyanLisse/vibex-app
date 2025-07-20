"use client";

import type { Electric } from "@electric-sql/client";
import type { PGlite } from "@electric-sql/pglite";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";
import { db } from "@/db/config";
import { electricDb } from "@/lib/electric/config";

// Types for Electric state
export interface ElectricState {
	isInitialized: boolean;
	isConnected: boolean;
	isSyncing: boolean;
	connectionState: "disconnected" | "connecting" | "connected" | "error";
	syncState: "idle" | "syncing" | "error";
	error: Error | null;
}

// Enhanced sync event types
export interface SyncEvent {
	id: string;
	type: "insert" | "update" | "delete" | "conflict" | "sync_complete";
	table: string;
	record?: Record<string, unknown>;
	conflict?: {
		local: Record<string, unknown>;
		remote: Record<string, unknown>;
		resolved: Record<string, unknown>;
		strategy: "last-write-wins" | "manual" | "custom";
	};
	timestamp: Date;
	userId?: string;
	source: "local" | "remote" | "sync";
}

// Hook for managing ElectricSQL connection and state
export function useElectric() {
	const [state, setState] = useState<ElectricState>({
		isInitialized: false,
		isConnected: false,
		isSyncing: false,
		connectionState: "disconnected",
		syncState: "idle",
		error: null,
	});

	// Initialize Electric on mount
	useEffect(() => {
		let mounted = true;

		const initializeElectric = async () => {
			try {
				await electricDb.initialize();

				if (mounted) {
					setState((prev) => ({
						...prev,
						isInitialized: true,
						isConnected: electricDb.getConnectionState() === "connected",
						connectionState: electricDb.getConnectionState() as any,
						syncState: electricDb.getSyncState() as any,
						error: null,
					}));
				}
			} catch (error) {
				if (mounted) {
					setState((prev) => ({
						...prev,
						error: error as Error,
						connectionState: "error",
					}));
				}
			}
		};

		initializeElectric();

		return () => {
			mounted = false;
		};
	}, []);

	// Listen to state changes
	useEffect(() => {
		const handleStateChange = (newState: {
			connection: string;
			sync: string;
		}) => {
			setState((prev) => ({
				...prev,
				connectionState: newState.connection as any,
				syncState: newState.sync as any,
				isConnected: newState.connection === "connected",
				isSyncing: newState.sync === "syncing",
			}));
		};

		electricDb.addStateListener(handleStateChange);

		return () => {
			electricDb.removeStateListener(handleStateChange);
		};
	}, []);

	// Manual sync function
	const sync = useCallback(async () => {
		try {
			await electricDb.sync();
		} catch (error) {
			setState((prev) => ({
				...prev,
				error: error as Error,
			}));
			throw error;
		}
	}, []);

	// Get Electric client instance
	const getElectric = useCallback((): Electric | null => {
		return electricDb.getElectric();
	}, []);

	// Get PGlite instance
	const getPGlite = useCallback((): PGlite | null => {
		return electricDb.getPGlite();
	}, []);

	// Disconnect function
	const disconnect = useCallback(async () => {
		try {
			await electricDb.disconnect();
			setState((prev) => ({
				...prev,
				isInitialized: false,
				isConnected: false,
				connectionState: "disconnected",
				syncState: "idle",
			}));
		} catch (error) {
			setState((prev) => ({
				...prev,
				error: error as Error,
			}));
		}
	}, []);

	return {
		...state,
		sync,
		disconnect,
		getElectric,
		getPGlite,
	};
}

// Enhanced hook for real-time data subscriptions with Neon database integration
export function useElectricQuery<T = Record<string, unknown>>(
	query: string,
	params: unknown[] = [],
	options: {
		enabled?: boolean;
		refetchInterval?: number;
		onError?: (error: Error) => void;
		fallbackToServer?: boolean;
		syncMode?: "local-first" | "server-first" | "hybrid";
	} = {},
) {
	const { isConnected, getPGlite } = useElectric();
	const queryClient = useQueryClient();
	const [data, setData] = useState<T[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<Error | null>(null);
	const [syncEvents, setSyncEvents] = useState<SyncEvent[]>([]);

	const {
		enabled = true,
		refetchInterval,
		onError,
		fallbackToServer = true,
		syncMode = "hybrid",
	} = options;

	// Helper function to extract table name from query
	const extractTableFromQuery = useCallback((query: string): string => {
		const match = query.match(/FROM\s+(\w+)/i);
		return match ? match[1] : "unknown";
	}, []);

	// Helper function to execute server query
	const executeServerQuery = useCallback(
		async (query: string, params: unknown[]): Promise<T[]> => {
			// This would typically call your API endpoint that uses the Neon database
			const response = await fetch("/api/electric/query", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ query, params }),
			});

			if (!response.ok) {
				throw new Error(`Server query failed: ${response.statusText}`);
			}

			const result = await response.json();
			return result.data || [];
		},
		[],
	);

	// Execute query with enhanced sync logic
	const executeQuery = useCallback(async () => {
		if (!enabled) {
			return;
		}

		try {
			setLoading(true);
			setError(null);

			let result: T[] = [];

			// Try local-first approach
			if (syncMode === "local-first" || syncMode === "hybrid") {
				const pglite = getPGlite();
				if (pglite && isConnected) {
					try {
						const localResult = await pglite.query(query, params);
						result = localResult.rows as T[];

						// Add sync event
						setSyncEvents((prev) => [
							...prev.slice(-4),
							{
								id: crypto.randomUUID(),
								type: "sync_complete",
								table: extractTableFromQuery(query),
								timestamp: new Date(),
								source: "local",
							},
						]);
					} catch (localError) {
						console.warn(
							"Local query failed, falling back to server:",
							localError,
						);
					}
				}
			}

			// Fallback to server or server-first mode
			if (
				(result.length === 0 && fallbackToServer) ||
				syncMode === "server-first"
			) {
				try {
					// Use the server database as fallback
					const serverResult = await executeServerQuery(query, params);
					result = serverResult;

					// Add sync event
					setSyncEvents((prev) => [
						...prev.slice(-4),
						{
							id: crypto.randomUUID(),
							type: "sync_complete",
							table: extractTableFromQuery(query),
							timestamp: new Date(),
							source: "remote",
						},
					]);
				} catch (serverError) {
					throw new Error(
						`Both local and server queries failed: ${serverError}`,
					);
				}
			}

			setData(result);
		} catch (err) {
			const error = err as Error;
			setError(error);
			onError?.(error);
		} finally {
			setLoading(false);
		}
	}, [
		query,
		params,
		enabled,
		isConnected,
		getPGlite,
		onError,
		fallbackToServer,
		syncMode,
		extractTableFromQuery,
		executeServerQuery,
	]);

	// Execute query when dependencies change
	useEffect(() => {
		executeQuery();
	}, [executeQuery]);

	// Set up polling if refetchInterval is provided
	useEffect(() => {
		if (!(refetchInterval && enabled)) return;

		const interval = setInterval(executeQuery, refetchInterval);
		return () => clearInterval(interval);
	}, [executeQuery, refetchInterval, enabled]);

	// Refetch function
	const refetch = useCallback(() => {
		return executeQuery();
	}, [executeQuery]);

	return {
		data,
		loading,
		error,
		refetch,
		syncEvents,
		syncMode,
		isLocalFirst: syncMode === "local-first",
		isServerFirst: syncMode === "server-first",
		isHybrid: syncMode === "hybrid",
	};
}

// Enhanced hook for real-time subscriptions to specific tables with user filtering
export function useElectricSubscription<T = Record<string, unknown>>(
	tableName: string,
	options: {
		enabled?: boolean;
		userId?: string;
		filter?: string;
		onInsert?: (record: T) => void;
		onUpdate?: (record: T) => void;
		onDelete?: (record: T) => void;
		onError?: (error: Error) => void;
		onSyncEvent?: (event: SyncEvent) => void;
	} = {},
) {
	const { isConnected, getElectric, getPGlite } = useElectric();
	const queryClient = useQueryClient();
	const [data, setData] = useState<T[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<Error | null>(null);
	const [subscriptionActive, setSubscriptionActive] = useState(false);
	const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

	const {
		enabled = true,
		userId,
		filter,
		onInsert,
		onUpdate,
		onDelete,
		onError,
		onSyncEvent,
	} = options;

	// Build the filter query with user filtering
	const buildFilterQuery = useCallback(() => {
		const conditions: string[] = [];

		if (userId) {
			conditions.push(`user_id = '${userId}'`);
		}

		if (filter) {
			conditions.push(filter);
		}

		return conditions.length > 0 ? conditions.join(" AND ") : undefined;
	}, [userId, filter]);

	// Setup subscription effect
	useEffect(() => {
		if (!(enabled && isConnected)) {
			setSubscriptionActive(false);
			return;
		}

		const pglite = getPGlite();
		if (!pglite) {
			setSubscriptionActive(false);
			return;
		}

		const subscriptionCleanup: (() => void) | null = null;

		const setupSubscription = async () => {
			try {
				setLoading(true);
				setError(null);
				setSubscriptionActive(true);

				// Build the query with filters
				const filterQuery = buildFilterQuery();
				const query = filterQuery
					? `SELECT * FROM ${tableName} WHERE ${filterQuery} ORDER BY created_at DESC`
					: `SELECT * FROM ${tableName} ORDER BY created_at DESC`;

				// Initial data fetch from local database
				const result = await pglite.query(query);
				setData(result.rows as T[]);
				setLastSyncTime(new Date());

				// Set up real-time subscription
				subscription = electric.subscribe(tableName, {
					filter,
					onInsert: (record: T) => {
						setData((prev) => [...prev, record]);
						onInsert?.(record);
					},
					onUpdate: (record: T) => {
						setData((prev) =>
							prev.map((item) =>
								(item as any).id === (record as any).id ? record : item,
							),
						);
						onUpdate?.(record);
					},
					onDelete: (record: T) => {
						setData((prev) =>
							prev.filter((item) => (item as any).id !== (record as any).id),
						);
						onDelete?.(record);
					},
					onError: (err: Error) => {
						setError(err);
						onError?.(err);
					},
				});
			} catch (err) {
				const error = err as Error;
				setError(error);
				onError?.(error);
			} finally {
				setLoading(false);
			}
		};

		setupSubscription();

		return () => {
			if (subscription) {
				subscription.unsubscribe();
			}
		};
	}, [
		tableName,
		filter,
		enabled,
		isConnected,
		getElectric,
		onInsert,
		onUpdate,
		onDelete,
		onError,
	]);

	return {
		data,
		loading,
		error,
	};
}

// Hook for offline state management
export function useOfflineState() {
	const [isOnline, setIsOnline] = useState(
		typeof navigator !== "undefined" ? navigator.onLine : true,
	);
	const [pendingChanges, setPendingChanges] = useState(0);

	useEffect(() => {
		const handleOnline = () => setIsOnline(true);
		const handleOffline = () => setIsOnline(false);

		window.addEventListener("online", handleOnline);
		window.addEventListener("offline", handleOffline);

		return () => {
			window.removeEventListener("online", handleOnline);
			window.removeEventListener("offline", handleOffline);
		};
	}, []);

	// Get pending changes count from Electric
	useEffect(() => {
		const updatePendingChanges = async () => {
			try {
				const stats = await electricDb.getStats();
				setPendingChanges(stats.pendingChanges || 0);
			} catch (error) {
				console.warn("Failed to get pending changes count:", error);
			}
		};

		const interval = setInterval(updatePendingChanges, 5000);
		updatePendingChanges();

		return () => clearInterval(interval);
	}, []);

	return {
		isOnline,
		isOffline: !isOnline,
		pendingChanges,
		hasPendingChanges: pendingChanges > 0,
	};
}
