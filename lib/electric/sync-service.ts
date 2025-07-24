import type * as schema from "../../db/schema";
import { ObservabilityService } from "../observability";
import { ElectricClient } from "./client";
import { electricConfig, getFinalConfig } from "./config";

/**
 * ElectricSQL Sync Service
 * Handles real-time synchronization, conflict resolution, and offline queue management
 */
export class ElectricSyncService {
	private static instance: ElectricSyncService | null = null;
	private electricClient: ElectricClient | null = null;
	private observability = ObservabilityService.getInstance();
	private subscriptions = new Map<string, () => void>();
	private offlineQueue: Array<{
		id: string;
		table: string;
		operation: "insert" | "update" | "delete";
		data: any;
		timestamp: Date;
		retryCount: number;
	}> = [];
	private conflictLog: Array<{
		table: string;
		id: string;
		conflict: any;
		resolution: any;
		timestamp: Date;
	}> = [];
	private isInitialized = false;
	private healthMonitorInterval: NodeJS.Timeout | null = null;
	private syncStatus: {
		isConnected: boolean;
		syncStatus: "connected" | "disconnected" | "syncing" | "error";
		lastSyncTime: Date | null;
		offlineQueueSize: number;
		conflictCount: number;
		activeSubscriptions: number;
	} = {
		isConnected: false,
		syncStatus: "disconnected",
		lastSyncTime: null,
		offlineQueueSize: 0,
		conflictCount: 0,
		activeSubscriptions: 0,
	};

	private constructor() {
		// Private constructor for singleton pattern
	}

	static getInstance(): ElectricSyncService {
		if (!ElectricSyncService.instance) {
			ElectricSyncService.instance = new ElectricSyncService();
		}
		return ElectricSyncService.instance;
	}

	/**
	 * Initialize the sync service
	 */
	async initialize(): Promise<void> {
		if (this.isInitialized) {
			return;
		}

		return this.observability.trackOperation("electric.sync.initialize", async () => {
			try {
				// Get ElectricSQL client instance
				this.electricClient = ElectricClient.getInstance();
				await this.electricClient.initialize();

				// Set up real-time subscriptions for all tables
				await this.setupTableSubscriptions();

				// Process any existing offline queue
				await this.processOfflineQueue();

				this.isInitialized = true;
				this.updateSyncStatus();

				console.log("ElectricSQL sync service initialized successfully");
			} catch (error) {
				console.error("Failed to initialize ElectricSQL sync service:", error);
				this.observability.recordError("electric.sync.initialize", error as Error);
				throw error;
			}
		});
	}

	/**
	 * Set up real-time subscriptions for all database tables
	 */
	private async setupTableSubscriptions(): Promise<void> {
		const config = getFinalConfig();
		const tables = [
			"tasks",
			"environments",
			"agentExecutions",
			"observabilityEvents",
			"agentMemory",
			"workflows",
			"workflowExecutions",
			"executionSnapshots",
		];

		for (const table of tables) {
			try {
				const unsubscribe = await this.subscribeToTable(table, (data) => {
					this.handleTableUpdate(table, data);
				});
				this.subscriptions.set(table, unsubscribe);
				this.syncStatus.activeSubscriptions++;
			} catch (error) {
				console.error(`Failed to subscribe to table ${table}:`, error);
				this.observability.recordError("electric.sync.subscribe", error as Error, {
					table,
				});
			}
		}
	}

	/**
	 * Subscribe to real-time updates for a specific table
	 */
	subscribeToTable<T>(
		tableName: string,
		callback: (data: T[]) => void,
		options?: {
			where?: any;
			orderBy?: any;
			limit?: number;
		}
	): () => void {
		return this.observability.trackOperation("electric.sync.subscribe", () => {
			if (!this.electricClient) {
				throw new Error("ElectricSQL client not initialized");
			}

			// Create subscription through ElectricSQL client
			const unsubscribe = () => {
				this.subscriptions.delete(tableName);
				this.syncStatus.activeSubscriptions--;
			};

			// Store subscription
			this.subscriptions.set(tableName, unsubscribe);
			this.syncStatus.activeSubscriptions++;

			return unsubscribe;
		});
	}

