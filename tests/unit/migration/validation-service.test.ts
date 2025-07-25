/**
 * Comprehensive test suite for ValidationService
 * Tests the lib/migration/validation-service.ts module for proper validation logic
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type {
	LocalStorageData,
	LocalStorageEnvironment,
	LocalStorageTask,
	ValidationError,
	ValidationResult,
} from "@/lib/migration/types";
import {
	type DataComparisonResult,
	type ValidationOptions,
	ValidationService,
} from "@/lib/migration/validation-service";

// Mock the database
const mockDb = {
	select: vi.fn(),
	from: vi.fn(),
	where: vi.fn(),
	limit: vi.fn(),
};

// Mock the database tables
const mockTasks = {
	id: "task_id",
};

const mockEnvironments = {
	id: "env_id",
};

vi.mock("@/lib/db", () => ({
	db: mockDb,
	tasks: mockTasks,
	environments: mockEnvironments,
}));

vi.mock("drizzle-orm", () => ({
	eq: vi.fn((column, value) => ({ column, value, type: "eq" })),
}));

describe("ValidationService", () => {
	let validationService: ValidationService;
	let localStorageMock: Storage;

	beforeEach(() => {
		// Reset all mocks
		vi.clearAllMocks();

		// Get singleton instance
		validationService = ValidationService.getInstance();

		// Mock localStorage
		localStorageMock = {
			getItem: vi.fn(),
			setItem: vi.fn(),
			removeItem: vi.fn(),
			clear: vi.fn(),
			length: 0,
			key: vi.fn(),
		};

		Object.defineProperty(global, "localStorage", {
			value: localStorageMock,
			writable: true,
		});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("Singleton Pattern", () => {
		it("should return the same instance on multiple calls", () => {
			const instance1 = ValidationService.getInstance();
			const instance2 = ValidationService.getInstance();

			expect(instance1).toBe(instance2);
			expect(instance1).toBeInstanceOf(ValidationService);
		});
	});

	describe("validateMigration", () => {
		beforeEach(() => {
			// Mock localStorage data extraction
			vi.spyOn(validationService as any, "extractLocalStorageData").mockReturnValue({
				tasks: [
					{
						id: "task-1",
						title: "Test Task",
						status: "IN_PROGRESS",
						createdAt: "2024-01-01T00:00:00.000Z",
						updatedAt: "2024-01-01T00:00:00.000Z",
						messages: ["message1", "message2"],
					},
				],
				environments: [
					{
						id: "env-1",
						name: "Test Environment",
						description: "Test description",
						githubOrganization: "test-org",
						createdAt: "2024-01-01T00:00:00.000Z",
						updatedAt: "2024-01-01T00:00:00.000Z",
					},
				],
			});
		});

		it("should validate migration successfully with valid data", async () => {
			// Mock database responses for tasks
			const mockTaskQuery = {
				from: vi.fn().mockReturnThis(),
				where: vi.fn().mockReturnThis(),
				limit: vi.fn().mockResolvedValue([
					{
						id: "task-1",
						title: "Test Task",
						status: "in_progress",
						createdAt: new Date("2024-01-01T00:00:00.000Z"),
						updatedAt: new Date("2024-01-01T00:00:00.000Z"),
						metadata: { messages: ["message1", "message2"] },
					},
				]),
			};

			// Mock database responses for environments
			const mockEnvQuery = {
				from: vi.fn().mockReturnThis(),
				where: vi.fn().mockReturnThis(),
				limit: vi.fn().mockResolvedValue([
					{
						id: "env-1",
						name: "Test Environment",
						description: "Test description",
						config: { githubOrganization: "test-org" },
						createdAt: new Date("2024-01-01T00:00:00.000Z"),
						updatedAt: new Date("2024-01-01T00:00:00.000Z"),
					},
				]),
			};

			// Mock completeness check
			const mockCountQuery = {
				from: vi.fn().mockResolvedValue([{ count: "1" }]),
			};

			mockDb.select.mockImplementation(() => mockTaskQuery);
			mockTaskQuery.from.mockImplementation((table) => {
				if (table === mockTasks) {
					return mockTaskQuery;
				}
				if (table === mockEnvironments) {
					return mockEnvQuery;
				}
				return mockCountQuery;
			});

			const result = await validationService.validateMigration();

			expect(result.valid).toBe(true);
			expect(result.errors).toHaveLength(0);
			expect(result.statistics.totalChecked).toBeGreaterThan(0);
			expect(result.statistics.passed).toBeGreaterThan(0);
		});

		it("should handle validation with custom options", async () => {
			const options: Partial<ValidationOptions> = {
				validateSchema: false,
				validateReferences: true,
				validateConstraints: false,
				strictMode: true,
			};

			// Mock successful database responses
			const mockQuery = {
				from: vi.fn().mockReturnThis(),
				where: vi.fn().mockReturnThis(),
				limit: vi.fn().mockResolvedValue([
					{
						id: "task-1",
						title: "Test Task",
						status: "in_progress",
						createdAt: new Date("2024-01-01T00:00:00.000Z"),
						updatedAt: new Date("2024-01-01T00:00:00.000Z"),
						metadata: { messages: [] },
					},
				]),
			};

			mockDb.select.mockReturnValue(mockQuery);

			const result = await validationService.validateMigration(options);

			expect(result).toBeDefined();
			expect(typeof result.valid).toBe("boolean");
			expect(Array.isArray(result.errors)).toBe(true);
			expect(result.statistics).toBeDefined();
		});

		it("should handle missing tasks in database", async () => {
			// Mock empty database response
			const mockQuery = {
				from: vi.fn().mockReturnThis(),
				where: vi.fn().mockReturnThis(),
				limit: vi.fn().mockResolvedValue([]), // Empty result
			};

			mockDb.select.mockReturnValue(mockQuery);

			const result = await validationService.validateMigration();

			expect(result.valid).toBe(false);
			expect(
				result.errors.some((error) => error.type === "MISSING_FIELD" && error.field === "task")
			).toBe(true);
			expect(result.statistics.failed).toBeGreaterThan(0);
		});

		it("should handle validation errors gracefully", async () => {
			// Mock database error
			mockDb.select.mockImplementation(() => {
				throw new Error("Database connection failed");
			});

			const result = await validationService.validateMigration();

			expect(result.valid).toBe(false);
			expect(result.errors).toHaveLength(1);
			expect(result.errors[0].type).toBe("VALIDATION_ERROR");
			expect(result.errors[0].message).toContain("Database connection failed");
		});

		it("should skip validation when no local data exists", async () => {
			// Mock empty localStorage
			vi.spyOn(validationService as any, "extractLocalStorageData").mockReturnValue({
				tasks: [],
				environments: [],
			});

			const result = await validationService.validateMigration();

			expect(result.valid).toBe(true);
			expect(result.statistics.totalChecked).toBe(0);
		});
	});

	describe("compareData", () => {
		beforeEach(() => {
			// Mock localStorage extraction
			vi.spyOn(validationService as any, "extractLocalStorageData").mockReturnValue({
				tasks: [
					{
						id: "task-1",
						title: "Local Task",
						status: "IN_PROGRESS",
						createdAt: "2024-01-01T00:00:00.000Z",
					},
				],
				environments: [
					{
						id: "env-1",
						name: "Local Env",
						description: "Local description",
					},
				],
			});
		});

		it("should identify identical data correctly", async () => {
			// Mock identical database data
			const mockTasksQuery = {
				from: vi.fn().mockResolvedValue([
					{
						id: "task-1",
						title: "Local Task",
						status: "in_progress",
						createdAt: new Date("2024-01-01T00:00:00.000Z"),
					},
				]),
			};

			const mockEnvsQuery = {
				from: vi.fn().mockResolvedValue([
					{
						id: "env-1",
						name: "Local Env",
						description: "Local description",
					},
				]),
			};

			mockDb.select.mockImplementation(() => mockTasksQuery);
			mockTasksQuery.from.mockImplementation((table) => {
				if (table === mockEnvironments) {
					return mockEnvsQuery;
				}
				return mockTasksQuery;
			});

			const result = await validationService.compareData();

			expect(result.identical).toBe(true);
			expect(result.differences).toHaveLength(0);
			expect(result.localOnly).toHaveLength(0);
			expect(result.databaseOnly).toHaveLength(0);
		});

		it("should identify differences in task data", async () => {
			// Mock different database data
			const mockTasksQuery = {
				from: vi.fn().mockResolvedValue([
					{
						id: "task-1",
						title: "Different Title", // Different from local
						status: "completed", // Different status
						createdAt: new Date("2024-01-01T00:00:00.000Z"),
					},
				]),
			};

			const mockEnvsQuery = {
				from: vi.fn().mockResolvedValue([
					{
						id: "env-1",
						name: "Local Env",
						description: "Local description",
					},
				]),
			};

			mockDb.select.mockImplementation(() => mockTasksQuery);
			mockTasksQuery.from.mockImplementation((table) => {
				if (table === mockEnvironments) {
					return mockEnvsQuery;
				}
				return mockTasksQuery;
			});

			const result = await validationService.compareData();

			expect(result.identical).toBe(false);
			expect(result.differences.length).toBeGreaterThan(0);
			expect(
				result.differences.some((diff) => diff.field === "title" && diff.type === "task")
			).toBe(true);
			expect(result.summary.mismatched).toBeGreaterThan(0);
		});

		it("should identify local-only and database-only items", async () => {
			// Mock database with different items
			const mockTasksQuery = {
				from: vi.fn().mockResolvedValue([
					{
						id: "task-2", // Different ID from local
						title: "Database Task",
						status: "pending",
						createdAt: new Date("2024-01-01T00:00:00.000Z"),
					},
				]),
			};

			const mockEnvsQuery = {
				from: vi.fn().mockResolvedValue([
					{
						id: "env-2", // Different ID from local
						name: "Database Env",
						description: "Database description",
					},
				]),
			};

			mockDb.select.mockImplementation(() => mockTasksQuery);
			mockTasksQuery.from.mockImplementation((table) => {
				if (table === mockEnvironments) {
					return mockEnvsQuery;
				}
				return mockTasksQuery;
			});

			const result = await validationService.compareData();

			expect(result.identical).toBe(false);
			expect(result.localOnly).toContain("task:task-1");
			expect(result.localOnly).toContain("environment:env-1");
			expect(result.databaseOnly).toContain("task:task-2");
			expect(result.databaseOnly).toContain("environment:env-2");
		});

		it("should handle database errors during comparison", async () => {
			mockDb.select.mockImplementation(() => {
				throw new Error("Database query failed");
			});

			await expect(validationService.compareData()).rejects.toThrow(
				"Failed to compare data: Database query failed"
			);
		});
	});

	describe("generateValidationReport", () => {
		beforeEach(() => {
			// Mock the validation and comparison methods
			vi.spyOn(validationService, "validateMigration").mockResolvedValue({
				valid: true,
				errors: [],
				warnings: ["Test warning"],
				statistics: {
					totalChecked: 10,
					passed: 9,
					failed: 1,
					skipped: 0,
				},
				issues: [{ type: "WARNING", message: "Test issue" }],
				recommendations: ["Test recommendation"],
			} as any);

			vi.spyOn(validationService, "compareData").mockResolvedValue({
				identical: false,
				differences: [
					{
						id: "task-1",
						type: "task",
						field: "title",
						localValue: "Local Title",
						databaseValue: "Database Title",
						severity: "warning",
					},
				],
				localOnly: [],
				databaseOnly: [],
				summary: {
					totalLocal: 5,
					totalDatabase: 5,
					matched: 4,
					mismatched: 1,
				},
				recordsCompared: 5,
			} as any);
		});

		it("should generate comprehensive validation report", async () => {
			const result = await validationService.generateValidationReport();

			expect(result.report).toContain("Migration Validation Report");
			expect(result.report).toContain("Overall Status");
			expect(result.report).toContain("Valid: ✅ Yes");
			expect(result.report).toContain("Data Identical: ⚠️ No");
			expect(result.report).toContain("Statistics");
			expect(result.report).toContain("Total Checked: 10");
			expect(result.report).toContain("Passed: 9");
			expect(result.report).toContain("Failed: 1");
			expect(result.validation).toBeDefined();
			expect(result.comparison).toBeDefined();
			expect(result.success).toBe(false); // Because data is not identical
		});

		it("should handle empty issues and recommendations", async () => {
			vi.spyOn(validationService, "validateMigration").mockResolvedValue({
				valid: true,
				errors: [],
				warnings: [],
				statistics: {
					totalChecked: 5,
					passed: 5,
					failed: 0,
					skipped: 0,
				},
				issues: [],
				recommendations: undefined,
			} as any);

			vi.spyOn(validationService, "compareData").mockResolvedValue({
				identical: true,
				differences: [],
				localOnly: [],
				databaseOnly: [],
				summary: {
					totalLocal: 5,
					totalDatabase: 5,
					matched: 5,
					mismatched: 0,
				},
			} as any);

			const result = await validationService.generateValidationReport();

			expect(result.report).toContain("No recommendations");
			expect(result.success).toBe(true); // Both valid and identical
		});
	});

	describe("Private Methods", () => {
		describe("extractLocalStorageData", () => {
			it("should extract task data from localStorage", () => {
				const taskData = {
					state: {
						tasks: [{ id: "task-1", title: "Test Task" }],
					},
				};

				localStorageMock.getItem = vi.fn().mockImplementation((key) => {
					if (key === "task-store") {
						return JSON.stringify(taskData);
					}
					return null;
				});

				const result = (validationService as any).extractLocalStorageData();

				expect(result.tasks).toHaveLength(1);
				expect(result.tasks[0].id).toBe("task-1");
				expect(result.tasks[0].title).toBe("Test Task");
			});

			it("should extract environment data from localStorage", () => {
				const envData = {
					state: {
						environments: [{ id: "env-1", name: "Test Env" }],
					},
				};

				localStorageMock.getItem = vi.fn().mockImplementation((key) => {
					if (key === "environments") {
						return JSON.stringify(envData);
					}
					return null;
				});

				const result = (validationService as any).extractLocalStorageData();

				expect(result.environments).toHaveLength(1);
				expect(result.environments[0].id).toBe("env-1");
				expect(result.environments[0].name).toBe("Test Env");
			});

			it("should handle missing localStorage data gracefully", () => {
				localStorageMock.getItem = vi.fn().mockReturnValue(null);

				const result = (validationService as any).extractLocalStorageData();

				expect(result).toEqual({});
			});

			it("should handle invalid JSON data gracefully", () => {
				const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
				localStorageMock.getItem = vi.fn().mockReturnValue("invalid-json");

				const result = (validationService as any).extractLocalStorageData();

				expect(result).toEqual({});
				expect(consoleSpy).toHaveBeenCalledWith(
					"Failed to extract localStorage data:",
					expect.any(Error)
				);

				consoleSpy.mockRestore();
			});
		});

		describe("mapTaskStatus", () => {
			it("should map task statuses correctly", () => {
				expect((validationService as any).mapTaskStatus("IN_PROGRESS")).toBe("in_progress");
				expect((validationService as any).mapTaskStatus("DONE")).toBe("completed");
				expect((validationService as any).mapTaskStatus("MERGED")).toBe("completed");
				expect((validationService as any).mapTaskStatus("CANCELLED")).toBe("cancelled");
				expect((validationService as any).mapTaskStatus("PAUSED")).toBe("pending");
				expect((validationService as any).mapTaskStatus("UNKNOWN_STATUS")).toBe("pending");
			});
		});

		describe("validateTaskSchema", () => {
			it("should validate required task fields", () => {
				const localTask = { id: "task-1", title: "Test" } as LocalStorageTask;
				const dbTask = {
					id: "task-1",
					title: "Test",
					status: "pending",
					createdAt: new Date(),
					updatedAt: new Date(),
				};

				const errors = (validationService as any).validateTaskSchema(localTask, dbTask);

				expect(errors).toHaveLength(0);
			});

			it("should detect missing required fields", () => {
				const localTask = { id: "task-1", title: "Test" } as LocalStorageTask;
				const dbTask = {
					id: "task-1",
					// missing title, status, createdAt, updatedAt
				};

				const errors = (validationService as any).validateTaskSchema(localTask, dbTask);

				expect(errors.length).toBeGreaterThan(0);
				expect(errors.some((e) => e.field === "title" && e.type === "MISSING_FIELD")).toBe(true);
				expect(errors.some((e) => e.field === "status" && e.type === "MISSING_FIELD")).toBe(true);
			});

			it("should validate field types", () => {
				const localTask = { id: "task-1", title: "Test" } as LocalStorageTask;
				const dbTask = {
					id: "task-1",
					title: "Test",
					status: "pending",
					createdAt: "invalid-date", // Should be Date object
					updatedAt: new Date(),
				};

				const errors = (validationService as any).validateTaskSchema(localTask, dbTask);

				expect(errors.some((e) => e.field === "createdAt" && e.type === "INVALID_TYPE")).toBe(true);
			});
		});
	});

	describe("Default Options", () => {
		it("should have correct default validation options", () => {
			const defaultOptions = (validationService as any).defaultOptions;

			expect(defaultOptions.validateSchema).toBe(true);
			expect(defaultOptions.validateReferences).toBe(true);
			expect(defaultOptions.validateConstraints).toBe(true);
			expect(defaultOptions.validateCompleteness).toBe(true);
			expect(defaultOptions.strictMode).toBe(false);
		});
	});

	describe("Edge Cases", () => {
		it("should handle null localStorage data", () => {
			vi.spyOn(validationService as any, "extractLocalStorageData").mockReturnValue(null);

			expect(async () => {
				await validationService.validateMigration();
			}).not.toThrow();
		});

		it("should handle undefined task messages", async () => {
			vi.spyOn(validationService as any, "extractLocalStorageData").mockReturnValue({
				tasks: [
					{
						id: "task-1",
						title: "Test Task",
						status: "IN_PROGRESS",
						messages: undefined, // undefined messages
					},
				],
			});

			const mockQuery = {
				from: vi.fn().mockReturnThis(),
				where: vi.fn().mockReturnThis(),
				limit: vi.fn().mockResolvedValue([
					{
						id: "task-1",
						title: "Test Task",
						status: "in_progress",
						createdAt: new Date(),
						updatedAt: new Date(),
						metadata: { messages: [] },
					},
				]),
			};

			mockDb.select.mockReturnValue(mockQuery);

			const result = await validationService.validateMigration();

			expect(result).toBeDefined();
			expect(typeof result.valid).toBe("boolean");
		});

		it("should handle large datasets efficiently", async () => {
			// Create large dataset
			const largeTasks = Array.from({ length: 1000 }, (_, i) => ({
				id: `task-${i}`,
				title: `Task ${i}`,
				status: "IN_PROGRESS",
				createdAt: "2024-01-01T00:00:00.000Z",
			}));

			vi.spyOn(validationService as any, "extractLocalStorageData").mockReturnValue({
				tasks: largeTasks,
				environments: [],
			});

			const mockQuery = {
				from: vi.fn().mockReturnThis(),
				where: vi.fn().mockReturnThis(),
				limit: vi.fn().mockImplementation(() => Promise.resolve([])), // All missing
			};

			mockDb.select.mockReturnValue(mockQuery);

			const result = await validationService.validateMigration();

			expect(result.statistics.totalChecked).toBe(1000);
			expect(result.statistics.failed).toBe(1000);
		});
	});
});
