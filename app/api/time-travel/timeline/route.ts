/**
 * Time-Travel Timeline API
 *
 * Provides execution timeline data for visualization and debugging.
 */

import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { timeTravelDebug } from "@/lib/time-travel/debug-service";

const GetTimelineSchema = z.object({
	executionId: z.string().uuid(),
});

export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);

		const queryData = {
			executionId: searchParams.get("executionId"),
		};

		const validatedData = GetTimelineSchema.parse(queryData);

		const timeline = await timeTravelDebug.getExecutionTimeline(validatedData.executionId);

		return NextResponse.json({
			success: true,
			data: timeline,
		});
	} catch (error) {
		console.error("Error getting timeline:", error);

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
				error: "Failed to get timeline",
				message: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 }
		);
	}
}
