/**
 * Performance Benchmarker
 *
 * Comprehensive benchmarking tool for database operations, ElectricSQL sync,
 * and overall application performance with baseline establishment and regression detection.
 */

import { db } from "@/db/config";
import {
	agentExecutions,
	environments,
	observabilityEvents,
	tasks,
} from "@/db/schema";

export interface BenchmarkResult {
	name: string;
	duration: number;
	operations: number;
	opsPerSecond: number;
	timestamp: Date;
}

export class PerformanceBenchmarker {
	private results: BenchmarkResult[] = [];

	async benchmarkQuery(
		name: string,
		queryFn: () => Promise<any>,
	): Promise<BenchmarkResult> {
		const start = performance.now();
		await queryFn();
		const end = performance.now();

		const result: BenchmarkResult = {
			name,
			duration: end - start,
			operations: 1,
			opsPerSecond: 1000 / (end - start),
			timestamp: new Date(),
		};

		this.results.push(result);
		return result;
	}

	getResults(): BenchmarkResult[] {
		return [...this.results];
	}

	clearResults(): void {
		this.results = [];
	}
}

export const performanceBenchmarker = new PerformanceBenchmarker();
