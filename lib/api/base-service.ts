/**
 * Base API Service Class
 *
 * Provides common functionality for all API service classes
 * Includes tracing, error handling, and database query helpers
 */

import { SpanStatusCode, trace } from "@opentelemetry/api";
import { db } from "@/db/config";
import { observability } from "@/lib/observability";
import { BaseAPIError } from "./base-error";

export interface PaginationParams {
	page: number;
	limit: number;
}

export interface PaginationResult<T> {
	data: T[];
	pagination: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
		hasMore: boolean;
	};
}

export abstract class BaseAPIService {
	protected static serviceName: string;

	/**
	 * Get tracer for this service
	 */
	protected static getTracer() {
		return trace.getTracer(BaseAPIService.serviceName || BaseAPIService.name);
	}

	/**
	 * Execute an operation with OpenTelemetry tracing
	 */
	protected static async withTracing<T>(
		operationName: string,
		operation: () => Promise<T>,
		attributes?: Record<string, any>,
	): Promise<T> {
		const tracer = BaseAPIService.getTracer();
		const span = tracer.startSpan(
			`${BaseAPIService.serviceName}.${operationName}`,
		);
		const startTime = Date.now();

		if (attributes) {
			span.setAttributes(attributes);
		}

		try {
			const result = await operation();
			const duration = Date.now() - startTime;

			span.setAttributes({
				"operation.duration": duration,
				"operation.success": true,
			});

			// Record metrics
			observability.metrics.queryDuration(duration, operationName, true);

			return result;
		} catch (error) {
			const duration = Date.now() - startTime;

			span.recordException(error as Error);
			span.setStatus({
				code: SpanStatusCode.ERROR,
				message: (error as Error).message,
			});

			// Record error metrics
			observability.metrics.queryDuration(duration, operationName, false);
			observability.metrics.errorRate(1, BaseAPIService.serviceName);

			throw error;
		} finally {
			span.end();
		}
	}

	/**
	 * Build pagination query parameters
	 */
	protected static buildPaginationQuery(params: PaginationParams) {
		const limit = Math.min(params.limit, 100); // Max 100 items per page
		const offset = (params.page - 1) * limit;

		return { limit, offset };
	}

	/**
	 * Create paginated result
	 */
	protected static createPaginatedResult<T>(
		data: T[],
		total: number,
		params: PaginationParams,
	): PaginationResult<T> {
		const totalPages = Math.ceil(total / params.limit);
		const hasMore = params.page < totalPages;

		return {
			data,
			pagination: {
				page: params.page,
				limit: params.limit,
				total,
				totalPages,
				hasMore,
			},
		};
	}

	/**
	 * Execute a database transaction with proper error handling
	 */
	protected static async withTransaction<T>(
		operation: (tx: typeof db) => Promise<T>,
	): Promise<T> {
		return BaseAPIService.withTracing("transaction", async () => {
			try {
				return await db.transaction(async (tx) => {
					return await operation(tx);
				});
			} catch (error) {
				// Handle database-specific errors
				if (error instanceof Error) {
					if (error.message.includes("duplicate key")) {
						throw new BaseAPIError(
							"Resource already exists",
							409,
							"DUPLICATE_KEY",
						);
					}
					if (error.message.includes("foreign key")) {
						throw new BaseAPIError(
							"Related resource not found",
							400,
							"FOREIGN_KEY_VIOLATION",
						);
					}
				}
				throw error;
			}
		});
	}

	/**
	 * Log operation for audit trail
	 */
	protected static async logOperation(
		operation: string,
		resourceType: string,
		resourceId: string,
		userId?: string,
		metadata?: any,
	) {
		try {
			await observability.events.collector.collectEvent(
				operation,
				"info",
				`${operation} ${resourceType} ${resourceId}`,
				{
					resourceType,
					resourceId,
					userId,
					...metadata,
				},
			);
		} catch (error) {
			// Don't fail the operation if logging fails
			console.error("Failed to log operation:", error);
		}
	}
}
