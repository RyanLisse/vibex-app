// Stub module for build time

export const createDefaultLoggingConfig = () => ({
	level: "info",
	serviceName: "app",
	serviceVersion: "1.0.0",
	format: "json",
});

export const validateLoggingConfig = () => true;

export class LoggerFactory {
	static getInstance() {
		return {
			createLogger: (name: string) => ({
				debug: (...args: any[]) => {},
				info: (...args: any[]) => {},
				warn: (...args: any[]) => {},
				error: (...args: any[]) => {},
				child: () => LoggerFactory,
				startTimer: () => ({ done: () => {} }),
				profile: () => {},
			}),
		};
	}
}

export const getLogger = (name: string) => ({
	debug: (...args: any[]) => {},
	info: (...args: any[]) => {},
	warn: (...args: any[]) => {},
	error: (...args: any[]) => {},
	child: () => getLogger(name),
	startTimer: () => ({ done: () => {} }),
	profile: () => {},
});

export const createLogger = getLogger;

// Export all other expected exports as no-ops
export const CorrelationIdManager = class {};
export const ComponentLogger = class {};
export const MetadataEnricher = class {};
export const createApiRouteLogger = () => () => {};
export const createLoggingMiddleware = () => () => {};
export const PerformanceTracker = class {};
export const SensitiveDataRedactor = class {};
export const AgentLogger = class {};
export const DatabaseLogger = class {};
export const PerformanceLogger = class {};
export const SecurityLogger = class {};
export const initializeLogging = () => {};
