/**
 * Enhanced TanStack Query Provider with ElectricSQL Integration
 *
 * Provides a unified query client with automatic real-time cache invalidation
 * based on ElectricSQL database changes.
 */

"use client";

	QueryClient,
	QueryClientProvider,
	useQueryClient,
} from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
	createContext,
	type ReactNode,
	useContext,
	useEffect,
	useState,
} from "react";
import { observability } from "@/lib/observability";
	type ElectricBridgeConfig,
	electricQueryBridge,
} from "./electric-bridge";

export interface QueryProviderConfig {
	electricBridge?: Partial<ElectricBridgeConfig>;
	queryClient?: {
		defaultOptions?: {
			queries?: {
				staleTime?: number;
				gcTime?: number;
				refetchOnWindowFocus?: boolean;
				retry?: number;
			};
			mutations?: {
				retry?: number;
			};
		};
	};
	enableDevtools?: boolean;
	enableObservability?: boolean;
}

interface QueryProviderContextValue {
	queryClient: QueryClient;
	bridgeStats: {
		isActive: boolean;
		subscribedTables: string[];
		queuedInvalidations: number;
		connectionStatus: any;
	} | null;
	refreshBridgeStats: () => void;
}

const QueryProviderContext = createContext<QueryProviderContextValue | null>(
	null,
);

/**
 * Create a query client with optimized defaults for ElectricSQL integration
 */
function createQueryClient(
	config?: QueryProviderConfig["queryClient"],
): QueryClient {
	return new QueryClient({
		defaultOptions: {
			queries: {
				// Optimized for real-time updates
				staleTime: 1000 * 30, // 30 seconds
				gcTime: 1000 * 60 * 5, // 5 minutes
				refetchOnWindowFocus: false, // ElectricSQL handles real-time updates
				retry: 3,
				// Enable background refetch for better UX
				refetchOnMount: "always",
				refetchInterval: false, // Disable polling, use real-time updates
				...config?.defaultOptions?.queries,
			},
			mutations: {
				retry: 1,
				...config?.defaultOptions?.mutations,
			},
		},
	});
}

/**
 * Enhanced Query Provider with ElectricSQL integration
 */
export function QueryProvider({
	children,
	config = {},
}: {
	children: ReactNode;
	config?: QueryProviderConfig;
}) {
	const [queryClient] = useState(() => createQueryClient(config.queryClient));
	const [bridgeStats, setBridgeStats] =
		useState<QueryProviderContextValue["bridgeStats"]>(null);
	const [isInitialized, setIsInitialized] = useState(false);

	const refreshBridgeStats = () => {
		try {
			const stats = electricQueryBridge.getStats();
			setBridgeStats(stats);
		} catch (error) {
			console.error("Failed to get bridge stats:", error);
			setBridgeStats(null);
		}
	};

	useEffect(() => {
		let mounted = true;

		const initializeBridge = async () => {
			try {
				if (config.enableObservability !== false) {
					// Track query client initialization
					observability.recordEvent("query-provider.initialize", {
						hasElectricBridge: true,
						enableDevtools: config.enableDevtools,
					});
				}

				// Initialize ElectricSQL bridge
				await electricQueryBridge.initialize(queryClient);

				if (mounted) {
					setIsInitialized(true);
					refreshBridgeStats();

					// Set up periodic stats refresh
					const statsInterval = setInterval(refreshBridgeStats, 5000);

					return () => {
						clearInterval(statsInterval);
					};
				}
			} catch (error) {
				console.error("Failed to initialize ElectricSQL bridge:", error);
				if (config.enableObservability !== false) {
					observability.recordError(
						"query-provider.initialize",
						error as Error,
					);
				}
			}
		};

		initializeBridge();

		return () => {
			mounted = false;
		};
	}, [queryClient, config.enableObservability, config.enableDevtools]);

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			electricQueryBridge.cleanup().catch(console.error);
		};
	}, []);

	const contextValue: QueryProviderContextValue = {
		queryClient,
		bridgeStats,
		refreshBridgeStats,
	};

	return (
		<QueryProviderContext.Provider value={contextValue}>
			<QueryClientProvider client={queryClient}>
				{children}
				{config.enableDevtools !== false &&
					process.env.NODE_ENV === "development" && (
						<ReactQueryDevtools
							buttonPosition="bottom-left"
							initialIsOpen={false}
						/>
					)}
			</QueryClientProvider>
		</QueryProviderContext.Provider>
	);
}

/**
 * Hook to access query provider context
 */
export function useQueryProvider(): QueryProviderContextValue {
	const context = useContext(QueryProviderContext);
	if (!context) {
		throw new Error("useQueryProvider must be used within a QueryProvider");
	}
	return context;
}

/**
 * Hook to get ElectricSQL bridge statistics
 */
