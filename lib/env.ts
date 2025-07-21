import { type Env, validateEnv } from "../src/shared/schemas/validation";

// Validate and get all environment variables with proper typing
let validatedEnv: Env;

try {
	validatedEnv = validateEnv();
	console.log("✅ Environment variables validated successfully");
} catch (error) {
	console.error("❌ Environment validation failed:", error);
	if (process.env.NODE_ENV === "production") {
		process.exit(1);
	}
	// Fallback for development - create minimal config to prevent crashes
	validatedEnv = {
		NODE_ENV: "development",
		OPENAI_API_KEY: process.env.OPENAI_API_KEY || "",
		DATABASE_URL: process.env.DATABASE_URL || "",
		ELECTRIC_URL: process.env.ELECTRIC_URL || "",
		ELECTRIC_AUTH_TOKEN: process.env.ELECTRIC_AUTH_TOKEN || "",
		AUTH_SECRET: process.env.AUTH_SECRET || "",
		LETTA_API_KEY: process.env.LETTA_API_KEY || "",
	} as Env;
}

// Export the validated environment configuration
export const env = validatedEnv;

// Export individual categories for easier access
export const apiKeys = {
	letta: {
		apiKey: env.LETTA_API_KEY,
		baseUrl: env.LETTA_BASE_URL,
		projectId: env.LETTA_PROJECT_ID,
	},
	openai: {
		apiKey: env.OPENAI_API_KEY,
		publicKey: env.NEXT_PUBLIC_OPENAI_API_KEY,
	},
	google: {
		apiKey: env.GOOGLE_AI_API_KEY,
	},
	anthropic: {
		apiKey: env.ANTHROPIC_API_KEY,
	},
} as const;

export const database = {
	url: env.DATABASE_URL,
	electric: {
		url: env.ELECTRIC_URL,
		websocketUrl: env.ELECTRIC_WEBSOCKET_URL,
		authToken: env.ELECTRIC_AUTH_TOKEN,
		authEndpoint: env.ELECTRIC_AUTH_ENDPOINT,
		userId: env.ELECTRIC_USER_ID,
		apiKey: env.ELECTRIC_API_KEY,
		apiKeys: env.ELECTRIC_API_KEYS,
		adminUsers: env.ELECTRIC_ADMIN_USERS,
		localDbPath: env.ELECTRIC_LOCAL_DB_PATH,
		sync: {
			interval: env.ELECTRIC_SYNC_INTERVAL,
			maxRetries: env.ELECTRIC_MAX_RETRIES,
			retryBackoff: env.ELECTRIC_RETRY_BACKOFF,
			maxQueueSize: env.ELECTRIC_MAX_QUEUE_SIZE,
			connectionTimeout: env.ELECTRIC_CONNECTION_TIMEOUT,
			heartbeatInterval: env.ELECTRIC_HEARTBEAT_INTERVAL,
		},
	},
	redis: {
		url: env.REDIS_URL,
		password: env.REDIS_PASSWORD,
		host: env.REDIS_HOST,
		port: env.REDIS_PORT,
		db: env.REDIS_DB,
	},
} as const;

export const auth = {
	secret: env.AUTH_SECRET,
	nextAuthSecret: env.NEXTAUTH_SECRET,
	jwt: {
		secret: env.JWT_SECRET,
		expiresIn: env.JWT_EXPIRES_IN,
	},
} as const;

export const logging = {
	level: env.LOGGING_LEVEL,
	console: {
		enabled: env.LOGGING_CONSOLE_ENABLED,
		level: env.LOGGING_CONSOLE_LEVEL,
	},
	file: {
		enabled: env.LOGGING_FILE_ENABLED,
		path: env.LOGGING_FILE_PATH,
		errorPath: env.LOGGING_ERROR_FILE_PATH,
		maxSize: env.LOGGING_FILE_MAX_SIZE,
		maxFiles: env.LOGGING_FILE_MAX_FILES,
		level: env.LOGGING_FILE_LEVEL,
	},
	http: {
		enabled: env.LOGGING_HTTP_ENABLED,
		host: env.LOGGING_HTTP_HOST,
		port: env.LOGGING_HTTP_PORT,
		path: env.LOGGING_HTTP_PATH,
		ssl: env.LOGGING_HTTP_SSL,
		level: env.LOGGING_HTTP_LEVEL,
	},
	sampling: {
		enabled: env.LOGGING_SAMPLING_ENABLED,
		rate: env.LOGGING_SAMPLING_RATE,
		highVolumeThreshold: env.LOGGING_HIGH_VOLUME_THRESHOLD,
	},
	performance: {
		trackOperations: env.LOGGING_TRACK_OPERATIONS,
		slowThreshold: env.LOGGING_SLOW_THRESHOLD,
	},
	redaction: {
		enabled: env.LOGGING_REDACTION_ENABLED,
		fields: env.LOGGING_REDACTION_FIELDS,
	},
} as const;

