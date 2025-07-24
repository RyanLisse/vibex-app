import { z } from "zod";

// Comprehensive Zod schema for all environment variables
export const EnvSchema = z.object({
	// Node Environment
	NODE_ENV: z.enum(["development", "production", "test"]).default("development"),

	// Letta API Configuration
	LETTA_API_KEY: z.string().min(1, "Letta API key is required"),
	LETTA_BASE_URL: z.string().url().default("https://api.letta.com"),
	LETTA_PROJECT_ID: z.string().min(1, "Letta project ID is required"),

	// OpenAI Configuration
	OPENAI_API_KEY: z.string().min(1, "OpenAI API key is required"),
	NEXT_PUBLIC_OPENAI_API_KEY: z.string().optional(),

	// Google AI Configuration
	GOOGLE_AI_API_KEY: z.string().min(1, "Google AI API key is required"),

	// Anthropic Configuration
	ANTHROPIC_API_KEY: z.string().optional(),

	// Database Configuration
	DATABASE_URL: z.string().url("Valid database URL is required"),

	// ElectricSQL Configuration
	ELECTRIC_URL: z.string().url("Valid Electric URL is required"),
	ELECTRIC_WEBSOCKET_URL: z.string().url().default("ws://localhost:5133"),
	ELECTRIC_AUTH_TOKEN: z.string().min(1, "Electric auth token is required"),
	ELECTRIC_AUTH_ENDPOINT: z.string().default("/api/auth/electric"),
	ELECTRIC_USER_ID: z.string().min(1, "Electric user ID is required"),
	ELECTRIC_API_KEY: z.string().min(1, "Electric API key is required"),
	ELECTRIC_API_KEYS: z.string().optional(),
	ELECTRIC_ADMIN_USERS: z.string().optional(),

	// ElectricSQL Sync Configuration
	ELECTRIC_SYNC_INTERVAL: z
		.string()
		.transform((val) => Number.parseInt(val, 10))
		.pipe(z.number().min(100))
		.default("1000"),
	ELECTRIC_MAX_RETRIES: z
		.string()
		.transform((val) => Number.parseInt(val, 10))
		.pipe(z.number().min(1))
		.default("3"),
	ELECTRIC_RETRY_BACKOFF: z
		.string()
		.transform((val) => Number.parseInt(val, 10))
		.pipe(z.number().min(100))
		.default("1000"),
	ELECTRIC_MAX_QUEUE_SIZE: z
		.string()
		.transform((val) => Number.parseInt(val, 10))
		.pipe(z.number().min(100))
		.default("1000"),
	ELECTRIC_CONNECTION_TIMEOUT: z
		.string()
		.transform((val) => Number.parseInt(val, 10))
		.pipe(z.number().min(1000))
		.default("10000"),
	ELECTRIC_HEARTBEAT_INTERVAL: z
		.string()
		.transform((val) => Number.parseInt(val, 10))
		.pipe(z.number().min(5000))
		.default("30000"),

	// ElectricSQL Local Database
	ELECTRIC_LOCAL_DB_PATH: z.string().default("idb://electric-local"),

	// Authentication
	AUTH_SECRET: z.string().min(32, "Auth secret must be at least 32 characters"),
	NEXTAUTH_SECRET: z.string().optional(),
	JWT_SECRET: z.string().optional(),
	JWT_EXPIRES_IN: z.string().default("24h"),

	// Redis Configuration
	REDIS_URL: z.string().url().optional(),
	REDIS_PASSWORD: z.string().optional(),
	REDIS_HOST: z.string().optional(),
	REDIS_PORT: z
		.string()
		.transform((val) => Number.parseInt(val || "6379", 10))
		.pipe(z.number().min(1))
		.optional(),
	REDIS_DB: z
		.string()
		.transform((val) => Number.parseInt(val || "0", 10))
		.pipe(z.number().min(0))
		.optional(),

	// Service Information
	SERVICE_NAME: z.string().default("vibex"),
	SERVICE_VERSION: z.string().default("1.0.0"),

	// Logging Configuration
	LOGGING_LEVEL: z.enum(["error", "warn", "info", "debug", "trace"]).default("info"),

	// Console Logging
	LOGGING_CONSOLE_ENABLED: z
		.string()
		.transform((val) => val === "true")
		.pipe(z.boolean())
		.default("true"),
	LOGGING_CONSOLE_LEVEL: z.enum(["error", "warn", "info", "debug", "trace"]).default("debug"),

	// File Logging
	LOGGING_FILE_ENABLED: z
		.string()
		.transform((val) => val === "true")
		.pipe(z.boolean())
		.default("true"),
	LOGGING_FILE_PATH: z.string().default("logs/app.log"),
	LOGGING_ERROR_FILE_PATH: z.string().default("logs/error.log"),
	LOGGING_FILE_MAX_SIZE: z
		.string()
		.transform((val) => Number.parseInt(val, 10))
		.pipe(z.number().min(1024))
		.default("10485760"),
	LOGGING_FILE_MAX_FILES: z
		.string()
		.transform((val) => Number.parseInt(val, 10))
		.pipe(z.number().min(1))
		.default("5"),
	LOGGING_FILE_LEVEL: z.enum(["error", "warn", "info", "debug", "trace"]).default("info"),

	// HTTP Logging
	LOGGING_HTTP_ENABLED: z
		.string()
		.transform((val) => val === "true")
		.pipe(z.boolean())
		.default("false"),
	LOGGING_HTTP_HOST: z.string().optional(),
	LOGGING_HTTP_PORT: z
		.string()
		.transform((val) => Number.parseInt(val || "80", 10))
		.pipe(z.number().min(1))
		.optional(),
	LOGGING_HTTP_PATH: z.string().default("/logs"),
	LOGGING_HTTP_SSL: z
		.string()
		.transform((val) => val === "true")
		.pipe(z.boolean())
		.default("false"),
	LOGGING_HTTP_LEVEL: z.enum(["error", "warn", "info", "debug", "trace"]).default("warn"),

	// Performance and Sampling
	LOGGING_SAMPLING_ENABLED: z
		.string()
		.transform((val) => val === "true")
		.pipe(z.boolean())
		.default("false"),
	LOGGING_SAMPLING_RATE: z
		.string()
		.transform((val) => Number.parseFloat(val))
		.pipe(z.number().min(0).max(1))
		.default("0.1"),
	LOGGING_HIGH_VOLUME_THRESHOLD: z
		.string()
		.transform((val) => Number.parseInt(val, 10))
		.pipe(z.number().min(100))
		.default("1000"),
	LOGGING_TRACK_OPERATIONS: z
		.string()
		.transform((val) => val === "true")
		.pipe(z.boolean())
		.default("true"),
	LOGGING_SLOW_THRESHOLD: z
		.string()
		.transform((val) => Number.parseInt(val, 10))
		.pipe(z.number().min(100))
		.default("1000"),

	// Security and Redaction
	LOGGING_REDACTION_ENABLED: z
		.string()
		.transform((val) => val === "true")
		.pipe(z.boolean())
		.default("true"),
	LOGGING_REDACTION_FIELDS: z.string().optional(),

	// Sentry Configuration
	SENTRY_DSN: z.string().url().optional(),
	NEXT_PUBLIC_SENTRY_DSN: z.string().url().optional(),
	SENTRY_ORG: z.string().optional(),
	SENTRY_PROJECT: z.string().optional(),
	SENTRY_AUTH_TOKEN: z.string().optional(),

	// Telemetry
	TELEMETRY_ENABLED: z
		.string()
		.transform((val) => val === "true")
		.pipe(z.boolean())
		.default("true"),
	TELEMETRY_BACKEND: z
		.enum(["jaeger", "zipkin", "datadog", "newrelic", "honeycomb"])
		.default("jaeger"),
	TELEMETRY_SAMPLING_RATIO: z
		.string()
		.transform((val) => Number.parseFloat(val))
		.pipe(z.number().min(0).max(1))
		.default("0.1"),
	TELEMETRY_JAEGER_ENDPOINT: z.string().url().default("http://localhost:14268/api/traces"),
	TELEMETRY_ZIPKIN_ENDPOINT: z.string().url().default("http://localhost:9411/api/v2/spans"),
	TELEMETRY_DATADOG_API_KEY: z.string().optional(),
	TELEMETRY_NEWRELIC_API_KEY: z.string().optional(),
	TELEMETRY_HONEYCOMB_API_KEY: z.string().optional(),
	TELEMETRY_HONEYCOMB_DATASET: z.string().optional(),

	// Alert System Configuration
	ALERTS_ENABLED: z
		.string()
		.transform((val) => val === "true")
		.pipe(z.boolean())
		.default("true"),
	ALERTS_MAX_PER_HOUR: z
		.string()
		.transform((val) => Number.parseInt(val, 10))
		.pipe(z.number().min(1))
		.default("10"),
	ALERTS_COOLDOWN_MINUTES: z
		.string()
		.transform((val) => Number.parseInt(val, 10))
		.pipe(z.number().min(1))
		.default("15"),
	ALERTS_DEDUPLICATION_ENABLED: z
		.string()
		.transform((val) => val === "true")
		.pipe(z.boolean())
		.default("true"),
	ALERTS_DEDUPLICATION_WINDOW: z
		.string()
		.transform((val) => Number.parseInt(val, 10))
		.pipe(z.number().min(1))
		.default("60"),
	ALERTS_ESCALATION_ENABLED: z
		.string()
		.transform((val) => val === "true")
		.pipe(z.boolean())
		.default("false"),
	ALERTS_ESCALATION_AFTER_MINUTES: z
		.string()
		.transform((val) => Number.parseInt(val, 10))
		.pipe(z.number().min(1))
		.default("30"),

	// Webhook Alerts
	ALERTS_WEBHOOK_URL: z.string().url().optional(),
	ALERTS_WEBHOOK_TOKEN: z.string().optional(),

	// Slack Alerts
	ALERTS_SLACK_WEBHOOK_URL: z.string().url().optional(),
	ALERTS_SLACK_BOT_TOKEN: z.string().optional(),
	ALERTS_SLACK_CHANNEL: z.string().default("#alerts"),
	ALERTS_SLACK_MENTION_CHANNEL: z
		.string()
		.transform((val) => val === "true")
		.pipe(z.boolean())
		.default("false"),
	ALERTS_SLACK_MENTION_USERS: z.string().optional(),

	// Email Alerts
	ALERTS_EMAIL_PROVIDER: z.enum(["smtp", "sendgrid", "ses"]).default("smtp"),
	ALERTS_EMAIL_FROM: z.string().email().optional(),
	ALERTS_EMAIL_TO: z.string().optional(),
	ALERTS_EMAIL_CC: z.string().optional(),
	ALERTS_EMAIL_API_KEY: z.string().optional(),
	ALERTS_EMAIL_REGION: z.string().default("us-east-1"),

	// SMTP Configuration
	ALERTS_SMTP_HOST: z.string().optional(),
	ALERTS_SMTP_PORT: z
		.string()
		.transform((val) => Number.parseInt(val || "587", 10))
		.pipe(z.number().min(1))
		.optional(),
	ALERTS_SMTP_SECURE: z
		.string()
		.transform((val) => val === "true")
		.pipe(z.boolean())
		.default("false"),
	ALERTS_SMTP_USERNAME: z.string().optional(),
	ALERTS_SMTP_PASSWORD: z.string().optional(),
});

