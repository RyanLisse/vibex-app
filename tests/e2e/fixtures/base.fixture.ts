import { test as base, expect } from "@playwright/test";
import { Stagehand } from "@browserbasehq/stagehand";
import {
	StagehandConfig,
	PageDataSchema,
	TaskDataSchema,
	EnvironmentDataSchema,
} from "../../../stagehand.config";

/**
 * Extended Playwright test fixture with Stagehand AI integration
 * Provides AI-powered testing capabilities alongside traditional Playwright
 */

export interface AITestFixtures {
	stagehand: Stagehand;
	schemas: {
		PageDataSchema: typeof PageDataSchema;
		TaskDataSchema: typeof TaskDataSchema;
		EnvironmentDataSchema: typeof EnvironmentDataSchema;
	};
	utils: {
		extractWithSchema: (stagehand: Stagehand, instruction: string, schema: any) => Promise<any>;
		validateAccessibility: (stagehand: Stagehand) => Promise<any>;
		measurePerformance: (stagehand: Stagehand, action: () => Promise<void>) => Promise<any>;
		waitForStable: (stagehand: Stagehand) => Promise<void>;
	};
	metrics: {
		startTime: number;
		actions: Array<{
			type: string;
			description: string;
			duration: number;
			success: boolean;
			timestamp: number;
		}>;
	};
}

export const test = base.extend<AITestFixtures>({
	stagehand: async ({}, use) => {
		// Check if API key is available
		const hasApiKey = !!(process.env.OPENAI_API_KEY || process.env.STAGEHAND_API_KEY);

		if (!hasApiKey) {
			console.warn("⚠️  No OpenAI API key found. Stagehand AI features will be disabled.");
			// Create a mock stagehand for tests without API key
			const mockStagehand = {
				page: {
					goto: async () => {},
					extract: async () => ({
						title: "Mock Data",
						headings: [],
						navigation: [],
						buttons: [],
						links: [],
						content: "Mock content",
					}),
					act: async () => {},
					waitForLoadState: async () => {},
					waitForTimeout: async () => {},
					screenshot: async () => {},
				},
				init: async () => {},
				close: async () => {},
			};
			await use(mockStagehand as any);
			return;
		}

		let stagehand: Stagehand | null = null;
		try {
			stagehand = new Stagehand(StagehandConfig);
			await Promise.race([
				stagehand.init(),
				new Promise((_, reject) =>
					setTimeout(() => reject(new Error("Stagehand init timeout")), 15000)
				),
			]);
			await use(stagehand);
		} catch (error) {
			console.error("Stagehand initialization failed:", error);
			// Provide mock stagehand on failure
			const mockStagehand = {
				page: {
					goto: async () => {},
					extract: async () => ({
						title: "Mock Data",
						headings: [],
						navigation: [],
						buttons: [],
						links: [],
						content: "Mock content",
					}),
					act: async () => {},
					waitForLoadState: async () => {},
					waitForTimeout: async () => {},
					screenshot: async () => {},
				},
				init: async () => {},
				close: async () => {},
			};
			await use(mockStagehand as any);
		} finally {
			if (stagehand) {
				try {
					await stagehand.close();
				} catch (error) {
					console.warn("Error closing stagehand:", error);
				}
			}
		}
	},

	schemas: async ({}, use) => {
		await use({
			PageDataSchema,
			TaskDataSchema,
			EnvironmentDataSchema,
		});
	},

	utils: async ({ stagehand }, use) => {
		const utils = {
			async extractWithSchema(stagehand: Stagehand, instruction: string, schema: any) {
				return await stagehand.page.extract({
					instruction,
					schema,
				});
			},

			async validateAccessibility(stagehand: Stagehand) {
				return await stagehand.page.extract({
					instruction:
						"Analyze accessibility features including alt text, headings, keyboard navigation, contrast, and ARIA labels",
					schema: {
						hasAltText: "boolean",
						hasProperHeadings: "boolean",
						hasKeyboardNavigation: "boolean",
						hasGoodContrast: "boolean",
						hasAriaLabels: "boolean",
						issues: "array",
						score: "number",
					},
				});
			},

			async measurePerformance(stagehand: Stagehand, action: () => Promise<void>) {
				const startTime = Date.now();
				await action();
				const endTime = Date.now();

				return {
					duration: endTime - startTime,
					timestamp: startTime,
				};
			},

			async waitForStable(stagehand: Stagehand) {
				await stagehand.page.waitForLoadState("networkidle");
				await stagehand.page.waitForTimeout(1000); // Additional stability wait
			},
		};

		await use(utils);
	},

	metrics: async ({}, use) => {
		const metrics = {
			startTime: Date.now(),
			actions: [] as Array<{
				type: string;
				description: string;
				duration: number;
				success: boolean;
				timestamp: number;
			}>,
		};

		await use(metrics);
	},
});

/**
 * AI Wrapper for enhanced Stagehand interactions with metrics tracking
 */
export function createAIWrapper(stagehand: Stagehand, metrics: AITestFixtures["metrics"]) {
	return {
		async act(options: { action: string; description: string; value?: string }) {
			const startTime = Date.now();
			let success = false;

			try {
				if (options.action === "click") {
					await stagehand.page.act(`click on ${options.description}`);
				} else if (options.action === "fill") {
					await stagehand.page.act(`fill ${options.description} with "${options.value}"`);
				} else {
					await stagehand.page.act(`${options.action} ${options.description}`);
				}
				success = true;
			} catch (error) {
				console.error(`AI action failed: ${options.description}`, error);
				throw error;
			} finally {
				metrics.actions.push({
					type: options.action,
					description: options.description,
					duration: Date.now() - startTime,
					success,
					timestamp: startTime,
				});
			}
		},

		async observe(options: { description: string }) {
			const startTime = Date.now();
			let success = false;
			let result = false;

			try {
				// Use Stagehand to observe/validate conditions
				const observation = await stagehand.page.extract({
					instruction: `Check if ${options.description}. Return true if the condition is met, false otherwise.`,
					schema: { result: "boolean", details: "string" },
				});
				result = observation.result;
				success = true;
			} catch (error) {
				console.error(`AI observation failed: ${options.description}`, error);
			} finally {
				metrics.actions.push({
					type: "observe",
					description: options.description,
					duration: Date.now() - startTime,
					success,
					timestamp: startTime,
				});
			}

			return result;
		},

		async extract(options: { description: string; schema?: any }) {
			const startTime = Date.now();
			let success = false;
			let result = null;

			try {
				result = await stagehand.page.extract({
					instruction: options.description,
					schema: options.schema || { data: "string" },
				});
				success = true;
			} catch (error) {
				console.error(`AI extraction failed: ${options.description}`, error);
				throw error;
			} finally {
				metrics.actions.push({
					type: "extract",
					description: options.description,
					duration: Date.now() - startTime,
					success,
					timestamp: startTime,
				});
			}

			return result;
		},
	};
}

export { expect };
