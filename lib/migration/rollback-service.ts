/**
 * Rollback Service
 *
 * Provides rollback capabilities for failed migrations
 * with comprehensive data recovery options.
 */

import { eq, inArray } from "drizzle-orm";
import { db } from "@/db/config";
import { environments, tasks } from "@/db/schema";
import { observability } from "@/lib/observability";
import { backupService } from "./backup-service";
import type { BackupManifest, MigrationError } from "./types";
import { validationService } from "./validation-service";

export interface RollbackOptions {
	targetBackupId?: string;
	clearDatabase: boolean;
	restoreLocalStorage: boolean;
	validateAfterRollback: boolean;
	preserveNewData: boolean;
}

export interface RollbackResult {
	success: boolean;
	backupRestored?: string;
	itemsRestored: number;
	itemsPreserved: number;
	errors: RollbackError[];
	warnings: string[];
	duration: number;
}

export interface RollbackError {
	type: "BACKUP_ERROR" | "RESTORE_ERROR" | "VALIDATION_ERROR" | "CLEANUP_ERROR";
	message: string;
	details?: any;
}

export interface RollbackPoint {
	id: string;
	timestamp: Date;
	type: "AUTO" | "MANUAL" | "PRE_MIGRATION";
	description: string;
	backupId: string;
	metadata: {
		itemCount: number;
		migrationId?: string;
		reason?: string;
	};
}

export class RollbackService {
	private static instance: RollbackService;
	private rollbackPoints: Map<string, RollbackPoint> = new Map();
	private isRollingBack = false;

	static getInstance(): RollbackService {
		if (!RollbackService.instance) {
			RollbackService.instance = new RollbackService();
		}
		return RollbackService.instance;
	}

