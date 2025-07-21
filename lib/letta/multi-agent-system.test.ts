import { SessionSchema
} from "./multi-agent-system";

describe("MultiAgentSystem Schemas", () => {
	describe("MultiAgentConfigSchema", () => {
		it("should parse valid config", () => {
			const config = {
				orchestrator: {},
				brainstorm: {},
				enableVoice: true,
				enableLowLatency: false,
				maxConcurrentSessions: 20,
			};
			const parsed = MultiAgentConfigSchema.parse(config);
			expect(parsed).toEqual(config);
		});

		it("should use defaults for missing fields", () => {
			const parsed = MultiAgentConfigSchema.parse({});
			expect(parsed.enableVoice).toBe(true);
			expect(parsed.enableLowLatency).toBe(true);
			expect(parsed.maxConcurrentSessions).toBe(10);
		});

		it("should make orchestrator and brainstorm configs optional", () => {
			const configs = [
				{ orchestrator: { name: "Custom" } },
				{ brainstorm: { creativityLevel: "wild" } },
				{},
			];

			configs.forEach((config) => {
				expect(() => MultiAgentConfigSchema.parse(config)).not.toThrow();
			});
		});

		it("should validate numeric limits", () => {
			expect(() =>
MultiAgentConfigSchema.parse({ maxConcurrentSessions: 0 }),
			).not.toThrow();
			expect(() =>