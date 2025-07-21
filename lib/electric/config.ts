// Note: ElectricConfig type will be available when @electric-sql/client is properly installed
// For now, we'll define our own comprehensive interface
interface ElectricConfig {
	url?: string;
	debug?: boolean;
	timeout?: number;
	connectionTimeout?: number;
	heartbeatInterval?: number;
	auth?: {
		token?: string;
		endpoint?: string;
		refreshToken?: string;
		expiresAt?: number;
	};
	sync?: {
		enabled?: boolean;
		interval?: number;
		batchSize?: number;
		retryAttempts?: number;
		maxRetries?: number;
		retryBackoff?: number;
		conflictResolution?: "last-write-wins" | "user-priority" | "field-merge";
	};
	offline?: {
		enabled?: boolean;
		maxQueueSize?: number;
		persistQueue?: boolean;
		retryInterval?: number;
		storage?: "indexeddb" | "memory";
	};
	realtime?: {
		enabled?: boolean;
		heartbeatInterval?: number;
		reconnectAttempts?: number;
	};
	conflictResolution?: {
		strategy?: "last-write-wins" | "user-priority" | "field-merge";
		detectConflicts?: boolean;
		logConflicts?: boolean;
		userPriorityMap?: Record<string, number>;
	};
}

// Re-export pgliteConfig from simple-config
export { pgliteConfig } from "./simple-config";

// ElectricSQL configuration
export const electricConfig: ElectricConfig = {
	// Database connection URL - will be set from environment
	url: process.env.ELECTRIC_URL || process.env.DATABASE_URL || "",

	// Authentication configuration
	auth: {
		// JWT token for authentication
		token: process.env.ELECTRIC_AUTH_TOKEN || "",
		// Optional: custom auth endpoint
		endpoint: process.env.ELECTRIC_AUTH_ENDPOINT,
	},

	// Sync configuration
	sync: {
		// Enable real-time sync
		enabled: true,
		// Sync interval in milliseconds (default: 1000ms)
		interval: Number.parseInt(process.env.ELECTRIC_SYNC_INTERVAL || "1000"),
		// Maximum retry attempts for failed syncs
		maxRetries: Number.parseInt(process.env.ELECTRIC_MAX_RETRIES || "3"),
		// Retry backoff multiplier
		retryBackoff: Number.parseInt(process.env.ELECTRIC_RETRY_BACKOFF || "1000"),
	},

	// Offline configuration
	offline: {
		// Enable offline support
		enabled: true,
		// Maximum offline queue size
		maxQueueSize: Number.parseInt(
			process.env.ELECTRIC_MAX_QUEUE_SIZE || "1000",
		),
		// Offline storage type
		storage: "indexeddb", // or 'memory' for testing
	},

	// Conflict resolution strategy
	conflictResolution: {
		// Use last-write-wins with conflict detection
		strategy: "last-write-wins",
		// Enable conflict detection and logging
		detectConflicts: true,
		// Log conflicts for debugging
		logConflicts: process.env.NODE_ENV === "development",
	},

	// Debug configuration
	debug: process.env.NODE_ENV === "development",

	// Connection timeout in milliseconds
	connectionTimeout: Number.parseInt(
		process.env.ELECTRIC_CONNECTION_TIMEOUT || "10000",
	),

	// Heartbeat interval for connection health
	heartbeatInterval: Number.parseInt(
		process.env.ELECTRIC_HEARTBEAT_INTERVAL || "30000",
	),
};

// Validate configuration
export function validateElectricConfig(): void {
	if (!electricConfig.url) {
		throw new Error(
			"ElectricSQL URL is required. Set ELECTRIC_URL or DATABASE_URL environment variable.",
		);
	}

	if (electricConfig.sync?.interval && electricConfig.sync.interval < 100) {
		console.warn(
			"ElectricSQL sync interval is very low (<100ms). This may impact performance.",
		);
	}

	if (
		electricConfig.offline?.maxQueueSize &&
		electricConfig.offline.maxQueueSize > 10_000
	) {
		console.warn(
			"ElectricSQL offline queue size is very large (>10000). This may impact memory usage.",
		);
	}
}

// Environment-specific configurations
export const getEnvironmentConfig = (): Partial<ElectricConfig> => {
	const env = process.env.NODE_ENV || "development";

	switch (env) {
		case "production":
			return {
				debug: false,
				sync: {
					...electricConfig.sync,
					interval: 2000, // Slower sync in production
				},
				offline: {
					...electricConfig.offline,
					maxQueueSize: 5000, // Larger queue for production
				},
			};

		case "test":
			return {
				debug: false,
				sync: {
					...electricConfig.sync,
					enabled: false, // Disable sync in tests
				},
				offline: {
					...electricConfig.offline,
					storage: "memory", // Use memory storage for tests
				},
			};

		default: // development
			return {
				debug: true,
				sync: {
					...electricConfig.sync,
					interval: 500, // Faster sync in development
				},
			};
	}
};

// Merge environment-specific config with base config
export const getFinalConfig = (): ElectricConfig => {
	const envConfig = getEnvironmentConfig();
	return {
		...electricConfig,
		...envConfig,
		sync: {
			...electricConfig.sync,
			...envConfig.sync,
		},
		offline: {
			...electricConfig.offline,
			...envConfig.offline,
		},
	};
};

// Export SyncEvent type
export interface SyncEvent {
	type: "insert" | "update" | "delete" | "sync";
	table: string;
	record?: any;
	timestamp: Date;
	userId?: string;
}

