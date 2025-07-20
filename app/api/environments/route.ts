// Force dynamic rendering to avoid build-time issues
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Environments API Route
 *
 * Enhanced API route with Drizzle ORM integration, Zod validation,
 * OpenTelemetry tracing, and comprehensive error handling for environment management.
 *
 * Refactored to use base infrastructure patterns for consistent
 * error handling, request processing, and response formatting.
 */

import { type NextRequest, NextResponse } from "next/server";
import { BaseAPIHandler } from "@/lib/api/base";
import { ResponseBuilder } from "@/lib/api/base/response-builder";
import { CreateEnvironmentSchema } from "@/src/schemas/api-routes";
import {
	ActivateEnvironmentSchema,
	environmentsService,
	GetEnvironmentsQuerySchema,
} from "./service";

/**
 * GET /api/environments - Get environments with filtering and pagination
 */
export async function GET(request: NextRequest) {
	return BaseAPIHandler.handle(request, async (context) => {
		// Validate query parameters
		const queryParams = GetEnvironmentsQuerySchema.parse(context.query);

		// Get environments from service
		const result = await environmentsService.getAll(
			queryParams,
			{ page: queryParams.page, limit: queryParams.limit },
			context,
		);

		// Return paginated response
		const response = ResponseBuilder.fromQueryResult(
			{
				items: result.items,
				pagination: {
					page: queryParams.page,
					limit: queryParams.limit,
					total: result.total,
					totalPages: Math.ceil(result.total / queryParams.limit),
					hasNext:
						queryParams.page < Math.ceil(result.total / queryParams.limit),
					hasPrev: queryParams.page > 1,
				},
			},
			"Environments retrieved successfully",
			context.requestId,
		);

		return NextResponse.json(response);
	});
}

/**
 * POST /api/environments - Create a new environment
 */
export async function POST(request: NextRequest) {
	return BaseAPIHandler.handle(request, async (context) => {
		// Validate request body
		const body = await BaseAPIHandler.validateBody(
			request,
			CreateEnvironmentSchema,
		);

		// Create environment via service
		const environment = await environmentsService.create(body, context);

		// Return created response
		const response = ResponseBuilder.created(
			environment,
			"Environment created successfully",
			context.requestId,
		);

		return NextResponse.json(response, { status: 201 });
	});
}

/**
 * PUT /api/environments/activate - Activate an environment
 */
export async function PUT(request: NextRequest) {
	return BaseAPIHandler.handle(request, async (context) => {
		// Validate request body
		const body = await BaseAPIHandler.validateBody(
			request,
			ActivateEnvironmentSchema,
		);

		// Activate environment via service
		const environment = await environmentsService.activateEnvironment(
			body.environmentId,
			body.userId,
			context,
		);

		// Return success response
		const response = ResponseBuilder.success(
			environment,
			"Environment activated successfully",
			context.requestId,
		);

		return NextResponse.json(response);
	});
}
