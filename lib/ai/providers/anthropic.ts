/**
 * Anthropic Provider Implementation
 *
 * Implements the Anthropic API integration with support for Claude models
 * including Claude 3 Opus, Sonnet, and Haiku.
 */

import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import {
	BaseAIProvider,
	BaseProviderConfig,
	CompletionOptions,
	CompletionResponse,
	EmbeddingOptions,
	EmbeddingResponse,
	ModelInfo,
	StreamChunk,
	Message,
} from "./base";

// Anthropic-specific configuration
export const AnthropicConfigSchema = BaseProviderConfig.extend({
	apiKey: z.string(),
	baseURL: z.string().optional(),
	authToken: z.string().optional(),
});

export type AnthropicConfig = z.infer<typeof AnthropicConfigSchema>;

// Anthropic model definitions
export const ANTHROPIC_MODELS: ModelInfo[] = [
	// Claude 3 models
	{
		id: "claude-3-opus-20240229",
		name: "Claude 3 Opus",
		provider: "anthropic",
		description: "Most powerful model for highly complex tasks",
		capabilities: ["chat", "function-calling", "streaming", "vision"],
		contextWindow: 200000,
		maxOutputTokens: 4096,
		costPer1kInput: 0.015,
		costPer1kOutput: 0.075,
	},
	{
		id: "claude-3-5-sonnet-20241022",
		name: "Claude 3.5 Sonnet",
		provider: "anthropic",
		description: "Balanced performance and cost for most tasks",
		capabilities: ["chat", "function-calling", "streaming", "vision"],
		contextWindow: 200000,
		maxOutputTokens: 8192,
		costPer1kInput: 0.003,
		costPer1kOutput: 0.015,
	},
	{
		id: "claude-3-haiku-20240307",
		name: "Claude 3 Haiku",
		provider: "anthropic",
		description: "Fast and cost-effective for simple tasks",
		capabilities: ["chat", "function-calling", "streaming", "vision"],
		contextWindow: 200000,
		maxOutputTokens: 4096,
		costPer1kInput: 0.00025,
		costPer1kOutput: 0.00125,
	},

	// Claude 2 models (legacy)
	{
		id: "claude-2.1",
		name: "Claude 2.1",
		provider: "anthropic",
		description: "Previous generation model with 200K context",
		capabilities: ["chat", "streaming"],
		contextWindow: 200000,
		maxOutputTokens: 4096,
		costPer1kInput: 0.008,
		costPer1kOutput: 0.024,
		deprecated: true,
		replacedBy: "claude-3-haiku-20240307",
	},
	{
		id: "claude-2.0",
		name: "Claude 2.0",
		provider: "anthropic",
		description: "Previous generation model",
		capabilities: ["chat", "streaming"],
		contextWindow: 100000,
		maxOutputTokens: 4096,
		costPer1kInput: 0.008,
		costPer1kOutput: 0.024,
		deprecated: true,
		replacedBy: "claude-2.1",
	},

	// Claude Instant models
	{
		id: "claude-instant-1.2",
		name: "Claude Instant 1.2",
		provider: "anthropic",
		description: "Fast, affordable model for simple tasks",
		capabilities: ["chat", "streaming"],
		contextWindow: 100000,
		maxOutputTokens: 4096,
		costPer1kInput: 0.0008,
		costPer1kOutput: 0.0024,
		deprecated: true,
		replacedBy: "claude-3-haiku-20240307",
	},
];

export class AnthropicProvider extends BaseAIProvider {
	private client: Anthropic;

	constructor(config: AnthropicConfig) {
		super(config);
		const validatedConfig = AnthropicConfigSchema.parse(config);

		this.client = new Anthropic({
			apiKey: validatedConfig.apiKey,
			baseURL: validatedConfig.baseURL,
			authToken: validatedConfig.authToken,
			timeout: validatedConfig.timeout,
			maxRetries: validatedConfig.maxRetries,
			defaultHeaders: validatedConfig.headers,
		});
	}

	async listModels(): Promise<ModelInfo[]> {
		return ANTHROPIC_MODELS;
	}

