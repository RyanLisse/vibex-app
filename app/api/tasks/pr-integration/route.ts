// Force dynamic rendering to avoid build-time issues
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * PR Status Integration API Route
 *
 * Handles GitHub PR integration, status updates, and webhook processing.
 *
 * Refactored to use base infrastructure patterns for consistent
 * error handling, request processing, and response formatting.
 */

import { type NextRequest, NextResponse } from "next/server";
import { BaseAPIHandler } from "@/lib/api/base";
import { ResponseBuilder } from "@/lib/api/base/response-builder";
import {
	PRStatusSchema,
	TaskPRLinkSchema,
} from "@/src/schemas/enhanced-task-schemas";
import { GetPRIntegrationQuerySchema, prIntegrationService } from "./service";

/**
 * POST /api/tasks/pr-integration/link - Link task to PR
 */
export async function POST(request: NextRequest) {
	return BaseAPIHandler.handle(request, async (context) => {
		// Validate request body
		const body = await BaseAPIHandler.validateBody(request, TaskPRLinkSchema);

		// Link task to PR via service
		const result = await prIntegrationService.linkTaskToPR(body, context);

		// Return created response
		const response = ResponseBuilder.created(
			result,
			"PR linked successfully",
			context.requestId,
		);

		return NextResponse.json(response, { status: 201 });
	});
}

/**
 * PUT /api/tasks/pr-integration/status - Update PR status
 */
export async function PUT(request: NextRequest) {
	return BaseAPIHandler.handle(request, async (context) => {
		// Validate request body
		const body = await BaseAPIHandler.validateBody(request, PRStatusSchema);

		// Update PR status via service
		const result = await prIntegrationService.updatePRStatus(body, context);

		// Return success response with detailed data
		const response = ResponseBuilder.success(
			{
				prStatus: result.prStatus,
				updatedTasks: result.updatedTasks,
				autoUpdatedCount: result.autoUpdatedCount,
			},
			"PR status updated successfully",
			context.requestId,
		);

		return NextResponse.json(response);
	});
}

/**
 * GET /api/tasks/pr-integration - Get PR integration data
 */
export async function GET(request: NextRequest) {
	return BaseAPIHandler.handle(request, async (context) => {
		// Parse and validate query parameters
		const queryParams = GetPRIntegrationQuerySchema.parse({
			taskId: context.query.taskId,
			userId: context.query.userId,
		});

		// Get PR integration data from service
		const result = await prIntegrationService.getPRIntegrationData(
			queryParams,
			context,
		);

		// Return success response
		const response = ResponseBuilder.success(
			result,
			"PR integration data retrieved successfully",
			context.requestId,
		);

		return NextResponse.json(response);
	});
}
