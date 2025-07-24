/**
 * ElectricSQL + TanStack Query Integration Bridge
 *
 * Provides seamless integration between ElectricSQL real-time subscriptions
 * and TanStack Query cache invalidation for automatic UI updates.
 */

import type { QueryClient } from "@tanstack/react-query";
import { electricSyncService } from "@/lib/electric/sync-service";
import { observability } from "@/lib/observability";
import { invalidateByTable, queryKeys } from "./config";

export interface ElectricBridgeConfig {
	enableRealTimeInvalidation: boolean;
	batchInvalidationMs: number;
	debugMode: boolean;
	tableSubscriptions: string[];
	customInvalidationRules?: Record<string, (data: any[]) => void>;
}

/**
 * Bridge service that connects ElectricSQL real-time updates with TanStack Query cache invalidation
 */
class ElectricQueryBridge {
	private queryClient: QueryClient | null = null;
	private config: ElectricBridgeConfig = {
		enableRealTimeInvalidation: true,
		batchInvalidationMs: 100,
		debugMode: false,
		tableSubscriptions: [],
	};
	private isInitialized = false;
	private eventListeners = new Map<string, (event: CustomEvent) => void>();
	private invalidationQueue = new Map<string, { data: any[]; timestamp: number }>();
	private batchTimer: NodeJS.Timeout | null = null;
	private stats = {
		isActive: false,
		subscribedTables: [] as string[],
		queuedInvalidations: 0,
		connectionStatus: null as any,
	};

	/**
	 * Initialize the bridge with a QueryClient instance
	 */
	async initialize(
		queryClient: QueryClient,
		config?: Partial<ElectricBridgeConfig>
	): Promise<void> {
		if (this.isInitialized) {
			return;
		}

		return observability.trackOperation("electric-bridge.initialize", async () => {
			try {
				this.queryClient = queryClient;
				this.config = { ...this.config, ...config };

				// Initialize ElectricSQL sync service
				await electricSyncService.initialize();

				// Set up real-time event listeners
				this.setupEventListeners();

				// Start health monitoring
				electricSyncService.startHealthMonitoring();

				this.isInitialized = true;
				this.stats.isActive = true;
				this.updateStats();

				if (this.config.debugMode) {
					console.log("🔄 ElectricSQL-TanStack Query bridge initialized");
				}
			} catch (error) {
				console.error("Failed to initialize ElectricSQL bridge:", error);
				observability.recordError("electric-bridge.initialize", error as Error);
				throw error;
			}
		});
	}

	/**
	 * Set up event listeners for ElectricSQL table updates
	 */
	private setupEventListeners(): void {
		if (typeof window === "undefined") {
			return; // Server-side, no DOM events
		}

		// Listen for table update events from ElectricSQL sync service
		const handleTableUpdate = (event: CustomEvent) => {
			const { tableName, data } = event.detail;
			this.handleTableInvalidation(tableName, data);
		};

		// Add event listener
		window.addEventListener("electric-table-update", handleTableUpdate as EventListener);
		this.eventListeners.set("electric-table-update", handleTableUpdate);

		// Listen for connection status changes
		const handleConnectionChange = (event: CustomEvent) => {
			this.stats.connectionStatus = event.detail;
			this.updateStats();
		};

		window.addEventListener("electric-connection-change", handleConnectionChange as EventListener);
		this.eventListeners.set("electric-connection-change", handleConnectionChange);

		if (this.config.debugMode) {
			console.log("🎧 ElectricSQL event listeners set up");
		}
	}

	/**
	 * Handle table invalidation with batching
	 */
	private handleTableInvalidation(tableName: string, data: any[]): void {
		if (!this.config.enableRealTimeInvalidation || !this.queryClient) {
			return;
		}

		observability.trackOperation("electric-bridge.invalidate", () => {
			// Add to invalidation queue
			this.invalidationQueue.set(tableName, {
				data,
				timestamp: Date.now(),
			});

			this.stats.queuedInvalidations = this.invalidationQueue.size;

			// Batch invalidations to avoid excessive re-renders
			if (this.batchTimer) {
				clearTimeout(this.batchTimer);
			}

			this.batchTimer = setTimeout(() => {
				this.processBatchedInvalidations();
			}, this.config.batchInvalidationMs);

			if (this.config.debugMode) {
				console.log(`📊 Queued invalidation for table: ${tableName}`, data);
			}
		});
	}

