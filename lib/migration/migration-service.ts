/**
 * Data Migration Service
 *
 * Handles migration from localStorage to PostgreSQL + Redis architecture
 */

import { eq } from "drizzle-orm";
import { db } from "@/db/config";
import { environments, tasks } from "@/db/schema";
import { ObservabilityService } from "@/lib/observability";
	LocalStorageData,
	LocalStorageEnvironment,
	LocalStorageTask,
	MigrationError,
	MigrationResult,
} from "./types";

export class MigrationService {
	private static instance: MigrationService;
	private observability = ObservabilityService.getInstance();

	private constructor() {}

	/**
	 * Get Redis cache instance (lazy-loaded)
	 */
	private async getRedisCache() {
		try {
			const { redisCache } = await import("@/lib/redis");
			return redisCache;
		} catch (error) {
			console.warn("Redis not available, continuing without cache:", error);
			return null;
		}
	}

	static getInstance(): MigrationService {
		if (!MigrationService.instance) {
			MigrationService.instance = new MigrationService();
		}
		return MigrationService.instance;
	}

	/**
	 * Migrate all data from localStorage to database + Redis
	 */
	async migrateFromLocalStorage(): Promise<MigrationResult> {
		return this.observability.trackOperation("migration.full", async () => {
			const startTime = Date.now();
			const result: MigrationResult = {
				success: false,
				itemsProcessed: 0,
				itemsSuccess: 0,
				itemsFailed: 0,
				errors: [],
				warnings: [],
				duration: 0,
			};

			try {
				// Extract data from localStorage
				const localData = this.extractLocalStorageData();

				if (!(localData.tasks?.length || localData.environments?.length)) {
					result.success = true;
					result.warnings.push("No data found in localStorage to migrate");
					result.duration = Date.now() - startTime;
					return result;
				}

				// Create backup
				const backupId = await this.createBackup(localData);
				result.backupId = backupId;

				// Migrate tasks
				if (localData.tasks?.length) {
					const taskResult = await this.migrateTasks(localData.tasks);
					result.itemsProcessed += taskResult.itemsProcessed;
					result.itemsSuccess += taskResult.itemsSuccess;
					result.itemsFailed += taskResult.itemsFailed;
					result.errors.push(...taskResult.errors);
					result.warnings.push(...taskResult.warnings);
				}

				// Migrate environments
				if (localData.environments?.length) {
					const envResult = await this.migrateEnvironments(
						localData.environments,
					);
					result.itemsProcessed += envResult.itemsProcessed;
					result.itemsSuccess += envResult.itemsSuccess;
					result.itemsFailed += envResult.itemsFailed;
					result.errors.push(...envResult.errors);
					result.warnings.push(...envResult.warnings);
				}

				result.success = result.itemsFailed === 0;
				result.duration = Date.now() - startTime;

				// Clear localStorage after successful migration
				if (result.success) {
					this.clearLocalStorage();
					result.warnings.push(
						"LocalStorage data cleared after successful migration",
					);
				}

				return result;
			} catch (error) {
				result.errors.push({
					type: "MIGRATION_ERROR",
					message:
						error instanceof Error ? error.message : "Unknown migration error",
					details: { error },
				});
				result.duration = Date.now() - startTime;
				return result;
			}
		});
	}

	/**
	 * Migrate tasks from localStorage to database
	 */
	private async migrateTasks(
		localTasks: LocalStorageTask[],
	): Promise<MigrationResult> {
		const result: MigrationResult = {
			success: false,
			itemsProcessed: localTasks.length,
			itemsSuccess: 0,
			itemsFailed: 0,
			errors: [],
			warnings: [],
			duration: 0,
		};

		for (const localTask of localTasks) {
			try {
				// Check if task already exists
				const existing = await db
					.select()
					.from(tasks)
					.where(eq(tasks.id, localTask.id))
					.limit(1);

				if (existing.length > 0) {
					result.warnings.push(`Task ${localTask.id} already exists, skipping`);
					result.itemsSuccess++;
					continue;
				}

				// Transform localStorage task to database format
				const dbTask = {
					id: localTask.id,
					title: localTask.title,
					description: localTask.description,
					status: localTask.status,
					branch: localTask.branch,
					sessionId: localTask.sessionId,
					repository: localTask.repository,
					statusMessage: localTask.statusMessage,
					isArchived: localTask.isArchived,
					mode: localTask.mode,
					hasChanges: localTask.hasChanges,
					messages: localTask.messages,
					pullRequest: localTask.pullRequest,
					createdAt: new Date(localTask.createdAt),
					updatedAt: new Date(localTask.updatedAt),
				};

				// Insert into database
				await db.insert(tasks).values(dbTask);

				// Cache in Redis (if available)
				const redis = await this.getRedisCache();
				if (redis) {
					await redis.set(`task:${localTask.id}`, dbTask, { ttl: 300 });
				}

				result.itemsSuccess++;
			} catch (error) {
				result.itemsFailed++;
				result.errors.push({
					type: "TASK_MIGRATION_ERROR",
					message: `Failed to migrate task ${localTask.id}`,
					details: { taskId: localTask.id, error },
				});
			}
		}

		result.success = result.itemsFailed === 0;
		return result;
	}

