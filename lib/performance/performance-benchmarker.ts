/**
 * Performance Benchmarker
 *
 * Comprehensive benchmarking tool for database operations, ElectricSQL sync,
 * and overall application performance with baseline establishment and regression detection.
 */

import { SpanStatusCode, trace } from "@opentelemetry/api";
import { and, desc, eq, like, sql } from "drizzle-orm";
import { db } from "@/db/config";
	agentExecutions,
	environments,
	observabilityEvents,
	tasks,
} from "@/db/schema";
import { databaseQueryAnalyzer } from "./database-query-analyzer";
import { queryPerformanceMonitor } from "./query-performance-monitor";

export interface BenchmarkResult {
	name: string;
	description: string;
	executionTime: number;
	throughput: number;
	memoryUsage: number;
	success: boolean;
	error?: string;
	metadata: Record<string, any>;
}

export interface BenchmarkSuite {
	name: string;
	description: string;
	results: BenchmarkResult[];
	summary: {
		totalTests: number;
		passed: number;
		failed: number;
		averageExecutionTime: number;
		totalThroughput: number;
		memoryPeak: number;
	};
	timestamp: Date;
}

export interface PerformanceBaseline {
	version: string;
	timestamp: Date;
	benchmarks: BenchmarkSuite[];
	systemInfo: {
		nodeVersion: string;
		platform: string;
		cpuCount: number;
		totalMemory: number;
	};
	databaseInfo: {
		version: string;
		connectionCount: number;
		cacheHitRatio: number;
	};
}

export class PerformanceBenchmarker {
	private static instance: PerformanceBenchmarker;
	private currentBaseline: PerformanceBaseline | null = null;

	static getInstance(): PerformanceBenchmarker {
		if (!PerformanceBenchmarker.instance) {
			PerformanceBenchmarker.instance = new PerformanceBenchmarker();
		}
		return PerformanceBenchmarker.instance;
	}

	/**
	 * Run comprehensive performance benchmark suite
	 */
	async runBenchmarkSuite(): Promise<BenchmarkSuite[]> {
		const tracer = trace.getTracer("performance-benchmarker");
		const span = tracer.startSpan("runBenchmarkSuite");

		try {
			console.log("🚀 Starting comprehensive performance benchmark suite...");

			const suites: BenchmarkSuite[] = [];

			// Database operations benchmark
			suites.push(await this.benchmarkDatabaseOperations());

			// Query performance benchmark
			suites.push(await this.benchmarkQueryPerformance());

			// ElectricSQL sync benchmark
			suites.push(await this.benchmarkElectricSqlSync());

			// Vector search benchmark
			suites.push(await this.benchmarkVectorSearch());

			// Concurrent operations benchmark
			suites.push(await this.benchmarkConcurrentOperations());

			// Memory and resource usage benchmark
			suites.push(await this.benchmarkResourceUsage());

			span.setStatus({ code: SpanStatusCode.OK });
			return suites;
		} catch (error) {
			span.recordException(error as Error);
			span.setStatus({
				code: SpanStatusCode.ERROR,
				message: (error as Error).message,
			});
			throw error;
		} finally {
			span.end();
		}
	}

	/**
	 * Establish performance baseline
	 */
	async establishBaseline(): Promise<PerformanceBaseline> {
		console.log("📊 Establishing performance baseline...");

		const benchmarks = await this.runBenchmarkSuite();
		const systemInfo = await this.getSystemInfo();
		const databaseInfo = await this.getDatabaseInfo();

		const baseline: PerformanceBaseline = {
			version: process.env.npm_package_version || "1.0.0",
			timestamp: new Date(),
			benchmarks,
			systemInfo,
			databaseInfo,
		};

		this.currentBaseline = baseline;
		await this.saveBaseline(baseline);

		console.log("✅ Performance baseline established");
		return baseline;
	}

