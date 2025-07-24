/**
 * Time-Travel Snapshots API
 *
 * Handles creation and retrieval of execution snapshots for time-travel debugging.
 */

import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { timeTravelDebug } from "@/lib/time-travel/debug-service";

// Request schemas
const CreateSnapshotSchema = z.object({
	executionId: z.string().uuid(),
	stepNumber: z.number().int().min(0),
	state: z.record(z.string(), z.unknown()),
	type: z.enum(["step_start", "step_end", "checkpoint", "error", "rollback", "manual"]).optional(),
	description: z.string().optional(),
	checkpoint: z.boolean().optional(),
	metadata: z.record(z.string(), z.unknown()).optional(),
});

const GetSnapshotsSchema = z.object({
	executionId: z.string().uuid(),
	fromStep: z.number().int().min(0).optional(),
	toStep: z.number().int().min(0).optional(),
	checkpointsOnly: z.boolean().optional(),
});

export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const validatedData = CreateSnapshotSchema.parse(body);

		const snapshotId = await timeTravelDebug.createSnapshot(
			validatedData.executionId,
			validatedData.stepNumber,
			validatedData.state,
			validatedData.type,
			validatedData.description,
			validatedData.checkpoint,
			validatedData.metadata
		);

		return NextResponse.json({
			success: true,
			data: { snapshotId },
		});
	} catch (error) {
		console.error("Error creating snapshot:", error);

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
				error: "Failed to create snapshot",
				message: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 }
		);
	}
}

export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);

		const queryData = {
			executionId: searchParams.get("executionId"),
			fromStep: searchParams.get("fromStep")
				? Number.parseInt(searchParams.get("fromStep")!)
				: undefined,
			toStep: searchParams.get("toStep") ? Number.parseInt(searchParams.get("toStep")!) : undefined,
			checkpointsOnly: searchParams.get("checkpointsOnly") === "true",
		};

		const validatedData = GetSnapshotsSchema.parse(queryData);

		const snapshots = await timeTravelDebug.getExecutionSnapshots(validatedData.executionId, {
			fromStep: validatedData.fromStep,
			toStep: validatedData.toStep,
			checkpointsOnly: validatedData.checkpointsOnly,
		});

		return NextResponse.json({
			success: true,
			data: snapshots,
		});
	} catch (error) {
		console.error("Error getting snapshots:", error);

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
				error: "Failed to get snapshots",
				message: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 }
		);
	}
}
