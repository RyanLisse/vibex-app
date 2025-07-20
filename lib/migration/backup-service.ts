/**
 * Backup Service
 *
 * Handles backup creation and restoration for migration operations.
 * Provides rollback capabilities and data recovery.
 */

import { ulid } from "ulid";
import { db } from "@/db/config";
import type { BackupData, BackupManifest, LocalStorageData } from "./types";

export interface BackupOptions {
	source: "LOCALSTORAGE" | "DATABASE";
	includeDatabase?: boolean;
	userId?: string;
	compress?: boolean;
	description?: string;
}

export interface BackupResult {
	success: boolean;
	manifest?: BackupManifest;
	error?: string;
}

export class BackupService {
	private static instance: BackupService;
	private backups: Map<string, BackupData> = new Map();
	private readonly maxBackups = 10; // Keep last 10 backups

	static getInstance(): BackupService {
		if (!BackupService.instance) {
			BackupService.instance = new BackupService();
		}
		return BackupService.instance;
	}

	/**
	 * Create a backup from localStorage or database
	 */
	async createBackup(options: BackupOptions): Promise<BackupResult> {
		const backupId = ulid();
		const timestamp = new Date();

		try {
			let data: Record<string, unknown> = {};
			let itemCount = 0;
			let dataTypes: string[] = [];

			if (options.source === "LOCALSTORAGE") {
				const localStorageData = this.extractLocalStorageData();
				data = localStorageData;

				if (localStorageData.tasks) {
					itemCount += localStorageData.tasks.length;
					dataTypes.push("tasks");
				}
				if (localStorageData.environments) {
					itemCount += localStorageData.environments.length;
					dataTypes.push("environments");
				}
				if (localStorageData.formData) {
					itemCount += Object.keys(localStorageData.formData).length;
					dataTypes.push("formData");
				}

				// Include database data if requested
				if (options.includeDatabase) {
					const databaseData = await this.extractDatabaseData(options.userId);
					data = { ...data, database: databaseData };
					dataTypes.push("database");
				}
			} else if (options.source === "DATABASE") {
				const databaseData = await this.extractDatabaseData(options.userId);
				data = { database: databaseData };
				itemCount =
					(databaseData.tasks?.length || 0) +
					(databaseData.environments?.length || 0);
				dataTypes = ["database"];
			}

			// Create backup data
			const backupData: BackupData = {
				id: backupId,
				timestamp,
				source: options.source,
				data,
				metadata: {
					userAgent:
						typeof navigator !== "undefined" ? navigator.userAgent : "Server",
					version: "1.0.0",
					itemCount,
					size: this.calculateDataSize(data),
				},
			};

			// Compress if requested
			if (options.compress) {
				backupData.data = await this.compressData(backupData.data);
			}

			// Store backup
			this.backups.set(backupId, backupData);
			this.cleanupOldBackups();

			// Create manifest
			const manifest: BackupManifest = {
				id: backupId,
				createdAt: timestamp,
				dataTypes,
				totalItems: itemCount,
				compressed: options.compress,
				checksum: this.generateChecksum(JSON.stringify(data)),
				size: backupData.metadata.size,
			};

			return {
				success: true,
				manifest,
			};
		} catch (error) {
			return {
				success: false,
				error: `Failed to create backup: ${error.message}`,
			};
		}
	}

	/**
	 * Restore data from backup
	 */
	async restoreBackup(backupId: string): Promise<{
		success: boolean;
		restoredItems?: number;
		error?: string;
	}> {
		try {
			const backup = this.backups.get(backupId);
			if (!backup) {
				return {
					success: false,
					error: "Backup not found",
				};
			}

			let data = backup.data;

			// Decompress if needed
			if (backup.metadata.size !== this.calculateDataSize(data)) {
				data = await this.decompressData(data);
			}

			let restoredItems = 0;

			if (backup.source === "LOCALSTORAGE") {
				// Restore to localStorage
				const localData = data as LocalStorageData;

				if (localData.tasks) {
					const taskStore = {
						state: { tasks: localData.tasks },
						version: 0,
					};
					localStorage.setItem("task-store", JSON.stringify(taskStore));
					restoredItems += localData.tasks.length;
				}

				if (localData.environments) {
					const envStore = {
						state: { environments: localData.environments },
						version: 0,
					};
					localStorage.setItem("environments", JSON.stringify(envStore));
					restoredItems += localData.environments.length;
				}

				if (localData.formData) {
					Object.entries(localData.formData).forEach(([key, value]) => {
						localStorage.setItem(
							key,
							typeof value === "string" ? value : JSON.stringify(value),
						);
						restoredItems++;
					});
				}
			}

			if (data.database) {
				// Restore to database (implementation would depend on specific requirements)
				console.warn("Database restoration not implemented in this version");
			}

			return {
				success: true,
				restoredItems,
			};
		} catch (error) {
			return {
				success: false,
				error: `Failed to restore backup: ${error.message}`,
			};
		}
	}

