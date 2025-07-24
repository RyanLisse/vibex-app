/**
 * Unified AI Client
 *
 * Provides a unified interface for interacting with multiple AI providers
 * with automatic fallback, load balancing, and advanced features.
 */

import { z } from "zod";
import {
	BaseAIProvider,
	ProviderRegistry,
	CompletionOptions,
	CompletionResponse,
	EmbeddingOptions,
	EmbeddingResponse,
	ModelInfo,
	StreamChunk,
	findBestModel,
	hasCapability,
	ModelCapabilityType,
} from "./providers";
import { logger } from "@/lib/logging";

// Unified client configuration
export const UnifiedAIConfigSchema = z.object({
	defaultProvider: z.string().optional(),
	fallbackProviders: z.array(z.string()).optional(),
	timeout: z.number().optional().default(30000),
	maxRetries: z.number().optional().default(3),
	loadBalancing: z
		.enum(["round-robin", "least-latency", "random"])
		.optional()
		.default("round-robin"),
	caching: z.boolean().optional().default(true),
	cacheTTL: z.number().optional().default(3600000), // 1 hour
});

export type UnifiedAIConfig = z.infer<typeof UnifiedAIConfigSchema>;

// Request result with metadata
export interface AIResult<T> {
	data: T;
	provider: string;
	model: string;
	latency: number;
	cached: boolean;
}

// Cache entry
interface CacheEntry<T> {
	data: T;
	provider: string;
	model: string;
	timestamp: number;
}

export class UnifiedAIClient {
	private config: UnifiedAIConfig;
	private currentProviderIndex = 0;
	private providerLatencies = new Map<string, number[]>();
	private cache = new Map<string, CacheEntry<any>>();

	constructor(config: UnifiedAIConfig = {}) {
		this.config = UnifiedAIConfigSchema.parse(config);
	}

	/**
	 * List all available models across all providers
	 */
	async listModels(options?: {
		provider?: string;
		capabilities?: ModelCapabilityType[];
	}): Promise<ModelInfo[]> {
		const providers = options?.provider ? [options.provider] : ProviderRegistry.list();

		const allModels: ModelInfo[] = [];

		for (const providerName of providers) {
			const provider = ProviderRegistry.get(providerName);
			if (provider) {
				try {
					const models = await provider.listModels();
					const filteredModels = options?.capabilities
						? models.filter((model) =>
								options.capabilities!.every((cap) => hasCapability(model, cap))
							)
						: models;

					allModels.push(...filteredModels);
				} catch (error) {
					logger.warn(`Failed to list models from ${providerName}`, { error });
				}
			}
		}

		return allModels;
	}

	/**
	 * Get information about a specific model
	 */
	async getModel(modelId: string, provider?: string): Promise<ModelInfo | null> {
		if (provider) {
			const providerInstance = ProviderRegistry.get(provider);
			return providerInstance ? providerInstance.getModel(modelId) : null;
		}

		// Search across all providers
		for (const providerName of ProviderRegistry.list()) {
			const providerInstance = ProviderRegistry.get(providerName);
			if (providerInstance) {
				const model = await providerInstance.getModel(modelId);
				if (model) return model;
			}
		}

		return null;
	}

