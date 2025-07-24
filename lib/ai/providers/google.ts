/**
 * Google AI Provider Implementation
 *
 * Implements the Google AI (Gemini) API integration with support for
 * Gemini Pro, Gemini Pro Vision, and other Google AI models.
 */

import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
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

// Google AI-specific configuration
export const GoogleAIConfigSchema = BaseProviderConfig.extend({
	apiKey: z.string(),
	baseURL: z.string().optional(),
});

export type GoogleAIConfig = z.infer<typeof GoogleAIConfigSchema>;

// Google AI model definitions
export const GOOGLE_AI_MODELS: ModelInfo[] = [
	// Gemini models
	{
		id: "gemini-pro",
		name: "Gemini Pro",
		provider: "google",
		description: "Best model for text-only prompts",
		capabilities: ["chat", "function-calling", "streaming", "json-mode"],
		contextWindow: 32768,
		maxOutputTokens: 2048,
		costPer1kInput: 0.0005,
		costPer1kOutput: 0.0015,
	},
	{
		id: "gemini-pro-vision",
		name: "Gemini Pro Vision",
		provider: "google",
		description: "Best model for text and image prompts",
		capabilities: ["chat", "streaming", "vision"],
		contextWindow: 16384,
		maxOutputTokens: 2048,
		costPer1kInput: 0.0005,
		costPer1kOutput: 0.0015,
	},
	{
		id: "gemini-1.5-pro-latest",
		name: "Gemini 1.5 Pro",
		provider: "google",
		description: "Advanced model with extended context window",
		capabilities: ["chat", "function-calling", "streaming", "json-mode", "vision"],
		contextWindow: 1048576, // 1M tokens
		maxOutputTokens: 8192,
		costPer1kInput: 0.007,
		costPer1kOutput: 0.021,
	},
	{
		id: "gemini-1.5-flash-latest",
		name: "Gemini 1.5 Flash",
		provider: "google",
		description: "Fast model for high-volume tasks",
		capabilities: ["chat", "function-calling", "streaming", "json-mode", "vision"],
		contextWindow: 1048576, // 1M tokens
		maxOutputTokens: 8192,
		costPer1kInput: 0.00035,
		costPer1kOutput: 0.00105,
	},
	{
		id: "gemini-2.0-flash-exp",
		name: "Gemini 2.0 Flash (Experimental)",
		provider: "google",
		description: "Next-gen Flash model with native audio input support",
		capabilities: ["chat", "function-calling", "streaming", "json-mode", "vision", "audio"],
		contextWindow: 1048576, // 1M tokens
		maxOutputTokens: 8192,
		costPer1kInput: 0.00035,
		costPer1kOutput: 0.00105,
	},

	// Embedding models
	{
		id: "embedding-001",
		name: "Embedding 001",
		provider: "google",
		description: "Text embedding model",
		capabilities: ["embedding"],
		contextWindow: 2048,
		costPer1kInput: 0.0001,
		costPer1kOutput: 0,
	},
	{
		id: "text-embedding-004",
		name: "Text Embedding 004",
		provider: "google",
		description: "Latest text embedding model",
		capabilities: ["embedding"],
		contextWindow: 2048,
		costPer1kInput: 0.00001,
		costPer1kOutput: 0,
	},
];

export class GoogleAIProvider extends BaseAIProvider {
	private client: GoogleGenerativeAI;

	constructor(config: GoogleAIConfig) {
		super(config);
		const validatedConfig = GoogleAIConfigSchema.parse(config);

		this.client = new GoogleGenerativeAI(validatedConfig.apiKey);
	}

	async listModels(): Promise<ModelInfo[]> {
		return GOOGLE_AI_MODELS;
	}

	async getModel(modelId: string): Promise<ModelInfo | null> {
		const model = GOOGLE_AI_MODELS.find((m) => m.id === modelId);
		return model || null;
	}

