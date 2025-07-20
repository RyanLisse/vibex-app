#!/usr/bin/env bun


import { promises as fs } from "fs";
import { glob } from "glob";
import { dirname, join, relative } from "path";

interface TestFileInfo {
	path: string;
	directory: string;
	category: string;
	hasSourceFile?: boolean;
	sourceFilePath?: string;
	size: number;
	lines: number;
	lastModified: Date;
}

interface TestAnalysis {
	totalTests: number;
	testsByCategory: Record<string, number>;
	testsByDirectory: Record<string, number>;
	orphanedTests: TestFileInfo[];
	missingTests: string[];
	largeTests: TestFileInfo[];
	oldTests: TestFileInfo[];
}

async function analyzeTestFiles(): Promise<TestAnalysis> {
	const projectRoot = process.cwd();

	// Find all test files
	const testFiles = await glob("**/*.{test,spec}.{ts,tsx,js,jsx}", {
		cwd: projectRoot,
		ignore: ["node_modules/**", "dist/**", ".next/**"],
	});

	console.log(`Found ${testFiles.length} test files`);

	const testFileInfos: TestFileInfo[] = [];
	const sourceFiles = new Set<string>();

	// Analyze each test file
	for (const testFile of testFiles) {
		const fullPath = join(projectRoot, testFile);
		const stats = await fs.stat(fullPath);
		const content = await fs.readFile(fullPath, "utf-8");
		const lines = content.split("\n").length;

		// Determine category
		let category = "unit";
		if (testFile.includes(".integration.")) category = "integration";
		else if (testFile.includes(".e2e.") || testFile.includes(".spec."))
			category = "e2e";
		else if (testFile.includes("components/")) category = "component";
		else if (testFile.includes("hooks/")) category = "hook";
		else if (testFile.includes("api/")) category = "api";

		// Try to find corresponding source file
		const possibleSourcePaths = [
			testFile.replace(/\.(test|spec)\.(ts|tsx|js|jsx)$/, ".$2"),
			testFile.replace(/\.(test|spec)\.(ts|tsx|js|jsx)$/, "/index.$2"),
			testFile
				.replace(/\/__tests__\//, "/")
				.replace(/\.(test|spec)\.(ts|tsx|js|jsx)$/, ".$2"),
		];

		let sourceFilePath: string | undefined;
		let hasSourceFile = false;

		for (const sourcePath of possibleSourcePaths) {
			try {
				await fs.access(join(projectRoot, sourcePath));
				sourceFilePath = sourcePath;
				hasSourceFile = true;
				sourceFiles.add(sourcePath);
				break;
			} catch {}
		}

		testFileInfos.push({
			path: testFile,
			directory: dirname(testFile),
			category,
			hasSourceFile,
			sourceFilePath,
			size: stats.size,
			lines,
			lastModified: stats.mtime,
		});
	}

	// Find source files without tests
	const allSourceFiles = await glob("**/*.{ts,tsx,js,jsx}", {
		cwd: projectRoot,
		ignore: [
			"node_modules/**",
			"dist/**",
			".next/**",
			"**/*.test.*",
			"**/*.spec.*",
			"**/*.d.ts",
			"**/*.config.*",
			"scripts/**",
			"tests/**",
		],
	});

	const missingTests = allSourceFiles.filter(
		(file) =>
			!(
				sourceFiles.has(file) ||
				file.includes("types/") ||
				file.includes("__generated__/") ||
				file.includes(".stories.")
			),
	);

	// Categorize results
	const testsByCategory: Record<string, number> = {};
	const testsByDirectory: Record<string, number> = {};
	const orphanedTests: TestFileInfo[] = [];
	const largeTests: TestFileInfo[] = [];
	const oldTests: TestFileInfo[] = [];

	const thirtyDaysAgo = new Date();
	thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

	for (const testInfo of testFileInfos) {
		// Count by category
		testsByCategory[testInfo.category] =
			(testsByCategory[testInfo.category] || 0) + 1;

		// Count by directory (top-level)
		const topDir = testInfo.directory.split("/")[0];
		testsByDirectory[topDir] = (testsByDirectory[topDir] || 0) + 1;

		// Find orphaned tests
		if (!testInfo.hasSourceFile) {
			orphanedTests.push(testInfo);
		}

		// Find large tests
		if (testInfo.lines > 500) {
			largeTests.push(testInfo);
		}

		// Find old tests
		if (testInfo.lastModified < thirtyDaysAgo) {
			oldTests.push(testInfo);
		}
	}

	return {
		totalTests: testFiles.length,
		testsByCategory,
		testsByDirectory,
		orphanedTests,
		missingTests,
		largeTests,
		oldTests,
	};
}

async function generateReport() {
	const analysis = await analyzeTestFiles();

	console.log("\n=== TEST COVERAGE ANALYSIS ===\n");

	console.log(`Total test files: ${analysis.totalTests}`);

	console.log("\nTests by category:");
	for (const [category, count] of Object.entries(analysis.testsByCategory)) {
		console.log(`  ${category}: ${count}`);
	}

	console.log("\nTests by directory:");
	const sortedDirs = Object.entries(analysis.testsByDirectory)
		.sort(([, a], [, b]) => b - a)
		.slice(0, 10);
	for (const [dir, count] of sortedDirs) {
		console.log(`  ${dir}: ${count}`);
	}

	console.log(
		`\nOrphaned tests (no source file): ${analysis.orphanedTests.length}`,
	);
	if (analysis.orphanedTests.length > 0) {
		console.log("  Examples:");
		analysis.orphanedTests.slice(0, 5).forEach((test) => {
			console.log(`    - ${test.path}`);
		});
	}

	console.log(`\nSource files without tests: ${analysis.missingTests.length}`);
	if (analysis.missingTests.length > 0) {
		console.log("  High priority files:");
		const priorityFiles = analysis.missingTests
			.filter(
				(file) =>
					file.includes("lib/") ||
					file.includes("components/") ||
					file.includes("hooks/") ||
					file.includes("app/"),
			)
			.slice(0, 10);
		priorityFiles.forEach((file) => {
			console.log(`    - ${file}`);
		});
	}

	console.log(`\nLarge test files (>500 lines): ${analysis.largeTests.length}`);
	if (analysis.largeTests.length > 0) {
		console.log("  Files needing refactoring:");
		analysis.largeTests
			.sort((a, b) => b.lines - a.lines)
			.slice(0, 5)
			.forEach((test) => {
				console.log(`    - ${test.path} (${test.lines} lines)`);
			});
	}

	console.log(`\nOld test files (>30 days): ${analysis.oldTests.length}`);

	// Generate JSON report
	const reportPath = join(process.cwd(), "test-analysis-report.json");
	await fs.writeFile(reportPath, JSON.stringify(analysis, null, 2));
	console.log(`\nDetailed report saved to: ${reportPath}`);
}

// Run the analysis
generateReport().catch(console.error);

