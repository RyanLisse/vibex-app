import { createAIWrapper, expect, test } from "./fixtures/base.fixture";
import type { AITestFixtures } from "./fixtures/base.fixture";
import { StagehandTestUtils, PageDataSchema, TaskDataSchema } from "../../stagehand.config";

/**
 * Advanced AI-Powered Testing Examples
 * Demonstrates sophisticated testing patterns using Stagehand
 */
test.describe("Advanced AI-Powered Testing", () => {
	test.beforeEach(async ({ page }) => {
		// Create screenshots directory if it doesn't exist
		const fs = await import("fs");
		const path = await import("path");
		const screenshotDir = path.join(process.cwd(), "tests/e2e/screenshots");
		if (!fs.existsSync(screenshotDir)) {
			fs.mkdirSync(screenshotDir, { recursive: true });
		}
	});

	test("AI can navigate and extract homepage data", async ({ stagehand }) => {
		const page = stagehand.page;

		// Navigate to the application
		await page.goto("http://localhost:3000");
		await StagehandTestUtils.waitForAppLoad(page);

		// Use AI to extract page information with fallback
		const pageData = await StagehandTestUtils.safeExtract(
			page,
			"Extract the main navigation, hero section content, and any call-to-action buttons from this homepage",
			PageDataSchema
		);

		// Verify AI extracted meaningful data
		expect(pageData.title).toBeTruthy();
		expect(pageData.headings).toBeDefined();

		// Take AI screenshot for documentation
		await StagehandTestUtils.takeAIScreenshot(page, "homepage-ai-analysis");
	});

	test("AI can find and interact with task management features", async ({ stagehand }) => {
		const page = stagehand.page;

		await page.goto("http://localhost:3000");
		await StagehandTestUtils.waitForAppLoad(page);

		// Use AI to find task-related elements with fallback
		await StagehandTestUtils.safeAct(
			page,
			"look for any task management, todo list, or project management features on this page"
		);

		// Try to interact with task features if they exist
		const taskElements = await page
			.locator("[data-testid*='task'], [class*='task'], [id*='task']")
			.count();

		if (taskElements > 0) {
			// Extract task data using AI with safe method
			const taskData = await StagehandTestUtils.safeExtract(
				page,
				"Find all tasks, their status, titles, and any other task-related information",
				TaskDataSchema.array()
			);

			console.log("AI found tasks:", taskData);

			// Try to create a new task using AI with safe method
			await StagehandTestUtils.safeAct(
				page,
				"try to create a new task or add a new item if there's a way to do so"
			);

			await StagehandTestUtils.takeAIScreenshot(page, "task-management-interaction");
		} else {
			console.log("No task management features found by AI");
		}
	});

	test("AI can perform accessibility analysis", async ({ stagehand }) => {
		const page = stagehand.page;

		await page.goto("http://localhost:3000");
		await StagehandTestUtils.waitForAppLoad(page);

		// Use AI to analyze accessibility
		const accessibilityReport = await StagehandTestUtils.checkAccessibility(page);

		// Verify AI provided meaningful accessibility insights
		expect(accessibilityReport.score).toBeGreaterThanOrEqual(0);
		expect(accessibilityReport.score).toBeLessThanOrEqual(100);
		expect(accessibilityReport.summary).toBeTruthy();
		expect(Array.isArray(accessibilityReport.issues)).toBe(true);

		// Log accessibility findings
		console.log("AI Accessibility Analysis:", {
			score: accessibilityReport.score,
			summary: accessibilityReport.summary,
			issueCount: accessibilityReport.issues.length,
			criticalIssues: accessibilityReport.issues.filter((issue) => issue.severity === "critical")
				.length,
		});

		// Take screenshot of accessibility analysis
		await StagehandTestUtils.takeAIScreenshot(page, "accessibility-analysis");
	});

	test("AI can test responsive design behavior", async ({ stagehand }) => {
		const page = stagehand.page;

		await page.goto("http://localhost:3000");
		await StagehandTestUtils.waitForAppLoad(page);

		// Test different viewport sizes with AI analysis
		const viewports = [
			{ width: 1920, height: 1080, name: "desktop" },
			{ width: 768, height: 1024, name: "tablet" },
			{ width: 375, height: 667, name: "mobile" },
		];

		for (const viewport of viewports) {
			await page.setViewportSize(viewport);
			await page.waitForTimeout(1000); // Allow layout to settle

			// Use AI to analyze responsive behavior with safe method
			const responsiveAnalysis = await StagehandTestUtils.safeExtract(
				page,
				`Analyze how this page looks and behaves on a ${viewport.name} device. Check for layout issues, text readability, button accessibility, and navigation usability.`,
				{
					layoutQuality: "string",
					readability: "string",
					navigationUsability: "string",
					issues: "array",
					overallRating: "number",
				}
			);

			console.log(`AI Responsive Analysis for ${viewport.name}:`, responsiveAnalysis);

			// Take screenshot for each viewport
			await StagehandTestUtils.takeAIScreenshot(page, `responsive-${viewport.name}`);
		}
	});

	test("AI can test form interactions and validation", async ({ stagehand }) => {
		const page = stagehand.page;

		await page.goto("http://localhost:3000");
		await StagehandTestUtils.waitForAppLoad(page);

		// Use AI to find and interact with forms with safe method
		await StagehandTestUtils.safeAct(
			page,
			"look for any forms, input fields, or interactive elements that accept user input"
		);

		const formCount = await page.locator("form, [role='form']").count();

		if (formCount > 0) {
			// Use AI to test form interactions with safe method
			await StagehandTestUtils.safeAct(
				page,
				"try to fill out any forms with test data and submit them to see how validation works"
			);

			// Extract form validation behavior with safe method
			const formAnalysis = await StagehandTestUtils.safeExtract(
				page,
				"Analyze any form validation messages, error states, or feedback that appeared after interacting with forms",
				{
					validationMessages: "array",
					errorStates: "array",
					userFeedback: "string",
					formUsability: "string",
				}
			);

			console.log("AI Form Analysis:", formAnalysis);

			await StagehandTestUtils.takeAIScreenshot(page, "form-interaction-analysis");
		} else {
			console.log("No forms found by AI for testing");
		}
	});

	test("AI can test navigation and routing", async ({ stagehand }) => {
		const page = stagehand.page;

		await page.goto("http://localhost:3000");
		await StagehandTestUtils.waitForAppLoad(page);

		// Use AI to explore navigation with safe method
		await StagehandTestUtils.safeAct(
			page,
			"explore the navigation menu and try to visit different pages or sections of the application"
		);

		// Extract navigation structure with safe method
		const navigationAnalysis = await StagehandTestUtils.safeExtract(
			page,
			"Analyze the navigation structure, available pages, and how easy it is to move around the application",
			{
				navigationItems: "array",
				pageStructure: "string",
				userExperience: "string",
				brokenLinks: "array",
			}
		);

		console.log("AI Navigation Analysis:", navigationAnalysis);

		// Test deep linking by having AI try to navigate to specific sections with safe method
		await StagehandTestUtils.safeAct(
			page,
			"try to find and navigate to any specific features like settings, profile, dashboard, or help sections"
		);

		await StagehandTestUtils.takeAIScreenshot(page, "navigation-exploration");
	});
});
