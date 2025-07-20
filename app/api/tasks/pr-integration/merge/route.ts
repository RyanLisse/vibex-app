// Force dynamic rendering to avoid build-time issues
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * PR Merge API Route
 *
 * Handles PR merge operations and automatic task status updates.
 *
 * Refactored to use base infrastructure patterns for consistent
 * error handling, request processing, and response formatting.
 */

import { type NextRequest, NextResponse } from "next/server";
import { BaseAPIHandler } from "@/lib/api/base";
import { ResponseBuilder } from "@/lib/api/base/response-builder";
import { MergePRSchema, prIntegrationService } from "../service";

/**
 * POST /api/tasks/pr-integration/merge - Merge PR and update linked tasks
 */
export async function POST(request: NextRequest) {
	return BaseAPIHandler.handle(request, async (context) => {
		// Validate request body
		const body = await BaseAPIHandler.validateBody(request, MergePRSchema);

		// Merge PR via service
		const result = await prIntegrationService.mergePR(body, context);

		// Return success response
		const response = ResponseBuilder.success(
			result,
			"PR merged successfully",
			context.requestId,
		);

		return NextResponse.json(response);
	});
}
