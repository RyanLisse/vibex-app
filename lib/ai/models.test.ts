/**
 * AI SDK Testing Patterns
 * Mock language models and testing utilities for AI-powered features
 */

import type { CoreMessage, LanguageModelV1CallOptions } from "ai";
import { MockLanguageModelV1 } from "ai/test";

/**
 * Mock Chat Model for deterministic testing
 * Provides predefined responses based on prompt patterns
 */
export const testChatModel = new MockLanguageModelV1({
	doStream: async ({ prompt }: LanguageModelV1CallOptions) => {
		const chunks = getResponseChunksByPrompt(prompt);

		return {
			stream: simulateReadableStream({
				chunkDelayInMs: 50,
				initialDelayInMs: 100,
				chunks,
			}),
			rawCall: { rawPrompt: null, rawSettings: {} },
		};
	},

	doGenerate: async ({ prompt }: LanguageModelV1CallOptions) => {
		const text = getTextResponseByPrompt(prompt);

		return {
			text,
			finishReason: "stop",
			usage: {
				promptTokens: 10,
				completionTokens: text.length / 4, // Rough token estimate
			},
			rawCall: { rawPrompt: null, rawSettings: {} },
		};
	},
});

/**
 * Get deterministic streaming chunks based on prompt content
 */
function getResponseChunksByPrompt(prompt: CoreMessage[]) {
	const recentMessage = prompt[prompt.length - 1]?.content;

	if (typeof recentMessage === "string") {
		if (recentMessage.includes("explain")) {
			return [
				{
					type: "text-delta" as const,
					textDelta: "Here is an explanation of ",
				},
				{
					type: "text-delta" as const,
					textDelta: "the concept you requested. ",
				},
				{ type: "text-delta" as const, textDelta: "This is a test response " },
				{ type: "text-delta" as const, textDelta: "for testing purposes." },
				{ type: "finish" as const, finishReason: "stop" as const },
			];
		}

		if (recentMessage.includes("code")) {
			return [
				{ type: "text-delta" as const, textDelta: "```javascript\n" },
				{ type: "text-delta" as const, textDelta: "function example() {\n" },
				{
					type: "text-delta" as const,
					textDelta: '  return "Hello, World!";\n',
				},
				{ type: "text-delta" as const, textDelta: "}\n```" },
				{ type: "finish" as const, finishReason: "stop" as const },
			];
		}

		if (recentMessage.includes("error") || recentMessage.includes("fail")) {
			return [
				{
					type: "text-delta" as const,
					textDelta: "I encountered an error while ",
				},
				{ type: "text-delta" as const, textDelta: "processing your request. " },
				{ type: "text-delta" as const, textDelta: "Please try again." },
				{ type: "finish" as const, finishReason: "error" as const },
			];
		}

		if (recentMessage.includes("summary")) {
			return [
				{ type: "text-delta" as const, textDelta: "## Summary\n\n" },
				{ type: "text-delta" as const, textDelta: "- Key point 1\n" },
				{ type: "text-delta" as const, textDelta: "- Key point 2\n" },
				{ type: "text-delta" as const, textDelta: "- Key point 3" },
				{ type: "finish" as const, finishReason: "stop" as const },
			];
		}
	}

	// Default response for any other input
	return [
		{
			type: "text-delta" as const,
			textDelta: "This is a default test response ",
		},
		{ type: "text-delta" as const, textDelta: "from the mock AI model. " },
		{
			type: "text-delta" as const,
			textDelta: "It provides consistent output ",
		},
		{ type: "text-delta" as const, textDelta: "for testing purposes." },
		{ type: "finish" as const, finishReason: "stop" as const },
	];
}

/**
 * Get deterministic text response based on prompt content
 */
function getTextResponseByPrompt(prompt: CoreMessage[]) {
	const recentMessage = prompt[prompt.length - 1]?.content;

	if (typeof recentMessage === "string") {
		if (recentMessage.includes("explain")) {
			return "Here is an explanation of the concept you requested. This is a test response for testing purposes.";
		}

		if (recentMessage.includes("code")) {
			return '```javascript\nfunction example() {\n  return "Hello, World!";\n}\n```';
		}

		if (recentMessage.includes("summary")) {
			return "## Summary\n\n- Key point 1\n- Key point 2\n- Key point 3";
		}
	}

	return "This is a default test response from the mock AI model. It provides consistent output for testing purposes.";
}

/**
 * Mock Anthropic Model for Claude-specific testing
 */
export const testClaudeModel = new MockLanguageModelV1({
	doStream: async ({ prompt }: LanguageModelV1CallOptions) => {
		const chunks = getClaudeResponseChunks(prompt);

		return {
			stream: simulateReadableStream({
				chunkDelayInMs: 30,
				initialDelayInMs: 50,
				chunks,
			}),
			rawCall: { rawPrompt: null, rawSettings: {} },
		};
	},
});

