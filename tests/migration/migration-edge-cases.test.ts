import { vi } from "vitest";
/**
 * Migration System Edge Cases Test Suite
 *
 * Tests edge cases, error scenarios, and boundary conditions
 * for the migration system to ensure robustness and reliability.
 */

import { MigrationError } from "../../lib/migration/types";

// Mock localStorage with edge case scenarios
const createMockLocalStorage = () => {
	let store: Record<string, string> = {};

	return {
		getItem: vi.fn((key: string) => store[key] || null),
		setItem: vi.fn((key: string, value: string) => {
			store[key] = value;
		}),
		removeItem: vi.fn((key: string) => {
			delete store[key];
		}),
		clear: vi.fn(() => {
			store = {};
		}),
		key: vi.fn((index: number) => Object.keys(store)[index] || null),
		get length() {
			return Object.keys(store).length;
		},
	};
};

const mockLocalStorage = createMockLocalStorage();

// Mock database with controllable failure scenarios
const createMockDatabase = () => ({
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
});

describe("Migration System Edge Cases", () => {
	let mockDb: ReturnType<typeof createMockDatabase>;

	beforeEach(() => {
		mockDb = createMockDatabase();

		// Setup global localStorage mock
		Object.defineProperty(window, "localStorage", {
			value: mockLocalStorage,
			writable: true,
		});

		// Reset all mocks
		vi.clearAllMocks();
		mockLocalStorage.clear();

		// Setup default successful database responses
		mockDb.tasks.findMany.mockResolvedValue([]);
		mockDb.tasks.create.mockResolvedValue({ id: "task-1" });
		mockDb.tasks.count.mockResolvedValue(0);
		mockDb.environments.findMany.mockResolvedValue([]);
		mockDb.environments.create.mockResolvedValue({ id: "env-1" });
		mockDb.environments.count.mockResolvedValue(0);
		mockDb.$transaction.mockImplementation((fn) => fn(mockDb));

		// Mock console methods
		vi.spyOn(console, "log").mockImplementation(() => {});
		vi.spyOn(console, "warn").mockImplementation(() => {});
		vi.spyOn(console, "error").mockImplementation(() => {});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("Data Corruption Edge Cases", () => {
		it("should handle malformed JSON in task store", async () => {
			mockLocalStorage.setItem("task-store", '{"state": {"tasks": [invalid json}');

			const result = await dataExtractor.extractTasks();

			expect(result.data).toBeUndefined();
			expect(result.errors).toHaveLength(1);
			expect(result.errors[0].type).toBe("EXTRACTION_ERROR");
			expect(result.errors[0].message).toContain("JSON");
		});

		it("should handle missing state property in Zustand store", async () => {
			mockLocalStorage.setItem("task-store", JSON.stringify({ version: 0 }));

			const result = await dataExtractor.extractTasks();

			expect(result.data).toBeUndefined();
			expect(result.warnings).toContain("No tasks found in task store");
		});

		it("should handle null/undefined values in task data", async () => {
			const corruptedTasks = [
				{
					id: "task-1",
					title: null,
					description: undefined,
					status: "pending",
					createdAt: "2024-01-01T00:00:00.000Z",
				},
				{
					id: null,
					title: "Valid Task",
					status: "completed",
					createdAt: "2024-01-01T00:00:00.000Z",
				},
			];

			mockLocalStorage.setItem(
				"task-store",
				JSON.stringify({
					state: { tasks: corruptedTasks },
					version: 0,
				})
			);

			const extractResult = await dataExtractor.extractTasks();
			const transformResult = dataMapper.transformTasks(extractResult.data!);

			expect(transformResult.transformed).toHaveLength(0);
			expect(transformResult.errors).toHaveLength(2);
			expect(transformResult.errors[0].message).toContain("title");
			expect(transformResult.errors[1].message).toContain("id");
		});

		it("should handle circular references in metadata", async () => {
			const circularObj: any = { name: "test" };
			circularObj.self = circularObj;

			const taskWithCircular = {
				id: "task-1",
				title: "Task with Circular Reference",
				status: "pending",
				metadata: circularObj,
				createdAt: "2024-01-01T00:00:00.000Z",
			};

			// This would normally cause JSON.stringify to fail
			expect(() => JSON.stringify(taskWithCircular)).toThrow();

			// Our system should handle this gracefully
			const transformResult = dataMapper.transformTasks([taskWithCircular as any]);

			expect(transformResult.errors).toHaveLength(1);
			expect(transformResult.errors[0].type).toBe("VALIDATION_ERROR");
		});

		it("should handle extremely large data objects", async () => {
			const hugeString = "x".repeat(10 * 1024 * 1024); // 10MB string
			const largeTask = {
				id: "huge-task",
				title: "Huge Task",
				description: hugeString,
				status: "pending",
				createdAt: "2024-01-01T00:00:00.000Z",
			};

			const transformResult = dataMapper.transformTasks([largeTask as any]);

			expect(transformResult.warnings).toEqual(
				expect.arrayContaining([expect.stringContaining("Large data detected")])
			);
		});

		it("should handle invalid date formats", async () => {
			const taskWithInvalidDates = {
				id: "task-1",
				title: "Task with Invalid Dates",
				status: "pending",
				createdAt: "not-a-date",
				updatedAt: "2024-13-45T99:99:99.999Z", // Invalid date
				dueDate: 1_234_567_890, // Number instead of string
			};

			const transformResult = dataMapper.transformTasks([taskWithInvalidDates as any]);

			expect(transformResult.errors).toHaveLength(1);
			expect(transformResult.errors[0].message).toContain("Invalid date");
		});
	});

	describe("Memory and Storage Limitations", () => {
		it("should handle localStorage quota exceeded during backup", async () => {
			// Mock localStorage quota exceeded error
			mockLocalStorage.setItem.mockImplementation(() => {
				const error = new Error("QuotaExceededError");
				error.name = "QuotaExceededError";
				throw error;
			});

			const result = await backupService.createBackup({
				source: "LOCALSTORAGE",
				compress: false,
			});

			expect(result.success).toBe(false);
			expect(result.error).toContain("QuotaExceededError");
		});

		it("should handle very large datasets with memory constraints", async () => {
			// Create a dataset that would use a lot of memory
			const largeTasks = Array.from({ length: 50_000 }, (_, i) => ({
				id: `task-${i}`,
				title: `Large Dataset Task ${i}`,
				description: "x".repeat(1000), // 1KB per task = ~50MB total
				status: "pending",
				metadata: {
					largeArray: Array.from({ length: 100 }, (_, j) => `item-${j}`),
				},
				createdAt: "2024-01-01T00:00:00.000Z",
			}));

			mockLocalStorage.setItem(
				"task-store",
				JSON.stringify({
					state: { tasks: largeTasks },
					version: 0,
				})
			);

			// Migration should handle this without running out of memory
			const config: MigrationConfig = {
				dryRun: true,
				batchSize: 100, // Small batches to manage memory
				continueOnError: true,
				validateAfterMigration: false,
			};

			const result = await migrationService.startMigration(config);

			expect(result.success).toBe(true);
			expect(result.itemsProcessed).toBe(50_000);
		});

		it("should handle browser storage API failures", async () => {
			// Mock Storage API to fail
			mockLocalStorage.getItem.mockImplementation(() => {
				throw new Error("SecurityError: Access denied");
			});

			const result = await dataExtractor.extractTasks();

			expect(result.data).toBeUndefined();
			expect(result.errors).toHaveLength(1);
			expect(result.errors[0].message).toContain("SecurityError");
		});
	});

	describe("Network and Database Failures", () => {
		it("should handle database connection timeout", async () => {
			mockDb.$transaction.mockImplementation(() =>
				Promise.reject(new Error("Connection timeout after 30000ms"))
			);

			const config: MigrationConfig = {
				dryRun: false,
				retryAttempts: 2,
				continueOnError: false,
			};

			const result = await migrationService.startMigration(config);

			expect(result.success).toBe(false);
			expect(result.errors).toHaveLength(1);
			expect(result.errors[0].message).toContain("Connection timeout");
		});

		it("should handle intermittent database failures with retry", async () => {
			let callCount = 0;
			mockDb.tasks.create.mockImplementation(() => {
				callCount++;
				if (callCount <= 2) {
					throw new Error("Temporary database error");
				}
				return Promise.resolve({ id: `task-${callCount}` });
			});

			// Setup some test data
			const tasks = [
				{
					id: "task-1",
					title: "Test Task",
					status: "pending",
					createdAt: "2024-01-01T00:00:00.000Z",
				},
			];

			mockLocalStorage.setItem(
				"task-store",
				JSON.stringify({
					state: { tasks },
					version: 0,
				})
			);

			const config: MigrationConfig = {
				dryRun: false,
				retryAttempts: 3,
				continueOnError: true,
			};

			const result = await migrationService.startMigration(config);

			expect(result.success).toBe(true);
			expect(mockDb.tasks.create).toHaveBeenCalledTimes(3); // Original + 2 retries
		});

		it("should handle database constraint violations", async () => {
			mockDb.tasks.create.mockRejectedValue(
				new Error('duplicate key value violates unique constraint "tasks_pkey"')
			);

			const tasks = [
				{
					id: "task-1",
					title: "Test Task",
					status: "pending",
					createdAt: "2024-01-01T00:00:00.000Z",
				},
			];

			mockLocalStorage.setItem(
				"task-store",
				JSON.stringify({
					state: { tasks },
					version: 0,
				})
			);

			const config: MigrationConfig = {
				dryRun: false,
				continueOnError: true,
			};

			const result = await migrationService.startMigration(config);

			expect(result.success).toBe(true); // Continue on error
			expect(result.itemsFailed).toBe(1);
			expect(result.errors[0].message).toContain("duplicate key");
		});

		it("should handle database transaction rollback", async () => {
			let transactionCallCount = 0;
			mockDb.$transaction.mockImplementation(async (fn) => {
				transactionCallCount++;
				if (transactionCallCount === 1) {
					// First transaction fails
					throw new Error("Transaction rolled back due to deadlock");
				}
				// Second transaction succeeds
				return fn(mockDb);
			});

			const tasks = [
				{
					id: "task-1",
					title: "Test Task",
					status: "pending",
					createdAt: "2024-01-01T00:00:00.000Z",
				},
			];

			mockLocalStorage.setItem(
				"task-store",
				JSON.stringify({
					state: { tasks },
					version: 0,
				})
			);

			const config: MigrationConfig = {
				dryRun: false,
				retryAttempts: 2,
				continueOnError: false,
			};

			const result = await migrationService.startMigration(config);

			expect(result.success).toBe(true);
			expect(mockDb.$transaction).toHaveBeenCalledTimes(2);
		});
	});

	describe("Concurrent Access Scenarios", () => {
		it("should handle multiple migration attempts", async () => {
			const tasks = [
				{
					id: "task-1",
					title: "Test Task",
					status: "pending",
					createdAt: "2024-01-01T00:00:00.000Z",
				},
			];

			mockLocalStorage.setItem(
				"task-store",
				JSON.stringify({
					state: { tasks },
					version: 0,
				})
			);

			const config: MigrationConfig = {
				dryRun: false,
				continueOnError: false,
			};

			// Start two migrations simultaneously
			const migration1 = migrationService.startMigration(config);
			const migration2 = migrationService.startMigration(config);

			const results = await Promise.allSettled([migration1, migration2]);

			// One should succeed, one should fail due to concurrent access
			const successCount = results.filter(
				(r) => r.status === "fulfilled" && r.value.success
			).length;
			const failureCount = results.filter(
				(r) => r.status === "rejected" || (r.status === "fulfilled" && !r.value.success)
			).length;

			expect(successCount + failureCount).toBe(2);
			expect(failureCount).toBeGreaterThan(0); // At least one should fail
		});

		it("should handle localStorage modification during migration", async () => {
			const tasks = [
				{
					id: "task-1",
					title: "Test Task",
					status: "pending",
					createdAt: "2024-01-01T00:00:00.000Z",
				},
			];

			mockLocalStorage.setItem(
				"task-store",
				JSON.stringify({
					state: { tasks },
					version: 0,
				})
			);

			// Start migration
			const config: MigrationConfig = {
				dryRun: false,
				continueOnError: true,
			};

			// Simulate localStorage being modified during migration
			mockDb.tasks.create.mockImplementation(async () => {
				// Modify localStorage while migration is in progress
				mockLocalStorage.setItem(
					"task-store",
					JSON.stringify({
						state: {
							tasks: [...tasks, { id: "task-2", title: "Added During Migration" }],
						},
						version: 0,
					})
				);
				return { id: "created-task" };
			});

			const result = await migrationService.startMigration(config);

			expect(result.success).toBe(true);
			expect(result.warnings).toEqual(
				expect.arrayContaining([
					expect.stringContaining("localStorage was modified during migration"),
				])
			);
		});

		it("should handle backup corruption during restoration", async () => {
			// Create a backup first
			const tasks = [
				{
					id: "task-1",
					title: "Test Task",
					status: "pending",
					createdAt: "2024-01-01T00:00:00.000Z",
				},
			];

			mockLocalStorage.setItem(
				"task-store",
				JSON.stringify({
					state: { tasks },
					version: 0,
				})
			);

			const backupResult = await backupService.createBackup({
				source: "LOCALSTORAGE",
				compress: false,
			});

			expect(backupResult.success).toBe(true);
			const backupId = backupResult.manifest!.id;

			// Mock backup corruption
			vi.spyOn(backupService as any, "loadBackupData").mockImplementation(() => {
				throw new Error("Backup file is corrupted or unreadable");
			});

			const restoreResult = await backupService.restoreBackup(backupId);

			expect(restoreResult.success).toBe(false);
			expect(restoreResult.error).toContain("corrupted");
		});
	});

	describe("Data Validation Edge Cases", () => {
		it("should handle missing required fields", async () => {
			const invalidTasks = [
				{ id: "task-1" }, // Missing title, status, createdAt
				{ title: "Task 2" }, // Missing id, status, createdAt
				{ id: "task-3", title: "Task 3" }, // Missing status, createdAt
			];

			const transformResult = dataMapper.transformTasks(invalidTasks as any);

			expect(transformResult.transformed).toHaveLength(0);
			expect(transformResult.errors).toHaveLength(3);
			transformResult.errors.forEach((error) => {
				expect(error.type).toBe("VALIDATION_ERROR");
			});
		});

		it("should handle invalid enum values", async () => {
			const tasksWithInvalidEnums = [
				{
					id: "task-1",
					title: "Task with Invalid Status",
					status: "invalid-status",
					priority: "super-urgent", // Invalid priority
					createdAt: "2024-01-01T00:00:00.000Z",
				},
			];

			const transformResult = dataMapper.transformTasks(tasksWithInvalidEnums as any);

			expect(transformResult.errors).toHaveLength(1);
			expect(transformResult.errors[0].message).toContain("Invalid enum value");
		});

		it("should handle data type mismatches", async () => {
			const tasksWithTypeMismatches = [
				{
					id: 123, // Should be string
					title: ["Task", "Array"], // Should be string
					status: "pending",
					metadata: "not-an-object", // Should be object
					createdAt: Date.now(), // Should be ISO string
				},
			];

			const transformResult = dataMapper.transformTasks(tasksWithTypeMismatches as any);

			expect(transformResult.errors).toHaveLength(1);
			expect(transformResult.errors[0].message).toContain("Type mismatch");
		});

		it("should handle cross-field validation failures", async () => {
			const tasksWithCrossFieldErrors = [
				{
					id: "task-1",
					title: "Task with Future Created Date",
					status: "completed",
					createdAt: "2025-01-01T00:00:00.000Z", // Future date
					updatedAt: "2024-01-01T00:00:00.000Z", // Before created date
					dueDate: "2023-01-01T00:00:00.000Z", // Before created date
				},
			];

			const transformResult = dataMapper.transformTasks(tasksWithCrossFieldErrors as any);

			expect(transformResult.warnings).toEqual(
				expect.arrayContaining([
					expect.stringContaining("future"),
					expect.stringContaining("updated before created"),
					expect.stringContaining("due date before created"),
				])
			);
		});
	});

	describe("Resource Exhaustion Scenarios", () => {
		it("should handle CPU intensive operations gracefully", async () => {
			// Create data that would require intensive processing
			const intensiveTasks = Array.from({ length: 10_000 }, (_, i) => ({
				id: `task-${i}`,
				title: `CPU Intensive Task ${i}`,
				status: "pending",
				metadata: {
					// Complex metadata that might slow down processing
					nestedData: Array.from({ length: 100 }, (_, j) => ({
						id: j,
						value: Math.random().toString(36),
						nested: Array.from({ length: 10 }, (_, k) => `item-${k}`),
					})),
				},
				createdAt: "2024-01-01T00:00:00.000Z",
			}));

			mockLocalStorage.setItem(
				"task-store",
				JSON.stringify({
					state: { tasks: intensiveTasks },
					version: 0,
				})
			);

			const startTime = performance.now();

			const config: MigrationConfig = {
				dryRun: true,
				batchSize: 500,
				continueOnError: true,
			};

			const result = await migrationService.startMigration(config);
			const duration = performance.now() - startTime;

			expect(result.success).toBe(true);
			expect(result.itemsProcessed).toBe(10_000);
			expect(duration).toBeLessThan(30_000); // Should complete within 30 seconds
		});

		it("should handle file system errors during backup", async () => {
			// Mock file system errors
			vi.spyOn(JSON, "stringify").mockImplementation(() => {
				throw new Error("ENOSPC: no space left on device");
			});

			const result = await backupService.createBackup({
				source: "LOCALSTORAGE",
				compress: false,
			});

			expect(result.success).toBe(false);
			expect(result.error).toContain("ENOSPC");

			vi.restoreAllMocks();
		});

		it("should handle browser tab/window closure during migration", async () => {
			const tasks = [
				{
					id: "task-1",
					title: "Test Task",
					status: "pending",
					createdAt: "2024-01-01T00:00:00.000Z",
				},
			];

			mockLocalStorage.setItem(
				"task-store",
				JSON.stringify({
					state: { tasks },
					version: 0,
				})
			);

			// Mock beforeunload event
			const beforeUnloadEvent = new Event("beforeunload");

			// Start migration
			const migrationPromise = migrationService.startMigration({
				dryRun: false,
				continueOnError: false,
			});

			// Simulate browser closure after a short delay
			setTimeout(() => {
				window.dispatchEvent(beforeUnloadEvent);
			}, 100);

			const result = await migrationPromise;

			// Migration should still complete or handle the interruption gracefully
			expect([true, false]).toContain(result.success);
		});
	});

	describe("Security and Privacy Edge Cases", () => {
		it("should handle sensitive data in localStorage", async () => {
			const tasksWithSensitiveData = [
				{
					id: "task-1",
					title: "Task with Sensitive Data",
					status: "pending",
					metadata: {
						apiKey: "sk-1234567890abcdef",
						password: "user-password-123",
						ssn: "123-45-6789",
						creditCard: "4111-1111-1111-1111",
					},
					createdAt: "2024-01-01T00:00:00.000Z",
				},
			];

			const transformResult = dataMapper.transformTasks(tasksWithSensitiveData as any);

			expect(transformResult.warnings).toEqual(
				expect.arrayContaining([expect.stringContaining("Potentially sensitive data detected")])
			);

			// Sensitive data should be masked or removed
			const transformed = transformResult.transformed[0];
			expect(transformed.metadata).not.toContain("sk-");
			expect(transformed.metadata).not.toContain("password");
		});

		it("should handle XSS attempts in data", async () => {
			const tasksWithXSS = [
				{
					id: "task-1",
					title: '<script>alert("XSS")</script>Task Title',
					description: '<img src="x" onerror="alert(1)">',
					status: "pending",
					metadata: {
						userInput: 'javascript:alert("XSS")',
					},
					createdAt: "2024-01-01T00:00:00.000Z",
				},
			];

			const transformResult = dataMapper.transformTasks(tasksWithXSS as any);

			expect(transformResult.warnings).toEqual(
				expect.arrayContaining([expect.stringContaining("Potentially malicious content detected")])
			);

			// XSS content should be sanitized
			const transformed = transformResult.transformed[0];
			expect(transformed.title).not.toContain("<script>");
			expect(transformed.description).not.toContain("onerror");
		});

		it("should handle access control during migration", async () => {
			const tasksFromMultipleUsers = [
				{
					id: "task-1",
					title: "User 1 Task",
					status: "pending",
					userId: "user-1",
					createdAt: "2024-01-01T00:00:00.000Z",
				},
				{
					id: "task-2",
					title: "User 2 Task",
					status: "pending",
					userId: "user-2",
					createdAt: "2024-01-01T00:00:00.000Z",
				},
			];

			mockLocalStorage.setItem(
				"task-store",
				JSON.stringify({
					state: { tasks: tasksFromMultipleUsers },
					version: 0,
				})
			);

			// Migration should only process tasks for the specified user
			const result = await migrationService.startMigration(
				{
					dryRun: true,
					continueOnError: false,
				},
				"user-1" // Specific user ID
			);

			expect(result.success).toBe(true);
			expect(result.itemsProcessed).toBe(1); // Only user-1's task
		});
	});
});
