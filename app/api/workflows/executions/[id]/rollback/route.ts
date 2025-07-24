/**
 * Workflow Execution Rollback API Route
 */

import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { observability } from "@/lib/observability";
import { workflowEngine } from "@/lib/workflow/workflow-engine";

const RollbackSchema = z.object({
	checkpointIndex: z.number().int().min(0),
});

/**
 * POST /api/workflows/executions/[id]/rollback - Rollback to checkpoint
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	return observability.trackOperation("api.workflows.rollback", async () => {
		try {
			const { id } = await params;
			const body = await request.json();
			const validatedData = RollbackSchema.parse(body);

			await workflowEngine.rollbackToCheckpoint(id, validatedData.checkpointIndex);

			observability.recordEvent("api.workflows.rollback-completed", {
				executionId: id,
				checkpointIndex: validatedData.checkpointIndex,
			});

			return NextResponse.json({
				success: true,
				message: "Rollback completed successfully",
			});
		} catch (error) {
			observability.recordError("api.workflows.rollback-failed", error as Error);

			if (error instanceof z.ZodError) {
				return NextResponse.json(
					{
						success: false,
						error: "Validation failed",
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
					error: "Failed to rollback execution",
					message: error instanceof Error ? error.message : "Unknown error",
				},
				{ status: 500 }
			);
		}
	});
}
