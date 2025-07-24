/**
 * AI Models and Utilities
 * Central export point for AI-related functionality
 */

export { GeminiRealtimeClient } from "./gemini-realtime";
export * from "./testing/mock-language-model";

// Export all provider functionality
export * from "./providers";
export * from "./unified-client";

// Type definitions for AI models
export interface AIModel {
	id: string;
	name: string;
	provider: string;
	capabilities: string[];
}

export interface ModelResponse {
	id: string;
	content: string;
	usage?: {
		promptTokens: number;
		completionTokens: number;
		totalTokens: number;
	};
}

// Basic AI utilities - extended with all available models
export const AI_MODELS = {
	// OpenAI models
	GPT_4_TURBO: "gpt-4-turbo-preview",
	GPT_4: "gpt-4",
	GPT_3_5_TURBO: "gpt-3.5-turbo",

	// Anthropic models
	CLAUDE_3_OPUS: "claude-3-opus-20240229",
	CLAUDE_3_5_SONNET: "claude-3-5-sonnet-20241022",
	CLAUDE_3_HAIKU: "claude-3-haiku-20240307",

	// Google AI models
	GEMINI_PRO: "gemini-pro",
	GEMINI_PRO_VISION: "gemini-pro-vision",
	GEMINI_1_5_PRO: "gemini-1.5-pro-latest",
	GEMINI_1_5_FLASH: "gemini-1.5-flash-latest",
} as const;

export type AIModelType = (typeof AI_MODELS)[keyof typeof AI_MODELS];
