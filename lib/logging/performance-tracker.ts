import type { LoggingMetrics, LogLevel, OperationMetrics } from "./types";

export class PerformanceTracker {
	private metrics: LoggingMetrics = {
		totalLogs: 0,
		logsByLevel: {
			error: 0,
			warn: 0,
			info: 0,
			debug: 0,
			trace: 0,
		},
		averageLoggingTime: 0,
		operationMetrics: new Map(),
		errors: 0,
		startTime: Date.now(),
	};

	recordLoggingOperation(duration: number, level: LogLevel): void {
		this.metrics.totalLogs++;
		this.metrics.logsByLevel[level]++;

		const currentAvg = this.metrics.averageLoggingTime;
		const totalOps = this.metrics.totalLogs;
		this.metrics.averageLoggingTime =
			(currentAvg * (totalOps - 1) + duration) / totalOps;
	}

	recordOperation(operation: string, duration: number): void {
		const existing = this.metrics.operationMetrics.get(operation) || {
			count: 0,
			totalDuration: 0,
			averageDuration: 0,
			minDuration: Number.POSITIVE_INFINITY,
			maxDuration: 0,
		};

		existing.count++;
		existing.totalDuration += duration;
		existing.averageDuration = existing.totalDuration / existing.count;
		existing.minDuration = Math.min(existing.minDuration, duration);
		existing.maxDuration = Math.max(existing.maxDuration, duration);

		this.metrics.operationMetrics.set(operation, existing);
	}

	recordError(): void {
		this.metrics.errors++;
	}

	getMetrics(): LoggingMetrics {
		return {
			...this.metrics,
			uptime: Date.now() - this.metrics.startTime,
			operationMetrics: new Map(this.metrics.operationMetrics),
		};
	}

	isLoggingPerformanceDegraded(): boolean {
		return this.metrics.averageLoggingTime > 10; // 10ms threshold
	}

	getSlowOperations(thresholdMs = 1000): OperationMetrics[] {
		const slowOps: OperationMetrics[] = [];
		for (const [, metrics] of this.metrics.operationMetrics) {
			if (metrics.averageDuration > thresholdMs) {
				slowOps.push(metrics);
			}
		}
		return slowOps.sort((a, b) => b.averageDuration - a.averageDuration);
	}

	reset(): void {
		this.metrics = {
			totalLogs: 0,
			logsByLevel: {
				error: 0,
				warn: 0,
				info: 0,
				debug: 0,
				trace: 0,
			},
			averageLoggingTime: 0,
			operationMetrics: new Map(),
			errors: 0,
			startTime: Date.now(),
		};
	}
}
