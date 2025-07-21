/**
 * Migration System Comprehensive Test Suite
 *
 * Tests all aspects of the migration system including data extraction,
 * transformation, validation, conflict resolution, backup/restore, and CLI operations.
 */

import {
	afterAll,
	beforeAll,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";
import { MigrationResult } from "../../lib/migration/types";

// Mock localStorage
const mockLocalStorage = (() => {
	let store: Record<string, string> = {};

	return {
		getItem: (key: string) => store[key] || null,
		setItem: (key: string, value: string) => {
			store[key] = value;
		},
		removeItem: (key: string) => {
			delete store[key];
		},
		clear: () => {
			store = {};
		},
		key: (index: number) => Object.keys(store)[index] || null,
		get length() {
			return Object.keys(store).length;
		},
	};
})();

// Mock database
const mockDb = {
	tasks: {
		findMany: vi.fn(),
		create: vi.fn(),
		update: vi.fn(),
		delete: vi.fn(),
		count: vi.fn(),
	},
	environments: {
		findMany: vi.fn(),
		create: vi.fn(),
		update: vi.fn(),
		delete: vi.fn(),
		count: vi.fn(),
	},
	$transaction: vi.fn(),
};

// Test data fixtures
const createMockTasks = (): LocalStorageTask[] => [
	{
		id: "task-1",
		title: "Test Task 1",
		description: "Description for task 1",
		status: "pending",
		priority: "high",
		assignedTo: "user-1",
		createdAt: "2024-01-01T00:00:00.000Z",
		updatedAt: "2024-01-02T00:00:00.000Z",
		dueDate: "2024-01-31T23:59:59.999Z",
		tags: ["urgent", "feature"],
		metadata: {
			category: "development",
			estimatedHours: 8,
		},
	},
	{
		id: "task-2",
		title: "Test Task 2",
		description: "Description for task 2",
		status: "in-progress",
		priority: "medium",
		assignedTo: "user-2",
		createdAt: "2024-01-03T00:00:00.000Z",
		updatedAt: "2024-01-04T00:00:00.000Z",
		tags: ["bug"],
		metadata: {
			category: "bugfix",
			estimatedHours: 4,
		},
	},
];

const createMockEnvironments = (): LocalStorageEnvironment[] => [
	{
		id: "env-1",
		name: "Development",
		description: "Development environment",
		isActive: true,
		createdAt: "2024-01-01T00:00:00.000Z",
		updatedAt: "2024-01-02T00:00:00.000Z",
		config: {
			githubOrganization: "test-org",
			githubRepository: "test-repo",
			branchName: "main",
			buildCommand: "npm run build",
			startCommand: "npm start",
			envVars: {
				NODE_ENV: "development",
			},
		},
	},
	{
		id: "env-2",
		name: "Production",
		description: "Production environment",
		isActive: false,
		createdAt: "2024-01-05T00:00:00.000Z",
		updatedAt: "2024-01-06T00:00:00.000Z",
		config: {
			githubOrganization: "test-org",
			githubRepository: "test-repo",
			branchName: "production",
			buildCommand: "npm run build:prod",
			startCommand: "npm run start:prod",
			envVars: {
				NODE_ENV: "production",
			},
		},
	},
];

const setupMockLocalStorage = () => {
	const tasks = createMockTasks();
	const environments = createMockEnvironments();

	// Store as Zustand persist format
	mockLocalStorage.setItem(
		"task-store",
		JSON.stringify({
			state: { tasks },
			version: 0,
		}),
	);

	mockLocalStorage.setItem(
		"environments",
		JSON.stringify({
			state: { environments },
			version: 0,
		}),
	);

	// Add some form data
	mockLocalStorage.setItem(
		"react-hook-form-task-form",
		JSON.stringify({ title: "Draft Task" }),
	);
	mockLocalStorage.setItem(
		"react-hook-form-env-form",
		JSON.stringify({ name: "Draft Environment" }),
	);

	// Add some random keys
	mockLocalStorage.setItem("random-key-1", "random-value-1");
	mockLocalStorage.setItem(
		"user-preferences",
		JSON.stringify({ theme: "dark" }),
	);
};

describe("Migration System Comprehensive Tests", () => {
	beforeAll(() => {
		// Mock global localStorage
		Object.defineProperty(window, "localStorage", {
			value: mockLocalStorage,
			writable: true,
		});

		// Mock console methods to reduce noise in tests
		vi.spyOn(console, "log").mockImplementation(() => {});
		vi.spyOn(console, "warn").mockImplementation(() => {});
		vi.spyOn(console, "error").mockImplementation(() => {});
	});

	beforeEach(() => {
		// Reset mocks
		vi.clearAllMocks();
		mockLocalStorage.clear();

		// Reset database mocks
		mockDb.tasks.findMany.mockResolvedValue([]);
		mockDb.tasks.create.mockResolvedValue({ id: "new-task" });
		mockDb.tasks.count.mockResolvedValue(0);
		mockDb.environments.findMany.mockResolvedValue([]);
		mockDb.environments.create.mockResolvedValue({ id: "new-env" });
		mockDb.environments.count.mockResolvedValue(0);
		mockDb.$transaction.mockImplementation((fn) => fn(mockDb));

		// Setup default localStorage data
		setupMockLocalStorage();
	});

	afterAll(() => {
		vi.restoreAllMocks();
	});

	describe("Data Extraction", () => {
		it("should extract tasks from localStorage", async () => {
			const result = await dataExtractor.extractTasks();

			expect(result.data).toHaveLength(2);
			expect(result.errors).toHaveLength(0);
			expect(result.warnings).toHaveLength(0);

			const task1 = result.data![0];
			expect(task1.id).toBe("task-1");
			expect(task1.title).toBe("Test Task 1");
			expect(task1.status).toBe("pending");
			expect(task1.tags).toEqual(["urgent", "feature"]);
		});

		it("should extract environments from localStorage", async () => {
			const result = await dataExtractor.extractEnvironments();

			expect(result.data).toHaveLength(2);
			expect(result.errors).toHaveLength(0);

			const env1 = result.data![0];
			expect(env1.id).toBe("env-1");
			expect(env1.name).toBe("Development");
			expect(env1.isActive).toBe(true);
			expect(env1.config.githubOrganization).toBe("test-org");
		});

		it("should handle missing localStorage data gracefully", async () => {
			mockLocalStorage.clear();

			const tasksResult = await dataExtractor.extractTasks();
			const envsResult = await dataExtractor.extractEnvironments();

			expect(tasksResult.data).toBeUndefined();
			expect(tasksResult.warnings).toContain(
				"No task store found in localStorage",
			);

			expect(envsResult.data).toBeUndefined();
			expect(envsResult.warnings).toContain(
				"No environments store found in localStorage",
			);
		});

		it("should handle corrupted localStorage data", async () => {
			mockLocalStorage.setItem("task-store", "invalid-json");

			const result = await dataExtractor.extractTasks();

			expect(result.data).toBeUndefined();
			expect(result.errors).toHaveLength(1);
			expect(result.errors[0].type).toBe("EXTRACTION_ERROR");
		});

		it("should extract form data from localStorage", async () => {
			const result = await dataExtractor.extractAll();

			expect(result.data.formData).toBeDefined();
			expect(Object.keys(result.data.formData!)).toContain(
				"react-hook-form-task-form",
			);
			expect(Object.keys(result.data.formData!)).toContain(
				"react-hook-form-env-form",
			);
		});

		it("should provide accurate storage statistics", () => {
			const stats = dataExtractor.getStorageStatistics();

			expect(stats.totalKeys).toBeGreaterThan(0);
			expect(stats.knownKeys).toBe(2); // task-store and environments
			expect(stats.unknownKeys).toBeGreaterThan(0);
			expect(stats.totalSize).toBeGreaterThan(0);
			expect(stats.keysSizes).toBeDefined();
		});

		it("should clear localStorage with confirmation", async () => {
			const initialLength = mockLocalStorage.length;
			expect(initialLength).toBeGreaterThan(0);

			const success = await dataExtractor.clearExtractedData(
				"CONFIRM_CLEAR_LOCALSTORAGE",
			);

			expect(success).toBe(true);
			expect(mockLocalStorage.length).toBe(0);
		});

		it("should refuse to clear localStorage without confirmation", async () => {
			const initialLength = mockLocalStorage.length;

			const success =
				await dataExtractor.clearExtractedData("wrong-confirmation");

			expect(success).toBe(false);
			expect(mockLocalStorage.length).toBe(initialLength);
		});
	});

	describe("Data Transformation", () => {
		it("should transform tasks correctly", () => {
			const tasks = createMockTasks();
			const result = dataMapper.transformTasks(tasks);

			expect(result.transformed).toHaveLength(2);
			expect(result.errors).toHaveLength(0);

			const transformed1 = result.transformed[0];
			expect(transformed1.title).toBe("Test Task 1");
			expect(transformed1.status).toBe("pending");
			expect(transformed1.priority).toBe("high");
			expect(transformed1.assignedTo).toBe("user-1");
			expect(transformed1.tags).toEqual(["urgent", "feature"]);
			expect(transformed1.metadata).toEqual({
				category: "development",
				estimatedHours: 8,
			});
		});

		it("should transform environments correctly", () => {
			const environments = createMockEnvironments();
			const result = dataMapper.transformEnvironments(environments);

			expect(result.transformed).toHaveLength(2);
			expect(result.errors).toHaveLength(0);

			const transformed1 = result.transformed[0];
			expect(transformed1.name).toBe("Development");
			expect(transformed1.description).toBe("Development environment");
			expect(transformed1.config).toEqual({
				githubOrganization: "test-org",
				githubRepository: "test-repo",
				branchName: "main",
				buildCommand: "npm run build",
				startCommand: "npm start",
				envVars: {
					NODE_ENV: "development",
				},
			});
		});

		it("should handle invalid task data", () => {
			const invalidTasks: any[] = [
				{
					id: "invalid-1",
					// Missing required fields
					status: "invalid-status",
				},
				{
					// Missing id
					title: "Valid Title",
					status: "pending",
				},
			];

			const result = dataMapper.transformTasks(invalidTasks);

			expect(result.transformed).toHaveLength(0);
			expect(result.errors).toHaveLength(2);
			expect(result.errors[0].type).toBe("VALIDATION_ERROR");
		});

		it("should detect conflicts before transformation", async () => {
			// Mock existing database data
			mockDb.tasks.findMany.mockResolvedValue([
				{
					id: "task-1",
					title: "Existing Task 1",
					status: "completed",
				},
			]);

			const tasks = createMockTasks();
			const conflicts = await dataMapper.detectConflicts(tasks, []);

			expect(conflicts.taskConflicts).toHaveLength(1);
			expect(conflicts.taskConflicts[0].localId).toBe("task-1");
			expect(conflicts.taskConflicts[0].conflictType).toBe("ID_EXISTS");
		});

		it("should apply conflict resolution strategies", () => {
			const localTask = createMockTasks()[0];
			const remoteTask = {
				...localTask,
				title: "Remote Title",
				updatedAt: "2024-01-03T00:00:00.000Z", // Newer
			};

			const resolved = dataMapper.resolveConflict(
				localTask,
				remoteTask,
				"MERGE_FAVOR_RECENT",
			);

			expect(resolved.title).toBe("Remote Title"); // Should use newer remote
			expect(resolved.id).toBe(localTask.id);
		});

		it("should validate transformed data integrity", () => {
			const tasks = createMockTasks();
			const { transformed } = dataMapper.transformTasks(tasks);

			const validation = dataMapper.validateTransformedData(transformed, []);

			expect(validation.isValid).toBe(true);
			expect(validation.errors).toHaveLength(0);
			expect(validation.summary.totalTasks).toBe(2);
			expect(validation.summary.totalEnvironments).toBe(0);
		});
	});

	describe("Backup System", () => {
		it("should create localStorage backup", async () => {
			const result = await backupService.createBackup({
				source: "LOCALSTORAGE",
				compress: false,
				description: "Test backup",
			});

			expect(result.success).toBe(true);
			expect(result.manifest).toBeDefined();
			expect(result.manifest!.source).toBe("LOCALSTORAGE");
			expect(result.manifest!.totalItems).toBeGreaterThan(0);
			expect(result.manifest!.dataTypes).toContain("tasks");
			expect(result.manifest!.dataTypes).toContain("environments");
		});

		it("should create compressed backup", async () => {
			const uncompressedResult = await backupService.createBackup({
				source: "LOCALSTORAGE",
				compress: false,
			});

			const compressedResult = await backupService.createBackup({
				source: "LOCALSTORAGE",
				compress: true,
			});

			expect(compressedResult.success).toBe(true);
			expect(compressedResult.manifest!.size).toBeLessThan(
				uncompressedResult.manifest!.size,
			);
			expect(compressedResult.manifest!.compressed).toBe(true);
		});

		it("should list backups correctly", () => {
			// Create some backups first
			const backup1: BackupManifest = {
				id: "backup-1",
				createdAt: new Date("2024-01-01"),
				source: "LOCALSTORAGE",
				totalItems: 10,
				size: 1024,
				checksum: "checksum1",
				dataTypes: ["tasks"],
				compressed: false,
			};

			const backup2: BackupManifest = {
				id: "backup-2",
				createdAt: new Date("2024-01-02"),
				source: "DATABASE",
				totalItems: 20,
				size: 2048,
				checksum: "checksum2",
				dataTypes: ["environments"],
				compressed: true,
			};

			// Mock the backup storage
			vi.spyOn(backupService, "listBackups").mockReturnValue([
				backup1,
				backup2,
			]);

			const backups = backupService.listBackups();

			expect(backups).toHaveLength(2);
			expect(backups[0].id).toBe("backup-2"); // Should be sorted by date desc
			expect(backups[1].id).toBe("backup-1");
		});

		it("should restore backup correctly", async () => {
			// First create a backup
			const createResult = await backupService.createBackup({
				source: "LOCALSTORAGE",
				compress: false,
			});

			expect(createResult.success).toBe(true);
			const backupId = createResult.manifest!.id;

			// Clear localStorage
			mockLocalStorage.clear();
			expect(mockLocalStorage.length).toBe(0);

			// Restore the backup
			const restoreResult = await backupService.restoreBackup(backupId);

			expect(restoreResult.success).toBe(true);
			expect(restoreResult.restoredItems).toBeGreaterThan(0);

			// Verify data is restored
			expect(mockLocalStorage.getItem("task-store")).toBeTruthy();
			expect(mockLocalStorage.getItem("environments")).toBeTruthy();
		});

		it("should handle backup restore failure", async () => {
			const result = await backupService.restoreBackup("non-existent-backup");

			expect(result.success).toBe(false);
			expect(result.error).toContain("Backup not found");
		});

		it("should export and import backups", async () => {
			// Create a backup first
			const createResult = await backupService.createBackup({
				source: "LOCALSTORAGE",
				compress: false,
			});

			const backupId = createResult.manifest!.id;

			// Export the backup
			const exportResult = await backupService.exportBackup(backupId);

			expect(exportResult.success).toBe(true);
			expect(exportResult.data).toBeDefined();

			// Import the backup
			const importResult = await backupService.importBackup(
				exportResult.data!,
				{
					overwriteExisting: true,
				},
			);

			expect(importResult.success).toBe(true);
			expect(importResult.backupId).toBeDefined();
		});

		it("should cleanup old backups", async () => {
			// Create multiple backups to trigger cleanup
			for (let i = 0; i < 10; i++) {
				await backupService.createBackup({
					source: "LOCALSTORAGE",
					compress: false,
				});
			}

			// Mock the cleanup to verify it's working
			const cleanupSpy = vi.spyOn(backupService as any, "cleanupOldBackups");

			await backupService.createBackup({
				source: "LOCALSTORAGE",
				compress: false,
			});

			expect(cleanupSpy).toHaveBeenCalled();
		});
	});

	describe("Migration Service Integration", () => {
		const defaultConfig: MigrationConfig = {
			dryRun: false,
			backupBeforeMigration: true,
			continueOnError: false,
			batchSize: 50,
			retryAttempts: 3,
			conflictResolution: "MERGE_FAVOR_RECENT",
			validateAfterMigration: true,
		};

		it("should perform complete migration successfully", async () => {
			const result = await migrationService.startMigration(defaultConfig);

			expect(result.success).toBe(true);
			expect(result.itemsProcessed).toBeGreaterThan(0);
			expect(result.itemsSuccess).toBe(result.itemsProcessed);
			expect(result.itemsFailed).toBe(0);
			expect(result.errors).toHaveLength(0);
			expect(result.backupId).toBeDefined();
			expect(result.duration).toBeGreaterThan(0);
		});

		it("should perform dry run migration", async () => {
			const config: MigrationConfig = {
				...defaultConfig,
				dryRun: true,
			};

			const result = await migrationService.startMigration(config);

			expect(result.success).toBe(true);
			expect(result.itemsProcessed).toBeGreaterThan(0);
			expect(result.warnings).toContain(
				"Dry run completed - no data was modified",
			);

			// Verify no actual database operations were performed
			expect(mockDb.tasks.create).not.toHaveBeenCalled();
			expect(mockDb.environments.create).not.toHaveBeenCalled();
		});

		it("should handle migration with conflicts", async () => {
			// Mock existing data to create conflicts
			mockDb.tasks.findMany.mockResolvedValue([
				{
					id: "task-1",
					title: "Existing Task",
					status: "completed",
				},
			]);

			const result = await migrationService.startMigration(defaultConfig);

			expect(result.success).toBe(true);
			expect(result.warnings).toEqual(
				expect.arrayContaining([expect.stringContaining("conflict")]),
			);
		});

		it("should continue on error when configured", async () => {
			const config: MigrationConfig = {
				...defaultConfig,
				continueOnError: true,
			};

			// Mock database error for some operations
			mockDb.tasks.create
				.mockResolvedValueOnce({ id: "task-1" })
				.mockRejectedValueOnce(new Error("Database error"));

			const result = await migrationService.startMigration(config);

			expect(result.success).toBe(true); // Should succeed with errors
			expect(result.itemsFailed).toBeGreaterThan(0);
			expect(result.errors).toHaveLength(1);
		});

		it("should stop on error when not configured to continue", async () => {
			const config: MigrationConfig = {
				...defaultConfig,
				continueOnError: false,
			};

			// Mock database error
			mockDb.tasks.create.mockRejectedValue(new Error("Database error"));

			const result = await migrationService.startMigration(config);

			expect(result.success).toBe(false);
			expect(result.errors).toHaveLength(1);
		});

		it("should handle batch processing", async () => {
			const config: MigrationConfig = {
				...defaultConfig,
				batchSize: 1, // Process one item at a time
			};

			const result = await migrationService.startMigration(config);

			expect(result.success).toBe(true);
			expect(mockDb.tasks.create).toHaveBeenCalledTimes(2); // Two tasks
			expect(mockDb.environments.create).toHaveBeenCalledTimes(2); // Two environments
		});

		it("should validate after migration", async () => {
			const result = await migrationService.startMigration(defaultConfig);

			expect(result.success).toBe(true);
			// Validation warnings would be in the warnings array if any issues found
		});

		it("should provide migration statistics", async () => {
			const stats = await migrationService.getMigrationStatistics();

			expect(stats.localStorageStats).toBeDefined();
			expect(stats.localStorageStats.totalKeys).toBeGreaterThan(0);
			expect(stats.localStorageStats.knownKeys).toBe(2);

			expect(stats.databaseStats).toBeDefined();
			expect(stats.databaseStats.taskCount).toBe(0); // No existing data
			expect(stats.databaseStats.environmentCount).toBe(0);

			expect(stats.canMigrate).toBe(true);
		});

		it("should track migration progress", async () => {
			const progressEvents: Array<{ stage: string; progress: number }> = [];

			// Mock progress callback
			const mockProgressCallback = vi.fn((stage: string, progress: number) => {
				progressEvents.push({ stage, progress });
			});

			vi.spyOn(migrationService as any, "notifyProgress").mockImplementation(
				mockProgressCallback,
			);

			await migrationService.startMigration(defaultConfig);

			expect(mockProgressCallback).toHaveBeenCalled();
			expect(progressEvents.length).toBeGreaterThan(0);
		});

		it("should handle user-specific migration", async () => {
			const userId = "user-123";
			const result = await migrationService.startMigration(
				defaultConfig,
				userId,
			);

			expect(result.success).toBe(true);
			// Verify user ID is passed to database operations
			expect(mockDb.tasks.create).toHaveBeenCalledWith(
				expect.objectContaining({
					data: expect.objectContaining({
						userId,
					}),
				}),
			);
		});
	});

	describe("Error Handling and Edge Cases", () => {
		it("should handle localStorage quota exceeded", async () => {
			// Mock localStorage quota exceeded error
			vi.spyOn(mockLocalStorage, "setItem").mockImplementation(() => {
				throw new Error("QuotaExceededError");
			});

			const result = await backupService.createBackup({
				source: "LOCALSTORAGE",
				compress: false,
			});

			expect(result.success).toBe(false);
			expect(result.error).toContain("QuotaExceededError");
		});

		it("should handle invalid JSON in localStorage", async () => {
			mockLocalStorage.setItem("task-store", "{invalid-json}");

			const result = await dataExtractor.extractTasks();

			expect(result.data).toBeUndefined();
			expect(result.errors).toHaveLength(1);
			expect(result.errors[0].message).toContain("JSON");
		});

		it("should handle empty localStorage gracefully", async () => {
			mockLocalStorage.clear();

			const result = await migrationService.startMigration(defaultConfig);

			expect(result.success).toBe(true);
			expect(result.itemsProcessed).toBe(0);
			expect(result.warnings).toContain("No data found to migrate");
		});

		it("should handle database connection errors", async () => {
			mockDb.$transaction.mockRejectedValue(
				new Error("Database connection failed"),
			);

			const result = await migrationService.startMigration(defaultConfig);

			expect(result.success).toBe(false);
			expect(result.errors).toHaveLength(1);
			expect(result.errors[0].message).toContain("Database connection failed");
		});

		it("should handle corrupted backup data", async () => {
			const result = await backupService.restoreBackup("invalid-backup-id");

			expect(result.success).toBe(false);
			expect(result.error).toContain("not found");
		});

		it("should handle concurrent migration attempts", async () => {
			// Simulate concurrent migration attempts
			const promise1 = migrationService.startMigration(defaultConfig);
			const promise2 = migrationService.startMigration(defaultConfig);

			const results = await Promise.allSettled([promise1, promise2]);

			// At least one should fail due to concurrent access protection
			const failures = results.filter(
				(r) =>
					r.status === "rejected" ||
					(r.status === "fulfilled" && !r.value.success),
			);

			expect(failures.length).toBeGreaterThan(0);
		});

		it("should handle large datasets efficiently", async () => {
			// Create large dataset
			const largeTasks = Array.from({ length: 1000 }, (_, i) => ({
				...createMockTasks()[0],
				id: `task-${i}`,
				title: `Task ${i}`,
			}));

			mockLocalStorage.setItem(
				"task-store",
				JSON.stringify({
					state: { tasks: largeTasks },
					version: 0,
				}),
			);

			const startTime = Date.now();
			const result = await migrationService.startMigration({
				...defaultConfig,
				batchSize: 100,
			});
			const duration = Date.now() - startTime;

			expect(result.success).toBe(true);
			expect(result.itemsProcessed).toBe(1000 + 2); // Large tasks + environments
			expect(duration).toBeLessThan(10_000); // Should complete within 10 seconds
		});

		it("should handle memory constraints during migration", async () => {
			// Test with limited batch size to simulate memory constraints
			const config: MigrationConfig = {
				...defaultConfig,
				batchSize: 1, // Very small batch to test memory handling
			};

			const result = await migrationService.startMigration(config);

			expect(result.success).toBe(true);
			// Should process all items despite small batch size
			expect(result.itemsProcessed).toBeGreaterThan(0);
		});
	});

	describe("Performance and Optimization", () => {
		it("should complete migration within reasonable time", async () => {
			const startTime = Date.now();
			const result = await migrationService.startMigration(defaultConfig);
			const duration = Date.now() - startTime;

			expect(result.success).toBe(true);
			expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
		});

		it("should use efficient batch processing", async () => {
			const config: MigrationConfig = {
				...defaultConfig,
				batchSize: 100,
			};

			const result = await migrationService.startMigration(config);

			expect(result.success).toBe(true);
			// Should use transactions for batch processing
			expect(mockDb.$transaction).toHaveBeenCalled();
		});

		it("should handle retry logic correctly", async () => {
			const config: MigrationConfig = {
				...defaultConfig,
				retryAttempts: 2,
				continueOnError: true,
			};

			// Mock intermittent failure
			let callCount = 0;
			mockDb.tasks.create.mockImplementation(() => {
				callCount++;
				if (callCount === 1) {
					throw new Error("Temporary error");
				}
				return Promise.resolve({ id: "task-created" });
			});

			const result = await migrationService.startMigration(config);

			expect(result.success).toBe(true);
			expect(mockDb.tasks.create).toHaveBeenCalledTimes(3); // Original + 2 retries
		});

		it("should optimize backup compression", async () => {
			const uncompressedResult = await backupService.createBackup({
				source: "LOCALSTORAGE",
				compress: false,
			});

			const compressedResult = await backupService.createBackup({
				source: "LOCALSTORAGE",
				compress: true,
			});

			expect(compressedResult.manifest!.size).toBeLessThan(
				uncompressedResult.manifest!.size,
			);

			// Compression should reduce size by at least 10%
			const compressionRatio =
				compressedResult.manifest!.size / uncompressedResult.manifest!.size;
			expect(compressionRatio).toBeLessThan(0.9);
		});
	});
});
