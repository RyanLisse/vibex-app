// Force dynamic rendering to avoid build-time issues
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db/config";
import { agentMemory } from "@/db/schema";
import { observabilityService } from "@/lib/observability";
import { vectorSearchService } from "@/lib/wasm/vector-search";

const updateMemorySchema = z.object({
	content: z.string().min(1).optional(),
	metadata: z.record(z.string(), z.any()).optional(),
	importance: z.number().min(0).max(1).optional(),
	tags: z.array(z.string()).optional(),
});

// GET /api/agent-memory/[id] - Get specific memory
export async function GET(
	_request: NextRequest,
	{ params }: { params: { id: string } },
) {
	try {
		const memoryId = params.id;

		observabilityService.recordEvent({
			type: "query",
			category: "agent_memory",
			message: "Fetching specific agent memory",
			metadata: { memoryId },
		});

		const [memory] = await db
			.select()
			.from(agentMemory)
			.where(eq(agentMemory.id, memoryId))
			.limit(1);

		if (!memory) {
			return NextResponse.json({ error: "Memory not found" }, { status: 404 });
		}

		return NextResponse.json(memory);
	} catch (error) {
		observabilityService.recordError(error as Error, {
			context: "agent_memory_get_by_id",
		});

		return NextResponse.json(
			{ error: "Failed to fetch memory" },
			{ status: 500 },
		);
	}
}

// PUT /api/agent-memory/[id] - Update memory
export async function PUT(
	request: NextRequest,
	{ params }: { params: { id: string } },
) {
	try {
		const memoryId = params.id;
		const body = await request.json();
		const updateData = updateMemorySchema.parse(body);

		observabilityService.recordEvent({
			type: "execution",
			category: "agent_memory",
			message: "Updating agent memory",
			metadata: { memoryId, updateData },
		});

		// Check if memory exists
		const [existingMemory] = await db
			.select()
			.from(agentMemory)
			.where(eq(agentMemory.id, memoryId))
			.limit(1);

		if (!existingMemory) {
			return NextResponse.json({ error: "Memory not found" }, { status: 404 });
		}

		// Prepare update values
		const updateValues: any = {
			updatedAt: new Date(),
		};

		if (updateData.content !== undefined) {
			updateValues.content = updateData.content;
			// Regenerate embedding if content changed
			updateValues.embedding = await (
				vectorSearchService as any
			).generateEmbedding(updateData.content);
		}

		if (updateData.metadata !== undefined) {
			updateValues.metadata = updateData.metadata;
		}

		if (updateData.importance !== undefined) {
			updateValues.importance = updateData.importance;
		}

		if (updateData.tags !== undefined) {
			updateValues.tags = updateData.tags;
		}

		const [updatedMemory] = await db
			.update(agentMemory)
			.set(updateValues)
			.where(eq(agentMemory.id, memoryId))
			.returning();

		return NextResponse.json(updatedMemory);
	} catch (error) {
		observabilityService.recordError(error as Error, {
			context: "agent_memory_put",
		});

		return NextResponse.json(
			{ error: "Failed to update memory" },
			{ status: 500 },
		);
	}
}

// DELETE /api/agent-memory/[id] - Delete memory
export async function DELETE(
	_request: NextRequest,
	{ params }: { params: { id: string } },
) {
	try {
		const memoryId = params.id;

		observabilityService.recordEvent({
			type: "execution",
			category: "agent_memory",
			message: "Deleting agent memory",
			metadata: { memoryId },
		});

		const [deletedMemory] = await db
			.delete(agentMemory)
			.where(eq(agentMemory.id, memoryId))
			.returning();

		if (!deletedMemory) {
			return NextResponse.json({ error: "Memory not found" }, { status: 404 });
		}

		return NextResponse.json({ success: true });
	} catch (error) {
		observabilityService.recordError(error as Error, {
			context: "agent_memory_delete",
		});

		return NextResponse.json(
			{ error: "Failed to delete memory" },
			{ status: 500 },
		);
	}
}
