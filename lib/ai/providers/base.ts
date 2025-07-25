/**
 * Base AI Provider Interface
 *
 * Defines the common interface and functionality for all AI providers
 */

import { z } from "zod";

// Common configuration schema
export const BaseProviderConfigSchema = z.object({
	apiKey: z.string().optional(),
	baseURL: z.string().optional(),
	organization: z.string().optional(),
	timeout: z.number().optional().default(30000),
	maxRetries: z.number().optional().default(3),
	headers: z.record(z.string()).optional(),
});

export type BaseProviderConfig = z.infer<typeof BaseProviderConfigSchema>;

// Model capability types
export const ModelCapability = z.enum([
	"chat",
	"completion",
	"embedding",
	"image-generation",
	"image-analysis",
	"audio-transcription",
	"audio-generation",
	"function-calling",
	"streaming",
	"json-mode",
	"vision",
]);

export type ModelCapabilityType = z.infer<typeof ModelCapability>;

// Model information schema
export const ModelInfoSchema = z.object({
	id: z.string(),
	name: z.string(),
	provider: z.string(),
	description: z.string().optional(),
	capabilities: z.array(ModelCapability),
	contextWindow: z.number(),
	maxOutputTokens: z.number().optional(),
	costPer1kInput: z.number().optional(),
	costPer1kOutput: z.number().optional(),
	deprecated: z.boolean().optional().default(false),
	replacedBy: z.string().optional(),
});

export type ModelInfo = z.infer<typeof ModelInfoSchema>;

// Message format for chat completions
export const MessageSchema = z.object({
	role: z.enum(["system", "user", "assistant", "function", "tool"]),
	content: z.string(),
	name: z.string().optional(),
	function_call: z
		.object({
			name: z.string(),
			arguments: z.string(),
		})
		.optional(),
	tool_calls: z
		.array(
			z.object({
				id: z.string(),
				type: z.enum(["function"]),
				function: z.object({
					name: z.string(),
					arguments: z.string(),
				}),
			})
		)
		.optional(),
});

export type Message = z.infer<typeof MessageSchema>;

// Completion options
export const CompletionOptionsSchema = z.object({
	model: z.string(),
	messages: z.array(MessageSchema),
	temperature: z.number().min(0).max(2).optional().default(0.7),
	maxTokens: z.number().optional(),
	topP: z.number().min(0).max(1).optional(),
	frequencyPenalty: z.number().min(-2).max(2).optional(),
	presencePenalty: z.number().min(-2).max(2).optional(),
	stop: z.union([z.string(), z.array(z.string())]).optional(),
	stream: z.boolean().optional().default(false),
	functions: z
		.array(
			z.object({
				name: z.string(),
				description: z.string(),
				parameters: z.record(z.any()),
			})
		)
		.optional(),
	functionCall: z
		.union([z.literal("auto"), z.literal("none"), z.object({ name: z.string() })])
		.optional(),
	tools: z
		.array(
			z.object({
				type: z.enum(["function"]),
				function: z.object({
					name: z.string(),
					description: z.string(),
					parameters: z.record(z.any()),
				}),
			})
		)
		.optional(),
	toolChoice: z
		.union([
			z.literal("auto"),
			z.literal("none"),
			z.literal("required"),
			z.object({
				type: z.enum(["function"]),
				function: z.object({ name: z.string() }),
			}),
		])
		.optional(),
	responseFormat: z
		.object({
			type: z.enum(["text", "json_object"]),
		})
		.optional(),
	seed: z.number().optional(),
	user: z.string().optional(),
});

export type CompletionOptions = z.infer<typeof CompletionOptionsSchema>;

// Completion response
export const CompletionResponseSchema = z.object({
	id: z.string(),
	object: z.string(),
	created: z.number(),
	model: z.string(),
	choices: z.array(
		z.object({
			index: z.number(),
			message: MessageSchema,
			finish_reason: z
				.enum(["stop", "length", "function_call", "tool_calls", "content_filter", null])
				.nullable(),
			logprobs: z.any().optional(),
		})
	),
	usage: z
		.object({
			prompt_tokens: z.number(),
			completion_tokens: z.number(),
			total_tokens: z.number(),
		})
		.optional(),
	system_fingerprint: z.string().optional(),
});

export type CompletionResponse = z.infer<typeof CompletionResponseSchema>;

// Embedding options
export const EmbeddingOptionsSchema = z.object({
	model: z.string(),
	input: z.union([z.string(), z.array(z.string())]),
	dimensions: z.number().optional(),
	user: z.string().optional(),
});

export type EmbeddingOptions = z.infer<typeof EmbeddingOptionsSchema>;

