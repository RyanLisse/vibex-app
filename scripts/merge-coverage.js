#!/usr/bin/env node

/**
 * Coverage Merge Script
 * Combines coverage reports from Bun (logic tests) and Vitest (component tests)
 * into a unified coverage report
 */

const fs = require("fs");
const path = require("path");

// Coverage directories
const COVERAGE_DIRS = {
	bun: "./coverage/bun-logic",
	vitest: "./coverage/vitest-components",
	integration: "./coverage/vitest-integration",
	merged: "./coverage/merged",
};

// Coverage files to merge
const COVERAGE_FILES = {
	lcov: "lcov.info",
	json: "coverage-final.json",
};

/**
 * Check if a directory exists
 */
function dirExists(dirPath) {
	try {
		return fs.statSync(dirPath).isDirectory();
	} catch (error) {
		return false;
	}
}

/**
 * Check if a file exists
 */
function fileExists(filePath) {
	try {
		return fs.statSync(filePath).isFile();
	} catch (error) {
		return false;
	}
}

/**
 * Create directory if it doesn't exist
 */
function ensureDir(dirPath) {
	if (!dirExists(dirPath)) {
		fs.mkdirSync(dirPath, { recursive: true });
		console.log(`✓ Created directory: ${dirPath}`);
	}
}

/**
 * Read LCOV file and return content
 */
function readLcovFile(filePath) {
	if (!fileExists(filePath)) {
		console.warn(`⚠ LCOV file not found: ${filePath}`);
		return "";
	}

	try {
		const content = fs.readFileSync(filePath, "utf8");
		console.log(`✓ Read LCOV file: ${filePath}`);
		return content;
	} catch (error) {
		console.error(`✗ Error reading LCOV file ${filePath}:`, error.message);
		return "";
	}
}

/**
 * Read JSON coverage file and return parsed content
 */
function readJsonCoverage(filePath) {
	if (!fileExists(filePath)) {
		console.warn(`⚠ JSON coverage file not found: ${filePath}`);
		return {};
	}

	try {
		const content = fs.readFileSync(filePath, "utf8");
		const parsed = JSON.parse(content);
		console.log(`✓ Read JSON coverage: ${filePath}`);
		return parsed;
	} catch (error) {
		console.error(`✗ Error reading JSON coverage ${filePath}:`, error.message);
		return {};
	}
}

/**
 * Merge LCOV files
 */
function mergeLcovFiles() {
	console.log("\n📊 Merging LCOV files...");

	const lcovContents = [];

	// Read Bun coverage
	const bunLcov = readLcovFile(
		path.join(COVERAGE_DIRS.bun, COVERAGE_FILES.lcov),
	);
	if (bunLcov) {
		lcovContents.push("# Bun Logic Tests Coverage");
		lcovContents.push(bunLcov);
	}

	// Read Vitest component coverage
	const vitestLcov = readLcovFile(
		path.join(COVERAGE_DIRS.vitest, COVERAGE_FILES.lcov),
	);
	if (vitestLcov) {
		lcovContents.push("# Vitest Component Tests Coverage");
		lcovContents.push(vitestLcov);
	}

	// Read Vitest integration coverage
	const integrationLcov = readLcovFile(
		path.join(COVERAGE_DIRS.integration, COVERAGE_FILES.lcov),
	);
	if (integrationLcov) {
		lcovContents.push("# Vitest Integration Tests Coverage");
		lcovContents.push(integrationLcov);
	}

	if (lcovContents.length === 0) {
		console.warn("⚠ No LCOV files found to merge");
		return false;
	}

	// Write merged LCOV file
	const mergedLcov = lcovContents.join("\n\n");
	const outputPath = path.join(COVERAGE_DIRS.merged, COVERAGE_FILES.lcov);

	try {
		fs.writeFileSync(outputPath, mergedLcov);
		console.log(`✓ Merged LCOV written to: ${outputPath}`);
		return true;
	} catch (error) {
		console.error("✗ Error writing merged LCOV:", error.message);
		return false;
	}
}

/**
 * Merge JSON coverage files
 */