export type Env = z.infer<typeof EnvSchema>;

/**
 * Validates environment variables using the comprehensive schema
 * @returns Validated environment configuration
 * @throws Error if validation fails with detailed error messages
 */
export function validateEnv(): Env {
	try {
		const parsed = EnvSchema.parse(process.env);

		// Additional runtime validations
		validateCriticalServices(parsed);
		validateSecurityRequirements(parsed);

		return parsed;
	} catch (error) {
		if (error instanceof z.ZodError) {
			const errorMessages = error.issues
				.map((err) => `${err.path.join(".")}: ${err.message}`)
				.join("\n");

			throw new Error(`Environment validation failed:\n${errorMessages}`);
		}
		throw error;
	}
}

/**
 * Validates that critical services have proper configuration
 */
function validateCriticalServices(env: Env): void {
	const errors: string[] = [];

	// Database connectivity validation
	if (!env.DATABASE_URL && !env.ELECTRIC_URL) {
		errors.push("Either DATABASE_URL or ELECTRIC_URL must be provided");
	}

	// API key validation for core services
	if (!env.LETTA_API_KEY) {
		errors.push("LETTA_API_KEY is required for core functionality");
	}

	if (!env.OPENAI_API_KEY) {
		errors.push("OPENAI_API_KEY is required for AI features");
	}

	// Authentication validation
	if (env.NODE_ENV === "production" && env.AUTH_SECRET.length < 32) {
		errors.push("AUTH_SECRET must be at least 32 characters in production");
	}

	if (errors.length > 0) {
		throw new Error(`Critical service validation failed:\n${errors.join("\n")}`);
	}
}

