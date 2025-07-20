/**
 * Zero-Downtime Migration Coordinator
 *
 * Ensures seamless migration without interrupting user operations.
 * Implements dual-write pattern and gradual cutover strategies.
 */

import { EventEmitter } from "events";
import { observability } from "@/lib/observability";
import { backupService } from "./backup-service";
	LocalStorageEnvironment,
	LocalStorageTask,
	MigrationConfig,
	MigrationProgress,
	MigrationResult,
} from "./types";
import { validationService } from "./validation-service";

export interface ZeroDowntimeConfig {
	enableDualWrite: boolean;
	enableGradualCutover: boolean;
	cutoverPercentage: number; // 0-100
	syncInterval: number; // milliseconds
	maxRetries: number;
	retryDelay: number; // milliseconds
	healthCheckInterval: number; // milliseconds
}

export type MigrationMode = "localStorage" | "dual" | "database";

export interface SystemHealth {
	localStorage: {
		healthy: boolean;
		accessible: boolean;
		responseTime: number;
	};
	database: {
		healthy: boolean;
		accessible: boolean;
		responseTime: number;
	};
	redis: {
		healthy: boolean;
		accessible: boolean;
		responseTime: number;
	};
	overallHealth: "healthy" | "degraded" | "unhealthy";
}

export class ZeroDowntimeCoordinator extends EventEmitter {
	private static instance: ZeroDowntimeCoordinator;
	private mode: MigrationMode = "localStorage";
	private syncInterval?: NodeJS.Timeout;
	private healthCheckInterval?: NodeJS.Timeout;
	private dualWriteQueue: Map<string, any> = new Map();
	private cutoverProgress = 0;

	private readonly defaultConfig: ZeroDowntimeConfig = {
		enableDualWrite: true,
		enableGradualCutover: true,
		cutoverPercentage: 10, // Start with 10% of traffic
		syncInterval: 5000, // 5 seconds
		maxRetries: 3,
		retryDelay: 1000, // 1 second
		healthCheckInterval: 30_000, // 30 seconds
	};

	private config: ZeroDowntimeConfig;

	private constructor(config?: Partial<ZeroDowntimeConfig>) {
		super();
		this.config = { ...this.defaultConfig, ...config };
	}

	static getInstance(
		config?: Partial<ZeroDowntimeConfig>,
	): ZeroDowntimeCoordinator {
		if (!ZeroDowntimeCoordinator.instance) {
			ZeroDowntimeCoordinator.instance = new ZeroDowntimeCoordinator(config);
		}
		return ZeroDowntimeCoordinator.instance;
	}

	/**
	 * Start zero-downtime migration
	 */
	async startMigration(): Promise<void> {
		this.emit("migrationStarted", { mode: this.mode });

		try {
			// Step 1: Health check
			const health = await this.checkSystemHealth();
			if (health.overallHealth === "unhealthy") {
				throw new Error(
					"System health check failed. Cannot proceed with migration.",
				);
			}

			// Step 2: Create backup
			const backupResult = await backupService.createBackup({
				source: "LOCALSTORAGE",
				includeDatabase: true,
				compress: true,
				description: "Pre-migration backup for zero-downtime migration",
			});

			if (!backupResult.success) {
				throw new Error("Failed to create backup: " + backupResult.error);
			}

			this.emit("backupCreated", { backupId: backupResult.manifest?.id });

			// Step 3: Enable dual-write mode
			if (this.config.enableDualWrite) {
				await this.enableDualWriteMode();
			}

			// Step 4: Start gradual cutover if enabled
			if (this.config.enableGradualCutover) {
				await this.startGradualCutover();
			}

			// Step 5: Start sync process
			this.startSyncProcess();

			// Step 6: Start health monitoring
			this.startHealthMonitoring();

			this.emit("migrationReady", {
				mode: this.mode,
				dualWriteEnabled: this.config.enableDualWrite,
				gradualCutoverEnabled: this.config.enableGradualCutover,
			});
		} catch (error) {
			this.emit("migrationError", { error: error.message });
			throw error;
		}
	}

	/**
	 * Stop migration process
	 */
	async stopMigration(): Promise<void> {
		this.stopSyncProcess();
		this.stopHealthMonitoring();
		this.mode = "localStorage";
		this.cutoverProgress = 0;
		this.dualWriteQueue.clear();

		this.emit("migrationStopped");
	}

	/**
	 * Enable dual-write mode
	 */
	private async enableDualWriteMode(): Promise<void> {
		this.mode = "dual";

		// Override localStorage methods to implement dual-write
		this.interceptLocalStorageWrites();

		this.emit("dualWriteEnabled");
	}