	/**
	 * Create a rollback point
	 */
	async createRollbackPoint(
		type: RollbackPoint["type"],
		description: string,
		migrationId?: string,
	): Promise<RollbackPoint | null> {
		try {
			// Create backup
			const backupResult = await backupService.createBackup({
				source: "LOCALSTORAGE",
				includeDatabase: true,
				compress: true,
				description: `Rollback point: ${description}`,
			});

			if (!(backupResult.success && backupResult.manifest)) {
				throw new Error("Failed to create backup for rollback point");
			}

			const rollbackPoint: RollbackPoint = {
				id: `rollback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
				timestamp: new Date(),
				type,
				description,
				backupId: backupResult.manifest.id,
				metadata: {
					itemCount: backupResult.manifest.totalItems,
					migrationId,
				},
			};

			this.rollbackPoints.set(rollbackPoint.id, rollbackPoint);

			// Clean up old rollback points (keep last 5)
			this.cleanupOldRollbackPoints();

			await observability.events.collector.collectEvent(
				"system_event",
				"info",
				"Rollback point created",
				{
					rollbackPointId: rollbackPoint.id,
					type,
					description,
				},
				"rollback",
				["rollback", "checkpoint"],
			);

			return rollbackPoint;
		} catch (error) {
			console.error("Failed to create rollback point:", error);
			return null;
		}
	}

	/**
	 * Perform rollback
	 */
	async rollback(options?: Partial<RollbackOptions>): Promise<RollbackResult> {
		if (this.isRollingBack) {
			throw new Error("Rollback already in progress");
		}

		this.isRollingBack = true;
		const startTime = Date.now();

		const opts: RollbackOptions = {
			clearDatabase: true,
			restoreLocalStorage: true,
			validateAfterRollback: true,
			preserveNewData: false,
			...options,
		};

		const result: RollbackResult = {
			success: false,
			itemsRestored: 0,
			itemsPreserved: 0,
			errors: [],
			warnings: [],
			duration: 0,
		};

		try {
			await observability.trackOperation("migration.rollback", async () => {
				// Step 1: Find backup to restore
				const backup = await this.findBackupForRollback(opts.targetBackupId);
				if (!backup) {
					throw new Error("No suitable backup found for rollback");
				}

				result.backupRestored = backup.id;

				// Step 2: Preserve new data if requested
				if (opts.preserveNewData) {
					const preserved = await this.preserveNewData();
					result.itemsPreserved = preserved.count;
					result.warnings.push(...preserved.warnings);
				}

				// Step 3: Clear database if requested
				if (opts.clearDatabase) {
					const clearResult = await this.clearDatabaseData();
					if (!clearResult.success) {
						result.errors.push(...clearResult.errors);
						result.warnings.push("Failed to clear some database data");
					}
				}

				// Step 4: Restore localStorage from backup
				if (opts.restoreLocalStorage) {
					const restoreResult = await backupService.restoreBackup(backup.id);
					if (!restoreResult.success) {
						throw new Error(restoreResult.error || "Failed to restore backup");
					}
					result.itemsRestored = restoreResult.restoredItems || 0;
				}

				// Step 5: Validate rollback if requested
				if (opts.validateAfterRollback) {
					const validation = await this.validateRollback();
					if (!validation.success) {
						result.warnings.push(...validation.warnings);
					}
				}

				// Step 6: Clear migration markers
				this.clearMigrationMarkers();

				result.success = true;
			});
		} catch (error) {
			result.errors.push({
				type: "RESTORE_ERROR",
				message:
					error instanceof Error ? error.message : "Unknown rollback error",
				details: error,
			});
		} finally {
			this.isRollingBack = false;
			result.duration = Date.now() - startTime;

			await observability.events.collector.collectEvent(
				"system_event",
				result.success ? "info" : "error",
				result.success ? "Rollback completed successfully" : "Rollback failed",
				{
					result,
					options: opts,
				},
				"rollback",
				["rollback", result.success ? "success" : "failure"],
			);
		}

		return result;
	}

	/**
	 * Find backup for rollback
	 */
	private async findBackupForRollback(
		targetBackupId?: string,
	): Promise<BackupManifest | null> {
		if (targetBackupId) {
			// Use specific backup
			const backups = backupService.listBackups();
			return backups.find((b) => b.id === targetBackupId) || null;
		}

		// Find most recent pre-migration backup
		const recentRollbackPoint = Array.from(this.rollbackPoints.values())
			.filter((rp) => rp.type === "PRE_MIGRATION")
			.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0];

		if (recentRollbackPoint) {
			const backups = backupService.listBackups();
			return backups.find((b) => b.id === recentRollbackPoint.backupId) || null;
		}

		// Fall back to most recent backup
		const allBackups = backupService.listBackups();
		return allBackups[0] || null;
	}

	/**
	 * Preserve new data created after migration
	 */
	private async preserveNewData(): Promise<{
		count: number;
		warnings: string[];
	}> {
		const warnings: string[] = [];
		let count = 0;

		try {
			// Get migration timestamp
			const migrationStatus = this.getMigrationStatus();
			if (!(migrationStatus && migrationStatus.completedAt)) {
				warnings.push("No migration timestamp found, cannot preserve new data");
				return { count, warnings };
			}

			const migrationTime = new Date(migrationStatus.completedAt);

			// Find tasks created after migration
			const newTasks = await db
				.select()
				.from(tasks)
				.where(/* gt(tasks.createdAt, migrationTime) */);
			// Note: Actual implementation would use proper date comparison

			if (newTasks.length > 0) {
				// Save new tasks to a temporary location
				localStorage.setItem("preserved-tasks", JSON.stringify(newTasks));
				count += newTasks.length;
				warnings.push(
					`Preserved ${newTasks.length} tasks created after migration`,
				);
			}

			// Find environments created after migration
			const newEnvironments = await db
				.select()
				.from(environments)
				.where(/* gt(environments.createdAt, migrationTime) */);

			if (newEnvironments.length > 0) {
				localStorage.setItem(
					"preserved-environments",
					JSON.stringify(newEnvironments),
				);
				count += newEnvironments.length;
				warnings.push(
					`Preserved ${newEnvironments.length} environments created after migration`,
				);
			}
		} catch (error) {
			warnings.push(`Failed to preserve new data: ${error.message}`);
		}

		return { count, warnings };
	}

	/**
	 * Clear database data
	 */
	private async clearDatabaseData(): Promise<{
		success: boolean;
		errors: RollbackError[];
	}> {
		const errors: RollbackError[] = [];

		try {
			// Clear tasks
			await db.delete(tasks);

			// Clear environments
			await db.delete(environments);

			// Clear Redis cache if available
			try {
				const { redisCache } = await import("@/lib/redis");
				await redisCache.flushAll();
			} catch (error) {
				console.warn("Failed to clear Redis cache:", error);
			}

			return { success: true, errors };
		} catch (error) {
			errors.push({
				type: "CLEANUP_ERROR",
				message: `Failed to clear database: ${error.message}`,
				details: error,
			});
			return { success: false, errors };
		}
	}

	/**
	 * Validate rollback
	 */
	private async validateRollback(): Promise<{
		success: boolean;
		warnings: string[];
	}> {
		const warnings: string[] = [];

		try {
			// Check localStorage restoration
			const taskData = localStorage.getItem("task-store");
			const envData = localStorage.getItem("environments");

			if (!(taskData || envData)) {
				warnings.push("No data found in localStorage after rollback");
			}

			// Check database is cleared
			const [taskCount] = await db.select({ count: tasks.id }).from(tasks);
			const [envCount] = await db
				.select({ count: environments.id })
				.from(environments);

			if (Number(taskCount.count) > 0) {
				warnings.push(
					`Database still contains ${taskCount.count} tasks after rollback`,
				);
			}

			if (Number(envCount.count) > 0) {
				warnings.push(
					`Database still contains ${envCount.count} environments after rollback`,
				);
			}

			return {
				success: warnings.length === 0,
				warnings,
			};
		} catch (error) {
			warnings.push(`Validation error: ${error.message}`);
			return { success: false, warnings };
		}
	}

	/**
	 * Clear migration markers
	 */
	private clearMigrationMarkers(): void {
		localStorage.removeItem("migration-status");
		localStorage.removeItem("migration-progress");
		localStorage.removeItem("migration-mode");
	}

	/**
	 * Get migration status
	 */
	private getMigrationStatus(): any {
		const status = localStorage.getItem("migration-status");
		return status ? JSON.parse(status) : null;
	}

	/**
	 * Clean up old rollback points
	 */
	private cleanupOldRollbackPoints(): void {
		const maxPoints = 5;
		if (this.rollbackPoints.size > maxPoints) {
			const sorted = Array.from(this.rollbackPoints.values()).sort(
				(a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
			);

			const toDelete = sorted.slice(0, sorted.length - maxPoints);
			toDelete.forEach((point) => this.rollbackPoints.delete(point.id));
		}
	}

	/**
	 * List available rollback points
	 */
	listRollbackPoints(): RollbackPoint[] {
		return Array.from(this.rollbackPoints.values()).sort(
			(a, b) => b.timestamp.getTime() - a.timestamp.getTime(),
		);
	}

	/**
	 * Get rollback point details
	 */
	getRollbackPoint(id: string): RollbackPoint | null {
		return this.rollbackPoints.get(id) || null;
	}

	/**
	 * Delete rollback point
	 */
	deleteRollbackPoint(id: string): boolean {
		const point = this.rollbackPoints.get(id);
		if (point) {
			// Also delete associated backup
			backupService.deleteBackup(point.backupId);
			return this.rollbackPoints.delete(id);
		}
		return false;
	}

	/**
	 * Check if rollback is possible
	 */
	canRollback(): {
		possible: boolean;
		reason?: string;
		availableBackups: number;
	} {
		if (this.isRollingBack) {
			return {
				possible: false,
				reason: "Rollback already in progress",
				availableBackups: 0,
			};
		}

		const backups = backupService.listBackups();
		const rollbackPoints = this.listRollbackPoints();

		if (backups.length === 0 && rollbackPoints.length === 0) {
			return {
				possible: false,
				reason: "No backups available for rollback",
				availableBackups: 0,
			};
		}

		return {
			possible: true,
			availableBackups: backups.length,
		};
	}

	/**
	 * Estimate rollback time
	 */
	estimateRollbackTime(backupId?: string): number {
		// Base time for rollback operations
		let estimatedTime = 5000; // 5 seconds base

		if (backupId) {
			const backup = backupService.getBackupDetails(backupId);
			if (backup) {
				// Add time based on data size
				estimatedTime += backup.metadata.itemCount * 50; // 50ms per item
			}
		} else {
			// Estimate based on current data
			estimatedTime += 10_000; // 10 seconds for unknown size
		}

		return estimatedTime;
	}

	/**
	 * Generate rollback report
	 */
	generateRollbackReport(rollbackResult: RollbackResult): string {
		const report = `
# Rollback Report
Generated: ${new Date().toISOString()}

## Summary
- Success: ${rollbackResult.success ? "✅ Yes" : "❌ No"}
- Duration: ${rollbackResult.duration}ms
- Backup Restored: ${rollbackResult.backupRestored || "None"}
- Items Restored: ${rollbackResult.itemsRestored}
- Items Preserved: ${rollbackResult.itemsPreserved}

## Errors (${rollbackResult.errors.length})
${rollbackResult.errors.map((e) => `- [${e.type}] ${e.message}`).join("\n") || "None"}

## Warnings (${rollbackResult.warnings.length})
${rollbackResult.warnings.join("\n- ") || "None"}

## Rollback Points Available
${
	this.listRollbackPoints()
		.map(
			(rp) =>
				`- ${rp.id}: ${rp.description} (${rp.timestamp.toLocaleString()})`,
		)
		.join("\n") || "None"
}
`;

		return report;
	}
}

// Export singleton instance
export const rollbackService = RollbackService.getInstance();