/**
 * Validates security-related configuration requirements
 */
function validateSecurityRequirements(env: Env): void {
	const errors: string[] = [];

	// Production security checks
	if (env.NODE_ENV === "production") {
		// Ensure secure logging in production
		if (env.LOGGING_REDACTION_ENABLED === false) {
			errors.push("Logging redaction must be enabled in production");
		}

		// Ensure proper telemetry sampling
		if (env.TELEMETRY_SAMPLING_RATIO > 0.5) {
			errors.push("Telemetry sampling ratio should be d 0.5 in production for performance");
		}

		// Validate alert configuration
		if (
			env.ALERTS_ENABLED &&
			!env.ALERTS_WEBHOOK_URL &&
			!env.ALERTS_SLACK_WEBHOOK_URL &&
			!env.ALERTS_EMAIL_FROM
		) {
			errors.push(
				"At least one alert channel (webhook, Slack, or email) must be configured in production"
			);
		}
	}

	if (errors.length > 0) {
		throw new Error(`Security validation failed:\n${errors.join("\n")}`);
	}
}

/**
 * Environment-specific validation functions
 */
export function validateDevelopmentEnv(): Env {
	const env = validateEnv();

	if (env.NODE_ENV !== "development") {
		throw new Error("Development environment validation called but NODE_ENV is not 'development'");
	}

	return env;
}

