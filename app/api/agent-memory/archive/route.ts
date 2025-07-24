/**
 * Agent Memory Archive API Route
 *
 * Handles archiving of old or low-importance memories
 */

import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { agentMemoryService } from "@/lib/agent-memory/memory-service";
import { observability } from "@/lib/observability";

const ArchiveMemoriesSchema = z.object({
	olderThanDays: z.number().int().positive().optional(),
	maxImportance: z.number().int().min(1).max(10).optional(),
	maxAccessCount: z.number().int().positive().optional(),
	dryRun: z.boolean().optional(),
});

/**
 * POST /api/agent-memory/archive - Archive old or low-importance memories
 */
export async function POST(request: NextRequest) {
	return observability.trackOperation("api.agent-memory.archive", async () => {
		try {
			const body = await request.json();
			const validatedData = ArchiveMemoriesSchema.parse(body);

			const result = await agentMemoryService.archiveMemories({
				olderThanDays: validatedData.olderThanDays,
				maxImportance: validatedData.maxImportance,
				maxAccessCount: validatedData.maxAccessCount,
				dryRun: validatedData.dryRun,
			});

			observability.recordEvent("api.agent-memory.archive-completed", {
				archived: result.archived,
				errors: result.errors,
				dryRun: validatedData.dryRun || false,
				olderThanDays: validatedData.olderThanDays || 90,
				maxImportance: validatedData.maxImportance || 3,
			});

			return NextResponse.json({
				success: true,
				data: result,
			});
		} catch (error) {
			observability.recordError("api.agent-memory.archive-failed", error as Error);

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
					error: "Failed to archive memories",
					message: error instanceof Error ? error.message : "Unknown error",
				},
				{ status: 500 }
			);
		}
	});
}
