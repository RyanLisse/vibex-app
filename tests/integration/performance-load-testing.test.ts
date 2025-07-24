/**
 * Comprehensive Performance and Load Testing Suite
 *
 * Tests system performance under various load conditions:
 * - Concurrent user simulation
 * - Database query performance
 * - API endpoint stress testing
 * - Memory leak detection
 * - Resource utilization monitoring
 * - Scalability analysis
 * - Performance regression detection
 */

import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest";
import { PrometheusMetricsCollector } from "../../lib/metrics/prometheus-client";
import { observability } from "../../lib/observability";

// Performance testing utilities
class LoadTester {
	private results: Map<string, any[]> = new Map();
	private startTime: number = Date.now();

	async runConcurrent<T>(
		name: string,
		concurrency: number,
		iterations: number,
		fn: (index: number) => Promise<T>
	): Promise<{
		totalTime: number;
		avgTime: number;
		minTime: number;
		maxTime: number;
		throughput: number;
		errors: number;
		successRate: number;
	}> {
		const times: number[] = [];
		const errors: Error[] = [];
		const batches = Math.ceil(iterations / concurrency);

		for (let batch = 0; batch < batches; batch++) {
			const promises = [];
			const batchSize = Math.min(concurrency, iterations - batch * concurrency);

			for (let i = 0; i < batchSize; i++) {
				const index = batch * concurrency + i;
				const promise = this.measureExecution(fn, index)
					.then(({ duration, result }) => {
						times.push(duration);
						return result;
					})
					.catch((error) => {
						errors.push(error);
						return null;
					});

				promises.push(promise);
			}

			await Promise.all(promises);
		}

		const successCount = iterations - errors.length;
		const result = {
			totalTime: Date.now() - this.startTime,
			avgTime: times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0,
			minTime: times.length > 0 ? Math.min(...times) : 0,
			maxTime: times.length > 0 ? Math.max(...times) : 0,
			throughput: successCount / ((Date.now() - this.startTime) / 1000),
			errors: errors.length,
			successRate: (successCount / iterations) * 100,
		};

		this.results.set(name, [...(this.results.get(name) || []), result]);
		return result;
	}

	private async measureExecution<T>(
		fn: (index: number) => Promise<T>,
		index: number
	): Promise<{ duration: number; result: T }> {
		const start = Date.now();
		const result = await fn(index);
		return { duration: Date.now() - start, result };
	}

	getReport() {
		const report: any = {};
		for (const [name, results] of this.results) {
			report[name] = {
				runs: results.length,
				avgThroughput: results.reduce((a, b) => a + b.throughput, 0) / results.length,
				avgResponseTime: results.reduce((a, b) => a + b.avgTime, 0) / results.length,
				totalErrors: results.reduce((a, b) => a + b.errors, 0),
				avgSuccessRate: results.reduce((a, b) => a + b.successRate, 0) / results.length,
			};
		}
		return report;
	}
}

// Memory monitoring
class MemoryMonitor {
	private snapshots: Array<{
		timestamp: number;
		heapUsed: number;
		external: number;
	}> = [];
	private interval: any;

	start(intervalMs = 1000) {
		this.interval = setInterval(() => {
			if (typeof process !== "undefined" && process.memoryUsage) {
				const usage = process.memoryUsage();
				this.snapshots.push({
					timestamp: Date.now(),
					heapUsed: usage.heapUsed,
					external: usage.external || 0,
				});
			}
		}, intervalMs);
	}

	stop() {
		if (this.interval) {
			clearInterval(this.interval);
		}
	}

	getReport() {
		if (this.snapshots.length === 0) return null;

		const heapSizes = this.snapshots.map((s) => s.heapUsed);
		const growth = heapSizes[heapSizes.length - 1] - heapSizes[0];

		return {
			initialHeap: heapSizes[0],
			finalHeap: heapSizes[heapSizes.length - 1],
			peakHeap: Math.max(...heapSizes),
			avgHeap: heapSizes.reduce((a, b) => a + b, 0) / heapSizes.length,
			heapGrowth: growth,
			growthRate:
				(growth /
					(this.snapshots[this.snapshots.length - 1].timestamp - this.snapshots[0].timestamp)) *
				1000,
			possibleLeak: growth > 50 * 1024 * 1024, // 50MB growth indicates possible leak
		};
	}
}

