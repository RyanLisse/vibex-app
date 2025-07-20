// Force dynamic rendering to avoid build-time issues
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { and, desc, eq, gte, ilike, lte, sql } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db/config";
import { observabilityEvents } from "@/db/schema";
import { observabilityService } from "@/lib/observability";

const eventsQuerySchema = z.object({
	type: z
		.enum(["execution", "step", "query", "sync", "wasm", "error"])
		.optional(),
	category: z.string().optional(),
	severity: z.enum(["debug", "info", "warn", "error", "critical"]).optional(),
	executionId: z.string().uuid().optional(),
	search: z.string().optional(),
	startTime: z.string().datetime().optional(),
	endTime: z.string().datetime().optional(),
	limit: z.coerce.number().min(1).max(1000).default(100),
	offset: z.coerce.number().min(0).default(0),
});

const createEventSchema = z.object({
	type: z.enum(["execution", "step", "query", "sync", "wasm", "error"]),
	category: z.string(),
	message: z.string(),
	severity: z
		.enum(["debug", "info", "warn", "error", "critical"])
		.default("info"),
	executionId: z.string().uuid().optional(),
	traceId: z.string().optional(),
	spanId: z.string().optional(),
	metadata: z.record(z.string(), z.any()).default({}),
});

// GET /api/observability/events - List observability events
export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const query = eventsQuerySchema.parse(Object.fromEntries(searchParams));

		const conditions = [];

		if (query.type) {
			conditions.push(eq(observabilityEvents.type, query.type));
		}

		if (query.category) {
			conditions.push(eq(observabilityEvents.category, query.category));
		}

		if (query.severity) {
			conditions.push(eq(observabilityEvents.severity, query.severity));
		}

		if (query.executionId) {
			conditions.push(eq(observabilityEvents.executionId, query.executionId));
		}

		if (query.search) {
			conditions.push(ilike(observabilityEvents.message, `%${query.search}%`));
		}

		if (query.startTime) {
			conditions.push(
				gte(observabilityEvents.timestamp, new Date(query.startTime)),
			);
		}

		if (query.endTime) {
			conditions.push(
				lte(observabilityEvents.timestamp, new Date(query.endTime)),
			);
		}

		const events = await db
			.select()
			.from(observabilityEvents)
			.where(conditions.length > 0 ? and(...conditions) : undefined)
			.orderBy(desc(observabilityEvents.timestamp))
			.limit(query.limit)
			.offset(query.offset);

		// Get summary statistics
		const stats = await db
			.select({
				totalEvents: sql<number>`count(*)`,
				eventsByType: sql<Record<string, number>>`
          json_object_agg(type, count) 
          FROM (
            SELECT type, COUNT(*) as count 
            FROM observability_events 
            ${conditions.length > 0 ? sql`WHERE ${and(...conditions)}` : sql``}
            GROUP BY type
          ) type_stats
        `,
				eventsBySeverity: sql<Record<string, number>>`
          json_object_agg(severity, count) 
          FROM (
            SELECT severity, COUNT(*) as count 
            FROM observability_events 
            ${conditions.length > 0 ? sql`WHERE ${and(...conditions)}` : sql``}
            GROUP BY severity
          ) severity_stats
        `,
			})
			.from(observabilityEvents)
			.where(conditions.length > 0 ? and(...conditions) : undefined);

		return NextResponse.json({
			events,
			pagination: {
				limit: query.limit,
				offset: query.offset,
				hasMore: events.length === query.limit,
			},
			stats: stats[0] || {
				totalEvents: 0,
				eventsByType: {},
				eventsBySeverity: {},
			},
		});
	} catch (error) {
		observabilityService.recordError(error as Error, {
			context: "observability_events_get",
		});

		return NextResponse.json(
			{ error: "Failed to fetch events" },
			{ status: 500 },
		);
	}
}

// POST /api/observability/events - Create new event
export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const eventData = createEventSchema.parse(body);

		const [event] = await db
			.insert(observabilityEvents)
			.values({
				...eventData,
				timestamp: new Date(),
			})
			.returning();

		// Also record through observability service for real-time streaming
		observabilityService.recordEvent(eventData);

		return NextResponse.json(event, { status: 201 });
	} catch (error) {
		observabilityService.recordError(error as Error, {
			context: "observability_events_post",
		});

		return NextResponse.json(
			{ error: "Failed to create event" },
			{ status: 500 },
		);
	}
}
