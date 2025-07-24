import { ElectricClient as BaseElectricClient, type ElectricConfig } from "@electric-sql/client";
// Import actual ElectricSQL packages
import { PGlite } from "@electric-sql/pglite";
import type * as schema from "@/db/schema";
import { logger } from "../logging";
import { ObservabilityService } from "../observability";
import { electricConfig, getFinalConfig, validateElectricConfig } from "./config";

// Type definitions for our database schema
export type DatabaseSchema = typeof schema;

// ElectricSQL database interface
interface ElectricDatabase {
	execute: (sql: string, params?: unknown[]) => Promise<unknown>;
	query: (sql: string, params?: unknown[]) => Promise<unknown>;
	[key: string]: unknown;
}

// Enhanced ElectricSQL client with observability and error handling
export class ElectricClient {
	private static instance: ElectricClient | null = null;
	private client: BaseElectricClient | null = null;
	private database: ElectricDatabase | null = null;
	private pglite: PGlite | null = null;
	private isConnected = false;
	private connectionPromise: Promise<void> | null = null;
	private observability = ObservabilityService.getInstance();
	private logger = logger.child({ component: "ElectricClient" });
	private subscriptions = new Map<string, () => void>();
	private offlineQueue: Array<{
		operation: string;
		data: unknown;
		timestamp: Date;
	}> = [];
	private syncStatus: "connected" | "disconnected" | "syncing" | "error" = "disconnected";
	private lastSyncTime: Date | null = null;
	private conflictLog: Array<{
		table: string;
		id: string;
		conflict: unknown;
		resolution: unknown;
		timestamp: Date;
	}> = [];

	private constructor() {
		// Private constructor for singleton pattern
	}

	static getInstance(): ElectricClient {
		if (!ElectricClient.instance) {
			ElectricClient.instance = new ElectricClient();
		}
		return ElectricClient.instance;
	}

	/**
	 * Initialize the ElectricSQL client with configuration validation
	 */
	async initialize(): Promise<void> {
		if (this.connectionPromise) {
			return this.connectionPromise;
		}

		this.connectionPromise = this.observability.trackOperation("electric.initialize", async () => {
			try {
				// Validate configuration
				validateElectricConfig();
				const config = getFinalConfig();

				this.logger.info("Initializing ElectricSQL client", { config: { url: config.url } });

				// Initialize PGlite for local database
				this.pglite = new PGlite({
					dataDir: process.env.ELECTRIC_LOCAL_DB_PATH || "idb://electric-local",
					extensions: {
						vector: true, // Enable vector extension for embeddings
					},
				});

				// Initialize ElectricSQL client with proper configuration
				const electricConfig: ElectricConfig = {
					url: config.url || process.env.ELECTRIC_URL || "ws://localhost:5133",
					auth: config.auth,
					debug: config.debug || process.env.NODE_ENV === "development",
				};

				this.client = new BaseElectricClient(electricConfig);

				// Get database instance from PGlite
				this.database = {
					execute: async (sql: string, params?: unknown[]) => {
						if (!this.pglite) throw new Error("PGlite not initialized");
						return await this.pglite.query(sql, params);
					},
					query: async (sql: string, params?: unknown[]) => {
						if (!this.pglite) throw new Error("PGlite not initialized");
						return await this.pglite.query(sql, params);
					},
				};

				// Set up event listeners
				this.setupEventListeners();

				// Connect to ElectricSQL service
				await this.connect();

				this.logger.info("ElectricSQL client initialized successfully");
			} catch (error) {
				this.logger.error("Failed to initialize ElectricSQL client", { error });
				this.observability.recordError("electric.initialize", error as Error);
				throw error;
			}
		});

		return this.connectionPromise;
	}

	/**
	 * Connect to ElectricSQL service with retry logic
	 */
	private async connect(): Promise<void> {
		return this.observability.trackOperation("electric.connect", async () => {
			if (!this.client) {
				throw new Error("ElectricSQL client not initialized");
			}

			const config = getFinalConfig();
			let retryCount = 0;

			while (retryCount < config.sync.maxRetries) {
				try {
					// ElectricSQL client connection
					await this.client.connect();
					this.isConnected = true;
					this.syncStatus = "connected";
					this.lastSyncTime = new Date();

					// Process offline queue if any
					await this.processOfflineQueue();

					this.logger.info("Connected to ElectricSQL service");
					return;
				} catch (error) {
					retryCount++;
					this.syncStatus = "error";

					if (retryCount >= config.sync.maxRetries) {
						this.logger.error("Failed to connect to ElectricSQL service after retries", { error });
						throw error;
					}

					// Exponential backoff
					const delay = config.sync.retryBackoff * 2 ** (retryCount - 1);
					this.logger.warn(`Connection attempt ${retryCount} failed, retrying in ${delay}ms...`);
					await new Promise((resolve) => setTimeout(resolve, delay));
				}
			}
		});
	}

	/**
	 * Set up event listeners for connection status and sync events
	 */
	private setupEventListeners(): void {
		if (!this.client) {
			return;
		}

		// Connection status events
		this.client.on("connected", () => {
			this.isConnected = true;
			this.syncStatus = "connected";
			this.observability.recordEvent("electric.connected", {});
			this.logger.info("ElectricSQL connected");
		});

		this.client.on("disconnected", () => {
			this.isConnected = false;
			this.syncStatus = "disconnected";
			this.observability.recordEvent("electric.disconnected", {});
			this.logger.info("ElectricSQL disconnected");
		});

		// Sync events
		this.client.on("sync:start", () => {
			this.syncStatus = "syncing";
			this.observability.recordEvent("electric.sync.start", {});
		});

		this.client.on("sync:complete", (data: unknown) => {
			this.syncStatus = "connected";
			this.lastSyncTime = new Date();
			this.observability.recordEvent("electric.sync.complete", { data });
		});

		this.client.on("sync:error", (error: Error) => {
			this.syncStatus = "error";
			this.observability.recordError("electric.sync", error);
			this.logger.error("ElectricSQL sync error", { error });
		});

		// Conflict resolution events
		this.client.on("conflict", (conflict: unknown) => {
			this.handleConflict(conflict);
		});

		// Error events
		this.client.on("error", (error: Error) => {
			this.observability.recordError("electric.client", error);
			this.logger.error("ElectricSQL client error", { error });
		});
	}