// Real ElectricDB implementation that integrates all services
class ElectricDB {
	private stateListeners = new Set<
		(state: { connection: string; sync: string }) => void
	>();
	private syncEventListeners = new Map<
		string,
		Set<(event: SyncEvent) => void>
	>();
	private realtimeStats = {
		totalOperations: 0,
		pendingOperations: 0,
		successfulOperations: 0,
		failedOperations: 0,
	};

	isReady(): boolean {
		return true; // Always ready for now
	}

	initialize = async (): Promise<void> => {
		try {
			// Initialize real-time sync service
			const { realtimeSyncService } = await import("./realtime-sync");
			const { electricAuthService } = await import("./auth");

			const authToken = electricAuthService.getAuthToken();
			await realtimeSyncService.initialize(authToken || undefined);

			console.log("✅ ElectricDB initialized with real-time sync");
		} catch (error) {
			console.warn(
				"⚠️ Failed to initialize real-time sync, using fallback mode:",
				error,
			);
		}
	};

	addSyncEventListener(
		table: string,
		handler: (event: SyncEvent) => void,
	): void {
		if (!this.syncEventListeners.has(table)) {
			this.syncEventListeners.set(table, new Set());
		}
		this.syncEventListeners.get(table)!.add(handler);
	}

	removeSyncEventListener(
		table: string,
		handler: (event: SyncEvent) => void,
	): void {
		const listeners = this.syncEventListeners.get(table);
		if (listeners) {
			listeners.delete(handler);
			if (listeners.size === 0) {
				this.syncEventListeners.delete(table);
			}
		}
	}

	addStateListener(
		handler: (state: { connection: string; sync: string }) => void,
	): void {
		this.stateListeners.add(handler);
	}

	removeStateListener(
		handler: (state: { connection: string; sync: string }) => void,
	): void {
		this.stateListeners.delete(handler);
	}

	async getConnectionState(): Promise<string> {
		try {
			const { realtimeSyncService } = await import("./realtime-sync");
			const status = realtimeSyncService.getConnectionStatus();
			return status.isConnected ? "connected" : "disconnected";
		} catch {
			return "disconnected";
		}
	}

	async getSyncState(): Promise<string> {
		try {
			const { conflictResolutionService } = await import(
				"./conflict-resolution"
			);
			const queueStatus = conflictResolutionService.getOfflineQueueStatus();
			return queueStatus.pendingOperations > 0 ? "syncing" : "idle";
		} catch {
			return "idle";
		}
	}

	async subscribeToTable(table: string, filters?: any): Promise<() => void> {
		try {
			const { realtimeSyncService } = await import("./realtime-sync");

			return realtimeSyncService.subscribeToTable(
				table,
				(event) => {
					// Notify local listeners
					const listeners = this.syncEventListeners.get(table);
					if (listeners) {
						listeners.forEach((handler) => {
							try {
								handler(event);
							} catch (error) {
								console.error("Sync event listener error:", error);
							}
						});
					}
				},
				filters,
			);
		} catch (error) {
			console.error("Failed to subscribe to table:", error);
			return () => {}; // Return no-op unsubscribe
		}
	}

	async executeRealtimeOperation(
		table: string,
		operation: string,
		data: any,
		realtime = true,
	): Promise<any> {
		try {
			this.realtimeStats.totalOperations++;
			this.realtimeStats.pendingOperations++;

			// Execute through database client
			const { electricDatabaseClient } = await import("./database-client");
			const result = await electricDatabaseClient.executeOperation({
				table,
				operation: operation as any,
				data,
				options: { realtime },
			});

			if (result.success) {
				this.realtimeStats.successfulOperations++;

				// Send to real-time sync if enabled
				if (realtime) {
					try {
						const { realtimeSyncService } = await import("./realtime-sync");
						await realtimeSyncService.sendUpdate(
							table,
							operation,
							result.data,
							data.userId,
						);
					} catch (error) {
						console.warn("Failed to send real-time update:", error);
					}
				}

				return result.data;
			}
			this.realtimeStats.failedOperations++;
			throw new Error(result.error || "Operation failed");
		} catch (error) {
			this.realtimeStats.failedOperations++;
			throw error;
		} finally {
			this.realtimeStats.pendingOperations--;
		}
	}

	getRealtimeStats() {
		return { ...this.realtimeStats };
	}

	async sync(): Promise<void> {
		try {
			const { conflictResolutionService } = await import(
				"./conflict-resolution"
			);
			await conflictResolutionService.processOfflineQueue();

			// Notify state listeners
			await this.notifyStateListeners();
		} catch (error) {
			console.error("Sync failed:", error);
			throw error;
		}
	}

	async getStats(): Promise<{ pendingChanges: number }> {
		try {
			const { conflictResolutionService } = await import(
				"./conflict-resolution"
			);
			const queueStatus = conflictResolutionService.getOfflineQueueStatus();
			return {
				pendingChanges: queueStatus.pendingOperations,
			};
		} catch {
			return { pendingChanges: 0 };
		}
	}

	private async notifyStateListeners(): Promise<void> {
		const state = {
			connection: await this.getConnectionState(),
			sync: await this.getSyncState(),
		};

		this.stateListeners.forEach((handler) => {
			try {
				handler(state);
			} catch (error) {
				console.error("State listener error:", error);
			}
		});
	}
}

// Export singleton instance
export const electricDb = new ElectricDB();
