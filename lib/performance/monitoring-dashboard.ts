/**
 * Performance Monitoring Dashboard
 *
 * Provides comprehensive performance monitoring with key metrics,
 * automated alerts, and optimization recommendations.
 */

import { observability } from "@/lib/observability";

export interface PerformanceMetric {
	name: string;
	value: number;
	unit: string;
	timestamp: Date;
	tags?: Record<string, string>;
	threshold?: {
		warning: number;
		critical: number;
	};
}

export interface QueryPerformanceMetric {
	queryType: string;
	table: string;
	executionTimeMs: number;
	rowsAffected: number;
	indexesUsed: string[];
	planCost: number;
	timestamp: Date;
}

export interface SystemResourceMetric {
	cpu: {
		usage: number;
		cores: number;
	};
	memory: {
		used: number;
		total: number;
		heapUsed: number;
		heapTotal: number;
	};
	disk: {
		used: number;
		total: number;
		iops: number;
	};
	network: {
		bytesIn: number;
		bytesOut: number;
		connectionsActive: number;
	};
	timestamp: Date;
}

export interface PerformanceAlert {
	id: string;
	type: "warning" | "critical";
	metric: string;
	value: number;
	threshold: number;
	message: string;
	timestamp: Date;
	resolved: boolean;
	resolvedAt?: Date;
}

/**
 * Performance monitoring and optimization service
 */
export class PerformanceMonitor {
	private metrics: Map<string, PerformanceMetric[]> = new Map();
	private queryMetrics: QueryPerformanceMetric[] = [];
	private systemMetrics: SystemResourceMetric[] = [];
	private alerts: PerformanceAlert[] = [];
	private isMonitoring = false;
	private monitoringInterval: NodeJS.Timeout | null = null;

	constructor() {
		this.startMonitoring();
	}

	/**
	 * Start performance monitoring
	 */
	startMonitoring(): void {
		if (this.isMonitoring) return;

		this.isMonitoring = true;
		this.monitoringInterval = setInterval(() => {
			this.collectSystemMetrics();
			this.checkAlerts();
			this.cleanupOldMetrics();
		}, 30000); // Collect every 30 seconds

		observability.recordEvent("performance.monitoring.started", {});
	}

	/**
	 * Stop performance monitoring
	 */
	stopMonitoring(): void {
		if (!this.isMonitoring) return;

		this.isMonitoring = false;
		if (this.monitoringInterval) {
			clearInterval(this.monitoringInterval);
			this.monitoringInterval = null;
		}

		observability.recordEvent("performance.monitoring.stopped", {});
	}

	/**
	 * Record a performance metric
	 */
	recordMetric(metric: PerformanceMetric): void {
		const key = metric.name;
		if (!this.metrics.has(key)) {
			this.metrics.set(key, []);
		}

		const metrics = this.metrics.get(key)!;
		metrics.push(metric);

		// Keep only last 1000 metrics per type
		if (metrics.length > 1000) {
			metrics.splice(0, metrics.length - 1000);
		}

		// Check for threshold violations
		if (metric.threshold) {
			this.checkMetricThreshold(metric);
		}

		observability.recordEvent("performance.metric.recorded", {
			name: metric.name,
			value: metric.value,
			unit: metric.unit,
			tags: metric.tags,
		});
	}

	/**
	 * Record query performance metric
	 */
	recordQueryMetric(metric: QueryPerformanceMetric): void {
		this.queryMetrics.push(metric);

		// Keep only last 10000 query metrics
		if (this.queryMetrics.length > 10000) {
			this.queryMetrics.splice(0, this.queryMetrics.length - 10000);
		}

		// Check for slow queries
		if (metric.executionTimeMs > 1000) {
			// Slow query threshold: 1 second
			this.createAlert({
				type: metric.executionTimeMs > 5000 ? "critical" : "warning",
				metric: "query_performance",
				value: metric.executionTimeMs,
				threshold: 1000,
				message: `Slow query detected: ${metric.queryType} on ${metric.table} took ${metric.executionTimeMs}ms`,
			});
		}

		observability.recordEvent("performance.query.recorded", {
			queryType: metric.queryType,
			table: metric.table,
			executionTimeMs: metric.executionTimeMs,
			rowsAffected: metric.rowsAffected,
		});
	}

	/**
	 * Collect system resource metrics
	 */
	private async collectSystemMetrics(): Promise<void> {
		try {
			const metric: SystemResourceMetric = {
				cpu: await this.getCPUMetrics(),
				memory: await this.getMemoryMetrics(),
				disk: await this.getDiskMetrics(),
				network: await this.getNetworkMetrics(),
				timestamp: new Date(),
			};

			this.systemMetrics.push(metric);

			// Keep only last 2880 system metrics (24 hours at 30-second intervals)
			if (this.systemMetrics.length > 2880) {
				this.systemMetrics.splice(0, this.systemMetrics.length - 2880);
			}

			// Check system resource thresholds
			this.checkSystemResourceThresholds(metric);
		} catch (error) {
			observability.recordError("performance.system-metrics.collection-failed", error as Error);
		}
	}

