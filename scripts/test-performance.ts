#!/usr/bin/env bun

import { spawn } from "child_process";
import { promises as fs } from "fs";
import { join } from "path";
import { promisify } from "util";

const execAsync = promisify(spawn);

interface TestPerformanceData {
	file: string;
	duration: number;
	memory: number;
	tests: number;
	passed: number;
	failed: number;
}

interface PerformanceReport {
	totalDuration: number;
	totalTests: number;
	slowestTests: TestPerformanceData[];
	memoryIntensiveTests: TestPerformanceData[];
	failingTests: TestPerformanceData[];
	averageDuration: number;
	averageMemory: number;
}

async function profileTest(
	testFile: string,
): Promise<TestPerformanceData | null> {
	const startTime = Date.now();
	const startMemory = process.memoryUsage().heapUsed;

	return new Promise((resolve) => {
		const child = spawn(
			"bunx",
			["vitest", "run", testFile, "--reporter=json"],
			{
				stdio: ["inherit", "pipe", "pipe"],
			},
		);

		let output = "";
		let error = "";

		child.stdout.on("data", (data) => {
			output += data.toString();
		});

		child.stderr.on("data", (data) => {
			error += data.toString();
		});

		child.on("close", (code) => {
			const duration = Date.now() - startTime;
			const memoryUsed = process.memoryUsage().heapUsed - startMemory;

			try {
				// Parse test results from output
				const jsonMatch = output.match(/\{[\s\S]*\}/);
				if (jsonMatch) {
					const results = JSON.parse(jsonMatch[0]);

					resolve({
						file: testFile,
						duration,
						memory: memoryUsed / 1024 / 1024, // Convert to MB
						tests: results.numTotalTests || 0,
						passed: results.numPassedTests || 0,
						failed: results.numFailedTests || 0,
					});
				} else {
					// Fallback if no JSON output
					resolve({
						file: testFile,
						duration,
						memory: memoryUsed / 1024 / 1024,
						tests: 0,
						passed: 0,
						failed: code === 0 ? 0 : 1,
					});
				}
			} catch (err) {
				resolve({
					file: testFile,
					duration,
					memory: memoryUsed / 1024 / 1024,
					tests: 0,
					passed: 0,
					failed: 1,
				});
			}
		});
	});
}

async function profileAllTests(): Promise<PerformanceReport> {
	console.log("Starting test performance profiling...\n");

	// Get all test files
	const { glob } = await import("glob");
	const testFiles = await glob("**/*.{test,spec}.{ts,tsx,js,jsx}", {
		cwd: process.cwd(),
		ignore: ["node_modules/**", "dist/**", ".next/**"],
	});

	console.log(`Found ${testFiles.length} test files to profile\n`);

	const results: TestPerformanceData[] = [];
	const batchSize = 5; // Run tests in batches to avoid overwhelming the system

	for (let i = 0; i < testFiles.length; i += batchSize) {
		const batch = testFiles.slice(i, i + batchSize);
		const batchResults = await Promise.all(
			batch.map((file) => profileTest(file)),
		);

		results.push(...(batchResults.filter(Boolean) as TestPerformanceData[]));

		console.log(
			`Profiled ${Math.min(i + batchSize, testFiles.length)}/${testFiles.length} files...`,
		);
	}

	// Analyze results
	const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);
	const totalTests = results.reduce((sum, r) => sum + r.tests, 0);

	const slowestTests = [...results]
		.sort((a, b) => b.duration - a.duration)
		.slice(0, 20);

	const memoryIntensiveTests = [...results]
		.sort((a, b) => b.memory - a.memory)
		.slice(0, 20);

	const failingTests = results.filter((r) => r.failed > 0);

	return {
		totalDuration,
		totalTests,
		slowestTests,
		memoryIntensiveTests,
		failingTests,
		averageDuration: totalDuration / results.length,
		averageMemory:
			results.reduce((sum, r) => sum + r.memory, 0) / results.length,
	};
}

async function generatePerformanceReport() {
	const report = await profileAllTests();

	console.log("\n=== TEST PERFORMANCE REPORT ===\n");

	console.log(`Total test files: ${report.slowestTests.length}`);
	console.log(`Total tests: ${report.totalTests}`);
	console.log(`Total duration: ${(report.totalDuration / 1000).toFixed(2)}s`);
	console.log(
		`Average duration per file: ${(report.averageDuration / 1000).toFixed(2)}s`,
	);
	console.log(`Average memory per file: ${report.averageMemory.toFixed(2)}MB`);

	console.log("\n=== SLOWEST TESTS ===\n");
	report.slowestTests.slice(0, 10).forEach((test, i) => {
		console.log(`${i + 1}. ${test.file}`);
		console.log(`   Duration: ${(test.duration / 1000).toFixed(2)}s`);
		console.log(
			`   Tests: ${test.tests} (${test.passed} passed, ${test.failed} failed)`,
		);
	});

	console.log("\n=== MEMORY INTENSIVE TESTS ===\n");
	report.memoryIntensiveTests.slice(0, 10).forEach((test, i) => {
		console.log(`${i + 1}. ${test.file}`);
		console.log(`   Memory: ${test.memory.toFixed(2)}MB`);
		console.log(`   Duration: ${(test.duration / 1000).toFixed(2)}s`);
	});

	if (report.failingTests.length > 0) {
		console.log("\n=== FAILING TESTS ===\n");
		report.failingTests.forEach((test, i) => {
			console.log(`${i + 1}. ${test.file}`);
			console.log(`   Failed: ${test.failed}/${test.tests} tests`);
		});
	}

	// Save detailed report
	const reportPath = join(process.cwd(), "test-performance-report.json");
	await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
	console.log(`\nDetailed report saved to: ${reportPath}`);

	// Generate optimization suggestions
	console.log("\n=== OPTIMIZATION SUGGESTIONS ===\n");

	const slowTests = report.slowestTests.filter((t) => t.duration > 5000);
	if (slowTests.length > 0) {
		console.log(`${slowTests.length} tests take longer than 5 seconds:`);
		slowTests.slice(0, 5).forEach((test) => {
			console.log(`  - ${test.file} (${(test.duration / 1000).toFixed(2)}s)`);
		});
		console.log(
			"  Consider splitting these tests or optimizing their performance.\n",
		);
	}

	const memoryHogs = report.memoryIntensiveTests.filter((t) => t.memory > 100);
	if (memoryHogs.length > 0) {
		console.log(`${memoryHogs.length} tests use more than 100MB of memory:`);
		memoryHogs.slice(0, 5).forEach((test) => {
			console.log(`  - ${test.file} (${test.memory.toFixed(2)}MB)`);
		});
		console.log(
			"  Consider checking for memory leaks or reducing test data size.\n",
		);
	}
}

// Run profiling if called directly
if (import.meta.main) {
	generatePerformanceReport().catch(console.error);
}
