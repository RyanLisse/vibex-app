/**
 * Base API Service Classes and Types
 *
 * Provides common functionality for API services
 */

export interface ServiceContext {
	userId?: string;
	sessionId?: string;
	requestId?: string;
	timestamp?: Date;
}

export class BaseAPIService {
	protected context: ServiceContext;

	constructor(context: ServiceContext = {}) {
		this.context = {
			...context,
			timestamp: context.timestamp || new Date(),
		};
	}

	protected log(level: "info" | "warn" | "error", message: string, data?: any) {
		const logData = {
			...data,
			context: this.context,
			timestamp: new Date().toISOString(),
		};

		console[level](`[${this.constructor.name}] ${message}`, logData);
	}

	protected async handleError(error: unknown, operation: string): Promise<never> {
		this.log("error", `Error in ${operation}`, { error });

		if (error instanceof Error) {
			throw error;
		}

		throw new Error(`Unknown error in ${operation}: ${String(error)}`);
	}

	protected async executeWithTracing<T>(
		operation: string,
		context: ServiceContext,
		fn: (span?: any) => Promise<T>
	): Promise<T> {
		this.log("info", `Starting ${operation}`, { context });

		try {
			const result = await fn();
			this.log("info", `Completed ${operation}`, { context });
			return result;
		} catch (error) {
			this.log("error", `Failed ${operation}`, { error, context });
			throw error;
		}
	}

	protected async recordEvent(eventType: string, message: string, data?: any): Promise<void> {
		this.log("info", `Event: ${eventType} - ${message}`, data);
	}

	protected async executeDatabase<T>(operation: string, fn: () => Promise<T>): Promise<T> {
		this.log("info", `Database operation: ${operation}`);

		try {
			const result = await fn();
			this.log("info", `Database operation completed: ${operation}`);
			return result;
		} catch (error) {
			this.log("error", `Database operation failed: ${operation}`, { error });
			throw error;
		}
	}
}

export class NotFoundError extends Error {
	constructor(resource: string, identifier?: string) {
		super(`${resource}${identifier ? ` with identifier '${identifier}'` : ""} not found`);
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

export class UnauthorizedError extends Error {
	constructor(message: string = "Unauthorized") {
		super(message);
		this.name = "UnauthorizedError";
	}
}

export class ForbiddenError extends Error {
	constructor(message: string = "Forbidden") {
		super(message);
		this.name = "ForbiddenError";
	}
}

export class ExternalServiceError extends Error {
	constructor(
		service: string,
		message: string,
		public statusCode?: number
	) {
		super(`External service error from ${service}: ${message}`);
		this.name = "ExternalServiceError";
	}
}

export class RateLimitError extends Error {
	constructor(service: string, retryAfter?: number) {
		super(
			`Rate limit exceeded for ${service}${retryAfter ? `. Retry after ${retryAfter} seconds` : ""}`
		);
		this.name = "RateLimitError";
	}
}

export class ConflictError extends Error {
	constructor(message: string = "Conflict") {
		super(message);
		this.name = "ConflictError";
	}
}

export class DatabaseError extends Error {
	constructor(
		message: string,
		public originalError?: Error
	) {
		super(message);
		this.name = "DatabaseError";
	}
}

export class BaseCRUDService<
	T = any,
	CreateT = Partial<T>,
	UpdateT = Partial<T>,
> extends BaseAPIService {
	protected tableName: string;

	constructor(
		options: { tableName?: string; serviceName?: string } = {},
		context: ServiceContext = {}
	) {
		super(context);
		this.tableName = options.tableName || options.serviceName || "unknown";
	}

	// Stub CRUD methods for build purposes
	async create(data: CreateT): Promise<T> {
		this.log("info", `Creating ${this.tableName}`, { data });
		return { id: "stub-id", ...data } as T;
	}

	async findById(id: string): Promise<T | null> {
		this.log("info", `Finding ${this.tableName} by ID`, { id });
		return null;
	}

	async findMany(filters?: any): Promise<T[]> {
		this.log("info", `Finding many ${this.tableName}`, { filters });
		return [];
	}

	async findAll(filters?: any): Promise<T[]> {
		return this.findMany(filters);
	}

	async update(id: string, data: UpdateT): Promise<T> {
		this.log("info", `Updating ${this.tableName}`, { id, data });
		return { id, ...data } as T;
	}

	async delete(id: string): Promise<void> {
		this.log("info", `Deleting ${this.tableName}`, { id });
	}
}
