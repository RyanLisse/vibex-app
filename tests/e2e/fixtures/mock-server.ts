import type { Page } from "@playwright/test";
import { test as base } from "@playwright/test";

// Define fixtures with mock server capabilities
type Fixtures = {
	mockPage: Page;
};

export const test = base.extend<Fixtures>({
	mockPage: async ({ page }, use) => {
		// Intercept all requests to localhost:3000 and provide mock responses
		await page.route("**/*", async (route) => {
			const url = route.request().url();

			if (url === "http://localhost:3000/" || url === "http://localhost:3000") {
				// Mock the home page response
				await route.fulfill({
					status: 200,
					contentType: "text/html",
					body: `
            <!DOCTYPE html>
            <html lang="en">
              <head>
                <title>VibeX - OpenAI Codex clone</title>
              </head>
              <body>
                <div class="flex flex-col px-4 py-2 h-screen">
                  <h1>VibeX</h1>
                  <a href="/">Home</a>
                  <a href="/environments">Environments</a>
                  <form></form>
                </div>
              </body>
            </html>
          `,
				});
			} else if (url.includes("/api/")) {
				// Mock API responses
				await route.fulfill({
					status: 200,
					contentType: "application/json",
					body: JSON.stringify({ success: true }),
				});
			} else {
				// Let other requests pass through
				await route.continue();
			}
		});

		await use(page);
	},
});
