/**
 * Performance Metrics Collection and Aggregation System
 *
 * Collects, aggregates, and analyzes performance metrics for database operations,
 * WASM optimizations, query performance, and system health monitoring.
 */

export interface MetricDataPoint {
	timestamp: number;
	value: number;
	labels?: Record<string, string>;
}

export interface AggregatedMetric {
	name: string;
	count: number;
	sum: number;
	average: number;
	min: number;
	max: number;
	latest: number;
}

export type MetricType = "counter" | "gauge" | "histogram" | "timer";

export interface MetricsCollector {
	collect(metric: string, value: number): void;
	getMetrics(): Record<string, number>;
	reset(): void;
	recordMetric(name: string, value: number, labels?: Record<string, string>): void;
}

export class PerformanceMetricsCollector {
	private metrics: Map<string, MetricDataPoint[]> = new Map();
	private aggregatedCache: Map<string, { data: AggregatedMetric; lastUpdate: number }> = new Map();
	private readonly maxDataPoints: number;
	private readonly cacheTimeout: number;

	constructor(maxDataPoints = 1000, cacheTimeoutMs = 5000) {
		this.maxDataPoints = maxDataPoints;
		this.cacheTimeout = cacheTimeoutMs;
	}

	collect(name: string, value: number, labels?: Record<string, string>) {
		const dataPoint: MetricDataPoint = {
			timestamp: Date.now(),
			value,
			labels,
		};

		let points = this.metrics.get(name);
		if (!points) {
			points = [];
			this.metrics.set(name, points);
		}

		points.push(dataPoint);

		// Optimize: Use more efficient array slicing only when necessary
		if (points.length > this.maxDataPoints) {
			// Remove oldest 10% to reduce frequent slicing
			const removeCount = Math.floor(this.maxDataPoints * 0.1);
			points.splice(0, removeCount);
		}

		// Invalidate cache for this metric
		this.aggregatedCache.delete(name);
	}

	getMetric(name: string): MetricDataPoint[] {
		return this.metrics.get(name) || [];
	}

	getAggregatedMetric(name: string): AggregatedMetric | null {
		const points = this.metrics.get(name);
		if (!points || points.length === 0) return null;

		// Check cache first
		const cached = this.aggregatedCache.get(name);
		const now = Date.now();
		if (cached && now - cached.lastUpdate < this.cacheTimeout) {
			return cached.data;
		}

		// Optimize: Single pass calculation instead of multiple array iterations
		let sum = 0;
		let min = Number.MAX_VALUE;
		let max = Number.MIN_VALUE;
		let latest = 0;

		for (let i = 0; i < points.length; i++) {
			const value = points[i].value;
			sum += value;
			if (value < min) min = value;
			if (value > max) max = value;
			if (i === points.length - 1) latest = value;
		}

		const aggregated: AggregatedMetric = {
			name,
			count: points.length,
			sum,
			average: sum / points.length,
			min,
			max,
			latest,
		};

		// Cache the result
		this.aggregatedCache.set(name, { data: aggregated, lastUpdate: now });
		return aggregated;
	}

	getAllMetrics(): Record<string, AggregatedMetric> {
		const result: Record<string, AggregatedMetric> = {};
		for (const [name] of this.metrics) {
			const aggregated = this.getAggregatedMetric(name);
			if (aggregated) {
				result[name] = aggregated;
			}
		}
		return result;
	}

	reset() {
		this.metrics.clear();
		this.aggregatedCache.clear();
	}

	// New method to get metrics count for monitoring
	getMetricsCount(): number {
		return this.metrics.size;
	}

	// New method to get total data points for memory monitoring
	getTotalDataPoints(): number {
		let total = 0;
		for (const points of this.metrics.values()) {
			total += points.length;
		}
		return total;
	}
}

export class MetricsAnalyzer {
	constructor(private collector: PerformanceMetricsCollector) {}

