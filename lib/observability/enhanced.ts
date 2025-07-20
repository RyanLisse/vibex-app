/**
 * Enhanced observability module that integrates Sentry with existing OpenTelemetry
 */

import * as Sentry from "@sentry/nextjs";
import { getSentryLogger } from "@/lib/sentry/logger";
import { observability } from "./index";

/**
 * Enhanced observability service that includes Sentry
 */
export class EnhancedObservability {
	private static instance: EnhancedObservability;

	static getInstance(): EnhancedObservability {
		if (!EnhancedObservability.instance) {
			EnhancedObservability.instance = new EnhancedObservability();
		}
		return EnhancedObservability.instance;
	}

	/**
	 * Track a performance metric in both systems
	 */
	trackMetric(
		name: string,
		value: number,
		unit: string,
		tags?: Record<string, string>,
	) {
		// Track in existing observability system
		observability.metrics.gauge(value, name);

		// Track in Sentry
		Sentry.metrics.gauge(name, value, {
			unit,
			tags,
		});
	}

	/**
	 * Track an increment metric
	 */
	trackIncrement(name: string, value = 1, tags?: Record<string, string>) {
		// Track in existing observability system
		observability.metrics.requestCount(value, name);

		// Track in Sentry
		Sentry.metrics.increment(name, value, {
			tags,
		});
	}

	/**
	 * Track a distribution metric (for timing/size measurements)
	 */
	trackDistribution(
		name: string,
		value: number,
		unit: string,
		tags?: Record<string, string>,
	) {
		// Track in existing observability system
		observability.metrics.queryDuration(value, name, true);

		// Track in Sentry
		Sentry.metrics.distribution(name, value, {
			unit,
			tags,
		});
	}

	/**
	 * Track a set metric (for unique values)
	 */
	trackSet(
		name: string,
		value: string | number,
		tags?: Record<string, string>,
	) {
		// Track in Sentry (no direct equivalent in existing system)
		Sentry.metrics.set(name, value, {
			tags,
		});
	}

	/**
	 * Track a gauge metric
	 */
	trackGauge(name: string, value: number, tags?: Record<string, string>) {
		// Track in existing observability system
		observability.metrics.gauge(value, name);

		// Track in Sentry
		Sentry.metrics.gauge(name, value, {
			tags,
		});
	}

	/**
	 * Log an event with enhanced context
	 */
	async logEvent(
		level: "info" | "warn" | "error" | "debug",
		message: string,
		metadata?: Record<string, any>,
		component?: string,
		tags?: string[],
	) {
		// Log to existing system
		await observability.events.collector.collectEvent(
			"system_event",
			level,
			message,
			metadata,
			component || "app",
			tags || [],
		);

		// Add breadcrumb to Sentry
		Sentry.addBreadcrumb({
			message,
			category: component || "app",
			level: level === "warn" ? "warning" : level,
			data: metadata,
		});

		// If it's an error, also capture as exception
		if (level === "error" && metadata?.error) {
			Sentry.captureException(metadata.error, {
				tags: {
					component: component || "app",
					...(tags?.reduce((acc, tag) => ({ ...acc, [tag]: true }), {}) || {}),
				},
				extra: metadata,
			});
		}
	}

	/**
	 * Create a transaction for complex operations
	 */
	startTransaction(name: string, op: string) {
		return Sentry.startTransaction({
			name,
			op,
		});
	}

	/**
	 * Get an enhanced logger for a component
	 */
	getLogger(component: string) {
		return getSentryLogger(component);
	}

	/**
	 * Set user context for both systems
	 */
	setUser(user: { id: string; email?: string; [key: string]: any }) {
		// Set in Sentry
		Sentry.setUser(user);

		// Set in observability context
		observability.setGlobalAttributes({
			"user.id": user.id,
			"user.email": user.email || "",
		});
	}

	/**
	 * Clear user context
	 */
	clearUser() {
		Sentry.setUser(null);
		observability.setGlobalAttributes({
			"user.id": "",
			"user.email": "",
		});
	}

	/**
	 * Set global tags/attributes
	 */
	setGlobalTags(tags: Record<string, string>) {
		// Set in Sentry
		Sentry.setTags(tags);

		// Set in observability
		observability.setGlobalAttributes(tags);
	}

	/**
	 * Create a performance timer
	 */
	createTimer(name: string, tags?: Record<string, string>) {
		const startTime = performance.now();

		return {
			end: () => {
				const duration = performance.now() - startTime;
				this.trackDistribution(name, duration, "millisecond", tags);
			},
		};
	}
}

// Export singleton instance
export const enhancedObservability = EnhancedObservability.getInstance();