	/**
	 * List available backups
	 */
	listBackups(): BackupManifest[] {
		return Array.from(this.backups.values())
			.map((backup) => ({
				id: backup.id,
				createdAt: backup.timestamp,
				dataTypes: this.getDataTypes(backup.data),
				totalItems: backup.metadata.itemCount,
				compressed: false, // Simplified for now
				checksum: this.generateChecksum(JSON.stringify(backup.data)),
				size: backup.metadata.size,
			}))
			.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
	}

	/**
	 * Delete a backup
	 */
	deleteBackup(backupId: string): boolean {
		return this.backups.delete(backupId);
	}

	/**
	 * Get backup details
	 */
	getBackupDetails(backupId: string): BackupData | null {
		return this.backups.get(backupId) || null;
	}

	/**
	 * Verify backup integrity
	 */
	verifyBackup(backupId: string): {
		valid: boolean;
		issues: string[];
	} {
		const backup = this.backups.get(backupId);
		const issues: string[] = [];

		if (!backup) {
			return {
				valid: false,
				issues: ["Backup not found"],
			};
		}

		// Check if data is accessible
		try {
			JSON.stringify(backup.data);
		} catch (error) {
			issues.push("Backup data is corrupted or inaccessible");
		}

		// Check timestamp
		if (
			!(backup.timestamp instanceof Date) ||
			isNaN(backup.timestamp.getTime())
		) {
			issues.push("Invalid backup timestamp");
		}

		// Check metadata
		if (!backup.metadata || typeof backup.metadata.itemCount !== "number") {
			issues.push("Invalid backup metadata");
		}

		return {
			valid: issues.length === 0,
			issues,
		};
	}

	/**
	 * Extract localStorage data
	 */
	private extractLocalStorageData(): LocalStorageData {
		const data: LocalStorageData = {};

		try {
			// Extract tasks
			const taskData = localStorage.getItem("task-store");
			if (taskData) {
				const parsed = JSON.parse(taskData);
				data.tasks = parsed?.state?.tasks || parsed?.tasks;
			}

			// Extract environments
			const envData = localStorage.getItem("environments");
			if (envData) {
				const parsed = JSON.parse(envData);
				data.environments = parsed?.state?.environments || parsed?.environments;
			}

			// Extract form data
			const formData: Record<string, unknown> = {};
			for (let i = 0; i < localStorage.length; i++) {
				const key = localStorage.key(i);
				if (
					key &&
					(key.includes("form") ||
						key.includes("draft") ||
						key.includes("temp"))
				) {
					try {
						const value = localStorage.getItem(key);
						if (value) {
							formData[key] = JSON.parse(value);
						}
					} catch {
						formData[key] = localStorage.getItem(key);
					}
				}
			}

			if (Object.keys(formData).length > 0) {
				data.formData = formData;
			}
		} catch (error) {
			console.error("Failed to extract localStorage data:", error);
		}

		return data;
	}

	/**
	 * Extract database data
	 */
	private async extractDatabaseData(userId?: string): Promise<{
		tasks?: any[];
		environments?: any[];
	}> {
		try {
			// This would be implemented based on your database schema
			// For now, returning empty structure
			return {
				tasks: [],
				environments: [],
			};
		} catch (error) {
			console.error("Failed to extract database data:", error);
			return {};
		}
	}

	/**
	 * Calculate data size in bytes
	 */
	private calculateDataSize(data: unknown): number {
		try {
			const jsonString = JSON.stringify(data);
			return new Blob([jsonString]).size;
		} catch {
			return 0;
		}
	}

