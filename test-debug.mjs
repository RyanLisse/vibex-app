#!/usr/bin/env node

/**
 * Debug script to test Vitest configuration
 */

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";

console.log("🔍 Testing Vitest Configuration...\n");

// Test 1: Skip vitest import test (causes issues in ES modules)
console.log("1. Skipping Vitest import test...\n");

// Test 2: Check if config files exist
console.log("2. Checking config files...");

const configFiles = [
	"vitest.config.ts",
	"vitest.unit.config.ts",
	"vitest.integration.config.ts",
	"vitest-setup.js",
];

configFiles.forEach((file) => {
	if (existsSync(file)) {
		console.log(`✅ ${file} exists`);
	} else {
		console.log(`❌ ${file} missing`);
	}
});

console.log("\n3. Testing simple vitest command...");

// Test 3: Run a simple vitest command
const vitestProcess = spawn("bunx", ["vitest", "--version"], {
	stdio: "pipe",
	cwd: process.cwd(),
});

let output = "";
let errorOutput = "";

vitestProcess.stdout.on("data", (data) => {
	output += data.toString();
});

vitestProcess.stderr.on("data", (data) => {
	errorOutput += data.toString();
});

vitestProcess.on("close", (code) => {
	if (code === 0) {
		console.log("✅ Vitest version:", output.trim());
		console.log("\n4. Testing config validation...");

		// Test 4: Validate config
		const configTest = spawn(
			"bunx",
			["vitest", "--config=vitest.unit.config.ts", "--reporter=verbose", "--run", "--no-coverage"],
			{
				stdio: "pipe",
				cwd: process.cwd(),
				timeout: 10000,
			}
		);

		let configOutput = "";
		let configError = "";

		configTest.stdout.on("data", (data) => {
			configOutput += data.toString();
		});

		configTest.stderr.on("data", (data) => {
			configError += data.toString();
		});

		configTest.on("close", (configCode) => {
			console.log("\n📊 Config Test Results:");
			console.log("Exit code:", configCode);

			if (configOutput) {
				console.log("\n📤 Output:");
				console.log(configOutput);
			}

			if (configError) {
				console.log("\n❌ Errors:");
				console.log(configError);
			}

			if (configCode === 0) {
				console.log("\n✅ Configuration appears to be working!");
			} else {
				console.log("\n❌ Configuration has issues that need to be resolved.");
			}
		});

		// Kill the process after timeout
		setTimeout(() => {
			if (!configTest.killed) {
				console.log("\n⏰ Config test timed out, killing process...");
				configTest.kill("SIGTERM");
			}
		}, 15000);
	} else {
		console.log("❌ Vitest version check failed:", errorOutput);
		process.exit(1);
	}
});

vitestProcess.on("error", (error) => {
	console.log("❌ Failed to start vitest:", error.message);
	process.exit(1);
});
