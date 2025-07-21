"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import React, { type ReactNode, useEffect, useState } from "react";
import { wasmDetector } from "@/lib/wasm/detection";

// Create a client
const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			staleTime: 60 * 1000, // 1 minute
			gcTime: 10 * 60 * 1000, // 10 minutes
		},
	},
});

interface QueryProviderProps {
	children: ReactNode;
	enableDevtools?: boolean;
}

export function QueryProvider({
	children,
	enableDevtools = process.env.NODE_ENV === "development",
}: QueryProviderProps) {
	const [isWASMInitialized, setIsWASMInitialized] = useState(false);

	// Initialize WASM detection on mount
	useEffect(() => {
		const initializeWASM = async () => {
			try {
				await wasmDetector.detectCapabilities();
				setIsWASMInitialized(true);

				if (process.env.NODE_ENV === "development") {
					console.log(
						"WASM Capabilities:",
						wasmDetector.getCapabilitiesSummary(),
					);
				}
			} catch (error) {
				console.warn("WASM initialization failed:", error);
				setIsWASMInitialized(true); // Continue without WASM
			}
		};

		initializeWASM();
	}, []);

	return (
		<QueryClientProvider client={queryClient}>
			{children}
			{enableDevtools && <ReactQueryDevtools initialIsOpen={false} />}
		</QueryClientProvider>
	);
}

// Re-export enhanced query hooks
export {
	useEnhancedInfiniteQuery,
	useEnhancedMutation,
	useEnhancedQuery,
} from "@/hooks/use-enhanced-query";

/**
 * Query performance monitor component with memory leak fixes
 */
export const QueryPerformanceMonitor = React.memo(() => {
	const [stats, setStats] = useState({
		totalQueries: 0,
		successfulQueries: 0,
		failedQueries: 0,
		averageQueryTime: 0,
		wasmOptimizedQueries: 0,
	});

	useEffect(() => {
		if (process.env.NODE_ENV !== "development") return;

		// Monitor query performance with proper cleanup
		const cache = queryClient.getQueryCache();
		let isActive = true;

		const updateStats = () => {
			if (!isActive) return;

			try {
				const queries = cache.getAll();
				const totalQueries = queries.length;
				const successfulQueries = queries.filter(
					(q) => q.state.status === "success",
				).length;
				const failedQueries = queries.filter(
					(q) => q.state.status === "error",
				).length;
				const wasmOptimizedQueries = queries.filter((q) =>
					q.queryKey.some(
						(key) => typeof key === "string" && key.includes("wasm"),
					),
				).length;

				// Calculate average query time (simplified)
				const queryTimes = queries
					.filter((q) => q.state.dataUpdatedAt && q.state.dataUpdatedAt > 0)
					.map(
						(q) =>
							q.state.dataUpdatedAt -
							(q.state.fetchFailureReason?.timestamp || 0),
					)
					.filter((time) => time > 0);

				const averageQueryTime =
					queryTimes.length > 0
						? queryTimes.reduce((sum, time) => sum + time, 0) /
							queryTimes.length
						: 0;

				setStats({
					totalQueries,
					successfulQueries,
					failedQueries,
					averageQueryTime: Math.round(averageQueryTime),
					wasmOptimizedQueries,
				});
			} catch (error) {
				console.warn("Query performance monitoring error:", error);
			}
		};

		// Update stats every 5 seconds with cleanup
		const interval = setInterval(updateStats, 5000);
		updateStats(); // Initial update

		return () => {
			isActive = false;
			clearInterval(interval);
		};
	}, []);

	if (process.env.NODE_ENV !== "development") {
		return null;
	}

	return (
		<div className="fixed bottom-4 left-4 rounded-lg bg-black bg-opacity-80 p-3 font-mono text-white text-xs">
			<div className="mb-2 font-bold">Query Performance</div>
			<div>Total: {stats.totalQueries}</div>
			<div>Success: {stats.successfulQueries}</div>
			<div>Failed: {stats.failedQueries}</div>
			<div>Avg Time: {stats.averageQueryTime}ms</div>
			<div>WASM: {stats.wasmOptimizedQueries}</div>
		</div>
	);
});

