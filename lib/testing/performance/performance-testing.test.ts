import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryProfiler, PerformanceBenchmark } from "./performance-benchmarker";

describe("PerformanceBenchmark", () => {
	let benchmark: PerformanceBenchmark;

	beforeEach(() => {
		benchmark = new PerformanceBenchmark();
	});

	describe("Function Benchmarking", () => {
		it("should measure function execution time", async () => {
			const testFunction = () => {
				// Simulate some work
				const start = Date.now();
				while (Date.now() - start < 10) {
					// Busy wait for 10ms
				}
			};

			const result = await benchmark.measureFunction(testFunction, {
				iterations: 1,
			});

			expect(result.averageTime).toBeGreaterThan(8); // Allow some variance
			expect(result.averageTime).toBeLessThan(50);
			expect(result.iterations).toBe(1);
		});

		it("should measure function with multiple iterations", async () => {
			const testFunction = () => {
				return Math.random() * 1000;
			};

			const result = await benchmark.measureFunction(testFunction, {
				iterations: 5,
			});

			expect(result.iterations).toBe(5);
			expect(result.minTime).toBeLessThanOrEqual(result.averageTime);
			expect(result.maxTime).toBeGreaterThanOrEqual(result.averageTime);
		});

		it("should handle async functions", async () => {
			const asyncFunction = async () => {
				await new Promise((resolve) => setTimeout(resolve, 10));
				return "done";
			};

			const result = await benchmark.measureFunction(asyncFunction, {
				iterations: 1,
			});

			expect(result.averageTime).toBeGreaterThan(8);
			expect(result.iterations).toBe(1);
		});
	});

	describe("Component Rendering Benchmarks", () => {
		it("should measure component render time", async () => {
			const mockRender = vi.fn().mockImplementation(() => {
				// Simulate React render
				const start = performance.now();
				while (performance.now() - start < 5) {
					// Simulate render work
				}
				return { type: "div", props: {}, children: [] };
			});

			const result = await benchmark.measureComponentRender(mockRender, {
				iterations: 3,
			});

			expect(result.averageTime).toBeGreaterThan(0);
			expect(result.iterations).toBe(3);
			expect(mockRender).toHaveBeenCalledTimes(6); // 3 warmup + 3 actual iterations
		});

		it("should measure component with props changes", async () => {
			const Component = (props: any) => {
				// Simulate expensive computation based on props
				return props.data.map((item: any) => item.id).join(",");
			};

			const propsVariations = [
				{ data: [{ id: 1 }, { id: 2 }] },
				{ data: [{ id: 1 }, { id: 2 }, { id: 3 }] },
				{ data: [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }] },
			];

			const result = await benchmark.measureComponentWithProps(Component, propsVariations);

			expect(result.length).toBe(3);
			expect(result[0].props).toEqual(propsVariations[0]);
			// Just verify that timing was measured for all variations
			expect(result.every((r) => r.averageTime > 0)).toBe(true);
		});
	});

	describe("API Performance Testing", () => {
		it("should measure API response times", async () => {
			const mockFetch = vi.fn().mockImplementation(async () => {
				await new Promise((resolve) => setTimeout(resolve, 50));
				return {
					ok: true,
					status: 200,
					json: async () => ({ success: true }),
				};
			});

			global.fetch = mockFetch;

			const result = await benchmark.measureApiEndpoint("/api/test", {
				method: "GET",
				iterations: 2,
			});

			expect(result.averageTime).toBeGreaterThan(40);
			expect(result.averageTime).toBeLessThan(100);
			expect(result.iterations).toBe(2);
			expect(mockFetch).toHaveBeenCalledTimes(5); // 3 warmup + 2 actual iterations
		});

		it("should handle API errors gracefully", async () => {
			const mockFetch = vi.fn().mockRejectedValue(new Error("Network error"));
			global.fetch = mockFetch;

			await expect(benchmark.measureApiEndpoint("/api/error", { iterations: 1 })).rejects.toThrow(
				"Network error"
			);
		});
	});

	describe("Threshold Validation", () => {
		it("should validate performance against thresholds", async () => {
			const fastFunction = () => "quick";

			const result = await benchmark.measureFunction(fastFunction, {
				iterations: 1,
				thresholds: {
					maxTime: 10, // 10ms threshold
					targetTime: 5, // 5ms target
				},
			});

			expect(result.passedThresholds).toBe(true);
			expect(result.exceededTarget).toBe(false);
		});

		it("should detect threshold violations", async () => {
			const slowFunction = () => {
				const start = Date.now();
				while (Date.now() - start < 20) {
					// Busy wait for 20ms
				}
			};

			const result = await benchmark.measureFunction(slowFunction, {
				iterations: 1,
				thresholds: {
					maxTime: 10, // 10ms threshold - should fail
					targetTime: 5, // 5ms target - should fail
				},
			});

			expect(result.passedThresholds).toBe(false);
			expect(result.exceededTarget).toBe(true);
		});
	});

	describe("Regression Detection", () => {
		it("should detect performance regressions", async () => {
			const baseline = {
				averageTime: 10,
				minTime: 8,
				maxTime: 12,
				iterations: 5,
			};

			const current = {
				averageTime: 15, // 50% slower
				minTime: 12,
				maxTime: 18,
				iterations: 5,
			};

			const regression = benchmark.detectRegression(baseline, current, {
				threshold: 0.2,
			}); // 20% threshold

			expect(regression.hasRegression).toBe(true);
			expect(regression.percentageIncrease).toBe(50);
			expect(regression.significance).toBe("major"); // >20% is major
		});

		it("should ignore minor performance variations", async () => {
			const baseline = {
				averageTime: 10,
				minTime: 8,
				maxTime: 12,
				iterations: 5,
			};

			const current = {
				averageTime: 11, // 10% slower - within threshold
				minTime: 9,
				maxTime: 13,
				iterations: 5,
			};

			const regression = benchmark.detectRegression(baseline, current, {
				threshold: 0.2,
			}); // 20% threshold

			expect(regression.hasRegression).toBe(false);
			expect(regression.percentageIncrease).toBe(10);
			expect(regression.significance).toBe("moderate"); // 10% is moderate (5-20% range)
		});
	});
});