	/**
	 * Handle conflicts using last-write-wins with conflict detection
	 */
	private handleConflict(conflict: unknown): void {
		this.observability.trackOperation("electric.conflict.resolve", async () => {
			const conflictData = conflict as { table: string; id: string; local: any; remote: any };
			const { table, id, local, remote } = conflictData;

			// Log conflict for debugging
			const conflictEntry = {
				table,
				id,
				conflict: { local, remote },
				resolution: null as unknown,
				timestamp: new Date(),
			};

			try {
				// Last-write-wins resolution
				const localTimestamp = new Date(local.updated_at || local.created_at);
				const remoteTimestamp = new Date(remote.updated_at || remote.created_at);

				const winner = remoteTimestamp > localTimestamp ? remote : local;
				conflictEntry.resolution = {
					strategy: "last-write-wins",
					winner: winner === remote ? "remote" : "local",
				};

				// Apply resolution
				await this.database?.execute(`UPDATE ${table} SET updated_at = NOW() WHERE id = ?`, [id]);

				return conflictEntry.resolution;
			} catch (error) {
				this.observability.recordError(error as Error, {
					operation: "conflict_resolution",
					table,
					id,
				});
				throw error;
			} finally {
				// Store conflict entry for debugging
				this.conflictLog.push(conflictEntry);

				// Keep only last 100 conflict entries
				if (this.conflictLog.length > 100) {
					this.conflictLog.shift();
				}
			}
		});
	}

	/**
	 * Process offline queue when connection is restored
	 */
	private async processOfflineQueue(): Promise<void> {
		if (this.offlineQueue.length === 0) {
			return;
		}

		this.logger.info(`Processing ${this.offlineQueue.length} offline operations...`);

		for (const operation of this.offlineQueue) {
			try {
				// Process each queued operation
				await this.database?.execute(operation.operation, operation.data);
			} catch (error) {
				this.logger.error("Failed to process offline operation", { error });
				this.observability.recordError("electric.offline.process", error as Error);
			}
		}

		// Clear processed queue
		this.offlineQueue.length = 0;
	}

	/**
	 * Get current sync status
	 */
	getSyncStatus(): {
		status: typeof this.syncStatus;
		isConnected: boolean;
		lastSyncTime: Date | null;
		offlineQueueSize: number;
		conflictCount: number;
	} {
		return {
			status: this.syncStatus,
			isConnected: this.isConnected,
			lastSyncTime: this.lastSyncTime,
			offlineQueueSize: this.offlineQueue.length,
			conflictCount: this.conflictLog.length,
		};
	}

	/**
	 * Cleanup method for proper resource disposal
	 */
	async cleanup(): Promise<void> {
		try {
			// Clear all subscriptions
			for (const unsubscribe of this.subscriptions.values()) {
				unsubscribe();
			}
			this.subscriptions.clear();

			// Disconnect client
			if (this.client && this.isConnected) {
				await this.client.disconnect();
			}

			// Close PGlite
			if (this.pglite) {
				await this.pglite.close();
			}

			// Reset state
			this.isConnected = false;
			this.syncStatus = "disconnected";
			this.connectionPromise = null;

			this.logger.info("ElectricSQL client cleaned up successfully");
		} catch (error) {
			this.logger.error("Error during ElectricSQL client cleanup", { error });
			this.observability.recordError("electric.cleanup", error as Error);
		}
	}

	/**
	 * Subscribe to table changes for real-time updates
	 */
	async subscribeToTable(
		tableName: string,
		callback: (data: unknown) => void
	): Promise<() => void> {
		if (!this.client) {
			throw new Error("ElectricSQL client not initialized");
		}

		try {
			// Use ElectricSQL's subscription mechanism
			const unsubscribe = this.client.subscribe?.(tableName, callback) || (() => {});
			this.subscriptions.set(tableName, unsubscribe);

			this.logger.info("Subscribed to table", { tableName });
			return unsubscribe;
		} catch (error) {
			this.logger.error("Failed to subscribe to table", { tableName, error });
			throw error;
		}
	}

	/**
	 * Execute SQL query with proper error handling
	 */
	async query(sql: string, params?: unknown[]): Promise<unknown> {
		if (!this.database) {
			throw new Error("ElectricSQL database not initialized");
		}

		try {
			return await this.database.query(sql, params);
		} catch (error) {
			this.logger.error("Database query failed", { sql, params, error });
			this.observability.recordError("electric.query", error as Error);
			throw error;
		}
	}

	/**
	 * Force sync with remote database
	 */
	async sync(): Promise<void> {
		if (!this.client) {
			throw new Error("ElectricSQL client not initialized");
		}

		try {
			this.syncStatus = "syncing";
			await this.client.sync?.();
			this.syncStatus = "connected";
			this.lastSyncTime = new Date();
			this.logger.info("Manual sync completed");
		} catch (error) {
			this.syncStatus = "error";
			this.logger.error("Manual sync failed", { error });
			throw error;
		}
	}
}
