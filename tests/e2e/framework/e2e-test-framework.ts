/**
 * E2E Test Framework for VibeKit Components
 *
 * This framework provides comprehensive utilities for testing React components
 * with real user interactions, focusing on behavior rather than implementation.
 */

import { type BrowserContext, expect, type Page } from "@playwright/test";
import type { Stagehand } from "stagehand";

export interface E2ETestContext {
	page: Page;
	context: BrowserContext;
	stagehand: Stagehand;
}

export interface TestScenario {
	name: string;
	description: string;
	priority: "critical" | "high" | "medium" | "low";
	tags: string[];
	setup?: (context: E2ETestContext) => Promise<void>;
	teardown?: (context: E2ETestContext) => Promise<void>;
}

export interface ComponentTestSuite {
	component: string;
	scenarios: TestScenario[];
	fixtures?: Record<string, unknown>;
	mocks?: Record<string, unknown>;
}

/**
 * Base E2E Test Runner
 */
export class E2ETestRunner {
	private context: E2ETestContext;
	private testData: Map<string, unknown> = new Map();

	constructor(context: E2ETestContext) {
		this.context = context;
	}

	/**
	 * Execute a test scenario with proper setup and teardown
	 */
	async runScenario(
		scenario: TestScenario,
		testFn: (context: E2ETestContext) => Promise<void>,
	) {
		const { page, stagehand } = this.context;

		try {
			// Setup
			await this.setupTestEnvironment();
			if (scenario.setup) {
				await scenario.setup(this.context);
			}

			// Execute test
			await testFn(this.context);

			// Verify no console errors (unless expected)
			await this.verifyNoUnexpectedErrors();
		} catch (error) {
			// Capture screenshot on failure
			await this.captureFailureEvidence(scenario.name);
			throw error;
		} finally {
			// Teardown
			if (scenario.teardown) {
				await scenario.teardown(this.context);
			}
			await this.cleanupTestEnvironment();
		}
	}

	/**
	 * Setup test environment
	 */
	private async setupTestEnvironment() {
		const { page } = this.context;

		// Clear storage
		await page.evaluate(() => {
			localStorage.clear();
			sessionStorage.clear();
		});

		// Set test mode
		await page.addInitScript(() => {
			window.TEST_MODE = true;
			window.DISABLE_ANIMATIONS = true;
		});

		// Mock external APIs if needed
		await this.setupMocks();
	}

	/**
	 * Setup common mocks
	 */
	private async setupMocks() {
		const { page } = this.context;

		// Mock GitHub API
		await page.route("**/api/github/**", (route) => {
			route.fulfill({
				status: 200,
				body: JSON.stringify({ success: true, data: {} }),
			});
		});

		// Mock Inngest API
		await page.route("**/api/inngest/**", (route) => {
			route.fulfill({
				status: 200,
				body: JSON.stringify({ success: true }),
			});
		});

		// Mock audio APIs
		await page.route("**/api/audio/**", (route) => {
			route.fulfill({
				status: 200,
				body: JSON.stringify({ success: true }),
			});
		});
	}

	/**
	 * Verify no unexpected console errors
	 */
	private async verifyNoUnexpectedErrors() {
		const { page } = this.context;
		const errors = await page.evaluate(() => {
			return window.TEST_ERRORS || [];
		});

		if (errors.length > 0) {
		}
	}

	/**
	 * Capture evidence on test failure
	 */
	private async captureFailureEvidence(scenarioName: string) {
		const { page } = this.context;
		const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

		// Screenshot
		await page.screenshot({
			path: `tests/e2e/screenshots/failure-${scenarioName}-${timestamp}.png`,
			fullPage: true,
		});

		// DOM snapshot
		const html = await page.content();
		require("node:fs").writeFileSync(
			`tests/e2e/screenshots/failure-${scenarioName}-${timestamp}.html`,
			html,
		);
	}

	/**
	 * Cleanup test environment
	 */
	private async cleanupTestEnvironment() {
		const { page } = this.context;

		// Remove test data
		await page.evaluate(() => {
			localStorage.removeItem("test-data");
			sessionStorage.removeItem("test-data");
		});

		// Clear any test-specific state
		this.testData.clear();
	}

	/**
	 * Store test data for later use
	 */
	setTestData(key: string, value: unknown) {
		this.testData.set(key, value);
	}

	/**
	 * Retrieve test data
	 */
	getTestData(key: string): unknown {
		return this.testData.get(key);
	}
}

/**
 * Component Test Builder
 */
export class ComponentTestBuilder {
	private component: string;
	private scenarios: TestScenario[] = [];
	private fixtures: Record<string, unknown> = {};
	private mocks: Record<string, unknown> = {};

	constructor(component: string) {
		this.component = component;
	}

	/**
	 * Add a test scenario
	 */
	addScenario(scenario: TestScenario): this {
		this.scenarios.push(scenario);
		return this;
	}

	/**
	 * Add fixtures for testing
	 */
	addFixtures(fixtures: Record<string, unknown>): this {
		this.fixtures = { ...this.fixtures, ...fixtures };
		return this;
	}

	/**
	 * Add mocks for testing
	 */
	addMocks(mocks: Record<string, unknown>): this {
		this.mocks = { ...this.mocks, ...mocks };
		return this;
	}

	/**
	 * Build the test suite
	 */
	build(): ComponentTestSuite {
		return {
			component: this.component,
			scenarios: this.scenarios,
			fixtures: this.fixtures,
			mocks: this.mocks,
		};
	}
}

/**
 * User Interaction Helpers
 */
export class UserInteractionHelper {
	constructor(
		private stagehand: Stagehand,
		private page: Page,
	) {}