	/**
	 * Get CPU metrics
	 */
	private async getCPUMetrics(): Promise<{ usage: number; cores: number }> {
		if (typeof process !== "undefined" && process.cpuUsage) {
			const usage = process.cpuUsage();
			const totalUsage = (usage.user + usage.system) / 1000000; // Convert to seconds
			return {
				usage: Math.min(totalUsage * 100, 100), // Convert to percentage, cap at 100%
				cores: require("os").cpus().length,
			};
		}
		return { usage: 0, cores: 1 };
	}

	/**
	 * Get memory metrics
	 */
	private async getMemoryMetrics(): Promise<{
		used: number;
		total: number;
		heapUsed: number;
		heapTotal: number;
	}> {
		if (typeof process !== "undefined" && process.memoryUsage) {
			const memUsage = process.memoryUsage();
			const totalMem = require("os").totalmem();
			const freeMem = require("os").freemem();

			return {
				used: totalMem - freeMem,
				total: totalMem,
				heapUsed: memUsage.heapUsed,
				heapTotal: memUsage.heapTotal,
			};
		}
		return { used: 0, total: 0, heapUsed: 0, heapTotal: 0 };
	}

	/**
	 * Get disk metrics (placeholder - would need OS-specific implementation)
	 */
	private async getDiskMetrics(): Promise<{
		used: number;
		total: number;
		iops: number;
	}> {
		// Placeholder implementation
		return { used: 0, total: 0, iops: 0 };
	}

	/**
	 * Get network metrics (placeholder - would need OS-specific implementation)
	 */
	private async getNetworkMetrics(): Promise<{
		bytesIn: number;
		bytesOut: number;
		connectionsActive: number;
	}> {
		// Placeholder implementation
		return { bytesIn: 0, bytesOut: 0, connectionsActive: 0 };
	}

	/**
	 * Check metric threshold violations
	 */
	private checkMetricThreshold(metric: PerformanceMetric): void {
		if (!metric.threshold) return;

		const { warning, critical } = metric.threshold;

		if (metric.value >= critical) {
			this.createAlert({
				type: "critical",
				metric: metric.name,
				value: metric.value,
				threshold: critical,
				message: `Critical threshold exceeded for ${metric.name}: ${metric.value}${metric.unit} >= ${critical}${metric.unit}`,
			});
		} else if (metric.value >= warning) {
			this.createAlert({
				type: "warning",
				metric: metric.name,
				value: metric.value,
				threshold: warning,
				message: `Warning threshold exceeded for ${metric.name}: ${metric.value}${metric.unit} >= ${warning}${metric.unit}`,
			});
		}
	}

	/**
	 * Check system resource thresholds
	 */
	private checkSystemResourceThresholds(metric: SystemResourceMetric): void {
		// CPU usage check
		if (metric.cpu.usage > 90) {
			this.createAlert({
				type: "critical",
				metric: "cpu_usage",
				value: metric.cpu.usage,
				threshold: 90,
				message: `High CPU usage: ${metric.cpu.usage.toFixed(1)}%`,
			});
		} else if (metric.cpu.usage > 75) {
			this.createAlert({
				type: "warning",
				metric: "cpu_usage",
				value: metric.cpu.usage,
				threshold: 75,
				message: `Elevated CPU usage: ${metric.cpu.usage.toFixed(1)}%`,
			});
		}

		// Memory usage check
		const memoryUsagePercent = (metric.memory.used / metric.memory.total) * 100;
		if (memoryUsagePercent > 90) {
			this.createAlert({
				type: "critical",
				metric: "memory_usage",
				value: memoryUsagePercent,
				threshold: 90,
				message: `High memory usage: ${memoryUsagePercent.toFixed(1)}%`,
			});
		} else if (memoryUsagePercent > 80) {
			this.createAlert({
				type: "warning",
				metric: "memory_usage",
				value: memoryUsagePercent,
				threshold: 80,
				message: `Elevated memory usage: ${memoryUsagePercent.toFixed(1)}%`,
			});
		}

		// Heap usage check
		const heapUsagePercent = (metric.memory.heapUsed / metric.memory.heapTotal) * 100;
		if (heapUsagePercent > 85) {
			this.createAlert({
				type: "warning",
				metric: "heap_usage",
				value: heapUsagePercent,
				threshold: 85,
				message: `High heap usage: ${heapUsagePercent.toFixed(1)}%`,
			});
		}
	}