	async getModel(modelId: string): Promise<ModelInfo | null> {
		const model = ANTHROPIC_MODELS.find((m) => m.id === modelId);
		return model || null;
	}

	async createCompletion(options: CompletionOptions): Promise<CompletionResponse> {
		return this.handleRetry(async () => {
			// Convert messages to Anthropic format
			const { system, messages } = this.convertMessages(options.messages);

			const response = await this.client.messages.create({
				model: options.model,
				messages: messages as any,
				system,
				max_tokens: options.maxTokens || 4096,
				temperature: options.temperature,
				top_p: options.topP,
				stop_sequences: Array.isArray(options.stop)
					? options.stop
					: options.stop
						? [options.stop]
						: undefined,
				stream: false,
				tools: options.tools ? this.convertTools(options.tools) : undefined,
				tool_choice: options.toolChoice ? this.convertToolChoice(options.toolChoice) : undefined,
				metadata: options.user ? { user_id: options.user } : undefined,
			});

			return this.convertResponse(response, options.model);
		});
	}

	async createStreamingCompletion(options: CompletionOptions): Promise<AsyncIterable<StreamChunk>> {
		const { system, messages } = this.convertMessages(options.messages);

		const stream = await this.client.messages.create({
			model: options.model,
			messages: messages as any,
			system,
			max_tokens: options.maxTokens || 4096,
			temperature: options.temperature,
			top_p: options.topP,
			stop_sequences: Array.isArray(options.stop)
				? options.stop
				: options.stop
					? [options.stop]
					: undefined,
			stream: true,
			tools: options.tools ? this.convertTools(options.tools) : undefined,
			tool_choice: options.toolChoice ? this.convertToolChoice(options.toolChoice) : undefined,
			metadata: options.user ? { user_id: options.user } : undefined,
		});

		return this.convertStream(stream, options.model);
	}

	async createEmbedding(_options: EmbeddingOptions): Promise<EmbeddingResponse> {
		// Anthropic doesn't provide embedding models currently
		throw new Error(
			"Anthropic does not support embedding models. Use OpenAI or another provider for embeddings."
		);
	}

	// Helper methods
	private convertMessages(messages: Message[]): {
		system?: string;
		messages: Array<{
			role: "user" | "assistant";
			content: string | Array<any>;
		}>;
	} {
		let system: string | undefined;
		const convertedMessages: Array<{
			role: "user" | "assistant";
			content: string | Array<any>;
		}> = [];

		for (const message of messages) {
			if (message.role === "system") {
				// Anthropic uses a separate system parameter
				system = message.content;
			} else if (message.role === "user") {
				convertedMessages.push({
					role: "user",
					content: message.content,
				});
			} else if (message.role === "assistant") {
				// Handle tool calls in assistant messages
				if (message.tool_calls) {
					const content: any[] = [];
					if (message.content) {
						content.push({ type: "text", text: message.content });
					}
					for (const toolCall of message.tool_calls) {
						content.push({
							type: "tool_use",
							id: toolCall.id,
							name: toolCall.function.name,
							input: JSON.parse(toolCall.function.arguments),
						});
					}
					convertedMessages.push({
						role: "assistant",
						content,
					});
				} else {
					convertedMessages.push({
						role: "assistant",
						content: message.content,
					});
				}
			} else if (message.role === "tool") {
				// Tool results go in user messages in Anthropic format
				convertedMessages.push({
					role: "user",
					content: [
						{
							type: "tool_result",
							tool_use_id: message.name || "",
							content: message.content,
						},
					],
				});
			} else if (message.role === "function") {
				// Legacy function format - convert to tool result
				convertedMessages.push({
					role: "user",
					content: [
						{
							type: "tool_result",
							tool_use_id: message.name || "",
							content: message.content,
						},
					],
				});
			}
		}

		return { system, messages: convertedMessages };
	}

	private convertTools(tools: any[]): any[] {
		return tools.map((tool) => ({
			name: tool.function.name,
			description: tool.function.description,
			input_schema: tool.function.parameters,
		}));
	}

