// Force dynamic rendering to avoid build-time issues
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Users API Route
 *
 * Database-integrated user management with comprehensive authentication
 * provider support, session management, and observability.
 *
 * Refactored to use base infrastructure patterns for consistent
 * error handling, request processing, and response formatting.
 */

import { type NextRequest, NextResponse } from 'next/server'
import { BaseAPIHandler, ValidationError } from '@/lib/api/base'
import { ResponseBuilder } from '@/lib/api/base/response-builder'
import { CreateUserSchema } from '@/src/schemas/api-routes'
import { usersService, GetUsersQuerySchema, type GetUsersQuery } from './service'

/**
 * GET /api/users - Get users with filtering and pagination
 */
export async function GET(request: NextRequest) {
  return BaseAPIHandler.handle(request, async (context) => {
    // Validate query parameters
    const queryParams = GetUsersQuerySchema.parse(context.query)

    // Get users from service
    const result = await usersService.getAll(
      queryParams,
      { page: queryParams.page, limit: queryParams.limit },
      context
    )

    // Return paginated response
    const response = ResponseBuilder.fromQueryResult(
      {
        items: result.items,
        pagination: {
          page: queryParams.page,
          limit: queryParams.limit,
          total: result.total,
          totalPages: Math.ceil(result.total / queryParams.limit),
          hasNext: queryParams.page < Math.ceil(result.total / queryParams.limit),
          hasPrev: queryParams.page > 1,
        },
      },
      'Users retrieved successfully',
      context.requestId
    )

    return NextResponse.json(response)
  })
}

/**
 * POST /api/users - Create or update user (upsert)
 */
export async function POST(request: NextRequest) {
  return BaseAPIHandler.handle(request, async (context) => {
    // Validate request body
    const body = await BaseAPIHandler.validateBody(request, CreateUserSchema)

    // Create/update user via service
    const user = await usersService.create(body, context)

    // Return created response
    const response = ResponseBuilder.created(
      user,
      'User created/updated successfully',
      context.requestId
    )

    return NextResponse.json(response, { status: 201 })
  })
}
