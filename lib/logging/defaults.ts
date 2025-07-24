/**
 * Default logging configuration
 */

import type { LoggingConfig } from "./types";

export function createDefaultLoggingConfig(): LoggingConfig {
	return {
		level: process.env.LOG_LEVEL || "info",
		format: process.env.LOG_FORMAT || "json",
		pretty: process.env.NODE_ENV === "development",
		timestamp: true,
		colorize: process.env.NODE_ENV === "development",
		metadata: {
			service: process.env.SERVICE_NAME || "app",
			environment: process.env.NODE_ENV || "development",
			version: process.env.APP_VERSION || "unknown",
		},
		transports: [
			{
				type: "console",
				level: process.env.LOG_LEVEL || "info",
			},
		],
		redaction: {
			paths: [
				"password",
				"token",
				"secret",
				"apiKey",
				"api_key",
				"authorization",
				"cookie",
				"session",
				"creditCard",
				"credit_card",
				"ssn",
				"email",
				"phone",
			],
			censor: "[REDACTED]",
		},
		sampling: {
			enabled: false,
			rate: 1.0,
		},
		errorReporting: {
			enabled: process.env.NODE_ENV === "production",
			sentry: {
				dsn: process.env.SENTRY_DSN,
				environment: process.env.NODE_ENV,
			},
		},
	};
}

// Re-export for convenience
export type { LoggingConfig } from "./types";