	analyzePerformanceTrends(
		metricName: string,
		windowMinutes: number = 60
	): {
		trend: "improving" | "degrading" | "stable";
		change: number;
		confidence: number;
	} {
		const points = this.collector.getMetric(metricName);
		if (points.length < 10) {
			return { trend: "stable", change: 0, confidence: 0 };
		}

		const cutoff = Date.now() - windowMinutes * 60 * 1000;
		const recentPoints = points.filter((p) => p.timestamp >= cutoff);

		if (recentPoints.length < 5) {
			return { trend: "stable", change: 0, confidence: 0 };
		}

		const firstHalf = recentPoints.slice(0, Math.floor(recentPoints.length / 2));
		const secondHalf = recentPoints.slice(Math.floor(recentPoints.length / 2));

		const firstAvg = firstHalf.reduce((sum, p) => sum + p.value, 0) / firstHalf.length;
		const secondAvg = secondHalf.reduce((sum, p) => sum + p.value, 0) / secondHalf.length;

		const change = ((secondAvg - firstAvg) / firstAvg) * 100;
		const confidence = Math.min(recentPoints.length / 50, 1);

		let trend: "improving" | "degrading" | "stable" = "stable";
		if (Math.abs(change) > 5) {
			trend = change > 0 ? "degrading" : "improving";
		}

		return { trend, change: Math.round(change * 100) / 100, confidence };
	}

	private anomalyCache: Map<
		string,
		{ result: MetricDataPoint[]; timestamp: number; threshold: number }
	> = new Map();
	private readonly cacheTimeout = 30000; // 30 seconds

	detectAnomalies(metricName: string, threshold: number = 2): MetricDataPoint[] {
		// Check cache first
		const cacheKey = `${metricName}_${threshold}`;
		const cached = this.anomalyCache.get(cacheKey);
		const now = Date.now();

		if (cached && now - cached.timestamp < this.cacheTimeout && cached.threshold === threshold) {
			return cached.result;
		}

		const points = this.collector.getMetric(metricName);
		if (points.length < 10) {
			this.anomalyCache.set(cacheKey, { result: [], timestamp: now, threshold });
			return [];
		}

		// Optimize: Single pass calculation for mean and variance
		let sum = 0;
		let sumSquares = 0;

		for (const point of points) {
			const value = point.value;
			sum += value;
			sumSquares += value * value;
		}

		const mean = sum / points.length;
		const variance = sumSquares / points.length - mean * mean;
		const stdDev = Math.sqrt(variance);
		const thresholdValue = threshold * stdDev;

		// Filter anomalies
		const anomalies: MetricDataPoint[] = [];
		for (const point of points) {
			if (Math.abs(point.value - mean) > thresholdValue) {
				anomalies.push(point);
			}
		}

		this.anomalyCache.set(cacheKey, { result: anomalies, timestamp: now, threshold });
		return anomalies;
	}

	// New method to clear caches
	clearCache(): void {
		this.anomalyCache.clear();
	}

	// New method to get cache statistics
	getCacheStats(): { anomalyCacheSize: number } {
		return {
			anomalyCacheSize: this.anomalyCache.size,
		};
	}
}

// Create singleton instances for better performance
const performanceCollector = new PerformanceMetricsCollector();
const metricsAnalyzer = new MetricsAnalyzer(performanceCollector);

export const metricsCollector: MetricsCollector & {
	queryDuration: { record: (value: number) => void };
	errorRate: { record: (value: number) => void };
	getAnalyzer: () => MetricsAnalyzer;
	getCollector: () => PerformanceMetricsCollector;
} = {
	collect(metric: string, value: number) {
		performanceCollector.collect(metric, value);
	},

	getMetrics() {
		// Convert AggregatedMetric to simple number values for compatibility
		const aggregated = performanceCollector.getAllMetrics();
		const result: Record<string, number> = {};
		for (const [name, metric] of Object.entries(aggregated)) {
			result[name] = metric.average; // Use average as the representative value
		}
		return result;
	},

	reset() {
		performanceCollector.reset();
		metricsAnalyzer.clearCache();
	},

	recordMetric(name: string, value: number, labels?: Record<string, string>) {
		performanceCollector.collect(name, value, labels);
	},

	queryDuration: {
		record: (value: number) => {
			performanceCollector.collect("query_duration_ms", value);
		},
	},

	errorRate: {
		record: (value: number) => {
			performanceCollector.collect("error_rate", value);
		},
	},

	// Provide access to advanced features
	getAnalyzer: () => metricsAnalyzer,
	getCollector: () => performanceCollector,
};

// Export performance metrics with enhanced functionality
export const metrics = metricsCollector;