	/**
	 * Intercept localStorage writes for dual-write
	 */
	private interceptLocalStorageWrites(): void {
		const isRelevantKey = this.isRelevantKey.bind(this);
		const queueDualWrite = this.queueDualWrite.bind(this);
		const originalSetItem = localStorage.setItem;

		localStorage.setItem = function (key: string, value: string) {
			// Write to localStorage first
			originalSetItem.call(this, key, value);

			// Queue for database write if relevant key
			if (isRelevantKey(key)) {
				queueDualWrite(key, value, "set");
			}
		};
	}

	/**
	 * Queue dual-write operation
	 */
	private queueDualWrite(
		key: string,
		value: string,
		operation: "set" | "remove",
	): void {
		const writeOperation = {
			key,
			value,
			operation,
			timestamp: Date.now(),
			retries: 0,
		};

		this.dualWriteQueue.set(`${key}-${Date.now()}`, writeOperation);

		// Process immediately if possible
		this.processDualWriteQueue();
	}

	/**
	 * Process dual-write queue
	 */
	private async processDualWriteQueue(): Promise<void> {
		const operations = Array.from(this.dualWriteQueue.entries());

		for (const [id, operation] of operations) {
			try {
				await this.executeDualWrite(operation);
				this.dualWriteQueue.delete(id);
			} catch (error) {
				operation.retries++;

				if (operation.retries >= this.config.maxRetries) {
					this.emit("dualWriteFailed", { operation, error });
					this.dualWriteQueue.delete(id);
				} else {
					// Retry later
					setTimeout(() => {
						this.processDualWriteQueue();
					}, this.config.retryDelay * operation.retries);
				}
			}
		}
	}

	/**
	 * Execute dual-write operation
	 */
	private async executeDualWrite(operation: any): Promise<void> {
		const { key, value, operation: op } = operation;

		if (key === "task-store" && op === "set") {
			const parsed = JSON.parse(value);
			const tasks = parsed?.state?.tasks || parsed?.tasks || [];

			for (const task of tasks) {
				await this.syncTaskToDatabase(task);
			}
		} else if (key === "environments" && op === "set") {
			const parsed = JSON.parse(value);
			const environments =
				parsed?.state?.environments || parsed?.environments || [];

			for (const env of environments) {
				await this.syncEnvironmentToDatabase(env);
			}
		}
	}

	/**
	 * Sync task to database
	 */
	private async syncTaskToDatabase(task: LocalStorageTask): Promise<void> {
		// Implementation would sync to actual database
		await observability.trackOperation("migration.syncTask", async () => {
			// Database sync logic here
			console.log("Syncing task to database:", task.id);
		});
	}

	/**
	 * Sync environment to database
	 */
	private async syncEnvironmentToDatabase(
		env: LocalStorageEnvironment,
	): Promise<void> {
		// Implementation would sync to actual database
		await observability.trackOperation(
			"migration.syncEnvironment",
			async () => {
				// Database sync logic here
				console.log("Syncing environment to database:", env.id);
			},
		);
	}

	/**
	 * Start gradual cutover process
	 */
	private async startGradualCutover(): Promise<void> {
		this.cutoverProgress = this.config.cutoverPercentage;

		const cutoverInterval = setInterval(() => {
			if (this.cutoverProgress < 100) {
				// Increase cutover percentage gradually
				this.cutoverProgress = Math.min(
					100,
					this.cutoverProgress + this.config.cutoverPercentage,
				);

				this.emit("cutoverProgress", { percentage: this.cutoverProgress });

				if (this.cutoverProgress === 100) {
					clearInterval(cutoverInterval);
					this.completeCutover();
				}
			}
		}, 60_000); // Increase every minute
	}

	/**
	 * Complete cutover to database
	 */
	private async completeCutover(): Promise<void> {
		// Validate all data is synced
		const validationResult = await validationService.validateMigration();

		if (validationResult.valid) {
			this.mode = "database";
			this.emit("cutoverCompleted");
		} else {
			this.emit("cutoverFailed", { errors: validationResult.errors });
			// Rollback to dual mode
			this.mode = "dual";
			this.cutoverProgress = 50;
		}
	}

	/**
	 * Start sync process
	 */
	private startSyncProcess(): void {
		this.syncInterval = setInterval(async () => {
			try {
				await this.syncPendingChanges();
			} catch (error) {
				this.emit("syncError", { error });
			}
		}, this.config.syncInterval);
	}

	/**
	 * Stop sync process
	 */
	private stopSyncProcess(): void {
		if (this.syncInterval) {
			clearInterval(this.syncInterval);
			this.syncInterval = undefined;
		}
	}

