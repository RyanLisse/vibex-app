/**
 * Data Migration System
 *
 * Handles migration from localStorage to database with data integrity validation,
 * progress tracking, and rollback capabilities for seamless user experience.
 */

import { db } from "@/db";
import type { NewEnvironment, NewTask } from "@/db/schema";
import { environments, tasks } from "@/db/schema";
import { logger } from "@/lib/logging";
import { observability } from "@/lib/observability";
import { backupService } from "./backup-service";
import { dataExtractor } from "./data-extractor";
import { dataMapper } from "./data-mapper";
import type { LocalStorageData, MigrationConfig, MigrationResult } from "./types";
import { validationService } from "./validation-service";

interface DatabaseData {
	tasks: NewTask[];
	environments: NewEnvironment[];
}

export interface DataMigrationManager {
	migrate(): Promise<void>;
	rollback(): Promise<void>;
	getStatus(): Promise<{ status: string; progress: number }>;
	checkMigrationNeeded(): Promise<{
		needed: boolean;
		localStorageData: LocalStorageData;
		databaseData: DatabaseData;
	}>;
	getCurrentMigration(): { status: string; progress: number } | null;
	startMigration(): Promise<{ migrationId: string; status: string }>;
}

class DataMigrationManagerImpl implements DataMigrationManager {
	private currentMigration: { status: string; progress: number; migrationId: string } | null = null;
	private readonly logger = logger.child({ component: "DataMigrationManager" });

	async migrate(): Promise<void> {
		const migrationId = `migration-${Date.now()}`;
		this.logger.info("Starting data migration", { migrationId });

		try {
			this.currentMigration = { status: "in_progress", progress: 0, migrationId };

			// Step 1: Check if migration is needed
			const migrationCheck = await this.checkMigrationNeeded();
			if (!migrationCheck.needed) {
				this.logger.info("No migration needed");
				this.currentMigration = { status: "completed", progress: 100, migrationId };
				return;
			}

			// Step 2: Create backup
			this.currentMigration.progress = 10;
			const backupId = await backupService.createBackup({
				includeLocalStorage: true,
				includeDatabase: true,
				compress: true,
			});
			this.logger.info("Backup created", { backupId });

			// Step 3: Extract data from localStorage
			this.currentMigration.progress = 30;
			const extractionResult = await dataExtractor.extractAll();
			if (extractionResult.errors.length > 0) {
				this.logger.warn("Data extraction had errors", { errors: extractionResult.errors });
			}

			// Step 4: Transform and validate data
			this.currentMigration.progress = 50;
			const transformedData = await this.transformData(extractionResult.data);

			// Step 5: Migrate to database
			this.currentMigration.progress = 70;
			await this.migrateToDatabase(transformedData);

			// Step 6: Validate migration
			this.currentMigration.progress = 90;
			const validationResult = await validationService.validateMigration();
			if (!validationResult.isValid) {
				throw new Error(`Migration validation failed: ${validationResult.errors.join(", ")}`);
			}

			// Step 7: Complete migration
			this.currentMigration = { status: "completed", progress: 100, migrationId };
			this.logger.info("Data migration completed successfully", { migrationId });

			// Record success event
			observability.recordEvent("migration.completed", {
				migrationId,
				itemsProcessed: transformedData.tasks.length + transformedData.environments.length,
			});
		} catch (error) {
			this.logger.error("Data migration failed", { error, migrationId });
			this.currentMigration = { status: "failed", progress: 0, migrationId };

			// Record failure event
			observability.recordError("migration.failed", error as Error);
			throw error;
		}
	}

	async rollback(): Promise<void> {
		if (!this.currentMigration) {
			throw new Error("No migration to rollback");
		}

		const { migrationId } = this.currentMigration;
		this.logger.info("Starting migration rollback", { migrationId });

		try {
			this.currentMigration.status = "rolling_back";
			this.currentMigration.progress = 0;

			// Find the most recent backup
			const backups = await backupService.listBackups();
			const latestBackup = backups.find((b) => b.metadata?.migrationId === migrationId);

			if (!latestBackup) {
				throw new Error("No backup found for migration rollback");
			}

			// Restore from backup
			await backupService.restoreBackup(latestBackup.id);

			this.currentMigration = { status: "rolled_back", progress: 100, migrationId };
			this.logger.info("Migration rollback completed", { migrationId });
		} catch (error) {
			this.logger.error("Migration rollback failed", { error, migrationId });
			this.currentMigration.status = "rollback_failed";
			throw error;
		}
	}

