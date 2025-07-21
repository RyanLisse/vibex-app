/**
 * ElectricSQL Conflict Resolution and Offline Sync
 *
 * Provides robust conflict resolution strategies and offline sync capabilities
 * with proper error handling and data consistency guarantees.
 */

import { ObservabilityService } from "@/lib/observability";
	type DatabaseOperation,
	electricDatabaseClient
} from "./database-client";

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
	strategy:
		| "last-write-wins"
		| "user-priority"
		| "field-merge"
		| "server-wins"
		| "manual";
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

export class ConflictResolutionService {
	private static instance: ConflictResolutionService;
	private observability = ObservabilityService.getInstance();
	private offlineQueue: Map<string, OfflineOperation> = new Map();
	private conflictResolvers: Map<
		string,
		(conflict: ConflictData) => Promise<ConflictResolution>
	> = new Map();
	private isOnline = true;
	private syncInProgress = false;

	private constructor() {
		this.setupDefaultResolvers();
		this.setupOnlineStatusMonitoring();
	}

	static getInstance(): ConflictResolutionService {
		if (!ConflictResolutionService.instance) {
ConflictResolutionService.instance = new ConflictResolutionService();
		}
		return ConflictResolutionService.instance;
	}

	/**
	 * Execute operation with offline support and conflict resolution
	 */
	async executeOperationWithConflictResolution(
		operation: DatabaseOperation,
		options: {
			conflictStrategy?:
				| "last-write-wins"
				| "user-priority"
				| "field-merge"
				| "server-wins";
			offlineSupport?: boolean;
			maxRetries?: number;
		} = {},
	): Promise<any> {
		const {
			conflictStrategy = "last-write-wins",
			offlineSupport = true,
			maxRetries = 3,
		} = options;

		return this.observability.trackOperation(
			"conflict-resolution.execute",
			async () => {
				// If offline and offline support is enabled, queue the operation
				if (!this.isOnline && offlineSupport) {
					return this.queueOfflineOperation(operation, maxRetries);
				}

				try {
					// Check for potential conflicts before executing
					if (operation.operation === "update") {
						const conflict = await this.detectConflict(operation);
						if (conflict) {
							const resolution = await this.resolveConflict(
								conflict,
								conflictStrategy,
							);
							operation.data = resolution.resolvedData;
						}
					}

					// Execute the operation
					const result =
						await electricDatabaseClient.executeOperation(operation);

					if (!result.success) {
						throw new Error(result.error || "Operation failed");
					}

					return result.data;
				} catch (error) {
					// If operation fails and offline support is enabled, queue it
					if (offlineSupport) {
						console.warn("Operation failed, queuing for offline sync:", error);
						return this.queueOfflineOperation(operation, maxRetries);
					}
					throw error;
				}
			},
		);
	}

	/**
	 * Detect conflicts for update operations
	 */
	async detectConflict(
		operation: DatabaseOperation,
	): Promise<ConflictData | null> {
		if (
			operation.operation !== "update" ||
			!operation.data ||
			!operation.where?.id
		) {
			return null;
		}

		try {
			// Get current version from database
			const currentResult = await electricDatabaseClient.executeOperation({
				table: operation.table,
				operation: "select",
				where: { id: operation.where.id },
				options: operation.options,
			});

			if (
				!(currentResult.success && currentResult.data) ||
				currentResult.data.length === 0
			) {
				return null; // Record doesn't exist, no conflict
			}

			const currentRecord = currentResult.data[0];
			const updateData = operation.data;

			// Check if there are conflicting fields
			const conflictFields = this.findConflictingFields(
				currentRecord,
				updateData,
			);

			if (conflictFields.length === 0) {
				return null; // No conflicts
			}

			// Check timestamps to determine if this is actually a conflict
			const currentUpdatedAt = new Date(currentRecord.updatedAt);
			const localUpdatedAt = updateData.updatedAt
				? new Date(updateData.updatedAt)
				: new Date();

			if (currentUpdatedAt > localUpdatedAt) {
				return {
					table: operation.table,
					recordId: operation.where.id,
					localVersion: updateData,
					remoteVersion: currentRecord,
					conflictFields,
					timestamp: new Date(),
					userId: operation.options?.userId,
				};
			}

			return null;
		} catch (error) {
			console.error("Conflict detection failed:", error);
			return null;
		}
	}

	/**
	 * Resolve conflicts using specified strategy
	 */
	async resolveConflict(
		conflict: ConflictData,
		strategy: string,
	): Promise<ConflictResolution> {
		return this.observability.trackOperation(
			"conflict-resolution.resolve",
			async () => {
				const resolver = this.conflictResolvers.get(strategy);

				if (!resolver) {
					throw new Error(`Unknown conflict resolution strategy: ${strategy}`);
				}

				const resolution = await resolver(conflict);

				// Log the conflict resolution
				await this.logConflictResolution(conflict, resolution);

				return resolution;
			},
		);
	}

