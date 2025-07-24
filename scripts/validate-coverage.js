#!/usr/bin/env node

/**
 * Coverage Validation Script
 * Validates coverage reports against configured thresholds
 */

const fs = require("fs");
const path = require("path");

// Coverage thresholds for different test tiers
const COVERAGE_THRESHOLDS = {
	logic: {
		statements: 85,
		branches: 80,
		functions: 85,
		lines: 85,
	},
	components: {
		statements: 75,
		branches: 70,
		functions: 75,
		lines: 75,
	},
	integration: {
		statements: 70,
		branches: 65,
		functions: 70,
		lines: 70,
	},
	merged: {
		statements: 80,
		branches: 75,
		functions: 80,
		lines: 80,
	},
};

// Coverage directories
const COVERAGE_DIRS = {
	bun: "./coverage/bun-logic",
	vitest: "./coverage/vitest-components",
	integration: "./coverage/vitest-integration",
	merged: "./coverage/merged",
};

class CoverageValidator {
	constructor() {
		this.coverageDir = path.join(__dirname, "..", "coverage");
		this.errors = [];
		this.warnings = [];
		this.results = {
			passed: 0,
			failed: 0,
			total: 0,
		};
	}

	async validateCoverage() {
		console.log("🔍 Validating coverage reports...");
		console.log("=".repeat(60));

		try {
			// Validate individual tier reports
			await this.validateTierReports();

			// Validate merged report
			await this.validateMergedReport();

			// Generate validation report
			await this.generateReport();

			// Print results
			this.printResults();

			// Exit with appropriate code
			process.exit(this.errors.length > 0 ? 1 : 0);
		} catch (error) {
			console.error("❌ Coverage validation failed:", error.message);
			process.exit(1);
		}
	}

	async validateTierReports() {
		console.log("\n📊 Validating tier reports...");

		for (const [tierName, coverageDir] of Object.entries(COVERAGE_DIRS)) {
			if (tierName === "merged") continue; // Handle merged separately

			console.log(`\n  🔍 Checking ${tierName}...`);

			const reportPath = path.join(coverageDir, "coverage-final.json");

			if (!fs.existsSync(reportPath)) {
				this.warnings.push(`${tierName}: Coverage report not found at ${reportPath}`);
				console.log(`    ⚠️  Report not found: ${reportPath}`);
				continue;
			}

			try {
				const coverage = JSON.parse(fs.readFileSync(reportPath, "utf8"));
				const summary = this.calculateSummary(coverage);
				const thresholds =
					COVERAGE_THRESHOLDS[
						tierName === "bun" ? "logic" : tierName === "vitest" ? "components" : tierName
					];

				console.log(
					`    📈 Coverage: ${summary.lines.pct}%L ${summary.functions.pct}%F ${summary.branches.pct}%B ${summary.statements.pct}%S`
				);
				console.log(
					`    🎯 Thresholds: ${thresholds.lines}%L ${thresholds.functions}%F ${thresholds.branches}%B ${thresholds.statements}%S`
				);

				const passed = this.validateThresholds(summary, thresholds, tierName);
				this.results.total++;

				if (passed) {
					this.results.passed++;
					console.log(`    ✅ ${tierName} coverage validation passed`);
				} else {
					this.results.failed++;
					console.log(`    ❌ ${tierName} coverage validation failed`);
				}
			} catch (error) {
				this.errors.push(`${tierName}: Failed to parse coverage report - ${error.message}`);
				console.log(`    ❌ Failed to parse coverage report: ${error.message}`);
			}
		}
	}

	async validateMergedReport() {
		console.log("\n🔗 Validating merged report...");

		const mergedReportPath = path.join(this.coverageDir, "merged", "coverage-final.json");

		if (!fs.existsSync(mergedReportPath)) {
			this.warnings.push("Merged coverage report not found");
			console.log("  ⚠️  Merged report not found");
			return;
		}

		try {
			const coverage = JSON.parse(fs.readFileSync(mergedReportPath, "utf8"));
			const summary = this.calculateSummary(coverage);
			const thresholds = COVERAGE_THRESHOLDS.merged;

			console.log(
				`  📈 Overall Coverage: ${summary.lines.pct}%L ${summary.functions.pct}%F ${summary.branches.pct}%B ${summary.statements.pct}%S`
			);
			console.log(
				`  🎯 Thresholds: ${thresholds.lines}%L ${thresholds.functions}%F ${thresholds.branches}%B ${thresholds.statements}%S`
			);

			const passed = this.validateThresholds(summary, thresholds, "merged");
			this.results.total++;

			if (passed) {
				this.results.passed++;
				console.log("  ✅ Merged coverage validation passed");
			} else {
				this.results.failed++;
				console.log("  ❌ Merged coverage validation failed");
			}

			// Check against quality gates
			this.validateQualityGates(summary);
		} catch (error) {
			this.errors.push(`Merged report: Failed to parse coverage report - ${error.message}`);
			console.log(`  ❌ Failed to parse merged coverage report: ${error.message}`);
		}
	}

