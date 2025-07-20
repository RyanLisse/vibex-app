// Force dynamic rendering to avoid build-time issues
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Kanban Board API Route
 *
 * Handles kanban board operations, task movements, and column management.
 *
 * Refactored to use base infrastructure patterns for consistent
 * error handling, request processing, and response formatting.
 */

import { type NextRequest, NextResponse } from "next/server";
import { BaseAPIHandler } from "@/lib/api/base";
import { ResponseBuilder } from "@/lib/api/base/response-builder";
	KanbanBoardConfigSchema,
	KanbanMoveSchema,
} from "@/src/schemas/enhanced-task-schemas";
import { GetKanbanQuerySchema, tasksKanbanService } from "./service";

/**
 * GET /api/tasks/kanban - Get kanban board data
 */
export async function GET(request: NextRequest) {
	return BaseAPIHandler.handle(request, async (context) => {
		// Parse and validate query parameters
		const queryParams = GetKanbanQuerySchema.parse({
			userId: context.query.userId,
			projectId: context.query.projectId,
			assignee: context.query.assignee,
		});

		// Get kanban board data from service
		const kanbanData = await tasksKanbanService.getKanbanBoard(
			queryParams,
			context,
		);

		// Return success response
		const response = ResponseBuilder.success(
			kanbanData,
			"Kanban board data retrieved successfully",
			context.requestId,
		);

		return NextResponse.json(response);
	});
}

/**
 * POST /api/tasks/kanban/move - Move task between columns
 */
export async function POST(request: NextRequest) {
	return BaseAPIHandler.handle(request, async (context) => {
		// Validate request body
		const body = await BaseAPIHandler.validateBody(request, KanbanMoveSchema);

		// Move task via service
		const result = await tasksKanbanService.moveTask(body, context);

		// Return success response
		const response = ResponseBuilder.success(
			result,
			"Task moved successfully",
			context.requestId,
		);

		return NextResponse.json(response);
	});
}

/**
 * PUT /api/tasks/kanban/config - Update kanban board configuration
 */
export async function PUT(request: NextRequest) {
	return BaseAPIHandler.handle(request, async (context) => {
		// Validate request body
		const body = await BaseAPIHandler.validateBody(
			request,
			KanbanBoardConfigSchema,
		);

		// Update configuration via service
		const config = await tasksKanbanService.updateKanbanConfig(body, context);

		// Return success response
		const response = ResponseBuilder.success(
			config,
			"Kanban configuration updated successfully",
			context.requestId,
		);

		return NextResponse.json(response);
	});
}
