/**
 * Base API Service Infrastructure
 *
 * Provides a base class for all API services with automatic tracing,
 * error handling, and observability integration.
 */

import { type Span, SpanStatusCode, trace } from "@opentelemetry/api";
import { BaseAPIError, DatabaseError } from "./errors";

export interface ServiceOptions {
	tracerName?: string;
	serviceName: string;
}

export interface ServiceContext {
	userId?: string;
	sessionId?: string;
	requestId?: string;
	[key: string]: any;
}

/**
 * Base service class with automatic tracing and error handling
 */
export abstract class BaseAPIService {
	protected _tracer: any;
	protected serviceName: string;
	protected tracerName: string;

	constructor(options: ServiceOptions) {
		this.serviceName = options.serviceName;
		this.tracerName = options.tracerName || `${options.serviceName}-api`;
	}

	protected get tracer() {
		if (!this._tracer) {
			this._tracer = trace.getTracer(this.tracerName);
		}
		return this._tracer;
	}

	/**
	 * Execute a service method with automatic tracing and error handling
	 */
	protected async executeWithTracing<T>(
		operation: string,
		context: ServiceContext,
		fn: (span: Span) => Promise<T>,
	): Promise<T> {
		const span = this.tracer.startSpan(`${this.serviceName}.${operation}`);

		// Add context attributes
		span.setAttributes({
			"service.name": this.serviceName,
			"operation.name": operation,
			...Object.entries(context).reduce(
				(acc, [key, value]) => {
					if (value !== undefined) {
						acc[`context.${key}`] = String(value);
					}
					return acc;
				},
				{} as Record<string, string>,
			),
		});

		const startTime = Date.now();

		try {
			const result = await fn(span);

			const duration = Date.now() - startTime;

			// Record success metrics
			if (process.env.NEXT_PHASE !== "phase-production-build") {
				try {
					const { observability } = await import("@/lib/observability");
					observability.metrics.queryDuration(duration, operation, true, {
						service: this.serviceName,
					});
				} catch (error) {
					// Ignore observability errors
				}
			}

			span.setAttributes({
				"operation.duration": duration,
				"operation.success": true,
			});

			return result;
		} catch (error) {
			const duration = Date.now() - startTime;

			// Record error metrics
			if (process.env.NEXT_PHASE !== "phase-production-build") {
				try {
					const { observability } = await import("@/lib/observability");
					observability.metrics.queryDuration(duration, operation, false, {
						service: this.serviceName,
					});
					observability.metrics.errorRate(1, this.serviceName, {
						operation,
						error_type: error instanceof BaseAPIError ? error.code : "UNKNOWN",
					});
				} catch (error) {
					// Ignore observability errors
				}
			}

			// Handle error in span
			if (error instanceof BaseAPIError) {
				error.recordInSpan(span);
			} else {
				span.recordException(error as Error);
				span.setStatus({
					code: SpanStatusCode.ERROR,
					message: (error as Error).message,
				});
			}

			span.setAttributes({
				"operation.duration": duration,
				"operation.success": false,
				"error.type": error instanceof BaseAPIError ? error.code : "UNKNOWN",
			});

			throw error;
		} finally {
			span.end();
		}
	}

	/**
	 * Execute a database operation with automatic error handling
	 */
	protected async executeDatabase<T>(
		operation: string,
		fn: () => Promise<T>,
	): Promise<T> {
		try {
			return await fn();
		} catch (error) {
			// Wrap database errors
			throw new DatabaseError(
				`Database operation failed: ${operation}`,
				error as Error,
			);
		}
	}

	/**
	 * Record a service event
	 */
	protected async recordEvent(
		action: string,
		message: string,
		data?: Record<string, any>,
	) {
		if (process.env.NEXT_PHASE !== "phase-production-build") {
			try {
				const { observability } = await import("@/lib/observability");
				await observability.events.collector
					.collectEvent(
						action,
						"info",
						message,
						{
							service: this.serviceName,
							...data,
						},
						"api",
						[this.serviceName.toLowerCase(), action.toLowerCase()],
					)
					.catch(console.error);
			} catch (error) {
				// Ignore observability errors
			}
		}
	}
}

/**
 * Base service for CRUD operations
 */
export abstract class BaseCRUDService<
	T,
	CreateDTO,
	UpdateDTO,
> extends BaseAPIService {
	protected abstract tableName: string;

	/**
	 * Get all items with pagination
	 */
	abstract getAll(
		filters: Record<string, any>,
		pagination: { page: number; limit: number },
		context: ServiceContext,
	): Promise<{ items: T[]; total: number }>;

	/**
	 * Get item by ID
	 */
	abstract getById(id: string, context: ServiceContext): Promise<T>;

	/**
	 * Create new item
	 */
	abstract create(data: CreateDTO, context: ServiceContext): Promise<T>;

	/**
	 * Update existing item
	 */
	abstract update(
		id: string,
		data: UpdateDTO,
		context: ServiceContext,
	): Promise<T>;

	/**
	 * Delete item
	 */
	abstract delete(id: string, context: ServiceContext): Promise<void>;
}
