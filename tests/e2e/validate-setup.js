#!/usr/bin/env node

/**
 * Validation script for E2E testing setup
 */

const fs = require("node:fs");
const _path = require("node:path");

// Check if required files exist
const requiredFiles = [
	"playwright.config.ts",
	"tests/e2e/fixtures/base.fixture.ts",
	"tests/e2e/stagehand.config.ts",
	"tests/e2e/page-objects/base.page.ts",
	"tests/e2e/page-objects/home.page.ts",
	"tests/e2e/page-objects/environments.page.ts",
	"tests/e2e/page-objects/task.page.ts",
	"tests/e2e/specs/home.spec.ts",
	"tests/e2e/specs/environments.spec.ts",
	"tests/e2e/specs/task.spec.ts",
	"tests/e2e/specs/integration.spec.ts",
	"tests/e2e/example.spec.ts",
	"tests/e2e/helpers/test-utils.ts",
	"tests/e2e/README.md",
];

const requiredDirectories = [
	"tests/e2e/fixtures",
	"tests/e2e/page-objects",
	"tests/e2e/specs",
	"tests/e2e/helpers",
	"tests/e2e/screenshots",
];

let allFilesExist = true;
let allDirectoriesExist = true;
requiredDirectories.forEach((dir) => {
	if (fs.existsSync(dir)) {
	} else {
		allDirectoriesExist = false;
	}
});
requiredFiles.forEach((file) => {
	if (fs.existsSync(file)) {
	} else {
		allFilesExist = false;
	}
});
const packageJsonPath = "package.json";
if (fs.existsSync(packageJsonPath)) {
	const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));

	const requiredDeps = ["@playwright/test", "playwright", "stagehand"];

	requiredDeps.forEach((dep) => {
		if (packageJson.dependencies?.[dep] || packageJson.devDependencies?.[dep]) {
		} else {
			allFilesExist = false;
		}
	});
	const requiredScripts = ["test:e2e", "test:e2e:headed", "test:e2e:debug"];

	requiredScripts.forEach((script) => {
		if (packageJson.scripts?.[script]) {
		} else {
			allFilesExist = false;
		}
	});
} else {
	allFilesExist = false;
}
const envFiles = [".env.local", ".env"];
let hasEnvFile = false;

envFiles.forEach((envFile) => {
	if (fs.existsSync(envFile)) {
		hasEnvFile = true;

		// Check for OpenAI API key
		const envContent = fs.readFileSync(envFile, "utf8");
		if (envContent.includes("OPENAI_API_KEY")) {
		} else {
		}
	}
});

if (!hasEnvFile) {
}

if (allFilesExist && allDirectoriesExist) {
} else {
	process.exit(1);
}
try {
	// Check if playwright.config.ts is valid
	const playwrightConfig = fs.readFileSync("playwright.config.ts", "utf8");
	if (playwrightConfig.includes("testDir: './tests/e2e'")) {
	} else {
	}

	// Check if stagehand config exists
	const stagehandConfig = fs.readFileSync("tests/e2e/stagehand.config.ts", "utf8");
	if (stagehandConfig.includes("OPENAI_API_KEY")) {
	} else {
	}
} catch (_error) {}
