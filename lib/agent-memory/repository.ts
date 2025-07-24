/**
 * Agent Memory Repository
 *
 * Handles database operations for agent memory storage and retrieval.
 */

import { and, cosineDistance, desc, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { ulid } from "ulid";
import { db } from "@/db/config";
import { agentMemory } from "@/db/schema";
import type { CreateMemoryInput, MemoryBatchResult, MemoryEntry, UpdateMemoryInput } from "./types";

export class MemoryRepository {
	/**
	 * Create a new memory entry
	 */
	async create(input: CreateMemoryInput): Promise<MemoryEntry> {
		const id = ulid();
		const now = new Date();

		const [created] = await db
			.insert(agentMemory)
			.values({
				id,
				agentType: input.agentType,
				contextKey: input.contextKey,
				content: input.content,
				embedding: input.embedding,
				metadata: input.metadata as any,
				importance: input.importance || 1,
				createdAt: now,
				lastAccessedAt: now,
				accessCount: 0,
				expiresAt: input.expiresAt,
			})
			.returning();

		return this.mapToMemoryEntry(created);
	}

	/**
	 * Create multiple memory entries
	 */
	async createBatch(inputs: CreateMemoryInput[]): Promise<MemoryBatchResult> {
		const succeeded: string[] = [];
		const failed: Array<{ id?: string; error: string; input: any }> = [];

		for (const input of inputs) {
			try {
				const memory = await this.create(input);
				succeeded.push(memory.id);
			} catch (error) {
				failed.push({
					error: error instanceof Error ? error.message : "Unknown error",
					input,
				});
			}
		}

		return {
			succeeded,
			failed,
			totalProcessed: inputs.length,
		};
	}

	/**
	 * Find memory by ID
	 */
	async findById(id: string): Promise<MemoryEntry | null> {
		const [memory] = await db.select().from(agentMemory).where(eq(agentMemory.id, id)).limit(1);

		return memory ? this.mapToMemoryEntry(memory) : null;
	}

	/**
	 * Find memory by agent type and context key
	 */
	async findByContext(agentType: string, contextKey: string): Promise<MemoryEntry | null> {
		const [memory] = await db
			.select()
			.from(agentMemory)
			.where(and(eq(agentMemory.agentType, agentType), eq(agentMemory.contextKey, contextKey)))
			.limit(1);

		return memory ? this.mapToMemoryEntry(memory) : null;
	}

	/**
	 * Update memory entry
	 */
	async update(id: string, input: UpdateMemoryInput): Promise<MemoryEntry | null> {
		const updateData: any = {};

		if (input.content !== undefined) updateData.content = input.content;
		if (input.embedding !== undefined) updateData.embedding = input.embedding;
		if (input.importance !== undefined) updateData.importance = input.importance;
		if (input.expiresAt !== undefined) updateData.expiresAt = input.expiresAt;

		// Handle metadata update
		if (input.metadata) {
			updateData.metadata = input.metadata;
		}

		updateData.updatedAt = new Date();

		const [updated] = await db
			.update(agentMemory)
			.set(updateData)
			.where(eq(agentMemory.id, id))
			.returning();

		return updated ? this.mapToMemoryEntry(updated) : null;
	}

	/**
	 * Map database row to MemoryEntry
	 */
	private mapToMemoryEntry(row: any): MemoryEntry {
		return {
			id: row.id,
			agentType: row.agentType,
			contextKey: row.contextKey,
			content: row.content,
			embedding: row.embedding,
			metadata: row.metadata,
			importance: row.importance,
			createdAt: row.createdAt,
			updatedAt: row.updatedAt,
			lastAccessedAt: row.lastAccessedAt,
			expiresAt: row.expiresAt,
		};
	}
}
