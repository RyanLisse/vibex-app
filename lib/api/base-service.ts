/**
 * Base API Service Class
 *
 * Provides common functionality for all API service classes
 * Includes tracing, error handling, and database query helpers
 */

export interface ServiceContext {
	userId?: string;
	sessionId?: string;
	requestId?: string;
	traceId?: string;
	metadata?: Record<string, any>;
}

export interface ServiceOptions {
	timeout?: number;
	retries?: number;
	cache?: boolean;
}

export abstract class BaseService {
	protected serviceName: string;

	constructor(serviceName: string) {
		this.serviceName = serviceName;
	}

	/**
	 * Execute operation with tracing
	 */
	protected async executeWithTracing<T>(
		operationName: string,
		context: ServiceContext,
		operation: (span?: any) => Promise<T>
	): Promise<T> {
		try {
			return await operation();
		} catch (error) {
			console.error(`Error in ${this.serviceName}.${operationName}:`, error);
			throw error;
		}
	}

	/**
	 * Execute database operation with error handling
	 */
	protected async executeDatabase<T>(
		operationName: string,
		operation: () => Promise<T>
	): Promise<T> {
		try {
			return await operation();
		} catch (error) {
			console.error(`Database error in ${this.serviceName}.${operationName}:`, error);
			throw error;
		}
	}

	/**
	 * Log operation for observability
	 */
	protected async logOperation(
		operation: string,
		resourceType: string,
		resourceId: string,
		userId: string,
		metadata?: Record<string, any>
	): Promise<void> {
		console.log(`${this.serviceName}: ${operation}`, {
			resourceType,
			resourceId,
			userId,
			metadata,
			timestamp: new Date().toISOString(),
		});
	}
}

export abstract class BaseCRUDService<T = any> extends BaseService {
	abstract findById(id: string): Promise<T | null>;
	abstract findAll(filters?: any): Promise<T[]>;
	abstract create(data: Partial<T>): Promise<T>;
	abstract update(id: string, data: Partial<T>): Promise<T>;
	abstract delete(id: string): Promise<void>;
}

export class DatabaseError extends Error {
	constructor(
		message: string,
		public cause?: Error
	) {
		super(message);
		this.name = "DatabaseError";
	}
}

export class NotFoundError extends Error {
	constructor(resource: string, id: string) {
		super(`${resource} with id ${id} not found`);
		this.name = "NotFoundError";
	}
}

export class ValidationError extends Error {
	constructor(
		message: string,
		public field?: string
	) {
		super(message);
		this.name = "ValidationError";
	}
}
