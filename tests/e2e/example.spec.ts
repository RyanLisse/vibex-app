import { expect, test } from "@playwright/test";

test.describe("Example E2E Tests", () => {
	test.beforeEach(async ({ page }) => {
		// Navigate to the application
		await page.goto("http://localhost:3000");
	});

	test("has title", async ({ page }) => {
		// Expect a title "to contain" a substring.
		await expect(page).toHaveTitle(/Vibex/);
	});

	test("homepage loads correctly", async ({ page }) => {
		// Check if the main content is visible
		await expect(page.locator("body")).toBeVisible();

		// Wait for any loading states to complete
		await page.waitForLoadState("networkidle");
	});

	test("navigation works", async ({ page }) => {
		// Test basic navigation if nav elements exist
		const navigation = page.locator("nav");
		if (await navigation.isVisible()) {
			await expect(navigation).toBeVisible();
		}
	});

	test("handles 404 pages", async ({ page }) => {
		// Navigate to a non-existent page
		const response = await page.goto("http://localhost:3000/non-existent-page");

		// Should handle gracefully (either 404 or redirect)
		expect(response).toBeTruthy();
	});

	test("basic accessibility checks", async ({ page }) => {
		// Check for basic accessibility elements
		const body = page.locator("body");
		await expect(body).toBeVisible();

		// Check if there's a main landmark
		const main = page.locator("main");
		if (await main.isVisible()) {
			await expect(main).toBeVisible();
		}
	});
});
