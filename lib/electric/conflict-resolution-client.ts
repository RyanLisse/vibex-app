/**
 * Client-side Conflict Resolution Service
 *
 * This is a client-safe version of the conflict resolution service that doesn't
 * import server-side Redis dependencies. It provides the same interface but
 * uses browser-compatible storage and operations.
 */

import { ObservabilityService } from "@/lib/observability";
import type { DatabaseOperation } from "./database-client";

export interface ConflictData {
	table: string;
	recordId: string;
	localVersion: any;
	remoteVersion: any;
	conflictFields: string[];
	timestamp: Date;
	userId?: string;
}

export interface ConflictResolution {
	strategy: "last-write-wins" | "user-priority" | "field-merge" | "server-wins" | "manual";
	resolvedData: any;
	metadata: {
		resolvedBy: string;
		resolvedAt: Date;
		strategy: string;
		conflictId: string;
	};
}

export interface OfflineOperation {
	id: string;
	operation: DatabaseOperation;
	timestamp: Date;
	retryCount: number;
	maxRetries: number;
	status: "pending" | "syncing" | "completed" | "failed";
	error?: string;
}

export interface SyncResult {
	success: boolean;
	operationsProcessed: number;
	operationsFailed: number;
	conflictsResolved: number;
	errors: string[];
}

export class ClientConflictResolutionService {
	private static instance: ClientConflictResolutionService;
	private observability = ObservabilityService.getInstance();
	private offlineQueue: Map<string, OfflineOperation> = new Map();
	private conflictResolvers: Map<string, (conflict: ConflictData) => Promise<ConflictResolution>> =
		new Map();
	private isOnline = true;
	private syncInProgress = false;

	private constructor() {
		this.setupDefaultResolvers();
		this.setupOnlineStatusMonitoring();
	}

	static getInstance(): ClientConflictResolutionService {
		if (!ClientConflictResolutionService.instance) {
			ClientConflictResolutionService.instance = new ClientConflictResolutionService();
		}
		return ClientConflictResolutionService.instance;
	}

