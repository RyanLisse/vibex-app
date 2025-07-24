/**
 * WASM Performance Tracker
 *
 * This module provides comprehensive performance tracking for WASM services
 * integrated with the observability infrastructure.
 */

import { observability } from "../observability";

export interface WASMPerformanceMetrics {
	operationName: string;
	executionTime: number;
	memoryUsage: number;
	wasmEnabled: boolean;
	timestamp: Date;
	metadata?: Record<string, any>;
}

export interface WASMOperationMetrics {
	totalOperations: number;
	averageExecutionTime: number;
	minExecutionTime: number;
	maxExecutionTime: number;
	totalMemoryUsage: number;
	averageMemoryUsage: number;
	wasmSuccessRate: number;
	errorRate: number;
	throughput: number; // operations per second
}

/**
 * WASM Performance Tracker for monitoring and optimization
 */
export class WASMPerformanceTracker {
	private static instance: WASMPerformanceTracker;
	private metrics: WASMPerformanceMetrics[] = [];
	private operationStats: Map<string, WASMOperationMetrics> = new Map();
	private maxMetricsHistory = 10000;

	static getInstance(): WASMPerformanceTracker {
		if (!WASMPerformanceTracker.instance) {
			WASMPerformanceTracker.instance = new WASMPerformanceTracker();
		}
		return WASMPerformanceTracker.instance;
	}

	/**
	 * Record a WASM operation performance metric
	 */
	recordOperation(
		operationName: string,
		executionTime: number,
		memoryUsage: number,
		wasmEnabled: boolean,
		metadata?: Record<string, any>
	): void {
		const metric: WASMPerformanceMetrics = {
			operationName,
			executionTime,
			memoryUsage,
			wasmEnabled,
			timestamp: new Date(),
			metadata,
		};

		this.metrics.push(metric);

		// Maintain metrics history limit
		if (this.metrics.length > this.maxMetricsHistory) {
			this.metrics = this.metrics.slice(-Math.floor(this.maxMetricsHistory * 0.8));
		}

		// Update operation statistics
		this.updateOperationStats(operationName);

		// Send to observability system
		observability.recordEvent("wasm.performance.metric", {
			operationName,
			executionTime,
			memoryUsage,
			wasmEnabled,
			metadata,
		});
	}

	/**
	 * Update operation statistics
	 */
	private updateOperationStats(operationName: string): void {
		const operationMetrics = this.metrics.filter((m) => m.operationName === operationName);
		const wasmMetrics = operationMetrics.filter((m) => m.wasmEnabled);

		const totalOperations = operationMetrics.length;
		const executionTimes = operationMetrics.map((m) => m.executionTime);
		const memoryUsages = operationMetrics.map((m) => m.memoryUsage);

		// Calculate time-based throughput (last minute)
		const oneMinuteAgo = new Date(Date.now() - 60000);
		const recentMetrics = operationMetrics.filter((m) => m.timestamp > oneMinuteAgo);
		const throughput = recentMetrics.length / 60; // operations per second

		const stats: WASMOperationMetrics = {
			totalOperations,
			averageExecutionTime: executionTimes.reduce((a, b) => a + b, 0) / totalOperations,
			minExecutionTime: Math.min(...executionTimes),
			maxExecutionTime: Math.max(...executionTimes),
			totalMemoryUsage: memoryUsages.reduce((a, b) => a + b, 0),
			averageMemoryUsage: memoryUsages.reduce((a, b) => a + b, 0) / totalOperations,
			wasmSuccessRate: (wasmMetrics.length / totalOperations) * 100,
			errorRate: 0, // Would need error tracking
			throughput,
		};

		this.operationStats.set(operationName, stats);
	}

	/**
	 * Get metrics for a specific operation
	 */
	getOperationMetrics(operationName: string): WASMOperationMetrics | undefined {
		return this.operationStats.get(operationName);
	}

	/**
	 * Get all operation statistics
	 */
	getAllOperationStats(): Map<string, WASMOperationMetrics> {
		return new Map(this.operationStats);
	}

