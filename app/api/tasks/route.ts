/**
 * Tasks API Route
 * Handles CRUD operations for tasks with database integration
 */

import { and, asc, desc, eq, sql } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { tasks } from "@/db/schema";
import { observability } from "@/lib/observability";

// Validation schemas
const CreateTaskSchema = z.object({
	title: z.string().min(1).max(255),
	description: z.string().optional(),
	status: z
		.enum(["pending", "in_progress", "completed", "cancelled"])
		.default("pending"),
	priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
	userId: z.string().optional(),
	metadata: z.record(z.string(), z.any()).optional(),
});

const UpdateTaskSchema = CreateTaskSchema.partial();

const QuerySchema = z.object({
	status: z.string().optional(),
	priority: z.string().optional(),
	userId: z.string().optional(),
	limit: z.coerce.number().min(1).max(100).default(20),
	offset: z.coerce.number().min(0).default(0),
	orderBy: z
		.enum(["createdAt", "updatedAt", "title", "priority"])
		.default("createdAt"),
	order: z.enum(["asc", "desc"]).default("desc"),
});

/**
 * GET /api/tasks - Fetch tasks with filters
 */
export async function GET(request: NextRequest) {
	return observability.trackOperation("api.tasks.get", async () => {
		try {
			const { searchParams } = new URL(request.url);
			const query = QuerySchema.parse(Object.fromEntries(searchParams));

			// Build where conditions
			const conditions = [];
			if (query.status) {
				conditions.push(eq(tasks.status, query.status));
			}
			if (query.priority) {
				conditions.push(eq(tasks.priority, query.priority));
			}
			if (query.userId) {
				conditions.push(eq(tasks.userId, query.userId));
			}

			// Build order by
			const orderByField = tasks[query.orderBy as keyof typeof tasks];
			const orderDirection = query.order === "asc" ? asc : desc;

			// Execute query
			const result = await db
				.select()
				.from(tasks)
				.where(conditions.length > 0 ? and(...conditions) : undefined)
				.orderBy(orderDirection(orderByField))
				.limit(query.limit)
				.offset(query.offset);

			// Get total count for pagination
			const totalResult = await db
				.select({ count: sql<number>`count(*)` })
				.from(tasks)
				.where(conditions.length > 0 ? and(...conditions) : undefined);

			const total = totalResult[0]?.count || 0;

			return NextResponse.json({
				tasks: result,
				total,
				limit: query.limit,
				offset: query.offset,
			});
		} catch (error) {
			console.error("Failed to fetch tasks:", error);
			observability.recordError("api.tasks.get", error as Error);

			if (error instanceof z.ZodError) {
				return NextResponse.json(
					{ error: "Invalid query parameters", details: error.issues },
					{ status: 400 },
				);
			}

			return NextResponse.json(
				{ error: "Failed to fetch tasks" },
				{ status: 500 },
			);
		}
	});
}

/**
 * POST /api/tasks - Create a new task
 */
export async function POST(request: NextRequest) {
	return observability.trackOperation("api.tasks.create", async () => {
		try {
			const body = await request.json();
			const validatedData = CreateTaskSchema.parse(body);

			const result = await db
				.insert(tasks)
				.values({
					...validatedData,
					createdAt: new Date(),
					updatedAt: new Date(),
				})
				.returning();

			const newTask = result[0];

			return NextResponse.json(newTask, { status: 201 });
		} catch (error) {
			console.error("Failed to create task:", error);
			observability.recordError("api.tasks.create", error as Error);

			if (error instanceof z.ZodError) {
				return NextResponse.json(
					{ error: "Invalid task data", details: error.issues },
					{ status: 400 },
				);
			}

			return NextResponse.json(
				{ error: "Failed to create task" },
				{ status: 500 },
			);
		}
	});
}
