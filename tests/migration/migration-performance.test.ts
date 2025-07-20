/**
 * Migration System Performance Test Suite
 *
 * Tests performance characteristics of the migration system under various
 * load conditions, data sizes, and concurrent operations.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { backupService } from "../../lib/migration/backup-service";
import { dataExtractor } from "../../lib/migration/data-extractor";
import { dataMapper } from "../../lib/migration/data-mapper";
import { migrationService } from "../../lib/migration/migration-service";
import type {
	LocalStorageEnvironment,
	LocalStorageTask,
	MigrationConfig,
} from "../../lib/migration/types";

// Performance test configuration
const PERFORMANCE_THRESHOLDS = {
	SMALL_DATASET_TIME: 1000, // 1 second for <100 items
	MEDIUM_DATASET_TIME: 5000, // 5 seconds for <1000 items
	LARGE_DATASET_TIME: 30_000, // 30 seconds for <10000 items
	MEMORY_USAGE_LIMIT: 100 * 1024 * 1024, // 100MB memory limit
	BACKUP_COMPRESSION_RATIO: 0.7, // At least 30% compression
};

// Mock localStorage for performance testing
const createPerformanceLocalStorage = () => {
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

// Mock database for performance testing
const createPerformanceDatabase = () => ({
	tasks: {
		findMany: vi.fn().mockResolvedValue([]),
		create: vi
			.fn()
			.mockImplementation((data) =>
				Promise.resolve({ id: `created-${Date.now()}-${Math.random()}` }),
			),
		update: vi.fn().mockResolvedValue({ id: "updated" }),
		delete: vi.fn().mockResolvedValue({ id: "deleted" }),
		count: vi.fn().mockResolvedValue(0),
	},
	environments: {
		findMany: vi.fn().mockResolvedValue([]),
		create: vi
			.fn()
			.mockImplementation((data) =>
				Promise.resolve({ id: `env-${Date.now()}-${Math.random()}` }),
			),
		update: vi.fn().mockResolvedValue({ id: "updated" }),
		delete: vi.fn().mockResolvedValue({ id: "deleted" }),
		count: vi.fn().mockResolvedValue(0),
	},
	$transaction: vi.fn().mockImplementation((fn) =>
		fn({
			tasks: {
				create: vi
					.fn()
					.mockImplementation((data) =>
						Promise.resolve({ id: `tx-task-${Date.now()}-${Math.random()}` }),
					),
			},
			environments: {
				create: vi
					.fn()
					.mockImplementation((data) =>
						Promise.resolve({ id: `tx-env-${Date.now()}-${Math.random()}` }),
					),
			},
		}),
	),
});

// Data generators for performance testing
const generateTaskData = (count: number): LocalStorageTask[] =>
	Array.from({ length: count }, (_, i) => ({
		id: `task-${i}`,
		title: `Performance Test Task ${i}`,
		description:
			`This is a test task for performance testing. Task number ${i}. `.repeat(
				5,
			),
		status:
			i % 4 === 0
				? "pending"
				: i % 4 === 1
					? "in-progress"
					: i % 4 === 2
						? "completed"
						: "cancelled",
		priority: i % 3 === 0 ? "high" : i % 3 === 1 ? "medium" : "low",
		assignedTo: `user-${i % 10}`,
		createdAt: new Date(
			Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000,
		).toISOString(),
		updatedAt: new Date(
			Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000,
		).toISOString(),
		dueDate:
			i % 5 === 0
				? new Date(
						Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000,
					).toISOString()
				: undefined,
		tags:
			i % 3 === 0 ? [`tag-${i % 5}`, `category-${i % 3}`] : [`tag-${i % 7}`],
		metadata: {
			category: `category-${i % 5}`,
			estimatedHours: Math.floor(Math.random() * 40) + 1,
			complexity: i % 3 === 0 ? "low" : i % 3 === 1 ? "medium" : "high",
			dependencies:
				i % 4 === 0
					? [`task-${Math.max(0, i - 1)}`, `task-${Math.max(0, i - 2)}`]
					: [],
			customFields: Array.from({ length: 5 }, (_, j) => ({
				key: `field-${j}`,
				value: `value-${i}-${j}`,
			})),
		},
	}));

const generateEnvironmentData = (count: number): LocalStorageEnvironment[] =>
	Array.from({ length: count }, (_, i) => ({
		id: `env-${i}`,
		name: `Performance Test Environment ${i}`,
		description: `This is environment ${i} for performance testing. `.repeat(3),
		isActive: i === 0,
		createdAt: new Date(
			Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000,
		).toISOString(),
		updatedAt: new Date(
			Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000,
		).toISOString(),
		config: {
			githubOrganization: `org-${i % 5}`,
			githubRepository: `repo-${i}`,
			branchName: i % 2 === 0 ? "main" : "develop",
			buildCommand: `npm run build:env-${i}`,
			startCommand: `npm start:env-${i}`,
			envVars: Object.fromEntries(
				Array.from({ length: 10 }, (_, j) => [
					`ENV_VAR_${j}`,
					`value-${i}-${j}`,
				]),
			),
			secrets: Object.fromEntries(
				Array.from({ length: 3 }, (_, j) => [
					`SECRET_${j}`,
					`secret-${i}-${j}`,
				]),
			),
		},
	}));

// Memory monitoring utilities
const getMemoryUsage = () => {
	if (typeof process !== "undefined" && process.memoryUsage) {
		return process.memoryUsage();
	}
	// Browser fallback
	return {
		rss: 0,
		heapTotal: 0,
		heapUsed: 0,
		external: 0,
		arrayBuffers: 0,
	};
};

const measureMemoryDelta = async (operation: () => Promise<void>) => {
	const beforeMemory = getMemoryUsage();
	await operation();
	const afterMemory = getMemoryUsage();

	return {
		heapUsedDelta: afterMemory.heapUsed - beforeMemory.heapUsed,
		heapTotalDelta: afterMemory.heapTotal - beforeMemory.heapTotal,
		rssDelta: afterMemory.rss - beforeMemory.rss,
	};
};

// Performance measurement utilities
const measureExecutionTime = async <T>(
	operation: () => Promise<T>,
): Promise<{ result: T; duration: number }> => {
	const startTime = performance.now();
	const result = await operation();
	const duration = performance.now() - startTime;
	return { result, duration };
};

const runPerformanceTest = async <T>(
	name: string,
	operation: () => Promise<T>,
	expectedThreshold: number,
	iterations = 1,
): Promise<{ result: T; averageDuration: number; memoryDelta: any }> => {
	const durations: number[] = [];
	let lastResult: T;
	const totalMemoryDelta = { heapUsedDelta: 0, heapTotalDelta: 0, rssDelta: 0 };

	for (let i = 0; i < iterations; i++) {
		const memoryDelta = await measureMemoryDelta(async () => {
			const { result, duration } = await measureExecutionTime(operation);
			durations.push(duration);
			lastResult = result;
		});

		totalMemoryDelta.heapUsedDelta += memoryDelta.heapUsedDelta;
		totalMemoryDelta.heapTotalDelta += memoryDelta.heapTotalDelta;
		totalMemoryDelta.rssDelta += memoryDelta.rssDelta;
	}

	const averageDuration =
		durations.reduce((sum, d) => sum + d, 0) / durations.length;
	const avgMemoryDelta = {
		heapUsedDelta: totalMemoryDelta.heapUsedDelta / iterations,
		heapTotalDelta: totalMemoryDelta.heapTotalDelta / iterations,
		rssDelta: totalMemoryDelta.rssDelta / iterations,
	};

	console.log(
		`Performance Test: ${name} - Average: ${averageDuration.toFixed(2)}ms, Memory: ${(avgMemoryDelta.heapUsedDelta / 1024 / 1024).toFixed(2)}MB`,
	);

	expect(averageDuration).toBeLessThan(expectedThreshold);
	expect(avgMemoryDelta.heapUsedDelta).toBeLessThan(
		PERFORMANCE_THRESHOLDS.MEMORY_USAGE_LIMIT,
	);

	return { result: lastResult!, averageDuration, memoryDelta: avgMemoryDelta };
};

describe("Migration System Performance Tests", () => {
	let mockLocalStorage: ReturnType<typeof createPerformanceLocalStorage>;
	let mockDb: ReturnType<typeof createPerformanceDatabase>;

	beforeEach(() => {
		mockLocalStorage = createPerformanceLocalStorage();
		mockDb = createPerformanceDatabase();

		// Setup global localStorage mock
		Object.defineProperty(window, "localStorage", {
			value: mockLocalStorage,
			writable: true,
		});

		// Reset all mocks
		vi.clearAllMocks();

		// Mock console to reduce noise during performance tests
		vi.spyOn(console, "log").mockImplementation(() => {});
		vi.spyOn(console, "warn").mockImplementation(() => {});
		vi.spyOn(console, "error").mockImplementation(() => {});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("Data Extraction Performance", () => {
		it("should extract small dataset efficiently", async () => {
			const tasks = generateTaskData(50);
			const environments = generateEnvironmentData(10);

			mockLocalStorage.setItem(
				"task-store",
				JSON.stringify({ state: { tasks }, version: 0 }),
			);
			mockLocalStorage.setItem(
				"environments",
				JSON.stringify({ state: { environments }, version: 0 }),
			);

			await runPerformanceTest(
				"Small Dataset Extraction",
				() => dataExtractor.extractAll(),
				PERFORMANCE_THRESHOLDS.SMALL_DATASET_TIME,
			);
		});

		it("should extract medium dataset efficiently", async () => {
			const tasks = generateTaskData(500);
			const environments = generateEnvironmentData(50);

			mockLocalStorage.setItem(
				"task-store",
				JSON.stringify({ state: { tasks }, version: 0 }),
			);
			mockLocalStorage.setItem(
				"environments",
				JSON.stringify({ state: { environments }, version: 0 }),
			);

			await runPerformanceTest(
				"Medium Dataset Extraction",
				() => dataExtractor.extractAll(),
				PERFORMANCE_THRESHOLDS.MEDIUM_DATASET_TIME,
			);
		});

		it("should extract large dataset efficiently", async () => {
			const tasks = generateTaskData(5000);
			const environments = generateEnvironmentData(200);

			mockLocalStorage.setItem(
				"task-store",
				JSON.stringify({ state: { tasks }, version: 0 }),
			);
			mockLocalStorage.setItem(
				"environments",
				JSON.stringify({ state: { environments }, version: 0 }),
			);

			await runPerformanceTest(
				"Large Dataset Extraction",
				() => dataExtractor.extractAll(),
				PERFORMANCE_THRESHOLDS.LARGE_DATASET_TIME,
			);
		});

		it("should handle extraction with memory efficiency", async () => {
			const tasks = generateTaskData(1000);

			mockLocalStorage.setItem(
				"task-store",
				JSON.stringify({ state: { tasks }, version: 0 }),
			);

			const { memoryDelta } = await runPerformanceTest(
				"Memory Efficient Extraction",
				() => dataExtractor.extractTasks(),
				PERFORMANCE_THRESHOLDS.MEDIUM_DATASET_TIME,
			);

			// Memory usage should be reasonable for the dataset size
			expect(memoryDelta.heapUsedDelta).toBeLessThan(50 * 1024 * 1024); // 50MB
		});
	});

	describe("Data Transformation Performance", () => {
		it("should transform small dataset efficiently", async () => {
			const tasks = generateTaskData(100);

			await runPerformanceTest(
				"Small Dataset Transformation",
				() => Promise.resolve(dataMapper.transformTasks(tasks)),
				PERFORMANCE_THRESHOLDS.SMALL_DATASET_TIME,
			);
		});

		it("should transform medium dataset efficiently", async () => {
			const tasks = generateTaskData(1000);

			await runPerformanceTest(
				"Medium Dataset Transformation",
				() => Promise.resolve(dataMapper.transformTasks(tasks)),
				PERFORMANCE_THRESHOLDS.MEDIUM_DATASET_TIME,
			);
		});

		it("should transform large dataset efficiently", async () => {
			const tasks = generateTaskData(10_000);

			await runPerformanceTest(
				"Large Dataset Transformation",
				() => Promise.resolve(dataMapper.transformTasks(tasks)),
				PERFORMANCE_THRESHOLDS.LARGE_DATASET_TIME,
			);
		});

		it("should handle complex metadata transformation efficiently", async () => {
			const complexTasks = generateTaskData(500).map((task) => ({
				...task,
				metadata: {
					...task.metadata,
					// Add complex nested data
					complexData: {
						arrays: Array.from({ length: 100 }, (_, i) => ({
							id: i,
							value: `item-${i}`,
						})),
						nestedObjects: Object.fromEntries(
							Array.from({ length: 50 }, (_, i) => [
								`key-${i}`,
								{ nested: `value-${i}` },
							]),
						),
					},
				},
			}));

			await runPerformanceTest(
				"Complex Metadata Transformation",
				() => Promise.resolve(dataMapper.transformTasks(complexTasks)),
				PERFORMANCE_THRESHOLDS.MEDIUM_DATASET_TIME,
			);
		});
	});

	describe("Migration Process Performance", () => {
		it("should complete small migration efficiently", async () => {
			const tasks = generateTaskData(50);
			const environments = generateEnvironmentData(10);

			mockLocalStorage.setItem(
				"task-store",
				JSON.stringify({ state: { tasks }, version: 0 }),
			);
			mockLocalStorage.setItem(
				"environments",
				JSON.stringify({ state: { environments }, version: 0 }),
			);

			const config: MigrationConfig = {
				dryRun: true,
				batchSize: 50,
				continueOnError: false,
				validateAfterMigration: false,
			};

			await runPerformanceTest(
				"Small Migration Process",
				() => migrationService.startMigration(config),
				PERFORMANCE_THRESHOLDS.SMALL_DATASET_TIME,
			);
		});

		it("should complete medium migration efficiently", async () => {
			const tasks = generateTaskData(500);
			const environments = generateEnvironmentData(50);

			mockLocalStorage.setItem(
				"task-store",
				JSON.stringify({ state: { tasks }, version: 0 }),
			);
			mockLocalStorage.setItem(
				"environments",
				JSON.stringify({ state: { environments }, version: 0 }),
			);

			const config: MigrationConfig = {
				dryRun: true,
				batchSize: 100,
				continueOnError: false,
				validateAfterMigration: false,
			};

			await runPerformanceTest(
				"Medium Migration Process",
				() => migrationService.startMigration(config),
				PERFORMANCE_THRESHOLDS.MEDIUM_DATASET_TIME,
			);
		});

		it("should optimize batch processing for performance", async () => {
			const tasks = generateTaskData(1000);

			mockLocalStorage.setItem(
				"task-store",
				JSON.stringify({ state: { tasks }, version: 0 }),
			);

			// Test different batch sizes
			const batchSizes = [10, 50, 100, 200, 500];
			const results: Array<{ batchSize: number; duration: number }> = [];

			for (const batchSize of batchSizes) {
				const config: MigrationConfig = {
					dryRun: true,
					batchSize,
					continueOnError: false,
					validateAfterMigration: false,
				};

				const { averageDuration } = await runPerformanceTest(
					`Batch Size ${batchSize}`,
					() => migrationService.startMigration(config),
					PERFORMANCE_THRESHOLDS.MEDIUM_DATASET_TIME,
				);

				results.push({ batchSize, duration: averageDuration });
			}

			// Find optimal batch size (should be neither too small nor too large)
			const sortedResults = results.sort((a, b) => a.duration - b.duration);
			const optimalBatchSize = sortedResults[0].batchSize;

			console.log("Batch size performance results:", results);
			console.log("Optimal batch size:", optimalBatchSize);

			// Optimal batch size should be reasonable (not the extremes)
			expect(optimalBatchSize).toBeGreaterThan(10);
			expect(optimalBatchSize).toBeLessThan(500);
		});

		it("should handle concurrent migration operations efficiently", async () => {
			const tasks = generateTaskData(200);

			mockLocalStorage.setItem(
				"task-store",
				JSON.stringify({ state: { tasks }, version: 0 }),
			);

			const config: MigrationConfig = {
				dryRun: true,
				batchSize: 50,
				continueOnError: true,
				validateAfterMigration: false,
			};

			// Simulate concurrent migrations
			const concurrentOperations = Array.from({ length: 3 }, () =>
				migrationService.startMigration(config),
			);

			const startTime = performance.now();
			const results = await Promise.allSettled(concurrentOperations);
			const duration = performance.now() - startTime;

			// At least one should succeed
			const successCount = results.filter(
				(r) => r.status === "fulfilled" && r.value.success,
			).length;

			expect(successCount).toBeGreaterThan(0);
			expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.MEDIUM_DATASET_TIME);
		});
	});

	describe("Backup System Performance", () => {
		it("should create backup efficiently", async () => {
			const tasks = generateTaskData(500);
			const environments = generateEnvironmentData(50);

			mockLocalStorage.setItem(
				"task-store",
				JSON.stringify({ state: { tasks }, version: 0 }),
			);
			mockLocalStorage.setItem(
				"environments",
				JSON.stringify({ state: { environments }, version: 0 }),
			);

			await runPerformanceTest(
				"Backup Creation",
				() =>
					backupService.createBackup({
						source: "LOCALSTORAGE",
						compress: false,
					}),
				PERFORMANCE_THRESHOLDS.MEDIUM_DATASET_TIME,
			);
		});

		it("should create compressed backup efficiently", async () => {
			const tasks = generateTaskData(500);
			const environments = generateEnvironmentData(50);

			mockLocalStorage.setItem(
				"task-store",
				JSON.stringify({ state: { tasks }, version: 0 }),
			);
			mockLocalStorage.setItem(
				"environments",
				JSON.stringify({ state: { environments }, version: 0 }),
			);

			// Test both compressed and uncompressed backups
			const { result: uncompressedResult } = await runPerformanceTest(
				"Uncompressed Backup",
				() =>
					backupService.createBackup({
						source: "LOCALSTORAGE",
						compress: false,
					}),
				PERFORMANCE_THRESHOLDS.MEDIUM_DATASET_TIME,
			);

			const { result: compressedResult } = await runPerformanceTest(
				"Compressed Backup",
				() =>
					backupService.createBackup({
						source: "LOCALSTORAGE",
						compress: true,
					}),
				PERFORMANCE_THRESHOLDS.MEDIUM_DATASET_TIME,
			);

			// Compressed backup should be smaller
			if (uncompressedResult.manifest && compressedResult.manifest) {
				const compressionRatio =
					compressedResult.manifest.size / uncompressedResult.manifest.size;
				expect(compressionRatio).toBeLessThan(
					PERFORMANCE_THRESHOLDS.BACKUP_COMPRESSION_RATIO,
				);
			}
		});

		it("should restore backup efficiently", async () => {
			const tasks = generateTaskData(300);

			mockLocalStorage.setItem(
				"task-store",
				JSON.stringify({ state: { tasks }, version: 0 }),
			);

			// Create backup first
			const backupResult = await backupService.createBackup({
				source: "LOCALSTORAGE",
				compress: false,
			});

			expect(backupResult.success).toBe(true);
			const backupId = backupResult.manifest!.id;

			// Clear localStorage
			mockLocalStorage.clear();

			// Test restore performance
			await runPerformanceTest(
				"Backup Restoration",
				() => backupService.restoreBackup(backupId),
				PERFORMANCE_THRESHOLDS.MEDIUM_DATASET_TIME,
			);
		});
	});

	describe("Memory Usage Optimization", () => {
		it("should handle large datasets without memory leaks", async () => {
			const largeTaskSet = generateTaskData(2000);

			const initialMemory = getMemoryUsage();

			// Perform multiple operations to test for memory leaks
			for (let iteration = 0; iteration < 5; iteration++) {
				mockLocalStorage.setItem(
					"task-store",
					JSON.stringify({ state: { tasks: largeTaskSet }, version: 0 }),
				);

				await dataExtractor.extractTasks();
				const transformResult = dataMapper.transformTasks(largeTaskSet);

				// Clear data to simulate cleanup
				mockLocalStorage.clear();

				// Force garbage collection if available
				if (global.gc) {
					global.gc();
				}
			}

			const finalMemory = getMemoryUsage();
			const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

			// Memory increase should be minimal (indicating no major leaks)
			expect(memoryIncrease).toBeLessThan(20 * 1024 * 1024); // 20MB threshold
		});

		it("should process data in chunks to manage memory", async () => {
			const hugeTaskSet = generateTaskData(5000);

			const memoryBeforeChunking = getMemoryUsage();

			// Process in chunks
			const chunkSize = 500;
			const chunks = [];
			for (let i = 0; i < hugeTaskSet.length; i += chunkSize) {
				chunks.push(hugeTaskSet.slice(i, i + chunkSize));
			}

			for (const chunk of chunks) {
				const transformResult = dataMapper.transformTasks(chunk);
				expect(transformResult.transformed.length).toBeLessThanOrEqual(
					chunkSize,
				);
			}

			const memoryAfterChunking = getMemoryUsage();
			const memoryDelta =
				memoryAfterChunking.heapUsed - memoryBeforeChunking.heapUsed;

			// Chunked processing should use less memory than processing all at once
			expect(memoryDelta).toBeLessThan(100 * 1024 * 1024); // 100MB threshold
		});

		it("should efficiently handle repetitive operations", async () => {
			const tasks = generateTaskData(200);

			mockLocalStorage.setItem(
				"task-store",
				JSON.stringify({ state: { tasks }, version: 0 }),
			);

			const iterations = 10;
			const durations: number[] = [];

			for (let i = 0; i < iterations; i++) {
				const { duration } = await measureExecutionTime(() =>
					dataExtractor.extractTasks(),
				);
				durations.push(duration);
			}

			// Performance should be consistent across iterations (no degradation)
			const averageDuration =
				durations.reduce((sum, d) => sum + d, 0) / durations.length;
			const maxDuration = Math.max(...durations);
			const minDuration = Math.min(...durations);

			// Variance should be minimal
			const variance = maxDuration - minDuration;
			expect(variance).toBeLessThan(averageDuration * 0.5); // Less than 50% variance
		});
	});

	describe("Scalability Tests", () => {
		it("should scale linearly with data size", async () => {
			const dataSizes = [100, 200, 500, 1000];
			const results: Array<{ size: number; duration: number }> = [];

			for (const size of dataSizes) {
				const tasks = generateTaskData(size);

				mockLocalStorage.setItem(
					"task-store",
					JSON.stringify({ state: { tasks }, version: 0 }),
				);

				const { duration } = await measureExecutionTime(() =>
					dataExtractor.extractTasks(),
				);
				results.push({ size, duration });

				mockLocalStorage.clear();
			}

			// Calculate performance scaling
			const scalingFactors = results.slice(1).map((result, index) => ({
				sizeRatio: result.size / results[index].size,
				timeRatio: result.duration / results[index].duration,
			}));

			// Time scaling should be roughly linear (not exponential)
			scalingFactors.forEach(({ sizeRatio, timeRatio }) => {
				expect(timeRatio).toBeLessThan(sizeRatio * 2); // Allow for some overhead
			});

			console.log("Scalability results:", results);
			console.log("Scaling factors:", scalingFactors);
		});

		it("should handle varying complexity efficiently", async () => {
			// Create tasks with varying complexity
			const simpleTasks = generateTaskData(500).map((task) => ({
				id: task.id,
				title: task.title,
				status: task.status,
				createdAt: task.createdAt,
			}));

			const complexTasks = generateTaskData(500).map((task) => ({
				...task,
				metadata: {
					...task.metadata,
					// Add very complex nested data
					complexStructure: {
						level1: Array.from({ length: 20 }, (_, i) => ({
							id: i,
							level2: Array.from({ length: 10 }, (_, j) => ({
								id: j,
								data: `complex-data-${i}-${j}`,
								level3: Object.fromEntries(
									Array.from({ length: 5 }, (_, k) => [
										`key-${k}`,
										`value-${i}-${j}-${k}`,
									]),
								),
							})),
						})),
					},
				},
			}));

			// Test simple tasks
			const { averageDuration: simpleDuration } = await runPerformanceTest(
				"Simple Tasks Processing",
				() => Promise.resolve(dataMapper.transformTasks(simpleTasks as any)),
				PERFORMANCE_THRESHOLDS.MEDIUM_DATASET_TIME,
			);

			// Test complex tasks
			const { averageDuration: complexDuration } = await runPerformanceTest(
				"Complex Tasks Processing",
				() => Promise.resolve(dataMapper.transformTasks(complexTasks as any)),
				PERFORMANCE_THRESHOLDS.LARGE_DATASET_TIME,
			);

			// Complex tasks should take longer but not exponentially so
			const complexityRatio = complexDuration / simpleDuration;
			expect(complexityRatio).toBeLessThan(10); // Should not be more than 10x slower

			console.log(`Simple tasks: ${simpleDuration.toFixed(2)}ms`);
			console.log(`Complex tasks: ${complexDuration.toFixed(2)}ms`);
			console.log(`Complexity ratio: ${complexityRatio.toFixed(2)}x`);
		});
	});
});
