/**
 * Agent Memory API Routes
 *
 * Provides REST API endpoints for agent memory management including
 * storage, retrieval, semantic search, and context sharing.
 */

import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { agentMemoryService } from "@/lib/agent-memory/memory-service";
import { observability } from "@/lib/observability";

// Validation schemas
const StoreMemorySchema = z.object({
	agentType: z.string().min(1).max(100),
	contextKey: z.string().min(1).max(255),
	content: z.string().min(1),
	importance: z.number().int().min(1).max(10).optional(),
	metadata: z.record(z.string(), z.any()).optional(),
	expiresAt: z.string().datetime().optional(),
	generateEmbedding: z.boolean().optional(),
});

const SearchMemoriesSchema = z.object({
	query: z.string().min(1),
	agentType: z.string().optional(),
	contextKeys: z.array(z.string()).optional(),
	minImportance: z.number().int().min(1).max(10).optional(),
	maxAge: z.number().int().positive().optional(),
	includeExpired: z.boolean().optional(),
	semanticThreshold: z.number().min(0).max(1).optional(),
	maxResults: z.number().int().positive().max(100).optional(),
});

const GetContextSchema = z.object({
	agentType: z.string().min(1).max(100),
	taskDescription: z.string().min(1),
	maxMemories: z.number().int().positive().max(50).optional(),
	includePatterns: z.boolean().optional(),
	includeSummary: z.boolean().optional(),
});

const ShareKnowledgeSchema = z.object({
	fromAgentType: z.string().min(1).max(100),
	toAgentType: z.string().min(1).max(100),
	contextKey: z.string().min(1).max(255),
	minImportance: z.number().int().min(1).max(10).optional(),
	copyMetadata: z.boolean().optional(),
	adjustImportance: z.boolean().optional(),
});

/**
 * POST /api/agent-memory - Store a new memory entry
 */
export async function POST(request: NextRequest) {
	return observability.trackOperation("api.agent-memory.store", async () => {
		try {
			const body = await request.json();
			const validatedData = StoreMemorySchema.parse(body);

			const memory = await agentMemoryService.storeMemory(
				validatedData.agentType,
				validatedData.contextKey,
				validatedData.content,
				{
					importance: validatedData.importance,
					metadata: validatedData.metadata,
					expiresAt: validatedData.expiresAt ? new Date(validatedData.expiresAt) : undefined,
					generateEmbedding: validatedData.generateEmbedding,
				}
			);

			observability.recordEvent("api.agent-memory.stored", {
				agentType: validatedData.agentType,
				contextKey: validatedData.contextKey,
				importance: validatedData.importance || 5,
				memoryId: memory.id,
			});

			return NextResponse.json({
				success: true,
				data: memory,
			});
		} catch (error) {
			observability.recordError("api.agent-memory.store-failed", error as Error);

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
					error: "Failed to store memory",
					message: error instanceof Error ? error.message : "Unknown error",
				},
				{ status: 500 }
			);
		}
	});
}

/**
 * GET /api/agent-memory - Get memories by context or search
 */
export async function GET(request: NextRequest) {
	return observability.trackOperation("api.agent-memory.get", async () => {
		try {
			const { searchParams } = new URL(request.url);
			const agentType = searchParams.get("agentType");
			const contextKey = searchParams.get("contextKey");
			const query = searchParams.get("query");

			if (!agentType) {
				return NextResponse.json(
					{
						success: false,
						error: "agentType parameter is required",
					},
					{ status: 400 }
				);
			}

			let result;

			if (query) {
				// Semantic search
				const searchOptions = {
					agentType,
					contextKeys: searchParams.get("contextKeys")?.split(","),
					minImportance: searchParams.get("minImportance")
						? Number.parseInt(searchParams.get("minImportance")!)
						: undefined,
					maxAge: searchParams.get("maxAge")
						? Number.parseInt(searchParams.get("maxAge")!)
						: undefined,
					includeExpired: searchParams.get("includeExpired") === "true",
					semanticThreshold: searchParams.get("semanticThreshold")
						? Number.parseFloat(searchParams.get("semanticThreshold")!)
						: undefined,
					maxResults: searchParams.get("maxResults")
						? Number.parseInt(searchParams.get("maxResults")!)
						: undefined,
				};

				result = await agentMemoryService.searchMemories(query, searchOptions);

				observability.recordEvent("api.agent-memory.searched", {
					agentType,
					query: query.substring(0, 50),
					resultsCount: result.length,
					...searchOptions,
				});
			} else if (contextKey) {
				// Get by context
				const options = {
					includeExpired: searchParams.get("includeExpired") === "true",
					orderBy:
						(searchParams.get("orderBy") as "importance" | "recency" | "access") || "importance",
					limit: searchParams.get("limit")
						? Number.parseInt(searchParams.get("limit")!)
						: undefined,
				};

				result = await agentMemoryService.getMemoriesByContext(agentType, contextKey, options);

				observability.recordEvent("api.agent-memory.retrieved-by-context", {
					agentType,
					contextKey,
					count: result.length,
					...options,
				});
			} else {
				return NextResponse.json(
					{
						success: false,
						error: "Either 'contextKey' or 'query' parameter is required",
					},
					{ status: 400 }
				);
			}

			return NextResponse.json({
				success: true,
				data: result,
			});
		} catch (error) {
			observability.recordError("api.agent-memory.get-failed", error as Error);

			return NextResponse.json(
				{
					success: false,
					error: "Failed to retrieve memories",
					message: error instanceof Error ? error.message : "Unknown error",
				},
				{ status: 500 }
			);
		}
	});
}