	/**
	 * Type text naturally (with realistic delays)
	 */
	async typeNaturally(
		selector: string,
		text: string,
		options?: { delay?: number },
	) {
		await this.page.fill(selector, "");
		await this.page.type(selector, text, { delay: options?.delay || 50 });
	}

	/**
	 * Click with visual feedback
	 */
	async clickWithFeedback(description: string) {
		await this.stagehand.act({ action: "click", description });
		await this.page.waitForTimeout(100); // Allow for visual feedback
	}

	/**
	 * Wait for element to become interactive
	 */
	async waitForInteractive(description: string, timeout = 10_000) {
		const startTime = Date.now();
		while (Date.now() - startTime < timeout) {
			const isInteractive = await this.stagehand.observe({
				description: `${description} is clickable and ready for interaction`,
			});
			if (isInteractive) {
				return;
			}
			await this.page.waitForTimeout(100);
		}
		throw new Error(
			`Element "${description}" did not become interactive within ${timeout}ms`,
		);
	}

	/**
	 * Verify visual state
	 */
	async verifyVisualState(description: string): Promise<boolean> {
		return await this.stagehand.observe({ description });
	}

	/**
	 * Extract text content
	 */
	async extractText(description: string): Promise<string> {
		return await this.stagehand.extract({ description });
	}
}

/**
 * Assertion Helpers
 */
export class E2EAssertions {
	constructor(private helper: UserInteractionHelper) {}

	/**
	 * Assert element is visible and interactive
	 */
	async assertInteractive(description: string) {
		const isVisible = await this.helper.verifyVisualState(
			`${description} is visible`,
		);
		expect(isVisible).toBe(true);

		await this.helper.waitForInteractive(description);
	}

	/**
	 * Assert text content matches expectation
	 */
	async assertTextContent(description: string, expectedText: string | RegExp) {
		const actualText = await this.helper.extractText(description);

		if (typeof expectedText === "string") {
			expect(actualText).toContain(expectedText);
		} else {
			expect(actualText).toMatch(expectedText);
		}
	}

	/**
	 * Assert component state
	 */
	async assertComponentState(description: string, expectedState: string) {
		const hasState = await this.helper.verifyVisualState(
			`${description} ${expectedState}`,
		);
		expect(hasState).toBe(true);
	}

	/**
	 * Assert no loading states
	 */
	async assertNotLoading() {
		const isLoading = await this.helper.verifyVisualState(
			"loading indicator is visible",
		);
		expect(isLoading).toBe(false);
	}

	/**
	 * Assert accessibility compliance
	 */
	async assertAccessible(description: string) {
		const isAccessible = await this.helper.verifyVisualState(
			`${description} has proper ARIA labels and is keyboard accessible`,
		);
		expect(isAccessible).toBe(true);
	}
}

/**
 * Performance Testing Utilities
 */
export class PerformanceTestUtils {
	constructor(private page: Page) {}

	/**
	 * Measure component render time
	 */
	async measureRenderTime(componentSelector: string): Promise<number> {
		const startTime = performance.now();
		await this.page.waitForSelector(componentSelector, { state: "visible" });
		const endTime = performance.now();
		return endTime - startTime;
	}

	/**
	 * Measure interaction response time
	 */
	async measureInteractionTime(
		actionFn: () => Promise<void>,
		expectedResultSelector: string,
	): Promise<number> {
		const startTime = performance.now();
		await actionFn();
		await this.page.waitForSelector(expectedResultSelector, {
			state: "visible",
		});
		const endTime = performance.now();
		return endTime - startTime;
	}

	/**
	 * Assert performance benchmarks
	 */
	async assertPerformance(renderTime: number, maxExpectedTime: number) {
		expect(renderTime).toBeLessThan(maxExpectedTime);
	}
}

/**
 * Test Data Generator
 */
export class TestDataGenerator {
	/**
	 * Generate random test data
	 */
	static generateRandomData() {
		const timestamp = Date.now();
		return {
			taskId: `test-task-${timestamp}`,
			sessionId: `test-session-${timestamp}`,
			userId: `test-user-${timestamp}`,
			message: `Test message ${timestamp}`,
			title: `Test Task ${timestamp}`,
			description: `Test description generated at ${new Date().toISOString()}`,
		};
	}

	/**
	 * Generate edge case data
	 */
	static generateEdgeCaseData() {
		return {
			emptyString: "",
			longText: "A".repeat(1000),
			specialChars: "!@#$%^&*()_+{}|:\"<>?[]\\;',./",
			unicode: "🚀🌟💫✨🎯🎨🔥💎🌈⭐",
			html: '<script>alert("xss")</script>',
			json: '{"key": "value", "nested": {"array": [1, 2, 3]}}',
		};
	}

	/**
	 * Generate realistic user data
	 */
	static generateRealisticData() {
		const scenarios = [
			{
				taskTitle: "Implement user authentication",
				taskDescription: "Add login/logout functionality with OAuth",
				messages: [
					"Please implement user authentication",
					"Add OAuth integration with Google and GitHub",
					"Ensure secure session management",
				],
			},
			{
				taskTitle: "Fix responsive design issues",
				taskDescription: "Mobile layout needs improvements",
				messages: [
					"The mobile layout is broken on small screens",
					"Fix the navigation menu for mobile",
					"Ensure buttons are properly sized",
				],
			},
			{
				taskTitle: "Add real-time features",
				taskDescription: "Implement WebSocket connections",
				messages: [
					"Add real-time chat functionality",
					"Implement live updates for task status",
					"Add presence indicators",
				],
			},
		];

		return scenarios[Math.floor(Math.random() * scenarios.length)];
	}
}

export {
	E2ETestRunner,
	ComponentTestBuilder,
	UserInteractionHelper,
	E2EAssertions,
	PerformanceTestUtils,
	TestDataGenerator,
};