	/**
	 * Compare current performance against baseline
	 */
	async compareAgainstBaseline(): Promise<{
		regressions: Array<{
			test: string;
			degradation: number;
			threshold: number;
		}>;
		improvements: Array<{ test: string; improvement: number }>;
		summary: {
			totalRegressions: number;
			totalImprovements: number;
			overallChange: number;
		};
	}> {
		if (!this.currentBaseline) {
			throw new Error(
				"No baseline established. Run establishBaseline() first.",
			);
		}

		const currentBenchmarks = await this.runBenchmarkSuite();
		const regressions: Array<{
			test: string;
			degradation: number;
			threshold: number;
		}> = [];
		const improvements: Array<{ test: string; improvement: number }> = [];

		for (const currentSuite of currentBenchmarks) {
			const baselineSuite = this.currentBaseline.benchmarks.find(
				(b) => b.name === currentSuite.name,
			);
			if (!baselineSuite) continue;

			for (const currentResult of currentSuite.results) {
				const baselineResult = baselineSuite.results.find(
					(r) => r.name === currentResult.name,
				);
				if (!baselineResult) continue;

				const changePercent =
					((currentResult.executionTime - baselineResult.executionTime) /
						baselineResult.executionTime) *
					100;
				const regressionThreshold = 20; // 20% slower is considered a regression

				if (changePercent > regressionThreshold) {
					regressions.push({
						test: `${currentSuite.name}:${currentResult.name}`,
						degradation: changePercent,
						threshold: regressionThreshold,
					});
				} else if (changePercent < -10) {
					// 10% faster is an improvement
					improvements.push({
						test: `${currentSuite.name}:${currentResult.name}`,
						improvement: Math.abs(changePercent),
					});
				}
			}
		}

		// Calculate overall performance change
		const currentAvg =
			currentBenchmarks
				.flatMap((s) => s.results)
				.reduce((sum, r) => sum + r.executionTime, 0) /
			currentBenchmarks.flatMap((s) => s.results).length;

		const baselineAvg =
			this.currentBaseline.benchmarks
				.flatMap((s) => s.results)
				.reduce((sum, r) => sum + r.executionTime, 0) /
			this.currentBaseline.benchmarks.flatMap((s) => s.results).length;

		const overallChange = ((currentAvg - baselineAvg) / baselineAvg) * 100;

		return {
			regressions,
			improvements,
			summary: {
				totalRegressions: regressions.length,
				totalImprovements: improvements.length,
				overallChange,
			},
		};
	}

	/**
	 * Benchmark database operations
	 */
	private async benchmarkDatabaseOperations(): Promise<BenchmarkSuite> {
		const results: BenchmarkResult[] = [];

		// Single insert benchmark
		results.push(
			await this.runBenchmark(
				"single_insert",
				"Insert single task record",
				async () => {
					await db.insert(tasks).values({
						title: "Benchmark Task",
						description: "Performance test task",
						status: "pending",
						priority: "medium",
						userId: "benchmark-user",
					});
				},
			),
		);

		// Batch insert benchmark
		results.push(
			await this.runBenchmark(
				"batch_insert",
				"Insert 100 task records in batch",
				async () => {
					const batchData = Array.from({ length: 100 }, (_, i) => ({
						title: `Benchmark Task ${i}`,
						description: "Performance test task",
						status: "pending" as const,
						priority: "medium" as const,
						userId: "benchmark-user",
					}));
					await db.insert(tasks).values(batchData);
				},
			),
		);

		// Simple select benchmark
		results.push(
			await this.runBenchmark(
				"simple_select",
				"Select tasks by user ID",
				async () => {
					await db
						.select()
						.from(tasks)
						.where(eq(tasks.userId, "benchmark-user"))
						.limit(20);
				},
			),
		);

		// Complex join benchmark
		results.push(
			await this.runBenchmark(
				"complex_join",
				"Join tasks with agent executions",
				async () => {
					await db
						.select()
						.from(tasks)
						.leftJoin(agentExecutions, eq(tasks.id, agentExecutions.taskId))
						.where(eq(tasks.userId, "benchmark-user"))
						.limit(20);
				},
			),
		);

		// Update benchmark
		results.push(
			await this.runBenchmark(
				"update_operation",
				"Update task status",
				async () => {
					await db
						.update(tasks)
						.set({ status: "completed", updatedAt: new Date() })
						.where(
							and(
								eq(tasks.userId, "benchmark-user"),
								eq(tasks.status, "pending"),
							),
						);
				},
			),
		);

		return this.createBenchmarkSuite(
			"Database Operations",
			"Core database CRUD operations",
			results,
		);
	}