export function useElectricBridgeStats() {
	const { bridgeStats, refreshBridgeStats } = useQueryProvider();
	return { stats: bridgeStats, refresh: refreshBridgeStats };
}

/**
 * Hook to manually trigger cache invalidation for specific tables
 */
export function useTableInvalidation() {
	const queryClient = useQueryClient();

	return {
		invalidateTable: (tableName: string, data?: any[]) => {
			electricQueryBridge.invalidateTable(tableName, data);
		},
		invalidateAll: () => {
			queryClient.invalidateQueries();
		},
		refetchAll: () => {
			queryClient.refetchQueries();
		},
	};
}

/**
 * Hook for monitoring real-time connection status
 */
export function useElectricConnection() {
	const { bridgeStats } = useQueryProvider();
	const [connectionHealth, setConnectionHealth] = useState<
		"healthy" | "degraded" | "disconnected"
	>("disconnected");

	useEffect(() => {
		if (!bridgeStats?.connectionStatus) {
			setConnectionHealth("disconnected");
			return;
		}

		const { isConnected, syncStatus, offlineQueueSize } =
			bridgeStats.connectionStatus;

		if (!isConnected) {
			setConnectionHealth("disconnected");
		} else if (offlineQueueSize > 0 || syncStatus === "error") {
			setConnectionHealth("degraded");
		} else {
			setConnectionHealth("healthy");
		}
	}, [bridgeStats]);

	return {
		isConnected: bridgeStats?.connectionStatus?.isConnected ?? false,
		syncStatus: bridgeStats?.connectionStatus?.syncStatus ?? "disconnected",
		health: connectionHealth,
		offlineQueueSize: bridgeStats?.connectionStatus?.offlineQueueSize ?? 0,
		lastSyncTime: bridgeStats?.connectionStatus?.lastSyncTime,
		conflictCount: bridgeStats?.connectionStatus?.conflictCount ?? 0,
	};
}

/**
 * Development component to display real-time query and connection status
 */
export function QueryDevStatus() {
	const { stats } = useElectricBridgeStats();
	const connection = useElectricConnection();

	if (process.env.NODE_ENV !== "development") {
		return null;
	}

	const getHealthColor = (health: string) => {
		switch (health) {
			case "healthy":
				return "text-green-500";
			case "degraded":
				return "text-yellow-500";
			case "disconnected":
				return "text-red-500";
			default:
				return "text-gray-500";
		}
	};

	return (
		<div className="fixed right-4 bottom-4 max-w-sm rounded-lg border bg-white/90 p-3 text-xs shadow-lg backdrop-blur">
			<div className="mb-2 font-semibold">🔄 Query Bridge Status</div>

			<div className="space-y-1">
				<div
					className={`flex justify-between ${getHealthColor(connection.health)}`}
				>
					<span>Connection:</span>
					<span className="capitalize">{connection.health}</span>
				</div>

				<div className="flex justify-between">
					<span>Sync Status:</span>
					<span className="capitalize">{connection.syncStatus}</span>
				</div>

				{stats && (
					<>
						<div className="flex justify-between">
							<span>Subscriptions:</span>
							<span>{stats.subscribedTables.length}</span>
						</div>

						<div className="flex justify-between">
							<span>Pending Invalidations:</span>
							<span>{stats.queuedInvalidations}</span>
						</div>
					</>
				)}

				{connection.offlineQueueSize > 0 && (
					<div className="flex justify-between text-yellow-600">
						<span>Offline Queue:</span>
						<span>{connection.offlineQueueSize}</span>
					</div>
				)}

				{connection.conflictCount > 0 && (
					<div className="flex justify-between text-orange-600">
						<span>Conflicts:</span>
						<span>{connection.conflictCount}</span>
					</div>
				)}
			</div>

			{connection.lastSyncTime && (
				<div className="mt-1 text-gray-500 text-xs">
					Last sync: {connection.lastSyncTime.toLocaleTimeString()}
				</div>
			)}
		</div>
	);
}

/**
 * Utility function to set up the query provider with default configuration
 */
export function createQueryProviderConfig(
	overrides?: Partial<QueryProviderConfig>,
): QueryProviderConfig {
	return {
		enableDevtools: process.env.NODE_ENV === "development",
		enableObservability: true,
		electricBridge: {
			enableRealTimeInvalidation: true,
			batchInvalidationMs: 100,
			debugMode: process.env.NODE_ENV === "development",
			tableSubscriptions: [
				"tasks",
				"environments",
				"agentExecutions",
				"observabilityEvents",
				"agentMemory",
				"workflows",
				"workflowExecutions",
			],
		},
		queryClient: {
			defaultOptions: {
				queries: {
					staleTime: 1000 * 30, // 30 seconds
					gcTime: 1000 * 60 * 5, // 5 minutes
					refetchOnWindowFocus: false,
					retry: 3,
				},
				mutations: {
					retry: 1,
				},
			},
		},
		...overrides,
	};
}
