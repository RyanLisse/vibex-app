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