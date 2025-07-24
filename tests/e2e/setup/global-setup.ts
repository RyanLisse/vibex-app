import type { FullConfig } from "@playwright/test";
import fs from "fs";
import path from "path";

/**
 * Global Setup for Consolidated E2E Testing Framework
 *
 * Prepares environment for both standard Playwright and AI-powered Stagehand tests
 */
async function globalSetup(config: FullConfig) {
	console.log("🚀 Setting up consolidated E2E testing environment...");

	// Create necessary directories
	const dirs = [
		"tests/e2e/screenshots",
		"tests/e2e/screenshots/baselines",
		"tests/e2e/screenshots/visual-regression",
		"test-results",
		"playwright-report",
	];

	for (const dir of dirs) {
		const fullPath = path.join(process.cwd(), dir);
		if (!fs.existsSync(fullPath)) {
			fs.mkdirSync(fullPath, { recursive: true });
			console.log(`📁 Created directory: ${dir}`);
		}
	}

	// Check for Stagehand API key
	const hasApiKey = !!(process.env.OPENAI_API_KEY || process.env.STAGEHAND_API_KEY);
	if (hasApiKey) {
		console.log("✅ Stagehand API key detected - AI-powered tests will be fully functional");
	} else {
		console.warn("⚠️  No OpenAI API key found. Stagehand AI features will use mock data.");
		console.warn(
			"   Set OPENAI_API_KEY or STAGEHAND_API_KEY environment variable for full AI testing."
		);
	}

	// Log configuration details
	console.log(`🔧 Test directory: ${config.projects[0]?.testDir || "tests/e2e"}`);
	console.log(`🌐 Base URL: ${config.projects[0]?.use?.baseURL || "http://localhost:3000"}`);
	console.log(`🔄 Workers: ${config.workers}`);
	console.log(`🎯 Projects: ${config.projects.map((p) => p.name).join(", ")}`);

	if (process.env.STAGEHAND_DEBUG) {
		console.log("🐛 Stagehand debug mode enabled");
	}

	console.log("✅ E2E testing environment setup complete!");
}

export default globalSetup;
