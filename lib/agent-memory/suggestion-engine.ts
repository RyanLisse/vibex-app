/**
 * Agent Memory Suggestion Engine
 *
 * Provides intelligent memory suggestions based on context,
 * patterns, and agent behavior.
 */

import { observability } from "@/lib/observability";
import { memoryRepository } from "./repository";
import { memorySearchService } from "./search-service";
	MemoryContext,
	MemoryEntry,
	MemorySuggestion,
	MemoryType,
} from "./types";

interface SuggestionStrategy {
	name: string;
	weight: number;
	getSuggestions(context: SuggestionContext): Promise<MemorySuggestion[]>;
}

interface SuggestionContext {
	agentType: string;
	contextKey: string;
	currentTask?: string;
	recentMemories: MemoryEntry[];
	userContext: Record<string, any>;
	environmentContext: Record<string, any>;
}

export class MemorySuggestionEngine {
	private static instance: MemorySuggestionEngine;
	private strategies: SuggestionStrategy[] = [];
	private suggestionCache: Map<string, MemorySuggestion[]> = new Map();
	private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

	private constructor() {
		this.initializeStrategies();
	}

	static getInstance(): MemorySuggestionEngine {
		if (!MemorySuggestionEngine.instance) {
			MemorySuggestionEngine.instance = new MemorySuggestionEngine();
		}
		return MemorySuggestionEngine.instance;
	}

	/**
	 * Get memory suggestions for a context
	 */
	async getSuggestions(
		context: MemoryContext,
		options: {
			maxSuggestions?: number;
			minConfidence?: number;
			strategies?: string[];
		} = {},
	): Promise<MemorySuggestion[]> {
		const startTime = Date.now();

		try {
			// Check cache
			const cacheKey = this.getCacheKey(context);
			const cached = this.getCachedSuggestions(cacheKey);
			if (cached) {
				return cached;
			}

			// Prepare suggestion context
			const suggestionContext: SuggestionContext = {
				agentType: context.agentType,
				contextKey: context.contextKey,
				currentTask: context.currentTask,
				recentMemories: context.recentMemories,
				userContext: context.userContext,
				environmentContext: context.environmentContext,
			};

			// Run all strategies in parallel
			const strategyPromises = this.strategies
				.filter(
					(s) => !options.strategies || options.strategies.includes(s.name),
				)
				.map((strategy) => this.runStrategy(strategy, suggestionContext));

			const allSuggestions = await Promise.all(strategyPromises);

			// Merge and rank suggestions
			const mergedSuggestions = this.mergeSuggestions(allSuggestions.flat());

			// Filter by confidence
			const filteredSuggestions = mergedSuggestions.filter(
				(s) => s.confidence >= (options.minConfidence || 0.5),
			);

			// Limit suggestions
			const limitedSuggestions = filteredSuggestions.slice(
				0,
				options.maxSuggestions || 10,
			);

			// Cache results
			this.setCachedSuggestions(cacheKey, limitedSuggestions);

			const duration = Date.now() - startTime;
			observability.metrics.recordOperation("memory_suggestions", duration);

			await observability.recordEvent("memory_suggestions_generated", {
				agentType: context.agentType,
				suggestionCount: limitedSuggestions.length,
				duration,
			});

			return limitedSuggestions;
		} catch (error) {
			observability.recordError("memory_suggestions", error as Error);
			throw error;
		}
	}

	/**
	 * Run a suggestion strategy
	 */
	private async runStrategy(
		strategy: SuggestionStrategy,
		context: SuggestionContext,
	): Promise<MemorySuggestion[]> {
		try {
			const suggestions = await strategy.getSuggestions(context);

			// Apply strategy weight
			return suggestions.map((s) => ({
				...s,
				confidence: s.confidence * strategy.weight,
			}));
		} catch (error) {
			console.error(`Strategy ${strategy.name} failed:`, error);
			return [];
		}
	}

