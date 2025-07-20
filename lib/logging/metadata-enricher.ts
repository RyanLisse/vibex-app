import { trace } from "@opentelemetry/api";
import type { LogContext } from "./types";

export class MetadataEnricher {
	private systemMetadata: Record<string, any> = {};

	constructor() {
		this.initializeSystemMetadata();
	}

	private initializeSystemMetadata(): void {
		this.systemMetadata = {
			hostname: process.env.HOSTNAME || "unknown",
			pid: process.pid,
			platform: process.platform,
			nodeVersion: process.version,
			memoryUsage: this.getMemoryUsage(),
		};
	}

	enrich(logEntry: any, context?: LogContext): any {
		const enriched = {
			...logEntry,
			system: this.systemMetadata,
			trace: this.getTraceContext(),
		};

		if (context) {
			enriched.context = context;
		}

		// Add environment-specific metadata
		if (process.env.NODE_ENV === "development") {
			enriched.development = {
				memoryUsage: this.getMemoryUsage(),
				uptime: process.uptime(),
			};
		}

		return enriched;
	}

	private getTraceContext(): any {
		const span = trace.getActiveSpan();
		if (span) {
			const spanContext = span.spanContext();
			return {
				traceId: spanContext.traceId,
				spanId: spanContext.spanId,
				traceFlags: spanContext.traceFlags,
			};
		}
		return {};
	}

	private getMemoryUsage(): any {
		const usage = process.memoryUsage();
		return {
			rss: Math.round(usage.rss / 1024 / 1024), // MB
			heapTotal: Math.round(usage.heapTotal / 1024 / 1024), // MB
			heapUsed: Math.round(usage.heapUsed / 1024 / 1024), // MB
			external: Math.round(usage.external / 1024 / 1024), // MB
		};
	}

	updateSystemMetadata(): void {
		this.systemMetadata.memoryUsage = this.getMemoryUsage();
		this.systemMetadata.uptime = process.uptime();
	}
}
