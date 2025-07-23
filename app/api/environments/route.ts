/**
 * Environment Management API Routes
 */

import { and, desc, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { type Environment, environments, type NewEnvironment } from "@/db/schema";
import { observability } from "@/lib/observability";

const CreateEnvironmentSchema = z.object({
	name: z.string().min(1).max(255),
	config: z.record(z.string(), z.any()),
	isActive: z.boolean().optional(),
	userId: z.string().optional(),
	schemaVersion: z.number().int().optional(),
});

const UpdateEnvironmentSchema = z.object({
	name: z.string().min(1).max(255).optional(),
	config: z.record(z.string(), z.any()).optional(),
	isActive: z.boolean().optional(),
	schemaVersion: z.number().int().optional(),
});

/**
 * GET /api/environments - Get environments
 */
export async function GET(request: NextRequest) {
	return observability.trackOperation("api.environments.list", async () => {
		try {
			const { searchParams } = new URL(request.url);
			const isActive = searchParams.get("isActive");
			const userId = searchParams.get("userId");

			let query = db.select().from(environments);

			// Apply filters
			const conditions = [];
			if (isActive !== null) {
				conditions.push(eq(environments.isActive, isActive === "true"));
			}
			if (userId) {
				conditions.push(eq(environments.userId, userId));
			}

			if (conditions.length > 0) {
				query = query.where(and(...conditions));
			}

			const result = await query.orderBy(desc(environments.createdAt));

			observability.recordEvent("api.environments.listed", {
				count: result.length,
				filters: { isActive, userId },
			});

			return NextResponse.json({
				success: true,
				data: result,
			});
		} catch (error) {
			observability.recordError("api.environments.list-failed", error as Error);

			return NextResponse.json(
				{
					success: false,
					error: "Failed to get environments",
					message: error instanceof Error ? error.message : "Unknown error",
				},
				{ status: 500 }
			);
		}
	});
}

/**
 * POST /api/environments - Create environment
 */
export async function POST(request: NextRequest) {
	return observability.trackOperation("api.environments.create", async () => {
		try {
			const body = await request.json();
			const validatedData = CreateEnvironmentSchema.parse(body);

			// If this environment is being set as active, deactivate others
			if (validatedData.isActive) {
				await db
					.update(environments)
					.set({ isActive: false })
					.where(eq(environments.isActive, true));
			}

			const [environment] = await db
				.insert(environments)
				.values({
					name: validatedData.name,
					config: validatedData.config,
					isActive: validatedData.isActive || false,
					userId: validatedData.userId,
					schemaVersion: validatedData.schemaVersion || 1,
				})
				.returning();

			observability.recordEvent("api.environments.created", {
				environmentId: environment.id,
				name: validatedData.name,
				isActive: validatedData.isActive,
			});

			return NextResponse.json({
				success: true,
				data: environment,
			});
		} catch (error) {
			observability.recordError("api.environments.create-failed", error as Error);

			if (error instanceof z.ZodError) {
				return NextResponse.json(
					{
						success: false,
						error: "Validation failed",
						details: error.issues.map(issue => ({ field: issue.path.join("."), message: issue.message })),
					},
					{ status: 400 }
				);
			}

			return NextResponse.json(
				{
					success: false,
					error: "Failed to create environment",
					message: error instanceof Error ? error.message : "Unknown error",
				},
				{ status: 500 }
			);
		}
	});
}
