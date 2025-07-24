#!/usr/bin/env bun
/**
 * CLI Runner for Architecture Refactoring Assessment
 */

import { AnalysisEngine } from "../core/analysis-engine";
import { AnalysisConfig } from "../types";
import { Logger } from "../services/logger";

async function main() {
	const logger = new Logger("CLI");

	console.log("🔍 Architecture Refactoring Assessment Tool");
	console.log("==========================================\n");

	try {
		// Parse command line arguments
		const args = process.argv.slice(2);

		if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
			printHelp();
			process.exit(0);
		}

		// Build configuration from arguments
		const config = parseArguments(args);

		// Create analysis engine
		const engine = new AnalysisEngine();

		console.log("📂 Analyzing codebase...");
		console.log(`   Target paths: ${config.targetPaths.join(", ")}`);
		console.log(`   Analysis types: ${config.analysisTypes.join(", ")}\n`);

		// Run analysis
		const startTime = Date.now();
		const results = await engine.analyzeCodebase(config);

		console.log(`\n✅ Analysis completed in ${((Date.now() - startTime) / 1000).toFixed(2)}s`);
		console.log(`   Found ${results.length} issues\n`);

		// Generate report
		console.log("📊 Generating report...");
		const report = await engine.generateReport(results);

		// Output results
		if (config.outputFormat === "json") {
			console.log(JSON.stringify(report, null, 2));
		} else {
			printSummary(report);
		}

		// Save report to file if requested
		const outputFile = args.find((arg) => arg.startsWith("--output="))?.split("=")[1];
		if (outputFile) {
			const fs = await import("fs/promises");
			await fs.writeFile(outputFile, JSON.stringify(report, null, 2));
			console.log(`\n💾 Report saved to: ${outputFile}`);
		}
	} catch (error) {
		logger.error("Analysis failed", error as Error);
		console.error("\n❌ Error:", (error as Error).message);
		process.exit(1);
	}
}

function printHelp() {
	console.log(`
Usage: bun run analyze:architecture [options] <paths...>

Options:
  -h, --help              Show this help message
  --types=<types>         Comma-separated list of analysis types
                          Available: code-quality, dead-code, redundancy, 
                                   performance, architecture, dependency, database
                          Default: code-quality,dead-code
  --exclude=<patterns>    Comma-separated list of exclude patterns
                          Default: node_modules,dist,build,.git,coverage
  --strict                Enable strict mode (no low severity issues)
  --output=<file>         Save JSON report to file
  --format=<format>       Output format: json, summary (default: summary)
  --max-files=<n>         Maximum number of files to analyze
  --concurrency=<n>       Number of concurrent analysis tasks (default: 4)

Examples:
  # Analyze current directory for code quality and dead code
  bun run analyze:architecture .
  
  # Analyze specific directories with all analysis types
  bun run analyze:architecture --types=all src lib
  
  # Save detailed JSON report
  bun run analyze:architecture --output=report.json --format=json src
  
  # Exclude test files and analyze with strict mode
  bun run analyze:architecture --exclude="*.test.ts,*.spec.ts" --strict src
`);
}

function parseArguments(args: string[]): AnalysisConfig {
	const config: AnalysisConfig = {
		targetPaths: [],
		excludePatterns: [
			"node_modules",
			"dist",
			"build",
			".git",
			"coverage",
			"*.test.ts",
			"*.test.tsx",
			"*.spec.ts",
			"*.spec.tsx",
		],
		analysisTypes: ["code-quality", "dead-code"],
		strictMode: false,
		performanceThresholds: {
			maxAnalysisTime: 300000,
			maxMemoryUsage: 1024 * 1024 * 1024,
			maxFileSize: 10 * 1024 * 1024,
			concurrencyLimit: 4,
		},
		outputFormat: "json",
	};

	for (const arg of args) {
		if (arg.startsWith("--types=")) {
			const types = arg.split("=")[1];
			if (types === "all") {
				config.analysisTypes = [
					"code-quality",
					"dead-code",
					"redundancy",
					"performance",
					"architecture",
					"dependency",
					"database",
				];
			} else {
				config.analysisTypes = types.split(",") as any[];
			}
		} else if (arg.startsWith("--exclude=")) {
			const patterns = arg.split("=")[1];
			config.excludePatterns.push(...patterns.split(","));
		} else if (arg === "--strict") {
			config.strictMode = true;
		} else if (arg.startsWith("--format=")) {
			config.outputFormat = arg.split("=")[1] as any;
		} else if (arg.startsWith("--concurrency=")) {
			config.performanceThresholds.concurrencyLimit = parseInt(arg.split("=")[1], 10);
		} else if (!arg.startsWith("--")) {
			config.targetPaths.push(arg);
		}
	}

	// Default to current directory if no paths specified
	if (config.targetPaths.length === 0) {
		config.targetPaths.push(".");
	}

	return config;
}

function printSummary(report: any) {
	console.log("\n📋 Analysis Summary");
	console.log("==================");
	console.log(`Total Issues: ${report.summary.totalIssues}`);
	console.log(`Critical Issues: ${report.summary.criticalIssues}`);
	console.log(`Estimated Effort: ${report.summary.estimatedEffort.hours} hours`);
	console.log(`Overall Risk: ${report.summary.riskAssessment.overallRisk}`);

	console.log("\n📊 Issues by Category");
	console.log("====================");
	for (const category of report.categories) {
		console.log(
			`${category.category}: ${category.issueCount} issues (${category.criticalCount} critical)`
		);
	}

	console.log("\n🎯 Top 5 Recommendations");
	console.log("=======================");
	const topRecommendations = report.prioritizedRecommendations.slice(0, 5);
	for (let i = 0; i < topRecommendations.length; i++) {
		const rec = topRecommendations[i];
		console.log(`${i + 1}. [${rec.result.severity}] ${rec.result.message}`);
		console.log(`   File: ${rec.result.file}${rec.result.line ? `:${rec.result.line}` : ""}`);
		console.log(`   Effort: ${rec.result.effort.hours}h | ROI: ${rec.estimatedROI.toFixed(1)}`);
		console.log(`   ${rec.rationale}\n`);
	}

	console.log("\n📈 Potential Benefits");
	console.log("===================");
	for (const benefit of report.summary.potentialBenefits) {
		console.log(`• ${benefit.description}`);
		console.log(`  Expected: ${benefit.expectedImprovement}`);
	}

	console.log("\n📅 Migration Plan");
	console.log("================");
	for (const phase of report.migrationPlan.phases) {
		console.log(`${phase.name} (${phase.duration} days)`);
		console.log(`  ${phase.description}`);
		console.log(`  Tasks: ${phase.tasks.length}`);
	}

	console.log("\n👥 Required Resources");
	console.log("===================");
	for (const resource of report.migrationPlan.requiredResources) {
		console.log(
			`• ${resource.count} ${resource.skillLevel} ${resource.type}(s) for ${resource.duration} days`
		);
	}
}

// Run the CLI
if (import.meta.main) {
	main().catch(console.error);
}
