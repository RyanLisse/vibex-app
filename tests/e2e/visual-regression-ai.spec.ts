import { test, expect } from "@playwright/test";
import { Stagehand } from "@browserbasehq/stagehand";
import { StagehandConfig, StagehandTestUtils } from "../../stagehand.config";

/**
 * AI-Powered Visual Regression Tests for vibex-app
 * 
 * These tests use Stagehand AI to perform intelligent visual testing,
 * detecting layout changes, design inconsistencies, and visual bugs.
 */

test.describe("AI-Powered Visual Regression Tests", () => {
	let stagehand: Stagehand;

	test.beforeEach(async () => {
		// Initialize Stagehand with configuration
		stagehand = new Stagehand(StagehandConfig);
		await stagehand.init();
	});

	test.afterEach(async () => {
		if (stagehand) {
			await stagehand.close();
		}
	});

	test("AI visual baseline - homepage layout", async () => {
		const page = stagehand.page;
		
		await page.goto("http://localhost:3000");
		await StagehandTestUtils.waitForAppLoad(page);

		// Use AI to analyze the visual layout
		const visualAnalysis = await page.extract({
			instruction: "Analyze the visual layout of this homepage including header, navigation, main content areas, footer, spacing, colors, and overall design consistency",
			schema: {
				layoutStructure: "string",
				colorScheme: "string",
				typography: "string",
				spacing: "string",
				visualHierarchy: "string",
				designConsistency: "string",
				potentialIssues: "array",
			},
		});

		console.log("AI Visual Analysis - Homepage:", visualAnalysis);

		// Take baseline screenshot
		await StagehandTestUtils.takeAIScreenshot(page, "homepage-visual-baseline");

		// Perform visual regression check
		const regressionResult = await StagehandTestUtils.checkVisualRegression(page, "homepage");
		expect(regressionResult.passed).toBe(true);
	});

	test("AI visual analysis - responsive breakpoints", async () => {
		const page = stagehand.page;
		
		await page.goto("http://localhost:3000");
		await StagehandTestUtils.waitForAppLoad(page);

		const breakpoints = [
			{ width: 1920, height: 1080, name: "desktop-xl" },
			{ width: 1440, height: 900, name: "desktop-lg" },
			{ width: 1024, height: 768, name: "tablet-landscape" },
			{ width: 768, height: 1024, name: "tablet-portrait" },
			{ width: 414, height: 896, name: "mobile-lg" },
			{ width: 375, height: 667, name: "mobile-md" },
			{ width: 320, height: 568, name: "mobile-sm" },
		];

		for (const breakpoint of breakpoints) {
			await page.setViewportSize(breakpoint);
			await page.waitForTimeout(1000); // Allow layout to settle

			// AI analysis of responsive behavior
			const responsiveAnalysis = await page.extract({
				instruction: `Analyze how the layout adapts to this ${breakpoint.name} viewport (${breakpoint.width}x${breakpoint.height}). Check for layout breaks, overlapping elements, text readability, button sizes, and navigation accessibility.`,
				schema: {
					layoutAdaptation: "string",
					elementVisibility: "string",
					textReadability: "string",
					interactionElements: "string",
					layoutIssues: "array",
					overallQuality: "number",
				},
			});

			console.log(`AI Responsive Analysis - ${breakpoint.name}:`, responsiveAnalysis);

			// Take screenshot for visual comparison
			await StagehandTestUtils.takeAIScreenshot(page, `responsive-${breakpoint.name}`);

			// Check for layout issues using AI
			if (responsiveAnalysis.layoutIssues && responsiveAnalysis.layoutIssues.length > 0) {
				console.warn(`Layout issues detected at ${breakpoint.name}:`, responsiveAnalysis.layoutIssues);
			}

			// Verify overall quality meets threshold
			if (responsiveAnalysis.overallQuality && responsiveAnalysis.overallQuality < 7) {
				console.warn(`Low quality score (${responsiveAnalysis.overallQuality}/10) for ${breakpoint.name}`);
			}
		}
	});

	test("AI visual consistency - component states", async () => {
		const page = stagehand.page;
		
		await page.goto("http://localhost:3000");
		await StagehandTestUtils.waitForAppLoad(page);

		// Use AI to find interactive elements and test their visual states
		await page.act("find all buttons, links, form inputs, and other interactive elements on the page");

		const interactiveAnalysis = await page.extract({
			instruction: "Identify all interactive elements (buttons, links, inputs, etc.) and analyze their visual states including normal, hover, focus, and active states",
			schema: {
				buttons: "array",
				links: "array", 
				inputs: "array",
				interactiveElements: "array",
				stateConsistency: "string",
				accessibilityIndicators: "string",
			},
		});

		console.log("AI Interactive Elements Analysis:", interactiveAnalysis);

		// Test hover states with AI
		await page.act("hover over different interactive elements to see their hover states and visual feedback");
		await StagehandTestUtils.takeAIScreenshot(page, "interactive-states-hover");

		// Test focus states with AI
		await page.act("use keyboard navigation (Tab key) to focus on different elements and observe focus indicators");
		await StagehandTestUtils.takeAIScreenshot(page, "interactive-states-focus");

		// Analyze visual feedback consistency
		const stateAnalysis = await page.extract({
			instruction: "Analyze the consistency of visual feedback across different interactive elements. Are hover effects, focus indicators, and active states consistent?",
			schema: {
				hoverConsistency: "string",
				focusConsistency: "string",
				visualFeedbackQuality: "string",
				inconsistencies: "array",
				recommendations: "array",
			},
		});

		console.log("AI Visual State Consistency:", stateAnalysis);
	});

	test("AI visual accessibility - color and contrast", async () => {
		const page = stagehand.page;
		
		await page.goto("http://localhost:3000");
		await StagehandTestUtils.waitForAppLoad(page);

		// Use AI to analyze color accessibility
		const colorAnalysis = await page.extract({
			instruction: "Analyze the color scheme and contrast ratios throughout the page. Check if text is readable against backgrounds, if color is used as the only way to convey information, and if the design works for colorblind users.",
			schema: {
				colorScheme: "string",
				contrastIssues: "array",
				colorOnlyInformation: "array",
				colorblindFriendly: "string",
				textReadability: "string",
				recommendations: "array",
			},
		});

		console.log("AI Color Accessibility Analysis:", colorAnalysis);

		// Take screenshot for color analysis
		await StagehandTestUtils.takeAIScreenshot(page, "color-accessibility-analysis");

		// Simulate different types of color blindness
		const colorBlindnessTypes = [
			{ name: "protanopia", filter: "url(#protanopia)" },
			{ name: "deuteranopia", filter: "url(#deuteranopia)" },
			{ name: "tritanopia", filter: "url(#tritanopia)" },
		];

		for (const colorBlindness of colorBlindnessTypes) {
			// Apply color blindness simulation (simplified approach)
			await page.addStyleTag({
				content: `
					body { 
						filter: ${colorBlindness.filter}; 
					}
				`,
			});

			await StagehandTestUtils.takeAIScreenshot(page, `colorblind-${colorBlindness.name}`);

			// Analyze readability with color blindness simulation
			const colorBlindAnalysis = await page.extract({
				instruction: `Analyze how readable and usable this page is for users with ${colorBlindness.name} (a type of color blindness). Can all information still be understood?`,
				schema: {
					readability: "string",
					informationLoss: "array",
					usabilityImpact: "string",
					severity: "string",
				},
			});

			console.log(`AI Color Blind Analysis - ${colorBlindness.name}:`, colorBlindAnalysis);

			// Remove the filter for next iteration
			await page.addStyleTag({
				content: "body { filter: none; }",
			});
		}
	});

	test("AI visual performance - loading states", async () => {
		const page = stagehand.page;
		
		// Test loading states by throttling network
		await page.route("**/*", (route) => {
			// Add delay to simulate slow loading
			setTimeout(() => route.continue(), 500);
		});

		await page.goto("http://localhost:3000");

		// Analyze loading states with AI
		const loadingAnalysis = await page.extract({
			instruction: "Analyze the loading experience including loading indicators, skeleton screens, progressive loading, and how content appears as the page loads",
			schema: {
				loadingIndicators: "array",
				skeletonScreens: "string",
				progressiveLoading: "string",
				userExperience: "string",
				loadingTime: "string",
				improvements: "array",
			},
		});

		console.log("AI Loading States Analysis:", loadingAnalysis);

		await StagehandTestUtils.takeAIScreenshot(page, "loading-states-analysis");

		// Wait for full load and compare
		await StagehandTestUtils.waitForAppLoad(page);
		await StagehandTestUtils.takeAIScreenshot(page, "fully-loaded-state");

		// Analyze the difference between loading and loaded states
		const loadingComparison = await page.extract({
			instruction: "Compare the loading state with the fully loaded state. How smooth was the transition? Were there any jarring layout shifts?",
			schema: {
				transitionSmoothness: "string",
				layoutShifts: "array",
				userExperienceRating: "number",
				recommendations: "array",
			},
		});

		console.log("AI Loading Transition Analysis:", loadingComparison);
	});
});