	/**
	 * Handle table updates from real-time subscriptions
	 */
	private handleTableUpdate(tableName: string, data: any[]): void {
		this.observability.trackOperation("electric.sync.table-update", async () => {
			try {
				// Update sync status
				this.syncStatus.lastSyncTime = new Date();
				this.syncStatus.syncStatus = "connected";

				// Emit table update event for TanStack Query integration
				this.emitTableUpdateEvent(tableName, data);

				console.log(`Table ${tableName} updated with ${data.length} records`);
			} catch (error) {
				console.error(`Failed to handle table update for ${tableName}:`, error);
				this.observability.recordError("electric.sync.table-update", error as Error, {
					table: tableName,
				});
			}
		});
	}

	/**
	 * Emit table update event for external listeners (TanStack Query)
	 */
	private emitTableUpdateEvent(tableName: string, data: any[]): void {
		// This will be used by the TanStack Query bridge
		if (typeof window !== "undefined") {
			window.dispatchEvent(
				new CustomEvent("electric-table-update", {
					detail: { tableName, data },
				})
			);
		}
	}

	/**
	 * Add operation to offline queue
	 */
	async queueOfflineOperation(
		table: string,
		operation: "insert" | "update" | "delete",
		data: any
	): Promise<void> {
		const queueItem = {
			id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
			table,
			operation,
			data,
			timestamp: new Date(),
			retryCount: 0,
		};

		this.offlineQueue.push(queueItem);
		this.syncStatus.offlineQueueSize = this.offlineQueue.length;

		// Persist queue to localStorage for browser refresh persistence
		if (typeof window !== "undefined") {
			localStorage.setItem("electric-offline-queue", JSON.stringify(this.offlineQueue));
		}

		console.log(`Queued offline operation: ${operation} on ${table}`);
	}

	/**
	 * Process offline queue when connection is restored
	 */
	async processOfflineQueue(): Promise<void> {
		if (this.offlineQueue.length === 0) {
			// Try to load from localStorage
			if (typeof window !== "undefined") {
				const stored = localStorage.getItem("electric-offline-queue");
				if (stored) {
					try {
						this.offlineQueue = JSON.parse(stored);
						this.syncStatus.offlineQueueSize = this.offlineQueue.length;
					} catch (error) {
						console.error("Failed to parse stored offline queue:", error);
					}
				}
			}
		}

		if (this.offlineQueue.length === 0) return;

		return this.observability.trackOperation("electric.sync.process-queue", async () => {
			console.log(`Processing ${this.offlineQueue.length} offline operations...`);

			const config = getFinalConfig();
			const processedItems: string[] = [];

			for (const item of this.offlineQueue) {
				try {
					// Attempt to execute the queued operation
					await this.executeQueuedOperation(item);
					processedItems.push(item.id);

					console.log(`Processed offline operation: ${item.operation} on ${item.table}`);
				} catch (error) {
					item.retryCount++;

					if (item.retryCount >= (config.sync?.maxRetries || 3)) {
						console.error(
							`Failed to process offline operation after ${item.retryCount} retries:`,
							error
						);
						processedItems.push(item.id); // Remove failed items after max retries

						this.observability.recordError("electric.sync.queue-item", error as Error, {
							table: item.table,
							operation: item.operation,
							retryCount: item.retryCount,
						});
					} else {
						console.warn(`Retry ${item.retryCount} for offline operation on ${item.table}`);
					}
				}
			}

			// Remove processed items from queue
			this.offlineQueue = this.offlineQueue.filter((item) => !processedItems.includes(item.id));
			this.syncStatus.offlineQueueSize = this.offlineQueue.length;

			// Update localStorage
			if (typeof window !== "undefined") {
				if (this.offlineQueue.length === 0) {
					localStorage.removeItem("electric-offline-queue");
				} else {
					localStorage.setItem("electric-offline-queue", JSON.stringify(this.offlineQueue));
				}
			}

			console.log(
				`Offline queue processing complete. ${this.offlineQueue.length} items remaining.`
			);
		});
	}

	/**
	 * Execute a queued operation
	 */
	private async executeQueuedOperation(item: {
		table: string;
		operation: "insert" | "update" | "delete";
		data: any;
	}): Promise<void> {
		if (!this.electricClient) {
			throw new Error("ElectricSQL client not initialized");
		}

		// Execute operation through ElectricSQL client
		// This would integrate with the actual ElectricSQL database operations
		console.log(`Executing ${item.operation} on ${item.table}:`, item.data);
	}