	getStatus(): Promise<{ status: string; progress: number }> {
		if (!this.currentMigration) {
			return Promise.resolve({ status: "not_started", progress: 0 });
		}
		return Promise.resolve({
			status: this.currentMigration.status,
			progress: this.currentMigration.progress,
		});
	}

	async checkMigrationNeeded(): Promise<{
		needed: boolean;
		localStorageData: LocalStorageData;
		databaseData: DatabaseData;
	}> {
		try {
			// Extract data from localStorage
			const extractionResult = await dataExtractor.extractAll();
			const localStorageData = extractionResult.data;

			// Check if there's any data in localStorage
			const hasLocalData =
				(localStorageData.tasks && localStorageData.tasks.length > 0) ||
				(localStorageData.environments && localStorageData.environments.length > 0);

			if (!hasLocalData) {
				return {
					needed: false,
					localStorageData,
					databaseData: {},
				};
			}

			// Check if data already exists in database
			const [existingTasks, existingEnvironments] = await Promise.all([
				db.select().from(tasks).limit(1),
				db.select().from(environments).limit(1),
			]);

			const hasDatabaseData = existingTasks.length > 0 || existingEnvironments.length > 0;

			return {
				needed: hasLocalData && !hasDatabaseData,
				localStorageData,
				databaseData: {
					tasks: existingTasks,
					environments: existingEnvironments,
				},
			};
		} catch (error) {
			this.logger.error("Failed to check migration status", { error });
			throw error;
		}
	}

	getCurrentMigration(): { status: string; progress: number } | null {
		if (!this.currentMigration) {
			return null;
		}
		return {
			status: this.currentMigration.status,
			progress: this.currentMigration.progress,
		};
	}

	startMigration(): Promise<{ migrationId: string; status: string }> {
		if (this.currentMigration && this.currentMigration.status === "in_progress") {
			throw new Error("Migration already in progress");
		}

		const migrationId = `migration-${Date.now()}`;
		this.currentMigration = { status: "started", progress: 0, migrationId };

		// Start migration in background
		this.migrate().catch((error) => {
			this.logger.error("Background migration failed", { error, migrationId });
		});

		return Promise.resolve({
			migrationId,
			status: "started",
		});
	}

	private transformData(
		localData: LocalStorageData
	): Promise<{ tasks: NewTask[]; environments: NewEnvironment[] }> {
		const transformedTasks: NewTask[] = [];
		const transformedEnvironments: NewEnvironment[] = [];

		// Transform tasks
		if (localData.tasks) {
			for (const task of localData.tasks) {
				try {
					const transformed = dataMapper.mapData(task, "tasks");
					transformedTasks.push(transformed);
				} catch (error) {
					this.logger.warn("Failed to transform task", { task, error });
				}
			}
		}

		// Transform environments
		if (localData.environments) {
			for (const env of localData.environments) {
				try {
					const transformed = dataMapper.mapData(env, "environments");
					transformedEnvironments.push(transformed);
				} catch (error) {
					this.logger.warn("Failed to transform environment", { env, error });
				}
			}
		}

		return Promise.resolve({
			tasks: transformedTasks,
			environments: transformedEnvironments,
		});
	}

	private async migrateToDatabase(data: {
		tasks: NewTask[];
		environments: NewEnvironment[];
	}): Promise<void> {
		try {
			// Migrate tasks
			if (data.tasks.length > 0) {
				await db.insert(tasks).values(data.tasks);
				this.logger.info(`Migrated ${data.tasks.length} tasks`);
			}

			// Migrate environments
			if (data.environments.length > 0) {
				await db.insert(environments).values(data.environments);
				this.logger.info(`Migrated ${data.environments.length} environments`);
			}
		} catch (error) {
			this.logger.error("Failed to migrate data to database", { error });
			throw error;
		}
	}
}

// Export singleton instance
export const dataMigrationManager: DataMigrationManager = new DataMigrationManagerImpl();
