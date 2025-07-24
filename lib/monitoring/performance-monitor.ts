import * as Sentry from "@sentry/nextjs";

/**
 * Performance thresholds for different types of operations
 */
const PERFORMANCE_THRESHOLDS = {
	// API response times (milliseconds)
	api: {
		fast: 100,
		acceptable: 500,
		slow: 1000,
		critical: 3000,
	},
	// Database query times
	database: {
		fast: 50,
		acceptable: 200,
		slow: 500,
		critical: 1000,
	},
	// Page load times
	page: {
		fast: 1000,
		acceptable: 2500,
		slow: 4000,
		critical: 8000,
	},
	// Component render times
	component: {
		fast: 16, // 60fps
		acceptable: 33, // 30fps
		slow: 100,
		critical: 500,
	},
} as const;

/**
 * Performance metrics interface
 */
interface PerformanceMetric {
	name: string;
	value: number;
	unit: "ms" | "bytes" | "count";
	threshold: keyof typeof PERFORMANCE_THRESHOLDS;
	timestamp: number;
	context?: Record<string, any>;
}

/**
 * Web Vitals tracking
 */
interface WebVital {
	name: "CLS" | "FID" | "FCP" | "LCP" | "TTFB";
	value: number;
	rating: "good" | "needs-improvement" | "poor";
	delta: number;
	id: string;
}

/**
 * Enhanced Performance Monitor with comprehensive tracking,
 * alerting, and optimization recommendations.
 */
export class PerformanceMonitor {
	private metrics: PerformanceMetric[] = [];
	private observers: Map<string, PerformanceObserver> = new Map();
	private isClient = typeof window !== "undefined";

	constructor() {
		if (this.isClient) {
			this.initializeWebVitals();
			this.initializePerformanceObservers();
		}
	}

	/**
	 * Track a performance metric
	 */
	track(
		name: string,
		value: number,
		options: {
			unit?: "ms" | "bytes" | "count";
			threshold?: keyof typeof PERFORMANCE_THRESHOLDS;
			context?: Record<string, any>;
		} = {}
	): void {
		const { unit = "ms", threshold = "api", context } = options;

		const metric: PerformanceMetric = {
			name,
			value,
			unit,
			threshold,
			timestamp: Date.now(),
			context,
		};

		this.metrics.push(metric);

		// Check if metric exceeds thresholds
		this.checkThreshold(metric);

		// Report to Sentry
		this.reportToSentry(metric);

		// Log in development
		if (process.env.NODE_ENV === "development") {
			console.log(`📊 Performance: ${name} = ${value}${unit}`, context);
		}
	}

	/**
	 * Time a function execution
	 */
	async time<T>(
		name: string,
		fn: () => Promise<T> | T,
		options?: Parameters<typeof this.track>[2]
	): Promise<T> {
		const start = performance.now();

		try {
			const result = await fn();
			const duration = performance.now() - start;
			this.track(name, duration, options);
			return result;
		} catch (error) {
			const duration = performance.now() - start;
			this.track(`${name}_error`, duration, {
				...options,
				context: {
					...options?.context,
					error: error instanceof Error ? error.message : String(error),
				},
			});
			throw error;
		}
	}

	/**
	 * Track API request performance
	 */
	trackAPIRequest(
		endpoint: string,
		method: string,
		duration: number,
		status: number,
		context?: Record<string, any>
	): void {
		this.track(`api_${method.toLowerCase()}_${endpoint}`, duration, {
			threshold: "api",
			context: {
				endpoint,
				method,
				status,
				...context,
			},
		});

		// Track error rates
		if (status >= 400) {
			this.track(`api_error_${status}`, 1, {
				unit: "count",
				context: { endpoint, method, status },
			});
		}
	}

	/**
	 * Track database query performance
	 */
	trackDatabaseQuery(query: string, duration: number, context?: Record<string, any>): void {
		// Sanitize query for logging
		const sanitizedQuery = query.replace(/\$\d+/g, "?").substring(0, 100);

		this.track(`db_query`, duration, {
			threshold: "database",
			context: {
				query: sanitizedQuery,
				...context,
			},
		});
	}

	/**
	 * Track component render performance
	 */
	trackComponentRender(
		componentName: string,
		duration: number,
		context?: Record<string, any>
	): void {
		this.track(`component_render_${componentName}`, duration, {
			threshold: "component",
			context,
		});
	}

	/**
	 * Initialize Web Vitals tracking
	 */
	private initializeWebVitals(): void {
		if (!this.isClient) return;

		// Dynamic import to avoid SSR issues
		import("web-vitals")
			.then(({ onCLS, onFCP, onLCP, onTTFB }) => {
				const reportWebVital = (vital: WebVital) => {
					this.track(`web_vital_${vital.name}`, vital.value, {
						unit: vital.name === "CLS" ? "count" : "ms",
						context: {
							rating: vital.rating,
							delta: vital.delta,
							id: vital.id,
						},
					});

					// Report poor vitals to Sentry
					if (vital.rating === "poor") {
						Sentry.addBreadcrumb({
							message: `Poor Web Vital: ${vital.name}`,
							level: "warning",
							data: vital,
						});
					}
				};

				onCLS(reportWebVital);
				onFCP(reportWebVital);
				onLCP(reportWebVital);
				onTTFB(reportWebVital);
			})
			.catch(console.error);
	}