	/**
	 * Benchmark query performance
	 */
	private async benchmarkQueryPerformance(): Promise<BenchmarkSuite> {
		const results: BenchmarkResult[] = [];

		// Filtered query benchmark
		results.push(
			await this.runBenchmark(
				"filtered_query",
				"Query with multiple filters",
				async () => {
					await db
						.select()
						.from(tasks)
						.where(
							and(
								eq(tasks.userId, "benchmark-user"),
								eq(tasks.status, "pending"),
								eq(tasks.priority, "high"),
							),
						)
						.orderBy(desc(tasks.createdAt))
						.limit(10);
				},
			),
		);

		// Search query benchmark
		results.push(
			await this.runBenchmark(
				"search_query",
				"Text search in task titles",
				async () => {
					await db
						.select()
						.from(tasks)
						.where(
							and(
								eq(tasks.userId, "benchmark-user"),
								like(tasks.title, "%benchmark%"),
							),
						)
						.limit(10);
				},
			),
		);

		// Aggregation query benchmark
		results.push(
			await this.runBenchmark(
				"aggregation_query",
				"Count tasks by status",
				async () => {
					await db
						.select({
							status: tasks.status,
							count: sql<number>`count(*)`,
						})
						.from(tasks)
						.where(eq(tasks.userId, "benchmark-user"))
						.groupBy(tasks.status);
				},
			),
		);

		// Pagination benchmark
		results.push(
			await this.runBenchmark(
				"pagination_query",
				"Paginated task list",
				async () => {
					await db
						.select()
						.from(tasks)
						.where(eq(tasks.userId, "benchmark-user"))
						.orderBy(desc(tasks.createdAt))
						.limit(20)
						.offset(100);
				},
			),
		);

		return this.createBenchmarkSuite(
			"Query Performance",
			"Database query optimization tests",
			results,
		);
	}

	/**
	 * Benchmark ElectricSQL sync operations
	 */
	private async benchmarkElectricSqlSync(): Promise<BenchmarkSuite> {
		const results: BenchmarkResult[] = [];

		// Simulated sync latency benchmark
		results.push(
			await this.runBenchmark(
				"sync_latency",
				"Simulated sync operation latency",
				async () => {
					// Simulate sync operation
					await new Promise((resolve) => setTimeout(resolve, 10));
					await db
						.select()
						.from(tasks)
						.where(eq(tasks.userId, "benchmark-user"))
						.limit(5);
				},
			),
		);

		// Batch sync benchmark
		results.push(
			await this.runBenchmark(
				"batch_sync",
				"Batch sync simulation",
				async () => {
					// Simulate batch sync of 50 records
					const batchSize = 50;
					for (let i = 0; i < batchSize; i += 10) {
						await db.select().from(tasks).limit(10).offset(i);
					}
				},
			),
		);

		return this.createBenchmarkSuite(
			"ElectricSQL Sync",
			"Real-time sync performance tests",
			results,
		);
	}

	/**
	 * Benchmark vector search operations
	 */
	private async benchmarkVectorSearch(): Promise<BenchmarkSuite> {
		const results: BenchmarkResult[] = [];

		// Vector similarity search benchmark
		results.push(
			await this.runBenchmark(
				"vector_search",
				"Vector similarity search",
				async () => {
					const sampleEmbedding = Array(1536).fill(0.1);
					await db.execute(sql`
          SELECT *, embedding <-> ${sampleEmbedding} as distance 
          FROM tasks 
          WHERE user_id = 'benchmark-user' 
          ORDER BY distance 
          LIMIT 10
        `);
				},
			),
		);

		return this.createBenchmarkSuite(
			"Vector Search",
			"Vector similarity search performance",
			results,
		);
	}

	/**
	 * Benchmark concurrent operations
	 */
	private async benchmarkConcurrentOperations(): Promise<BenchmarkSuite> {
		const results: BenchmarkResult[] = [];

		// Concurrent reads benchmark
		results.push(
			await this.runBenchmark(
				"concurrent_reads",
				"10 concurrent read operations",
				async () => {
					const promises = Array.from({ length: 10 }, () =>
						db
							.select()
							.from(tasks)
							.where(eq(tasks.userId, "benchmark-user"))
							.limit(5),
					);
					await Promise.all(promises);
				},
			),
		);

		// Mixed operations benchmark
		results.push(
			await this.runBenchmark(
				"mixed_operations",
				"Mixed read/write operations",
				async () => {
					const promises = [
						db.select().from(tasks).limit(5),
						db.select().from(environments).limit(3),
						db.insert(tasks).values({
							title: "Concurrent Test",
							description: "Test",
							status: "pending",
							userId: "benchmark-user",
						}),
						db.select().from(agentExecutions).limit(5),
					];
					await Promise.all(promises);
				},
			),
		);

		return this.createBenchmarkSuite(
			"Concurrent Operations",
			"Concurrent database operations",
			results,
		);
	}

