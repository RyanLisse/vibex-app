/**
 * WASM Compute Module Integration Tests
 *
 * Comprehensive test suite for WASM compute operations including
 * performance benchmarks, fallback scenarios, and statistical operations
 */

import {
	afterEach,
	beforeAll,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";
import {
	type AnalyticsData,
	type ComputeResult,
	type ComputeTask,
	ComputeWASM,
	type ComputeWASMConfig,
	computeManager,
	createComputeEngine,
	getComputeEngine,
	type StatisticalSummary,
} from "../../../lib/wasm/compute";
import { wasmDetector } from "../../../lib/wasm/detection";

// Mock WebAssembly for testing
const mockWASMModule = {
	exports: {
		compute: vi.fn((a: number, b: number) => a + b),
		calculateMean: vi.fn((ptr: number, len: number) => 42.5),
		calculateVariance: vi.fn((ptr: number, len: number, mean: number) => 15.2),
	},
};

const mockWASMInstance = {
	exports: mockWASMModule.exports,
};

// Mock WebAssembly global
global.WebAssembly = {
	compile: vi.fn().mockResolvedValue(mockWASMModule),
	instantiate: vi.fn().mockResolvedValue(mockWASMInstance),
	Module: vi.fn(),
	Instance: vi.fn(),
	Memory: vi.fn(),
	Table: vi.fn(),
	CompileError: Error,
	RuntimeError: Error,
	LinkError: Error,
	validate: vi.fn(),
} as any;

// Mock Worker for parallel processing tests
global.Worker = vi.fn().mockImplementation(() => ({
	postMessage: vi.fn(),
	terminate: vi.fn(),
	onmessage: null,
	onerror: null,
})) as any;

// Mock navigator for hardware detection
Object.defineProperty(global, "navigator", {
	value: {
		hardwareConcurrency: 8,
		userAgent: "Mozilla/5.0 (compatible; Test)",
	},
	writable: true,
});

// Test data generators
const generateRandomDataset = (size: number, min = 0, max = 100): number[] => {
	return Array.from({ length: size }, () => Math.random() * (max - min) + min);
};

const generateAnalyticsData = (size: number): AnalyticsData => {
	const timestamps = Array.from(
		{ length: size },
		(_, i) => Date.now() - (size - i) * 1000,
	);
	const values = generateRandomDataset(size, 10, 90);
	const labels = Array.from({ length: size }, (_, i) => `data-point-${i}`);

	return {
		values,
		timestamps,
		labels,
		metadata: {
			source: "test-generator",
			algorithm: "random",
			version: "1.0",
		},
	};
};

describe("WASM Compute Module Tests", () => {
	let computeEngine: ComputeWASM;
	let originalWASM: any;

	beforeAll(async () => {
		// Store original WebAssembly
		originalWASM = global.WebAssembly;

		// Mock WASM detection
		vi.spyOn(wasmDetector, "detectCapabilities").mockResolvedValue({
			isSupported: true,
			hasThreads: true,
			hasSIMD: true,
			hasExceptionHandling: true,
			hasBulkMemory: true,
			hasReferenceTypes: true,
			performance: "high",
		});
	});

	beforeEach(async () => {
		// Create fresh compute engine for each test
		const config: Partial<ComputeWASMConfig> = {
			enableParallelProcessing: true,
			maxWorkers: 4,
			chunkSize: 1000,
			enableSIMD: true,
			enableThreads: true,
		};

		computeEngine = new ComputeWASM(config);
		await computeEngine.initialize();
	});

	afterEach(() => {
		// Cleanup compute engine
		computeEngine?.cleanup();
		vi.clearAllMocks();
	});

	describe("Initialization and Configuration", () => {
		it("should initialize WASM compute engine successfully", async () => {
			const engine = new ComputeWASM();
			await engine.initialize();

			const stats = engine.getStats();
			expect(stats.isWASMEnabled).toBe(true);
			expect(stats.config.enableParallelProcessing).toBe(true);
			expect(stats.config.maxWorkers).toBeGreaterThan(0);

			engine.cleanup();
		});

		it("should fallback to JavaScript when WASM is not available", async () => {
			// Mock WASM as unavailable
			vi.spyOn(wasmDetector, "detectCapabilities").mockResolvedValueOnce({
				isSupported: false,
				hasThreads: false,
				hasSIMD: false,
				hasExceptionHandling: false,
				hasBulkMemory: false,
				hasReferenceTypes: false,
				performance: "low",
			});

			const engine = new ComputeWASM();
			await engine.initialize();

			const stats = engine.getStats();
			expect(stats.isWASMEnabled).toBe(false);

			engine.cleanup();
		});

		it("should configure compute engine with custom settings", async () => {
			const customConfig: ComputeWASMConfig = {
				enableParallelProcessing: false,
				maxWorkers: 2,
				chunkSize: 500,
				enableSIMD: false,
				enableThreads: false,
			};

			const engine = new ComputeWASM(customConfig);
			await engine.initialize();

			const stats = engine.getStats();
			expect(stats.config.maxWorkers).toBe(2);
			expect(stats.config.chunkSize).toBe(500);
			expect(stats.config.enableParallelProcessing).toBe(false);

			engine.cleanup();
		});

		it("should handle initialization errors gracefully", async () => {
			// Mock WASM compilation failure
			vi.mocked(WebAssembly.compile).mockRejectedValueOnce(
				new Error("WASM compilation failed"),
			);

			const engine = new ComputeWASM();

			// Should not throw, but fall back to JavaScript
			await expect(engine.initialize()).resolves.not.toThrow();

			const stats = engine.getStats();
			expect(stats.isWASMEnabled).toBe(false);

			engine.cleanup();
		});
	});

	describe("Statistical Operations", () => {
		it("should calculate basic statistics for small datasets", async () => {
			const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
			const stats = await computeEngine.calculateStatistics(data);

			expect(stats.count).toBe(10);
			expect(stats.sum).toBe(55);
			expect(stats.mean).toBe(5.5);
			expect(stats.median).toBe(5.5);
			expect(stats.min).toBe(1);
			expect(stats.max).toBe(10);
			expect(stats.range).toBe(9);
			expect(stats.variance).toBeCloseTo(8.25, 2);
			expect(stats.standardDeviation).toBeCloseTo(2.87, 2);
		});

		it("should calculate statistics for large datasets efficiently", async () => {
			const largeDataset = generateRandomDataset(100_000);
			const startTime = performance.now();

			const stats = await computeEngine.calculateStatistics(largeDataset);
			const executionTime = performance.now() - startTime;

			expect(stats.count).toBe(100_000);
			expect(stats.mean).toBeGreaterThan(0);
			expect(stats.mean).toBeLessThan(100);
			expect(executionTime).toBeLessThan(5000); // Should complete within 5 seconds

			// Verify percentiles are in correct order
			expect(stats.percentiles.p25).toBeLessThanOrEqual(stats.percentiles.p50);
			expect(stats.percentiles.p50).toBeLessThanOrEqual(stats.percentiles.p75);
			expect(stats.percentiles.p75).toBeLessThanOrEqual(stats.percentiles.p90);
			expect(stats.percentiles.p90).toBeLessThanOrEqual(stats.percentiles.p95);
			expect(stats.percentiles.p95).toBeLessThanOrEqual(stats.percentiles.p99);
		});

		it("should handle edge cases in statistical calculations", async () => {
			// Empty dataset
			await expect(computeEngine.calculateStatistics([])).rejects.toThrow(
				"Cannot calculate statistics for empty dataset",
			);

			// Single value
			const singleValue = await computeEngine.calculateStatistics([42]);
			expect(singleValue.count).toBe(1);
			expect(singleValue.mean).toBe(42);
			expect(singleValue.median).toBe(42);
			expect(singleValue.variance).toBe(0);

			// All same values
			const sameValues = await computeEngine.calculateStatistics([
				5, 5, 5, 5, 5,
			]);
			expect(sameValues.mean).toBe(5);
			expect(sameValues.variance).toBe(0);
			expect(sameValues.mode).toEqual([5]);

			// With outliers
			const withOutliers = await computeEngine.calculateStatistics([
				1, 2, 3, 1000, 4, 5,
			]);
			expect(withOutliers.mean).toBeGreaterThan(100); // Skewed by outlier
			expect(withOutliers.median).toBeLessThan(10); // Not affected by outlier
		});

		it("should calculate mode correctly for multimodal distributions", async () => {
			// Bimodal distribution
			const bimodal = [1, 1, 1, 5, 5, 5, 9, 9, 10];
			const stats = await computeEngine.calculateStatistics(bimodal);

			expect(stats.mode).toContain(1);
			expect(stats.mode).toContain(5);
			expect(stats.mode).toHaveLength(2);

			// Unimodal distribution
			const unimodal = [1, 2, 3, 3, 3, 4, 5];
			const unimodalStats = await computeEngine.calculateStatistics(unimodal);
			expect(unimodalStats.mode).toEqual([3]);
		});

		it("should compare WASM vs JavaScript performance", async () => {
			const dataset = generateRandomDataset(50_000);

			// Force WASM calculation
			const wasmStartTime = performance.now();
			const wasmStats = await computeEngine["calculateStatisticsWASM"](dataset);
			const wasmTime = performance.now() - wasmStartTime;

			// Force JavaScript calculation
			const jsStartTime = performance.now();
			const jsStats = await computeEngine["calculateStatisticsJS"](dataset);
			const jsTime = performance.now() - jsStartTime;

			// Results should be approximately equal
			expect(Math.abs(wasmStats.mean - jsStats.mean)).toBeLessThan(0.01);
			expect(Math.abs(wasmStats.variance - jsStats.variance)).toBeLessThan(
				0.01,
			);

			// WASM should generally be faster for large datasets
			console.log(`WASM time: ${wasmTime}ms, JS time: ${jsTime}ms`);
		});
	});

	describe("Time Series Analysis", () => {
		it("should analyze time series trends correctly", async () => {
			// Increasing trend
			const increasingData = generateAnalyticsData(100);
			increasingData.values = increasingData.values.map(
				(_, i) => i * 2 + Math.random() * 5,
			);

			const increasingAnalysis =
				await computeEngine.analyzeTimeSeries(increasingData);
			expect(increasingAnalysis.trend).toBe("increasing");

			// Decreasing trend
			const decreasingData = generateAnalyticsData(100);
			decreasingData.values = decreasingData.values.map(
				(_, i) => 100 - i * 1.5 + Math.random() * 3,
			);

			const decreasingAnalysis =
				await computeEngine.analyzeTimeSeries(decreasingData);
			expect(decreasingAnalysis.trend).toBe("decreasing");

			// Stable trend
			const stableData = generateAnalyticsData(100);
			stableData.values = stableData.values.map(() => 50 + Math.random() * 2);

			const stableAnalysis = await computeEngine.analyzeTimeSeries(stableData);
			expect(stableAnalysis.trend).toBe("stable");
		});

		it("should detect seasonal patterns", async () => {
			// Create data with obvious seasonal pattern (daily cycle)
			const seasonalData = generateAnalyticsData(168); // 1 week of hourly data
			seasonalData.values = seasonalData.values.map((_, i) => {
				const hour = i % 24;
				const baseValue = 50;
				const seasonalComponent = 20 * Math.sin((hour / 24) * 2 * Math.PI);
				const noise = Math.random() * 5;
				return baseValue + seasonalComponent + noise;
			});

			const analysis = await computeEngine.analyzeTimeSeries(seasonalData);
			expect(analysis.seasonality).toBe(true);
		});

		it("should detect anomalies in time series data", async () => {
			const normalData = generateAnalyticsData(100);

			// Add some obvious anomalies
			normalData.values[25] = 500; // High anomaly
			normalData.values[50] = -100; // Low anomaly
			normalData.values[75] = 450; // Another high anomaly

			const analysis = await computeEngine.analyzeTimeSeries(normalData);

			expect(analysis.anomalies.length).toBeGreaterThan(0);

			// Check that anomalies were detected at expected indices
			const anomalyIndices = analysis.anomalies.map((a) => a.index);
			expect(anomalyIndices).toContain(25);
			expect(anomalyIndices).toContain(50);
			expect(anomalyIndices).toContain(75);

			// Check severity scoring
			analysis.anomalies.forEach((anomaly) => {
				expect(anomaly.severity).toBeGreaterThan(0);
				expect(anomaly.severity).toBeLessThanOrEqual(3);
			});
		});

		it("should generate reasonable forecasts", async () => {
			// Create trending data
			const trendingData = generateAnalyticsData(50);
			trendingData.values = trendingData.values.map(
				(_, i) => 10 + i * 2 + Math.random() * 3,
			);

			const analysis = await computeEngine.analyzeTimeSeries(trendingData);

			expect(analysis.forecast).toHaveLength(10); // Default forecast length

			// Forecast should continue the trend
			const lastValue = trendingData.values[trendingData.values.length - 1];
			const firstForecast = analysis.forecast[0];
			const lastForecast = analysis.forecast[analysis.forecast.length - 1];

			expect(firstForecast).toBeGreaterThan(lastValue - 10); // Reasonable continuity
			expect(lastForecast).toBeGreaterThan(firstForecast); // Continuing trend
		});

		it("should handle time series analysis performance benchmarks", async () => {
			const performanceTests = [
				{ size: 1000, expectedTime: 500 },
				{ size: 10_000, expectedTime: 2000 },
				{ size: 50_000, expectedTime: 10_000 },
			];

			for (const test of performanceTests) {
				const data = generateAnalyticsData(test.size);
				const startTime = performance.now();

				const analysis = await computeEngine.analyzeTimeSeries(data);
				const executionTime = performance.now() - startTime;

				expect(executionTime).toBeLessThan(test.expectedTime);
				expect(analysis.statistics.count).toBe(test.size);
			}
		});
	});

	describe("Parallel Processing", () => {
		it("should process large datasets in parallel chunks", async () => {
			const largeDataset = generateRandomDataset(10_000);
			const chunkSize = 1000;

			const results = await computeEngine.processLargeDataset(
				largeDataset,
				async (chunk) => {
					// Simulate processing each chunk (calculate sum)
					return chunk.reduce((sum, val) => sum + val, 0);
				},
				{
					chunkSize,
					parallel: true,
				},
			);

			expect(results).toHaveLength(10); // 10 chunks of 1000 each

			// Verify total sum matches
			const totalFromChunks = results.reduce(
				(sum, chunkSum) => sum + chunkSum,
				0,
			);
			const totalDirect = largeDataset.reduce((sum, val) => sum + val, 0);
			expect(Math.abs(totalFromChunks - totalDirect)).toBeLessThan(0.01);
		});

		it("should report processing progress", async () => {
			const dataset = generateRandomDataset(5000);
			const progressUpdates: number[] = [];

			await computeEngine.processLargeDataset(
				dataset,
				async (chunk) => {
					await new Promise((resolve) => setTimeout(resolve, 10)); // Simulate work
					return chunk.length;
				},
				{
					chunkSize: 1000,
					onProgress: (progress) => {
						progressUpdates.push(progress);
					},
				},
			);

			expect(progressUpdates.length).toBeGreaterThan(0);
			expect(progressUpdates[progressUpdates.length - 1]).toBe(100); // Final progress should be 100%

			// Progress should be monotonically increasing
			for (let i = 1; i < progressUpdates.length; i++) {
				expect(progressUpdates[i]).toBeGreaterThanOrEqual(
					progressUpdates[i - 1],
				);
			}
		});

		it("should handle errors in parallel processing gracefully", async () => {
			const dataset = generateRandomDataset(3000);

			const processor = async (chunk: number[], index: number) => {
				if (index === 1) {
					// Second chunk will fail
					throw new Error("Processing error in chunk");
				}
				return chunk.reduce((sum, val) => sum + val, 0);
			};

			await expect(
				computeEngine.processLargeDataset(dataset, processor, {
					chunkSize: 1000,
				}),
			).rejects.toThrow("Processing error in chunk");
		});

		it("should fall back to sequential processing when parallel is disabled", async () => {
			const dataset = generateRandomDataset(2000);
			const processOrder: number[] = [];

			const results = await computeEngine.processLargeDataset(
				dataset,
				async (chunk, index) => {
					processOrder.push(index || 0);
					await new Promise((resolve) => setTimeout(resolve, 50));
					return chunk.length;
				},
				{
					chunkSize: 500,
					parallel: false,
				},
			);

			expect(results).toHaveLength(4);
			expect(processOrder).toEqual([0, 1, 2, 3]); // Sequential order
		});

		it("should optimize chunk size based on data characteristics", async () => {
			const computeEngineWithCustomChunking = new ComputeWASM({
				enableParallelProcessing: true,
				maxWorkers: 4,
				chunkSize: "auto" as any, // Custom chunking logic
			});

			await computeEngineWithCustomChunking.initialize();

			const stats = computeEngineWithCustomChunking.getStats();
			expect(stats.config.chunkSize).toBeGreaterThan(0);

			computeEngineWithCustomChunking.cleanup();
		});
	});

	describe("Memory Management and Performance", () => {
		it("should efficiently manage memory for large computations", async () => {
			const memoryTestSizes = [1000, 10_000, 100_000];
			const memoryUsage: number[] = [];

			for (const size of memoryTestSizes) {
				// @ts-expect-error - Access memory for testing
				const initialMemory = process.memoryUsage?.()?.heapUsed || 0;

				const data = generateRandomDataset(size);
				await computeEngine.calculateStatistics(data);

				// @ts-expect-error - Access memory for testing
				const finalMemory = process.memoryUsage?.()?.heapUsed || 0;
				memoryUsage.push(finalMemory - initialMemory);
			}

			// Memory usage should not grow exponentially
			expect(memoryUsage[2] / memoryUsage[0]).toBeLessThan(200); // Less than 200x growth for 100x data
		});

		it("should handle concurrent compute operations", async () => {
			const concurrentOperations = 5;
			const datasets = Array.from({ length: concurrentOperations }, () =>
				generateRandomDataset(5000),
			);

			const startTime = performance.now();

			const promises = datasets.map(async (data, index) => {
				const stats = await computeEngine.calculateStatistics(data);
				return { index, stats };
			});

			const results = await Promise.all(promises);
			const totalTime = performance.now() - startTime;

			expect(results).toHaveLength(concurrentOperations);
			expect(totalTime).toBeLessThan(10_000); // Should handle concurrent ops efficiently

			// Verify all operations completed successfully
			results.forEach((result, index) => {
				expect(result.index).toBe(index);
				expect(result.stats.count).toBe(5000);
			});
		});

		it("should cleanup resources properly", async () => {
			const engine = new ComputeWASM({
				enableParallelProcessing: true,
				maxWorkers: 3,
			});

			await engine.initialize();

			const statsBeforeCleanup = engine.getStats();
			expect(statsBeforeCleanup.workersCount).toBe(0); // Workers not actually created in mock

			engine.cleanup();

			const statsAfterCleanup = engine.getStats();
			expect(statsAfterCleanup.queuedTasks).toBe(0);
			expect(statsAfterCleanup.runningTasks).toBe(0);
		});

		it("should handle performance degradation gracefully", async () => {
			// Simulate system under load
			const heavyLoad = Array.from({ length: 3 }, () =>
				computeEngine.calculateStatistics(generateRandomDataset(50_000)),
			);

			const lightLoad = computeEngine.calculateStatistics(
				generateRandomDataset(1000),
			);

			const [lightResult, ...heavyResults] = await Promise.all([
				lightLoad,
				...heavyLoad,
			]);

			// Light load should still complete successfully despite heavy operations
			expect(lightResult.count).toBe(1000);
			heavyResults.forEach((result) => {
				expect(result.count).toBe(50_000);
			});
		});
	});

	describe("Compute Manager Integration", () => {
		it("should use singleton compute manager correctly", async () => {
			const manager1 = computeManager;
			const manager2 = computeManager;

			expect(manager1).toBe(manager2); // Should be the same instance

			await manager1.initialize();

			const stats = manager1.getStats();
			expect(stats).toBeDefined();
			expect(stats.isWASMEnabled).toBeDefined();
		});

		it("should provide compute engine factory functions", async () => {
			const engine1 = createComputeEngine({ maxWorkers: 2 });
			const engine2 = getComputeEngine({ maxWorkers: 4 });

			await engine1.initialize();
			await engine2.initialize();

			const stats1 = engine1.getStats();
			const stats2 = engine2.getStats();

			expect(stats1.config.maxWorkers).toBe(2);
			expect(stats2.config.maxWorkers).toBe(4);

			engine1.cleanup();
			engine2.cleanup();
		});

		it("should handle multiple compute engine instances", async () => {
			const engines = Array.from({ length: 3 }, (_, i) =>
				createComputeEngine({ maxWorkers: i + 1 }),
			);

			await Promise.all(engines.map((engine) => engine.initialize()));

			const statsList = engines.map((engine) => engine.getStats());

			statsList.forEach((stats, index) => {
				expect(stats.config.maxWorkers).toBe(index + 1);
			});

			engines.forEach((engine) => engine.cleanup());
		});
	});

	describe("Error Handling and Resilience", () => {
		it("should handle invalid input data gracefully", async () => {
			// Test with various invalid inputs
			await expect(
				computeEngine.calculateStatistics(null as any),
			).rejects.toThrow();
			await expect(
				computeEngine.calculateStatistics(undefined as any),
			).rejects.toThrow();
			await expect(
				computeEngine.calculateStatistics([Number.NaN, 1, 2]),
			).rejects.toThrow();
			await expect(
				computeEngine.calculateStatistics([Number.POSITIVE_INFINITY, 1, 2]),
			).rejects.toThrow();
		});

		it("should recover from WASM module errors", async () => {
			// Mock WASM error during computation
			vi.mocked(mockWASMInstance.exports.compute).mockImplementationOnce(() => {
				throw new Error("WASM runtime error");
			});

			// Should fall back to JavaScript implementation
			const data = generateRandomDataset(100);
			const stats = await computeEngine.calculateStatistics(data);

			expect(stats.count).toBe(100);
			expect(stats.mean).toBeGreaterThan(0);
		});

		it("should handle worker failures in parallel processing", async () => {
			// Mock worker error
			const mockWorker = {
				postMessage: vi.fn(),
				terminate: vi.fn(),
				onmessage: null,
				onerror: vi.fn(),
			};

			vi.mocked(Worker).mockImplementationOnce(() => mockWorker as any);

			const dataset = generateRandomDataset(2000);

			// Should still complete despite worker issues
			const results = await computeEngine.processLargeDataset(
				dataset,
				async (chunk) => chunk.reduce((sum, val) => sum + val, 0),
				{ chunkSize: 500, parallel: true },
			);

			expect(results).toHaveLength(4);
		});

		it("should validate compute configuration", async () => {
			// Invalid configurations should be handled gracefully
			const invalidConfigs = [
				{ maxWorkers: -1 },
				{ chunkSize: 0 },
				{ maxWorkers: null as any },
				{ chunkSize: "invalid" as any },
			];

			for (const config of invalidConfigs) {
				const engine = new ComputeWASM(config);
				await engine.initialize();

				const stats = engine.getStats();
				expect(stats.config.maxWorkers).toBeGreaterThan(0);
				expect(stats.config.chunkSize).toBeGreaterThan(0);

				engine.cleanup();
			}
		});
	});
});
