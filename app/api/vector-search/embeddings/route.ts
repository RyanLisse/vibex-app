import { eq, isNull } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { agentMemory, tasks } from "@/db/schema";
import { ObservabilityService } from "@/lib/observability";
import { EmbeddingService } from "@/lib/vector-search/embedding-service";

const generateSchema = z.object({
	text: z.string().min(1, "Text is required"),
	type: z.enum(["text", "task", "memory"]).default("text"),
});

const batchGenerateSchema = z.object({
	texts: z.array(z.string().min(1)).min(1).max(100, "Maximum 100 texts per batch"),
	type: z.enum(["text", "task", "memory"]).default("text"),
});

const updateTaskEmbeddingsSchema = z.object({
	taskIds: z.array(z.string().uuid()).optional(),
	batchSize: z.number().min(1).max(50).default(10),
});

const updateMemoryEmbeddingsSchema = z.object({
	agentType: z.string().optional(),
	batchSize: z.number().min(1).max(50).default(10),
});

const observability = ObservabilityService.getInstance();

export async function POST(request: NextRequest) {
	return observability.trackOperation("api.vector-search.embeddings.generate", async () => {
		try {
			const body = await request.json();
			const { text, type } = generateSchema.parse(body);

			const embeddingService = EmbeddingService.getInstance();
			let result;

			switch (type) {
				case "task":
					// Assume text is JSON with title and description
					try {
						const taskData = JSON.parse(text);
						result = await embeddingService.generateTaskEmbedding(taskData);
					} catch {
						// Fallback to treating as plain text
						result = await embeddingService.generateEmbedding(text);
					}
					break;

				case "memory":
					// Assume text is JSON with contextKey, content, and metadata
					try {
						const memoryData = JSON.parse(text);
						result = await embeddingService.generateMemoryEmbedding(memoryData);
					} catch {
						// Fallback to treating as plain text
						result = await embeddingService.generateEmbedding(text);
					}
					break;

				default:
					result = await embeddingService.generateEmbedding(text);
			}

			return NextResponse.json({
				embedding: result.embedding,
				tokenCount: result.tokenCount,
				model: result.model,
				dimensions: result.embedding.length,
			});
		} catch (error) {
			console.error("Embedding generation error:", error);

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

export async function PUT(request: NextRequest) {
	return observability.trackOperation("api.vector-search.embeddings.batch", async () => {
		try {
			const body = await request.json();
			const { texts, type } = batchGenerateSchema.parse(body);

			const embeddingService = EmbeddingService.getInstance();
			const result = await embeddingService.generateEmbeddingsBatch(texts);

			return NextResponse.json({
				embeddings: result.embeddings,
				tokenCount: result.tokenCount,
				model: result.model,
				count: result.embeddings.length,
				dimensions: result.embeddings.length > 0 ? result.embeddings[0].length : 0,
			});
		} catch (error) {
			console.error("Batch embedding generation error:", error);

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

export async function PATCH(request: NextRequest) {
	const { searchParams } = new URL(request.url);
	const target = searchParams.get("target");

	if (target === "tasks") {
		return updateTaskEmbeddings(request);
	}
	if (target === "memory") {
		return updateMemoryEmbeddings(request);
	}
	return NextResponse.json({ error: "Invalid target. Use 'tasks' or 'memory'" }, { status: 400 });
}

async function updateTaskEmbeddings(request: NextRequest) {
	return observability.trackOperation("api.vector-search.embeddings.update-tasks", async () => {
		try {
			const body = await request.json();
			const { taskIds, batchSize } = updateTaskEmbeddingsSchema.parse(body);

			const embeddingService = EmbeddingService.getInstance();

			// Get tasks without embeddings or specific task IDs
			let query = db
				.select({
					id: tasks.id,
					title: tasks.title,
					description: tasks.description,
				})
				.from(tasks);

			if (taskIds && taskIds.length > 0) {
				query = query.where(eq(tasks.id, taskIds[0])); // Simplified for demo
			} else {
				query = query.where(isNull(tasks.embedding));
			}

			const tasksToUpdate = await query.limit(batchSize);

			if (tasksToUpdate.length === 0) {
				return NextResponse.json({
					message: "No tasks to update",
					updated: 0,
				});
			}

			let updated = 0;
			const errors: Array<{ taskId: string; error: string }> = [];

			// Process tasks in smaller batches to avoid API limits
			for (const task of tasksToUpdate) {
				try {
					const { embedding } = await embeddingService.generateTaskEmbedding(task);

					await db
						.update(tasks)
						.set({
							embedding,
							updatedAt: new Date(),
						})
						.where(eq(tasks.id, task.id));

					updated++;
				} catch (error) {
					console.error(`Failed to update embedding for task ${task.id}:`, error);
					errors.push({
						taskId: task.id,
						error: error instanceof Error ? error.message : "Unknown error",
					});
				}
			}

			return NextResponse.json({
				message: `Updated embeddings for ${updated} tasks`,
				updated,
				errors: errors.length > 0 ? errors : undefined,
				total: tasksToUpdate.length,
			});
		} catch (error) {
			console.error("Task embedding update error:", error);

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

async function updateMemoryEmbeddings(request: NextRequest) {
	return observability.trackOperation("api.vector-search.embeddings.update-memory", async () => {
		try {
			const body = await request.json();
			const { agentType, batchSize } = updateMemoryEmbeddingsSchema.parse(body);

			const embeddingService = EmbeddingService.getInstance();

			// Get memories without embeddings
			let query = db
				.select({
					id: agentMemory.id,
					agentType: agentMemory.agentType,
					contextKey: agentMemory.contextKey,
					content: agentMemory.content,
					metadata: agentMemory.metadata,
				})
				.from(agentMemory)
				.where(isNull(agentMemory.embedding));

			if (agentType) {
				query = query.where(eq(agentMemory.agentType, agentType));
			}

			const memoriesToUpdate = await query.limit(batchSize);

			if (memoriesToUpdate.length === 0) {
				return NextResponse.json({
					message: "No memories to update",
					updated: 0,
				});
			}

			let updated = 0;
			const errors: Array<{ memoryId: string; error: string }> = [];

			// Process memories in smaller batches
			for (const memory of memoriesToUpdate) {
				try {
					const { embedding } = await embeddingService.generateMemoryEmbedding(memory);

					await db
						.update(agentMemory)
						.set({
							embedding,
							lastAccessedAt: new Date(),
						})
						.where(eq(agentMemory.id, memory.id));

					updated++;
				} catch (error) {
					console.error(`Failed to update embedding for memory ${memory.id}:`, error);
					errors.push({
						memoryId: memory.id,
						error: error instanceof Error ? error.message : "Unknown error",
					});
				}
			}

			return NextResponse.json({
				message: `Updated embeddings for ${updated} memories`,
				updated,
				errors: errors.length > 0 ? errors : undefined,
				total: memoriesToUpdate.length,
			});
		} catch (error) {
			console.error("Memory embedding update error:", error);

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
