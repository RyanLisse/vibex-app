// Force dynamic rendering to avoid build-time issues
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Kanban Board API Route - REFACTORED to eliminate duplication
 *
 * Uses shared kanban service to eliminate the exact 26-line duplication
 * identified in the code smell analysis.
 */

import { z } from "zod";
import { KanbanMoveSchema, KanbanBoardConfigSchema } from "@/src/schemas/enhanced-task-schemas";
import { 
	SharedKanbanService,
	GetKanbanQuerySchema,
	DEFAULT_COLUMNS,
	STATUS_COLUMN_MAP,
	KanbanUtils
} from "@/lib/api/kanban/shared-service";
import {
	createRouteHandler,
	createGetListHandler,
	createPostHandler,
	createPutHandler,
	QueryParsers,
	ResponseBuilders
} from "@/lib/api/shared/route-helpers";
import { withErrorHandling, RouteErrorHandlers } from "@/lib/api/shared/error-handlers";

// REFACTORED: Route handlers using shared utilities

/**
 * GET /api/tasks/kanban - Get kanban board data
 */
export const GET = createRouteHandler({
	method: 'GET',
	serviceName: 'kanban-api',
	enableCaching: true,
	cacheMaxAge: 60, // 1 minute cache for kanban data
	handler: async ({ request }) => {
		const params = QueryParsers.search(request);
		const queryParams = GetKanbanQuerySchema.parse({
			userId: new URL(request.url).searchParams.get('userId'),
			projectId: new URL(request.url).searchParams.get('projectId'),
			assignee: new URL(request.url).searchParams.get('assignee'),
		});

		// Delegate to shared service
		return await SharedKanbanService.getKanbanBoard(queryParams);
	},
});

/**
 * POST /api/tasks/kanban - Move task between columns
 */
export const POST = createRouteHandler({
	method: 'POST',
	serviceName: 'kanban-api',
	bodySchema: KanbanMoveSchema,
	handler: async ({ body }) => {
		// Delegate to shared service
		return await SharedKanbanService.moveTask(body!);
	},
});

/**
 * PUT /api/tasks/kanban - Update kanban configuration
 */
export const PUT = createRouteHandler({
	method: 'PUT',
	serviceName: 'kanban-api',
	bodySchema: KanbanBoardConfigSchema,
	handler: async ({ body }) => {
		// Delegate to shared service
		return await SharedKanbanService.updateConfig(body!);
	},
});
