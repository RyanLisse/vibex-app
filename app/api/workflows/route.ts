/**
 * Workflow Management API Routes
 */

import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { observability } from "@/lib/observability";
import { workflowEngine } from "@/lib/workflow/workflow-engine";

const WorkflowStepSchema = z.object({
	id: z.string(),
	name: z.string(),
	type: z.enum(["action", "condition", "parallel", "sequential"]),
	config: z.record(z.string(), z.any()),
	dependencies: z.array(z.string()).optional(),
	timeout: z.number().optional(),
	retryPolicy: z
		.object({
			maxRetries: z.number(),
			backoffMs: z.number(),
			exponential: z.boolean(),
		})
		.optional(),
});

const CreateWorkflowSchema = z.object({
	name: z.string().min(1),
	description: z.string().optional(),
	version: z.number().int().positive(),
	steps: z.array(WorkflowStepSchema),
	triggers: z
		.array(
			z.object({
				type: z.enum(["manual", "scheduled", "event"]),
				config: z.record(z.string(), z.any()),
			})
		)
		.optional(),
	variables: z.record(z.string(), z.any()).optional(),
	timeout: z.number().optional(),
	tags: z.array(z.string()).optional(),
});

const StartExecutionSchema = z.object({
	workflowId: z.string(),
	triggeredBy: z.string(),
	initialVariables: z.record(z.string(), z.any()).optional(),
	parentExecutionId: z.string().optional(),
});

/**
 * POST /api/workflows - Create a new workflow
 */
export async function POST(request: NextRequest) {
	return observability.trackOperation("api.workflows.create", async () => {
		try {
			const body = await request.json();
			const validatedData = CreateWorkflowSchema.parse(body);

			const workflow = await workflowEngine.createWorkflow(validatedData);

			observability.recordEvent("api.workflows.created", {
				workflowId: workflow.id,
				name: validatedData.name,
				stepsCount: validatedData.steps.length,
			});

			return NextResponse.json({
				success: true,
				data: workflow,
			});
		} catch (error) {
			observability.recordError("api.workflows.create-failed", error as Error);

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
					error: "Failed to create workflow",
					message: error instanceof Error ? error.message : "Unknown error",
				},
				{ status: 500 }
			);
		}
	});
}

/**
 * GET /api/workflows - Get workflows
 */
export async function GET(request: NextRequest) {
	return observability.trackOperation("api.workflows.list", async () => {
		try {
			const { searchParams } = new URL(request.url);
			const workflowId = searchParams.get("workflowId");

			if (workflowId) {
				const workflow = await workflowEngine.getWorkflow(workflowId);
				if (!workflow) {
					return NextResponse.json(
						{ success: false, error: "Workflow not found" },
						{ status: 404 }
					);
				}
				return NextResponse.json({ success: true, data: workflow });
			}

			const { searchParams } = new URL(request.url);
			const isActive = searchParams.get("isActive");
			const limit = searchParams.get("limit") ? Number.parseInt(searchParams.get("limit")!) : 50;
			const offset = searchParams.get("offset") ? Number.parseInt(searchParams.get("offset")!) : 0;

			const workflows = await workflowEngine.listWorkflows(
				isActive === "true" ? true : isActive === "false" ? false : undefined,
				limit,
				offset
			);

			return NextResponse.json({
				success: true,
				data: workflows,
			});
		} catch (error) {
			observability.recordError("api.workflows.list-failed", error as Error);

			return NextResponse.json(
				{
					success: false,
					error: "Failed to get workflows",
					message: error instanceof Error ? error.message : "Unknown error",
				},
				{ status: 500 }
			);
		}
	});
}