	/**
	 * Create a chat completion with automatic provider selection and fallback
	 */
	async createCompletion(
		options: CompletionOptions & { provider?: string }
	): Promise<AIResult<CompletionResponse>> {
		const cacheKey = this.getCacheKey("completion", options);

		// Check cache
		if (this.config.caching) {
			const cached = this.getFromCache<CompletionResponse>(cacheKey);
			if (cached) {
				return {
					data: cached.data,
					provider: cached.provider,
					model: cached.model,
					latency: 0,
					cached: true,
				};
			}
		}

		// Try specified provider first
		if (options.provider) {
			const result = await this.tryProvider(options.provider, options, (provider) =>
				provider.createCompletion(options)
			);

			if (result) {
				if (this.config.caching) {
					this.addToCache(cacheKey, result.data, result.provider, options.model);
				}
				return result;
			}
		}

		// Try default provider
		if (this.config.defaultProvider) {
			const result = await this.tryProvider(this.config.defaultProvider, options, (provider) =>
				provider.createCompletion(options)
			);

			if (result) {
				if (this.config.caching) {
					this.addToCache(cacheKey, result.data, result.provider, options.model);
				}
				return result;
			}
		}

		// Try fallback providers
		if (this.config.fallbackProviders) {
			for (const providerName of this.config.fallbackProviders) {
				const result = await this.tryProvider(providerName, options, (provider) =>
					provider.createCompletion(options)
				);

				if (result) {
					if (this.config.caching) {
						this.addToCache(cacheKey, result.data, result.provider, options.model);
					}
					return result;
				}
			}
		}

		// Try any available provider using load balancing
		const availableProviders = ProviderRegistry.list();
		const provider = this.selectProvider(availableProviders);

		if (provider) {
			const result = await this.tryProvider(provider, options, (provider) =>
				provider.createCompletion(options)
			);

			if (result) {
				if (this.config.caching) {
					this.addToCache(cacheKey, result.data, result.provider, options.model);
				}
				return result;
			}
		}

		throw new Error("No AI provider available for completion request");
	}

	/**
	 * Create a streaming chat completion
	 */
	async createStreamingCompletion(
		options: CompletionOptions & { provider?: string }
	): Promise<AIResult<AsyncIterable<StreamChunk>>> {
		// Streaming responses are not cached

		// Try specified provider first
		if (options.provider) {
			const result = await this.tryProvider(options.provider, options, (provider) =>
				provider.createStreamingCompletion(options)
			);

			if (result) return result;
		}

		// Try default provider
		if (this.config.defaultProvider) {
			const result = await this.tryProvider(this.config.defaultProvider, options, (provider) =>
				provider.createStreamingCompletion(options)
			);

			if (result) return result;
		}

		// Try any available provider
		const availableProviders = ProviderRegistry.list();
		const provider = this.selectProvider(availableProviders);

		if (provider) {
			const result = await this.tryProvider(provider, options, (provider) =>
				provider.createStreamingCompletion(options)
			);

			if (result) return result;
		}

		throw new Error("No AI provider available for streaming completion request");
	}

	/**
	 * Create embeddings with automatic provider selection
	 */
	async createEmbedding(
		options: EmbeddingOptions & { provider?: string }
	): Promise<AIResult<EmbeddingResponse>> {
		const cacheKey = this.getCacheKey("embedding", options);

		// Check cache
		if (this.config.caching) {
			const cached = this.getFromCache<EmbeddingResponse>(cacheKey);
			if (cached) {
				return {
					data: cached.data,
					provider: cached.provider,
					model: cached.model,
					latency: 0,
					cached: true,
				};
			}
		}

		// For embeddings, we need to find a provider that supports them
		const providers = options.provider
			? [options.provider]
			: [
					...(this.config.defaultProvider ? [this.config.defaultProvider] : []),
					...(this.config.fallbackProviders || []),
					...ProviderRegistry.list(),
				];

		for (const providerName of providers) {
			const providerInstance = ProviderRegistry.get(providerName);
			if (providerInstance) {
				// Check if this provider has embedding models
				const models = await providerInstance.listModels();
				const hasEmbeddingModel = models.some(
					(m) => hasCapability(m, "embedding") && m.id === options.model
				);

				if (hasEmbeddingModel) {
					const result = await this.tryProvider(providerName, options, (provider) =>
						provider.createEmbedding(options)
					);

					if (result) {
						if (this.config.caching) {
							this.addToCache(cacheKey, result.data, result.provider, options.model);
						}
						return result;
					}
				}
			}
		}

		throw new Error("No AI provider available for embedding request");
	}

