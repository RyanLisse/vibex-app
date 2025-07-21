import * as Sentry from "@sentry/nextjs";
import { getLogger } from "@/lib/logging";
import type { User } from "@/types/user";

// Get Winston logger for instrumentation
const logger = getLogger("sentry-instrumentation");

/**
 * Set the current user context in Sentry
 */
export function setSentryUser(user: User | null) {
	if (user) {
		Sentry.setUser({
			id: user.id,
			email: user.email,
			username: user.username,
		});
	} else {
		Sentry.setUser(null);
	}
}

/**
 * Clear the current user context in Sentry
 */
export function clearSentryUser() {
	Sentry.setUser(null);
}

/**
 * Add a breadcrumb to the Sentry trail
 */
export function addBreadcrumb(
	message: string,
	category: string,
	level: "debug" | "info" | "warning" | "error" | "fatal" = "info",
	data?: Record<string, any>,
) {
	Sentry.addBreadcrumb({
		message,
		category,
		level,
		data,
		timestamp: Date.now() / 1000,
	});
}

/**
 * Instrument a server action with Sentry error tracking and performance monitoring
 */
export async function instrumentServerAction<T extends (...args: any[]) => any>(
	name: string,
	action: T,
	options?: {
		data?: Record<string, any>;
		description?: string;
	},
): Promise<ReturnType<T>> {
	return Sentry.startSpan(
		{
			op: "function.server",
			name: `Server Action: ${name}`,
			data: options?.data,
			attributes: {
				description: options?.description,
			},
		},
		async (span) => {
			try {
				const result = await action();
				span.setStatus({ code: 1 }); // OK
				return result;
			} catch (error) {
				span.setStatus({ code: 2 }); // ERROR
				Sentry.captureException(error, {
					tags: {
						action: name,
						type: "server_action",
					},
				});
				throw error;
			}
		},
	);
}

/**
 * Instrument an API route with Sentry error tracking and performance monitoring
 */
export async function instrumentApiRoute<T extends (...args: any[]) => any>(
	method: string,
	path: string,
	handler: T,
	options?: {
		userId?: string;
		data?: Record<string, any>;
	},
): Promise<ReturnType<T>> {
	return Sentry.startSpan(
		{
			op: "http.server",
			name: `${method} ${path}`,
			data: options?.data,
			attributes: {
				"http.method": method,
				"http.route": path,
				"user.id": options?.userId,
			},
		},
		async (span) => {
			try {
				const result = await handler();
				span.setStatus({ code: 1 }); // OK
				return result;
			} catch (error) {
				span.setStatus({ code: 2 }); // ERROR
				Sentry.captureException(error, {
					tags: {
						route: path,
						method,
						type: "api_route",
					},
				});
				throw error;
			}
		},
	);
}

/**
 * Instrument a database operation with Sentry performance monitoring
 */
export async function instrumentDatabaseOperation<
	T extends (...args: any[]) => any,
>(operation: string, query: string, fn: T): Promise<ReturnType<T>> {
	return Sentry.startSpan(
		{
			op: "db.query",
			name: operation,
			data: {
				"db.statement": query,
			},
		},
		async (span) => {
			try {
				const result = await fn();
				span.setStatus({ code: 1 }); // OK
				return result;
			} catch (error) {
				span.setStatus({ code: 2 }); // ERROR
				Sentry.captureException(error, {
					tags: {
						database_operation: operation,
						type: "database",
					},
				});
				throw error;
			}
		},
	);
}

/**
 * Instrument an Inngest function with Sentry monitoring
 */
export async function instrumentInngestFunction<
	T extends (...args: any[]) => any,
>(
	functionName: string,
	eventName: string,
	fn: T,
	eventData?: Record<string, any>,
): Promise<ReturnType<T>> {
	return Sentry.startSpan(
		{
			op: "function.inngest",
			name: `Inngest: ${functionName}`,
			data: {
				event: eventName,
				...eventData,
			},
		},
		async (span) => {
			try {
				addBreadcrumb(
					`Starting Inngest function: ${functionName}`,
					"inngest",
					"info",
					{
						event: eventName,
					},
				);
				const result = await fn();
				span.setStatus({ code: 1 }); // OK
				return result;
			} catch (error) {
				span.setStatus({ code: 2 }); // ERROR
				Sentry.captureException(error, {
					tags: {
						inngest_function: functionName,
						inngest_event: eventName,
						type: "inngest",
					},
				});
				throw error;
			}
		},
	);
}

/**
 * Log a message with Winston (which forwards to Sentry)
 */
export function logWithSentry(
	level: "trace" | "debug" | "info" | "warn" | "error" | "fatal",
	message: string,
	data?: Record<string, any>,
) {
	// Use Winston logger which is integrated with Sentry
	switch (level) {
		case "trace":
		case "debug":
			logger.debug(message, data);
			break;
		case "info":
			logger.info(message, data);
			break;
		case "warn":
			logger.warn(message, data);
			break;
		case "error":
		case "fatal":
			logger.error(
				message,
				data instanceof Error ? data : new Error(message),
				data,
			);
			break;
	}
}

/**
 * Example usage in a React component
 */
export function trackButtonClick(
	buttonName: string,
	metadata?: Record<string, any>,
) {
	Sentry.startSpan(
		{
			op: "ui.click",
			name: `Button Click: ${buttonName}`,
		},
		(span) => {
			// Add any metadata
			if (metadata) {
				Object.entries(metadata).forEach(([key, value]) => {
					span.setAttribute(key, value);
				});
			}

			// Add breadcrumb
			addBreadcrumb(`Clicked ${buttonName} button`, "ui", "info", metadata);
		},
	);
}

/**
 * Track API calls from the client
 */
export async function trackApiCall<T>(
	url: string,
	method: string,
	fn: () => Promise<T>,
): Promise<T> {
	return Sentry.startSpan(
		{
			op: "http.client",
			name: `${method} ${url}`,
		},
		async () => {
			try {
				const result = await fn();
				return result;
			} catch (error) {
				Sentry.captureException(error, {
					tags: {
						api_url: url,
						api_method: method,
						type: "api_client",
					},
				});
				throw error;
			}
		},
	);
}