/**
 * Query cache status component with memory leak fixes
 */
export const QueryCacheStatus = React.memo(() => {
	const [cacheStats, setCacheStats] = useState({
		size: 0,
		staleQueries: 0,
		fetchingQueries: 0,
	});

	useEffect(() => {
		let isActive = true;

		const updateCacheStats = () => {
			if (!isActive) return;

			try {
				const cache = queryClient.getQueryCache();
				const queries = cache.getAll();

				setCacheStats({
					size: queries.length,
					staleQueries: queries.filter((q) => q.isStale()).length,
					fetchingQueries: queries.filter((q) => q.isFetching()).length,
				});
			} catch (error) {
				console.warn("Cache stats monitoring error:", error);
			}
		};

		const interval = setInterval(updateCacheStats, 2000);
		updateCacheStats();

		return () => {
			isActive = false;
			clearInterval(interval);
		};
	}, []);

	return (
		<div className="flex items-center space-x-4 text-gray-600 text-sm">
			<span>Cache: {cacheStats.size}</span>
			<span>Stale: {cacheStats.staleQueries}</span>
			<span>Fetching: {cacheStats.fetchingQueries}</span>
		</div>
	);
});

/**
 * WASM optimization status indicator with proper memoization
 */
export const WASMOptimizationStatus = React.memo(() => {
	const [capabilities, setCapabilities] = useState<string>("");

	useEffect(() => {
		if (process.env.NODE_ENV !== "development") return;

		let isMounted = true;

		const updateCapabilities = async () => {
			try {
				await wasmDetector.detectCapabilities();
				if (isMounted) {
					setCapabilities(wasmDetector.getCapabilitiesSummary());
				}
			} catch (error) {
				if (isMounted) {
					setCapabilities("WASM detection failed");
				}
			}
		};

		updateCapabilities();

		return () => {
			isMounted = false;
		};
	}, []);

	if (process.env.NODE_ENV !== "development") {
		return null;
	}

	return (
		<details className="fixed top-4 right-4 max-w-sm rounded-lg border bg-white p-3 text-xs shadow-lg">
			<summary className="cursor-pointer font-bold text-blue-600">
				WASM Status
			</summary>
			<pre className="mt-2 whitespace-pre-wrap text-gray-700">
				{capabilities}
			</pre>
		</details>
	);
});

/**
 * Query invalidation utilities component
 */
export function QueryInvalidationControls() {
	const handleInvalidateAll = () => {
		queryClient.invalidateQueries();
		console.log("Invalidated all queries");
	};

	const handleClearCache = () => {
		queryClient.clear();
		console.log("Cleared query cache");
	};

	const handleRefetchAll = () => {
		queryClient.refetchQueries();
		console.log("Refetching all queries");
	};

	if (process.env.NODE_ENV !== "development") {
		return null;
	}

	return (
		<div className="fixed right-4 bottom-4 rounded-lg border bg-white p-3 shadow-lg">
			<div className="mb-2 font-bold text-sm">Query Controls</div>
			<div className="space-y-2">
				<button
					className="block w-full rounded bg-yellow-100 px-2 py-1 text-left text-xs hover:bg-yellow-200"
					onClick={handleInvalidateAll}
				>
					Invalidate All
				</button>
				<button
					className="block w-full rounded bg-blue-100 px-2 py-1 text-left text-xs hover:bg-blue-200"
					onClick={handleRefetchAll}
				>
					Refetch All
				</button>
				<button
					className="block w-full rounded bg-red-100 px-2 py-1 text-left text-xs hover:bg-red-200"
					onClick={handleClearCache}
				>
					Clear Cache
				</button>
			</div>
		</div>
	);
}
