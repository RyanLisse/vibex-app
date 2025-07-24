/**
 * Logging Configuration
 *
 * Provides configuration management for the logging system including
 * validation, defaults, and environment-specific settings.
 */

import { z } from "zod";
import type { LoggingConfig, LogLevel } from "./types";

// Validation schemas
const LogLevelSchema = z.enum(["error", "warn", "info", "debug", "trace"]);

const ConsoleConfigSchema = z.object({
	enabled: z.boolean().default(true),
	level: LogLevelSchema.optional(),
	colorize: z.boolean().default(true),
});

const FileConfigSchema = z.object({
	enabled: z.boolean().default(false),
	level: LogLevelSchema.optional(),
	filename: z.string().default("logs/app.log"),
	errorFilename: z.string().default("logs/error.log"),
	maxSize: z.string().default("20m"),
	maxFiles: z.string().default("14d"),
	datePattern: z.string().default("YYYY-MM-DD"),
});

const HttpConfigSchema = z.object({
	enabled: z.boolean().default(false),
	level: LogLevelSchema.optional(),
	host: z.string().optional(),
	port: z.number().default(80),
	path: z.string().default("/logs"),
	ssl: z.boolean().default(false),
	auth: z
		.object({
			username: z.string().optional(),
			password: z.string().optional(),
		})
		.optional(),
});

const SamplingConfigSchema = z.object({
	enabled: z.boolean().default(false),
	rate: z.number().min(0).max(1).default(1.0),
	excludeLevels: z.array(LogLevelSchema).default([]),
});

const RedactionConfigSchema = z.object({
	enabled: z.boolean().default(true),
	patterns: z
		.array(z.string())
		.default(["password", "token", "secret", "key", "authorization", "cookie", "session"]),
	replacement: z.string().default("***REDACTED***"),
});

const PerformanceConfigSchema = z.object({
	enabled: z.boolean().default(true),
	trackOperations: z.boolean().default(true),
	trackErrors: z.boolean().default(true),
	slowOperationThreshold: z.number().default(1000), // ms
});

const LoggingConfigSchema = z.object({
	level: LogLevelSchema.default("info"),
	serviceName: z.string().default("vibex-app"),
	serviceVersion: z.string().default("1.0.0"),
	environment: z.string().default("development"),
	silent: z.boolean().default(false),
	console: ConsoleConfigSchema.default({}),
	file: FileConfigSchema.default({}),
	http: HttpConfigSchema.default({}),
	sampling: SamplingConfigSchema.default({}),
	redaction: RedactionConfigSchema.default({}),
	performance: PerformanceConfigSchema.default({}),
});

/**
 * Create default logging configuration
 */