export const monitoring = {
	sentry: {
		dsn: env.SENTRY_DSN,
		publicDsn: env.NEXT_PUBLIC_SENTRY_DSN,
		org: env.SENTRY_ORG,
		project: env.SENTRY_PROJECT,
		authToken: env.SENTRY_AUTH_TOKEN,
	},
	telemetry: {
		enabled: env.TELEMETRY_ENABLED,
		backend: env.TELEMETRY_BACKEND,
		samplingRatio: env.TELEMETRY_SAMPLING_RATIO,
		endpoints: {
			jaeger: env.TELEMETRY_JAEGER_ENDPOINT,
			zipkin: env.TELEMETRY_ZIPKIN_ENDPOINT,
		},
		apiKeys: {
			datadog: env.TELEMETRY_DATADOG_API_KEY,
			newrelic: env.TELEMETRY_NEWRELIC_API_KEY,
			honeycomb: env.TELEMETRY_HONEYCOMB_API_KEY,
		},
		honeycomb: {
			dataset: env.TELEMETRY_HONEYCOMB_DATASET,
		},
	},
} as const;

export const alerts = {
	enabled: env.ALERTS_ENABLED,
	limits: {
		maxPerHour: env.ALERTS_MAX_PER_HOUR,
		cooldownMinutes: env.ALERTS_COOLDOWN_MINUTES,
	},
	deduplication: {
		enabled: env.ALERTS_DEDUPLICATION_ENABLED,
		window: env.ALERTS_DEDUPLICATION_WINDOW,
	},
	escalation: {
		enabled: env.ALERTS_ESCALATION_ENABLED,
		afterMinutes: env.ALERTS_ESCALATION_AFTER_MINUTES,
	},
	webhook: {
		url: env.ALERTS_WEBHOOK_URL,
		token: env.ALERTS_WEBHOOK_TOKEN,
	},
	slack: {
		webhookUrl: env.ALERTS_SLACK_WEBHOOK_URL,
		botToken: env.ALERTS_SLACK_BOT_TOKEN,
		channel: env.ALERTS_SLACK_CHANNEL,
		mentionChannel: env.ALERTS_SLACK_MENTION_CHANNEL,
		mentionUsers: env.ALERTS_SLACK_MENTION_USERS,
	},
	email: {
		provider: env.ALERTS_EMAIL_PROVIDER,
		from: env.ALERTS_EMAIL_FROM,
		to: env.ALERTS_EMAIL_TO,
		cc: env.ALERTS_EMAIL_CC,
		apiKey: env.ALERTS_EMAIL_API_KEY,
		region: env.ALERTS_EMAIL_REGION,
		smtp: {
			host: env.ALERTS_SMTP_HOST,
			port: env.ALERTS_SMTP_PORT,
			secure: env.ALERTS_SMTP_SECURE,
			username: env.ALERTS_SMTP_USERNAME,
			password: env.ALERTS_SMTP_PASSWORD,
		},
	},
} as const;

export const service = {
	name: env.SERVICE_NAME,
	version: env.SERVICE_VERSION,
	environment: env.NODE_ENV,
} as const;

// Utility functions
export function isProduction(): boolean {
	return env.NODE_ENV === "production";
}

export function isDevelopment(): boolean {
	return env.NODE_ENV === "development";
}

export function isTest(): boolean {
	return env.NODE_ENV === "test";
}

// Re-validate environment on module load to ensure consistency
if (typeof window === "undefined") {
	// Only validate on server-side to avoid client-side issues
	try {
		validateEnv();
	} catch (error) {
		console.warn("⚠️ Environment validation warning on module load:", error);
	}
}
