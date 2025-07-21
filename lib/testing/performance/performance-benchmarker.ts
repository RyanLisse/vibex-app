import { performance } from "perf_hooks";

export interface BenchmarkOptions {
	iterations?: number;
	warmupIterations?: number;
	timeout?: number;
}

export interface BenchmarkResult {
	averageTime: number;
	minTime: number;
	maxTime: number;
	iterations: number;
	totalTime: number;
}

export interface MemorySnapshot {
	used: number;
	total: number;
	external: number;
	heapUsed: number;
	heapTotal: number;
	timestamp: number;
}

export class PerformanceBenchmark {
	private warmupIterations: number = 10;
	private defaultIterations: number = 100;
	private defaultTimeout: number = 30000;

	async measureFunction<T extends (...args: any[]) => any>(
		fn: T,
		options: BenchmarkOptions = {},
	): Promise<BenchmarkResult> {
		const iterations = options.iterations ?? this.defaultIterations;
		const warmup = options.warmupIterations ?? this.warmupIterations;
		const timeout = options.timeout ?? this.defaultTimeout;

		// Warmup phase
		for (let i = 0; i < warmup; i++) {
			await fn();
		}

		// Force garbage collection if available
		if (global.gc) {
			global.gc();
		}

		const times: number[] = [];
		const startTotal = performance.now();

		for (let i = 0; i < iterations; i++) {
			const start = performance.now();
			await fn();
			const end = performance.now();
			times.push(end - start);

			// Check timeout
			if (performance.now() - startTotal > timeout) {
				throw new Error(`Benchmark timed out after ${timeout}ms`);
			}
		}

		const totalTime = times.reduce((sum, time) => sum + time, 0);
		const averageTime = totalTime / iterations;
		const minTime = Math.min(...times);
		const maxTime = Math.max(...times);

		return {
			averageTime,
			minTime,
			maxTime,
			iterations,
			totalTime,
		};
	}

	async measureComponentRender(
		Component: React.ComponentType,
		props: any = {},
	): Promise<BenchmarkResult> {
		// Mock implementation for component rendering
		return this.measureFunction(async () => {
			// Simulate component render time
			await new Promise((resolve) => setTimeout(resolve, 1));
		});
	}

	async measureAPICall(
		apiCall: () => Promise<any>,
		options: BenchmarkOptions = {},
	): Promise<BenchmarkResult> {
		return this.measureFunction(apiCall, options);
	}

	validateThresholds(
		result: BenchmarkResult,
		thresholds: {
			maxAverageTime?: number;
			maxMaxTime?: number;
		},
	): boolean {
		if (
			thresholds.maxAverageTime &&
			result.averageTime > thresholds.maxAverageTime
		) {
			return false;
		}
		if (thresholds.maxMaxTime && result.maxTime > thresholds.maxMaxTime) {
			return false;
		}
		return true;
	}

	detectRegression(
		currentResult: BenchmarkResult,
		baselineResult: BenchmarkResult,
		threshold: number = 0.1,
	): boolean {
		const regressionRatio =
			(currentResult.averageTime - baselineResult.averageTime) /
			baselineResult.averageTime;
		return regressionRatio > threshold;
	}
}

export class MemoryProfiler {
	private snapshots: MemorySnapshot[] = [];

	createSnapshot(): MemorySnapshot {
		const memUsage = process.memoryUsage();
		const snapshot: MemorySnapshot = {
			used: memUsage.rss,
			total: memUsage.rss + memUsage.external,
			external: memUsage.external,
			heapUsed: memUsage.heapUsed,
			heapTotal: memUsage.heapTotal,
			timestamp: Date.now(),
		};
		this.snapshots.push(snapshot);
		return snapshot;
	}

	async measureMemoryUsage<T>(
		fn: () => Promise<T> | T,
	): Promise<{ result: T; memoryDelta: number; snapshots: MemorySnapshot[] }> {
		const beforeSnapshot = this.createSnapshot();
		const result = await fn();
		const afterSnapshot = this.createSnapshot();

		const memoryDelta = afterSnapshot.heapUsed - beforeSnapshot.heapUsed;

		return {
			result,
			memoryDelta,
			snapshots: [beforeSnapshot, afterSnapshot],
		};
	}

	compareSnapshots(
		snapshot1: MemorySnapshot,
		snapshot2: MemorySnapshot,
	): {
		heapDelta: number;
		totalDelta: number;
		timeDelta: number;
	} {
		return {
			heapDelta: snapshot2.heapUsed - snapshot1.heapUsed,
			totalDelta: snapshot2.total - snapshot1.total,
			timeDelta: snapshot2.timestamp - snapshot1.timestamp,
		};
	}

	detectMemoryLeak(threshold: number = 1024 * 1024): boolean {
		if (this.snapshots.length < 2) return false;

		const latest = this.snapshots[this.snapshots.length - 1];
		const baseline = this.snapshots[0];

		return latest.heapUsed - baseline.heapUsed > threshold;
	}

	forceGarbageCollection(): void {
		if (global.gc) {
			global.gc();
		}
	}

	cleanup(): void {
		this.snapshots = [];
	}

	monitorGarbageCollection(): void {
		// Mock implementation for GC monitoring
		// In real implementation, this would use Node.js performance hooks
	}
}

// Export for backward compatibility
export { PerformanceBenchmark as default };
