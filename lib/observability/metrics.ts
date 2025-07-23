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

export type MetricType = 'counter' | 'gauge' | 'histogram' | 'timer';

export interface MetricsCollector {
	collect(metric: string, value: number): void;
	getMetrics(): Record<string, number>;
	reset(): void;
	recordMetric(name: string, value: number, labels?: Record<string, string>): void;
}

export class PerformanceMetricsCollector {
	private metrics: Map<string, MetricDataPoint[]> = new Map();

	collect(name: string, value: number, labels?: Record<string, string>) {
		const dataPoint: MetricDataPoint = {
			timestamp: Date.now(),
			value,
			labels,
		};

		if (!this.metrics.has(name)) {
			this.metrics.set(name, []);
		}

		const points = this.metrics.get(name)!;
		points.push(dataPoint);

		// Keep only last 1000 data points per metric
		if (points.length > 1000) {
			this.metrics.set(name, points.slice(-1000));
		}
	}

	getMetric(name: string): MetricDataPoint[] {
		return this.metrics.get(name) || [];
	}

	getAggregatedMetric(name: string): AggregatedMetric | null {
		const points = this.metrics.get(name);
		if (!points || points.length === 0) return null;

		const values = points.map(p => p.value);
		return {
			name,
			count: values.length,
			sum: values.reduce((a, b) => a + b, 0),
			average: values.reduce((a, b) => a + b, 0) / values.length,
			min: Math.min(...values),
			max: Math.max(...values),
			latest: values[values.length - 1],
		};
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
	}
}

export class MetricsAnalyzer {
	constructor(private collector: PerformanceMetricsCollector) {}

	analyzePerformanceTrends(metricName: string, windowMinutes: number = 60): {
		trend: 'improving' | 'degrading' | 'stable';
		change: number;
		confidence: number;
	} {
		const points = this.collector.getMetric(metricName);
		if (points.length < 10) {
			return { trend: 'stable', change: 0, confidence: 0 };
		}

		const cutoff = Date.now() - (windowMinutes * 60 * 1000);
		const recentPoints = points.filter(p => p.timestamp >= cutoff);
		
		if (recentPoints.length < 5) {
			return { trend: 'stable', change: 0, confidence: 0 };
		}

		const firstHalf = recentPoints.slice(0, Math.floor(recentPoints.length / 2));
		const secondHalf = recentPoints.slice(Math.floor(recentPoints.length / 2));

		const firstAvg = firstHalf.reduce((sum, p) => sum + p.value, 0) / firstHalf.length;
		const secondAvg = secondHalf.reduce((sum, p) => sum + p.value, 0) / secondHalf.length;

		const change = ((secondAvg - firstAvg) / firstAvg) * 100;
		const confidence = Math.min(recentPoints.length / 50, 1);

		let trend: 'improving' | 'degrading' | 'stable' = 'stable';
		if (Math.abs(change) > 5) {
			trend = change > 0 ? 'degrading' : 'improving';
		}

		return { trend, change: Math.round(change * 100) / 100, confidence };
	}

	detectAnomalies(metricName: string, threshold: number = 2): MetricDataPoint[] {
		const points = this.collector.getMetric(metricName);
		if (points.length < 10) return [];

		const values = points.map(p => p.value);
		const mean = values.reduce((a, b) => a + b, 0) / values.length;
		const variance = values.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / values.length;
		const stdDev = Math.sqrt(variance);

		return points.filter(point => 
			Math.abs(point.value - mean) > threshold * stdDev
		);
	}
}

export const metricsCollector: MetricsCollector = {
	collect(metric: string, value: number) {
		// Stub implementation
		console.log(`Metric collected: ${metric} = ${value}`);
	},

	getMetrics() {
		// Stub implementation
		return {};
	},

	reset() {
		// Stub implementation
		console.log("Metrics reset");
	},

	recordMetric(name: string, value: number, labels?: Record<string, string>) {
		// Stub implementation
		console.log(`Metric recorded: ${name} = ${value}`, labels);
	},
};

// Export performance metrics with enhanced functionality
export const metrics = metricsCollector;
