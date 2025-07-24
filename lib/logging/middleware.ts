/**
 * Logging middleware for API routes and Next.js
 */

import { type NextRequest, NextResponse } from "next/server";
import type { ComponentLogger } from "./logger-factory";

export interface LoggingMiddlewareOptions {
	logger?: ComponentLogger;
	logBody?: boolean;
	logHeaders?: boolean;
	excludePaths?: string[];
}

/**
 * Create an API route logger middleware
 */
export function createApiRouteLogger(options: LoggingMiddlewareOptions = {}) {
	const { logger = console, logBody = false, logHeaders = false } = options;

	return async (req: Request) => {
		const start = Date.now();
		const url = new URL(req.url);

		// Log request
		const logData: any = {
			method: req.method,
			path: url.pathname,
			query: Object.fromEntries(url.searchParams),
		};

		if (logHeaders && req.headers) {
			logData.headers = Object.fromEntries(req.headers);
		}

		if (logBody && req.body) {
			try {
				const body = await req.json();
				logData.body = body;
			} catch {
				// Body not JSON or already consumed
			}
		}

		logger.info(`API Request: ${req.method} ${url.pathname}`, logData);

		// Return timing function
		return {
			logResponse: (status: number, data?: any) => {
				const duration = Date.now() - start;
				logger.info(`API Response: ${req.method} ${url.pathname} - ${status} (${duration}ms)`, {
					status,
					duration,
					...(data && { responseData: data }),
				});
			},
		};
	};
}

/**
 * Create a Next.js middleware for logging
 */
export function createLoggingMiddleware(options: LoggingMiddlewareOptions = {}) {
	const { logger = console, excludePaths = [] } = options;

	return async (request: NextRequest) => {
		const start = Date.now();
		const { pathname } = request.nextUrl;

		// Skip excluded paths
		if (excludePaths.some((path) => pathname.startsWith(path))) {
			return NextResponse.next();
		}

		// Log request
		logger.info(`Request: ${request.method} ${pathname}`, {
			method: request.method,
			path: pathname,
			ip: request.ip || request.headers.get("x-forwarded-for"),
			userAgent: request.headers.get("user-agent"),
		});

		// Continue with request
		const response = NextResponse.next();

		// Log response timing
		const duration = Date.now() - start;
		logger.info(`Response: ${request.method} ${pathname} (${duration}ms)`, {
			duration,
			status: response.status,
		});

		return response;
	};
}