	async createCompletion(options: CompletionOptions): Promise<CompletionResponse> {
		return this.handleRetry(async () => {
			const model = this.client.getGenerativeModel({
				model: options.model,
				generationConfig: {
					temperature: options.temperature,
					topP: options.topP,
					maxOutputTokens: options.maxTokens,
					stopSequences: Array.isArray(options.stop)
						? options.stop
						: options.stop
							? [options.stop]
							: undefined,
					responseMimeType:
						options.responseFormat?.type === "json_object" ? "application/json" : undefined,
				},
				safetySettings: [
					{
						category: HarmCategory.HARM_CATEGORY_HARASSMENT,
						threshold: HarmBlockThreshold.BLOCK_NONE,
					},
					{
						category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
						threshold: HarmBlockThreshold.BLOCK_NONE,
					},
					{
						category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
						threshold: HarmBlockThreshold.BLOCK_NONE,
					},
					{
						category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
						threshold: HarmBlockThreshold.BLOCK_NONE,
					},
				],
			});

			// Convert messages to Gemini format
			const { systemInstruction, contents } = this.convertMessages(options.messages);

			// Handle function calling
			if (options.tools && options.tools.length > 0) {
				const tools = [
					{
						functionDeclarations: options.tools.map((tool) => ({
							name: tool.function.name,
							description: tool.function.description,
							parameters: tool.function.parameters,
						})),
					},
				];

				const chat = model.startChat({
					history: contents.slice(0, -1),
					tools,
				});

				const result = await chat.sendMessage(contents[contents.length - 1].parts[0].text || "");
				return this.convertResponse(result, options.model);
			}

			// Regular chat without tools
			const chat = model.startChat({
				history: contents.slice(0, -1),
				systemInstruction,
			});

			const result = await chat.sendMessage(contents[contents.length - 1].parts[0].text || "");
			return this.convertResponse(result, options.model);
		});
	}

	async createStreamingCompletion(options: CompletionOptions): Promise<AsyncIterable<StreamChunk>> {
		const model = this.client.getGenerativeModel({
			model: options.model,
			generationConfig: {
				temperature: options.temperature,
				topP: options.topP,
				maxOutputTokens: options.maxTokens,
				stopSequences: Array.isArray(options.stop)
					? options.stop
					: options.stop
						? [options.stop]
						: undefined,
				responseMimeType:
					options.responseFormat?.type === "json_object" ? "application/json" : undefined,
			},
			safetySettings: [
				{
					category: HarmCategory.HARM_CATEGORY_HARASSMENT,
					threshold: HarmBlockThreshold.BLOCK_NONE,
				},
				{
					category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
					threshold: HarmBlockThreshold.BLOCK_NONE,
				},
				{
					category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
					threshold: HarmBlockThreshold.BLOCK_NONE,
				},
				{
					category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
					threshold: HarmBlockThreshold.BLOCK_NONE,
				},
			],
		});

		const { systemInstruction, contents } = this.convertMessages(options.messages);

		// Handle function calling
		const tools =
			options.tools && options.tools.length > 0
				? [
						{
							functionDeclarations: options.tools.map((tool) => ({
								name: tool.function.name,
								description: tool.function.description,
								parameters: tool.function.parameters,
							})),
						},
					]
				: undefined;

		const chat = model.startChat({
			history: contents.slice(0, -1),
			systemInstruction,
			tools,
		});

		const result = await chat.sendMessageStream(contents[contents.length - 1].parts[0].text || "");
		return this.convertStream(result, options.model);
	}

	async createEmbedding(options: EmbeddingOptions): Promise<EmbeddingResponse> {
		return this.handleRetry(async () => {
			const model = this.client.getGenerativeModel({ model: options.model });

			const inputs = Array.isArray(options.input) ? options.input : [options.input];
			const embeddings: number[][] = [];

			for (const input of inputs) {
				const result = await model.embedContent(input);
				embeddings.push(result.embedding.values);
			}

			return {
				object: "list" as const,
				data: embeddings.map((embedding, index) => ({
					index,
					embedding,
					object: "embedding" as const,
				})),
				model: options.model,
				usage: {
					prompt_tokens: inputs.join("").length / 4, // Rough estimate
					total_tokens: inputs.join("").length / 4,
				},
			};
		});
	}

