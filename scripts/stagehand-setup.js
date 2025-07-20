#!/usr/bin/env node

/**
 * Stagehand AI Testing Setup Script
 * Helps configure and validate Stagehand AI testing environment
 */

const fs = require("node:fs").promises;
const path = require("node:path");
const { execSync } = require("node:child_process");

class StagehandSetup {
	constructor() {
		this.projectRoot = process.cwd();
		this.envPath = path.join(this.projectRoot, ".env");
		this.exampleEnvPath = path.join(this.projectRoot, ".env.example");
		this.configPath = path.join(this.projectRoot, "stagehand.config.ts");
		this.testDir = path.join(this.projectRoot, "tests", "e2e");
	}

	async run() {
		try {
			await this.checkPrerequisites();
			await this.setupEnvironment();
			await this.validateConfiguration();
			await this.setupDirectories();
			await this.runValidationTests();
			await this.displayUsageInstructions();
		} catch (_error) {
			process.exit(1);
		}
	}

	async checkPrerequisites() {
		// Check if Node.js version is compatible
		const nodeVersion = process.version;
		const majorVersion = Number.parseInt(
			nodeVersion.split(".")[0].substring(1),
			10,
		);

		if (majorVersion < 18) {
			throw new Error(`Node.js 18+ required. Current version: ${nodeVersion}`);
		}

		// Check if required packages are installed
		const requiredPackages = [
			"@browserbasehq/stagehand",
			"@playwright/test",
			"zod",
		];

		const packageJson = JSON.parse(
			await fs.readFile(path.join(this.projectRoot, "package.json"), "utf8"),
		);
		const allDeps = {
			...packageJson.dependencies,
			...packageJson.devDependencies,
		};

		const missingPackages = requiredPackages.filter((pkg) => !allDeps[pkg]);

		if (missingPackages.length > 0) {
			try {
				execSync(`npm install ${missingPackages.join(" ")}`, {
					stdio: "inherit",
				});
			} catch (_error) {
				throw new Error(
					`Failed to install packages: ${missingPackages.join(", ")}`,
				);
			}
		}
	}

	async setupEnvironment() {
		// Check if .env exists
		let envExists = false;
		try {
			await fs.access(this.envPath);
			envExists = true;
		} catch {
			// .env doesn't exist
		}

		if (!envExists) {
			// Copy from .env.example if it exists
			try {
				await fs.access(this.exampleEnvPath);
				await fs.copyFile(this.exampleEnvPath, this.envPath);
			} catch {
				// Create minimal .env
				const minimalEnv = `# Stagehand AI Testing Configuration
OPENAI_API_KEY=your_openai_api_key_here
STAGEHAND_DEBUG=true
DEBUG_DOM=false
VERBOSE=false

# Optional: Browserbase for cloud testing
BROWSERBASE_API_KEY=your_browserbase_api_key
BROWSERBASE_PROJECT_ID=your_browserbase_project_id
`;
				await fs.writeFile(this.envPath, minimalEnv);
			}
		}

		// Check for required environment variables
		const envContent = await fs.readFile(this.envPath, "utf8");
		const hasOpenAI =
			envContent.includes("OPENAI_API_KEY=") &&
			!envContent.includes("OPENAI_API_KEY=your_openai_api_key_here");

		if (!hasOpenAI) {
		}
	}

	async validateConfiguration() {
		// Check if stagehand.config.ts exists
		try {
			await fs.access(this.configPath);
		} catch {
			throw new Error(
				"stagehand.config.ts not found. Please ensure it exists in the project root.",
			);
		}

		// Validate configuration syntax
		try {
			const _config = require(this.configPath);
		} catch (error) {
			throw new Error(`Configuration validation failed: ${error.message}`);
		}

		// Check playwright configuration
		const playwrightConfigPath = path.join(
			this.projectRoot,
			"playwright.config.ts",
		);
		try {
			await fs.access(playwrightConfigPath);
		} catch {}
	}

	async setupDirectories() {
		const directories = [
			path.join(this.testDir, "screenshots"),
			path.join(this.testDir, "screenshots", "visual-regression"),
			path.join(this.testDir, "screenshots", "baselines"),
			path.join(this.testDir, "fixtures"),
			path.join(this.testDir, "page-objects"),
			path.join(this.testDir, "helpers"),
		];

		for (const dir of directories) {
			try {
				await fs.access(dir);
			} catch {
				await fs.mkdir(dir, { recursive: true });
			}
		}
	}

	async runValidationTests() {
		// Create a simple validation test
		const validationTest = `
import { test, expect } from '@playwright/test'

test('Stagehand setup validation', async ({ page }) => {
  // Test basic page navigation
  await page.goto('https://example.com')
  
  // Test basic functionality
  const title = await page.title()
  expect(title).toBeTruthy()
  
  console.log('✅ Basic Playwright functionality working')
})
`;

		const validationTestPath = path.join(this.testDir, "validation.spec.ts");
		await fs.writeFile(validationTestPath, validationTest);

		try {
			execSync("npx playwright test validation.spec.ts", {
				cwd: this.projectRoot,
				stdio: "pipe",
			});
		} catch (_error) {}

		// Clean up validation test
		try {
			await fs.unlink(validationTestPath);
		} catch {
			// Ignore cleanup errors
		}
	}

	async displayUsageInstructions() {}
}

// Check if running as a script
if (require.main === module) {
	const setup = new StagehandSetup();
	setup.run().catch(console.error);
}

module.exports = StagehandSetup;