function getClaudeResponseChunks(prompt: CoreMessage[]) {
	const recentMessage = prompt[prompt.length - 1]?.content;

	if (typeof recentMessage === "string" && recentMessage.includes("analysis")) {
		return [
			{ type: "text-delta" as const, textDelta: "Based on my analysis, " },
			{
				type: "text-delta" as const,
				textDelta: "I can provide the following insights:\n\n",
			},
			{ type: "text-delta" as const, textDelta: "1. First insight\n" },
			{ type: "text-delta" as const, textDelta: "2. Second insight\n" },
			{ type: "text-delta" as const, textDelta: "3. Conclusion" },
			{ type: "finish" as const, finishReason: "stop" as const },
		];
	}

	return [
		{
			type: "text-delta" as const,
			textDelta: "I'm Claude, and I'm here to help. ",
		},
		{
			type: "text-delta" as const,
			textDelta: "This is a test response for verification.",
		},
		{ type: "finish" as const, finishReason: "stop" as const },
	];
}

/**
 * Mock OpenAI Model for GPT-specific testing
 */
export const testGPTModel = new MockLanguageModelV1({
	doStream: async ({ prompt }: LanguageModelV1CallOptions) => {
		const chunks = getGPTResponseChunks(prompt);

		return {
			stream: simulateReadableStream({
				chunkDelayInMs: 40,
				initialDelayInMs: 80,
				chunks,
			}),
			rawCall: { rawPrompt: null, rawSettings: {} },
		};
	},
});

function getGPTResponseChunks(prompt: CoreMessage[]) {
	const recentMessage = prompt[prompt.length - 1]?.content;

	if (typeof recentMessage === "string" && recentMessage.includes("creative")) {
		return [
			{
				type: "text-delta" as const,
				textDelta: "Let me think creatively about this... ",
			},
			{
				type: "text-delta" as const,
				textDelta: "Here are some innovative ideas:\n\n",
			},
			{
				type: "text-delta" as const,
				textDelta: "💡 Idea 1: Creative solution\n",
			},
			{
				type: "text-delta" as const,
				textDelta: "🚀 Idea 2: Innovative approach\n",
			},
			{
				type: "text-delta" as const,
				textDelta: "✨ Idea 3: Unique perspective",
			},
			{ type: "finish" as const, finishReason: "stop" as const },
		];
	}

	return [
		{
			type: "text-delta" as const,
			textDelta: "Hello! I'm a GPT model ready to assist. ",
		},
		{
			type: "text-delta" as const,
			textDelta: "This is a standardized test response.",
		},
		{ type: "finish" as const, finishReason: "stop" as const },
	];
}

/**
 * Test utilities for AI chat functionality
 */
export const aiTestUtils = {
	/**
	 * Create a mock conversation history
	 */
	createMockConversation: (length = 3): CoreMessage[] => {
		const messages: CoreMessage[] = [];

		for (let i = 0; i < length; i++) {
			messages.push(
				{ role: "user", content: `User message ${i + 1}` },
				{ role: "assistant", content: `Assistant response ${i + 1}` },
			);
		}

		return messages;
	},

	/**
	 * Create a mock streaming response
	 */
	mockStreamingResponse: (text: string, chunkSize = 10) => {
		const chunks = [];
		for (let i = 0; i < text.length; i += chunkSize) {
			chunks.push({
				type: "text-delta" as const,
				textDelta: text.slice(i, i + chunkSize),
			});
		}
		chunks.push({ type: "finish" as const, finishReason: "stop" as const });

		return simulateReadableStream({
			chunkDelayInMs: 20,
			initialDelayInMs: 50,
			chunks,
		});
	},

	/**
	 * Validate streaming response format
	 */
	isValidStreamChunk: (chunk: any): boolean => {
		return (
			chunk &&
			typeof chunk === "object" &&
			"type" in chunk &&
			(chunk.type === "text-delta" || chunk.type === "finish")
		);
	},

	/**
	 * Extract text from streaming chunks
	 */
	extractTextFromChunks: (chunks: any[]): string => {
		return chunks
			.filter((chunk) => chunk.type === "text-delta")
			.map((chunk) => chunk.textDelta)
			.join("");
	},
};

/**
 * Export all mock models for easy importing in tests
 */
export const mockModels = {
	chat: testChatModel,
	claude: testClaudeModel,
	gpt: testGPTModel,
};

/**
 * Test configuration for AI models
 */
export const testModelConfig = {
	maxTokens: 1000,
	temperature: 0, // Deterministic responses for testing
	topP: 1,
	frequencyPenalty: 0,
	presencePenalty: 0,
};
