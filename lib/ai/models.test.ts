/**
 * Mock AI Models for Testing
 *
 * Provides deterministic mock implementations of AI models
 * for use in integration and unit tests.
 */

import { simulateReadableStream } from "ai";
import { MockLanguageModelV1 } from "ai/test";

/**
 * Test chat model with deterministic responses
 */
export const testChatModel = new MockLanguageModelV1({
	doStream: async ({ prompt }) => ({
		stream: simulateReadableStream({
			chunkDelayInMs: 50,
			initialDelayInMs: 100,
			chunks: getResponseChunksByPrompt(prompt),
		}),
		rawCall: { rawPrompt: null, rawSettings: {} },
	}),
	doGenerate: async ({ prompt }) => ({
		text: getTextResponseByPrompt(prompt),
		usage: {
			promptTokens: 10,
			completionTokens: 20,
		},
		finishReason: "stop",
		rawCall: { rawPrompt: null, rawSettings: {} },
	}),
});

/**
 * Define deterministic responses based on prompts
 */
function getResponseChunksByPrompt(prompt: any) {
	const recentMessage = prompt[prompt.length - 1]?.content;

	if (recentMessage?.includes("explain")) {
		return [
			{ type: "text-delta", textDelta: "Here is " },
			{ type: "text-delta", textDelta: "an explanation" },
			{ type: "text-delta", textDelta: " of the concept:" },
			{ type: "text-delta", textDelta: " This is a test response." },
			{ type: "finish", finishReason: "stop", usage: { promptTokens: 10, completionTokens: 20 } },
		];
	}

	if (recentMessage?.includes("test")) {
		return [
			{ type: "text-delta", textDelta: "This is a " },
			{ type: "text-delta", textDelta: "test response " },
			{ type: "text-delta", textDelta: "for testing purposes." },
			{ type: "finish", finishReason: "stop", usage: { promptTokens: 8, completionTokens: 15 } },
		];
	}

	if (recentMessage?.includes("code")) {
		return [
			{ type: "text-delta", textDelta: "```typescript\n" },
			{ type: "text-delta", textDelta: "function example() {\n" },
			{ type: "text-delta", textDelta: "  return 'test';\n" },
			{ type: "text-delta", textDelta: "}\n```" },
			{ type: "finish", finishReason: "stop", usage: { promptTokens: 12, completionTokens: 25 } },
		];
	}

	// Default response
	return [
		{ type: "text-delta", textDelta: "This is the " },
		{ type: "text-delta", textDelta: "default test response." },
		{ type: "finish", finishReason: "stop", usage: { promptTokens: 5, completionTokens: 10 } },
	];
}

/**
 * Get non-streaming text response based on prompt
 */
function getTextResponseByPrompt(prompt: any): string {
	const recentMessage = prompt[prompt.length - 1]?.content;

	if (recentMessage?.includes("explain")) {
		return "Here is an explanation of the concept: This is a test response.";
	}

	if (recentMessage?.includes("test")) {
		return "This is a test response for testing purposes.";
	}

	if (recentMessage?.includes("code")) {
		return "```typescript\nfunction example() {\n  return 'test';\n}\n```";
	}

	return "This is the default test response.";
}

/**
 * Mock embedding model for vector operations
 */
export const testEmbeddingModel = {
	embed: async (text: string) => {
		// Generate deterministic embeddings based on text hash
		const hash = text.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
		const embedding = new Array(1536).fill(0).map((_, i) => Math.sin(hash * (i + 1)) * 0.1);
		return { embedding };
	},

	embedBatch: async (texts: string[]) => {
		return {
			embeddings: texts.map((text) => {
				const hash = text.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
				return new Array(1536).fill(0).map((_, i) => Math.sin(hash * (i + 1)) * 0.1);
			}),
		};
	},
};

/**
 * Mock completion model with specific behaviors
 */
export const testCompletionModel = new MockLanguageModelV1({
	doGenerate: async ({ prompt, mode }) => {
		const text = getCompletionByMode(prompt, mode);
		return {
			text,
			usage: {
				promptTokens: 15,
				completionTokens: 30,
			},
			finishReason: "stop",
			rawCall: { rawPrompt: null, rawSettings: {} },
		};
	},
});

function getCompletionByMode(prompt: any, mode: any): string {
	if (mode?.json) {
		return JSON.stringify({
			status: "success",
			message: "Test JSON response",
			data: { test: true },
		});
	}

	if (mode?.structured) {
		return JSON.stringify({
			type: "structured",
			fields: [{ name: "test", value: "value" }],
		});
	}

	return "Standard completion response for testing.";
}

/**
 * Helper to create mock API responses
 */
export function createMockStreamResponse(chunks: string[]) {
	return new ReadableStream({
		async start(controller) {
			for (const chunk of chunks) {
				controller.enqueue(new TextEncoder().encode(`data: ${chunk}\n\n`));
				await new Promise((resolve) => setTimeout(resolve, 50));
			}
			controller.enqueue(new TextEncoder().encode("data: [DONE]\n\n"));
			controller.close();
		},
	});
}

/**
 * Mock provider with rate limiting simulation
 */
export const testProviderWithRateLimit = {
	callCount: 0,
	rateLimit: 5,

	async chat(messages: any[]) {
		this.callCount++;

		if (this.callCount > this.rateLimit) {
			throw new Error("Rate limit exceeded");
		}

		return {
			content: "Rate limited response",
			usage: { promptTokens: 10, completionTokens: 10 },
		};
	},

	reset() {
		this.callCount = 0;
	},
};