	/**
	 * Queue operation for offline sync
	 */
	async queueOfflineOperation(
		operation: DatabaseOperation,
		maxRetries = 3,
	): Promise<string> {
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

		// Persist to Redis for durability
		await this.persistOfflineQueue();

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

		return this.observability.trackOperation(
			"conflict-resolution.sync",
			async () => {
				const result: SyncResult = {
					success: true,
					operationsProcessed: 0,
					operationsFailed: 0,
					conflictsResolved: 0,
					errors: [],
				};

				try {
					// Load offline queue from Redis
					await this.loadOfflineQueue();

					const pendingOperations = Array.from(this.offlineQueue.values())
						.filter((op) => op.status === "pending" || op.status === "failed")
						.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

					for (const offlineOp of pendingOperations) {
						try {
							offlineOp.status = "syncing";

							// Check for conflicts
							let conflictResolved = false;
							if (offlineOp.operation.operation === "update") {
								const conflict = await this.detectConflict(offlineOp.operation);
								if (conflict) {
									const resolution = await this.resolveConflict(
										conflict,
										"last-write-wins",
									);
									offlineOp.operation.data = resolution.resolvedData;
									conflictResolved = true;
									result.conflictsResolved++;
								}
							}

							// Execute the operation
							const operationResult =
								await electricDatabaseClient.executeOperation(
									offlineOp.operation,
								);

							if (operationResult.success) {
								offlineOp.status = "completed";
								result.operationsProcessed++;
							} else {
								throw new Error(operationResult.error || "Operation failed");
							}
						} catch (error) {
							offlineOp.retryCount++;
							offlineOp.error =
								error instanceof Error ? error.message : "Unknown error";

							if (offlineOp.retryCount >= offlineOp.maxRetries) {
								offlineOp.status = "failed";
								result.operationsFailed++;
								result.errors.push(
									`Operation ${offlineOp.id} failed: ${offlineOp.error}`,
								);
							} else {
								offlineOp.status = "pending";
							}
						}
					}

					// Clean up completed operations
					this.cleanupCompletedOperations();

					// Persist updated queue
					await this.persistOfflineQueue();

					result.success = result.operationsFailed === 0;

					console.log(
						`Offline sync completed: ${result.operationsProcessed} processed, ${result.operationsFailed} failed`,
					);

					return result;
				} finally {
					this.syncInProgress = false;
				}
			},
		);
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
			pendingOperations: operations.filter((op) => op.status === "pending")
				.length,
			failedOperations: operations.filter((op) => op.status === "failed")
				.length,
			completedOperations: operations.filter((op) => op.status === "completed")
				.length,
		};
	}

	/**
	 * Clear offline queue
	 */
	async clearOfflineQueue(): Promise<void> {
		this.offlineQueue.clear();
		await this.persistOfflineQueue();
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
				const resolvedData = useLocal
					? conflict.localVersion
					: conflict.remoteVersion;

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
			},
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
			},
		);

		// Field-merge resolver
		this.conflictResolvers.set(
			"field-merge",
			async (conflict: ConflictData): Promise<ConflictResolution> => {
				const merged = { ...conflict.remoteVersion };

				// Merge non-conflicting fields from local version
				for (const [key, value] of Object.entries(conflict.localVersion)) {
					if (!conflict.conflictFields.includes(key)) {
						merged[key] = value;
					}
				}

				return {
					strategy: "field-merge",
					resolvedData: merged,
					metadata: {
						resolvedBy: "system",
						resolvedAt: new Date(),
						strategy: "field-merge",
						conflictId: `conflict_${Date.now()}`,
					},
				};
			},
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
	 * Find conflicting fields between two records
	 */
	private findConflictingFields(current: any, update: any): string[] {
		const conflicts: string[] = [];

		for (const [key, value] of Object.entries(update)) {
			if (key === "id" || key === "createdAt") continue; // Skip immutable fields

			if (current[key] !== undefined && current[key] !== value) {
				conflicts.push(key);
			}
		}

		return conflicts;
	}

	/**
	 * Log conflict resolution for debugging
	 */
	private async logConflictResolution(
		conflict: ConflictData,
		resolution: ConflictResolution,
	): Promise<void> {
		try {
			const redis = await this.getRedisCache();
			if (!redis) return;

			const logEntry = {
				conflict,
				resolution,
				timestamp: new Date(),
			};

			const logKey = `electric:conflicts:${conflict.table}:${resolution.metadata.conflictId}`;
			await redis.set(logKey, logEntry, { ttl: 86_400 * 7 }); // Keep for 7 days
		} catch (error) {
			console.warn("Failed to log conflict resolution:", error);
		}
	}

	/**
	 * Persist offline queue to Redis
	 */
	private async persistOfflineQueue(): Promise<void> {
		try {
			const redis = await this.getRedisCache();
			if (!redis) return;

			const queueData = Array.from(this.offlineQueue.entries());
			await redis.set("electric:offline-queue", queueData, {
				ttl: 86_400 * 30,
			}); // Keep for 30 days
		} catch (error) {
			console.warn("Failed to persist offline queue:", error);
		}
	}

	/**
	 * Load offline queue from Redis
	 */
	private async loadOfflineQueue(): Promise<void> {
		try {
			const redis = await this.getRedisCache();
			if (!redis) return;

			const queueData = await redis.get<Array<[string, OfflineOperation]>>(
				"electric:offline-queue",
			);
			if (queueData) {
				this.offlineQueue = new Map(queueData);
			}
		} catch (error) {
			console.warn("Failed to load offline queue:", error);
		}
	}

	/**
	 * Clean up completed operations
	 */
	private cleanupCompletedOperations(): void {
		const cutoffTime = new Date(Date.now() - 86_400 * 1000); // 1 day ago

		for (const [id, operation] of this.offlineQueue.entries()) {
			if (
				operation.status === "completed" &&
				operation.timestamp < cutoffTime
			) {
				this.offlineQueue.delete(id);
			}
		}
	}

	/**
	 * Get Redis cache instance (lazy-loaded)
	 */
	private async getRedisCache() {
		try {
			const { redisCache } = await import("@/lib/redis");
			return redisCache;
		} catch (error) {
			console.warn("Redis not available:", error);
			return null;
		}
	}
}

// Export singleton instance
export const conflictResolutionService =