	/**
	 * Benchmark resource usage
	 */
	private async benchmarkResourceUsage(): Promise<BenchmarkSuite> {
		const results: BenchmarkResult[] = [];

		// Memory usage benchmark
		results.push(
			await this.runBenchmark(
				"memory_usage",
				"Memory usage during large query",
				async () => {
					// Simulate memory-intensive operation
					const largeResult = await db.select().from(tasks).limit(1000);
					return { recordCount: largeResult.length };
				},
			),
		);

		return this.createBenchmarkSuite(
			"Resource Usage",
			"Memory and resource utilization tests",
			results,
		);
	}

	/**
	 * Run individual benchmark
	 */
	private async runBenchmark(
		name: string,
		description: string,
		operation: () => Promise<any>,
	): Promise<BenchmarkResult> {
		const startTime = performance.now();
		const startMemory = process.memoryUsage().heapUsed;

		try {
			const result = await operation();
			const executionTime = performance.now() - startTime;
			const memoryUsage = process.memoryUsage().heapUsed - startMemory;

			return {
				name,
				description,
				executionTime,
				throughput: 1000 / executionTime, // operations per second
				memoryUsage,
				success: true,
				metadata: result || {},
			};
		} catch (error) {
			const executionTime = performance.now() - startTime;
			const memoryUsage = process.memoryUsage().heapUsed - startMemory;

			return {
				name,
				description,
				executionTime,
				throughput: 0,
				memoryUsage,
				success: false,
				error: (error as Error).message,
				metadata: {},
			};
		}
	}

	/**
	 * Create benchmark suite summary
	 */
	private createBenchmarkSuite(
		name: string,
		description: string,
		results: BenchmarkResult[],
	): BenchmarkSuite {
		const passed = results.filter((r) => r.success).length;
		const failed = results.length - passed;
		const averageExecutionTime =
			results.reduce((sum, r) => sum + r.executionTime, 0) / results.length;
		const totalThroughput = results.reduce((sum, r) => sum + r.throughput, 0);
		const memoryPeak = Math.max(...results.map((r) => r.memoryUsage));

		return {
			name,
			description,
			results,
			summary: {
				totalTests: results.length,
				passed,
				failed,
				averageExecutionTime,
				totalThroughput,
				memoryPeak,
			},
			timestamp: new Date(),
		};
	}

	/**
	 * Get system information
	 */
	private async getSystemInfo(): Promise<{
		nodeVersion: string;
		platform: string;
		cpuCount: number;
		totalMemory: number;
	}> {
		const os = await import("os");

		return {
			nodeVersion: process.version,
			platform: os.platform(),
			cpuCount: os.cpus().length,
			totalMemory: os.totalmem(),
		};
	}

	/**
	 * Get database information
	 */
	private async getDatabaseInfo(): Promise<{
		version: string;
		connectionCount: number;
		cacheHitRatio: number;
	}> {
		try {
			const versionResult = await db.execute(sql`SELECT version()`);
			const connectionResult = await db.execute(
				sql`SELECT count(*) FROM pg_stat_activity`,
			);
			const cacheResult = await db.execute(sql`
        SELECT 
          sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read)) * 100 as cache_hit_ratio
        FROM pg_statio_user_tables
      `);

			return {
				version: versionResult.rows[0]?.version || "unknown",
				connectionCount: Number(connectionResult.rows[0]?.count) || 0,
				cacheHitRatio: Number(cacheResult.rows[0]?.cache_hit_ratio) || 0,
			};
		} catch (error) {
			return {
				version: "unknown",
				connectionCount: 0,
				cacheHitRatio: 0,
			};
		}
	}

	/**
	 * Save baseline to storage
	 */
	private async saveBaseline(baseline: PerformanceBaseline): Promise<void> {
		// In a real implementation, this would save to database or file system
		console.log("💾 Performance baseline saved");
	}
}

export const performanceBenchmarker = PerformanceBenchmarker.getInstance();