function mergeJsonCoverage() {
	console.log("\n📊 Merging JSON coverage files...");

	const mergedCoverage = {};

	// Read Bun coverage
	const bunCoverage = readJsonCoverage(
		path.join(COVERAGE_DIRS.bun, COVERAGE_FILES.json),
	);
	Object.assign(mergedCoverage, bunCoverage);

	// Read Vitest component coverage
	const vitestCoverage = readJsonCoverage(
		path.join(COVERAGE_DIRS.vitest, COVERAGE_FILES.json),
	);
	Object.assign(mergedCoverage, vitestCoverage);

	// Read Vitest integration coverage
	const integrationCoverage = readJsonCoverage(
		path.join(COVERAGE_DIRS.integration, COVERAGE_FILES.json),
	);
	Object.assign(mergedCoverage, integrationCoverage);

	if (Object.keys(mergedCoverage).length === 0) {
		console.warn("⚠ No JSON coverage files found to merge");
		return false;
	}

	// Write merged JSON coverage
	const outputPath = path.join(COVERAGE_DIRS.merged, COVERAGE_FILES.json);

	try {
		fs.writeFileSync(outputPath, JSON.stringify(mergedCoverage, null, 2));
		console.log(`✓ Merged JSON coverage written to: ${outputPath}`);
		return true;
	} catch (error) {
		console.error("✗ Error writing merged JSON coverage:", error.message);
		return false;
	}
}

/**
 * Generate coverage summary
 */
function generateCoverageSummary() {
	console.log("\n📈 Generating coverage summary...");

	const summaryPath = path.join(COVERAGE_DIRS.merged, "summary.txt");
	const summary = [];

	summary.push("# Hybrid Testing Framework Coverage Summary");
	summary.push(`Generated: ${new Date().toISOString()}`);
	summary.push("");

	// Check which coverage reports exist
	const reports = [];

	if (dirExists(COVERAGE_DIRS.bun)) {
		reports.push("✓ Bun Logic Tests Coverage");
	}

	if (dirExists(COVERAGE_DIRS.vitest)) {
		reports.push("✓ Vitest Component Tests Coverage");
	}

	if (dirExists(COVERAGE_DIRS.integration)) {
		reports.push("✓ Vitest Integration Tests Coverage");
	}

	if (reports.length > 0) {
		summary.push("## Coverage Reports Merged:");
		summary.push(...reports);
		summary.push("");
	}

	summary.push("## Coverage Files:");
	summary.push(
		`- LCOV: ${path.join(COVERAGE_DIRS.merged, COVERAGE_FILES.lcov)}`,
	);
	summary.push(
		`- JSON: ${path.join(COVERAGE_DIRS.merged, COVERAGE_FILES.json)}`,
	);
	summary.push("");

	summary.push("## Usage:");
	summary.push("- View HTML report: open coverage/merged/index.html");
	summary.push("- Upload to coverage services using lcov.info");
	summary.push("- Use coverage-final.json for programmatic analysis");

	try {
		fs.writeFileSync(summaryPath, summary.join("\n"));
		console.log(`✓ Coverage summary written to: ${summaryPath}`);
		return true;
	} catch (error) {
		console.error("✗ Error writing coverage summary:", error.message);
		return false;
	}
}

/**
 * Main function
 */
function main() {
	console.log("🔄 Starting coverage merge process...");

	// Ensure merged directory exists
	ensureDir(COVERAGE_DIRS.merged);

	// Check if any coverage directories exist
	const hasAnyCoverage = Object.values(COVERAGE_DIRS)
		.slice(0, -1) // Exclude merged directory
		.some((dir) => dirExists(dir));

	if (!hasAnyCoverage) {
		console.error(
			"✗ No coverage directories found. Run tests with coverage first.",
		);
		console.log("\nTo generate coverage:");
		console.log("  bun run test:unit:logic:coverage");
		console.log("  bun run test:unit:components:coverage");
		console.log("  bun run test:integration:coverage");
		process.exit(1);
	}

	// Merge coverage files
	const lcovMerged = mergeLcovFiles();
	const jsonMerged = mergeJsonCoverage();

	if (!(lcovMerged || jsonMerged)) {
		console.error("✗ No coverage files could be merged");
		process.exit(1);
	}

	// Generate summary
	generateCoverageSummary();

	console.log("\n✅ Coverage merge completed successfully!");
	console.log(`📁 Merged coverage available in: ${COVERAGE_DIRS.merged}`);

	// Show next steps
	console.log("\n📋 Next steps:");
	if (fileExists(path.join(COVERAGE_DIRS.merged, "index.html"))) {
		console.log(
			`  📊 View HTML report: open ${path.join(COVERAGE_DIRS.merged, "index.html")}`,
		);
	}
	console.log(
		`  📄 LCOV file: ${path.join(COVERAGE_DIRS.merged, COVERAGE_FILES.lcov)}`,
	);
	console.log(
		`  📊 JSON file: ${path.join(COVERAGE_DIRS.merged, COVERAGE_FILES.json)}`,
	);
}

// Run the script
if (require.main === module) {
	main();
}

module.exports = {
	mergeLcovFiles,
	mergeJsonCoverage,
	generateCoverageSummary,
	COVERAGE_DIRS,
	COVERAGE_FILES,
};
