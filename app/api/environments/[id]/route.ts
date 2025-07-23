/**
 * Individual Environment API Routes
 */

import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { environments } from "@/db/schema";
import { observability } from "@/lib/observability";

const UpdateEnvironmentSchema = z.object({
	name: z.string().min(1).max(255).optional(),
	config: z.record(z.string(), z.any()).optional(),
	isActive: z.boolean().optional(),
	schemaVersion: z.number().int().optional(),
});

/**
 * GET /api/environments/[id] - Get environment by ID
 */
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
	return observability.trackOperation("api.environments.get", async () => {
		try {
			const [environment] = await db
				.select()
				.from(environments)
				.where(eq(environments.id, params.id))
				.limit(1);

			if (!environment) {
				return NextResponse.json(
					{ success: false, error: "Environment not found" },
					{ status: 404 }
				);
			}

			observability.recordEvent("api.environments.retrieved", {
				environmentId: params.id,
			});

			return NextResponse.json({
				success: true,
				data: environment,
			});
		} catch (error) {
			observability.recordError("api.environments.get-failed", error as Error);

			return NextResponse.json(
				{
					success: false,
					error: "Failed to get environment",
					message: error instanceof Error ? error.message : "Unknown error",
				},
				{ status: 500 }
			);
		}
	});
}

/**
 * PATCH /api/environments/[id] - Update environment
 */
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
	return observability.trackOperation("api.environments.update", async () => {
		try {
			const body = await request.json();
			const validatedData = UpdateEnvironmentSchema.parse(body);

			// If this environment is being set as active, deactivate others
			if (validatedData.isActive) {
				await db
					.update(environments)
					.set({ isActive: false })
					.where(eq(environments.isActive, true));
			}

			const [environment] = await db
				.update(environments)
				.set({
					...validatedData,
					updatedAt: new Date(),
				})
				.where(eq(environments.id, params.id))
				.returning();

			if (!environment) {
				return NextResponse.json(
					{ success: false, error: "Environment not found" },
					{ status: 404 }
				);
			}

			observability.recordEvent("api.environments.updated", {
				environmentId: params.id,
				changes: Object.keys(validatedData),
			});

			return NextResponse.json({
				success: true,
				data: environment,
			});
		} catch (error) {
			observability.recordError("api.environments.update-failed", error as Error);

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
					error: "Failed to update environment",
					message: error instanceof Error ? error.message : "Unknown error",
				},
				{ status: 500 }
			);
		}
	});
}

/**
 * DELETE /api/environments/[id] - Delete environment
 */
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
	return observability.trackOperation("api.environments.delete", async () => {
		try {
			const [deletedEnvironment] = await db
				.delete(environments)
				.where(eq(environments.id, params.id))
				.returning();

			if (!deletedEnvironment) {
				return NextResponse.json(
					{ success: false, error: "Environment not found" },
					{ status: 404 }
				);
			}

			observability.recordEvent("api.environments.deleted", {
				environmentId: params.id,
				name: deletedEnvironment.name,
			});

			return NextResponse.json({
				success: true,
				message: "Environment deleted successfully",
			});
		} catch (error) {
			observability.recordError("api.environments.delete-failed", error as Error);

			return NextResponse.json(
				{
					success: false,
					error: "Failed to delete environment",
					message: error instanceof Error ? error.message : "Unknown error",
				},
				{ status: 500 }
			);
		}
	});
}