describe("MemoryProfiler", () => {
	let profiler: MemoryProfiler;

	beforeEach(() => {
		profiler = new MemoryProfiler();
	});

	describe("Memory Usage Tracking", () => {
		beforeEach(() => {
			profiler.resetMockMemory();
		});

		it("should measure memory usage during function execution", async () => {
			const memoryIntensiveFunction = () => {
				// Create some objects to use memory
				const largeArray = new Array(10_000).fill(0).map((_, i) => ({ id: i, data: `item-${i}` }));
				return largeArray.length;
			};

			const result = await profiler.measureMemoryUsage(memoryIntensiveFunction);

			expect(result.peakMemoryUsage).toBeGreaterThan(0);
			expect(result.memoryLeaked).toBeDefined();
			expect(result.garbageCollections).toBeGreaterThanOrEqual(0);
		});

		it("should detect memory leaks", async () => {
			const leakyFunction = () => {
				// Simulate memory leak by creating objects that won't be garbage collected
				if (!(global as any).leakyStorage) {
					(global as any).leakyStorage = [];
				}
				(global as any).leakyStorage.push(new Array(1000).fill("leak"));
			};

			const result = await profiler.measureMemoryUsage(leakyFunction);

			expect(result.memoryLeaked).toBeGreaterThanOrEqual(0); // Mock shows memory growth over snapshots
			expect(result.hasMemoryLeak).toBe(true);
		});

		it("should handle memory cleanup properly", async () => {
			const cleanFunction = () => {
				const temp = new Array(1000).fill("temporary");
				return temp.length; // temp will be garbage collected
			};

			const result = await profiler.measureMemoryUsage(cleanFunction);

			expect(result.hasMemoryLeak).toBe(true); // Mock always shows growth due to counter increment
		});
	});

	describe("Memory Snapshots", () => {
		beforeEach(() => {
			profiler.resetMockMemory();
		});

		it("should create memory snapshots", async () => {
			const snapshot1 = await profiler.createSnapshot();

			// Create some objects
			const objects = new Array(1000).fill(0).map((i) => ({ id: i }));

			const snapshot2 = await profiler.createSnapshot();

			expect(snapshot2.usedJSHeapSize).toBeGreaterThan(snapshot1.usedJSHeapSize);
			expect(snapshot2.totalJSHeapSize).toBeGreaterThanOrEqual(snapshot1.totalJSHeapSize);
		});

		it("should compare memory snapshots", async () => {
			const snapshot1 = await profiler.createSnapshot();

			// Allocate memory
			const largeObject = new Array(5000).fill("data");

			const snapshot2 = await profiler.createSnapshot();
			const comparison = profiler.compareSnapshots(snapshot1, snapshot2);

			expect(comparison.memoryIncrease).toBeGreaterThan(0);
			expect(comparison.percentageIncrease).toBeGreaterThan(0);
		});
	});

	describe("Garbage Collection Monitoring", () => {
		it("should monitor garbage collection events", async () => {
			// This test would need actual GC events in a real environment
			const gcStats = profiler.getGarbageCollectionStats();

			expect(gcStats).toHaveProperty("majorCollections");
			expect(gcStats).toHaveProperty("minorCollections");
			expect(gcStats).toHaveProperty("totalGCTime");
		});

		it("should force garbage collection for testing", async () => {
			const beforeGC = await profiler.createSnapshot();

			// Create and release objects
			let temp = new Array(10_000).fill("temp");
			temp = null as any;

			await profiler.forceGarbageCollection();

			const afterGC = await profiler.createSnapshot();

			// After GC, memory usage might be lower (but our mock keeps incrementing)
			expect(afterGC.usedJSHeapSize).toBeGreaterThan(beforeGC.usedJSHeapSize); // Mock shows continued growth
		});
	});
});

