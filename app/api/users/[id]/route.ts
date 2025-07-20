// Force dynamic rendering to avoid build-time issues
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Individual User API Route
 *
 * Handles operations on specific users including profile updates
 * and account management with full database integration.
 *
 * Refactored to use base infrastructure patterns for consistent
 * error handling, request processing, and response formatting.
 */

import { type NextRequest, NextResponse } from "next/server";
import { BaseAPIHandler, ValidationError } from "@/lib/api/base";
import { ResponseBuilder } from "@/lib/api/base/response-builder";
import { UpdateUserSchema } from "@/src/schemas/api-routes";
import { usersService } from "../service";

/**
 * GET /api/users/[id] - Get user by ID
 */
export async function GET(
	request: NextRequest,
	{ params }: { params: { id: string } },
) {
	return BaseAPIHandler.handle(request, async (context) => {
		const { id } = params;

		if (!id) {
			throw new ValidationError("User ID is required");
		}

		// Get user from service
		const user = await usersService.getById(id, context);

		// Return success response
		const response = ResponseBuilder.success(
			user,
			"User retrieved successfully",
			context.requestId,
		);

		return NextResponse.json(response);
	});
}

/**
 * PUT /api/users/[id] - Update user
 */
export async function PUT(
	request: NextRequest,
	{ params }: { params: { id: string } },
) {
	return BaseAPIHandler.handle(request, async (context) => {
		const { id } = params;

		if (!id) {
			throw new ValidationError("User ID is required");
		}

		// Validate request body
		const body = await BaseAPIHandler.validateBody(request, UpdateUserSchema);

		// Update user via service
		const user = await usersService.update(id, body, context);

		// Return updated response
		const response = ResponseBuilder.updated(
			user,
			"User updated successfully",
			context.requestId,
		);

		return NextResponse.json(response);
	});
}

/**
 * DELETE /api/users/[id] - Deactivate user (soft delete)
 */
export async function DELETE(
	request: NextRequest,
	{ params }: { params: { id: string } },
) {
	return BaseAPIHandler.handle(request, async (context) => {
		const { id } = params;

		if (!id) {
			throw new ValidationError("User ID is required");
		}

		// Deactivate user via service
		await usersService.deactivate(id, context);

		// Return deleted response
		const response = ResponseBuilder.deleted(
			"User deactivated successfully",
			context.requestId,
		);

		return NextResponse.json(response);
	});
}