	private convertToolChoice(toolChoice: any): any {
		if (toolChoice === "auto") return { type: "auto" };
		if (toolChoice === "none") return { type: "none" };
		if (toolChoice === "required") return { type: "any" };
		if (toolChoice?.function?.name) {
			return { type: "tool", name: toolChoice.function.name };
		}
		return { type: "auto" };
	}

	private convertResponse(response: any, model: string): CompletionResponse {
		const message: Message = {
			role: "assistant",
			content: "",
		};

		// Handle content blocks
		const toolCalls: any[] = [];
		for (const block of response.content) {
			if (block.type === "text") {
				message.content += block.text;
			} else if (block.type === "tool_use") {
				toolCalls.push({
					id: block.id,
					type: "function",
					function: {
						name: block.name,
						arguments: JSON.stringify(block.input),
					},
				});
			}
		}

		if (toolCalls.length > 0) {
			message.tool_calls = toolCalls;
		}

		return {
			id: response.id,
			object: "chat.completion",
			created: Math.floor(Date.now() / 1000),
			model,
			choices: [
				{
					index: 0,
					message,
					finish_reason:
						response.stop_reason === "end_turn"
							? "stop"
							: response.stop_reason === "max_tokens"
								? "length"
								: response.stop_reason === "tool_use"
									? "tool_calls"
									: null,
					logprobs: null,
				},
			],
			usage: {
				prompt_tokens: response.usage.input_tokens,
				completion_tokens: response.usage.output_tokens,
				total_tokens: response.usage.input_tokens + response.usage.output_tokens,
			},
		};
	}

	private async *convertStream(stream: any, model: string): AsyncIterable<StreamChunk> {
		let messageId = "";
		let toolCallIndex = 0;
		const toolCalls = new Map<number, any>();

		for await (const event of stream) {
			if (event.type === "message_start") {
				messageId = event.message.id;
				yield {
					id: messageId,
					object: "chat.completion.chunk",
					created: Math.floor(Date.now() / 1000),
					model,
					choices: [
						{
							index: 0,
							delta: { role: "assistant", content: "" },
							finish_reason: null,
						},
					],
				};
			} else if (event.type === "content_block_start") {
				if (event.content_block.type === "tool_use") {
					const toolCall = {
						index: toolCallIndex++,
						id: event.content_block.id,
						type: "function",
						function: {
							name: event.content_block.name,
							arguments: "",
						},
					};
					toolCalls.set(event.index, toolCall);

					yield {
						id: messageId,
						object: "chat.completion.chunk",
						created: Math.floor(Date.now() / 1000),
						model,
						choices: [
							{
								index: 0,
								delta: {
									tool_calls: [toolCall],
								},
								finish_reason: null,
							},
						],
					};
				}
			} else if (event.type === "content_block_delta") {
				if (event.delta.type === "text_delta") {
					yield {
						id: messageId,
						object: "chat.completion.chunk",
						created: Math.floor(Date.now() / 1000),
						model,
						choices: [
							{
								index: 0,
								delta: { content: event.delta.text },
								finish_reason: null,
							},
						],
					};
				} else if (event.delta.type === "input_json_delta") {
					const toolCall = toolCalls.get(event.index);
					if (toolCall) {
						yield {
							id: messageId,
							object: "chat.completion.chunk",
							created: Math.floor(Date.now() / 1000),
							model,
							choices: [
								{
									index: 0,
									delta: {
										tool_calls: [
											{
												index: toolCall.index,
												function: {
													arguments: event.delta.partial_json,
												},
											},
										],
									},
									finish_reason: null,
								},
							],
						};
					}
				}
			} else if (event.type === "message_stop") {
				yield {
					id: messageId,
					object: "chat.completion.chunk",
					created: Math.floor(Date.now() / 1000),
					model,
					choices: [
						{
							index: 0,
							delta: {},
							finish_reason:
								event.message.stop_reason === "end_turn"
									? "stop"
									: event.message.stop_reason === "max_tokens"
										? "length"
										: event.message.stop_reason === "tool_use"
											? "tool_calls"
											: null,
						},
					],
				};
			}
		}
	}
}
