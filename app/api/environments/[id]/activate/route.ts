/**
 * Environment Activation API Route
 */

import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { environments } from "@/db/schema";
import { observability } from "@/lib/observability";

/**
 * POST /api/environments/[id]/activate - Activate environment
 */
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
	return observability.trackOperation("api.environments.activate", async () => {
		try {
			// First, deactivate all environments
			await db
				.update(environments)
				.set({ isActive: false, updatedAt: new Date() })
				.where(eq(environments.isActive, true));

			// Then activate the specified environment
			const [environment] = await db
				.update(environments)
				.set({ isActive: true, updatedAt: new Date() })
				.where(eq(environments.id, params.id))
				.returning();

			if (!environment) {
				return NextResponse.json(
					{ success: false, error: "Environment not found" },
					{ status: 404 }
				);
			}

			observability.recordEvent("api.environments.activated", {
				environmentId: params.id,
				name: environment.name,
			});

			return NextResponse.json({
				success: true,
				data: environment,
				message: "Environment activated successfully",
			});
		} catch (error) {
			observability.recordError("api.environments.activate-failed", error as Error);

			return NextResponse.json(
				{
					success: false,
					error: "Failed to activate environment",
					message: error instanceof Error ? error.message : "Unknown error",
				},
				{ status: 500 }
			);
		}
	});
}
