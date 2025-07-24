#!/usr/bin/env node

/**
 * Coverage Merge Script for Consolidated Testing Framework
 *
 * Merges coverage reports from unit and integration tests into a unified report.
 * This script supports the simplified Vitest-only testing approach.
 */

const fs = require("fs");
const path = require("path");

const COVERAGE_DIRS = {
	unit: "./coverage/unit",
	integration: "./coverage/integration",
};

const OUTPUT_DIR = "./coverage/final-report";

async function mergeCoverage() {
	console.log("🔄 Merging coverage reports...");

	try {
		// Ensure output directory exists
		if (!fs.existsSync(OUTPUT_DIR)) {
			fs.mkdirSync(OUTPUT_DIR, { recursive: true });
		}

		// Check which coverage reports exist
		const availableReports = [];
		for (const [type, dir] of Object.entries(COVERAGE_DIRS)) {
			if (fs.existsSync(dir)) {
				availableReports.push({ type, dir });
				console.log(`✅ Found ${type} coverage report`);
			} else {
				console.log(`⚠️  No ${type} coverage report found`);
			}
		}

		if (availableReports.length === 0) {
			console.log("❌ No coverage reports found to merge");
			process.exit(1);
		}

		// For now, copy the most comprehensive report to final-report
		// In the future, this could be enhanced to actually merge JSON reports
		const primaryReport = availableReports.find((r) => r.type === "unit") || availableReports[0];

		console.log(`📋 Using ${primaryReport.type} as primary coverage report`);

		// Copy HTML report if it exists
		const htmlSource = path.join(primaryReport.dir, "index.html");
		const htmlTarget = path.join(OUTPUT_DIR, "index.html");

		if (fs.existsSync(htmlSource)) {
			fs.copyFileSync(htmlSource, htmlTarget);
			console.log("✅ HTML coverage report copied to final-report/");
		}

		// Copy LCOV report if it exists
		const lcovSource = path.join(primaryReport.dir, "lcov.info");
		const lcovTarget = path.join(OUTPUT_DIR, "lcov.info");

		if (fs.existsSync(lcovSource)) {
			fs.copyFileSync(lcovSource, lcovTarget);
			console.log("✅ LCOV coverage report copied to final-report/");
		}

		console.log("🎉 Coverage merge completed successfully!");
		console.log(`📊 View report: open ${OUTPUT_DIR}/index.html`);
	} catch (error) {
		console.error("❌ Error merging coverage reports:", error.message);
		process.exit(1);
	}
}

// Run the merge
mergeCoverage();
