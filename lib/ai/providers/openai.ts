/**
 * OpenAI Provider Implementation
 *
 * Implements the OpenAI API integration with support for GPT-4, GPT-3.5,
 * embeddings, and other OpenAI models.
 */

import OpenAI from "openai";
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

// OpenAI-specific configuration
export const OpenAIConfigSchema = BaseProviderConfig.extend({
	apiKey: z.string(),
	organization: z.string().optional(),
	project: z.string().optional(),
	baseURL: z.string().optional(),
	dangerouslyAllowBrowser: z.boolean().optional().default(false),
});

export type OpenAIConfig = z.infer<typeof OpenAIConfigSchema>;

// OpenAI model definitions
export const OPENAI_MODELS: ModelInfo[] = [
	// GPT-4 Turbo models
	{
		id: "gpt-4-turbo-preview",
		name: "GPT-4 Turbo Preview",
		provider: "openai",
		description: "Most capable GPT-4 model with vision, function calling, and JSON mode",
		capabilities: ["chat", "function-calling", "streaming", "json-mode", "vision"],
		contextWindow: 128000,
		maxOutputTokens: 4096,
		costPer1kInput: 0.01,
		costPer1kOutput: 0.03,
	},
	{
		id: "gpt-4-turbo-2024-04-09",
		name: "GPT-4 Turbo (April 2024)",
		provider: "openai",
		description: "Latest GPT-4 Turbo with vision capabilities",
		capabilities: ["chat", "function-calling", "streaming", "json-mode", "vision"],
		contextWindow: 128000,
		maxOutputTokens: 4096,
		costPer1kInput: 0.01,
		costPer1kOutput: 0.03,
	},

	// GPT-4 models
	{
		id: "gpt-4",
		name: "GPT-4",
		provider: "openai",
		description: "Original GPT-4 model",
		capabilities: ["chat", "function-calling", "streaming"],
		contextWindow: 8192,
		maxOutputTokens: 4096,
		costPer1kInput: 0.03,
		costPer1kOutput: 0.06,
	},
	{
		id: "gpt-4-32k",
		name: "GPT-4 32K",
		provider: "openai",
		description: "GPT-4 with extended context window",
		capabilities: ["chat", "function-calling", "streaming"],
		contextWindow: 32768,
		maxOutputTokens: 4096,
		costPer1kInput: 0.06,
		costPer1kOutput: 0.12,
	},

	// GPT-3.5 Turbo models
	{
		id: "gpt-3.5-turbo",
		name: "GPT-3.5 Turbo",
		provider: "openai",
		description: "Fast and efficient model for most tasks",
		capabilities: ["chat", "function-calling", "streaming", "json-mode"],
		contextWindow: 16385,
		maxOutputTokens: 4096,
		costPer1kInput: 0.0005,
		costPer1kOutput: 0.0015,
	},
	{
		id: "gpt-3.5-turbo-16k",
		name: "GPT-3.5 Turbo 16K",
		provider: "openai",
		description: "GPT-3.5 Turbo with extended context",
		capabilities: ["chat", "function-calling", "streaming", "json-mode"],
		contextWindow: 16385,
		maxOutputTokens: 4096,
		costPer1kInput: 0.003,
		costPer1kOutput: 0.004,
	},

	// Embedding models
	{
		id: "text-embedding-3-large",
		name: "Text Embedding 3 Large",
		provider: "openai",
		description: "Latest and most capable embedding model",
		capabilities: ["embedding"],
		contextWindow: 8191,
		costPer1kInput: 0.00013,
		costPer1kOutput: 0,
	},
	{
		id: "text-embedding-3-small",
		name: "Text Embedding 3 Small",
		provider: "openai",
		description: "Smaller, faster embedding model",
		capabilities: ["embedding"],
		contextWindow: 8191,
		costPer1kInput: 0.00002,
		costPer1kOutput: 0,
	},
	{
		id: "text-embedding-ada-002",
		name: "Text Embedding Ada 002",
		provider: "openai",
		description: "Previous generation embedding model",
		capabilities: ["embedding"],
		contextWindow: 8191,
		costPer1kInput: 0.0001,
		costPer1kOutput: 0,
	},

	// Audio models
	{
		id: "whisper-1",
		name: "Whisper",
		provider: "openai",
		description: "Audio transcription model",
		capabilities: ["audio-transcription"],
		contextWindow: 0,
		costPer1kInput: 0.006, // per minute
		costPer1kOutput: 0,
	},
	{
		id: "tts-1",
		name: "TTS-1",
		provider: "openai",
		description: "Text-to-speech model",
		capabilities: ["audio-generation"],
		contextWindow: 4096,
		costPer1kInput: 0.015, // per 1k characters
		costPer1kOutput: 0,
	},
	{
		id: "tts-1-hd",
		name: "TTS-1 HD",
		provider: "openai",
		description: "High quality text-to-speech model",
		capabilities: ["audio-generation"],
		contextWindow: 4096,
		costPer1kInput: 0.03, // per 1k characters
		costPer1kOutput: 0,
	},

	// Image models
	{
		id: "dall-e-3",
		name: "DALL-E 3",
		provider: "openai",
		description: "Latest image generation model",
		capabilities: ["image-generation"],
		contextWindow: 4000,
		costPer1kInput: 0.04, // per image (1024x1024)
		costPer1kOutput: 0,
	},
	{
		id: "dall-e-2",
		name: "DALL-E 2",
		provider: "openai",
		description: "Previous generation image model",
		capabilities: ["image-generation"],
		contextWindow: 1000,
		costPer1kInput: 0.02, // per image (1024x1024)
		costPer1kOutput: 0,
	},
];

