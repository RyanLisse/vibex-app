/**
 * ComponentLogger - Enhanced logging system for components
 *
 * Provides structured logging with context awareness and performance tracking
 */

export interface LogContext {
	component?: string;
	userId?: string;
	sessionId?: string;
	requestId?: string;
	metadata?: Record<string, any>;
}

export interface LogEntry {
	level: "debug" | "info" | "warn" | "error";
	message: string;
	context: LogContext;
	timestamp: Date;
	stack?: string;
}

export interface ComponentLoggerConfig {
	component: string;
	minLevel?: "debug" | "info" | "warn" | "error";
	enableConsole?: boolean;
	enableFile?: boolean;
	enableRemote?: boolean;
}

export class ComponentLogger {
	private component: string;
	private minLevel: "debug" | "info" | "warn" | "error";
	private enableConsole: boolean;
	private enableFile: boolean;
	private enableRemote: boolean;
	private context: LogContext = {};

	constructor(config: ComponentLoggerConfig) {
		this.component = config.component;
		this.minLevel = config.minLevel || "info";
		this.enableConsole = config.enableConsole !== false;
		this.enableFile = config.enableFile || false;
		this.enableRemote = config.enableRemote || false;
	}

	/**
	 * Set context for all subsequent log entries
	 */
	setContext(context: Partial<LogContext>): void {
		this.context = { ...this.context, ...context };
	}

	/**
	 * Clear current context
	 */
	clearContext(): void {
		this.context = {};
	}

	/**
	 * Create a child logger with additional context
	 */
	child(context: Partial<LogContext>): ComponentLogger {
		const childLogger = new ComponentLogger({
			component: this.component,
			minLevel: this.minLevel,
			enableConsole: this.enableConsole,
			enableFile: this.enableFile,
			enableRemote: this.enableRemote,
		});
		childLogger.setContext({ ...this.context, ...context });
		return childLogger;
	}

	/**
	 * Log debug message
	 */
	debug(message: string, metadata?: Record<string, any>): void {
		this.log("debug", message, metadata);
	}

	/**
	 * Log info message
	 */
	info(message: string, metadata?: Record<string, any>): void {
		this.log("info", message, metadata);
	}

	/**
	 * Log warning message
	 */
	warn(message: string, metadata?: Record<string, any>): void {
		this.log("warn", message, metadata);
	}

	/**
	 * Log error message
	 */
	error(message: string, error?: Error, metadata?: Record<string, any>): void {
		const logMetadata = {
			...metadata,
			...(error && {
				error: {
					name: error.name,
					message: error.message,
					stack: error.stack,
				},
			}),
		};
		this.log("error", message, logMetadata);
	}

	/**
	 * Core logging method
	 */
	private log(
		level: "debug" | "info" | "warn" | "error",
		message: string,
		metadata?: Record<string, any>
	): void {
		if (!this.shouldLog(level)) {
			return;
		}

		const entry: LogEntry = {
			level,
			message,
			context: {
				component: this.component,
				...this.context,
				metadata,
			},
			timestamp: new Date(),
		};

		// Add stack trace for errors
		if (level === "error") {
			entry.stack = new Error().stack;
		}

		// Output to console if enabled
		if (this.enableConsole) {
			this.outputToConsole(entry);
		}

		// Output to file if enabled
		if (this.enableFile) {
			this.outputToFile(entry);
		}

		// Send to remote logging if enabled
		if (this.enableRemote) {
			this.outputToRemote(entry);
		}
	}

	/**
	 * Check if we should log at this level
	 */
	private shouldLog(level: "debug" | "info" | "warn" | "error"): boolean {
		const levels = ["debug", "info", "warn", "error"];
		const currentLevelIndex = levels.indexOf(this.minLevel);
		const logLevelIndex = levels.indexOf(level);
		return logLevelIndex >= currentLevelIndex;
	}

	/**
	 * Output log entry to console
	 */
	private outputToConsole(entry: LogEntry): void {
		const timestamp = entry.timestamp.toISOString();
		const contextStr = entry.context.component ? `[${entry.context.component}]` : "";
		const prefix = `${timestamp} ${entry.level.toUpperCase()} ${contextStr}`;

		const logMethod =
			entry.level === "error"
				? console.error
				: entry.level === "warn"
					? console.warn
					: entry.level === "debug"
						? console.debug
						: console.log;

		if (entry.context.metadata) {
			logMethod(`${prefix} ${entry.message}`, entry.context.metadata);
		} else {
			logMethod(`${prefix} ${entry.message}`);
		}

		if (entry.stack && entry.level === "error") {
			console.error(entry.stack);
		}
	}

	/**
	 * Output log entry to file (placeholder)
	 */
	private outputToFile(entry: LogEntry): void {
		// In a real implementation, this would write to a log file
		// For now, we'll just store in memory or skip
	}

	/**
	 * Send log entry to remote logging service (placeholder)
	 */
	private outputToRemote(entry: LogEntry): void {
		// In a real implementation, this would send to a logging service
		// For now, we'll just skip
	}

	/**
	 * Performance timing helper
	 */
	time(label: string): () => void {
		const start = performance.now();
		return () => {
			const duration = performance.now() - start;
			this.info(`${label} completed`, { duration: `${duration.toFixed(2)}ms` });
		};
	}

	/**
	 * Async operation wrapper with logging
	 */
	async wrapAsync<T>(
		operation: string,
		fn: () => Promise<T>,
		metadata?: Record<string, any>
	): Promise<T> {
		const timer = this.time(operation);
		this.debug(`Starting ${operation}`, metadata);

		try {
			const result = await fn();
			this.debug(`Completed ${operation}`, metadata);
			timer();
			return result;
		} catch (error) {
			this.error(`Failed ${operation}`, error as Error, metadata);
			timer();
			throw error;
		}
	}

	/**
	 * Sync operation wrapper with logging
	 */
	wrap<T>(operation: string, fn: () => T, metadata?: Record<string, any>): T {
		const timer = this.time(operation);
		this.debug(`Starting ${operation}`, metadata);

		try {
			const result = fn();
			this.debug(`Completed ${operation}`, metadata);
			timer();
			return result;
		} catch (error) {
			this.error(`Failed ${operation}`, error as Error, metadata);
			timer();
			throw error;
		}
	}
}

/**
 * Create a logger instance for a component
 */
export function createComponentLogger(
	component: string,
	config?: Partial<ComponentLoggerConfig>
): ComponentLogger {
	return new ComponentLogger({
		component,
		...config,
	});
}

/**
 * Default logger for general use
 */
export const defaultLogger = createComponentLogger("default");

// Export for backward compatibility
export default ComponentLogger;
