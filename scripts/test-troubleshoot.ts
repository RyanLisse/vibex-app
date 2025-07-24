#!/usr/bin/env bun

/**
 * Test Troubleshooting Script
 *
 * Diagnoses and fixes common test issues
 */

import { execSync } from "child_process";
import { existsSync, readFileSync, writeFileSync } from "fs";
import path from "path";

const issues: Array<{
	name: string;
	check: () => boolean;
	fix: () => void;
	description: string;
}> = [
	{
		name: "Bun lock file conflicts",
		description: "Conflicting dependencies in bun.lockb",
		check: () => {
			try {
				execSync("bun pm ls", { stdio: "pipe" });
				return false;
			} catch {
				return true;
			}
		},
		fix: () => {
			console.log("🔧 Regenerating bun lock file...");
			execSync("rm -f bun.lockb && bun install", { stdio: "inherit" });
		},
	},
	{
		name: "Node modules corruption",
		description: "Corrupted or incompatible modules",
		check: () => {
			const problematicModules = [
				"node_modules/.vitest",
				"node_modules/.vite",
				"node_modules/.cache",
			];
			return problematicModules.some(existsSync);
		},
		fix: () => {
			console.log("🔧 Cleaning cache directories...");
			execSync("rm -rf node_modules/.vitest node_modules/.vite node_modules/.cache", {
				stdio: "inherit",
			});
		},
	},
	{
		name: "Vitest cache issues",
		description: "Stale Vitest cache causing hanging",
		check: () => existsSync(".vitest"),
		fix: () => {
			console.log("🔧 Clearing Vitest cache...");
			execSync("rm -rf .vitest", { stdio: "inherit" });
		},
	},
	{
		name: "TypeScript cache conflicts",
		description: "TypeScript incremental build cache issues",
		check: () => existsSync("tsconfig.tsbuildinfo"),
		fix: () => {
			console.log("🔧 Clearing TypeScript cache...");
			execSync("rm -f tsconfig.tsbuildinfo", { stdio: "inherit" });
		},
	},
	{
		name: "Coverage data corruption",
		description: "Corrupted coverage data",
		check: () => existsSync("coverage"),
		fix: () => {
			console.log("🔧 Clearing coverage data...");
			execSync("rm -rf coverage", { stdio: "inherit" });
		},
	},
	{
		name: "Temporary test files",
		description: "Leftover temporary test files",
		check: () => {
			try {
				const tempFiles = execSync(
					'find . -name "*.test.tmp.*" -o -name "*.spec.tmp.*" 2>/dev/null',
					{
						encoding: "utf-8",
					}
				).trim();
				return tempFiles.length > 0;
			} catch {
				return false;
			}
		},
		fix: () => {
			console.log("🔧 Removing temporary test files...");
			execSync('find . -name "*.test.tmp.*" -o -name "*.spec.tmp.*" -delete 2>/dev/null || true', {
				stdio: "inherit",
			});
		},
	},
];

async function diagnose() {
	console.log("🔍 Diagnosing test environment...\n");

	const foundIssues: typeof issues = [];

	for (const issue of issues) {
		process.stdout.write(`Checking ${issue.name}... `);
		if (issue.check()) {
			console.log("❌ Issue found");
			foundIssues.push(issue);
		} else {
			console.log("✅ OK");
		}
	}

	return foundIssues;
}

async function fix(foundIssues: typeof issues) {
	if (foundIssues.length === 0) {
		console.log("\n✨ No issues found! Your test environment is healthy.");
		return;
	}

	console.log(`\n🔧 Found ${foundIssues.length} issue(s). Fixing...\n`);

	for (const issue of foundIssues) {
		console.log(`\n📋 ${issue.name}`);
		console.log(`   ${issue.description}`);
		issue.fix();
	}

	console.log("\n✅ All issues fixed!");
}

async function verifySetup() {
	console.log("\n🧪 Verifying test setup...\n");

	// Check if test configs exist
	const configs = [
		"vitest.config.working.ts",
		"vitest.components.config.ts",
		"vitest.utils.config.ts",
		"vitest.api.config.ts",
		"vitest.all.config.ts",
	];

	for (const config of configs) {
		if (existsSync(config)) {
			console.log(`✅ ${config} exists`);
		} else {
			console.log(`❌ ${config} missing`);
		}
	}

	// Run a simple test
	console.log("\n🧪 Running verification test...");
	try {
		execSync("npx vitest run --config=vitest.config.working.ts test-verification.test.tsx", {
			stdio: "inherit",
		});
		console.log("✅ Verification test passed!");
	} catch {
		console.log("❌ Verification test failed!");
	}
}

// Main execution
async function main() {
	console.log("🚀 Vitest Troubleshooting Tool\n");

	const args = process.argv.slice(2);
	const autoFix = args.includes("--fix") || args.includes("-f");

	const foundIssues = await diagnose();

	if (autoFix) {
		await fix(foundIssues);
		await verifySetup();
	} else if (foundIssues.length > 0) {
		console.log(`\n⚠️  Found ${foundIssues.length} issue(s).`);
		console.log("Run with --fix to automatically resolve them:");
		console.log("  bun run scripts/test-troubleshoot.ts --fix");
	} else {
		await verifySetup();
	}
}

main().catch(console.error);