	/**
	 * Initialize suggestion strategies
	 */
	private initializeStrategies(): void {
		// Task-based suggestions
		this.strategies.push({
			name: "task_similarity",
			weight: 1.2,
			getSuggestions: async (context) => {
				if (!context.currentTask) return [];

				const results = await memorySearchService.search(context.currentTask, {
					agentType: context.agentType,
					types: ["task_execution", "learned_pattern"],
					limit: 5,
				});

				return results
					.filter((r) => r.score.total > 0.7)
					.map((r) => ({
						memory: r.memory,
						reason: "Similar to current task",
						relevanceScore: r.score.total,
						confidence: r.score.semantic,
					}));
			},
		});

		// Pattern recognition
		this.strategies.push({
			name: "pattern_matching",
			weight: 1.0,
			getSuggestions: async (context) => {
				// Look for patterns in recent memories
				const patterns = this.extractPatterns(context.recentMemories);

				if (patterns.length === 0) return [];

				const suggestions: MemorySuggestion[] = [];

				for (const pattern of patterns) {
					const results = await memorySearchService.search(pattern, {
						agentType: context.agentType,
						types: ["learned_pattern", "skill_acquisition"],
						limit: 3,
					});

					suggestions.push(
						...results
							.filter((r) => r.score.total > 0.6)
							.map((r) => ({
								memory: r.memory,
								reason: `Matches pattern: ${pattern}`,
								relevanceScore: r.score.total,
								confidence: 0.8,
							})),
					);
				}

				return suggestions;
			},
		});

		// Error prevention
		this.strategies.push({
			name: "error_prevention",
			weight: 1.3,
			getSuggestions: async (context) => {
				// Check for error-prone patterns
				const errorContext = this.detectErrorContext(context);

				if (!errorContext) return [];

				const results = await memorySearchService.searchByType(
					["error_resolution"],
					{
						agentType: context.agentType,
						limit: 5,
					},
				);

				return results
					.filter((r) => r.score.total > 0.5)
					.map((r) => ({
						memory: r.memory,
						reason: "Prevent potential error",
						relevanceScore: r.score.total * 1.2,
						confidence: 0.9,
					}));
			},
		});

		// User preference based
		this.strategies.push({
			name: "user_preferences",
			weight: 0.9,
			getSuggestions: async (context) => {
				const userPrefs = context.userContext.preferences || {};

				if (Object.keys(userPrefs).length === 0) return [];

				const results = await memorySearchService.searchByType(
					["user_preference"],
					{
						agentType: context.agentType,
						limit: 3,
					},
				);

				return results.map((r) => ({
					memory: r.memory,
					reason: "User preference",
					relevanceScore: r.score.total,
					confidence: 0.85,
				}));
			},
		});

		// Contextual relevance
		this.strategies.push({
			name: "contextual_relevance",
			weight: 1.1,
			getSuggestions: async (context) => {
				// Build context query from environment
				const contextTerms = this.extractContextTerms(context);

				if (contextTerms.length === 0) return [];

				const query = contextTerms.join(" ");
				const results = await memorySearchService.search(query, {
					agentType: context.agentType,
					limit: 5,
				});

				return results
					.filter((r) => r.score.total > 0.65)
					.map((r) => ({
						memory: r.memory,
						reason: "Contextually relevant",
						relevanceScore: r.score.total,
						confidence: r.score.total * 0.9,
					}));
			},
		});

		// Frequently accessed
		this.strategies.push({
			name: "frequently_accessed",
			weight: 0.8,
			getSuggestions: async (context) => {
				const memories = await memoryRepository.getMostAccessed(
					context.agentType,
					5,
				);

				return memories
					.filter((m) => m.accessCount > 5)
					.map((m) => ({
						memory: m,
						reason: "Frequently accessed",
						relevanceScore: Math.min(m.accessCount / 50, 1),
						confidence: 0.7,
					}));
			},
		});

		// Cross-agent knowledge
		this.strategies.push({
			name: "cross_agent_knowledge",
			weight: 0.7,
			getSuggestions: async (context) => {
				const sharedMemories = await memoryRepository.search({
					tags: ["shared", "cross-agent"],
					importance: { min: 6 },
					limit: 3,
				});

				return sharedMemories.map((m) => ({
					memory: m,
					reason: `Knowledge from ${m.metadata.source || "other agent"}`,
					relevanceScore: m.importance / 10,
					confidence: 0.6,
				}));
			},
		});
	}

	/**
	 * Extract patterns from recent memories
	 */
	private extractPatterns(memories: MemoryEntry[]): string[] {
		const patterns: string[] = [];
		const contentWords = new Map<string, number>();

		// Count word frequencies
		for (const memory of memories) {
			const words = memory.content
				.toLowerCase()
				.split(/\s+/)
				.filter((w) => w.length > 3);

			for (const word of words) {
				contentWords.set(word, (contentWords.get(word) || 0) + 1);
			}
		}

		// Find frequent words as patterns
		for (const [word, count] of contentWords.entries()) {
			if (count >= 3) {
				patterns.push(word);
			}
		}

		return patterns.slice(0, 5);
	}

