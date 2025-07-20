import { type Span as OtelSpan, trace } from "@opentelemetry/api";
import * as Sentry from "@sentry/nextjs";

/**
 * Wrapper utility to create both Sentry and OpenTelemetry spans
 * This ensures both systems capture performance data
 */
export function startDualSpan(
	operation: string,
	description: string,
	callback: (
		sentrySpan: Sentry.Span | undefined,
		otelSpan: OtelSpan,
	) => void | Promise<void>,
): Promise<void> | void {
	const tracer = trace.getTracer(operation.split(".")[0]);
	const otelSpan = tracer.startSpan(operation);

	return Sentry.startSpan(
		{
			op: operation,
			name: description,
		},
		async (sentrySpan) => {
			try {
				await callback(sentrySpan, otelSpan);
			} catch (error) {
				// Record exception in both systems
				otelSpan.recordException(error as Error);
				Sentry.captureException(error);
				throw error;
			} finally {
				otelSpan.end();
			}
		},
	);
}

/**
 * Wrapper for database operations with Sentry and OpenTelemetry
 */
export async function instrumentDatabaseOperation<T>(
	operationName: string,
	query: string,
	operation: () => Promise<T>,
): Promise<T> {
	return startDualSpan(
		`db.${operationName}`,
		query.substring(0, 100), // Truncate for readability
		async (sentrySpan, otelSpan) => {
			const startTime = Date.now();

			try {
				const result = await operation();
				const duration = Date.now() - startTime;

				// Set attributes on both spans
				const attributes = {
					"db.operation": operationName,
					"db.duration": duration,
					"db.query": query.substring(0, 100),
				};

				if (sentrySpan) {
					sentrySpan.setData("db.operation", operationName);
					sentrySpan.setData("db.duration", duration);
				}

				otelSpan.setAttributes(attributes);

				return result;
			} catch (error) {
				if (sentrySpan) {
					sentrySpan.setStatus("internal_error");
				}
				throw error;
			}
		},
	) as Promise<T>;
}

/**
 * Wrapper for API route handlers with Sentry and OpenTelemetry
 */
export async function instrumentApiRoute<T>(
	method: string,
	path: string,
	handler: () => Promise<T>,
): Promise<T> {
	return startDualSpan(
		"http.server",
		`${method} ${path}`,
		async (sentrySpan, otelSpan) => {
			const startTime = Date.now();

			try {
				const result = await handler();
				const duration = Date.now() - startTime;

				// Set attributes
				const attributes = {
					"http.method": method,
					"http.route": path,
					"http.duration": duration,
					"http.status_code": 200,
				};

				if (sentrySpan) {
					sentrySpan.setData("http.method", method);
					sentrySpan.setData("http.route", path);
					sentrySpan.setData("http.duration", duration);
					sentrySpan.setData("http.status_code", 200);
				}

				otelSpan.setAttributes(attributes);

				return result;
			} catch (error) {
				const statusCode = (error as any).statusCode || 500;

				if (sentrySpan) {
					sentrySpan.setData("http.status_code", statusCode);
					sentrySpan.setStatus(
						statusCode >= 500 ? "internal_error" : "failed_precondition",
					);
				}

				otelSpan.setAttributes({
					"http.status_code": statusCode,
				});

				throw error;
			}
		},
	) as Promise<T>;
}

/**
 * Wrapper for server actions with Sentry and OpenTelemetry
 */
export async function instrumentServerAction<T>(
	actionName: string,
	action: () => Promise<T>,
): Promise<T> {
	return startDualSpan(
		`action.${actionName}`,
		`Server Action: ${actionName}`,
		async (sentrySpan, otelSpan) => {
			const startTime = Date.now();

			try {
				const result = await action();
				const duration = Date.now() - startTime;

				if (sentrySpan) {
					sentrySpan.setData("action.name", actionName);
					sentrySpan.setData("action.duration", duration);
					sentrySpan.setData("action.success", true);
				}

				otelSpan.setAttributes({
					"action.name": actionName,
					"action.duration": duration,
					"action.success": true,
				});

				return result;
			} catch (error) {
				if (sentrySpan) {
					sentrySpan.setData("action.success", false);
					sentrySpan.setStatus("internal_error");
				}

				otelSpan.setAttributes({
					"action.success": false,
				});

				throw error;
			}
		},
	) as Promise<T>;
}

/**
 * Instrument Inngest background jobs
 */
export function instrumentInngestFunction<T extends (...args: any[]) => any>(
	functionName: string,
	handler: T,
): T {
	return (async (...args: Parameters<T>) => {
		return startDualSpan(
			`job.${functionName}`,
			`Background Job: ${functionName}`,
			async (sentrySpan, otelSpan) => {
				const startTime = Date.now();

				try {
					const result = await handler(...args);
					const duration = Date.now() - startTime;

					if (sentrySpan) {
						sentrySpan.setData("job.name", functionName);
						sentrySpan.setData("job.duration", duration);
						sentrySpan.setData("job.status", "completed");
					}

					otelSpan.setAttributes({
						"job.name": functionName,
						"job.duration": duration,
						"job.status": "completed",
					});

					return result;
				} catch (error) {
					if (sentrySpan) {
						sentrySpan.setData("job.status", "failed");
						sentrySpan.setStatus("internal_error");
					}

					otelSpan.setAttributes({
						"job.status": "failed",
					});

					throw error;
				}
			},
		);
	}) as T;
}

/**
 * Add breadcrumb to Sentry for important events
 */
export function addBreadcrumb(
	message: string,
	category: string,
	level: Sentry.SeverityLevel = "info",
	data?: Record<string, any>,
): void {
	Sentry.addBreadcrumb({
		message,
		category,
		level,
		data,
		timestamp: Date.now() / 1000,
	});
}

/**
 * Set user context for Sentry
 */
export function setSentryUser(user: {
	id: string;
	email?: string;
	username?: string;
	[key: string]: any;
}): void {
	Sentry.setUser({
		id: user.id,
		email: user.email,
		username: user.username,
		...user,
	});
}

/**
 * Clear user context
 */
export function clearSentryUser(): void {
	Sentry.setUser(null);
}

/**
 * Set custom context for Sentry
 */
export function setSentryContext(
	key: string,
	context: Record<string, any>,
): void {
	Sentry.setContext(key, context);
}

/**
 * Set tags for Sentry
 */
export function setSentryTags(tags: Record<string, string>): void {
	Sentry.setTags(tags);
}