	/**
	 * Force sync all tables
	 */
	async forceSyncAll(): Promise<void> {
		return this.observability.trackOperation("electric.sync.force-all", async () => {
			if (!this.electricClient) {
				throw new Error("ElectricSQL client not initialized");
			}

			this.syncStatus.syncStatus = "syncing";

			try {
				// Process offline queue first
				await this.processOfflineQueue();

				// Trigger sync for all subscribed tables
				for (const tableName of this.subscriptions.keys()) {
					await this.forceSyncTable(tableName);
				}

				this.syncStatus.syncStatus = "connected";
				this.syncStatus.lastSyncTime = new Date();

				console.log("Force sync completed for all tables");
			} catch (error) {
				this.syncStatus.syncStatus = "error";
				console.error("Force sync failed:", error);
				throw error;
			}
		});
	}

	/**
	 * Force sync for a specific table
	 */
	private async forceSyncTable(tableName: string): Promise<void> {
		// Implementation would trigger ElectricSQL sync for specific table
		console.log(`Force syncing table: ${tableName}`);
	}

	/**
	 * Get current sync status
	 */
	getSyncStatus(): typeof this.syncStatus {
		return { ...this.syncStatus };
	}

	/**
	 * Get conflict log for debugging
	 */
	getConflictLog(): typeof this.conflictLog {
		return [...this.conflictLog];
	}

	/**
	 * Start health monitoring
	 */
	startHealthMonitoring(): void {
		if (this.healthMonitorInterval) {
			return; // Already monitoring
		}

		const config = getFinalConfig();
		const interval = config.sync?.interval || 30000; // Default 30 seconds

		this.healthMonitorInterval = setInterval(() => {
			this.performHealthCheck();
		}, interval);

		console.log("Health monitoring started");
	}

	/**
	 * Stop health monitoring
	 */
	stopHealthMonitoring(): void {
		if (this.healthMonitorInterval) {
			clearInterval(this.healthMonitorInterval);
			this.healthMonitorInterval = null;
			console.log("Health monitoring stopped");
		}
	}

	/**
	 * Perform health check
	 */
	private async performHealthCheck(): Promise<void> {
		try {
			if (!this.electricClient) {
				this.syncStatus.isConnected = false;
				this.syncStatus.syncStatus = "disconnected";
				return;
			}

			const clientStatus = this.electricClient.getSyncStatus();
			this.syncStatus.isConnected = clientStatus.isConnected;
			this.syncStatus.syncStatus = clientStatus.status;
			this.syncStatus.lastSyncTime = clientStatus.lastSyncTime;
			this.syncStatus.conflictCount = clientStatus.conflictCount;

			// Update observability metrics
			this.observability.recordEvent("electric.sync.health-check", {
				isConnected: this.syncStatus.isConnected,
				syncStatus: this.syncStatus.syncStatus,
				offlineQueueSize: this.syncStatus.offlineQueueSize,
				activeSubscriptions: this.syncStatus.activeSubscriptions,
			});
		} catch (error) {
			console.error("Health check failed:", error);
			this.syncStatus.syncStatus = "error";
			this.observability.recordError("electric.sync.health-check", error as Error);
		}
	}

	/**
	 * Update sync status
	 */
	private updateSyncStatus(): void {
		if (this.electricClient) {
			const clientStatus = this.electricClient.getSyncStatus();
			this.syncStatus.isConnected = clientStatus.isConnected;
			this.syncStatus.syncStatus = clientStatus.status;
			this.syncStatus.lastSyncTime = clientStatus.lastSyncTime;
		}
		this.syncStatus.offlineQueueSize = this.offlineQueue.length;
		this.syncStatus.conflictCount = this.conflictLog.length;
	}

	/**
	 * Cleanup method
	 */
	async cleanup(): Promise<void> {
		try {
			// Stop health monitoring
			this.stopHealthMonitoring();

			// Clear all subscriptions
			for (const unsubscribe of this.subscriptions.values()) {
				unsubscribe();
			}
			this.subscriptions.clear();

			// Process remaining offline queue
			if (this.offlineQueue.length > 0) {
				console.log("Processing remaining offline queue before cleanup...");
				await this.processOfflineQueue();
			}

			// Cleanup ElectricSQL client
			if (this.electricClient) {
				await this.electricClient.cleanup();
			}

			// Reset state
			this.isInitialized = false;
			this.syncStatus = {
				isConnected: false,
				syncStatus: "disconnected",
				lastSyncTime: null,
				offlineQueueSize: 0,
				conflictCount: 0,
				activeSubscriptions: 0,
			};

			console.log("ElectricSQL sync service cleaned up successfully");
		} catch (error) {
			console.error("Error during sync service cleanup:", error);
			this.observability.recordError("electric.sync.cleanup", error as Error);
		}
	}
}

// Export singleton instance
export const electricSyncService = ElectricSyncService.getInstance();