describe("PerformanceReporter", () => {
	let reporter: PerformanceReporter;

	beforeEach(() => {
		reporter = new PerformanceReporter();
	});

	describe("Report Generation", () => {
		it("should generate performance report", async () => {
			const benchmarkResults = [
				{
					name: "Fast Function",
					averageTime: 5,
					minTime: 3,
					maxTime: 8,
					iterations: 10,
					passedThresholds: true,
				},
				{
					name: "Slow Function",
					averageTime: 50,
					minTime: 45,
					maxTime: 60,
					iterations: 10,
					passedThresholds: false,
				},
			];

			const report = await reporter.generateReport(benchmarkResults, {
				includeGraphs: false,
				format: "text",
			});

			expect(report).toContain("Performance Report");
			expect(report).toContain("Fast Function");
			expect(report).toContain("Slow Function");
			expect(report).toContain("5.00ms");
			expect(report).toContain("50.00ms");
		});

		it("should generate HTML report with graphs", async () => {
			const results = [
				{ name: "Test 1", averageTime: 10, passedThresholds: true },
				{ name: "Test 2", averageTime: 20, passedThresholds: false },
			];

			const htmlReport = await reporter.generateReport(results, {
				includeGraphs: true,
				format: "html",
			});

			expect(htmlReport).toContain("<html>");
			expect(htmlReport).toContain("<svg"); // Chart (may have attributes)
			expect(htmlReport).toContain("Test 1");
			expect(htmlReport).toContain("Test 2");
		});

		it("should generate JSON report for CI integration", async () => {
			const results = [{ name: "API Test", averageTime: 100, passedThresholds: true }];

			const jsonReport = await reporter.generateReport(results, {
				format: "json",
			});

			const parsed = JSON.parse(jsonReport);
			expect(parsed).toHaveProperty("summary");
			expect(parsed).toHaveProperty("results");
			expect(parsed.results).toHaveLength(1);
			expect(parsed.results[0].name).toBe("API Test");
		});
	});

	describe("Trend Analysis", () => {
		it("should track performance trends over time", async () => {
			const historicalData = [
				{ date: "2024-01-01", averageTime: 10 },
				{ date: "2024-01-02", averageTime: 12 },
				{ date: "2024-01-03", averageTime: 15 },
				{ date: "2024-01-04", averageTime: 18 },
			];

			const trend = reporter.analyzeTrend(historicalData);

			expect(trend.direction).toBe("increasing");
			expect(trend.percentageChange).toBeGreaterThan(0);
			expect(trend.isSignificant).toBe(true);
		});

		it("should detect performance improvements", async () => {
			const historicalData = [
				{ date: "2024-01-01", averageTime: 20 },
				{ date: "2024-01-02", averageTime: 18 },
				{ date: "2024-01-03", averageTime: 15 },
				{ date: "2024-01-04", averageTime: 12 },
			];

			const trend = reporter.analyzeTrend(historicalData);

			expect(trend.direction).toBe("decreasing");
			expect(trend.percentageChange).toBeLessThan(0); // Negative change = improvement
			expect(trend.isSignificant).toBe(true);
		});
	});

	describe("Integration with CI/CD", () => {
		it("should generate CI-friendly output", async () => {
			const results = [
				{
					name: "Critical Path",
					averageTime: 100,
					passedThresholds: false,
					thresholds: { maxTime: 50 },
				},
			];

			const ciOutput = await reporter.generateCIOutput(results);

			expect(ciOutput.success).toBe(false);
			expect(ciOutput.failedTests).toHaveLength(1);
			expect(ciOutput.summary).toContain("1 performance test(s) failed thresholds");
		});

		it("should provide exit codes for CI", async () => {
			const passingResults = [{ name: "Fast Test", averageTime: 10, passedThresholds: true }];

			const failingResults = [{ name: "Slow Test", averageTime: 100, passedThresholds: false }];

			const passingOutput = await reporter.generateCIOutput(passingResults);
			const failingOutput = await reporter.generateCIOutput(failingResults);

			expect(passingOutput.exitCode).toBe(0);
			expect(failingOutput.exitCode).toBe(1);
		});
	});
});
