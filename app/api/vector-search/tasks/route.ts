import { sql } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { tasks } from "@/db/schema";
import { ObservabilityService } from "@/lib/observability";
import { EmbeddingService } from "@/lib/vector-search/embedding-service";
import { WASMServices } from "@/lib/wasm-services";

const searchSchema = z.object({
	query: z.string().min(1, "Query is required"),
	threshold: z.number().min(0).max(1).default(0.7),
	limit: z.number().min(1).max(50).default(10),
	userId: z.string().optional(),
});

const observability = ObservabilityService.getInstance();

export async function POST(request: NextRequest) {
	return observability.trackOperation("api.vector-search.tasks", async () => {
		try {
			const body = await request.json();
			const { query, threshold, limit, userId } = searchSchema.parse(body);

			// Generate embedding for the search query
			const embeddingService = EmbeddingService.getInstance();
			const { embedding } = await embeddingService.generateEmbedding(query);

			// Try WASM-optimized search first
			if (WASMServices.isAvailable()) {
				try {
					const wasmVectorSearch = await WASMServices.getVectorSearch();

					// Get all task embeddings (in production, this would be more efficient)
					const allTasks = await db
						.select({
							id: tasks.id,
							title: tasks.title,
							description: tasks.description,
							embedding: tasks.embedding,
							createdAt: tasks.createdAt,
							status: tasks.status,
							priority: tasks.priority,
						})
						.from(tasks)
						.where(sql`${tasks.embedding} IS NOT NULL`)
						.limit(1000); // Reasonable limit for WASM processing

					// Build index for WASM search
					const vectorIndex = allTasks
						.filter((task) => task.embedding)
						.map((task) => ({
							id: task.id,
							embedding: task.embedding!,
							metadata: {
								title: task.title,
								description: task.description,
								status: task.status,
								priority: task.priority,
								createdAt: task.createdAt,
							},
						}));

					await wasmVectorSearch.buildIndex(vectorIndex);

					// Perform WASM search
					const wasmResults = await wasmVectorSearch.searchSimilar(embedding, limit, threshold);

					const results = wasmResults.map((result) => ({
						id: result.id,
						title: result.metadata.title,
						description: result.metadata.description,
						status: result.metadata.status,
						priority: result.metadata.priority,
						createdAt: result.metadata.createdAt,
						similarity: result.score,
					}));

					return NextResponse.json({
						results,
						query,
						method: "wasm",
						count: results.length,
					});
				} catch (wasmError) {
					console.warn("WASM search failed, falling back to database:", wasmError);
				}
			}

			// Fallback to database-based vector search
			const results = await db.execute(
				sql`
          SELECT 
            id,
            title,
            description,
            status,
            priority,
            created_at,
            1 - (embedding <=> ${embedding}::vector) as similarity
          FROM tasks
          WHERE embedding IS NOT NULL
            AND (1 - (embedding <=> ${embedding}::vector)) >= ${threshold}
            ${userId ? sql`AND user_id = ${userId}` : sql``}
          ORDER BY similarity DESC
          LIMIT ${limit}
        `
			);

			return NextResponse.json({
				results: results.rows,
				query,
				method: "database",
				count: results.rows.length,
			});
		} catch (error) {
			console.error("Vector search error:", error);

			if (error instanceof z.ZodError) {
				return NextResponse.json(
					{ error: "Invalid request data", details: error.errors },
					{ status: 400 }
				);
			}

			return NextResponse.json({ error: "Internal server error" }, { status: 500 });
		}
	});
}

export async function GET(request: NextRequest) {
	return observability.trackOperation("api.vector-search.tasks.stats", async () => {
		try {
			const { searchParams } = new URL(request.url);
			const userId = searchParams.get("userId");

			// Get statistics about task embeddings
			const stats = await db.execute(
				sql`
          SELECT 
            COUNT(*) as total_tasks,
            COUNT(embedding) as tasks_with_embeddings,
            COUNT(CASE WHEN embedding IS NULL THEN 1 END) as tasks_without_embeddings
          FROM tasks
          ${userId ? sql`WHERE user_id = ${userId}` : sql``}
        `
			);

			// Get WASM capabilities
			const wasmCapabilities = WASMServices.getCapabilities();

			return NextResponse.json({
				stats: stats.rows[0],
				wasm: {
					available: WASMServices.isAvailable(),
					capabilities: wasmCapabilities,
				},
			});
		} catch (error) {
			console.error("Vector search stats error:", error);
			return NextResponse.json({ error: "Internal server error" }, { status: 500 });
		}
	});
}
