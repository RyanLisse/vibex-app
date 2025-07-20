import { chromium, type FullConfig } from "@playwright/test";

async function globalSetup(config: FullConfig) {
	console.log("Starting global setup...");

	// Skip webserver health check if running in CI or specific mode
	if (process.env.CI || process.env.SKIP_SERVER_CHECK) {
		console.log("Skipping server health check");
		return;
	}

	// Try to check if server is running
	const browser = await chromium.launch();
	const page = await browser.newPage();

	try {
		await page.goto("http://localhost:3000", { timeout: 5000 });
		console.log("Server is running");
	} catch (error) {
		console.warn("Server not reachable, tests may fail");
	} finally {
		await browser.close();
	}
}

export default globalSetup;
