/**
 * Individual Task API Route
 * Handles operations for a specific task
 */

import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { tasks } from "@/db/schema";
import { observability } from "@/lib/observability";

// Validation schemas
const UpdateTaskSchema = z.object({
	title: z.string().min(1).max(255).optional(),
	description: z.string().optional(),
	status: z
		.enum(["pending", "in_progress", "completed", "cancelled"])
		.optional(),
	priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
	userId: z.string().optional(),
	metadata: z.record(z.string(), z.any()).optional(),
});

/**
 * GET /api/tasks/[id] - Fetch a specific task
 */
export async function GET(
	request: NextRequest,
	{ params }: { params: { id: string } },
) {
	return observability.trackOperation("api.tasks.get-by-id", async () => {
		try {
			const { id } = params;

			if (!id) {
				return NextResponse.json(
					{ error: "Task ID is required" },
					{ status: 400 },
				);
			}

			const result = await db
				.select()
				.from(tasks)
				.where(eq(tasks.id, id))
				.limit(1);

			if (result.length === 0) {
				return NextResponse.json({ error: "Task not found" }, { status: 404 });
			}

			return NextResponse.json(result[0]);
		} catch (error) {
			console.error("Failed to fetch task:", error);
			observability.recordError("api.tasks.get-by-id", error as Error);

			return NextResponse.json(
				{ error: "Failed to fetch task" },
				{ status: 500 },
			);
		}
	});
}

/**
 * PATCH /api/tasks/[id] - Update a specific task
 */
export async function PATCH(
	request: NextRequest,
	{ params }: { params: { id: string } },
) {
	return observability.trackOperation("api.tasks.update", async () => {
		try {
			const { id } = params;

			if (!id) {
				return NextResponse.json(
					{ error: "Task ID is required" },
					{ status: 400 },
				);
			}

			const body = await request.json();
			const validatedData = UpdateTaskSchema.parse(body);

			// Check if task exists
			const existingTask = await db
				.select()
				.from(tasks)
				.where(eq(tasks.id, id))
				.limit(1);

			if (existingTask.length === 0) {
				return NextResponse.json({ error: "Task not found" }, { status: 404 });
			}

			// Update task
			const result = await db
				.update(tasks)
				.set({
					...validatedData,
					updatedAt: new Date(),
				})
				.where(eq(tasks.id, id))
				.returning();

			return NextResponse.json(result[0]);
		} catch (error) {
			console.error("Failed to update task:", error);
			observability.recordError("api.tasks.update", error as Error);

			if (error instanceof z.ZodError) {
				return NextResponse.json(
					{ error: "Invalid task data", details: error.issues },
					{ status: 400 },
				);
			}

			return NextResponse.json(
				{ error: "Failed to update task" },
				{ status: 500 },
			);
		}
	});
}

/**
 * DELETE /api/tasks/[id] - Delete a specific task
 */
export async function DELETE(
	request: NextRequest,
	{ params }: { params: { id: string } },
) {
	return observability.trackOperation("api.tasks.delete", async () => {
		try {
			const { id } = params;

			if (!id) {
				return NextResponse.json(
					{ error: "Task ID is required" },
					{ status: 400 },
				);
			}

			// Check if task exists
			const existingTask = await db
				.select()
				.from(tasks)
				.where(eq(tasks.id, id))
				.limit(1);

			if (existingTask.length === 0) {
				return NextResponse.json({ error: "Task not found" }, { status: 404 });
			}

			// Delete task
			await db.delete(tasks).where(eq(tasks.id, id));

			return NextResponse.json({ success: true });
		} catch (error) {
			console.error("Failed to delete task:", error);
			observability.recordError("api.tasks.delete", error as Error);

			return NextResponse.json(
				{ error: "Failed to delete task" },
				{ status: 500 },
			);
		}
	});
}
