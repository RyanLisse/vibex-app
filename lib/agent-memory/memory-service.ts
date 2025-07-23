/**
 * Agent Memory and Context Service
 *
 * Provides persistent agent memory with vector embeddings, semantic search,
 * knowledge sharing between sessions, and automatic context summarization.
 */

import { and, asc, desc, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import { type AgentMemory, agentMemory, type NewAgentMemory } from "@/db/schema";
import { observability } from "@/lib/observability";
import {
	createOptimizedEmbedding,
	type VectorDocument,
	type VectorSearchResult,
	VectorSearchWASM,
} from "@/lib/wasm/vector-search";

export interface AgentMemoryEntry {
	id: string;
	agentType: string;
	contextKey: string;
	content: string;
	embedding?: number[];
	createdAt: Date;
	lastAccessedAt: Date;
	accessCount: number;
	metadata?: Record<string, any>;
	importance: number;
	expiresAt?: Date;
}

export interface MemorySearchOptions {
	agentType?: string;
	contextKeys?: string[];
	minImportance?: number;
	maxAge?: number; // in days
	includeExpired?: boolean;
	semanticThreshold?: number;
	maxResults?: number;
}

export interface MemoryContext {
	relevantMemories: AgentMemoryEntry[];
	contextSummary: string;
	totalMemories: number;
	averageImportance: number;
	oldestMemory?: Date;
	newestMemory?: Date;
}

export interface MemoryInsight {
	patterns: string[];
	frequentContexts: Array<{ key: string; count: number }>;
	importanceDistribution: Record<number, number>;
	memoryGrowthTrend: Array<{ date: string; count: number }>;
	recommendations: string[];
}

/**
 * Agent Memory Service with comprehensive context management
 */
export class AgentMemoryService {
	private vectorSearch: VectorSearchWASM;
	private initialized = false;

	constructor() {
		this.vectorSearch = new VectorSearchWASM({
			dimensions: 384, // Using smaller dimensions for efficiency
			similarityThreshold: 0.7,
			maxResults: 20,
			enableCache: true,
			cacheSize: 500,
			indexType: "flat", // Simple flat index for now
			enablePersistence: true,
			persistenceKey: "agent-memory",
			enableMetrics: true,
		});
	}

	/**
	 * Initialize the memory service and vector search
	 */
	async initialize(): Promise<void> {
		if (this.initialized) return;

		return observability.trackOperation("agent-memory.initialize", async () => {
			try {
				await this.vectorSearch.initialize();

				// Load existing memories into vector search
				await this.loadExistingMemories();

				this.initialized = true;

				observability.recordEvent("agent-memory.initialized", {
					vectorSearchEnabled: true,
					memoriesLoaded: this.vectorSearch.getDocumentCount(),
				});

				console.log("✅ Agent Memory Service initialized");
			} catch (error) {
				observability.recordError("agent-memory.initialization-failed", error as Error);
				throw error;
			}
		});
	}

	/**
	 * Load existing memories from database into vector search
	 */
	private async loadExistingMemories(): Promise<void> {
		try {
			const memories = await db
				.select()
				.from(agentMemory)
				.where(
					and(
						sql`${agentMemory.expiresAt} IS NULL OR ${agentMemory.expiresAt} > NOW()`,
						gte(agentMemory.importance, 3) // Only load important memories
					)
				)
				.orderBy(desc(agentMemory.lastAccessedAt))
				.limit(1000); // Limit to prevent memory issues

			const documents: VectorDocument[] = memories.map((memory) => ({
				id: memory.id,
				content: memory.content,
				embedding: memory.embedding || createOptimizedEmbedding(memory.content),
				metadata: {
					agentType: memory.agentType,
					contextKey: memory.contextKey,
					importance: memory.importance,
					accessCount: memory.accessCount,
					createdAt: memory.createdAt,
					lastAccessedAt: memory.lastAccessedAt,
					...memory.metadata,
				},
			}));

			if (documents.length > 0) {
				await this.vectorSearch.addDocuments(documents);
			}

			observability.recordEvent("agent-memory.memories-loaded", {
				count: documents.length,
			});
		} catch (error) {
			observability.recordError("agent-memory.load-memories-failed", error as Error);
			console.warn("Failed to load existing memories:", error);
		}
	}

	/**
	 * Store a new memory entry with automatic embedding generation
	 */
	async storeMemory(
		agentType: string,
		contextKey: string,
		content: string,
		options: {
			importance?: number;
			metadata?: Record<string, any>;
			expiresAt?: Date;
			generateEmbedding?: boolean;
		} = {}
	): Promise<AgentMemoryEntry> {
		if (!this.initialized) {
			await this.initialize();
		}

		return observability.trackOperation("agent-memory.store", async () => {
			const { importance = 5, metadata = {}, expiresAt, generateEmbedding = true } = options;

			// Generate embedding for semantic search
			let embedding: number[] | undefined;
			if (generateEmbedding) {
				embedding = createOptimizedEmbedding(content);
			}

			// Check if memory with same context already exists
			const existing = await db
				.select()
				.from(agentMemory)
				.where(and(eq(agentMemory.agentType, agentType), eq(agentMemory.contextKey, contextKey)))
				.limit(1);

			let memoryEntry: AgentMemory;

			if (existing.length > 0) {
				// Update existing memory
				const [updated] = await db
					.update(agentMemory)
					.set({
						content,
						embedding,
						lastAccessedAt: new Date(),
						accessCount: sql`${agentMemory.accessCount} + 1`,
						importance: Math.max(existing[0].importance, importance),
						metadata: { ...existing[0].metadata, ...metadata },
						expiresAt,
					})
					.where(eq(agentMemory.id, existing[0].id))
					.returning();

				memoryEntry = updated;

				observability.recordEvent("agent-memory.updated", {
					agentType,
					contextKey,
					importance,
					previousImportance: existing[0].importance,
				});
			} else {
				// Create new memory
				const [created] = await db
					.insert(agentMemory)
					.values({
						agentType,
						contextKey,
						content,
						embedding,
						importance,
						metadata,
						expiresAt,
						accessCount: 1,
					})
					.returning();

				memoryEntry = created;

				observability.recordEvent("agent-memory.created", {
					agentType,
					contextKey,
					importance,
				});
			}

			// Add to vector search index
			if (embedding) {
				await this.vectorSearch.addDocument({
					id: memoryEntry.id,
					content: memoryEntry.content,
					embedding,
					metadata: {
						agentType: memoryEntry.agentType,
						contextKey: memoryEntry.contextKey,
						importance: memoryEntry.importance,
						accessCount: memoryEntry.accessCount,
						createdAt: memoryEntry.createdAt,
						lastAccessedAt: memoryEntry.lastAccessedAt,
						...memoryEntry.metadata,
					},
				});
			}

			return {
				id: memoryEntry.id,
				agentType: memoryEntry.agentType,
				contextKey: memoryEntry.contextKey,
				content: memoryEntry.content,
				embedding: memoryEntry.embedding,
				createdAt: memoryEntry.createdAt,
				lastAccessedAt: memoryEntry.lastAccessedAt,
				accessCount: memoryEntry.accessCount,
				metadata: memoryEntry.metadata,
				importance: memoryEntry.importance,
				expiresAt: memoryEntry.expiresAt,
			};
		});
	}

	/**
	 * Retrieve memories by context key
	 */
	async getMemoriesByContext(
		agentType: string,
		contextKey: string,
		options: {
			includeExpired?: boolean;
			orderBy?: "importance" | "recency" | "access";
			limit?: number;
		} = {}
	): Promise<AgentMemoryEntry[]> {
		if (!this.initialized) {
			await this.initialize();
		}

		return observability.trackOperation("agent-memory.get-by-context", async () => {
			const { includeExpired = false, orderBy = "importance", limit = 50 } = options;

			let query = db
				.select()
				.from(agentMemory)
				.where(
					and(
						eq(agentMemory.agentType, agentType),
						eq(agentMemory.contextKey, contextKey),
						includeExpired
							? undefined
							: sql`${agentMemory.expiresAt} IS NULL OR ${agentMemory.expiresAt} > NOW()`
					)
				);

			// Apply ordering
			switch (orderBy) {
				case "importance":
					query = query.orderBy(desc(agentMemory.importance), desc(agentMemory.lastAccessedAt));
					break;
				case "recency":
					query = query.orderBy(desc(agentMemory.lastAccessedAt));
					break;
				case "access":
					query = query.orderBy(desc(agentMemory.accessCount), desc(agentMemory.lastAccessedAt));
					break;
			}

			const memories = await query.limit(limit);

			// Update access count for retrieved memories
			if (memories.length > 0) {
				await db
					.update(agentMemory)
					.set({
						lastAccessedAt: new Date(),
						accessCount: sql`${agentMemory.accessCount} + 1`,
					})
					.where(
						inArray(
							agentMemory.id,
							memories.map((m) => m.id)
						)
					);
			}

			observability.recordEvent("agent-memory.retrieved-by-context", {
				agentType,
				contextKey,
				count: memories.length,
				orderBy,
			});

			return memories.map(this.mapToMemoryEntry);
		});
	}

	/**
	 * Semantic search for relevant memories
	 */
	async searchMemories(
		query: string,
		options: MemorySearchOptions = {}
	): Promise<VectorSearchResult[]> {
		if (!this.initialized) {
			await this.initialize();
		}

		return observability.trackOperation("agent-memory.semantic-search", async () => {
			const {
				agentType,
				contextKeys,
				minImportance = 1,
				maxAge,
				includeExpired = false,
				semanticThreshold = 0.7,
				maxResults = 10,
			} = options;

			// Generate query embedding
			const queryEmbedding = createOptimizedEmbedding(query);

			// Build filters
			const filters: Record<string, any> = {};
			if (agentType) {
				filters.agentType = agentType;
			}

			// Search using vector similarity
			const searchResults = await this.vectorSearch.search(queryEmbedding, {
				threshold: semanticThreshold,
				maxResults: maxResults * 2, // Get more for filtering
				filters,
				includeMetadata: true,
			});

			// Apply additional filters
			const filteredResults = searchResults
				.filter((result) => {
					const metadata = result.metadata || {};

					// Filter by importance
					if (metadata.importance < minImportance) return false;

					// Filter by context keys
					if (contextKeys && contextKeys.length > 0) {
						if (!contextKeys.includes(metadata.contextKey)) return false;
					}

					// Filter by age
					if (maxAge && metadata.createdAt) {
						const ageInDays =
							(Date.now() - new Date(metadata.createdAt).getTime()) / (1000 * 60 * 60 * 24);
						if (ageInDays > maxAge) return false;
					}

					return true;
				})
				.slice(0, maxResults);

			// Update access count for retrieved memories
			if (filteredResults.length > 0) {
				const memoryIds = filteredResults.map((r) => r.document.id);
				await db
					.update(agentMemory)
					.set({
						lastAccessedAt: new Date(),
						accessCount: sql`${agentMemory.accessCount} + 1`,
					})
					.where(inArray(agentMemory.id, memoryIds));
			}

			observability.recordEvent("agent-memory.semantic-search-completed", {
				query: query.substring(0, 50),
				resultsCount: filteredResults.length,
				agentType,
				semanticThreshold,
			});

			return filteredResults;
		});
	}

	/**
	 * Get relevant context for an agent starting a new task
	 */
	async getRelevantContext(
		agentType: string,
		taskDescription: string,
		options: {
			maxMemories?: number;
			includePatterns?: boolean;
			includeSummary?: boolean;
		} = {}
	): Promise<MemoryContext> {
		if (!this.initialized) {
			await this.initialize();
		}

		return observability.trackOperation("agent-memory.get-relevant-context", async () => {
			const { maxMemories = 15, includePatterns = true, includeSummary = true } = options;

			// Search for semantically similar memories
			const searchResults = await this.searchMemories(taskDescription, {
				agentType,
				maxResults: maxMemories,
				semanticThreshold: 0.6, // Lower threshold for broader context
			});

			const relevantMemories = searchResults.map((result) => ({
				id: result.document.id,
				agentType: result.metadata?.agentType || agentType,
				contextKey: result.metadata?.contextKey || "",
				content: result.document.content,
				embedding: result.document.embedding,
				createdAt: new Date(result.metadata?.createdAt || Date.now()),
				lastAccessedAt: new Date(result.metadata?.lastAccessedAt || Date.now()),
				accessCount: result.metadata?.accessCount || 0,
				metadata: result.metadata,
				importance: result.metadata?.importance || 1,
				expiresAt: result.metadata?.expiresAt ? new Date(result.metadata.expiresAt) : undefined,
			}));

			// Get overall statistics
			const allMemories = await db
				.select({
					count: sql<number>`count(*)`,
					avgImportance: sql<number>`avg(${agentMemory.importance})`,
					oldestDate: sql<Date>`min(${agentMemory.createdAt})`,
					newestDate: sql<Date>`max(${agentMemory.createdAt})`,
				})
				.from(agentMemory)
				.where(
					and(
						eq(agentMemory.agentType, agentType),
						sql`${agentMemory.expiresAt} IS NULL OR ${agentMemory.expiresAt} > NOW()`
					)
				);

			const stats = allMemories[0];

			// Generate context summary if requested
			let contextSummary = "";
			if (includeSummary && relevantMemories.length > 0) {
				contextSummary = await this.generateContextSummary(relevantMemories, taskDescription);
			}

			const context: MemoryContext = {
				relevantMemories,
				contextSummary,
				totalMemories: stats?.count || 0,
				averageImportance: stats?.avgImportance || 0,
				oldestMemory: stats?.oldestDate,
				newestMemory: stats?.newestDate,
			};

			observability.recordEvent("agent-memory.context-retrieved", {
				agentType,
				taskDescription: taskDescription.substring(0, 50),
				relevantMemoriesCount: relevantMemories.length,
				totalMemories: context.totalMemories,
				averageImportance: context.averageImportance,
			});

			return context;
		});
	}

	/**
	 * Generate a summary of relevant context
	 */
	private async generateContextSummary(
		memories: AgentMemoryEntry[],
		taskDescription: string
	): Promise<string> {
		// Simple extractive summarization
		const keyPoints = memories
			.sort((a, b) => b.importance - a.importance)
			.slice(0, 5)
			.map((memory) => {
				const content =
					memory.content.length > 100 ? memory.content.substring(0, 100) + "..." : memory.content;
				return `• ${content} (importance: ${memory.importance})`;
			});

		return `Based on ${memories.length} relevant memories:\n${keyPoints.join("\n")}`;
	}

	/**
	 * Archive old or low-importance memories
	 */
	async archiveMemories(
		options: {
			olderThanDays?: number;
			maxImportance?: number;
			maxAccessCount?: number;
			dryRun?: boolean;
		} = {}
	): Promise<{ archived: number; errors: number }> {
		return observability.trackOperation("agent-memory.archive", async () => {
			const { olderThanDays = 90, maxImportance = 3, maxAccessCount = 2, dryRun = false } = options;

			const cutoffDate = new Date();
			cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

			// Find memories to archive
			const toArchive = await db
				.select()
				.from(agentMemory)
				.where(
					and(
						lte(agentMemory.createdAt, cutoffDate),
						lte(agentMemory.importance, maxImportance),
						lte(agentMemory.accessCount, maxAccessCount),
						sql`${agentMemory.expiresAt} IS NULL OR ${agentMemory.expiresAt} > NOW()`
					)
				);

			if (dryRun) {
				observability.recordEvent("agent-memory.archive-dry-run", {
					candidateCount: toArchive.length,
					olderThanDays,
					maxImportance,
					maxAccessCount,
				});
				return { archived: toArchive.length, errors: 0 };
			}

			let archived = 0;
			let errors = 0;

			for (const memory of toArchive) {
				try {
					// Set expiration date instead of deleting
					const expirationDate = new Date();
					expirationDate.setDate(expirationDate.getDate() + 30); // Keep for 30 more days

					await db
						.update(agentMemory)
						.set({ expiresAt: expirationDate })
						.where(eq(agentMemory.id, memory.id));

					// Remove from vector search
					await this.vectorSearch.removeDocument(memory.id);

					archived++;
				} catch (error) {
					observability.recordError("agent-memory.archive-error", error as Error, {
						memoryId: memory.id,
					});
					errors++;
				}
			}

			observability.recordEvent("agent-memory.archive-completed", {
				archived,
				errors,
				olderThanDays,
				maxImportance,
				maxAccessCount,
			});

			return { archived, errors };
		});
	}

	/**
	 * Get memory insights and analytics
	 */
	async getMemoryInsights(agentType: string): Promise<MemoryInsight> {
		return observability.trackOperation("agent-memory.get-insights", async () => {
			// Get context frequency
			const contextStats = await db
				.select({
					contextKey: agentMemory.contextKey,
					count: sql<number>`count(*)`,
				})
				.from(agentMemory)
				.where(
					and(
						eq(agentMemory.agentType, agentType),
						sql`${agentMemory.expiresAt} IS NULL OR ${agentMemory.expiresAt} > NOW()`
					)
				)
				.groupBy(agentMemory.contextKey)
				.orderBy(sql`count(*) DESC`)
				.limit(10);

			// Get importance distribution
			const importanceStats = await db
				.select({
					importance: agentMemory.importance,
					count: sql<number>`count(*)`,
				})
				.from(agentMemory)
				.where(
					and(
						eq(agentMemory.agentType, agentType),
						sql`${agentMemory.expiresAt} IS NULL OR ${agentMemory.expiresAt} > NOW()`
					)
				)
				.groupBy(agentMemory.importance);

			// Get memory growth trend (last 30 days)
			const thirtyDaysAgo = new Date();
			thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

			const growthStats = await db
				.select({
					date: sql<string>`DATE(${agentMemory.createdAt})`,
					count: sql<number>`count(*)`,
				})
				.from(agentMemory)
				.where(and(eq(agentMemory.agentType, agentType), gte(agentMemory.createdAt, thirtyDaysAgo)))
				.groupBy(sql`DATE(${agentMemory.createdAt})`)
				.orderBy(sql`DATE(${agentMemory.createdAt})`);

			// Generate insights
			const patterns: string[] = [];
			const recommendations: string[] = [];

			if (contextStats.length > 0) {
				const topContext = contextStats[0];
				patterns.push(
					`Most frequent context: "${topContext.contextKey}" (${topContext.count} memories)`
				);
			}

			const importanceDistribution = importanceStats.reduce(
				(acc, stat) => {
					acc[stat.importance] = stat.count;
					return acc;
				},
				{} as Record<number, number>
			);

			const totalMemories = Object.values(importanceDistribution).reduce(
				(sum, count) => sum + count,
				0
			);
			const lowImportanceCount =
				(importanceDistribution[1] || 0) + (importanceDistribution[2] || 0);

			if (lowImportanceCount > totalMemories * 0.5) {
				recommendations.push("Consider archiving low-importance memories to improve performance");
			}

			if (growthStats.length > 0) {
				const recentGrowth = growthStats.slice(-7).reduce((sum, stat) => sum + stat.count, 0);
				if (recentGrowth > 50) {
					recommendations.push(
						"High memory creation rate detected - consider implementing automatic summarization"
					);
				}
			}

			const insights: MemoryInsight = {
				patterns,
				frequentContexts: contextStats.map((stat) => ({
					key: stat.contextKey,
					count: stat.count,
				})),
				importanceDistribution,
				memoryGrowthTrend: growthStats,
				recommendations,
			};

			observability.recordEvent("agent-memory.insights-generated", {
				agentType,
				totalMemories,
				patternsCount: patterns.length,
				recommendationsCount: recommendations.length,
			});

			return insights;
		});
	}

	/**
	 * Share knowledge between agent sessions
	 */
	async shareKnowledge(
		fromAgentType: string,
		toAgentType: string,
		contextKey: string,
		options: {
			minImportance?: number;
			copyMetadata?: boolean;
			adjustImportance?: boolean;
		} = {}
	): Promise<{ shared: number; errors: number }> {
		return observability.trackOperation("agent-memory.share-knowledge", async () => {
			const { minImportance = 5, copyMetadata = true, adjustImportance = true } = options;

			// Get memories to share
			const memoriesToShare = await db
				.select()
				.from(agentMemory)
				.where(
					and(
						eq(agentMemory.agentType, fromAgentType),
						eq(agentMemory.contextKey, contextKey),
						gte(agentMemory.importance, minImportance),
						sql`${agentMemory.expiresAt} IS NULL OR ${agentMemory.expiresAt} > NOW()`
					)
				);

			let shared = 0;
			let errors = 0;

			for (const memory of memoriesToShare) {
				try {
					const newImportance = adjustImportance
						? Math.max(1, memory.importance - 1) // Reduce importance when sharing
						: memory.importance;

					await this.storeMemory(toAgentType, contextKey, memory.content, {
						importance: newImportance,
						metadata: copyMetadata
							? {
									...memory.metadata,
									sharedFrom: fromAgentType,
									originalImportance: memory.importance,
									sharedAt: new Date().toISOString(),
								}
							: { sharedFrom: fromAgentType },
						generateEmbedding: true,
					});

					shared++;
				} catch (error) {
					observability.recordError("agent-memory.share-error", error as Error, {
						memoryId: memory.id,
						fromAgentType,
						toAgentType,
					});
					errors++;
				}
			}

			observability.recordEvent("agent-memory.knowledge-shared", {
				fromAgentType,
				toAgentType,
				contextKey,
				shared,
				errors,
				minImportance,
			});

			return { shared, errors };
		});
	}

	/**
	 * Helper method to map database record to memory entry
	 */
	private mapToMemoryEntry(memory: AgentMemory): AgentMemoryEntry {
		return {
			id: memory.id,
			agentType: memory.agentType,
			contextKey: memory.contextKey,
			content: memory.content,
			embedding: memory.embedding,
			createdAt: memory.createdAt,
			lastAccessedAt: memory.lastAccessedAt,
			accessCount: memory.accessCount,
			metadata: memory.metadata,
			importance: memory.importance,
			expiresAt: memory.expiresAt,
		};
	}

	/**
	 * Get service statistics
	 */
	getStats() {
		return {
			initialized: this.initialized,
			vectorSearchStats: this.vectorSearch.getStats(),
		};
	}
}

// Singleton instance
export const agentMemoryService = new AgentMemoryService();
