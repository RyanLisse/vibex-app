#!/usr/bin/env bun

import { promises as fs } from "fs";
import { glob } from "glob";
import { basename, dirname, join } from "path";

interface TestCategory {
	name: string;
	pattern: RegExp;
	directory?: string;
	priority: number;
}

const testCategories: TestCategory[] = [
	{ name: "unit", pattern: /\.(unit\.test|test)\.(ts|tsx)$/, priority: 1 },
	{
		name: "integration",
		pattern: /\.(integration\.test|int\.test)\.(ts|tsx)$/,
		priority: 2,
	},
	{
		name: "e2e",
		pattern: /\.(e2e\.test|spec)\.(ts|tsx)$/,
		directory: "e2e",
		priority: 3,
	},
	{
		name: "component",
		pattern: /\.test\.(tsx)$/,
		directory: "components",
		priority: 1,
	},
	{ name: "hook", pattern: /\.test\.(ts)$/, directory: "hooks", priority: 1 },
	{ name: "api", pattern: /\.test\.(ts)$/, directory: "api", priority: 2 },
	{ name: "lib", pattern: /\.test\.(ts)$/, directory: "lib", priority: 1 },
	{
		name: "database",
		pattern: /\.(db|database|schema).*\.test\.(ts)$/,
		priority: 2,
	},
	{
		name: "performance",
		pattern: /\.(perf|performance|benchmark).*\.test\.(ts)$/,
		priority: 3,
	},
	{
		name: "security",
		pattern: /\.(security|auth).*\.test\.(ts)$/,
		priority: 3,
	},
];

interface CategorizedTest {
	path: string;
	category: string;
	priority: number;
	size: number;
	lines: number;
}

async function categorizeTest(testPath: string): Promise<CategorizedTest> {
	const stats = await fs.stat(testPath);
	const content = await fs.readFile(testPath, "utf-8");
	const lines = content.split("\n").length;

	// Determine category
	let category = "unknown";
	let priority = 4;

	for (const cat of testCategories) {
		if (
			cat.pattern.test(testPath) &&
			(!cat.directory || testPath.includes(cat.directory))
		) {
			category = cat.name;
			priority = cat.priority;
			break;
		}
	}

	// Override based on content
	if (content.includes("@testing-library/react")) {
		category = "component";
		priority = 1;
	} else if (
		content.includes("supertest") ||
		content.includes("request(app)")
	) {
		category = "api";
		priority = 2;
	} else if (content.includes("puppeteer") || content.includes("playwright")) {
		category = "e2e";
		priority = 3;
	}

	return {
		path: testPath,
		category,
		priority,
		size: stats.size,
		lines,
	};
}

