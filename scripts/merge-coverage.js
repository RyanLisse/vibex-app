#!/usr/bin/env node

/**
 * Coverage Merge Script
 *
 * Merges coverage reports from different test runners:
 * - Bun logic tests
 * - Vitest component tests
 * - Vitest integration tests
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

// Coverage directories
const COVERAGE_DIRS = {
	bun: path.join(process.cwd(), "coverage", "bun-logic"),
	components: path.join(process.cwd(), "coverage", "components"),
	integration: path.join(process.cwd(), "coverage", "integration"),
	merged: path.join(process.cwd(), "coverage", "merged"),
	final: path.join(process.cwd(), "coverage", "final-report"),
};

// Ensure directories exist
function ensureDirectories() {
	Object.values(COVERAGE_DIRS).forEach((dir) => {
		if (!fs.existsSync(dir)) {
			fs.mkdirSync(dir, { recursive: true });
		}
	});
}

// Check if coverage file exists
function coverageExists(type) {
	const lcovPath = path.join(COVERAGE_DIRS[type], "lcov.info");
	return fs.existsSync(lcovPath);
}

// Merge coverage files
function mergeCoverage() {
	console.log("🔄 Merging coverage reports...\n");

	const coverageFiles = [];

	// Collect existing coverage files
	if (coverageExists("bun")) {
		coverageFiles.push(path.join(COVERAGE_DIRS.bun, "lcov.info"));
		console.log("✅ Found Bun logic test coverage");
	}

	if (coverageExists("components")) {
		coverageFiles.push(path.join(COVERAGE_DIRS.components, "lcov.info"));
		console.log("✅ Found Vitest component test coverage");
	}

	if (coverageExists("integration")) {
		coverageFiles.push(path.join(COVERAGE_DIRS.integration, "lcov.info"));
		console.log("✅ Found Vitest integration test coverage");
	}

	if (coverageFiles.length === 0) {
		console.error("❌ No coverage reports found. Run tests with coverage first.");
		process.exit(1);
	}

	console.log(`\n📊 Merging ${coverageFiles.length} coverage reports...`);

	// Use nyc to merge coverage reports
	try {
		// First, convert lcov to json for each report
		coverageFiles.forEach((file, index) => {
			const jsonFile = path.join(COVERAGE_DIRS.merged, `coverage-${index}.json`);
			execSync(
				`npx nyc report --reporter=json --temp-dir=${path.dirname(file)} --report-dir=${COVERAGE_DIRS.merged} --reporter-options=file=${jsonFile}`,
				{
					stdio: "inherit",
				}
			);
		});

		// Merge all JSON files
		execSync(
			`npx nyc merge ${COVERAGE_DIRS.merged} ${path.join(COVERAGE_DIRS.merged, "coverage-final.json")}`,
			{
				stdio: "inherit",
			}
		);

		// Generate final reports
		execSync(
			`npx nyc report --reporter=lcov --reporter=html --reporter=text --temp-dir=${COVERAGE_DIRS.merged} --report-dir=${COVERAGE_DIRS.final}`,
			{
				stdio: "inherit",
			}
		);

		console.log("\n✅ Coverage reports merged successfully!");
		console.log(`📁 HTML report: ${path.join(COVERAGE_DIRS.final, "index.html")}`);

		// Display coverage summary
		displayCoverageSummary();
	} catch (error) {
		console.error("❌ Error merging coverage:", error.message);
		process.exit(1);
	}
}

// Display coverage summary
function displayCoverageSummary() {
	const summaryPath = path.join(COVERAGE_DIRS.final, "coverage-summary.json");

	if (!fs.existsSync(summaryPath)) {
		// Try to generate it
		try {
			execSync(
				`npx nyc report --reporter=json-summary --temp-dir=${COVERAGE_DIRS.merged} --report-dir=${COVERAGE_DIRS.final}`,
				{
					stdio: "pipe",
				}
			);
		} catch (error) {
			console.warn("⚠️  Could not generate coverage summary");
			return;
		}
	}

	try {
		const summary = JSON.parse(fs.readFileSync(summaryPath, "utf8"));
		const total = summary.total;

		console.log("\n📊 Coverage Summary:");
		console.log("─".repeat(50));
		console.log(`Lines:       ${total.lines.pct}% (${total.lines.covered}/${total.lines.total})`);
		console.log(
			`Statements:  ${total.statements.pct}% (${total.statements.covered}/${total.statements.total})`
		);
		console.log(
			`Functions:   ${total.functions.pct}% (${total.functions.covered}/${total.functions.total})`
		);
		console.log(
			`Branches:    ${total.branches.pct}% (${total.branches.covered}/${total.branches.total})`
		);
		console.log("─".repeat(50));

		// Check thresholds
		const thresholds = {
			lines: 75,
			statements: 75,
			functions: 70,
			branches: 70,
		};

		let passed = true;
		Object.entries(thresholds).forEach(([metric, threshold]) => {
			if (total[metric].pct < threshold) {
				console.error(
					`❌ ${metric} coverage (${total[metric].pct}%) is below threshold (${threshold}%)`
				);
				passed = false;
			}
		});

		if (passed) {
			console.log("\n✅ All coverage thresholds met!");
		} else {
			console.log("\n❌ Coverage thresholds not met");
			process.exit(1);
		}
	} catch (error) {
		console.warn("⚠️  Could not read coverage summary");
	}
}

// Main execution
function main() {
	console.log("🧪 Coverage Merge Tool\n");

	ensureDirectories();
	mergeCoverage();
}

// Run if called directly
if (require.main === module) {
	main();
}

module.exports = { mergeCoverage, displayCoverageSummary };