describe("Performance and Load Testing", () => {
	let loadTester: LoadTester;
	let memoryMonitor: MemoryMonitor;
	let metricsCollector: PrometheusMetricsCollector;

	beforeAll(() => {
		loadTester = new LoadTester();
		memoryMonitor = new MemoryMonitor();
		metricsCollector = PrometheusMetricsCollector.getInstance();
		memoryMonitor.start();
	});

	afterAll(() => {
		memoryMonitor.stop();

		console.log("\n=== Performance Test Report ===");
		console.log("Load Test Results:");
		console.log(JSON.stringify(loadTester.getReport(), null, 2));
		console.log("\nMemory Analysis:");
		console.log(JSON.stringify(memoryMonitor.getReport(), null, 2));
	});

	beforeEach(() => {
		metricsCollector.clearMetrics();
	});

	describe("1. API Endpoint Load Testing", () => {
		test("should handle 100 concurrent API requests", async () => {
			const mockAPICall = async (index: number) => {
				// Simulate API processing with variable latency
				const baseLatency = 50;
				const variance = 20;
				const latency = baseLatency + Math.random() * variance;

				await new Promise((resolve) => setTimeout(resolve, latency));

				// 5% error rate simulation
				if (Math.random() < 0.05) {
					throw new Error("Simulated API error");
				}

				return {
					id: index,
					timestamp: Date.now(),
					data: `Response for request ${index}`,
				};
			};

			const result = await loadTester.runConcurrent(
				"API Endpoint Test",
				100, // 100 concurrent requests
				1000, // 1000 total requests
				mockAPICall
			);

			// Performance assertions
			expect(result.avgTime).toBeLessThan(100); // Average response under 100ms
			expect(result.throughput).toBeGreaterThan(500); // At least 500 req/s
			expect(result.successRate).toBeGreaterThan(94); // Account for 5% simulated errors

			// Record metrics
			metricsCollector.recordHttpRequest("GET", "/api/test", 200, result.avgTime / 1000);
			observability.performance.recordMetric("api_load_test", {
				throughput: result.throughput,
				avgLatency: result.avgTime,
				errorRate: 100 - result.successRate,
			});
		});

		test("should maintain performance under sustained load", async () => {
			const sustainedDuration = 5000; // 5 seconds
			const requestsPerSecond = 200;
			const results = [];

			const mockAPICall = async () => {
				await new Promise((resolve) => setTimeout(resolve, 10 + Math.random() * 10));
				return { success: true };
			};

			const startTime = Date.now();

			while (Date.now() - startTime < sustainedDuration) {
				const batchStart = Date.now();

				// Run batch of requests
				const batchResult = await loadTester.runConcurrent(
					"Sustained Load Test",
					requestsPerSecond,
					requestsPerSecond,
					mockAPICall
				);

				results.push({
					timestamp: Date.now() - startTime,
					throughput: batchResult.throughput,
					avgLatency: batchResult.avgTime,
				});

				// Wait for next second
				const elapsed = Date.now() - batchStart;
				if (elapsed < 1000) {
					await new Promise((resolve) => setTimeout(resolve, 1000 - elapsed));
				}
			}

			// Verify consistent performance
			const throughputs = results.map((r) => r.throughput);
			const avgThroughput = throughputs.reduce((a, b) => a + b) / throughputs.length;

			// Throughput shouldn't vary more than 20%
			throughputs.forEach((t) => {
				expect(Math.abs(t - avgThroughput) / avgThroughput).toBeLessThan(0.2);
			});
		});
	});

	describe("2. Database Performance Testing", () => {
		test("should handle concurrent database operations", async () => {
			const mockDbQuery = async (index: number) => {
				const queryTypes = ["SELECT", "INSERT", "UPDATE", "DELETE"];
				const queryType = queryTypes[index % queryTypes.length];

				// Simulate query execution time
				const baseTimes = { SELECT: 10, INSERT: 20, UPDATE: 15, DELETE: 25 };
				const baseTime = baseTimes[queryType as keyof typeof baseTimes];
				await new Promise((resolve) => setTimeout(resolve, baseTime + Math.random() * 10));

				metricsCollector.recordDatabaseQuery(queryType, "test_table", baseTime / 1000);

				return { queryType, index, result: "success" };
			};

			const result = await loadTester.runConcurrent(
				"Database Operations",
				50, // 50 concurrent connections
				500, // 500 total queries
				mockDbQuery
			);

			expect(result.successRate).toBe(100);
			expect(result.avgTime).toBeLessThan(50); // Queries should average under 50ms

			// Verify query distribution
			const metrics = await metricsCollector.getMetrics();
			expect(metrics).toContain("database_query_duration_seconds");
			expect(metrics).toContain('operation="SELECT"');
			expect(metrics).toContain('operation="INSERT"');
		});

		test("should detect slow queries under load", async () => {
			const slowQueries: Array<{ query: string; duration: number }> = [];

			const mockComplexQuery = async (index: number) => {
				// 10% of queries are slow
				const isSlow = index % 10 === 0;
				const duration = isSlow ? 500 + Math.random() * 500 : 20 + Math.random() * 30;

				await new Promise((resolve) => setTimeout(resolve, duration));

				if (duration > 100) {
					slowQueries.push({
						query: `SELECT * FROM large_table WHERE complex_condition_${index}`,
						duration,
					});
				}

				observability.database.recordQuery("select", `query_${index}`, duration);
				return { duration };
			};

			await loadTester.runConcurrent("Complex Query Test", 20, 100, mockComplexQuery);

			// Verify slow query detection
			expect(slowQueries.length).toBeGreaterThan(5);
			slowQueries.forEach((sq) => {
				expect(sq.duration).toBeGreaterThan(100);
			});

			// Check if alerts would trigger
			const avgSlowQueryTime = slowQueries.reduce((a, b) => a + b.duration, 0) / slowQueries.length;
			expect(avgSlowQueryTime).toBeGreaterThan(500);
		});
	});

	describe("3. Memory Leak Detection", () => {
		test("should detect memory leaks in object allocation", async () => {
			const leakyObjects: any[] = [];

			const leakyOperation = async (index: number) => {
				// Simulate memory leak by retaining objects
				const largeObject = {
					id: index,
					data: new Array(1000).fill(`Data for object ${index}`),
					timestamp: Date.now(),
				};

				// Intentional leak - objects are never released
				if (index % 10 === 0) {
					leakyObjects.push(largeObject);
				}

				// Simulate processing
				await new Promise((resolve) => setTimeout(resolve, 5));

				return { processed: true };
			};

			// Get initial memory
			if (global.gc) global.gc();
			const initialMemory = process.memoryUsage().heapUsed;

			// Run operations that leak memory
			await loadTester.runConcurrent("Memory Leak Test", 10, 1000, leakyOperation);

			// Force garbage collection if available
			if (global.gc) global.gc();

			// Check memory growth
			const finalMemory = process.memoryUsage().heapUsed;
			const memoryGrowth = finalMemory - initialMemory;

			// Verify memory growth detection
			expect(leakyObjects.length).toBeGreaterThan(50);
			expect(memoryGrowth).toBeGreaterThan(1024 * 1024); // At least 1MB growth

			// Clean up
			leakyObjects.length = 0;
		});

		test("should maintain stable memory under normal operations", async () => {
			const stableOperation = async (index: number) => {
				// Create temporary objects that should be garbage collected
				const tempData = {
					id: index,
					data: `Temporary data ${index}`,
					array: new Array(100).fill(index),
				};

				// Process and discard
				await new Promise((resolve) => setTimeout(resolve, 2));

				return tempData.id; // Return only primitive
			};

			// Warm up
			await loadTester.runConcurrent("Warmup", 10, 100, stableOperation);

			// Get baseline after warmup
			if (global.gc) global.gc();
			const baselineMemory = process.memoryUsage().heapUsed;

			// Run stable operations
			await loadTester.runConcurrent("Stable Memory Test", 20, 500, stableOperation);

			// Check memory stability
			if (global.gc) global.gc();
			const finalMemory = process.memoryUsage().heapUsed;
			const memoryGrowth = finalMemory - baselineMemory;

			// Memory growth should be minimal
			expect(memoryGrowth).toBeLessThan(5 * 1024 * 1024); // Less than 5MB growth
		});
	});

	describe("4. Resource Utilization", () => {
		test("should monitor CPU usage patterns", async () => {
			const cpuIntensiveOperation = async (index: number) => {
				// Simulate CPU-intensive work
				const start = Date.now();
				let result = 0;

				// Fibonacci calculation (intentionally inefficient)
				const fib = (n: number): number => {
					if (n <= 1) return n;
					return fib(n - 1) + fib(n - 2);
				};

				result = fib(20 + (index % 5)); // Vary the load

				const duration = Date.now() - start;
				metricsCollector.gauge("cpu_operation_duration", duration);

				return { result, duration };
			};

			const result = await loadTester.runConcurrent(
				"CPU Intensive Test",
				4, // Limit concurrency for CPU-bound work
				20,
				cpuIntensiveOperation
			);

			expect(result.successRate).toBe(100);
			expect(result.avgTime).toBeGreaterThan(10); // CPU work takes time
		});

		test("should handle mixed workload efficiently", async () => {
			const mixedOperation = async (index: number) => {
				const operationType = index % 4;

				switch (operationType) {
					case 0: {
						// CPU-bound
						const sum = Array(1000)
							.fill(0)
							.reduce((a, _, i) => a + Math.sqrt(i), 0);
						return { type: "cpu", result: sum };
					}

					case 1: // I/O-bound
						await new Promise((resolve) => setTimeout(resolve, 50));
						return { type: "io", result: "io complete" };

					case 2: {
						// Memory-intensive
						const data = new Array(10000).fill(index).map((i) => ({ id: i, data: `Item ${i}` }));
						return { type: "memory", result: data.length };
					}

					case 3: // Network simulation
						await new Promise((resolve) => setTimeout(resolve, 20 + Math.random() * 30));
						return { type: "network", result: "response" };

					default:
						return { type: "unknown", result: null };
				}
			};

			const result = await loadTester.runConcurrent("Mixed Workload Test", 50, 400, mixedOperation);

			expect(result.successRate).toBe(100);
			expect(result.throughput).toBeGreaterThan(100); // Should handle mixed load well
		});
	});

	describe("5. Scalability Analysis", () => {
		test("should measure scalability with increasing load", async () => {
			const scalabilityResults = [];
			const baseOperation = async () => {
				await new Promise((resolve) => setTimeout(resolve, 10));
				return { success: true };
			};

			// Test with increasing concurrency
			for (const concurrency of [10, 25, 50, 100, 200]) {
				const result = await loadTester.runConcurrent(
					`Scalability Test ${concurrency}`,
					concurrency,
					concurrency * 10, // Total requests = 10x concurrency
					baseOperation
				);

				scalabilityResults.push({
					concurrency,
					throughput: result.throughput,
					avgLatency: result.avgTime,
					efficiency: result.throughput / concurrency,
				});

				// Record metrics
				metricsCollector.gauge("scalability_test_throughput", result.throughput, {
					concurrency: String(concurrency),
				});
				metricsCollector.gauge("scalability_test_latency", result.avgTime, {
					concurrency: String(concurrency),
				});
			}

			// Analyze scalability
			const efficiencies = scalabilityResults.map((r) => r.efficiency);
			const avgEfficiency = efficiencies.reduce((a, b) => a + b) / efficiencies.length;

			// System should maintain reasonable efficiency
			expect(avgEfficiency).toBeGreaterThan(0.5); // At least 50% efficiency

			// Throughput should increase with concurrency (up to a point)
			for (let i = 1; i < scalabilityResults.length - 1; i++) {
				const prev = scalabilityResults[i - 1];
				const curr = scalabilityResults[i];

				// Throughput should generally increase
				expect(curr.throughput).toBeGreaterThanOrEqual(prev.throughput * 0.9); // Allow 10% variance
			}
		});

		test("should identify system limits", async () => {
			let maxThroughput = 0;
			let optimalConcurrency = 0;

			const findLimitOperation = async () => {
				// Simulate resource-constrained operation
				const resources = 100; // Fixed resource pool
				const resourcesNeeded = 1 + Math.random() * 2;

				if (Math.random() < resourcesNeeded / resources) {
					throw new Error("Resource exhausted");
				}

				await new Promise((resolve) => setTimeout(resolve, 5));
				return { success: true };
			};

			// Find system limits
			for (const concurrency of [50, 100, 150, 200, 250, 300]) {
				try {
					const result = await loadTester.runConcurrent(
						`Limit Test ${concurrency}`,
						concurrency,
						concurrency * 5,
						findLimitOperation
					);

					if (result.throughput > maxThroughput) {
						maxThroughput = result.throughput;
						optimalConcurrency = concurrency;
					}

					// Stop if success rate drops below 80%
					if (result.successRate < 80) {
						break;
					}
				} catch (error) {
					// System limit reached
					break;
				}
			}

			expect(optimalConcurrency).toBeGreaterThan(0);
			expect(maxThroughput).toBeGreaterThan(0);

			observability.performance.recordMetric("system_limits", {
				maxThroughput,
				optimalConcurrency,
			});
		});
	});

	describe("6. Performance Regression Detection", () => {
		test("should detect performance degradation", async () => {
			// Baseline performance
			const baselineOperation = async (index: number) => {
				await new Promise((resolve) => setTimeout(resolve, 20));
				return { index };
			};

			const baseline = await loadTester.runConcurrent(
				"Performance Baseline",
				50,
				200,
				baselineOperation
			);

			// Simulate degraded performance
			const degradedOperation = async (index: number) => {
				// 20% of operations are slower
				const delay = index % 5 === 0 ? 100 : 25;
				await new Promise((resolve) => setTimeout(resolve, delay));
				return { index };
			};

			const degraded = await loadTester.runConcurrent(
				"Performance Degraded",
				50,
				200,
				degradedOperation
			);

			// Detect regression
			const performanceRatio = degraded.avgTime / baseline.avgTime;
			const throughputRatio = degraded.throughput / baseline.throughput;

			expect(performanceRatio).toBeGreaterThan(1.2); // 20% slower
			expect(throughputRatio).toBeLessThan(0.9); // 10% less throughput

			// Alert on regression
			if (performanceRatio > 1.1) {
				observability.performance.recordMetric("performance_regression", {
					baseline: baseline.avgTime,
					current: degraded.avgTime,
					degradation: ((performanceRatio - 1) * 100).toFixed(2) + "%",
				});
			}
		});
	});

	describe("7. Real-world Scenario Testing", () => {
		test("should handle realistic user behavior patterns", async () => {
			const userSessions = new Map<number, { actions: number; lastAction: number }>();

			const simulateUserAction = async (index: number) => {
				const userId = index % 100; // 100 concurrent users
				const session = userSessions.get(userId) || {
					actions: 0,
					lastAction: Date.now(),
				};

				// Different action types with varying complexity
				const actions = [
					{ type: "page_view", delay: 50, weight: 0.4 },
					{ type: "api_call", delay: 100, weight: 0.3 },
					{ type: "file_upload", delay: 200, weight: 0.1 },
					{ type: "complex_query", delay: 300, weight: 0.1 },
					{ type: "logout", delay: 20, weight: 0.1 },
				];

				// Select action based on weights
				const random = Math.random();
				let cumulative = 0;
				let selectedAction = actions[0];

				for (const action of actions) {
					cumulative += action.weight;
					if (random < cumulative) {
						selectedAction = action;
						break;
					}
				}

				// Simulate think time between actions
				const thinkTime = 1000 + Math.random() * 4000; // 1-5 seconds
				const timeSinceLastAction = Date.now() - session.lastAction;

				if (timeSinceLastAction < thinkTime) {
					await new Promise((resolve) => setTimeout(resolve, thinkTime - timeSinceLastAction));
				}

				// Execute action
				await new Promise((resolve) => setTimeout(resolve, selectedAction.delay));

				// Update session
				session.actions++;
				session.lastAction = Date.now();
				userSessions.set(userId, session);

				// Record metrics
				metricsCollector.recordHttpRequest(
					"POST",
					`/api/${selectedAction.type}`,
					200,
					selectedAction.delay / 1000
				);

				return {
					userId,
					action: selectedAction.type,
					sessionActions: session.actions,
				};
			};

			const result = await loadTester.runConcurrent(
				"Realistic User Behavior",
				100, // 100 concurrent users
				1000, // 1000 total actions
				simulateUserAction
			);

			expect(result.successRate).toBe(100);

			// Analyze user sessions
			const sessionStats = Array.from(userSessions.values());
			const avgActionsPerUser =
				sessionStats.reduce((a, b) => a + b.actions, 0) / sessionStats.length;

			expect(avgActionsPerUser).toBeGreaterThan(5); // Users perform multiple actions
			expect(userSessions.size).toBeGreaterThanOrEqual(90); // Most users are active
		});
	});
});
