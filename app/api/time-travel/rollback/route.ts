/**
 * Time-Travel Rollback API
 *
 * Handles rollback operations to previous consistent states.
 */

import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { timeTravelDebug } from "@/lib/time-travel/debug-service";

const GetRollbackPointsSchema = z.object({
	executionId: z.string().uuid(),
});

const RollbackSchema = z.object({
	executionId: z.string().uuid(),
	checkpointId: z.string().uuid(),
	reason: z.string().min(1).max(500),
});

export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);

		const queryData = {
			executionId: searchParams.get("executionId"),
		};

		const validatedData = GetRollbackPointsSchema.parse(queryData);

		const rollbackPoints = await timeTravelDebug.getRollbackPoints(validatedData.executionId);

		return NextResponse.json({
			success: true,
			data: rollbackPoints,
		});
	} catch (error) {
		console.error("Error getting rollback points:", error);

		if (error instanceof z.ZodError) {
			return NextResponse.json(
				{
					success: false,
					error: "Invalid query parameters",
					details: error.issues.map((issue) => ({
						field: issue.path.join("."),
						message: issue.message,
					})),
				},
				{ status: 400 }
			);
		}

		return NextResponse.json(
			{
				success: false,
				error: "Failed to get rollback points",
				message: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 }
		);
	}
}

export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const validatedData = RollbackSchema.parse(body);

		const success = await timeTravelDebug.rollbackToCheckpoint(
			validatedData.executionId,
			validatedData.checkpointId,
			validatedData.reason
		);

		return NextResponse.json({
			success,
			message: success ? "Rollback completed successfully" : "Rollback failed",
		});
	} catch (error) {
		console.error("Error performing rollback:", error);

		if (error instanceof z.ZodError) {
			return NextResponse.json(
				{
					success: false,
					error: "Invalid request data",
					details: error.issues.map((issue) => ({
						field: issue.path.join("."),
						message: issue.message,
					})),
				},
				{ status: 400 }
			);
		}

		return NextResponse.json(
			{
				success: false,
				error: "Failed to perform rollback",
				message: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 }
		);
	}
}
