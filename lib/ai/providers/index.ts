/**
 * AI Providers Index
 *
 * Central export point for all AI provider implementations
 */

export * from "./base";
export * from "./openai";
export * from "./anthropic";
export * from "./google";

import { ProviderRegistry } from "./base";
import { OpenAIProvider } from "./openai";
import { AnthropicProvider } from "./anthropic";
import { GoogleAIProvider } from "./google";

// Helper function to initialize all providers
export function initializeProviders(config?: {
	openai?: { apiKey: string };
	anthropic?: { apiKey: string };
	google?: { apiKey: string };
}) {
	// Clear existing providers
	ProviderRegistry.clear();

	// Register OpenAI provider if configured
	if (config?.openai?.apiKey || process.env.OPENAI_API_KEY) {
		ProviderRegistry.register(
			"openai",
			new OpenAIProvider({
				apiKey: config?.openai?.apiKey || process.env.OPENAI_API_KEY!,
			})
		);
	}

	// Register Anthropic provider if configured
	if (config?.anthropic?.apiKey || process.env.ANTHROPIC_API_KEY) {
		ProviderRegistry.register(
			"anthropic",
			new AnthropicProvider({
				apiKey: config?.anthropic?.apiKey || process.env.ANTHROPIC_API_KEY!,
			})
		);
	}

	// Register Google AI provider if configured
	if (config?.google?.apiKey || process.env.GOOGLE_AI_API_KEY) {
		ProviderRegistry.register(
			"google",
			new GoogleAIProvider({
				apiKey: config?.google?.apiKey || process.env.GOOGLE_AI_API_KEY!,
			})
		);
	}
}

// Initialize providers on module load if environment variables are set
if (typeof process !== "undefined" && process.env) {
	initializeProviders();
}