	/**
	 * Get recent metrics
	 */
	getRecentMetrics(limit = 100): WASMPerformanceMetrics[] {
		return this.metrics.slice(-limit);
	}

	/**
	 * Get metrics for a time range
	 */
	getMetricsInRange(startTime: Date, endTime: Date): WASMPerformanceMetrics[] {
		return this.metrics.filter((m) => m.timestamp >= startTime && m.timestamp <= endTime);
	}

	/**
	 * Get performance summary
	 */
	getPerformanceSummary(): {
		totalOperations: number;
		wasmEnabledOperations: number;
		averageExecutionTime: number;
		averageMemoryUsage: number;
		topOperations: Array<{ name: string; count: number; avgTime: number }>;
		performanceTrends: Array<{
			timestamp: Date;
			avgTime: number;
			throughput: number;
		}>;
	} {
		const totalOperations = this.metrics.length;
		const wasmEnabledOperations = this.metrics.filter((m) => m.wasmEnabled).length;

		const avgExecutionTime =
			totalOperations > 0
				? this.metrics.reduce((sum, m) => sum + m.executionTime, 0) / totalOperations
				: 0;

		const avgMemoryUsage =
			totalOperations > 0
				? this.metrics.reduce((sum, m) => sum + m.memoryUsage, 0) / totalOperations
				: 0;

		// Top operations by frequency
		const operationCounts = new Map<string, { count: number; totalTime: number }>();
		for (const metric of this.metrics) {
			const current = operationCounts.get(metric.operationName) || {
				count: 0,
				totalTime: 0,
			};
			operationCounts.set(metric.operationName, {
				count: current.count + 1,
				totalTime: current.totalTime + metric.executionTime,
			});
		}

		const topOperations = Array.from(operationCounts.entries())
			.map(([name, stats]) => ({
				name,
				count: stats.count,
				avgTime: stats.totalTime / stats.count,
			}))
			.sort((a, b) => b.count - a.count)
			.slice(0, 10);

		// Performance trends (last 24 hours, hourly buckets)
		const now = new Date();
		const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
		const recentMetrics = this.getMetricsInRange(oneDayAgo, now);

		const performanceTrends: Array<{
			timestamp: Date;
			avgTime: number;
			throughput: number;
		}> = [];
		for (let i = 0; i < 24; i++) {
			const hourStart = new Date(oneDayAgo.getTime() + i * 60 * 60 * 1000);
			const hourEnd = new Date(hourStart.getTime() + 60 * 60 * 1000);
			const hourMetrics = recentMetrics.filter(
				(m) => m.timestamp >= hourStart && m.timestamp < hourEnd
			);

			const avgTime =
				hourMetrics.length > 0
					? hourMetrics.reduce((sum, m) => sum + m.executionTime, 0) / hourMetrics.length
					: 0;

			const throughput = hourMetrics.length / 3600; // operations per second

			performanceTrends.push({
				timestamp: hourStart,
				avgTime,
				throughput,
			});
		}

		return {
			totalOperations,
			wasmEnabledOperations,
			averageExecutionTime: avgExecutionTime,
			averageMemoryUsage: avgMemoryUsage,
			topOperations,
			performanceTrends,
		};
	}

	/**
	 * Reset all metrics
	 */
	reset(): void {
		this.metrics = [];
		this.operationStats.clear();

		observability.recordEvent("wasm.performance.reset", {
			timestamp: new Date(),
		});
	}

	/**
	 * Get comprehensive metrics for observability dashboard
	 */
	getMetrics(): {
		summary: ReturnType<WASMPerformanceTracker["getPerformanceSummary"]>;
		operations: Map<string, WASMOperationMetrics>;
		recentMetrics: WASMPerformanceMetrics[];
	} {
		return {
			summary: this.getPerformanceSummary(),
			operations: this.getAllOperationStats(),
			recentMetrics: this.getRecentMetrics(50),
		};
	}
}

// Export singleton instance
export const wasmPerformanceTracker = WASMPerformanceTracker.getInstance();
