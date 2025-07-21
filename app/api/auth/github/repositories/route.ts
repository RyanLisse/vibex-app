// Force dynamic rendering to avoid build-time issues
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GitHub Repositories API Route
 *
 * Database-integrated GitHub repository management with caching,
 * synchronization, and comprehensive error handling.
 *
 * Refactored to use base infrastructure patterns for consistent
 * error handling, request processing, and response formatting.
 */

import {
	GetRepositoriesQuerySchema,
	githubRepositoriesService,
} from "./service";

/**
 * GET /api/auth/github/repositories - Get GitHub repositories with optional sync
 */
export async function GET(request: NextRequest) {
	return BaseAPIHandler.handle(request, async (context) => {
		// Get the access token from the httpOnly cookie
		const accessToken = request.cookies.get("github_access_token")?.value;

		if (!accessToken) {
			throw new UnauthorizedError("Not authenticated");
		}

		// Get user ID from authentication
		const userId = await githubRepositoriesService.getUserFromAuth(accessToken);

		// Validate query parameters
		const queryParams = GetRepositoriesQuerySchema.parse(context.query);

		// Get repositories from service
		const result = await githubRepositoriesService.getRepositories(
			userId,
			accessToken,
			queryParams,
			context,
		);

		// Return paginated response with additional metadata
		const response = ResponseBuilder.paginated(
			result.repositories,
			result.pagination,
			"Repositories retrieved successfully",
			context.requestId,
		);

		// Add sync metadata to response
		const enhancedResponse = {
			...response,
			meta: {
				...response.meta,
				syncPerformed: result.syncPerformed,
				lastSync: result.lastSync,
			},
		};

		return NextResponse.json(enhancedResponse);
	});
}