	/**
	 * Create performance alert
	 */
	private createAlert(alertData: Omit<PerformanceAlert, "id" | "timestamp" | "resolved">): void {
		// Check if similar alert already exists and is not resolved
		const existingAlert = this.alerts.find(
			(alert) =>
				!alert.resolved &&
				alert.metric === alertData.metric &&
				alert.type === alertData.type &&
				Date.now() - alert.timestamp.getTime() < 300000 // Within last 5 minutes
		);

		if (existingAlert) {
			return; // Don't create duplicate alerts
		}

		const alert: PerformanceAlert = {
			id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
			timestamp: new Date(),
			resolved: false,
			...alertData,
		};

		this.alerts.push(alert);

		// Keep only last 1000 alerts
		if (this.alerts.length > 1000) {
			this.alerts.splice(0, this.alerts.length - 1000);
		}

		observability.recordEvent("performance.alert.created", {
			alertId: alert.id,
			type: alert.type,
			metric: alert.metric,
			value: alert.value,
			threshold: alert.threshold,
		});
	}

	/**
	 * Check and auto-resolve alerts
	 */
	private checkAlerts(): void {
		const now = Date.now();

		this.alerts.forEach((alert) => {
			if (!alert.resolved) {
				// Auto-resolve alerts older than 1 hour
				if (now - alert.timestamp.getTime() > 3600000) {
					alert.resolved = true;
					alert.resolvedAt = new Date();

					observability.recordEvent("performance.alert.auto-resolved", {
						alertId: alert.id,
						reason: "timeout",
					});
				}
			}
		});
	}

	/**
	 * Clean up old metrics
	 */
	private cleanupOldMetrics(): void {
		const cutoffTime = Date.now() - 24 * 60 * 60 * 1000; // 24 hours ago

		// Clean up general metrics
		this.metrics.forEach((metrics, key) => {
			const filtered = metrics.filter((m) => m.timestamp.getTime() > cutoffTime);
			this.metrics.set(key, filtered);
		});

		// Clean up query metrics
		this.queryMetrics = this.queryMetrics.filter((m) => m.timestamp.getTime() > cutoffTime);
	}

	/**
	 * Get performance dashboard data
	 */
	getDashboardData(): {
		metrics: Record<string, PerformanceMetric[]>;
		queryMetrics: QueryPerformanceMetric[];
		systemMetrics: SystemResourceMetric[];
		alerts: PerformanceAlert[];
		summary: {
			totalMetrics: number;
			activeAlerts: number;
			avgQueryTime: number;
			systemHealth: "good" | "warning" | "critical";
		};
	} {
		const activeAlerts = this.alerts.filter((a) => !a.resolved);
		const recentQueries = this.queryMetrics.filter(
			(q) => Date.now() - q.timestamp.getTime() < 3600000 // Last hour
		);

		const avgQueryTime =
			recentQueries.length > 0
				? recentQueries.reduce((sum, q) => sum + q.executionTimeMs, 0) / recentQueries.length
				: 0;

		const criticalAlerts = activeAlerts.filter((a) => a.type === "critical");
		const warningAlerts = activeAlerts.filter((a) => a.type === "warning");

		let systemHealth: "good" | "warning" | "critical" = "good";
		if (criticalAlerts.length > 0) {
			systemHealth = "critical";
		} else if (warningAlerts.length > 0) {
			systemHealth = "warning";
		}

		return {
			metrics: Object.fromEntries(this.metrics),
			queryMetrics: this.queryMetrics,
			systemMetrics: this.systemMetrics,
			alerts: this.alerts,
			summary: {
				totalMetrics: Array.from(this.metrics.values()).reduce((sum, arr) => sum + arr.length, 0),
				activeAlerts: activeAlerts.length,
				avgQueryTime,
				systemHealth,
			},
		};
	}

