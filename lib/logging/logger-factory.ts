// AsyncLocalStorage compatibility layer
class BrowserAsyncLocalStorage {
	private store: any = null;
	run(store: any, callback: () => any) {
		this.store = store;
		return callback();
	}
	getStore() {
		return this.store;
	}
}

// Use dynamic import pattern that's ESM-compatible
let AsyncLocalStorage: any = BrowserAsyncLocalStorage;

if (typeof window === "undefined" && typeof process !== "undefined") {
	// Lazy load in Node.js environment
	import("async_hooks")
		.then((asyncHooks) => {
			AsyncLocalStorage = asyncHooks.AsyncLocalStorage;
		})
		.catch(() => {
			// Keep using browser fallback if async_hooks is not available
		});
}

import winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";
import * as Sentry from "@sentry/nextjs";
import { LogLevel, LoggingConfig, LogContext, LoggingMetrics, OperationMetrics } from "./types";

export class LoggerFactory {
	private static instance: LoggerFactory;
	private winston: winston.Logger;
	private config: LoggingConfig;
	private contextStorage: any;
	private correlationManager: any;
	private metadataEnricher: any;
	private redactor: any;
	private performanceTracker: any;

	private constructor(config: LoggingConfig) {
		this.config = config;
		// Simple implementations for now
		this.correlationManager = {
			getCurrentId: () => Math.random().toString(36).substring(7)
		};
		this.metadataEnricher = {
			enrich: (info: any, context: any) => ({
				...info,
				...context
			})
		};
		this.redactor = {
			redact: (obj: any) => obj // TODO: Implement proper redaction
		};
		this.performanceTracker = {
			recordError: () => {},
			recordOperation: (op: string, duration: number) => {},
			recordLoggingOperation: (duration: number, level: string) => {},
			getMetrics: () => ({
				totalLogs: 0,
				logsByLevel: {},
				averageLoggingTime: 0,
				operationMetrics: new Map(),
				errors: 0,
				startTime: Date.now()
			})
		};
		// Initialize contextStorage based on the current AsyncLocalStorage implementation
		if (typeof window === "undefined" && typeof process !== "undefined") {
			try {
				// In Node.js, AsyncLocalStorage will be the real one from async_hooks
				this.contextStorage = new AsyncLocalStorage();
			} catch {
				// Fallback to browser implementation
				this.contextStorage = new BrowserAsyncLocalStorage();
			}
		} else {
			// In browser, use the fallback
			this.contextStorage = new BrowserAsyncLocalStorage();
		}
		this.winston = this.createWinstonLogger();
	}

	static getInstance(config?: LoggingConfig): LoggerFactory {
		if (!LoggerFactory.instance) {
			if (!config) {
				throw new Error(
					"LoggerFactory requires configuration on first initialization",
				);
			}
			LoggerFactory.instance = new LoggerFactory(config);
		}
		return LoggerFactory.instance;
	}

	private createWinstonLogger(): winston.Logger {
		const transports = this.createTransports();
		const format = this.createLogFormat();

		return winston.createLogger({
			level: this.config.level,
			format,
			transports,
			exitOnError: false,
			silent: this.config.silent,
		});
	}

	private createTransports(): winston.transport[] {
		const transports: winston.transport[] = [];

		if (this.config.console.enabled) {
			transports.push(
				new winston.transports.Console({
					format: winston.format.combine(
						winston.format.colorize(),
						winston.format.simple(),
					),
					level: this.config.console.level || this.config.level,
				}),
			);
		}

		if (this.config.file.enabled) {
			transports.push(
				new DailyRotateFile({
					filename: this.config.file.filename.replace(".log", "-%DATE%.log"),
					datePattern: "YYYY-MM-DD",
					maxSize: this.config.file.maxSize,
					maxFiles: this.config.file.maxFiles,
					level: this.config.file.level || this.config.level,
					format: winston.format.combine(
						winston.format.timestamp(),
						winston.format.json(),
					),
				}),
			);

			transports.push(
				new DailyRotateFile({
					filename: this.config.file.errorFilename.replace(
						".log",
						"-%DATE%.log",
					),
					datePattern: "YYYY-MM-DD",
					level: "error",
					maxSize: this.config.file.maxSize,
					maxFiles: this.config.file.maxFiles,
					format: winston.format.combine(
						winston.format.timestamp(),
						winston.format.json(),
					),
				}),
			);
		}

		if (this.config.http.enabled && this.config.http.host) {
			transports.push(
				new winston.transports.Http({
					host: this.config.http.host,
					port: this.config.http.port,
					path: this.config.http.path,
					ssl: this.config.http.ssl,
					level: this.config.http.level || this.config.level,
				}),
			);
		}

		// Add Sentry transport
		if (typeof window === "undefined" && process.env.SENTRY_DSN) {
			// Create a custom Winston transport for Sentry
			const SentryTransport = winston.transports.Stream.prototype.constructor;
			
			class WinstonSentryTransport extends SentryTransport {
				constructor(opts?: any) {
					super(opts);
					this.name = 'sentry';
					this.level = opts?.level || 'error';
				}

				log(info: any, callback: () => void) {
					setImmediate(() => {
						this.emit('logged', info);
					});

					// Map Winston levels to Sentry severity
					const levelMap: Record<string, Sentry.SeverityLevel> = {
						error: 'error',
						warn: 'warning',
						info: 'info',
						debug: 'debug',
						trace: 'debug'
					};

					const level = levelMap[info.level] || 'info';
					
					// Extract error if present
					if (info.error instanceof Error) {
						Sentry.captureException(info.error, {
							level,
							extra: {
								message: info.message,
								...info
							}
						});
					} else if (info.level === 'error' || info.level === 'warn') {
						// Send as message for non-exception errors/warnings
					Sentry.captureMessage(info.message, {
						level,
						extra: info
					});
					}

					// Add breadcrumb for all log levels
					Sentry.addBreadcrumb({
						message: info.message,
						level,
						category: 'winston',
						data: {
							component: info.component,
							correlationId: info.correlationId,
							...info
						},
						timestamp: new Date(info.timestamp).getTime() / 1000
					});

					callback();
				}
			}

			// @ts-ignore - Custom transport
			transports.push(new WinstonSentryTransport({
				level: 'error', // Only send errors and above to Sentry by default
			}));
		}

		return transports;
	}

