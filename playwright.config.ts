import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
	testDir: "./tests/e2e",
	timeout: 30 * 1000,
	expect: {
		timeout: 5000,
	},
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	workers: process.env.CI ? 1 : undefined,
	reporter: [
		["html", { outputFolder: "playwright-report" }],
		["json", { outputFile: "playwright-report/results.json" }],
		["junit", { outputFile: "playwright-report/results.xml" }],
		["github"],
	],
	use: {
		baseURL: "http://localhost:3000",
		trace: "on-first-retry",
		screenshot: "only-on-failure",
		video: "retain-on-failure",
		actionTimeout: 10_000,
		navigationTimeout: 30_000,
	},
	projects: [
		{
			name: "setup",
			testMatch: /.*\.setup\.ts/,
		},
		{
			name: "chromium",
			use: { ...devices["Desktop Chrome"] },
			dependencies: ["setup"],
		},
		{
			name: "firefox",
			use: { ...devices["Desktop Firefox"] },
			dependencies: ["setup"],
		},
		{
			name: "webkit",
			use: { ...devices["Desktop Safari"] },
			dependencies: ["setup"],
		},
		{
			name: "Mobile Chrome",
			use: { ...devices["Pixel 5"] },
			dependencies: ["setup"],
		},
		{
			name: "Mobile Safari",
			use: { ...devices["iPhone 12"] },
			dependencies: ["setup"],
		},
	],
	webServer: {
		command: "bun run dev",
		url: "http://localhost:3000",
		reuseExistingServer: !process.env.CI,
		timeout: 120_000,
	},
});