	/**
	 * Detect error-prone context
	 */
	private detectErrorContext(context: SuggestionContext): string | null {
		// Check for error indicators
		if (context.environmentContext.hasRecentErrors) {
			return "recent_errors";
		}

		// Check for complex task patterns
		if (
			context.currentTask?.includes("complex") ||
			context.currentTask?.includes("difficult")
		) {
			return "complex_task";
		}

		// Check recent memories for error patterns
		const errorMemories = context.recentMemories.filter(
			(m) =>
				m.metadata.type === "error_resolution" ||
				m.content.toLowerCase().includes("error") ||
				m.content.toLowerCase().includes("failed"),
		);

		if (errorMemories.length > 0) {
			return "error_pattern";
		}

		return null;
	}

	/**
	 * Extract context terms for search
	 */
	private extractContextTerms(context: SuggestionContext): string[] {
		const terms: string[] = [];

		// Add current task terms
		if (context.currentTask) {
			terms.push(
				...context.currentTask.split(/\s+/).filter((t) => t.length > 2),
			);
		}

		// Add environment context terms
		if (context.environmentContext.currentTool) {
			terms.push(context.environmentContext.currentTool);
		}

		// Add user context terms
		if (context.userContext.focus) {
			terms.push(context.userContext.focus);
		}

		return [...new Set(terms)].slice(0, 10);
	}

	/**
	 * Merge suggestions from multiple strategies
	 */
	private mergeSuggestions(
		suggestions: MemorySuggestion[],
	): MemorySuggestion[] {
		// Group by memory ID
		const grouped = new Map<string, MemorySuggestion[]>();

		for (const suggestion of suggestions) {
			const id = suggestion.memory.id;
			if (!grouped.has(id)) {
				grouped.set(id, []);
			}
			grouped.get(id)!.push(suggestion);
		}

		// Merge duplicates
		const merged: MemorySuggestion[] = [];

		for (const [id, group] of grouped.entries()) {
			// Combine reasons
			const reasons = [...new Set(group.map((s) => s.reason))].join(", ");

			// Average scores
			const avgRelevance =
				group.reduce((sum, s) => sum + s.relevanceScore, 0) / group.length;
			const avgConfidence =
				group.reduce((sum, s) => sum + s.confidence, 0) / group.length;

			// Boost for multiple strategies suggesting the same memory
			const multiStrategyBoost = 1 + (group.length - 1) * 0.1;

			merged.push({
				memory: group[0].memory,
				reason: reasons,
				relevanceScore: Math.min(avgRelevance * multiStrategyBoost, 1),
				confidence: Math.min(avgConfidence * multiStrategyBoost, 1),
			});
		}

		// Sort by relevance score
		merged.sort((a, b) => b.relevanceScore - a.relevanceScore);

		return merged;
	}

	/**
	 * Generate cache key
	 */
	private getCacheKey(context: MemoryContext): string {
		return `${context.agentType}:${context.contextKey}:${context.currentTask || "none"}`;
	}

	/**
	 * Get cached suggestions
	 */
	private getCachedSuggestions(key: string): MemorySuggestion[] | null {
		const cached = this.suggestionCache.get(key);
		if (!cached) return null;

		// Check if cache is still valid
		const cacheData = cached as any;
		if (
			cacheData._timestamp &&
			Date.now() - cacheData._timestamp > this.CACHE_TTL
		) {
			this.suggestionCache.delete(key);
			return null;
		}

		return cached;
	}

	/**
	 * Set cached suggestions
	 */
	private setCachedSuggestions(
		key: string,
		suggestions: MemorySuggestion[],
	): void {
		const cacheData = suggestions as any;
		cacheData._timestamp = Date.now();

		// Limit cache size
		if (this.suggestionCache.size >= 100) {
			const firstKey = this.suggestionCache.keys().next().value;
			this.suggestionCache.delete(firstKey);
		}

		this.suggestionCache.set(key, cacheData);
	}

	/**
	 * Register custom strategy
	 */
	registerStrategy(strategy: SuggestionStrategy): void {
		this.strategies.push(strategy);
		console.log(`Registered suggestion strategy: ${strategy.name}`);
	}

	/**
	 * Clear cache
	 */
	clearCache(): void {
		this.suggestionCache.clear();
	}
}

// Export singleton instance
export const memorySuggestionEngine = MemorySuggestionEngine.getInstance();
