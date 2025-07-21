/**
 * AI Models and Utilities
 * Central export point for AI-related functionality
 */

export { GeminiRealtimeClient } from "./gemini-realtime";
export * from "./testing/mock-language-model";

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

// Basic AI utilities
export const AI_MODELS = {
	CLAUDE_3_5_SONNET: "claude-3-5-sonnet-20241022",
	GPT_4_TURBO: "gpt-4-turbo-preview",
	GEMINI_PRO: "gemini-pro",
} as const;

export type AIModelType = (typeof AI_MODELS)[keyof typeof AI_MODELS];
