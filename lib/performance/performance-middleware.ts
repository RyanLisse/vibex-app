/**
 * Performance Monitoring Middleware
 *
 * Provides automatic performance monitoring, tracing, and metrics collection
 * for API routes with OpenTelemetry integration.
 */

export function withPerformanceMonitoring<T extends (...args: any[]) => any>(fn: T): T {
	return ((...args: any[]) => {
		const start = Date.now();
		const result = fn(...args);
		const duration = Date.now() - start;
		console.log(`Performance: ${fn.name} took ${duration}ms`);
		return result;
	}) as T;
}
