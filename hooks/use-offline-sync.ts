"use client";

import { useCallback, useEffect, useState } from "react";
import { electricDb } from "@/lib/electric/config";
import { useElectric } from "./use-electric";

interface OfflineOperation {
	id: string;
	type: "insert" | "update" | "delete";
	table: string;
	data: Record<string, unknown>;
	timestamp: Date;
	retries: number;
	maxRetries: number;
	userId?: string;
}

interface OfflineStats {
	queueSize: number;
	pendingOperations: number;
	failedOperations: number;
	lastSyncTime: Date | null;
	isOnline: boolean;
	syncInProgress: boolean;
}

/**
 * Hook for managing offline-first functionality with sync resume
 */
export function useOfflineSync() {
	const { isConnected, isInitialized } = useElectric();
	const [isOnline, setIsOnline] = useState(navigator.onLine);
	const [offlineQueue, setOfflineQueue] = useState<OfflineOperation[]>([]);
	const [syncInProgress, setSyncInProgress] = useState(false);
	const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
	const [syncErrors, setSyncErrors] = useState<string[]>([]);

	// Monitor online/offline status
	useEffect(() => {
		const handleOnline = () => {
			setIsOnline(true);
			console.log("🌐 Connection restored - resuming sync");
		};

		const handleOffline = () => {
			setIsOnline(false);
			console.log("📴 Connection lost - entering offline mode");
		};

		window.addEventListener("online", handleOnline);
		window.addEventListener("offline", handleOffline);

		return () => {
			window.removeEventListener("online", handleOnline);
			window.removeEventListener("offline", handleOffline);
		};
	}, []);

	// Load offline queue from localStorage on mount
	useEffect(() => {
		const loadOfflineQueue = () => {
			try {
				const stored = localStorage.getItem("electric_offline_queue");
				if (stored) {
					const queue = JSON.parse(stored) as OfflineOperation[];
					setOfflineQueue(
						queue.map((op) => ({
							...op,
							timestamp: new Date(op.timestamp),
						})),
					);
				}
			} catch (error) {
				console.error("Failed to load offline queue:", error);
			}
		};

		loadOfflineQueue();
	}, []);

	// Save offline queue to localStorage whenever it changes
	useEffect(() => {
		try {
			localStorage.setItem(
				"electric_offline_queue",
				JSON.stringify(offlineQueue),
			);
		} catch (error) {
			console.error("Failed to save offline queue:", error);
		}
	}, [offlineQueue]);

	// Queue an operation for offline processing
	const queueOperation = useCallback(
		(
			type: "insert" | "update" | "delete",
			table: string,
			data: Record<string, unknown>,
			userId?: string,
		) => {
			const operation: OfflineOperation = {
				id: `${table}-${type}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
				type,
				table,
				data,
				timestamp: new Date(),
				retries: 0,
				maxRetries: 3,
				userId,
			};

			setOfflineQueue((prev) => [...prev, operation]);
			console.log(`📝 Queued offline operation: ${type} on ${table}`);

			return operation.id;
		},
		[],
	);

	// Execute a single operation
	const executeOperation = useCallback(
		async (operation: OfflineOperation): Promise<boolean> => {
			try {
				const result = await electricDb.executeRealtimeOperation(
					operation.table,
					operation.type,
					operation.data,
					false, // Don't use optimistic updates for queued operations
				);

				console.log(
					`✅ Executed queued operation: ${operation.type} on ${operation.table}`,
				);
				return true;
			} catch (error) {
				console.error(`❌ Failed to execute operation ${operation.id}:`, error);
				return false;
			}
		},
		[],
	);

	// Process the offline queue
	const processOfflineQueue = useCallback(async () => {
		if (!(isOnline && isConnected && isInitialized) || syncInProgress) {
			return;
		}

		if (offlineQueue.length === 0) {
			return;
		}

		setSyncInProgress(true);
		setSyncErrors([]);

		console.log(`🔄 Processing ${offlineQueue.length} offline operations`);

		const processedOperations: string[] = [];
		const failedOperations: OfflineOperation[] = [];

		for (const operation of offlineQueue) {
			const success = await executeOperation(operation);

			if (success) {
				processedOperations.push(operation.id);
			} else {
				// Retry logic
				if (operation.retries < operation.maxRetries) {
					failedOperations.push({
						...operation,
						retries: operation.retries + 1,
					});
				} else {
					setSyncErrors((prev) => [
						...prev,
						`Failed to sync ${operation.type} on ${operation.table} after ${operation.maxRetries} retries`,
					]);
				}
			}
		}

		// Update queue - remove processed operations, keep failed ones for retry
		setOfflineQueue(failedOperations);
		setLastSyncTime(new Date());
		setSyncInProgress(false);

		console.log(
			`✅ Processed ${processedOperations.length} operations, ${failedOperations.length} failed`,
		);
	}, [
		isOnline,
		isConnected,
		isInitialized,
		syncInProgress,
		offlineQueue,
		executeOperation,
	]);

	// Auto-sync when coming back online
	useEffect(() => {
		if (isOnline && isConnected && isInitialized && offlineQueue.length > 0) {
			// Delay sync slightly to ensure connection is stable
			const timer = setTimeout(processOfflineQueue, 1000);
			return () => clearTimeout(timer);
		}
	}, [
		isOnline,
		isConnected,
		isInitialized,
		offlineQueue.length,
		processOfflineQueue,
	]);

	// Manual sync trigger
	const manualSync = useCallback(async () => {
		if (!isOnline) {
			throw new Error("Cannot sync while offline");
		}

		await processOfflineQueue();
	}, [isOnline, processOfflineQueue]);

	// Clear the offline queue (for testing or manual cleanup)
	const clearQueue = useCallback(() => {
		setOfflineQueue([]);
		setSyncErrors([]);
		localStorage.removeItem("electric_offline_queue");
	}, []);

	// Get offline statistics
	const getStats = useCallback((): OfflineStats => {
		const pendingOperations = offlineQueue.filter(
			(op) => op.retries < op.maxRetries,
		).length;
		const failedOperations = offlineQueue.filter(
			(op) => op.retries >= op.maxRetries,
		).length;

		return {
			queueSize: offlineQueue.length,
			pendingOperations,
			failedOperations,
			lastSyncTime,
			isOnline: isOnline && isConnected,
			syncInProgress,
		};
	}, [offlineQueue, lastSyncTime, isOnline, isConnected, syncInProgress]);

	// Test offline functionality
	const testOfflineMode = useCallback(async () => {
		console.log("🧪 Testing offline functionality...");

		// Queue some test operations
		const testOperations = [
			{
				type: "insert" as const,
				table: "tasks",
				data: { title: "Offline Test Task", status: "pending" },
			},
			{
				type: "update" as const,
				table: "tasks",
				data: { id: "test-id", title: "Updated Offline Task" },
			},
		];

		for (const op of testOperations) {
			queueOperation(op.type, op.table, op.data);
		}

		console.log(`📝 Queued ${testOperations.length} test operations`);

		// If online, try to process them
		if (isOnline && isConnected) {
			await processOfflineQueue();
		}
	}, [queueOperation, processOfflineQueue, isOnline, isConnected]);

	return {
		// State
		isOnline: isOnline && isConnected,
		isOffline: !(isOnline && isConnected),
		syncInProgress,
		lastSyncTime,
		syncErrors,

		// Queue management
		queueOperation,
		manualSync,
		clearQueue,

		// Statistics
		getStats,
		offlineQueue: offlineQueue.length,

		// Testing
		testOfflineMode,
	};
}
