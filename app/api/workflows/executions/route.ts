/**
 * Workflow Execution API Routes
 */

import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { observability } from "@/lib/observability";
import { workflowEngine } from "@/lib/workflow/workflow-engine";

const StartExecutionSchema = z.object({
	workflowId: z.string(),
	triggeredBy: z.string(),
	initialVariables: z.record(z.string(), z.any()).optional(),
	parentExecutionId: z.string().optional(),
});

/**
 * POST /api/workflows/executions - Start workflow execution
 */
export async function POST(request: NextRequest) {
	return observability.trackOperation("api.workflows.start-execution", async () => {
		try {
			const body = await request.json();
			const validatedData = StartExecutionSchema.parse(body);

			const executionId = await workflowEngine.startExecution(
				validatedData.workflowId,
				validatedData.triggeredBy,
				validatedData.initialVariables,
				validatedData.parentExecutionId
			);

			observability.recordEvent("api.workflows.execution-started", {
				executionId,
				workflowId: validatedData.workflowId,
				triggeredBy: validatedData.triggeredBy,
			});

			return NextResponse.json({
				success: true,
				data: { executionId },
			});
		} catch (error) {
			observability.recordError("api.workflows.start-execution-failed", error as Error);

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
					error: "Failed to start execution",
					message: error instanceof Error ? error.message : "Unknown error",
				},
				{ status: 500 }
			);
		}
	});
}

/**
 * GET /api/workflows/executions - Get workflow executions
 */
export async function GET(request: NextRequest) {
	return observability.trackOperation("api.workflows.list-executions", async () => {
		try {
			const { searchParams } = new URL(request.url);
			const workflowId = searchParams.get("workflowId");
			const status = searchParams.get("status") as any;
			const limit = searchParams.get("limit") ? Number.parseInt(searchParams.get("limit")!) : 50;

			const executions = await workflowEngine.getExecutions(workflowId || undefined, status, limit);

			return NextResponse.json({
				success: true,
				data: executions,
			});
		} catch (error) {
			observability.recordError("api.workflows.list-executions-failed", error as Error);

			return NextResponse.json(
				{
					success: false,
					error: "Failed to get executions",
					message: error instanceof Error ? error.message : "Unknown error",
				},
				{ status: 500 }
			);
		}
	});
}