	validateThresholds(summary, thresholds, tierName) {
		let passed = true;
		const metrics = ["lines", "functions", "branches", "statements"];

		for (const metric of metrics) {
			if (summary[metric].pct < thresholds[metric]) {
				this.errors.push(
					`${tierName}: ${metric} coverage ${summary[metric].pct}% below threshold ${thresholds[metric]}%`
				);
				passed = false;
			}
		}

		return passed;
	}

	validateQualityGates(summary) {
		console.log("\n🏆 Quality Gate Analysis:");

		const gates = {
			minimum: { lines: 60, functions: 60, branches: 50, statements: 60 },
			target: { lines: 80, functions: 80, branches: 75, statements: 80 },
			excellence: { lines: 95, functions: 95, branches: 90, statements: 95 },
		};
		const metrics = ["lines", "functions", "branches", "statements"];

		// Check minimum quality gate
		let passedMinimum = true;
		for (const metric of metrics) {
			if (summary[metric].pct < gates.minimum[metric]) {
				passedMinimum = false;
				break;
			}
		}

		if (passedMinimum) {
			console.log("  ✅ Minimum quality gate: PASSED");
		} else {
			console.log("  ❌ Minimum quality gate: FAILED");
			this.errors.push("Failed to meet minimum quality gate requirements");
		}

		// Check target quality gate
		let passedTarget = true;
		for (const metric of metrics) {
			if (summary[metric].pct < gates.target[metric]) {
				passedTarget = false;
				break;
			}
		}

		if (passedTarget) {
			console.log("  ✅ Target quality gate: PASSED");
		} else {
			console.log("  ⚠️  Target quality gate: NOT MET");
			this.warnings.push("Target quality gate not met - consider improving test coverage");
		}

		// Check excellence quality gate
		let passedExcellence = true;
		for (const metric of metrics) {
			if (summary[metric].pct < gates.excellence[metric]) {
				passedExcellence = false;
				break;
			}
		}

		if (passedExcellence) {
			console.log("  🌟 Excellence quality gate: ACHIEVED");
		} else {
			console.log("  💡 Excellence quality gate: OPPORTUNITY FOR IMPROVEMENT");
		}
	}

	calculateSummary(coverage) {
		const summary = {
			lines: { total: 0, covered: 0, pct: 0 },
			functions: { total: 0, covered: 0, pct: 0 },
			statements: { total: 0, covered: 0, pct: 0 },
			branches: { total: 0, covered: 0, pct: 0 },
		};

		for (const fileCoverage of Object.values(coverage)) {
			if (fileCoverage.lines) {
				summary.lines.total += Object.keys(fileCoverage.lines).length;
				summary.lines.covered += Object.values(fileCoverage.lines).filter((v) => v > 0).length;
			}

			if (fileCoverage.functions) {
				summary.functions.total += Object.keys(fileCoverage.functions).length;
				summary.functions.covered += Object.values(fileCoverage.functions).filter(
					(v) => v > 0
				).length;
			}

			if (fileCoverage.statements) {
				summary.statements.total += Object.keys(fileCoverage.statements).length;
				summary.statements.covered += Object.values(fileCoverage.statements).filter(
					(v) => v > 0
				).length;
			}

			if (fileCoverage.branches) {
				summary.branches.total += Object.keys(fileCoverage.branches).length;
				summary.branches.covered += Object.values(fileCoverage.branches).filter(
					(v) => v > 0
				).length;
			}
		}

		// Calculate percentages
		for (const type of ["lines", "functions", "statements", "branches"]) {
			if (summary[type].total > 0) {
				summary[type].pct = Math.round((summary[type].covered / summary[type].total) * 100);
			}
		}

		return summary;
	}

	async generateReport() {
		const reportPath = path.join(this.coverageDir, "validation-report.json");

		const report = {
			timestamp: new Date().toISOString(),
			results: this.results,
			errors: this.errors,
			warnings: this.warnings,
			configuration: {
				tiers: Object.keys(COVERAGE_DIRS).length - 1, // Exclude merged
				thresholds: COVERAGE_THRESHOLDS,
			},
		};

		fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
		console.log(`\n📄 Validation report saved: ${reportPath}`);
	}

	printResults() {
		console.log("\n" + "=".repeat(60));
		console.log("📊 COVERAGE VALIDATION RESULTS");
		console.log("=".repeat(60));

		console.log(`\n✅ Passed: ${this.results.passed}`);
		console.log(`❌ Failed: ${this.results.failed}`);
		console.log(`📊 Total: ${this.results.total}`);

		if (this.warnings.length > 0) {
			console.log(`\n⚠️  Warnings (${this.warnings.length}):`);
			this.warnings.forEach((warning) => console.log(`  - ${warning}`));
		}

		if (this.errors.length > 0) {
			console.log(`\n❌ Errors (${this.errors.length}):`);
			this.errors.forEach((error) => console.log(`  - ${error}`));
		}

		console.log("\n" + "=".repeat(60));

		if (this.errors.length === 0) {
			console.log("🎉 All coverage validations passed!");
		} else {
			console.log("💔 Coverage validation failed - please improve test coverage");
		}
	}
}

// Run validation
const validator = new CoverageValidator();
validator.validateCoverage();
