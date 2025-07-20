#!/usr/bin/env bun

import { spawn } from "child_process";
import { promises as fs } from "fs";
import { glob } from "glob";
import { dirname, join } from "path";

interface OptimizationTask {
	type: "split" | "parallelize" | "mock" | "dedupe" | "cleanup";
	file: string;
	reason: string;
	suggestion: string;
	priority: number;
}

interface TestOptimizationReport {
	totalTests: number;
	optimizationTasks: OptimizationTask[];
	estimatedTimeSaving: number;
	complexityReduction: number;
}

async function analyzeTestComplexity(testPath: string): Promise<{
	complexity: number;
	issues: string[];
	optimizations: OptimizationTask[];
}> {
	const content = await fs.readFile(testPath, "utf-8");
	const lines = content.split("\n");

	let complexity = 0;
	const issues: string[] = [];
	const optimizations: OptimizationTask[] = [];

	// Check file size
	if (lines.length > 500) {
		complexity += 30;
		issues.push(`Large file: ${lines.length} lines`);
		optimizations.push({
			type: "split",
			file: testPath,
			reason: "File too large",
			suggestion: "Split into multiple focused test files",
			priority: 1,
		});
	}

	// Check nesting depth
	let maxNesting = 0;
	let currentNesting = 0;
	for (const line of lines) {
		currentNesting += (line.match(/{/g) || []).length;
		currentNesting -= (line.match(/}/g) || []).length;
		maxNesting = Math.max(maxNesting, currentNesting);
	}

	if (maxNesting > 5) {
		complexity += 20;
		issues.push(`Deep nesting: ${maxNesting} levels`);
		optimizations.push({
			type: "parallelize",
			file: testPath,
			reason: "Deeply nested tests",
			suggestion: "Flatten test structure, use describe.concurrent",
			priority: 2,
		});
	}

	// Check for synchronous file operations
	const syncOps =
		content.match(/\b(readFileSync|writeFileSync|existsSync)\b/g) || [];
	if (syncOps.length > 0) {
		complexity += 15;
		issues.push(`Synchronous operations: ${syncOps.length}`);
		optimizations.push({
			type: "mock",
			file: testPath,
			reason: "Synchronous file operations",
			suggestion: "Mock file system operations or use async alternatives",
			priority: 1,
		});
	}

	// Check for duplicate setup
	const beforeEachCount = (content.match(/beforeEach/g) || []).length;
	if (beforeEachCount > 3) {
		complexity += 10;
		issues.push(`Multiple beforeEach: ${beforeEachCount}`);
		optimizations.push({
			type: "dedupe",
			file: testPath,
			reason: "Duplicate setup code",
			suggestion: "Extract common setup to shared utilities",
			priority: 3,
		});
	}

	// Check for test interdependencies
	if (
		content.includes("test.sequential") ||
		content.includes("describe.sequential")
	) {
		complexity += 25;
		issues.push("Sequential tests detected");
		optimizations.push({
			type: "parallelize",
			file: testPath,
			reason: "Sequential test execution",
			suggestion: "Refactor to allow parallel execution",
			priority: 1,
		});
	}

	// Check for large test data
	const largeArrays = content.match(/\[[\s\S]{1000,}?\]/g) || [];
	const largeObjects = content.match(/{[\s\S]{1000,}?}/g) || [];
	if (largeArrays.length > 0 || largeObjects.length > 0) {
		complexity += 15;
		issues.push("Large inline test data");
		optimizations.push({
			type: "cleanup",
			file: testPath,
			reason: "Large inline test data",
			suggestion: "Move test data to fixtures",
			priority: 2,
		});
	}

	// Check for missing assertions
	const testCount = (content.match(/\b(test|it)\s*\(/g) || []).length;
	const expectCount = (content.match(/\bexpect\s*\(/g) || []).length;
	if (testCount > 0 && expectCount / testCount < 1) {
		complexity += 20;
		issues.push("Tests with missing assertions");
	}

	return { complexity, issues, optimizations };
}

async function generateOptimizationPlan(): Promise<TestOptimizationReport> {
	const projectRoot = process.cwd();

	// Find all test files
	const testFiles = await glob("**/*.{test,spec}.{ts,tsx,js,jsx}", {
		cwd: projectRoot,
		ignore: ["node_modules/**", "dist/**", ".next/**"],
	});

	console.log(
		`Analyzing ${testFiles.length} test files for optimization opportunities...\n`,
	);

	const allOptimizations: OptimizationTask[] = [];
	let totalComplexity = 0;
	let highComplexityTests = 0;

	// Analyze each test
	for (const testFile of testFiles) {
		const { complexity, issues, optimizations } =
			await analyzeTestComplexity(testFile);
		totalComplexity += complexity;

		if (complexity > 50) {
			highComplexityTests++;
		}

		allOptimizations.push(...optimizations);
	}

	// Sort optimizations by priority
	allOptimizations.sort((a, b) => a.priority - b.priority);

	// Estimate time savings
	const estimatedTimeSaving = allOptimizations.reduce((total, opt) => {
		switch (opt.type) {
			case "parallelize":
				return total + 30; // 30% faster
			case "mock":
				return total + 20; // 20% faster
			case "split":
				return total + 15; // 15% faster
			case "dedupe":
				return total + 10; // 10% faster
			case "cleanup":
				return total + 5; // 5% faster
			default:
				return total;
		}
	}, 0);

	const complexityReduction = Math.round(
		(highComplexityTests / testFiles.length) * 100,
	);

	return {
		totalTests: testFiles.length,
		optimizationTasks: allOptimizations,
		estimatedTimeSaving,
		complexityReduction,
	};
}

async function generateOptimizationScripts(report: TestOptimizationReport) {
	const projectRoot = process.cwd();

	// Group tasks by type
	const tasksByType = new Map<string, OptimizationTask[]>();
	for (const task of report.optimizationTasks) {
		if (!tasksByType.has(task.type)) {
			tasksByType.set(task.type, []);
		}
		tasksByType.get(task.type)!.push(task);
	}

	// Generate split script
	if (tasksByType.has("split")) {
		const splitScript = `#!/usr/bin/env bun


// Script to split large test files


const filesToSplit = ${JSON.stringify(
			tasksByType.get("split")!.map((t) => t.file),
			null,
			2,
		)};


async function splitTestFile(filePath: string) {
  const content = await fs.readFile(filePath, 'utf-8');
  const lines = content.split('\\n');
  
  // Find describe blocks
  const describes: Array<{ start: number; end: number; name: string }> = [];
  let currentDescribe: any = null;
  let depth = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes('describe(')) {
      const match = line.match(/describe\\(['"\`](.+?)['"\`]/);
      if (match && depth === 0) {
        currentDescribe = { start: i, name: match[1] };
      }
    }
    
    depth += (line.match(/{/g) || []).length;
    depth -= (line.match(/}/g) || []).length;
    
    if (currentDescribe && depth === 0 && line.includes('}')) {
      currentDescribe.end = i;
      describes.push(currentDescribe);
      currentDescribe = null;
    }
  }
  
  // Create split files
  const dir = dirname(filePath);
  const base = basename(filePath, '.test.ts');
  
  for (let i = 0; i < describes.length; i++) {
    const describe = describes[i];
    const newFileName = \`\${base}.\${describe.name.toLowerCase().replace(/\\s+/g, '-')}.test.ts\`;
    const newFilePath = join(dir, newFileName);
    
    const imports = lines.slice(0, describes[0].start).join('\\n');
    const content = lines.slice(describe.start, describe.end + 1).join('\\n');
    
    await fs.writeFile(newFilePath, imports + '\\n\\n' + content);
    console.log(\`Created: \${newFilePath}\`);
  }
  
  // Archive original
  await fs.rename(filePath, filePath + '.bak');
  console.log(\`Archived: \${filePath}\`);
}

// Run splits
for (const file of filesToSplit) {
  await splitTestFile(file).catch(console.error);
}

`;

		await fs.writeFile(
			join(projectRoot, "scripts/split-large-tests.ts"),
			splitScript,
		);
	}

	// Generate parallelization script
	const parallelScript = `#!/bin/bash


# Enable parallel test execution

echo "Updating test files for parallel execution..."

# Files that need parallelization
FILES=(
${
	tasksByType
		.get("parallelize")
		?.map((t) => `  "${t.file}"`)
		.join("\n") || ""
}
)

for file in "\${FILES[@]}"; do
  echo "Updating $file for parallel execution..."
  
  # Replace describe.sequential with describe.concurrent
  sed -i.bak 's/describe\\.sequential/describe.concurrent/g' "$file"
  
  # Replace test.sequential with test.concurrent
  sed -i.bak 's/test\\.sequential/test.concurrent/g' "$file"
  
  echo "✓ Updated $file"
done

echo "Done! Test files updated for parallel execution."

`;

	await fs.writeFile(
		join(projectRoot, "scripts/enable-parallel-tests.sh"),
		parallelScript,
	);
	await fs.chmod(join(projectRoot, "scripts/enable-parallel-tests.sh"), "755");
}

async function generateReport() {
	const report = await generateOptimizationPlan();

	console.log("=== TEST OPTIMIZATION REPORT ===\n");

	console.log(`Total test files: ${report.totalTests}`);
	console.log(`Optimization opportunities: ${report.optimizationTasks.length}`);
	console.log(`Estimated time saving: ${report.estimatedTimeSaving}%`);
	console.log(`High complexity tests: ${report.complexityReduction}%`);

	// Group by type
	const tasksByType = new Map<string, number>();
	for (const task of report.optimizationTasks) {
		tasksByType.set(task.type, (tasksByType.get(task.type) || 0) + 1);
	}

	console.log("\n=== OPTIMIZATION BREAKDOWN ===\n");
	for (const [type, count] of tasksByType) {
		console.log(`${type}: ${count} files`);
	}

	console.log("\n=== TOP PRIORITY OPTIMIZATIONS ===\n");
	report.optimizationTasks
		.filter((t) => t.priority === 1)
		.slice(0, 10)
		.forEach((task) => {
			console.log(`${task.file}`);
			console.log(`  Type: ${task.type}`);
			console.log(`  Reason: ${task.reason}`);
			console.log(`  Suggestion: ${task.suggestion}`);
			console.log();
		});

	// Generate optimization scripts
	await generateOptimizationScripts(report);

	// Save detailed report
	const reportPath = join(process.cwd(), "test-optimization-report.json");
	await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

	console.log("=== GENERATED SCRIPTS ===\n");
	console.log("- scripts/split-large-tests.ts - Split large test files");
	console.log("- scripts/enable-parallel-tests.sh - Enable parallel execution");
	console.log(`\nDetailed report: ${reportPath}`);
}

// Run optimization analysis
generateReport().catch(console.error);
