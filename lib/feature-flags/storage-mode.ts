/**
 * Storage Mode Feature Flag
 *
 * Controls whether the application uses localStorage or database as the primary storage.
 * Enables gradual rollout and fallback capabilities during migration.
 */

export type StorageMode = "localStorage" | "database" | "dual";

export interface StorageModeConfig {
	mode: StorageMode;
	fallbackEnabled: boolean;
	syncEnabled: boolean;
	migrationAutoTrigger: boolean;
}

/**
 * Feature flag configuration for storage mode
 */
export class StorageModeFeatureFlag {
	private static instance: StorageModeFeatureFlag;
	private config: StorageModeConfig;

	private constructor() {
		this.config = this.loadConfig();
	}

	static getInstance(): StorageModeFeatureFlag {
		if (!StorageModeFeatureFlag.instance) {
			StorageModeFeatureFlag.instance = new StorageModeFeatureFlag();
		}
		return StorageModeFeatureFlag.instance;
	}

	/**
	 * Load configuration from environment variables or defaults
	 */
	private loadConfig(): StorageModeConfig {
		const mode =
			(process.env.NEXT_PUBLIC_STORAGE_MODE as StorageMode) || "database";
		const fallbackEnabled = process.env.NEXT_PUBLIC_STORAGE_FALLBACK === "true";
		const syncEnabled = process.env.NEXT_PUBLIC_STORAGE_SYNC === "true";
		const migrationAutoTrigger =
			process.env.NEXT_PUBLIC_AUTO_MIGRATE === "true";

		return {
			mode,
			fallbackEnabled,
			syncEnabled,
			migrationAutoTrigger,
		};
	}

	/**
	 * Get current storage mode
	 */
	getMode(): StorageMode {
		return this.config.mode;
	}

	/**
	 * Check if localStorage should be used
	 */
	useLocalStorage(): boolean {
		return this.config.mode === "localStorage" || this.config.mode === "dual";
	}

	/**
	 * Check if database should be used
	 */
	useDatabase(): boolean {
		return this.config.mode === "database" || this.config.mode === "dual";
	}

	/**
	 * Check if dual mode is enabled (both localStorage and database)
	 */
	isDualMode(): boolean {
		return this.config.mode === "dual";
	}

	/**
	 * Check if fallback is enabled (try database first, fall back to localStorage on error)
	 */
	isFallbackEnabled(): boolean {
		return this.config.fallbackEnabled;
	}

	/**
	 * Check if sync between localStorage and database is enabled
	 */
	isSyncEnabled(): boolean {
		return this.config.syncEnabled && this.isDualMode();
	}

	/**
	 * Check if automatic migration should be triggered
	 */
	shouldAutoMigrate(): boolean {
		return this.config.migrationAutoTrigger && this.useDatabase();
	}

	/**
	 * Update configuration (useful for testing or runtime changes)
	 */
	updateConfig(updates: Partial<StorageModeConfig>): void {
		this.config = { ...this.config, ...updates };
	}

	/**
	 * Get full configuration
	 */
	getConfig(): StorageModeConfig {
		return { ...this.config };
	}
}

// Export singleton instance
export const storageModeFlag = StorageModeFeatureFlag.getInstance();

/**
 * Storage adapter interface for dual-mode support
 */
export interface StorageAdapter<T> {
	get(key: string): Promise<T | null>;
	set(key: string, value: T): Promise<void>;
	delete(key: string): Promise<void>;
	clear(): Promise<void>;
}

/**
 * Dual-mode storage manager
 */
export class DualModeStorage<T> {
	constructor(
		private localStorageAdapter: StorageAdapter<T>,
		private databaseAdapter: StorageAdapter<T>,
		private featureFlag: StorageModeFeatureFlag = storageModeFlag,
	) {}

	async get(key: string): Promise<T | null> {
		const mode = this.featureFlag.getMode();

		if (mode === "localStorage") {
			return this.localStorageAdapter.get(key);
		}

		if (mode === "database") {
			try {
				return await this.databaseAdapter.get(key);
			} catch (error) {
				if (this.featureFlag.isFallbackEnabled()) {
					console.warn(
						"Database read failed, falling back to localStorage:",
						error,
					);
					return this.localStorageAdapter.get(key);
				}
				throw error;
			}
		}

		// Dual mode: try database first, then localStorage
		if (mode === "dual") {
			try {
				const dbValue = await this.databaseAdapter.get(key);
				if (dbValue !== null) return dbValue;
			} catch (error) {
				console.warn("Database read failed in dual mode:", error);
			}

			return this.localStorageAdapter.get(key);
		}

		throw new Error(`Unknown storage mode: ${mode}`);
	}

	async set(key: string, value: T): Promise<void> {
		const mode = this.featureFlag.getMode();

		if (mode === "localStorage") {
			return this.localStorageAdapter.set(key, value);
		}

		if (mode === "database") {
			try {
				await this.databaseAdapter.set(key, value);
			} catch (error) {
				if (this.featureFlag.isFallbackEnabled()) {
					console.warn(
						"Database write failed, falling back to localStorage:",
						error,
					);
					return this.localStorageAdapter.set(key, value);
				}
				throw error;
			}
			return;
		}

		// Dual mode: write to both
		if (mode === "dual") {
			const promises: Promise<void>[] = [];

			// Always try to write to database
			promises.push(
				this.databaseAdapter.set(key, value).catch((error) => {
					console.warn("Database write failed in dual mode:", error);
				}),
			);

			// Always write to localStorage
			promises.push(this.localStorageAdapter.set(key, value));

			await Promise.all(promises);
			return;
		}

		throw new Error(`Unknown storage mode: ${mode}`);
	}

	async delete(key: string): Promise<void> {
		const mode = this.featureFlag.getMode();

		if (mode === "localStorage") {
			return this.localStorageAdapter.delete(key);
		}

		if (mode === "database") {
			try {
				await this.databaseAdapter.delete(key);
			} catch (error) {
				if (this.featureFlag.isFallbackEnabled()) {
					console.warn(
						"Database delete failed, falling back to localStorage:",
						error,
					);
					return this.localStorageAdapter.delete(key);
				}
				throw error;
			}
			return;
		}

		// Dual mode: delete from both
		if (mode === "dual") {
			const promises: Promise<void>[] = [];

			promises.push(
				this.databaseAdapter.delete(key).catch((error) => {
					console.warn("Database delete failed in dual mode:", error);
				}),
			);

			promises.push(this.localStorageAdapter.delete(key));

			await Promise.all(promises);
			return;
		}

		throw new Error(`Unknown storage mode: ${mode}`);
	}

	async clear(): Promise<void> {
		const mode = this.featureFlag.getMode();

		if (mode === "localStorage") {
			return this.localStorageAdapter.clear();
		}

		if (mode === "database") {
			return this.databaseAdapter.clear();
		}

		// Dual mode: clear both
		if (mode === "dual") {
			await Promise.all([
				this.databaseAdapter.clear().catch((error) => {
					console.warn("Database clear failed in dual mode:", error);
				}),
				this.localStorageAdapter.clear(),
			]);
			return;
		}

		throw new Error(`Unknown storage mode: ${mode}`);
	}

	/**
	 * Sync data from localStorage to database (for migration)
	 */
	async syncToDatabase(): Promise<void> {
		if (!this.featureFlag.isSyncEnabled()) {
			throw new Error("Sync is not enabled");
		}

		// Implementation would depend on specific data structure
		// This is a placeholder for the sync logic
		console.log("Syncing data from localStorage to database...");
	}
}