	/**
	 * Initialize Performance Observers
	 */
	private initializePerformanceObservers(): void {
		if (!this.isClient || !("PerformanceObserver" in window)) return;

		// Long Tasks Observer
		try {
			const longTaskObserver = new PerformanceObserver((list) => {
				for (const entry of list.getEntries()) {
					this.track("long_task", entry.duration, {
						context: {
							name: entry.name,
							startTime: entry.startTime,
						},
					});
				}
			});
			longTaskObserver.observe({ entryTypes: ["longtask"] });
			this.observers.set("longtask", longTaskObserver);
		} catch (error) {
			console.warn("Long Task Observer not supported:", error);
		}

		// Layout Shift Observer
		try {
			const layoutShiftObserver = new PerformanceObserver((list) => {
				for (const entry of list.getEntries()) {
					if ((entry as any).hadRecentInput) continue;

					this.track("layout_shift", (entry as any).value, {
						unit: "count",
						context: {
							sources: (entry as any).sources?.map((source: any) => ({
								node: source.node?.tagName,
								previousRect: source.previousRect,
								currentRect: source.currentRect,
							})),
						},
					});
				}
			});
			layoutShiftObserver.observe({ entryTypes: ["layout-shift"] });
			this.observers.set("layout-shift", layoutShiftObserver);
		} catch (error) {
			console.warn("Layout Shift Observer not supported:", error);
		}
	}

	/**
	 * Check if metric exceeds thresholds
	 */
	private checkThreshold(metric: PerformanceMetric): void {
		const thresholds = PERFORMANCE_THRESHOLDS[metric.threshold];
		if (!thresholds) return;

		let level: "info" | "warning" | "error" = "info";
		let message = "";

		if (metric.value > thresholds.critical) {
			level = "error";
			message = `Critical performance issue: ${metric.name} took ${metric.value}${metric.unit}`;
		} else if (metric.value > thresholds.slow) {
			level = "warning";
			message = `Slow performance: ${metric.name} took ${metric.value}${metric.unit}`;
		}

		if (message) {
			// Log performance issue
			console[level](message, metric.context);

			// Report to Sentry for critical issues
			if (level === "error") {
				Sentry.captureMessage(message, {
					level,
					extra: metric,
				});
			}
		}
	}

	/**
	 * Report metric to Sentry
	 */
	private reportToSentry(metric: PerformanceMetric): void {
		// Add as breadcrumb for context
		Sentry.addBreadcrumb({
			message: `Performance: ${metric.name}`,
			level: "info",
			data: {
				value: metric.value,
				unit: metric.unit,
				...metric.context,
			},
		});

		// Set custom tag for the metric (Sentry doesn't have metrics.gauge in nextjs)
		Sentry.setTag(`perf_${metric.name}`, metric.value);

		// For critical performance issues, also report as a performance issue
		if (metric.threshold && PERFORMANCE_THRESHOLDS[metric.threshold]) {
			const thresholds = PERFORMANCE_THRESHOLDS[metric.threshold];
			if (metric.value > thresholds.critical) {
				Sentry.captureMessage(
					`Critical performance: ${metric.name} = ${metric.value}${metric.unit}`,
					{
						level: "error",
						tags: {
							performance_metric: metric.name,
							threshold: metric.threshold,
							unit: metric.unit,
						},
						extra: metric.context,
					}
				);
			}
		}
	}

	/**
	 * Get performance summary
	 */
	getSummary(): {
		totalMetrics: number;
		averages: Record<string, number>;
		slowest: PerformanceMetric[];
		recent: PerformanceMetric[];
	} {
		const now = Date.now();
		const recentMetrics = this.metrics.filter((m) => now - m.timestamp < 60000); // Last minute

		const averages: Record<string, number> = {};
		const metricGroups: Record<string, number[]> = {};

		// Group metrics by name
		recentMetrics.forEach((metric) => {
			if (!metricGroups[metric.name]) {
				metricGroups[metric.name] = [];
			}
			metricGroups[metric.name].push(metric.value);
		});

		// Calculate averages
		Object.entries(metricGroups).forEach(([name, values]) => {
			averages[name] = values.reduce((sum, val) => sum + val, 0) / values.length;
		});

		// Get slowest metrics
		const slowest = [...this.metrics].sort((a, b) => b.value - a.value).slice(0, 10);

		return {
			totalMetrics: this.metrics.length,
			averages,
			slowest,
			recent: recentMetrics.slice(-20),
		};
	}

	/**
	 * Clear old metrics to prevent memory leaks
	 */
	cleanup(): void {
		const oneHourAgo = Date.now() - 3600000;
		this.metrics = this.metrics.filter((m) => m.timestamp > oneHourAgo);
	}

	/**
	 * Disconnect all observers
	 */
	disconnect(): void {
		this.observers.forEach((observer) => observer.disconnect());
		this.observers.clear();
	}
}

// Global performance monitor instance
export const performanceMonitor = new PerformanceMonitor();

// Cleanup on page unload
if (typeof window !== "undefined") {
	window.addEventListener("beforeunload", () => {
		performanceMonitor.disconnect();
	});

	// Periodic cleanup
	setInterval(() => {
		performanceMonitor.cleanup();
	}, 300000); // Every 5 minutes
}
