import type { Page } from "@playwright/test";
import type { Stagehand } from "stagehand";

/**
 * Utility functions for E2E tests
 */

/**
 * Wait for element to be visible using natural language description
 */
export async function waitForElementVisible(
	stagehand: Stagehand,
	description: string,
	timeout = 10_000,
): Promise<void> {
	const startTime = Date.now();

	while (Date.now() - startTime < timeout) {
		const isVisible = await stagehand.observe({ description });
		if (isVisible) {
			return;
		}
		await new Promise((resolve) => setTimeout(resolve, 500));
	}

	throw new Error(`Element "${description}" not visible within ${timeout}ms`);
}

/**
 * Wait for element to disappear using natural language description
 */
export async function waitForElementHidden(
	stagehand: Stagehand,
	description: string,
	timeout = 10_000,
): Promise<void> {
	const startTime = Date.now();

	while (Date.now() - startTime < timeout) {
		const isVisible = await stagehand.observe({ description });
		if (!isVisible) {
			return;
		}
		await new Promise((resolve) => setTimeout(resolve, 500));
	}

	throw new Error(`Element "${description}" still visible after ${timeout}ms`);
}

/**
 * Take screenshot with timestamp
 */
export async function takeTimestampedScreenshot(
	page: Page,
	name: string,
	directory = "tests/e2e/screenshots",
): Promise<string> {
	const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
	const filename = `${name}-${timestamp}.png`;
	const filepath = `${directory}/${filename}`;

	await page.screenshot({ path: filepath });
	return filepath;
}

/**
 * Wait for network to be idle
 */
export async function waitForNetworkIdle(
	page: Page,
	timeout = 30_000,
): Promise<void> {
	await page.waitForLoadState("networkidle", { timeout });
}

/**
 * Generate random string for testing
 */
export function generateRandomString(length = 8): string {
	const chars =
		"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
	let result = "";
	for (let i = 0; i < length; i++) {
		result += chars.charAt(Math.floor(Math.random() * chars.length));
	}
	return result;
}

/**
 * Generate test data for forms
 */
export function generateTestData() {
	const randomId = generateRandomString(6);
	return {
		taskTitle: `Test Task ${randomId}`,
		taskDescription: `This is a test task created at ${new Date().toISOString()}`,
		environmentName: `Test Environment ${randomId}`,
		environmentDescription: `Test environment created at ${new Date().toISOString()}`,
		message: `Test message ${randomId} sent at ${new Date().toISOString()}`,
	};
}

/**
 * Clean up test data (if needed)
 */
export async function cleanupTestData(
	stagehand: Stagehand,
	testDataIdentifier: string,
): Promise<void> {
	try {
		// This is a placeholder - implement based on your app's cleanup needs
		await stagehand.observe({
			description: `cleanup data containing ${testDataIdentifier}`,
		});
	} catch (_error) {}
}

/**
 * Set up test environment
 */
export async function setupTestEnvironment(page: Page): Promise<void> {
	// Clear any existing data
	await page.evaluate(() => {
		localStorage.clear();
		sessionStorage.clear();
	});

	// Set up test-specific configurations
	await page.addInitScript(() => {
		// Add any test-specific setup here
		window.TEST_MODE = true;
	});
}

/**
 * Retry an action with exponential backoff
 */
export async function retryWithBackoff<T>(
	action: () => Promise<T>,
	maxRetries = 3,
	baseDelay = 1000,
): Promise<T> {
	let lastError: Error;

	for (let attempt = 0; attempt < maxRetries; attempt++) {
		try {
			return await action();
		} catch (error) {
			lastError = error as Error;

			if (attempt === maxRetries - 1) {
				throw lastError;
			}

			const delay = baseDelay * 2 ** attempt;
			await new Promise((resolve) => setTimeout(resolve, delay));
		}
	}

	throw lastError!;
}

/**
 * Check if element exists using natural language
 */
export async function elementExists(
	stagehand: Stagehand,
	description: string,
): Promise<boolean> {
	try {
		return await stagehand.observe({ description });
	} catch (_error) {
		return false;
	}
}

/**
 * Get text content using natural language
 */
export async function getTextContent(
	stagehand: Stagehand,
	description: string,
): Promise<string> {
	try {
		return await stagehand.extract({ description });
	} catch (_error) {
		return "";
	}
}

/**
 * Click element with retry logic
 */
export async function clickWithRetry(
	stagehand: Stagehand,
	description: string,
	maxRetries = 3,
): Promise<void> {
	await retryWithBackoff(async () => {
		await stagehand.act({ action: "click", description });
	}, maxRetries);
}

/**
 * Fill form field with retry logic
 */
export async function fillWithRetry(
	stagehand: Stagehand,
	description: string,
	value: string,
	maxRetries = 3,
): Promise<void> {
	await retryWithBackoff(async () => {
		await stagehand.act({ action: "fill", description, value });
	}, maxRetries);
}

/**
 * Validate form submission
 */
export async function validateFormSubmission(
	stagehand: Stagehand,
	expectedResult: string,
	timeout = 10_000,
): Promise<boolean> {
	try {
		await waitForElementVisible(stagehand, expectedResult, timeout);
		return true;
	} catch (_error) {
		return false;
	}
}

/**
 * Create directory if it doesn't exist
 */
export async function ensureDirectoryExists(path: string): Promise<void> {
	const fs = require("node:fs").promises;
	try {
		await fs.access(path);
	} catch {
		await fs.mkdir(path, { recursive: true });
	}
}
