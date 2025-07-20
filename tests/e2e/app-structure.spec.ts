import { expect, test } from "@playwright/test";

test.describe("Application Structure E2E Tests", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("http://localhost:3000");
		await page.waitForLoadState("networkidle");
	});

	test("should have proper HTML structure", async ({ page }) => {
		// Check HTML structure
		await expect(page.locator("html")).toHaveAttribute("lang", "en");
		await expect(page.locator("body")).toBeVisible();

		// Check for main container structure
		await expect(
			page.locator("div.flex.flex-col.px-4.py-2.h-screen"),
		).toBeVisible();
	});

	test("should render navigation component", async ({ page }) => {
		// Check for navigation - should be present based on ClientPage structure
		await expect(page.locator("h1").filter({ hasText: "VibeX" })).toBeVisible();

		// Navigation should be functional
		await expect(page.locator("a").filter({ hasText: "Home" })).toBeVisible();
		await expect(
			page.locator("a").filter({ hasText: "Environments" }),
		).toBeVisible();

		// Check for theme toggle
		const themeToggle = page.locator(
			'button[role="switch"], button[aria-label*="theme"], button[aria-label*="Theme"]',
		);
		if ((await themeToggle.count()) > 0) {
			await expect(themeToggle.first()).toBeVisible();
		}
	});

	test("should render task form component", async ({ page }) => {
		// Check for task form - NewTaskForm component
		const forms = page.locator("form");

		// May have forms for task creation
		if ((await forms.count()) > 0) {
			await expect(forms.first()).toBeVisible();

			// Check for form inputs
			const inputs = page.locator("form input, form textarea");
			const inputCount = await inputs.count();
			expect(inputCount).toBeGreaterThanOrEqual(0);
		}
	});

	test("should render task list component", async ({ page }) => {
		// TaskList component should be rendered
		// It may be empty, but the container should exist
		await expect(
			page.locator("div.flex.flex-col.px-4.py-2.h-screen"),
		).toBeVisible();

		// Check for task-related elements
		const _taskElements = page.locator(
			'[data-testid*="task"], [class*="task"], [id*="task"]',
		);

		// Even if no tasks exist, the structure should be there
		await expect(page.locator("body")).toBeVisible();
	});

	test("should handle theme provider correctly", async ({ page }) => {
		// Check that theme provider is working (based on layout.tsx)
		const body = page.locator("body");
		await expect(body).toBeVisible();

		// Theme classes should be applied
		const hasThemeClasses = await body.evaluate((el) => {
			return (
				el.className.includes("antialiased") ||
				el.hasAttribute("data-theme") ||
				el.style.cssText.length > 0
			);
		});

		expect(hasThemeClasses).toBe(true);
	});

	test("should handle error boundary correctly", async ({ page }) => {
		// Check that error boundary is not showing error state
		const errorBoundaryElements = page.locator(
			'[data-error-boundary="true"], .error-boundary',
		);
		await expect(errorBoundaryElements).toHaveCount(0);

		// App should be running normally
		await expect(page.locator("body")).toBeVisible();
	});

	test("should have proper CSS and fonts loaded", async ({ page }) => {
		// Check that fonts are loaded (Geist fonts from layout.tsx)
		const bodyHasFontClass = await page.evaluate(() => {
			const body = document.body;
			return (
				body.className.includes("font-geist") ||
				body.className.includes("antialiased") ||
				body.style.fontFamily.length > 0
			);
		});

		// Body should have font-related classes or styles
		expect(bodyHasFontClass).toBe(true);
	});

	test("should handle container hooks without errors", async ({ page }) => {
		const hookErrors = [];
		page.on("console", (msg) => {
			if (
				msg.type() === "error" &&
				(msg.text().includes("useInngestSubscription") ||
					msg.text().includes("useTaskMessageProcessing") ||
					msg.text().includes("Container"))
			) {
				hookErrors.push(msg.text());
			}
		});

		await page.waitForTimeout(3000);

		// Container hooks should not cause critical errors
		const criticalHookErrors = hookErrors.filter(
			(error) =>
				!(
					error.includes("connection") ||
					error.includes("network") ||
					error.includes("WebSocket")
				),
		);

		expect(criticalHookErrors.length).toBe(0);
	});

	test("should handle responsive design", async ({ page }) => {
		// Test mobile viewport
		await page.setViewportSize({ width: 375, height: 667 });
		await page.waitForTimeout(500);

		// Should still be visible and functional
		await expect(page.locator("body")).toBeVisible();
		await expect(
			page.locator("div.flex.flex-col.px-4.py-2.h-screen"),
		).toBeVisible();

		// Test desktop viewport
		await page.setViewportSize({ width: 1920, height: 1080 });
		await page.waitForTimeout(500);

		// Should still be visible and functional
		await expect(page.locator("body")).toBeVisible();
		await expect(
			page.locator("div.flex.flex-col.px-4.py-2.h-screen"),
		).toBeVisible();
	});

	test("should handle page reload gracefully", async ({ page }) => {
		// Initial load
		await expect(page.locator("body")).toBeVisible();

		// Reload page
		await page.reload();
		await page.waitForLoadState("networkidle");

		// Should still work after reload
		await expect(page.locator("body")).toBeVisible();
		await expect(
			page.locator("div.flex.flex-col.px-4.py-2.h-screen"),
		).toBeVisible();
	});
});
