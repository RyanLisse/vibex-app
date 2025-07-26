#!/usr/bin/env node

const { execSync } = require("child_process");
const { readdirSync, statSync } = require("fs");
const { join } = require("path");

// Function to find all test files
function findTestFiles(dir, files = []) {
	const items = readdirSync(dir);

	for (const item of items) {
		const path = join(dir, item);

		// Skip certain directories
		if (
			item === "node_modules" ||
			item === ".next" ||
			item === "dist" ||
			item === "coverage" ||
			item === ".git"
		) {
			continue;
		}

		const stat = statSync(path);

		if (stat.isDirectory()) {
			findTestFiles(path, files);
		} else if (item.match(/\.(test|spec)\.(js|jsx|ts|tsx)$/)) {
			files.push(path);
		}
	}

	return files;
}

// Run tests in batches
async function runTestsBatched() {
	console.log("🔍 Finding test files...");
	const testFiles = findTestFiles(".");
	console.log(`📊 Found ${testFiles.length} test files`);

	const batchSize = 10;
	const batches = [];

	for (let i = 0; i < testFiles.length; i += batchSize) {
		batches.push(testFiles.slice(i, i + batchSize));
	}

	console.log(`📦 Running tests in ${batches.length} batches of ${batchSize} files each`);

	let totalPassed = 0;
	let totalFailed = 0;
	const failedFiles = [];

	for (let i = 0; i < batches.length; i++) {
		const batch = batches[i];
		console.log(`\n🚀 Running batch ${i + 1}/${batches.length} (${batch.length} files)...`);

		try {
			const result = execSync(`npx vitest run ${batch.join(" ")} --reporter=json`, {
				encoding: "utf8",
				stdio: "pipe",
			});

			try {
				const json = JSON.parse(result);
				const passed = json.numPassedTests || 0;
				const failed = json.numFailedTests || 0;
				totalPassed += passed;
				totalFailed += failed;

				if (failed > 0) {
					failedFiles.push(...batch);
				}
			} catch (e) {
				console.log(`✅ Batch ${i + 1} completed`);
			}
		} catch (error) {
			console.log(`❌ Batch ${i + 1} had errors`);
			failedFiles.push(...batch);
			totalFailed += batch.length;
		}
	}

	console.log("\n📊 Test Summary:");
	console.log(`✅ Passed: ${totalPassed}`);
	console.log(`❌ Failed: ${totalFailed}`);

	if (failedFiles.length > 0) {
		console.log("\n❌ Failed files:");
		failedFiles.forEach((file) => console.log(`  - ${file}`));
	}

	process.exit(totalFailed > 0 ? 1 : 0);
}

// Run the script
runTestsBatched().catch(console.error);
