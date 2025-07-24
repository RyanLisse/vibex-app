/**
 * Prometheus Metrics Middleware
 * Automatically instruments HTTP requests and other operations
 */

import { type NextRequest, NextResponse } from "next/server";
import { PrometheusMetricsCollector } from "./prometheus-client";

export interface MetricsMiddlewareConfig {
	enabled: boolean;
	excludePaths?: RegExp[];
	includeUserAgent?: boolean;
	includeIP?: boolean;
	trackResponseSize?: boolean;
}

export class PrometheusMiddleware {
	private static instance: PrometheusMiddleware;
	private collector: PrometheusMetricsCollector;
	private config: MetricsMiddlewareConfig;

	private constructor(config: MetricsMiddlewareConfig) {
		this.collector = PrometheusMetricsCollector.getInstance();
		this.config = config;
	}

	static getInstance(config?: MetricsMiddlewareConfig): PrometheusMiddleware {
		if (!PrometheusMiddleware.instance) {
			PrometheusMiddleware.instance = new PrometheusMiddleware(
				config || {
					enabled: process.env.NODE_ENV === "production",
					excludePaths: [/^\/api\/metrics/, /^\/api\/health/, /^\/_next/, /^\/favicon/],
					includeUserAgent: false,
					includeIP: false,
					trackResponseSize: true,
				}
			);
		}
		return PrometheusMiddleware.instance;
	}

	/**
	 * Next.js middleware for HTTP request instrumentation
	 */
	middleware() {
		return async (request: NextRequest) => {
			if (!this.config.enabled) {
				return NextResponse.next();
			}

			const startTime = Date.now();
			const { pathname } = request.nextUrl;

			// Check if path should be excluded
			if (this.shouldExcludePath(pathname)) {
				return NextResponse.next();
			}

			// Process the request
			const response = NextResponse.next();

			// Record metrics after response
			const duration = (Date.now() - startTime) / 1000;
			const method = request.method;
			const statusCode = response.status;

			this.collector.recordHttpRequest(method, pathname, statusCode, duration);

			// Add metrics headers in development
			if (process.env.NODE_ENV === "development") {
				response.headers.set("X-Response-Time", `${duration}s`);
				response.headers.set("X-Metrics-Recorded", "true");
			}

			return response;
		};
	}

	/**
	 * Express-style middleware for HTTP request instrumentation
	 */
	expressMiddleware() {
		return (req: any, res: any, next: any) => {
			if (!this.config.enabled) {
				return next();
			}

			const startTime = Date.now();
			const originalSend = res.send;

			// Intercept response
			res.send = function (body: any) {
				const duration = (Date.now() - startTime) / 1000;
				const method = req.method;
				const route = req.route?.path || req.path || "unknown";
				const statusCode = res.statusCode;

				// Record metrics
				PrometheusMiddleware.instance.collector.recordHttpRequest(
					method,
					route,
					statusCode,
					duration
				);

				return originalSend.call(this, body);
			};

			next();
		};
	}

	/**
	 * Manual HTTP request recording
	 */
	recordRequest(
		method: string,
		path: string,
		statusCode: number,
		duration: number,
		metadata?: {
			userAgent?: string;
			ip?: string;
			responseSize?: number;
		}
	) {
		if (!this.config.enabled) return;

		this.collector.recordHttpRequest(method, path, statusCode, duration);

		// Record additional metadata if configured
		if (metadata?.responseSize && this.config.trackResponseSize) {
			this.collector.gauge("http_response_size_bytes", metadata.responseSize, {
				method,
				path,
				status_code: statusCode.toString(),
			});
		}
	}

	/**
	 * Database operation instrumentation
	 */
	instrumentDatabase() {
		return {
			recordQuery: (operation: string, table: string, duration: number) => {
				if (!this.config.enabled) return;
				this.collector.recordDatabaseQuery(operation, table, duration);
			},

			recordConnection: (database: string, pool: string, count: number) => {
				if (!this.config.enabled) return;
				this.collector.setDatabaseConnections(database, pool, count);
			},
		};
	}

