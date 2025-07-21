import {
	type ElectricDatabase
} from "@electric-sql/client";
import { ObservabilityService } from "../observability";
	electricConfig,
	getFinalConfig,
	validateElectricConfig
} from "./config";

// Type definitions for our database schema
export type DatabaseSchema = typeof schema;

// Enhanced ElectricSQL client with observability and error handling
export class ElectricClient {
	private static instance: ElectricClient | null = null;
	private client: BaseElectricClient | null = null;
	private database: ElectricDatabase | null = null;
	private pglite: PGlite | null = null;
	private isConnected = false;
	private connectionPromise: Promise<void> | null = null;
	private observability = ObservabilityService.getInstance();
	private subscriptions = new Map<string, () => void>();
	private offlineQueue: Array<{
		operation: string;
		data: any;
		timestamp: Date;
	}> = [];
	private syncStatus: "connected" | "disconnected" | "syncing" | "error" =
		"disconnected";
	private lastSyncTime: Date | null = null;
	private conflictLog: Array<{
		table: string;
		id: string;
		conflict: any;
		resolution: any;
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

		this.connectionPromise = this.observability.trackOperation(
			"electric.initialize",
			async () => {
				try {
					// Validate configuration
					validateElectricConfig();
					const config = getFinalConfig();

					// Initialize PGlite for local database
					this.pglite = new PGlite({
						dataDir:
							process.env.ELECTRIC_LOCAL_DB_PATH || "idb://electric-local",
						extensions: {
							vector: true, // Enable vector extension for embeddings
						},
					});

					// Initialize ElectricSQL client
					this.client = new BaseElectricClient({
						...config,
						database: this.pglite,
					});

					// Get database instance
					this.database = this.client.db;

					// Set up event listeners
					this.setupEventListeners();

					// Connect to ElectricSQL service
					await this.connect();

					console.log("ElectricSQL client initialized successfully");
				} catch (error) {
					console.error("Failed to initialize ElectricSQL client:", error);
					this.observability.recordError("electric.initialize", error as Error);
					throw error;
				}
			},
		);

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
					await this.client.connect();
					this.isConnected = true;
					this.syncStatus = "connected";
					this.lastSyncTime = new Date();

					// Process offline queue if any
					await this.processOfflineQueue();

					console.log("Connected to ElectricSQL service");
					return;
				} catch (error) {
					retryCount++;
					this.syncStatus = "error";

					if (retryCount >= config.sync.maxRetries) {
						console.error(
							"Failed to connect to ElectricSQL service after retries:",
							error,
						);
						throw error;
					}

					// Exponential backoff
					const delay = config.sync.retryBackoff * 2 ** (retryCount - 1);
					console.warn(
						`Connection attempt ${retryCount} failed, retrying in ${delay}ms...`,
					);
					await new Promise((resolve) => setTimeout(resolve, delay));
				}
			}
		});
	}

	/**
	 * Set up event listeners for connection status and sync events
	 */
	private setupEventListeners(): void {
		if (!this.client) return;

		// Connection status events
		this.client.on("connected", () => {
			this.isConnected = true;
			this.syncStatus = "connected";
			this.observability.recordEvent("electric.connected", {});
			console.log("ElectricSQL connected");
		});

		this.client.on("disconnected", () => {
			this.isConnected = false;
			this.syncStatus = "disconnected";
			this.observability.recordEvent("electric.disconnected", {});
			console.log("ElectricSQL disconnected");
		});

		// Sync events
		this.client.on("sync:start", () => {
			this.syncStatus = "syncing";
			this.observability.recordEvent("electric.sync.start", {});
		});

		this.client.on("sync:complete", (data: any) => {
			this.syncStatus = "connected";
			this.lastSyncTime = new Date();
			this.observability.recordEvent("electric.sync.complete", { data });
		});

		this.client.on("sync:error", (error: any) => {
			this.syncStatus = "error";
			this.observability.recordError("electric.sync", error);
			console.error("ElectricSQL sync error:", error);
		});

		// Conflict resolution events
		this.client.on("conflict", (conflict: any) => {
			this.handleConflict(conflict);
		});

		// Error events
		this.client.on("error", (error: any) => {
			this.observability.recordError("electric.client", error);
			console.error("ElectricSQL client error:", error);
		});
	}

	/**
	 * Handle conflicts using last-write-wins with conflict detection
	 */
	private handleConflict(conflict: any): void {
		this.observability.trackOperation("electric.conflict.resolve", async () => {
			const { table, id, local, remote } = conflict;

			// Log conflict for debugging
			const conflictEntry = {
				table,
				id,
				conflict: { local, remote },
				resolution: null as any,
				timestamp: new Date(),
			};

			try {
				// Last-write-wins resolution
				const localTimestamp = new Date(local.updated_at || local.created_at);
				const remoteTimestamp = new Date(
					remote.updated_at || remote.created_at,
				);

				const winner = remoteTimestamp > localTimestamp ? remote : local;
				conflictEntry.resolution = {
					strategy: "last-write-wins",
					winner: winner === remote ? "remote" : "local",
				};

				// Apply resolution
				await this.database?.execute(
					`
UPDATE ${table} 