	/**
	 * Sync pending changes
	 */
	private async syncPendingChanges(): Promise<void> {
		// Process any queued dual-writes
		await this.processDualWriteQueue();

		// Sync any changes from database back to localStorage if in dual mode
		if (this.mode === "dual") {
			await this.syncFromDatabase();
		}
	}

	/**
	 * Sync changes from database to localStorage
	 */
	private async syncFromDatabase(): Promise<void> {
		// Implementation would fetch recent changes from database
		// and update localStorage if needed
		console.log("Syncing from database to localStorage");
	}

	/**
	 * Start health monitoring
	 */
	private startHealthMonitoring(): void {
		this.healthCheckInterval = setInterval(async () => {
			const health = await this.checkSystemHealth();

			this.emit("healthCheck", health);

			if (health.overallHealth === "unhealthy") {
				this.emit("healthCheckFailed", health);

				// Consider pausing migration or switching to safe mode
				if (this.mode === "database" && health.database.healthy === false) {
					this.mode = "dual"; // Fallback to dual mode
					this.emit("fallbackToDualMode", { reason: "Database unhealthy" });
				}
			}
		}, this.config.healthCheckInterval);
	}

	/**
	 * Stop health monitoring
	 */
	private stopHealthMonitoring(): void {
		if (this.healthCheckInterval) {
			clearInterval(this.healthCheckInterval);
			this.healthCheckInterval = undefined;
		}
	}

	/**
	 * Check system health
	 */
	private async checkSystemHealth(): Promise<SystemHealth> {
		const health: SystemHealth = {
			localStorage: await this.checkLocalStorageHealth(),
			database: await this.checkDatabaseHealth(),
			redis: await this.checkRedisHealth(),
			overallHealth: "healthy",
		};

		// Determine overall health
		if (!(health.localStorage.healthy && health.database.healthy)) {
			health.overallHealth = "unhealthy";
		} else if (!health.redis.healthy) {
			health.overallHealth = "degraded";
		}

		return health;
	}

	/**
	 * Check localStorage health
	 */
	private async checkLocalStorageHealth(): Promise<
		SystemHealth["localStorage"]
	> {
		const start = Date.now();

		try {
			// Test read/write
			const testKey = "_health_check_" + Date.now();
			localStorage.setItem(testKey, "test");
			const value = localStorage.getItem(testKey);
			localStorage.removeItem(testKey);

			return {
				healthy: value === "test",
				accessible: true,
				responseTime: Date.now() - start,
			};
		} catch (error) {
			return {
				healthy: false,
				accessible: false,
				responseTime: Date.now() - start,
			};
		}
	}

	/**
	 * Check database health
	 */
	private async checkDatabaseHealth(): Promise<SystemHealth["database"]> {
		const start = Date.now();

		try {
			// Implementation would check actual database connection
			// For now, simulating
			await new Promise((resolve) => setTimeout(resolve, 10));

			return {
				healthy: true,
				accessible: true,
				responseTime: Date.now() - start,
			};
		} catch (error) {
			return {
				healthy: false,
				accessible: false,
				responseTime: Date.now() - start,
			};
		}
	}

	/**
	 * Check Redis health
	 */
	private async checkRedisHealth(): Promise<SystemHealth["redis"]> {
		const start = Date.now();

		try {
			const { redisCache } = await import("@/lib/redis");
			await redisCache.ping();

			return {
				healthy: true,
				accessible: true,
				responseTime: Date.now() - start,
			};
		} catch (error) {
			return {
				healthy: false,
				accessible: false,
				responseTime: Date.now() - start,
			};
		}
	}

	/**
	 * Check if key is relevant for migration
	 */
	private isRelevantKey(key: string): boolean {
		const relevantKeys = ["task-store", "environments"];
		return relevantKeys.includes(key) || key.includes("form");
	}

	/**
	 * Get current migration mode
	 */
	getCurrentMode(): MigrationMode {
		return this.mode;
	}

	/**
	 * Get cutover progress
	 */
	getCutoverProgress(): number {
		return this.cutoverProgress;
	}

	/**
	 * Get dual-write queue size
	 */
	getDualWriteQueueSize(): number {
		return this.dualWriteQueue.size;
	}

	/**
	 * Force complete cutover (for testing/emergency)
	 */
	async forceCompleteCutover(): Promise<void> {
		this.cutoverProgress = 100;
		await this.completeCutover();
	}

	/**
	 * Rollback to localStorage only
	 */
	async rollbackToLocalStorage(): Promise<void> {
		this.mode = "localStorage";
		this.cutoverProgress = 0;
		this.stopSyncProcess();
		this.stopHealthMonitoring();

		this.emit("rolledBack");
	}
}

// Export singleton instance
export const zeroDowntimeCoordinator = ZeroDowntimeCoordinator.getInstance();
