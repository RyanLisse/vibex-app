// Main logging exports

// Configuration
import { export { validateLoggingConfig } from "./config";
import { export { CorrelationIdManager } from "./correlation-id-manager";
import { export { createDefaultLoggingConfig } from "./defaults";
import { export { ComponentLogger, LoggerFactory } from "./logger-factory";
import { export { MetadataEnricher } from "./metadata-enricher";
// Middleware
import { export { createApiRouteLogger, createLoggingMiddleware } from "./middleware";
import { export { PerformanceTracker } from "./performance-tracker";
import { export { SensitiveDataRedactor } from "./sensitive-data-redactor";
// Specialized loggers
export {
import { AgentLogger,
import { SecurityLogger
} from "./specialized-loggers";
// Types
export type {
import { LogContext,
import { OperationMetrics
} from "./types";

// Convenience function to create a logger
export function createLogger(component: string) {
	try {
		const { createDefaultLoggingConfig: createConfig } = require("./config");
		const config = createConfig();
		const factory = LoggerFactory.getInstance(config);
		return factory.createLogger(component);
	} catch {
		return getLogger(component);
	}
}

// Global logger instance getter
export function getLogger(component: string) {
	// During build, use build logger
	if (
		process.env.NEXT_PHASE === "phase-production-build" ||
		process.env.NODE_ENV === "test"
	) {
		const { createBuildLogger } = require("./build-logger");
		return createBuildLogger(component);
	}

	// During browser runtime, use console logger
	if (typeof window !== "undefined") {
		const { createBuildLogger } = require("./build-logger");
		return createBuildLogger(component);
	}

	// Server runtime - use full logger
	try {
		const factory = LoggerFactory.getInstance();
		return factory.createLogger(component);
	} catch (error) {
		// Fallback if not initialized
		try {
			const { createDefaultLoggingConfig: createConfig } = require("./config");
			const config = createConfig();
			const factory = LoggerFactory.getInstance(config);
			return factory.createLogger(component);
		} catch {
			// Return basic console logger as last resort
			return {
				debug: (...args: any[]) => console.debug(`[${component}]`, ...args),
				info: (...args: any[]) => console.info(`[${component}]`, ...args),
				warn: (...args: any[]) => console.warn(`[${component}]`, ...args),
				error: (...args: any[]) => console.error(`[${component}]`, ...args),
				child: () => getLogger(component),
				startTimer: () => ({ done: () => {} }),
				profile: () => {},
			};
		}
	}
}

// Initialize logging system
export function initializeLogging(config?: Partial<LoggingConfig>) {
	const { createDefaultLoggingConfig: createConfig } = require("./config");
	const fullConfig = {
		...createConfig(),
		...config,
	};

	validateLoggingConfig(fullConfig);
	return LoggerFactory.getInstance(fullConfig);
}

// Export default logger instance
const defaultLogger = createLogger("app");
export default defaultLogger;