	/**
	 * Execute operation with offline support and conflict resolution
	 * Client-side version that doesn't use Redis
	 */
	async executeOperationWithConflictResolution(
		operation: DatabaseOperation,
		options: {
			conflictStrategy?: "last-write-wins" | "user-priority" | "field-merge" | "server-wins";
			offlineSupport?: boolean;
			maxRetries?: number;
		} = {}
	): Promise<any> {
		const { conflictStrategy = "last-write-wins", offlineSupport = true, maxRetries = 3 } = options;

		return this.observability.trackOperation("client-conflict-resolution.execute", async () => {
			// If offline and offline support is enabled, queue the operation
			if (!this.isOnline && offlineSupport) {
				return this.queueOfflineOperation(operation, maxRetries);
			}

			try {
				// For client-side, we'll make a simple API call instead of direct database access
				const response = await fetch("/api/database/execute", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						operation,
						conflictStrategy,
					}),
				});

				if (!response.ok) {
					throw new Error(`API call failed: ${response.statusText}`);
				}

				const result = await response.json();
				return result.data;
			} catch (error) {
				// If operation fails and offline support is enabled, queue it
				if (offlineSupport) {
					console.warn("Operation failed, queuing for offline sync:", error);
					return this.queueOfflineOperation(operation, maxRetries);
				}
				throw error;
			}
		});
	}

	/**
	 * Queue operation for offline sync using localStorage instead of Redis
	 */
	async queueOfflineOperation(operation: DatabaseOperation, maxRetries = 3): Promise<string> {
		const operationId = `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

		const offlineOp: OfflineOperation = {
			id: operationId,
			operation,
			timestamp: new Date(),
			retryCount: 0,
			maxRetries,
			status: "pending",
		};

		this.offlineQueue.set(operationId, offlineOp);

		// Persist to localStorage instead of Redis
		await this.persistOfflineQueueToLocalStorage();

		console.log(`Operation queued for offline sync: ${operationId}`);
		return operationId;
	}

	/**
	 * Process offline queue when coming back online
	 */
	async processOfflineQueue(): Promise<SyncResult> {
		if (this.syncInProgress) {
			throw new Error("Sync already in progress");
		}

		this.syncInProgress = true;

		return this.observability.trackOperation("client-conflict-resolution.sync", async () => {
			const result: SyncResult = {
				success: true,
				operationsProcessed: 0,
				operationsFailed: 0,
				conflictsResolved: 0,
				errors: [],
			};

			try {
				// Load offline queue from localStorage
				await this.loadOfflineQueueFromLocalStorage();

				const pendingOperations = Array.from(this.offlineQueue.values())
					.filter((op) => op.status === "pending" || op.status === "failed")
					.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

				for (const offlineOp of pendingOperations) {
					try {
						offlineOp.status = "syncing";

						// Execute the operation via API
						const response = await fetch("/api/database/execute", {
							method: "POST",
							headers: {
								"Content-Type": "application/json",
							},
							body: JSON.stringify({
								operation: offlineOp.operation,
								conflictStrategy: "last-write-wins",
							}),
						});

						if (response.ok) {
							offlineOp.status = "completed";
							result.operationsProcessed++;
						} else {
							throw new Error(`API call failed: ${response.statusText}`);
						}
					} catch (error) {
						offlineOp.retryCount++;
						offlineOp.error = error instanceof Error ? error.message : "Unknown error";

						if (offlineOp.retryCount >= offlineOp.maxRetries) {
							offlineOp.status = "failed";
							result.operationsFailed++;
							result.errors.push(`Operation ${offlineOp.id} failed: ${offlineOp.error}`);
						} else {
							offlineOp.status = "pending";
						}
					}
				}

				// Clean up completed operations
				this.cleanupCompletedOperations();

				// Persist updated queue
				await this.persistOfflineQueueToLocalStorage();

				result.success = result.operationsFailed === 0;

				console.log(
					`Offline sync completed: ${result.operationsProcessed} processed, ${result.operationsFailed} failed`
				);

				return result;
			} finally {
				this.syncInProgress = false;
			}
		});
	}

	/**
	 * Get offline queue status
	 */
	getOfflineQueueStatus(): {
		totalOperations: number;
		pendingOperations: number;
		failedOperations: number;
		completedOperations: number;
	} {
		const operations = Array.from(this.offlineQueue.values());

		return {
			totalOperations: operations.length,
			pendingOperations: operations.filter((op) => op.status === "pending").length,
			failedOperations: operations.filter((op) => op.status === "failed").length,
			completedOperations: operations.filter((op) => op.status === "completed").length,
		};
	}

	/**
	 * Clear offline queue
	 */
	async clearOfflineQueue(): Promise<void> {
		this.offlineQueue.clear();
		await this.persistOfflineQueueToLocalStorage();
	}

	/**
	 * Get online status
	 */
	isOnlineStatus(): boolean {
		return this.isOnline;
	}

	/**
	 * Setup default conflict resolvers
	 */
	private setupDefaultResolvers(): void {
		// Last-write-wins resolver
		this.conflictResolvers.set(
			"last-write-wins",
			async (conflict: ConflictData): Promise<ConflictResolution> => {
				const localTime = conflict.localVersion.updatedAt
					? new Date(conflict.localVersion.updatedAt)
					: new Date();
				const remoteTime = new Date(conflict.remoteVersion.updatedAt);

				const useLocal = localTime >= remoteTime;
				const resolvedData = useLocal ? conflict.localVersion : conflict.remoteVersion;

				return {
					strategy: "last-write-wins",
					resolvedData,
					metadata: {
						resolvedBy: "system",
						resolvedAt: new Date(),
						strategy: "last-write-wins",
						conflictId: `conflict_${Date.now()}`,
					},
				};
			}
		);

		// Server-wins resolver
		this.conflictResolvers.set(
			"server-wins",
			async (conflict: ConflictData): Promise<ConflictResolution> => {
				return {
					strategy: "server-wins",
					resolvedData: conflict.remoteVersion,
					metadata: {
						resolvedBy: "system",
						resolvedAt: new Date(),
						strategy: "server-wins",
						conflictId: `conflict_${Date.now()}`,
					},
				};
			}
		);
	}

	/**
	 * Setup online status monitoring
	 */
	private setupOnlineStatusMonitoring(): void {
		if (typeof window !== "undefined") {
			// Browser environment
			this.isOnline = navigator.onLine;

			window.addEventListener("online", () => {
				this.isOnline = true;
				console.log("Connection restored, processing offline queue...");
				this.processOfflineQueue().catch((error) => {
					console.error("Failed to process offline queue:", error);
				});
			});

			window.addEventListener("offline", () => {
				this.isOnline = false;
				console.log("Connection lost, enabling offline mode");
			});
		} else {
			// Server environment - assume always online
			this.isOnline = true;
		}
	}

	/**
	 * Persist offline queue to localStorage instead of Redis
	 */
	private async persistOfflineQueueToLocalStorage(): Promise<void> {
		try {
			if (typeof window !== "undefined") {
				const queueData = Array.from(this.offlineQueue.entries());
				localStorage.setItem("electric:offline-queue", JSON.stringify(queueData));
			}
		} catch (error) {
			console.warn("Failed to persist offline queue to localStorage:", error);
		}
	}

	/**
	 * Load offline queue from localStorage instead of Redis
	 */
	private async loadOfflineQueueFromLocalStorage(): Promise<void> {
		try {
			if (typeof window !== "undefined") {
				const queueDataStr = localStorage.getItem("electric:offline-queue");
				if (queueDataStr) {
					const queueData = JSON.parse(queueDataStr);
					this.offlineQueue = new Map(queueData);
				}
			}
		} catch (error) {
			console.warn("Failed to load offline queue from localStorage:", error);
		}
	}

	/**
	 * Clean up completed operations
	 */
	private cleanupCompletedOperations(): void {
		const cutoffTime = new Date(Date.now() - 86_400 * 1000); // 1 day ago

		for (const [id, operation] of this.offlineQueue.entries()) {
			if (operation.status === "completed" && operation.timestamp < cutoffTime) {
				this.offlineQueue.delete(id);
			}
		}
	}
}

// Export singleton instance
export const clientConflictResolutionService = ClientConflictResolutionService.getInstance();