export function validateProductionEnv(): Env {
	const env = validateEnv();

	if (env.NODE_ENV !== "production") {
		throw new Error("Production environment validation called but NODE_ENV is not 'production'");
	}

	// Additional production-specific validations
	const productionErrors: string[] = [];

	if (!env.SENTRY_DSN) {
		productionErrors.push("Sentry DSN is highly recommended for production error tracking");
	}

	if (env.LOGGING_LEVEL === "debug" || env.LOGGING_LEVEL === "trace") {
		productionErrors.push("Logging level should not be debug/trace in production for performance");
	}

	if (productionErrors.length > 0) {
		console.warn(`Production environment warnings:\n${productionErrors.join("\n")}`);
	}

	return env;
}

export function validateTestEnv(): Env {
	const env = validateEnv();

	if (env.NODE_ENV !== "test") {
		throw new Error("Test environment validation called but NODE_ENV is not 'test'");
	}

	return env;
}

/**
 * Utility to get a summary of current environment configuration
 */
export function getEnvSummary(): {
	environment: string;
	configuredServices: string[];
	missingOptionalServices: string[];
	securityStatus: string;
} {
	try {
		const env = validateEnv();

		const configuredServices: string[] = [];
		const missingOptionalServices: string[] = [];

		// Check service availability
		if (env.LETTA_API_KEY) configuredServices.push("Letta AI");
		if (env.OPENAI_API_KEY) configuredServices.push("OpenAI");
		if (env.GOOGLE_AI_API_KEY) configuredServices.push("Google AI");
		if (env.ANTHROPIC_API_KEY) configuredServices.push("Anthropic");
		else missingOptionalServices.push("Anthropic");

		if (env.DATABASE_URL) configuredServices.push("Database");
		if (env.ELECTRIC_URL) configuredServices.push("ElectricSQL");
		if (env.REDIS_URL) configuredServices.push("Redis");
		else missingOptionalServices.push("Redis");

		if (env.SENTRY_DSN) configuredServices.push("Sentry");
		else missingOptionalServices.push("Sentry");

		// Security status
		const securityFeatures: string[] = [];
		if (env.LOGGING_REDACTION_ENABLED) securityFeatures.push("log redaction");
		if (env.ALERTS_ENABLED) securityFeatures.push("alerting");
		if (env.TELEMETRY_ENABLED) securityFeatures.push("telemetry");

		const securityStatus =
			securityFeatures.length > 0
				? `Enabled: ${securityFeatures.join(", ")}`
				: "Basic security only";

		return {
			environment: env.NODE_ENV,
			configuredServices,
			missingOptionalServices,
			securityStatus,
		};
	} catch (error) {
		return {
			environment: "unknown",
			configuredServices: [],
			missingOptionalServices: ["All services (validation failed)"],
			securityStatus: `Validation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
		};
	}
}
