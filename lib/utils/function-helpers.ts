/**
 * Function helper utilities to reduce parameter complexity
 * Eliminates code smell of functions with too many parameters
 */

/**
 * Configuration object pattern for functions with many parameters
 */
export interface BaseConfig {
	id: string;
	name?: string;
	type?: string;
}

export interface AgentOperationConfig extends BaseConfig {
	agentType: string;
	operation: string;
	provider: string;
	status: string;
}

export interface AgentExecutionConfig extends BaseConfig {
	agentType: string;
	taskType: string;
	provider: string;
	duration: number;
}

export interface TokenUsageConfig extends BaseConfig {
	agentType: string;
	provider: string;
	tokenType: string;
	count: number;
}

export interface HttpRequestConfig {
	method: string;
	route: string;
	statusCode: number;
	duration: number;
}

export interface DatabaseConfig {
	database: string;
	pool: string;
	count?: number;
	operation?: string;
	table?: string;
	duration?: number;
}

/**
 * Builder pattern for complex configurations
 */
export class ConfigBuilder<T extends BaseConfig> {
	private config: Partial<T> = {};

	constructor(id: string) {
		this.config.id = id;
	}

	withName(name: string) {
		this.config.name = name;
		return this;
	}

	withType(type: string) {
		this.config.type = type;
		return this;
	}

	withProperty<K extends keyof T>(key: K, value: T[K]) {
		this.config[key] = value;
		return this;
	}

	build(): T {
		return this.config as T;
	}
}

/**
 * Utility to merge default configurations
 */
export const mergeConfigs = <T extends Record<string, any>>(
	defaultConfig: T,
	userConfig: Partial<T>
): T => {
	return { ...defaultConfig, ...userConfig };
};

/**
 * Utility to validate required configuration fields
 */
export const validateConfig = <T extends Record<string, any>>(
	config: T,
	requiredFields: (keyof T)[]
): { isValid: boolean; missingFields: string[] } => {
	const missingFields = requiredFields.filter(
		(field) => config[field] === undefined || config[field] === null
	) as string[];

	return {
		isValid: missingFields.length === 0,
		missingFields,
	};
};

/**
 * Utility to create typed configuration objects
 */
export const createConfig = <T extends BaseConfig>(
	type: new () => T,
	id: string,
	overrides: Partial<T> = {}
): T => {
	const instance = new type();
	return Object.assign(instance, { id, ...overrides });
};

/**
 * Standardized error configuration
 */
export interface ErrorConfig {
	message: string;
	code?: string;
	statusCode?: number;
	context?: Record<string, any>;
}

/**
 * Standardized success response configuration
 */
export interface SuccessConfig<T = any> {
	data: T;
	message?: string;
	metadata?: Record<string, any>;
}

/**
 * Generic result type to reduce parameter complexity
 */
export type Result<T = any, E = ErrorConfig> =
	| ({ success: true } & SuccessConfig<T>)
	| { success: false; error: E };

/**
 * Utility to create result objects
 */
export const createResult = {
	success: <T>(data: T, message?: string, metadata?: Record<string, any>): Result<T> => ({
		success: true,
		data,
		message,
		metadata,
	}),

	error: <E = ErrorConfig>(error: E): Result<never, E> => ({
		success: false,
		error,
	}),
};

/**
 * Utility to handle async operations with standardized error handling
 */
export const safeAsync = async <T>(
	operation: () => Promise<T>,
	errorHandler?: (error: any) => ErrorConfig
): Promise<Result<T>> => {
	try {
		const data = await operation();
		return createResult.success(data);
	} catch (error: any) {
		const errorConfig = errorHandler
			? errorHandler(error)
			: {
					message: error.message || "Unknown error",
					code: error.code,
					statusCode: error.statusCode,
				};
		return createResult.error(errorConfig);
	}
};
