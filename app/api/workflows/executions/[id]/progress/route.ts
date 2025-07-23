/**
 * Workflow Execution Progress API Route
 */

import { type NextRequest, NextResponse } from "next/server";
import { observability } from "@/lib/observability";
import { workflowEngine } from "@/lib/workflow/workflow-engine";

/**
 * GET /api/workflows/executions/[id]/progress - Get execution progress
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	return observability.trackOperation("api.workflows.get-progress", async () => {
		try {
			const { id } = await params;
			const progress = await workflowEngine.getProgress(id);

			if (!progress) {
				return NextResponse.json({ success: false, error: "Execution not found" }, { status: 404 });
			}

			return NextResponse.json({
				success: true,
				data: progress,
			});
		} catch (error) {
			observability.recordError("api.workflows.get-progress-failed", error as Error);

			return NextResponse.json(
				{
					success: false,
					error: "Failed to get execution progress",
					message: error instanceof Error ? error.message : "Unknown error",
				},
				{ status: 500 }
			);
		}
	});
}
