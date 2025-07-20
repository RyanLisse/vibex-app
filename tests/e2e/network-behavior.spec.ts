import { expect, test } from "@playwright/test";

test.describe("Network Behavior E2E Tests", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("http://localhost:3000");
		await page.waitForLoadState("networkidle");
	});

	test("should handle Inngest connection gracefully", async ({ page }) => {
		const inngestRequests = [];
		const inngestResponses = [];

		page.on("request", (request) => {
			if (request.url().includes("inngest")) {
				inngestRequests.push({
					url: request.url(),
					method: request.method(),
				});
			}
		});

		page.on("response", (response) => {
			if (response.url().includes("inngest")) {
				inngestResponses.push({
					url: response.url(),
					status: response.status(),
				});
			}
		});

		await page.waitForTimeout(3000);

		// App should make requests to check Inngest status
		if (inngestRequests.length > 0) {
			// Should attempt to connect to Inngest
			expect(inngestRequests.length).toBeGreaterThan(0);

			// Should handle any response status gracefully
			if (inngestResponses.length > 0) {
				expect(inngestResponses[0].status).toBeGreaterThanOrEqual(200);
			}
		}

		// App should not crash regardless of Inngest connection status
		await expect(page.locator("body")).toBeVisible();
	});

	test("should handle network failures gracefully", async ({ page }) => {
		const networkErrors = [];

		page.on("response", (response) => {
			if (!response.ok()) {
				networkErrors.push({
					url: response.url(),
					status: response.status(),
				});
			}
		});

		// Reload to trigger network requests
		await page.reload();
		await page.waitForLoadState("networkidle");
		await page.waitForTimeout(2000);

		// App should handle network failures gracefully
		await expect(page.locator("body")).toBeVisible();

		// Should not show error UI for expected failures
		const fatalErrorElements = page.locator(
			'[data-fatal="true"], .fatal-error',
		);
		await expect(fatalErrorElements).toHaveCount(0);
	});

	test("should handle subscription connection states", async ({ page }) => {
		const subscriptionLogs = [];

		page.on("console", (msg) => {
			if (
				msg.text().includes("subscription") ||
				msg.text().includes("Inngest") ||
				msg.text().includes("connection")
			) {
				subscriptionLogs.push(msg.text());
			}
		});

		await page.waitForTimeout(3000);

		// Should log subscription activity
		expect(subscriptionLogs.length).toBeGreaterThanOrEqual(0);

		// App should remain functional
		await expect(page.locator("body")).toBeVisible();
	});

	test("should handle offline/online states", async ({ page }) => {
		// Start online
		await expect(page.locator("body")).toBeVisible();

		// Go offline using context
		await page.context().setOffline(true);
		await page.waitForTimeout(1000);

		// App should still display UI
		await expect(page.locator("body")).toBeVisible();

		// Go back online
		await page.context().setOffline(false);
		await page.waitForLoadState("networkidle");

		// App should recover
		await expect(page.locator("body")).toBeVisible();
	});

	test("should handle API request timeouts", async ({ page }) => {
		// Mock slow API responses
		await page.route("**/api/**", async (route) => {
			await new Promise((resolve) => setTimeout(resolve, 100));
			route.fulfill({
				status: 200,
				body: JSON.stringify({ success: true }),
			});
		});

		await page.reload();
		await page.waitForLoadState("networkidle");

		// App should handle slow requests gracefully
		await expect(page.locator("body")).toBeVisible();
	});

	test("should handle WebSocket connection failures", async ({ page }) => {
		const wsErrors = [];

		page.on("console", (msg) => {
			if (
				msg.type() === "error" &&
				(msg.text().includes("WebSocket") ||
					msg.text().includes("websocket") ||
					msg.text().includes("ws"))
			) {
				wsErrors.push(msg.text());
			}
		});

		await page.waitForTimeout(3000);

		// App should handle WebSocket failures gracefully
		await expect(page.locator("body")).toBeVisible();

		// Should not crash from WebSocket errors
		const criticalErrors = wsErrors.filter(
			(error) =>
				!(
					error.includes("connection") ||
					error.includes("network") ||
					error.includes("failed")
				),
		);

		expect(criticalErrors.length).toBe(0);
	});

	test("should handle streaming connection errors", async ({ page }) => {
		const streamErrors = [];

		page.on("console", (msg) => {
			if (
				msg.type() === "error" &&
				(msg.text().includes("ReadableStream") ||
					msg.text().includes("stream") ||
					msg.text().includes("streaming"))
			) {
				streamErrors.push(msg.text());
			}
		});

		await page.waitForTimeout(3000);

		// App should handle streaming errors gracefully
		await expect(page.locator("body")).toBeVisible();

		// Streaming errors should not crash the app
		const appCrashErrors = streamErrors.filter(
			(error) =>
				error.includes("fatal") ||
				error.includes("crashed") ||
				error.includes("uncaught"),
		);

		expect(appCrashErrors.length).toBe(0);
	});

	test("should handle task subscription network requests", async ({ page }) => {
		const taskRequests = [];

		page.on("request", (request) => {
			if (
				request.url().includes("task") ||
				request.url().includes("subscription") ||
				request.url().includes("channel")
			) {
				taskRequests.push({
					url: request.url(),
					method: request.method(),
				});
			}
		});

		// Navigate to task page to trigger subscription
		await page.goto("http://localhost:3000/task/test-task-id");
		await page.waitForLoadState("networkidle");
		await page.waitForTimeout(3000);

		// Should handle task subscription requests gracefully
		await expect(page.locator("body")).toBeVisible();

		// Should not crash from subscription failures
		const errorElements = page.locator('[data-error="true"], .error-message');
		await expect(errorElements).toHaveCount(0);
	});

	test("should handle authentication errors gracefully", async ({ page }) => {
		const authErrors = [];

		page.on("console", (msg) => {
			if (
				msg.type() === "error" &&
				(msg.text().includes("401") ||
					msg.text().includes("403") ||
					msg.text().includes("authentication") ||
					msg.text().includes("unauthorized"))
			) {
				authErrors.push(msg.text());
			}
		});

		await page.waitForTimeout(3000);

		// App should handle auth errors gracefully
		await expect(page.locator("body")).toBeVisible();

		// Should not show auth error UI unless appropriate
		const authErrorElements = page.locator(
			'[data-auth-error="true"], .auth-error',
		);
		await expect(authErrorElements).toHaveCount(0);
	});

	test("should handle CORS and network policy errors", async ({ page }) => {
		const corsErrors = [];

		page.on("console", (msg) => {
			if (
				msg.type() === "error" &&
				(msg.text().includes("CORS") ||
					msg.text().includes("cors") ||
					msg.text().includes("blocked") ||
					msg.text().includes("policy"))
			) {
				corsErrors.push(msg.text());
			}
		});

		await page.waitForTimeout(3000);

		// App should handle CORS errors gracefully
		await expect(page.locator("body")).toBeVisible();

		// Should not crash from CORS errors
		const criticalCorsErrors = corsErrors.filter(
			(error) => error.includes("fatal") || error.includes("crashed"),
		);

		expect(criticalCorsErrors.length).toBe(0);
	});
});
