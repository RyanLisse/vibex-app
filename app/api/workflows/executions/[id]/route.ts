/**
 * Individual Workflow Execution API Routes
 */

import { type NextRequest, NextResponse } from "next/server";
import { observability } from "@/lib/observability";
import { workflowEngine } from "@/lib/workflow/workflow-engine";

/**
 * GET /api/workflows/executions/[id] - Get execution details
 */
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
	return observability.trackOperation("api.workflows.get-execution", async () => {
		try {
			const execution = await workflowEngine.getExecution(params.id);

			if (!execution) {
				return NextResponse.json({ success: false, error: "Execution not found" }, { status: 404 });
			}

			return NextResponse.json({
				success: true,
				data: execution,
			});
		} catch (error) {
			observability.recordError("api.workflows.get-execution-failed", error as Error);

			return NextResponse.json(
				{
					success: false,
					error: "Failed to get execution",
					message: error instanceof Error ? error.message : "Unknown error",
				},
				{ status: 500 }
			);
		}
	});
}

/**
 * PATCH /api/workflows/executions/[id] - Control execution (pause/resume/cancel)
 */
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
	return observability.trackOperation("api.workflows.control-execution", async () => {
		try {
			const body = await request.json();
			const { action } = body;

			switch (action) {
				case "pause":
					await workflowEngine.pauseExecution(params.id);
					break;
				case "resume":
					await workflowEngine.resumeExecution(params.id);
					break;
				case "cancel":
					await workflowEngine.cancelExecution(params.id);
					break;
				default:
					return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
			}

			observability.recordEvent("api.workflows.execution-controlled", {
				executionId: params.id,
				action,
			});

			return NextResponse.json({
				success: true,
				message: `Execution ${action}d successfully`,
			});
		} catch (error) {
			observability.recordError("api.workflows.control-execution-failed", error as Error);

			return NextResponse.json(
				{
					success: false,
					error: "Failed to control execution",
					message: error instanceof Error ? error.message : "Unknown error",
				},
				{ status: 500 }
			);
		}
	});
}