	/**
	 * Get optimization recommendations
	 */
	getOptimizationRecommendations(): Array<{
		type: "query" | "system" | "cache" | "index";
		priority: "high" | "medium" | "low";
		title: string;
		description: string;
		impact: string;
		effort: string;
	}> {
		const recommendations = [];

		// Analyze slow queries
		const slowQueries = this.queryMetrics.filter((q) => q.executionTimeMs > 1000);
		if (slowQueries.length > 0) {
			const slowQueryTables = [...new Set(slowQueries.map((q) => q.table))];
			recommendations.push({
				type: "query" as const,
				priority: "high" as const,
				title: "Optimize Slow Queries",
				description: `Found ${slowQueries.length} slow queries affecting tables: ${slowQueryTables.join(", ")}`,
				impact: "High - Improved response times and reduced resource usage",
				effort: "Medium - Requires query analysis and optimization",
			});
		}

		// Analyze missing indexes
		const queriesWithoutIndexes = this.queryMetrics.filter(
			(q) => q.indexesUsed.length === 0 && q.executionTimeMs > 500
		);
		if (queriesWithoutIndexes.length > 0) {
			recommendations.push({
				type: "index" as const,
				priority: "high" as const,
				title: "Add Missing Indexes",
				description: `${queriesWithoutIndexes.length} queries are not using indexes`,
				impact: "High - Significantly faster query execution",
				effort: "Low - Add appropriate database indexes",
			});
		}

		// Analyze system resources
		const recentSystemMetrics = this.systemMetrics.slice(-10);
		if (recentSystemMetrics.length > 0) {
			const avgCpuUsage =
				recentSystemMetrics.reduce((sum, m) => sum + m.cpu.usage, 0) / recentSystemMetrics.length;
			const avgMemoryUsage =
				recentSystemMetrics.reduce((sum, m) => sum + (m.memory.used / m.memory.total) * 100, 0) /
				recentSystemMetrics.length;

			if (avgCpuUsage > 70) {
				recommendations.push({
					type: "system" as const,
					priority: "medium" as const,
					title: "Optimize CPU Usage",
					description: `Average CPU usage is ${avgCpuUsage.toFixed(1)}%`,
					impact: "Medium - Better system responsiveness",
					effort: "High - Requires code optimization or scaling",
				});
			}

			if (avgMemoryUsage > 70) {
				recommendations.push({
					type: "system" as const,
					priority: "medium" as const,
					title: "Optimize Memory Usage",
					description: `Average memory usage is ${avgMemoryUsage.toFixed(1)}%`,
					impact: "Medium - Reduced memory pressure",
					effort: "Medium - Memory leak detection and optimization",
				});
			}
		}

		// Cache optimization recommendations
		const cacheMetrics = this.metrics.get("cache_hit_rate");
		if (cacheMetrics && cacheMetrics.length > 0) {
			const latestCacheHitRate = cacheMetrics[cacheMetrics.length - 1].value;
			if (latestCacheHitRate < 80) {
				recommendations.push({
					type: "cache" as const,
					priority: "medium" as const,
					title: "Improve Cache Hit Rate",
					description: `Current cache hit rate is ${latestCacheHitRate.toFixed(1)}%`,
					impact: "Medium - Faster data access and reduced database load",
					effort: "Medium - Cache strategy optimization",
				});
			}
		}

		return recommendations.sort((a, b) => {
			const priorityOrder = { high: 3, medium: 2, low: 1 };
			return priorityOrder[b.priority] - priorityOrder[a.priority];
		});
	}

	/**
	 * Resolve alert
	 */
	resolveAlert(alertId: string): boolean {
		const alert = this.alerts.find((a) => a.id === alertId);
		if (alert && !alert.resolved) {
			alert.resolved = true;
			alert.resolvedAt = new Date();

			observability.recordEvent("performance.alert.resolved", {
				alertId,
				resolvedBy: "manual",
			});

			return true;
		}
		return false;
	}

	/**
	 * Get metric statistics
	 */
	getMetricStats(
		metricName: string,
		timeRangeMs = 3600000
	): {
		min: number;
		max: number;
		avg: number;
		count: number;
		trend: "up" | "down" | "stable";
	} | null {
		const metrics = this.metrics.get(metricName);
		if (!metrics || metrics.length === 0) return null;

		const cutoffTime = Date.now() - timeRangeMs;
		const recentMetrics = metrics.filter((m) => m.timestamp.getTime() > cutoffTime);

		if (recentMetrics.length === 0) return null;

		const values = recentMetrics.map((m) => m.value);
		const min = Math.min(...values);
		const max = Math.max(...values);
		const avg = values.reduce((sum, val) => sum + val, 0) / values.length;

		// Calculate trend
		let trend: "up" | "down" | "stable" = "stable";
		if (recentMetrics.length >= 2) {
			const firstHalf = recentMetrics.slice(0, Math.floor(recentMetrics.length / 2));
			const secondHalf = recentMetrics.slice(Math.floor(recentMetrics.length / 2));

			const firstAvg = firstHalf.reduce((sum, m) => sum + m.value, 0) / firstHalf.length;
			const secondAvg = secondHalf.reduce((sum, m) => sum + m.value, 0) / secondHalf.length;

			const change = (secondAvg - firstAvg) / firstAvg;
			if (change > 0.1) trend = "up";
			else if (change < -0.1) trend = "down";
		}

		return { min, max, avg, count: recentMetrics.length, trend };
	}
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitor();