export class OpenAIProvider extends BaseAIProvider {
	private client: OpenAI;

	constructor(config: OpenAIConfig) {
		super(config);
		const validatedConfig = OpenAIConfigSchema.parse(config);

		this.client = new OpenAI({
			apiKey: validatedConfig.apiKey,
			organization: validatedConfig.organization,
			project: validatedConfig.project,
			baseURL: validatedConfig.baseURL,
			dangerouslyAllowBrowser: validatedConfig.dangerouslyAllowBrowser,
			timeout: validatedConfig.timeout,
			maxRetries: validatedConfig.maxRetries,
		});
	}

	async listModels(): Promise<ModelInfo[]> {
		// Return our curated list of models
		// In production, you might want to merge this with the API response
		return OPENAI_MODELS;
	}

	async getModel(modelId: string): Promise<ModelInfo | null> {
		const model = OPENAI_MODELS.find((m) => m.id === modelId);
		return model || null;
	}

	async createCompletion(options: CompletionOptions): Promise<CompletionResponse> {
		return this.handleRetry(async () => {
			const response = await this.client.chat.completions.create({
				model: options.model,
				messages: options.messages.map(this.convertMessage),
				temperature: options.temperature,
				max_tokens: options.maxTokens,
				top_p: options.topP,
				frequency_penalty: options.frequencyPenalty,
				presence_penalty: options.presencePenalty,
				stop: options.stop,
				stream: false,
				functions: options.functions,
				function_call: options.functionCall,
				tools: options.tools,
				tool_choice: options.toolChoice,
				response_format: options.responseFormat,
				seed: options.seed,
				user: options.user,
			});

			return this.convertResponse(response);
		});
	}

	async createStreamingCompletion(options: CompletionOptions): Promise<AsyncIterable<StreamChunk>> {
		const stream = await this.client.chat.completions.create({
			model: options.model,
			messages: options.messages.map(this.convertMessage),
			temperature: options.temperature,
			max_tokens: options.maxTokens,
			top_p: options.topP,
			frequency_penalty: options.frequencyPenalty,
			presence_penalty: options.presencePenalty,
			stop: options.stop,
			stream: true,
			functions: options.functions,
			function_call: options.functionCall,
			tools: options.tools,
			tool_choice: options.toolChoice,
			response_format: options.responseFormat,
			seed: options.seed,
			user: options.user,
		});

		return this.convertStream(stream);
	}