	/**
	 * Process batched invalidations
	 */
	private processBatchedInvalidations(): void {
		if (!this.queryClient || this.invalidationQueue.size === 0) {
			return;
		}

		observability.trackOperation("electric-bridge.process-batch", () => {
			const tables = Array.from(this.invalidationQueue.keys());

			for (const tableName of tables) {
				const queueItem = this.invalidationQueue.get(tableName);
				if (!queueItem) continue;

				try {
					// Check for custom invalidation rules
					const customRule = this.config.customInvalidationRules?.[tableName];
					if (customRule) {
						customRule(queueItem.data);
					} else {
						// Use default invalidation strategy
						invalidateByTable(this.queryClient!, tableName, queueItem.data);
					}

					if (this.config.debugMode) {
						console.log(`✅ Invalidated cache for table: ${tableName}`);
					}
				} catch (error) {
					console.error(`Failed to invalidate cache for table ${tableName}:`, error);
					observability.recordError("electric-bridge.invalidate", error as Error, {
						table: tableName,
					});
				}
			}

			// Clear processed invalidations
			this.invalidationQueue.clear();
			this.stats.queuedInvalidations = 0;
			this.batchTimer = null;

			if (this.config.debugMode) {
				console.log(`🔄 Processed ${tables.length} table invalidations`);
			}
		});
	}

	/**
	 * Manually invalidate cache for a specific table
	 */
	invalidateTable(tableName: string, data?: any[]): void {
		if (!this.queryClient) {
			console.warn("QueryClient not initialized");
			return;
		}

		observability.trackOperation("electric-bridge.manual-invalidate", () => {
			try {
				invalidateByTable(this.queryClient!, tableName, data);

				if (this.config.debugMode) {
					console.log(`🔄 Manually invalidated cache for table: ${tableName}`);
				}
			} catch (error) {
				console.error(`Failed to manually invalidate table ${tableName}:`, error);
				observability.recordError("electric-bridge.manual-invalidate", error as Error, {
					table: tableName,
				});
			}
		});
	}

	/**
	 * Subscribe to specific table updates
	 */
	subscribeToTable(tableName: string, callback: (data: any[]) => void): () => void {
		if (!this.isInitialized) {
			throw new Error("ElectricSQL bridge not initialized");
		}

		return electricSyncService.subscribeToTable(tableName, callback);
	}

	/**
	 * Force sync all subscribed tables
	 */
	async forceSyncAll(): Promise<void> {
		if (!this.isInitialized) {
			throw new Error("ElectricSQL bridge not initialized");
		}

		return electricSyncService.forceSyncAll();
	}

	/**
	 * Get bridge statistics
	 */
	getStats(): typeof this.stats {
		this.updateStats();
		return { ...this.stats };
	}

	/**
	 * Update internal statistics
	 */
	private updateStats(): void {
		if (this.isInitialized) {
			const syncStatus = electricSyncService.getSyncStatus();
			this.stats.connectionStatus = syncStatus;
			this.stats.subscribedTables = Array.from(this.eventListeners.keys());
		}
	}

	/**
	 * Add custom invalidation rule for a table
	 */
	addCustomInvalidationRule(tableName: string, rule: (data: any[]) => void): void {
		if (!this.config.customInvalidationRules) {
			this.config.customInvalidationRules = {};
		}
		this.config.customInvalidationRules[tableName] = rule;

		if (this.config.debugMode) {
			console.log(`📋 Added custom invalidation rule for table: ${tableName}`);
		}
	}

	/**
	 * Remove custom invalidation rule
	 */
	removeCustomInvalidationRule(tableName: string): void {
		if (this.config.customInvalidationRules) {
			delete this.config.customInvalidationRules[tableName];
		}
	}

	/**
	 * Enable/disable real-time invalidation
	 */
	setRealTimeInvalidation(enabled: boolean): void {
		this.config.enableRealTimeInvalidation = enabled;

		if (this.config.debugMode) {
			console.log(`🔄 Real-time invalidation ${enabled ? "enabled" : "disabled"}`);
		}
	}

	/**
	 * Update batch timing
	 */
	setBatchTiming(ms: number): void {
		this.config.batchInvalidationMs = Math.max(50, ms); // Minimum 50ms

		if (this.config.debugMode) {
			console.log(`⏱️ Batch timing updated to ${ms}ms`);
		}
	}

	/**
	 * Cleanup method
	 */
	async cleanup(): Promise<void> {
		try {
			// Clear batch timer
			if (this.batchTimer) {
				clearTimeout(this.batchTimer);
				this.batchTimer = null;
			}

			// Process any remaining invalidations
			if (this.invalidationQueue.size > 0) {
				this.processBatchedInvalidations();
			}

			// Remove event listeners
			if (typeof window !== "undefined") {
				for (const [eventName, listener] of this.eventListeners) {
					window.removeEventListener(eventName, listener as EventListener);
				}
			}
			this.eventListeners.clear();

			// Cleanup ElectricSQL sync service
			await electricSyncService.cleanup();

			// Reset state
			this.isInitialized = false;
			this.stats.isActive = false;
			this.queryClient = null;

			if (this.config.debugMode) {
				console.log("🧹 ElectricSQL bridge cleaned up");
			}
		} catch (error) {
			console.error("Error during ElectricSQL bridge cleanup:", error);
			observability.recordError("electric-bridge.cleanup", error as Error);
		}
	}
}

// Export singleton instance
export const electricQueryBridge = new ElectricQueryBridge();

// Export configuration type
export type { ElectricBridgeConfig };
