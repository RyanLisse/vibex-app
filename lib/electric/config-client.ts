/**
 * Client-side ElectricSQL Configuration
 *
 * This is a client-safe version of the electric config that doesn't import
 * server-side dependencies like Redis or Node.js modules.
 */

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

// ElectricSQL configuration for client-side
export const electricConfig: ElectricConfig = {
	// Database connection URL - will be set from environment
	url:
		process.env.NEXT_PUBLIC_ELECTRIC_URL ||
		process.env.NEXT_PUBLIC_DATABASE_URL ||
		"",

	// Authentication configuration
	auth: {
		// JWT token for authentication
		token: process.env.NEXT_PUBLIC_ELECTRIC_AUTH_TOKEN || "",
		// Optional: custom auth endpoint
		endpoint: process.env.NEXT_PUBLIC_ELECTRIC_AUTH_ENDPOINT,
	},

	// Sync configuration
	sync: {
		// Enable real-time sync
		enabled: true,
		// Sync interval in milliseconds (default: 1000ms)
		interval: Number.parseInt(
			process.env.NEXT_PUBLIC_ELECTRIC_SYNC_INTERVAL || "1000",
		),
		// Maximum retry attempts for failed syncs
		maxRetries: Number.parseInt(
			process.env.NEXT_PUBLIC_ELECTRIC_MAX_RETRIES || "3",
		),
		// Retry backoff multiplier
		retryBackoff: Number.parseInt(
			process.env.NEXT_PUBLIC_ELECTRIC_RETRY_BACKOFF || "1000",
		),
	},

	// Offline configuration
	offline: {
		// Enable offline support
		enabled: true,
		// Maximum offline queue size
		maxQueueSize: Number.parseInt(
			process.env.NEXT_PUBLIC_ELECTRIC_MAX_QUEUE_SIZE || "1000",
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
		process.env.NEXT_PUBLIC_ELECTRIC_CONNECTION_TIMEOUT || "10000",
	),

	// Heartbeat interval for connection health
	heartbeatInterval: Number.parseInt(
		process.env.NEXT_PUBLIC_ELECTRIC_HEARTBEAT_INTERVAL || "30000",
	),
};

// Validate configuration
export function validateElectricConfig(): void {
	if (!electricConfig.url) {
		console.warn(
			"ElectricSQL URL is not set. Set NEXT_PUBLIC_ELECTRIC_URL or NEXT_PUBLIC_DATABASE_URL environment variable.",
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

// Client-side ElectricDB implementation that doesn't use server-side dependencies
class ClientElectricDB {
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
			console.log("✅ Client ElectricDB initialized");
		} catch (error) {
			console.warn("⚠️ Failed to initialize client ElectricDB:", error);
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

	getConnectionState(): string {
		// For client-side, we'll check navigator.onLine
		return typeof window !== "undefined" && navigator.onLine
			? "connected"
			: "disconnected";
	}

	getSyncState(): string {
		return this.realtimeStats.pendingOperations > 0 ? "syncing" : "idle";
	}

	async subscribeToTable(table: string, filters?: any): Promise<() => void> {
		try {
			// For client-side, we'll use WebSocket or Server-Sent Events
			// This is a placeholder implementation
			console.log(`Subscribing to table: ${table}`, filters);
			return () => {
				console.log(`Unsubscribed from table: ${table}`);
			};
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

			// Execute through API instead of direct database access
			const response = await fetch("/api/database/execute", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					table,
					operation,
					data,
					realtime,
				}),
			});

			if (response.ok) {
				const result = await response.json();
				this.realtimeStats.successfulOperations++;
				return result.data;
			} else {
				throw new Error(`API call failed: ${response.statusText}`);
			}
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
			// For client-side, we'll trigger sync via API
			const response = await fetch("/api/database/sync", {
				method: "POST",
			});

			if (!response.ok) {
				throw new Error(`Sync failed: ${response.statusText}`);
			}

			// Notify state listeners
			this.notifyStateListeners();
		} catch (error) {
			console.error("Sync failed:", error);
			throw error;
		}
	}

	getStats() {
		return {
			pendingChanges: this.realtimeStats.pendingOperations,
		};
	}

	private notifyStateListeners(): void {
		const state = {
			connection: this.getConnectionState(),
			sync: this.getSyncState(),
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
export const electricDb = new ClientElectricDB();
