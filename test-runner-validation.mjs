#!/usr/bin/env node

/**
 * Test Runner Validation Script
 * 
 * This script validates that our test infrastructure fixes are working
 * by running specific test files and checking the results.
 */

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";

console.log("🧪 Validating Test Infrastructure Fixes...\n");

// Test files to validate
const testFiles = [
	{
		name: "Utils Test (Basic)",
		file: "lib/utils.test.ts",
		config: "vitest.unit.config.ts",
		timeout: 15000,
	},
	{
		name: "QuickBugReportButton Test",
		file: "components/features/bug-reporting/quick-bug-report-button.test.tsx",
		config: "vitest.unit.config.ts",
		timeout: 20000,
	},
	{
		name: "KanbanBoard Test",
		file: "components/features/kanban/kanban-board.test.tsx",
		config: "vitest.unit.config.ts",
		timeout: 20000,
	},
	{
		name: "VoiceRecorder Test",
		file: "components/features/voice-tasks/voice-recorder.test.tsx",
		config: "vitest.unit.config.ts",
		timeout: 20000,
	},
];

async function runTest(testConfig) {
	return new Promise((resolve) => {
		console.log(`📋 Running: ${testConfig.name}`);
		console.log(`   File: ${testConfig.file}`);
		console.log(`   Config: ${testConfig.config}`);

		// Check if test file exists
		if (!existsSync(testConfig.file)) {
			console.log(`   ❌ Test file not found: ${testConfig.file}\n`);
			resolve({
				name: testConfig.name,
				success: false,
				error: "Test file not found",
				output: "",
			});
			return;
		}

		const startTime = Date.now();
		const testProcess = spawn(
			"bunx",
			[
				"vitest",
				"run",
				`--config=${testConfig.config}`,
				testConfig.file,
				"--reporter=verbose",
				"--no-coverage",
			],
			{
				stdio: "pipe",
				cwd: process.cwd(),
			}
		);

		let output = "";
		let errorOutput = "";

		testProcess.stdout.on("data", (data) => {
			output += data.toString();
		});

		testProcess.stderr.on("data", (data) => {
			errorOutput += data.toString();
		});

		// Set timeout
		const timeout = setTimeout(() => {
			if (!testProcess.killed) {
				console.log(`   ⏰ Test timed out after ${testConfig.timeout}ms`);
				testProcess.kill("SIGTERM");
			}
		}, testConfig.timeout);

		testProcess.on("close", (code) => {
			clearTimeout(timeout);
			const duration = Date.now() - startTime;
			const success = code === 0;

			console.log(`   ${success ? "✅" : "❌"} ${success ? "PASSED" : "FAILED"} (${duration}ms)`);
			
			if (!success && errorOutput) {
				console.log(`   Error: ${errorOutput.slice(0, 200)}...`);
			}
			
			console.log("");

			resolve({
				name: testConfig.name,
				success,
				code,
				duration,
				output: output + errorOutput,
				error: errorOutput,
			});
		});

		testProcess.on("error", (error) => {
			clearTimeout(timeout);
			console.log(`   ❌ Process error: ${error.message}\n`);
			resolve({
				name: testConfig.name,
				success: false,
				error: error.message,
				output: "",
			});
		});
	});
}

async function validateInfrastructure() {
	console.log("🔧 Checking configuration files...");
	
	const configFiles = [
		"vitest.config.ts",
		"vitest.unit.config.ts",
		"vitest.integration.config.ts",
		"vitest-setup.js",
	];

	let allConfigsExist = true;
	configFiles.forEach((file) => {
		if (existsSync(file)) {
			console.log(`   ✅ ${file}`);
		} else {
			console.log(`   ❌ ${file} missing`);
			allConfigsExist = false;
		}
	});

	if (!allConfigsExist) {
		console.log("\n❌ Configuration files missing. Cannot proceed with tests.\n");
		return;
	}

	console.log("\n🚀 Running test validation...\n");

	const results = [];
	for (const testConfig of testFiles) {
		const result = await runTest(testConfig);
		results.push(result);
	}

	// Summary
	console.log("📊 Test Validation Summary");
	console.log("=" .repeat(50));

	const passed = results.filter((r) => r.success).length;
	const failed = results.filter((r) => !r.success).length;

	console.log(`Total Tests: ${results.length}`);
	console.log(`Passed: ${passed}`);
	console.log(`Failed: ${failed}`);
	console.log(`Success Rate: ${Math.round((passed / results.length) * 100)}%`);

	console.log("\nDetailed Results:");
	results.forEach((result) => {
		const status = result.success ? "✅ PASS" : "❌ FAIL";
		const duration = result.duration ? `(${result.duration}ms)` : "";
		console.log(`  ${status} ${result.name} ${duration}`);
		
		if (!result.success && result.error) {
			console.log(`    Error: ${result.error.slice(0, 100)}...`);
		}
	});

	console.log("\n" + "=".repeat(50));
	
	if (passed === results.length) {
		console.log("🎉 All tests passed! Infrastructure is working correctly.");
	} else if (passed > 0) {
		console.log("⚠️  Some tests passed. Infrastructure is partially working.");
	} else {
		console.log("❌ No tests passed. Infrastructure needs more work.");
	}

	console.log("\n💡 Next Steps:");
	if (failed > 0) {
		console.log("- Fix remaining test failures");
		console.log("- Check component interfaces and imports");
		console.log("- Validate mock configurations");
	} else {
		console.log("- Proceed with comprehensive test suite execution");
		console.log("- Run integration and e2e tests");
		console.log("- Set up CI/CD pipeline");
	}
}

// Run validation
validateInfrastructure().catch((error) => {
	console.error("❌ Validation failed:", error);
	process.exit(1);
});
