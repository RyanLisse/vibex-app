import * as Sentry from "@sentry/nextjs";
import { getLogger as getWinstonLogger } from "@/lib/logging";

const { logger } = Sentry;

/**
 * Enhanced logger that sends logs to both Winston and Sentry
 */
export class SentryEnhancedLogger {
	private winstonLogger: ReturnType<typeof getWinstonLogger>;
	private component: string;

	constructor(component: string) {
		this.component = component;
		this.winstonLogger = getWinstonLogger(component);
	}

	private logToSentry(level: string, message: string, data?: any) {
		// Log to Sentry based on level
		switch (level) {
			case "error":
				logger.error(message, data);
				break;
			case "warn":
				logger.warn(message, data);
				break;
			case "info":
				logger.info(message, data);
				break;
			case "debug":
				logger.debug(message, data);
				break;
			case "trace":
				logger.trace(message, data);
				break;
		}
	}

	error(message: string, error?: Error, data?: any) {
		// Log to Winston
		this.winstonLogger.error(message, { error, ...data });

		// Log to Sentry
		this.logToSentry("error", message, data);

		// If there's an error object, capture it as an exception
		if (error) {
			Sentry.captureException(error, {
				tags: { component: this.component },
				extra: data,
			});
		}
	}

	warn(message: string, data?: any) {
		this.winstonLogger.warn(message, data);
		this.logToSentry("warn", message, data);
	}

	info(message: string, data?: any) {
		this.winstonLogger.info(message, data);
		this.logToSentry("info", message, data);
	}

	debug(message: string, data?: any) {
		this.winstonLogger.debug(message, data);
		this.logToSentry("debug", message, data);
	}

	trace(message: string, data?: any) {
		this.winstonLogger.trace(message, data);
		this.logToSentry("trace", message, data);
	}

	/**
	 * Log with template literals for structured logging
	 */
	fmt(strings: TemplateStringsArray, ...values: any[]): string {
		return logger.fmt(strings, ...values);
	}

	/**
	 * Create a child logger with additional context
	 */
	child(context: Record<string, any>): SentryEnhancedLogger {
		const childLogger = new SentryEnhancedLogger(
			`${this.component}:${context.subcomponent || "child"}`,
		);

		// Set Sentry context for this logger
		Sentry.setContext(this.component, context);

		return childLogger;
	}
}

/**
 * Get an enhanced logger instance that logs to both Winston and Sentry
 */
export function getSentryLogger(component: string): SentryEnhancedLogger {
	return new SentryEnhancedLogger(component);
}