	private createLogFormat(): winston.Logform.Format {
		return winston.format.combine(
			winston.format.timestamp(),
			winston.format.errors({ stack: true }),
			winston.format.printf((info) => {
				const logEntry = this.enrichLogEntry(info);
				return JSON.stringify(logEntry);
			}),
		);
	}

	private enrichLogEntry(info: any): any {
		const context = this.contextStorage.getStore();
		const correlationId = this.correlationManager.getCurrentId();
		const metadata = this.metadataEnricher.enrich(info, context);

		const enrichedEntry = {
			timestamp: info.timestamp,
			level: info.level,
			message: info.message,
			correlationId,
			service: this.config.serviceName,
			version: this.config.serviceVersion,
			environment: this.config.environment,
			...metadata,
			...info,
		};

		return this.config.redaction.enabled
			? this.redactor.redact(enrichedEntry)
			: enrichedEntry;
	}

	createLogger(component: string): ComponentLogger {
		return new ComponentLogger(
			component,
			this.winston,
			this.contextStorage,
			this.correlationManager,
			this.performanceTracker,
			this.config,
		);
	}

	withContext<T>(context: LogContext, fn: () => T): T {
		return this.contextStorage.run(context, fn);
	}

	async withContextAsync<T>(
		context: LogContext,
		fn: () => Promise<T>,
	): Promise<T> {
		return this.contextStorage.run(context, fn);
	}

	updateLogLevel(level: LogLevel): void {
		this.winston.level = level;
		this.config.level = level;
	}

	getMetrics(): LoggingMetrics {
		return this.performanceTracker.getMetrics();
	}

	getConfig(): LoggingConfig {
		return { ...this.config };
	}
}

export class ComponentLogger {
	constructor(
		private component: string,
		private winston: winston.Logger,
		private contextStorage: any,
		private correlationManager: CorrelationIdManager,
		private performanceTracker: PerformanceTracker,
		private config: LoggingConfig,
	) {}

	error(message: string, error?: Error, metadata?: any): void {
		this.performanceTracker.recordError();
		this.log("error", message, { error, ...metadata });
	}

	warn(message: string, metadata?: any): void {
		this.log("warn", message, metadata);
	}

	info(message: string, metadata?: any): void {
		this.log("info", message, metadata);
	}

	debug(message: string, metadata?: any): void {
		this.log("debug", message, metadata);
	}

	trace(message: string, metadata?: any): void {
		this.log("trace", message, metadata);
	}

	apiRequest(req: any, res: any, duration: number): void {
		this.info("API Request", {
			method: req.method,
			url: req.url,
			statusCode: res.statusCode,
			duration,
			userAgent: req.headers["user-agent"],
			ip: req.ip,
			userId: req.user?.id,
		});
	}

	apiError(req: any, error: Error): void {
		this.error("API Error", error, {
			method: req.method,
			url: req.url,
			userAgent: req.headers["user-agent"],
			ip: req.ip,
			userId: req.user?.id,
		});
	}

	agentOperation(agentId: string, operation: string, metadata: any): void {
		this.info("Agent Operation", {
			agentId,
			operation,
			component: "agent-system",
			...metadata,
		});
	}

	agentError(agentId: string, error: Error, context: any): void {
		this.error("Agent Error", error, {
			agentId,
			component: "agent-system",
			context,
		});
	}

	databaseQuery(query: string, duration: number, metadata?: any): void {
		this.debug("Database Query", {
			query: this.sanitizeQuery(query),
			duration,
			component: "database",
			...metadata,
		});
	}

	databaseError(query: string, error: Error): void {
		this.error("Database Error", error, {
			query: this.sanitizeQuery(query),
			component: "database",
		});
	}

	performance(operation: string, duration: number, metadata?: any): void {
		this.info("Performance Metric", {
			operation,
			duration,
			component: "performance",
			...metadata,
		});

		this.performanceTracker.recordOperation(operation, duration);
	}

	private log(level: LogLevel, message: string, metadata?: any): void {
		const startTime = Date.now();

		try {
			if (this.shouldSample()) {
				const context = this.contextStorage.getStore();
				const logData = {
					message,
					component: this.component,
					...metadata,
					...(context && { context }),
				};

				this.winston.log(level, logData);
			}
		} catch (error) {
			console.error("Logging error:", error);
			console.log(`[${level.toUpperCase()}] ${this.component}: ${message}`);
		} finally {
			const duration = Date.now() - startTime;
			this.performanceTracker.recordLoggingOperation(duration, level);
		}
	}

	private shouldSample(): boolean {
		if (!this.config.sampling.enabled) {
			return true;
		}

		return Math.random() < this.config.sampling.rate;
	}

	private sanitizeQuery(query: string): string {
		return query
			.replace(/password\s*=\s*'[^']*'/gi, "password='***'")
			.replace(/token\s*=\s*'[^']*'/gi, "token='***'")
			.substring(0, 1000);
	}
}