export function createDefaultLoggingConfig(): LoggingConfig {
	const nodeEnv = process.env.NODE_ENV || "development";
	const isProduction = nodeEnv === "production";
	const isTest = nodeEnv === "test";

	const baseConfig = {
		level: (process.env.LOG_LEVEL as LogLevel) || (isProduction ? "info" : "debug"),
		serviceName: process.env.SERVICE_NAME || "vibex-app",
		serviceVersion: process.env.SERVICE_VERSION || "1.0.0",
		environment: nodeEnv,
		silent: isTest,
		console: {
			enabled: !isTest,
			level: (process.env.CONSOLE_LOG_LEVEL as LogLevel) || undefined,
			colorize: !isProduction,
		},
		file: {
			enabled: isProduction || process.env.ENABLE_FILE_LOGGING === "true",
			level: (process.env.FILE_LOG_LEVEL as LogLevel) || undefined,
			filename: process.env.LOG_FILE || "logs/app.log",
			errorFilename: process.env.ERROR_LOG_FILE || "logs/error.log",
			maxSize: process.env.LOG_MAX_SIZE || "20m",
			maxFiles: process.env.LOG_MAX_FILES || "14d",
			datePattern: process.env.LOG_DATE_PATTERN || "YYYY-MM-DD",
		},
		http: {
			enabled: process.env.ENABLE_HTTP_LOGGING === "true",
			level: (process.env.HTTP_LOG_LEVEL as LogLevel) || undefined,
			host: process.env.LOG_HTTP_HOST,
			port: process.env.LOG_HTTP_PORT ? Number.parseInt(process.env.LOG_HTTP_PORT) : 80,
			path: process.env.LOG_HTTP_PATH || "/logs",
			ssl: process.env.LOG_HTTP_SSL === "true",
			auth: process.env.LOG_HTTP_USERNAME
				? {
						username: process.env.LOG_HTTP_USERNAME,
						password: process.env.LOG_HTTP_PASSWORD,
					}
				: undefined,
		},
		sampling: {
			enabled: process.env.ENABLE_LOG_SAMPLING === "true",
			rate: process.env.LOG_SAMPLING_RATE ? Number.parseFloat(process.env.LOG_SAMPLING_RATE) : 1.0,
			excludeLevels: (process.env.LOG_SAMPLING_EXCLUDE_LEVELS?.split(",") as LogLevel[]) || [],
		},
		redaction: {
			enabled: process.env.DISABLE_LOG_REDACTION !== "true",
			patterns: process.env.LOG_REDACTION_PATTERNS?.split(",") || [
				"password",
				"token",
				"secret",
				"key",
				"authorization",
				"cookie",
				"session",
				"apikey",
				"api_key",
			],
			replacement: process.env.LOG_REDACTION_REPLACEMENT || "***REDACTED***",
		},
		performance: {
			enabled: process.env.DISABLE_PERFORMANCE_LOGGING !== "true",
			trackOperations: process.env.DISABLE_OPERATION_TRACKING !== "true",
			trackErrors: process.env.DISABLE_ERROR_TRACKING !== "true",
			slowOperationThreshold: process.env.SLOW_OPERATION_THRESHOLD
				? Number.parseInt(process.env.SLOW_OPERATION_THRESHOLD)
				: 1000,
		},
	};

	return LoggingConfigSchema.parse(baseConfig);
}

/**
 * Validate logging configuration
 */
export function validateLoggingConfig(config: Partial<LoggingConfig>): LoggingConfig {
	try {
		return LoggingConfigSchema.parse(config);
	} catch (error) {
		if (error instanceof z.ZodError) {
			const issues = error.issues
				.map((issue) => `${issue.path.join(".")}: ${issue.message}`)
				.join(", ");
			throw new Error(`Invalid logging configuration: ${issues}`);
		}
		throw error;
	}
}

/**
 * Create configuration for specific environments
 */
export function createEnvironmentConfig(environment: string): Partial<LoggingConfig> {
	switch (environment) {
		case "production":
			return {
				level: "info",
				console: {
					enabled: false,
					colorize: false,
				},
				file: {
					enabled: true,
					level: "info",
				},
				sampling: {
					enabled: true,
					rate: 0.1, // Sample 10% of logs in production
					excludeLevels: ["error", "warn"], // Always log errors and warnings
				},
				performance: {
					enabled: true,
					slowOperationThreshold: 500,
				},
			};

		case "staging":
			return {
				level: "debug",
				console: {
					enabled: true,
					colorize: false,
				},
				file: {
					enabled: true,
					level: "debug",
				},
				sampling: {
					enabled: true,
					rate: 0.5, // Sample 50% of logs in staging
				},
			};

		case "development":
			return {
				level: "debug",
				console: {
					enabled: true,
					colorize: true,
				},
				file: {
					enabled: false,
				},
				sampling: {
					enabled: false,
				},
			};

		case "test":
			return {
				level: "error",
				silent: true,
				console: {
					enabled: false,
				},
				file: {
					enabled: false,
				},
				performance: {
					enabled: false,
				},
			};

		default:
			return {};
	}
}

/**
 * Merge configurations with precedence
 */
export function mergeConfigs(base: LoggingConfig, override: Partial<LoggingConfig>): LoggingConfig {
	return validateLoggingConfig({
		...base,
		...override,
		console: { ...base.console, ...override.console },
		file: { ...base.file, ...override.file },
		http: { ...base.http, ...override.http },
		sampling: { ...base.sampling, ...override.sampling },
		redaction: { ...base.redaction, ...override.redaction },
		performance: { ...base.performance, ...override.performance },
	});
}

export default {
	createDefaultLoggingConfig,
	validateLoggingConfig,
	createEnvironmentConfig,
	mergeConfigs,
};