	/**
	 * Generate checksum for data integrity
	 */
	private generateChecksum(data: string): string {
		let hash = 0;
		if (data.length === 0) return hash.toString();

		for (let i = 0; i < data.length; i++) {
			const char = data.charCodeAt(i);
			hash = (hash << 5) - hash + char;
			hash = hash & hash; // Convert to 32-bit integer
		}

		return Math.abs(hash).toString(16);
	}

	/**
	 * Get data types from backup data
	 */
	private getDataTypes(data: Record<string, unknown>): string[] {
		const types: string[] = [];

		if (data.tasks) types.push("tasks");
		if (data.environments) types.push("environments");
		if (data.formData) types.push("formData");
		if (data.database) types.push("database");

		return types;
	}

	/**
	 * Clean up old backups to maintain limit
	 */
	private cleanupOldBackups(): void {
		const backupIds = Array.from(this.backups.keys());
		if (backupIds.length > this.maxBackups) {
			// Sort by timestamp and remove oldest
			const sortedBackups = Array.from(this.backups.entries()).sort(
				([, a], [, b]) => a.timestamp.getTime() - b.timestamp.getTime(),
			);

			const toDelete = sortedBackups.slice(
				0,
				sortedBackups.length - this.maxBackups,
			);
			toDelete.forEach(([id]) => this.backups.delete(id));
		}
	}

	/**
	 * Compress data (simplified implementation)
	 */
	private async compressData(data: unknown): Promise<unknown> {
		// In a real implementation, you would use compression algorithms
		// For now, just return the data as-is
		return data;
	}

	/**
	 * Decompress data (simplified implementation)
	 */
	private async decompressData(data: unknown): Promise<unknown> {
		// In a real implementation, you would decompress the data
		// For now, just return the data as-is
		return data;
	}

	/**
	 * Export backup to downloadable file
	 */
	exportBackup(backupId: string): {
		success: boolean;
		blob?: Blob;
		filename?: string;
		error?: string;
	} {
		try {
			const backup = this.backups.get(backupId);
			if (!backup) {
				return {
					success: false,
					error: "Backup not found",
				};
			}

			const exportData = {
				metadata: {
					id: backup.id,
					timestamp: backup.timestamp,
					source: backup.source,
					version: "1.0.0",
				},
				data: backup.data,
			};

			const jsonString = JSON.stringify(exportData, null, 2);
			const blob = new Blob([jsonString], { type: "application/json" });
			const filename = `migration-backup-${backup.id}-${backup.timestamp.toISOString().split("T")[0]}.json`;

			return {
				success: true,
				blob,
				filename,
			};
		} catch (error) {
			return {
				success: false,
				error: `Failed to export backup: ${error.message}`,
			};
		}
	}

	/**
	 * Import backup from file
	 */
	async importBackup(file: File): Promise<{
		success: boolean;
		backupId?: string;
		error?: string;
	}> {
		try {
			const text = await file.text();
			const importData = JSON.parse(text);

			if (!(importData.metadata && importData.data)) {
				return {
					success: false,
					error: "Invalid backup file format",
				};
			}

			const backupId = importData.metadata.id || ulid();
			const backup: BackupData = {
				id: backupId,
				timestamp: new Date(importData.metadata.timestamp),
				source: importData.metadata.source || "LOCALSTORAGE",
				data: importData.data,
				metadata: {
					userAgent: "Imported",
					version: importData.metadata.version || "1.0.0",
					itemCount: this.calculateItemCount(importData.data),
					size: this.calculateDataSize(importData.data),
				},
			};

			this.backups.set(backupId, backup);
			this.cleanupOldBackups();

			return {
				success: true,
				backupId,
			};
		} catch (error) {
			return {
				success: false,
				error: `Failed to import backup: ${error.message}`,
			};
		}
	}

	/**
	 * Calculate item count from data
	 */
	private calculateItemCount(data: Record<string, unknown>): number {
		let count = 0;

		if (Array.isArray(data.tasks)) count += data.tasks.length;
		if (Array.isArray(data.environments)) count += data.environments.length;
		if (data.formData && typeof data.formData === "object") {
			count += Object.keys(data.formData).length;
		}

		return count;
	}
}

export const backupService = BackupService.getInstance();