	/**
	 * Migrate environments from localStorage to database
	 */
	private async migrateEnvironments(
		localEnvs: LocalStorageEnvironment[],
	): Promise<MigrationResult> {
		const result: MigrationResult = {
			success: false,
			itemsProcessed: localEnvs.length,
			itemsSuccess: 0,
			itemsFailed: 0,
			errors: [],
			warnings: [],
			duration: 0,
		};

		for (const localEnv of localEnvs) {
			try {
				// Check if environment already exists
				const existing = await db
					.select()
					.from(environments)
					.where(eq(environments.id, localEnv.id))
					.limit(1);

				if (existing.length > 0) {
					result.warnings.push(
						`Environment ${localEnv.id} already exists, skipping`,
					);
					result.itemsSuccess++;
					continue;
				}

				// Transform localStorage environment to database format
				const dbEnv = {
					id: localEnv.id,
					name: localEnv.name,
					description: localEnv.description,
					githubOrganization: localEnv.githubOrganization,
					githubToken: localEnv.githubToken,
					githubRepository: localEnv.githubRepository,
					createdAt:
						localEnv.createdAt instanceof Date
							? localEnv.createdAt
							: new Date(localEnv.createdAt),
					updatedAt:
						localEnv.updatedAt instanceof Date
							? localEnv.updatedAt
							: new Date(localEnv.updatedAt),
				};

				// Insert into database
				await db.insert(environments).values(dbEnv);

				// Cache in Redis (if available)
				const redis = await this.getRedisCache();
				if (redis) {
					await redis.set(`environment:${localEnv.id}`, dbEnv, { ttl: 600 });
				}

				result.itemsSuccess++;
			} catch (error) {
				result.itemsFailed++;
				result.errors.push({
					type: "ENVIRONMENT_MIGRATION_ERROR",
					message: `Failed to migrate environment ${localEnv.id}`,
					details: { environmentId: localEnv.id, error },
				});
			}
		}

		result.success = result.itemsFailed === 0;
		return result;
	}

	/**
	 * Extract data from localStorage
	 */
	private extractLocalStorageData(): LocalStorageData {
		const data: LocalStorageData = {};

		try {
			// Extract tasks
			const taskData = localStorage.getItem("task-store");
			if (taskData) {
				const parsed = JSON.parse(taskData);
				data.tasks = parsed.state?.tasks || parsed.tasks;
			}

			// Extract environments
			const envData = localStorage.getItem("environments");
			if (envData) {
				const parsed = JSON.parse(envData);
				data.environments = parsed.state?.environments || parsed.environments;
			}

			// Extract any other form data
			const formKeys = Object.keys(localStorage).filter(
				(key) => key.startsWith("form-") || key.includes("form"),
			);

			if (formKeys.length > 0) {
				data.formData = {};
				formKeys.forEach((key) => {
					try {
						data.formData![key] = JSON.parse(localStorage.getItem(key) || "{}");
					} catch {
						data.formData![key] = localStorage.getItem(key);
					}
				});
			}
		} catch (error) {
			console.error("Failed to extract localStorage data:", error);
		}

		return data;
	}

	/**
	 * Create backup of localStorage data
	 */
	private async createBackup(data: LocalStorageData): Promise<string> {
		const backupId = `backup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

		try {
			// Store backup in Redis with longer TTL (if available)
			const redis = await this.getRedisCache();
			if (redis) {
				await redis.set(`migration:backup:${backupId}`, data, {
					ttl: 86_400 * 7,
				}); // 7 days
			} else {
				console.warn("Redis not available, backup will not be stored");
			}

			return backupId;
		} catch (error) {
			console.error("Failed to create backup:", error);
			throw new Error("Failed to create migration backup");
		}
	}

	/**
	 * Clear localStorage after successful migration
	 */
	private clearLocalStorage(): void {
		try {
			localStorage.removeItem("task-store");
			localStorage.removeItem("environments");

			// Clear form data
			const formKeys = Object.keys(localStorage).filter(
				(key) => key.startsWith("form-") || key.includes("form"),
			);
			formKeys.forEach((key) => localStorage.removeItem(key));
		} catch (error) {
			console.error("Failed to clear localStorage:", error);
		}
	}

	/**
	 * Restore from backup
	 */
	async restoreFromBackup(backupId: string): Promise<boolean> {
		try {
			const redis = await this.getRedisCache();
			if (!redis) {
				throw new Error("Redis not available for backup restoration");
			}

			const backup = await redis.get<LocalStorageData>(
				`migration:backup:${backupId}`,
			);

			if (!backup) {
				throw new Error("Backup not found");
			}

			// Restore to localStorage
			if (backup.tasks) {
				localStorage.setItem(
					"task-store",
					JSON.stringify({ state: { tasks: backup.tasks } }),
				);
			}

			if (backup.environments) {
				localStorage.setItem(
					"environments",
					JSON.stringify({ state: { environments: backup.environments } }),
				);
			}

			if (backup.formData) {
				Object.entries(backup.formData).forEach(([key, value]) => {
					localStorage.setItem(
						key,
						typeof value === "string" ? value : JSON.stringify(value),
					);
				});
			}

			return true;
		} catch (error) {
			console.error("Failed to restore from backup:", error);
			return false;
		}
	}
}

// Singleton instance
export const migrationService = MigrationService.getInstance();
