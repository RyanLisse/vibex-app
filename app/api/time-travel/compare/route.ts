/**
 * Time-Travel Comparison API
 *
 * Provides execution comparison functionality for debugging failed runs.
 */

import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { timeTravelDebug } from "@/lib/time-travel/debug-service";

const CompareExecutionsSchema = z.object({
	executionIdA: z.string().uuid(),
	executionIdB: z.string().uuid(),
});

export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const validatedData = CompareExecutionsSchema.parse(body);

		const comparison = await timeTravelDebug.compareExecutions(
			validatedData.executionIdA,
			validatedData.executionIdB
		);

		return NextResponse.json({
			success: true,
			data: comparison,
		});
	} catch (error) {
		console.error("Error comparing executions:", error);

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
				error: "Failed to compare executions",
				message: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 }
		);
	}
}