	// Helper methods
	private convertMessages(messages: Message[]): {
		systemInstruction?: string;
		contents: Array<{
			role: "user" | "model";
			parts: Array<{ text?: string; functionCall?: any; functionResponse?: any }>;
		}>;
	} {
		let systemInstruction: string | undefined;
		const contents: Array<{
			role: "user" | "model";
			parts: Array<{ text?: string; functionCall?: any; functionResponse?: any }>;
		}> = [];

		for (const message of messages) {
			if (message.role === "system") {
				systemInstruction = message.content;
			} else if (message.role === "user") {
				contents.push({
					role: "user",
					parts: [{ text: message.content }],
				});
			} else if (message.role === "assistant") {
				if (message.tool_calls) {
					const parts: any[] = [];
					if (message.content) {
						parts.push({ text: message.content });
					}
					for (const toolCall of message.tool_calls) {
						parts.push({
							functionCall: {
								name: toolCall.function.name,
								args: JSON.parse(toolCall.function.arguments),
							},
						});
					}
					contents.push({
						role: "model",
						parts,
					});
				} else {
					contents.push({
						role: "model",
						parts: [{ text: message.content }],
					});
				}
			} else if (message.role === "tool" || message.role === "function") {
				// Function/tool responses
				contents.push({
					role: "user",
					parts: [
						{
							functionResponse: {
								name: message.name || "",
								response: { content: message.content },
							},
						},
					],
				});
			}
		}

		return { systemInstruction, contents };
	}

	private convertResponse(result: any, model: string): CompletionResponse {
		const response = result.response;
		const message: Message = {
			role: "assistant",
			content: "",
		};

		// Extract text and function calls
		const toolCalls: any[] = [];
		for (const part of response.candidates[0].content.parts) {
			if (part.text) {
				message.content += part.text;
			} else if (part.functionCall) {
				toolCalls.push({
					id: `call_${Date.now()}_${Math.random().toString(36).substring(7)}`,
					type: "function",
					function: {
						name: part.functionCall.name,
						arguments: JSON.stringify(part.functionCall.args),
					},
				});
			}
		}

		if (toolCalls.length > 0) {
			message.tool_calls = toolCalls;
		}

		return {
			id: `chatcmpl-${Date.now()}`,
			object: "chat.completion",
			created: Math.floor(Date.now() / 1000),
			model,
			choices: [
				{
					index: 0,
					message,
					finish_reason:
						response.candidates[0].finishReason === "STOP"
							? "stop"
							: response.candidates[0].finishReason === "MAX_TOKENS"
								? "length"
								: response.candidates[0].finishReason === "SAFETY"
									? "content_filter"
									: null,
					logprobs: null,
				},
			],
			usage: {
				prompt_tokens: response.usageMetadata?.promptTokenCount || 0,
				completion_tokens: response.usageMetadata?.candidatesTokenCount || 0,
				total_tokens: response.usageMetadata?.totalTokenCount || 0,
			},
		};
	}

	private async *convertStream(stream: any, model: string): AsyncIterable<StreamChunk> {
		const streamId = `chatcmpl-${Date.now()}`;
		let isFirst = true;

		for await (const chunk of stream.stream) {
			if (isFirst) {
				isFirst = false;
				yield {
					id: streamId,
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
			}

			for (const part of chunk.candidates[0].content.parts) {
				if (part.text) {
					yield {
						id: streamId,
						object: "chat.completion.chunk",
						created: Math.floor(Date.now() / 1000),
						model,
						choices: [
							{
								index: 0,
								delta: { content: part.text },
								finish_reason: null,
							},
						],
					};
				} else if (part.functionCall) {
					yield {
						id: streamId,
						object: "chat.completion.chunk",
						created: Math.floor(Date.now() / 1000),
						model,
						choices: [
							{
								index: 0,
								delta: {
									tool_calls: [
										{
											index: 0,
											id: `call_${Date.now()}_${Math.random().toString(36).substring(7)}`,
											type: "function",
											function: {
												name: part.functionCall.name,
												arguments: JSON.stringify(part.functionCall.args),
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
		}

		// Send final chunk
		yield {
			id: streamId,
			object: "chat.completion.chunk",
			created: Math.floor(Date.now() / 1000),
			model,
			choices: [
				{
					index: 0,
					delta: {},
					finish_reason: "stop",
				},
			],
		};
	}
}