// Embedding response
export const EmbeddingResponseSchema = z.object({
	object: z.literal("list"),
	data: z.array(
		z.object({
			index: z.number(),
			embedding: z.array(z.number()),
			object: z.literal("embedding"),
		})
	),
	model: z.string(),
	usage: z.object({
		prompt_tokens: z.number(),
		total_tokens: z.number(),
	}),
});

export type EmbeddingResponse = z.infer<typeof EmbeddingResponseSchema>;

// Stream chunk for streaming responses
export interface StreamChunk {
	id: string;
	object: string;
	created: number;
	model: string;
	choices: Array<{
		index: number;
		delta: {
			role?: string;
			content?: string;
			function_call?: {
				name?: string;
				arguments?: string;
			};
			tool_calls?: Array<{
				index: number;
				id?: string;
				type?: "function";
				function?: {
					name?: string;
					arguments?: string;
				};
			}>;
		};
		finish_reason: string | null;
	}>;
}

// Abstract base provider class
export abstract class BaseAIProvider {
	protected config: BaseProviderConfig;

	constructor(config: BaseProviderConfig) {
		this.config = BaseProviderConfigSchema.parse(config);
	}

	// Abstract methods that each provider must implement
	abstract listModels(): Promise<ModelInfo[]>;
	abstract getModel(modelId: string): Promise<ModelInfo | null>;
	abstract createCompletion(options: CompletionOptions): Promise<CompletionResponse>;
	abstract createStreamingCompletion(
		options: CompletionOptions
	): Promise<AsyncIterable<StreamChunk>>;
	abstract createEmbedding(options: EmbeddingOptions): Promise<EmbeddingResponse>;

	// Common utility methods
	protected buildHeaders(additionalHeaders?: Record<string, string>): Record<string, string> {
		return {
			"Content-Type": "application/json",
			...this.config.headers,
			...additionalHeaders,
		};
	}

	protected async handleRetry<T>(
		fn: () => Promise<T>,
		retries = this.config.maxRetries || 3
	): Promise<T> {
		let lastError: Error | undefined;

		for (let i = 0; i < retries; i++) {
			try {
				return await fn();
			} catch (error) {
				lastError = error as Error;

				// Don't retry on auth errors
				if (error instanceof Error && error.message.includes("401")) {
					throw error;
				}

				// Exponential backoff
				if (i < retries - 1) {
					await new Promise((resolve) => setTimeout(resolve, 2 ** i * 1000));
				}
			}
		}

		throw lastError || new Error("Max retries exceeded");
	}

	// Rate limiting helper
	protected async rateLimitDelay(modelId: string): Promise<void> {
		// Override in subclasses if needed
		return Promise.resolve();
	}
}

// Provider registry
export class ProviderRegistry {
	private static providers = new Map<string, BaseAIProvider>();

	static register(name: string, provider: BaseAIProvider): void {
		ProviderRegistry.providers.set(name, provider);
	}

	static get(name: string): BaseAIProvider | undefined {
		return ProviderRegistry.providers.get(name);
	}

	static list(): string[] {
		return Array.from(ProviderRegistry.providers.keys());
	}

	static clear(): void {
		ProviderRegistry.providers.clear();
	}
}

// Helper to validate model capabilities
export function hasCapability(model: ModelInfo, capability: ModelCapabilityType): boolean {
	return model.capabilities.includes(capability);
}

// Helper to find best model for a use case
export function findBestModel(
	models: ModelInfo[],
	requirements: {
		capabilities: ModelCapabilityType[];
		maxCostPer1kTokens?: number;
		minContextWindow?: number;
	}
): ModelInfo | null {
	const suitable = models.filter((model) => {
		// Check all required capabilities
		if (!requirements.capabilities.every((cap) => hasCapability(model, cap))) {
			return false;
		}

		// Check context window
		if (requirements.minContextWindow && model.contextWindow < requirements.minContextWindow) {
			return false;
		}

		// Check cost
		if (requirements.maxCostPer1kTokens) {
			const avgCost = ((model.costPer1kInput || 0) + (model.costPer1kOutput || 0)) / 2;
			if (avgCost > requirements.maxCostPer1kTokens) {
				return false;
			}
		}

		// Skip deprecated models
		return !model.deprecated;
	});

	// Sort by cost (cheapest first) and return the best option
	suitable.sort((a, b) => {
		const costA = ((a.costPer1kInput || 0) + (a.costPer1kOutput || 0)) / 2;
		const costB = ((b.costPer1kInput || 0) + (b.costPer1kOutput || 0)) / 2;
		return costA - costB;
	});

	return suitable[0] || null;
}