	/**
	 * Find the best model across all providers for a specific use case
	 */
	async findBestModel(requirements: {
		capabilities: ModelCapabilityType[];
		maxCostPer1kTokens?: number;
		minContextWindow?: number;
		preferredProvider?: string;
	}): Promise<ModelInfo | null> {
		const allModels = await this.listModels();

		// First try preferred provider
		if (requirements.preferredProvider) {
			const providerModels = allModels.filter((m) => m.provider === requirements.preferredProvider);
			const best = findBestModel(providerModels, requirements);
			if (best) return best;
		}

		// Then try all models
		return findBestModel(allModels, requirements);
	}

	/**
	 * Clear the cache
	 */
	clearCache(): void {
		this.cache.clear();
	}

	/**
	 * Get provider statistics
	 */
	getProviderStats(): Map<
		string,
		{
			avgLatency: number;
			requestCount: number;
			errorRate: number;
		}
	> {
		const stats = new Map();

		for (const [provider, latencies] of this.providerLatencies) {
			const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
			stats.set(provider, {
				avgLatency,
				requestCount: latencies.length,
				errorRate: 0, // TODO: Track errors
			});
		}

		return stats;
	}

	// Private helper methods

	private async tryProvider<T>(
		providerName: string,
		options: any,
		fn: (provider: BaseAIProvider) => Promise<T>
	): Promise<AIResult<T> | null> {
		const provider = ProviderRegistry.get(providerName);
		if (!provider) return null;

		const startTime = Date.now();

		try {
			const data = await fn(provider);
			const latency = Date.now() - startTime;

			// Track latency
			this.trackLatency(providerName, latency);

			return {
				data,
				provider: providerName,
				model: options.model,
				latency,
				cached: false,
			};
		} catch (error) {
			logger.warn(`Provider ${providerName} failed`, {
				error,
				model: options.model,
			});
			return null;
		}
	}

	private selectProvider(providers: string[]): string | null {
		if (providers.length === 0) return null;

		switch (this.config.loadBalancing) {
			case "round-robin":
				const provider = providers[this.currentProviderIndex % providers.length];
				this.currentProviderIndex++;
				return provider;

			case "least-latency":
				let bestProvider = providers[0];
				let bestLatency = Infinity;

				for (const provider of providers) {
					const latencies = this.providerLatencies.get(provider) || [];
					if (latencies.length === 0) return provider; // No data, try it

					const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
					if (avgLatency < bestLatency) {
						bestLatency = avgLatency;
						bestProvider = provider;
					}
				}

				return bestProvider;

			case "random":
				return providers[Math.floor(Math.random() * providers.length)];

			default:
				return providers[0];
		}
	}

	private trackLatency(provider: string, latency: number): void {
		const latencies = this.providerLatencies.get(provider) || [];
		latencies.push(latency);

		// Keep only last 100 latencies
		if (latencies.length > 100) {
			latencies.shift();
		}

		this.providerLatencies.set(provider, latencies);
	}

	private getCacheKey(type: string, options: any): string {
		const key = {
			type,
			model: options.model,
			messages: options.messages,
			input: options.input,
			temperature: options.temperature,
			maxTokens: options.maxTokens,
		};

		return JSON.stringify(key);
	}

	private getFromCache<T>(key: string): CacheEntry<T> | null {
		const entry = this.cache.get(key);
		if (!entry) return null;

		// Check if cache is expired
		if (Date.now() - entry.timestamp > this.config.cacheTTL) {
			this.cache.delete(key);
			return null;
		}

		return entry;
	}

	private addToCache<T>(key: string, data: T, provider: string, model: string): void {
		this.cache.set(key, {
			data,
			provider,
			model,
			timestamp: Date.now(),
		});

		// Limit cache size
		if (this.cache.size > 1000) {
			const firstKey = this.cache.keys().next().value;
			this.cache.delete(firstKey);
		}
	}
}

// Default instance
export const unifiedAI = new UnifiedAIClient();
