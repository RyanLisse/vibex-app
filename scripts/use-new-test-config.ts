#!/usr/bin/env bun

/**
 * Script to switch to the new bulletproof test configuration
 */

import { execSync } from "child_process";
import { copyFileSync, existsSync, readFileSync, renameSync, writeFileSync } from "fs";

console.log("🔄 Switching to bulletproof test configuration...\n");

// Backup current config if it exists
if (existsSync("vitest.config.ts")) {
	const backupName = `vitest.config.backup.${Date.now()}.ts`;
	console.log(`📦 Backing up current config to ${backupName}`);
	renameSync("vitest.config.ts", backupName);
}

// Copy the working config
console.log("📝 Installing bulletproof configuration...");
copyFileSync("vitest.config.working.ts", "vitest.config.ts");

// Update package.json scripts
console.log("\n📋 Updating package.json scripts...");

const scripts = {
	// Main test commands using the bulletproof config
	test: "vitest run",
	"test:watch": "vitest",
	"test:ui": "vitest --ui",

	// Specific test types
	"test:components": "vitest run --config=vitest.components.config.ts",
	"test:components:watch": "vitest --config=vitest.components.config.ts",
	"test:utils": "vitest run --config=vitest.utils.config.ts",
	"test:utils:watch": "vitest --config=vitest.utils.config.ts",
	"test:api": "vitest run --config=vitest.api.config.ts",
	"test:api:watch": "vitest --config=vitest.api.config.ts",
	"test:all": "vitest run --config=vitest.all.config.ts",

	// Coverage
	"test:coverage": "vitest run --coverage",
	"test:coverage:ui": "vitest --coverage --ui",

	// Troubleshooting
	"test:troubleshoot": "bun run scripts/test-troubleshoot.ts",
	"test:troubleshoot:fix": "bun run scripts/test-troubleshoot.ts --fix",
	"test:verify": "vitest run test-verification.test.tsx",
};

// Update scripts in package.json
try {
	const packageJson = readFileSync("package.json", "utf-8");
	const pkg = JSON.parse(packageJson);

	// Merge with existing scripts
	pkg.scripts = {
		...pkg.scripts,
		...scripts,
	};

	// Write back
	writeFileSync("package.json", JSON.stringify(pkg, null, 2) + "\n");
	console.log("✅ Updated package.json scripts");
} catch (error) {
	console.error("❌ Failed to update package.json:", error);
}

// Run troubleshoot to ensure clean state
console.log("\n🔧 Running troubleshoot to ensure clean state...");
execSync("bun run scripts/test-troubleshoot.ts --fix", { stdio: "inherit" });

// Run verification test
console.log("\n🧪 Running verification test...");
try {
	execSync("vitest run test-verification.test.tsx", { stdio: "inherit" });
	console.log("\n✅ Configuration successfully installed and verified!");
	console.log("\n📚 Available commands:");
	console.log("  bun test                    - Run all tests");
	console.log("  bun test:watch              - Run tests in watch mode");
	console.log("  bun test:ui                 - Run tests with UI");
	console.log("  bun test:components         - Run component tests only");
	console.log("  bun test:utils              - Run utility tests only");
	console.log("  bun test:api                - Run API tests only");
	console.log("  bun test:coverage           - Run tests with coverage");
	console.log("  bun test:troubleshoot       - Diagnose test issues");
	console.log("  bun test:troubleshoot:fix   - Fix test issues automatically");
} catch {
	console.error("\n❌ Verification failed. Run 'bun test:troubleshoot:fix' to diagnose.");
}
