/**
 * Base API Service Infrastructure
 *
 * Provides a base class for all API services with automatic tracing,
 * error handling, and observability integration.
 */

export interface ServiceContext {
	userId?: string;
	sessionId?: string;
	requestId?: string;
	timestamp?: Date;
}

export class BaseAPIService {
	protected context: ServiceContext;
	protected static serviceName: string = "base-service";

	constructor(context: ServiceContext = {}) {
		this.context = {
			...context,
			timestamp: context.timestamp || new Date(),
		};
	}

	// Static methods for service-level operations
	protected static async withTracing<T>(
		operation: string,
		fn: () => Promise<T>,
		metadata?: Record<string, any>
	): Promise<T> {
		console.log(`[${this.serviceName}] Starting ${operation}`, metadata);
		try {
			const result = await fn();
			console.log(`[${this.serviceName}] Completed ${operation}`);
			return result;
		} catch (error) {
			console.error(`[${this.serviceName}] Failed ${operation}`, error);
			throw error;
		}
	}

	protected static async withTransaction<T>(fn: (tx: any) => Promise<T>): Promise<T> {
		// For now, just use the db instance directly
		// In a real implementation, this would start a transaction
		const { db } = await import("@/db/config");
		return await fn(db);
	}

	protected static async logOperation(
		operation: string,
		resourceType: string,
		resourceId: string | null,
		userId?: string,
		metadata?: Record<string, any>
	): Promise<void> {
		console.log(`[${this.serviceName}] Operation: ${operation}`, {
			resourceType,
			resourceId,
			userId,
			metadata,
			timestamp: new Date().toISOString()
		});
	}

	protected log(level: "info" | "warn" | "error", message: string, data?: any) {
		const logData = {
			...data,
			context: this.context,
			timestamp: new Date().toISOString(),
		};

		console[level](`[${this.constructor.name}] ${message}`, logData);
	}

	protected async handleError(
		error: unknown,
		operation: string,
	): Promise<never> {
		this.log("error", `Error in ${operation}`, { error });

		if (error instanceof Error) {
			throw error;
		}

		throw new Error(`Unknown error in ${operation}: ${String(error)}`);
	}

	protected async executeWithTracing<T>(
		operation: string,
		context: ServiceContext,
		fn: (span?: any) => Promise<T>,
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

	protected async recordEvent(
		eventType: string,
		message: string,
		data?: any,
	): Promise<void> {
		this.log("info", `Event: ${eventType} - ${message}`, data);
	}

	protected async executeDatabase<T>(
		operation: string,
		fn: () => Promise<T>,
	): Promise<T> {
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

/**
 * Base CRUD Service with standard operations
 */
export abstract class BaseCRUDService<T = any> extends BaseAPIService {
	abstract findById(id: string): Promise<T | null>;
	abstract findAll(filters?: any): Promise<T[]>;
	abstract create(data: Partial<T>): Promise<T>;
	abstract update(id: string, data: Partial<T>): Promise<T>;
	abstract delete(id: string): Promise<void>;

	protected async validateExists(id: string, resource: string): Promise<T> {
		const item = await this.findById(id);
		if (!item) {
			throw new Error(`${resource} with id ${id} not found`);
		}
		return item;
	}
}
