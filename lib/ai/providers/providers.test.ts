/**
 * AI Providers Test Suite
 *
 * Tests for the unified AI provider system
 */

import { beforeAll, describe, expect, it, vi } from "vitest";
import {
	ANTHROPIC_MODELS,
	AnthropicProvider,
	findBestModel,
	GOOGLE_AI_MODELS,
	GoogleAIProvider,
	hasCapability,
	OPENAI_MODELS,
	OpenAIProvider,
	ProviderRegistry,
	UnifiedAIClient,
} from "./index";

// Mock environment variables
vi.mock("@/lib/logging", () => ({
	logger: {
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
	},
}));

describe("AI Providers", () => {
	beforeAll(() => {
		// Clear registry before tests
		ProviderRegistry.clear();
	});

	describe("ProviderRegistry", () => {
		it("should register and retrieve providers", () => {
			const provider = new OpenAIProvider({ apiKey: "test-key" });
			ProviderRegistry.register("openai", provider);

			expect(ProviderRegistry.get("openai")).toBe(provider);
			expect(ProviderRegistry.list()).toContain("openai");
		});

		it("should clear all providers", () => {
			const provider = new OpenAIProvider({ apiKey: "test-key" });
			ProviderRegistry.register("openai", provider);

			ProviderRegistry.clear();

			expect(ProviderRegistry.get("openai")).toBeUndefined();
			expect(ProviderRegistry.list()).toHaveLength(0);
		});
	});

	describe("Model utilities", () => {
		it("should check model capabilities", () => {
			const model = OPENAI_MODELS[0];

			expect(hasCapability(model, "chat")).toBe(true);
			expect(hasCapability(model, "embedding")).toBe(false);
		});

		it("should find best model based on requirements", () => {
			const models = [...OPENAI_MODELS, ...ANTHROPIC_MODELS];

			const bestForChat = findBestModel(models, {
				capabilities: ["chat"],
				maxCostPer1kTokens: 0.01,
			});

			expect(bestForChat).toBeDefined();
			expect(bestForChat?.capabilities).toContain("chat");

			const bestForVision = findBestModel(models, {
				capabilities: ["chat", "vision"],
				minContextWindow: 100000,
			});

			expect(bestForVision).toBeDefined();
			expect(bestForVision?.capabilities).toContain("vision");
		});

		it("should return null if no model matches requirements", () => {
			const models = OPENAI_MODELS;

			const impossible = findBestModel(models, {
				capabilities: ["chat"],
				maxCostPer1kTokens: 0.00001, // Too low
			});

			expect(impossible).toBeNull();
		});
	});

	describe("UnifiedAIClient", () => {
		it("should create client with default config", () => {
			const client = new UnifiedAIClient();
			expect(client).toBeDefined();
		});

		it("should list models from all providers", async () => {
			const client = new UnifiedAIClient();

			// Register mock providers
			ProviderRegistry.register("openai", {
				listModels: async () => OPENAI_MODELS.slice(0, 2),
			} as any);

			ProviderRegistry.register("anthropic", {
				listModels: async () => ANTHROPIC_MODELS.slice(0, 2),
			} as any);

			const models = await client.listModels();

			expect(models).toHaveLength(4);
			expect(models.some((m) => m.provider === "openai")).toBe(true);
			expect(models.some((m) => m.provider === "anthropic")).toBe(true);
		});

		it("should filter models by capabilities", async () => {
			const client = new UnifiedAIClient();

			ProviderRegistry.register("openai", {
				listModels: async () => OPENAI_MODELS,
			} as any);

			const embeddingModels = await client.listModels({
				capabilities: ["embedding"],
			});

			expect(embeddingModels.length).toBeGreaterThan(0);
			expect(embeddingModels.every((m) => m.capabilities.includes("embedding"))).toBe(true);
		});

		it("should handle provider failures gracefully", async () => {
			const client = new UnifiedAIClient();

			ProviderRegistry.register("failing", {
				listModels: async () => {
					throw new Error("Provider error");
				},
			} as any);

			ProviderRegistry.register("working", {
				listModels: async () => [OPENAI_MODELS[0]],
			} as any);

			const models = await client.listModels();

			expect(models).toHaveLength(1);
			expect(models[0].provider).toBe("openai");
		});

		it("should cache responses when enabled", async () => {
			const client = new UnifiedAIClient({
				caching: true,
				cacheTTL: 1000,
			});

			const mockProvider = {
				createCompletion: vi.fn().mockResolvedValue({
					id: "test",
					object: "chat.completion",
					created: Date.now(),
					model: "test-model",
					choices: [
						{
							index: 0,
							message: { role: "assistant", content: "Test response" },
							finish_reason: "stop",
						},
					],
				}),
			};

			ProviderRegistry.register("test", mockProvider as any);

			const options = {
				model: "test-model",
				messages: [{ role: "user" as const, content: "Test" }],
				provider: "test",
			};

			// First call
			const result1 = await client.createCompletion(options);
			expect(result1.cached).toBe(false);
			expect(mockProvider.createCompletion).toHaveBeenCalledTimes(1);

			// Second call (should be cached)
			const result2 = await client.createCompletion(options);
			expect(result2.cached).toBe(true);
			expect(mockProvider.createCompletion).toHaveBeenCalledTimes(1);
		});

		it("should use load balancing strategies", async () => {
			const client = new UnifiedAIClient({
				loadBalancing: "round-robin",
			});

			const provider1Calls: string[] = [];
			const provider2Calls: string[] = [];

			ProviderRegistry.register("provider1", {
				createCompletion: async () => {
					provider1Calls.push("call");
					return { choices: [{ message: { content: "P1" } }] };
				},
			} as any);

			ProviderRegistry.register("provider2", {
				createCompletion: async () => {
					provider2Calls.push("call");
					return { choices: [{ message: { content: "P2" } }] };
				},
			} as any);

			// Make multiple calls
			for (let i = 0; i < 4; i++) {
				await client.createCompletion({
					model: "test",
					messages: [{ role: "user" as const, content: `Test ${i}` }],
				});
			}

			// Should distribute evenly with round-robin
			expect(provider1Calls.length).toBe(2);
			expect(provider2Calls.length).toBe(2);
		});
	});

	describe("Provider implementations", () => {
		it("should validate OpenAI config", () => {
			expect(() => new OpenAIProvider({ apiKey: "" })).toThrow();
			expect(() => new OpenAIProvider({ apiKey: "valid-key" })).not.toThrow();
		});

		it("should validate Anthropic config", () => {
			expect(() => new AnthropicProvider({ apiKey: "" })).toThrow();
			expect(() => new AnthropicProvider({ apiKey: "valid-key" })).not.toThrow();
		});

		it("should validate Google AI config", () => {
			expect(() => new GoogleAIProvider({ apiKey: "" })).toThrow();
			expect(() => new GoogleAIProvider({ apiKey: "valid-key" })).not.toThrow();
		});
	});
});