	/**
	 * Agent operation instrumentation
	 */
	instrumentAgent() {
		return {
			recordOperation: (
				agentId: string,
				agentType: string,
				operation: string,
				provider: string,
				status: "success" | "error" | "timeout"
			) => {
				if (!this.config.enabled) return;
				this.collector.recordAgentOperation(agentId, agentType, operation, provider, status);
			},

			recordExecution: (
				agentId: string,
				agentType: string,
				taskType: string,
				provider: string,
				duration: number
			) => {
				if (!this.config.enabled) return;
				this.collector.recordAgentExecution(agentId, agentType, taskType, provider, duration);
			},

			recordTokenUsage: (
				agentId: string,
				agentType: string,
				provider: string,
				tokenType: "input" | "output" | "total",
				count: number
			) => {
				if (!this.config.enabled) return;
				this.collector.recordTokenUsage(agentId, agentType, provider, tokenType, count);
			},

			recordCost: (agentId: string, agentType: string, provider: string, cost: number) => {
				if (!this.config.enabled) return;
				this.collector.recordAgentCost(agentId, agentType, provider, cost);
			},

			setActiveCount: (agentType: string, provider: string, count: number) => {
				if (!this.config.enabled) return;
				this.collector.setActiveAgents(agentType, provider, count);
			},
		};
	}

	/**
	 * Business metrics instrumentation
	 */
	instrumentBusiness() {
		return {
			recordFeatureUsage: (feature: string, userType: string) => {
				if (!this.config.enabled) return;
				this.collector.recordFeatureUsage(feature, userType);
			},

			setActiveUsers: (count: number) => {
				if (!this.config.enabled) return;
				this.collector.setActiveUserSessions(count);
			},
		};
	}

	/**
	 * Background job instrumentation
	 */
	instrumentBackgroundJobs() {
		return {
			recordJobStart: (jobType: string, jobId: string) => {
				if (!this.config.enabled) return;

				const startTime = Date.now();

				// Store start time for duration calculation
				(global as any).jobStartTimes = (global as any).jobStartTimes || new Map();
				(global as any).jobStartTimes.set(jobId, startTime);

				this.collector.gauge("background_jobs_active", 1, {
					job_type: jobType,
					job_id: jobId,
				});
			},

			recordJobEnd: (
				jobType: string,
				jobId: string,
				status: "success" | "failure" | "cancelled"
			) => {
				if (!this.config.enabled) return;

				const startTime = (global as any).jobStartTimes?.get(jobId);
				if (startTime) {
					const duration = (Date.now() - startTime) / 1000;

					this.collector
						.createCustomHistogram(
							"background_job_duration_seconds",
							"Duration of background job execution",
							["job_type", "status"],
							[0.1, 0.5, 1, 2, 5, 10, 30, 60, 300]
						)
						.observe({ job_type: jobType, status }, duration);

					(global as any).jobStartTimes?.delete(jobId);
				}

				this.collector.gauge("background_jobs_active", 0, {
					job_type: jobType,
					job_id: jobId,
				});
			},
		};
	}

	/**
	 * Check if path should be excluded from metrics
	 */
	private shouldExcludePath(pathname: string): boolean {
		if (!this.config.excludePaths) return false;

		return this.config.excludePaths.some((pattern) => pattern.test(pathname));
	}

	/**
	 * Enable/disable metrics collection
	 */
	setEnabled(enabled: boolean) {
		this.config.enabled = enabled;
	}

	/**
	 * Get current configuration
	 */
	getConfig(): MetricsMiddlewareConfig {
		return { ...this.config };
	}
}

// Default instance export
export const metricsMiddleware = PrometheusMiddleware.getInstance();

// Utility functions for easy access
export const recordHttpRequest = (
	method: string,
	path: string,
	statusCode: number,
	duration: number
) => {
	metricsMiddleware.recordRequest(method, path, statusCode, duration);
};

export const instrumentAgent = () => metricsMiddleware.instrumentAgent();
export const instrumentDatabase = () => metricsMiddleware.instrumentDatabase();
export const instrumentBusiness = () => metricsMiddleware.instrumentBusiness();
export const instrumentBackgroundJobs = () => metricsMiddleware.instrumentBackgroundJobs();