	async createEmbedding(options: EmbeddingOptions): Promise<EmbeddingResponse> {
		return this.handleRetry(async () => {
			const response = await this.client.embeddings.create({
				model: options.model,
				input: options.input,
				dimensions: options.dimensions,
				user: options.user,
			});

			return {
				object: "list" as const,
				data: response.data.map((item, index) => ({
					index,
					embedding: item.embedding,
					object: "embedding" as const,
				})),
				model: response.model,
				usage: {
					prompt_tokens: response.usage.prompt_tokens,
					total_tokens: response.usage.total_tokens,
				},
			};
		});
	}

	// Additional OpenAI-specific methods
	async createTranscription(
		file: File,
		options?: {
			model?: string;
			language?: string;
			prompt?: string;
			temperature?: number;
		}
	): Promise<{ text: string }> {
		const response = await this.client.audio.transcriptions.create({
			file,
			model: options?.model || "whisper-1",
			language: options?.language,
			prompt: options?.prompt,
			temperature: options?.temperature,
		});

		return { text: response.text };
	}

	async createSpeech(
		text: string,
		options?: {
			model?: string;
			voice?: "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer";
			speed?: number;
			response_format?: "mp3" | "opus" | "aac" | "flac";
		}
	): Promise<ArrayBuffer> {
		const response = await this.client.audio.speech.create({
			model: options?.model || "tts-1",
			input: text,
			voice: options?.voice || "alloy",
			speed: options?.speed,
			response_format: options?.response_format,
		});

		return response.arrayBuffer();
	}

	async createImage(
		prompt: string,
		options?: {
			model?: string;
			n?: number;
			size?: "1024x1024" | "1792x1024" | "1024x1792";
			quality?: "standard" | "hd";
			style?: "vivid" | "natural";
		}
	): Promise<Array<{ url?: string; b64_json?: string }>> {
		const response = await this.client.images.generate({
			model: options?.model || "dall-e-3",
			prompt,
			n: options?.n,
			size: options?.size,
			quality: options?.quality,
			style: options?.style,
		});

		return response.data;
	}

	// Helper methods
	private convertMessage(message: Message): OpenAI.Chat.ChatCompletionMessageParam {
		if (message.role === "system") {
			return { role: "system", content: message.content };
		} else if (message.role === "user") {
			return { role: "user", content: message.content, name: message.name };
		} else if (message.role === "assistant") {
			return {
				role: "assistant",
				content: message.content,
				name: message.name,
				function_call: message.function_call,
				tool_calls: message.tool_calls as any,
			};
		} else if (message.role === "function") {
			return {
				role: "function",
				content: message.content,
				name: message.name || "",
			};
		} else if (message.role === "tool") {
			return {
				role: "tool",
				content: message.content,
				tool_call_id: message.name || "",
			};
		}

		throw new Error(`Unknown message role: ${message.role}`);
	}

	private convertResponse(response: OpenAI.Chat.ChatCompletion): CompletionResponse {
		return {
			id: response.id,
			object: response.object,
			created: response.created,
			model: response.model,
			choices: response.choices.map((choice) => ({
				index: choice.index,
				message: {
					role: choice.message.role,
					content: choice.message.content || "",
					name: choice.message.name,
					function_call: choice.message.function_call,
					tool_calls: choice.message.tool_calls as any,
				},
				finish_reason: choice.finish_reason,
				logprobs: choice.logprobs,
			})),
			usage: response.usage
				? {
						prompt_tokens: response.usage.prompt_tokens,
						completion_tokens: response.usage.completion_tokens,
						total_tokens: response.usage.total_tokens,
					}
				: undefined,
			system_fingerprint: response.system_fingerprint || undefined,
		};
	}

	private async *convertStream(
		stream: AsyncIterable<OpenAI.Chat.ChatCompletionChunk>
	): AsyncIterable<StreamChunk> {
		for await (const chunk of stream) {
			yield {
				id: chunk.id,
				object: chunk.object,
				created: chunk.created,
				model: chunk.model,
				choices: chunk.choices.map((choice) => ({
					index: choice.index,
					delta: {
						role: choice.delta.role,
						content: choice.delta.content,
						function_call: choice.delta.function_call,
						tool_calls: choice.delta.tool_calls as any,
					},
					finish_reason: choice.finish_reason,
				})),
			};
		}
	}
}