async function generateTestConfigurations() {
	const projectRoot = process.cwd();

	// Find all test files
	const testFiles = await glob("**/*.{test,spec}.{ts,tsx,js,jsx}", {
		cwd: projectRoot,
		ignore: ["node_modules/**", "dist/**", ".next/**"],
	});

	console.log(`Categorizing ${testFiles.length} test files...\n`);

	// Categorize all tests
	const categorizedTests = await Promise.all(
		testFiles.map((file) => categorizeTest(file)),
	);

	// Group by category
	const testsByCategory = new Map<string, CategorizedTest[]>();
	for (const test of categorizedTests) {
		if (!testsByCategory.has(test.category)) {
			testsByCategory.set(test.category, []);
		}
		testsByCategory.get(test.category)!.push(test);
	}

	console.log("=== TEST CATEGORIZATION REPORT ===\n");

	for (const [category, tests] of testsByCategory) {
		console.log(`${category}: ${tests.length} tests`);
		const totalLines = tests.reduce((sum, t) => sum + t.lines, 0);
		console.log(`  Total lines: ${totalLines}`);
		console.log(
			`  Average lines per test: ${Math.round(totalLines / tests.length)}`,
		);
	}

	// Generate optimized test configurations
	console.log("\n=== GENERATING OPTIMIZED CONFIGURATIONS ===\n");

	// Priority 1 (Fast unit tests)
	const priority1Tests = categorizedTests
		.filter((t) => t.priority === 1 && t.lines < 200)
		.map((t) => t.path);

	// Priority 2 (Integration tests)
	const priority2Tests = categorizedTests
		.filter((t) => t.priority === 2)
		.map((t) => t.path);

	// Priority 3 (E2E/Performance tests)
	const priority3Tests = categorizedTests
		.filter((t) => t.priority === 3)
		.map((t) => t.path);

	// Generate test:fast script config
	const fastConfig = `// Fast test configuration - Priority 1 tests only
export default {
  include: ${JSON.stringify(priority1Tests.slice(0, 50), null, 2)},
  exclude: ['node_modules/**', 'dist/**', '.next/**'],
  testTimeout: 5000,
  bail: 1,
}`;

	await fs.writeFile(join(projectRoot, "vitest.fast.config.ts"), fastConfig);

	// Generate test groups for parallel execution
	const testGroups = {
		"test:group:1": priority1Tests.slice(
			0,
			Math.ceil(priority1Tests.length / 3),
		),
		"test:group:2": priority1Tests.slice(
			Math.ceil(priority1Tests.length / 3),
			Math.ceil((priority1Tests.length * 2) / 3),
		),
		"test:group:3": priority1Tests.slice(
			Math.ceil((priority1Tests.length * 2) / 3),
		),
		"test:integration": priority2Tests,
		"test:e2e": priority3Tests,
	};

	// Update package.json scripts
	console.log("\nSuggested package.json scripts:");
	console.log(
		JSON.stringify(
			{
				scripts: {
					"test:fast": "vitest run --config vitest.fast.config.ts",
					"test:unit": "vitest run --config vitest.config.ts",
					"test:integration":
						"vitest run --config vitest.integration.config.ts",
					"test:e2e": "vitest run --config vitest.browser.config.ts",
					"test:parallel": 'concurrently "npm:test:group:*"',
					...Object.fromEntries(
						Object.entries(testGroups).map(([name, files]) => [
							name,
							`vitest run ${files.slice(0, 10).join(" ")}`,
						]),
					),
				},
			},
			null,
			2,
		),
	);

	// Generate test execution strategy
	const strategyPath = join(projectRoot, "test-execution-strategy.md");
	const strategy = `# Test Execution Strategy

## Test Categories

${Array.from(testsByCategory.entries())
	.map(
		([cat, tests]) => `
### ${cat.charAt(0).toUpperCase() + cat.slice(1)} Tests
- Count: ${tests.length}
- Priority: ${tests[0]?.priority || "N/A"}
- Recommended timeout: ${cat === "unit" ? "5s" : cat === "integration" ? "10s" : "30s"}
`,
	)
	.join("\n")}

## Execution Order

1. **Development (Fast Feedback)**
   - Run: \`npm run test:fast\`
   - Time: ~30s
   - Covers: Critical unit tests

2. **Pre-commit**
   - Run: \`npm run test:unit\`
   - Time: ~2min
   - Covers: All unit tests

3. **CI Pipeline**
   - Stage 1: Unit tests (parallel groups)
   - Stage 2: Integration tests
   - Stage 3: E2E tests
   
## Performance Optimization

- Use \`--pool=threads\` for CPU-bound tests
- Use \`--pool=forks\` for I/O-heavy tests
- Set \`--max-concurrency=4\` to limit parallel execution
- Enable \`--bail\` for faster failure detection
`;

	await fs.writeFile(strategyPath, strategy);

	// Save detailed categorization
	const reportPath = join(projectRoot, "test-categorization-report.json");
	await fs.writeFile(
		reportPath,
		JSON.stringify(
			{
				summary: {
					total: categorizedTests.length,
					byCategory: Object.fromEntries(testsByCategory.entries()),
				},
				tests: categorizedTests,
				groups: testGroups,
			},
			null,
			2,
		),
	);

	console.log(`\nTest execution strategy: ${strategyPath}`);
	console.log(`Detailed report: ${reportPath}`);
}

// Run categorization
generateTestConfigurations().catch(console.error);
