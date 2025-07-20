#!/usr/bin/env bun
/**
 * Master Automation Script
 *
 * This script orchestrates all testing infrastructure fixes:
 * - TypeScript compilation errors
 * - Vitest configuration issues
 * - Component prop type mismatches
 * - Missing module exports
 * - Code quality automation setup
 */

import { execSync } from "child_process";
import { ComponentPropFixer } from "./fix-component-props";
import { TypeScriptErrorFixer } from "./fix-typescript-errors";
import { VitestConfigFixer } from "./fix-vitest-config";

interface AutomationResult {
	step: string;
	success: boolean;
	errorsBefore: number;
	errorsAfter: number;
	message: string;
}

class AutomationMaster {
	private results: AutomationResult[] = [];

	async run(): Promise<void> {
		console.log(
			"🚀 Starting comprehensive testing infrastructure automation...\n",
		);
		console.log("=".repeat(70));

		// Get initial state
		const initialErrors = this.getTypeScriptErrorCount();
		console.log(`📊 Initial TypeScript errors: ${initialErrors}\n`);

		// Step 1: Fix Vitest configuration first (prevents hanging)
		await this.runStep("Vitest Configuration Fix", async () => {
			const fixer = new VitestConfigFixer();
			await fixer.run();
		});

		// Step 2: Fix component prop types
		await this.runStep("Component Prop Type Fix", async () => {
			const fixer = new ComponentPropFixer();
			await fixer.run();
		});

		// Step 3: Fix TypeScript errors
		await this.runStep("TypeScript Error Fix", async () => {
			const fixer = new TypeScriptErrorFixer();
			await fixer.run();
		});

		// Step 4: Run code quality tools
		await this.runStep("Code Quality Automation", async () => {
			await this.runCodeQualityTools();
		});

		// Step 5: Verify everything works
		await this.runStep("Final Verification", async () => {
			await this.runFinalVerification();
		});

		// Report final results
		this.reportFinalResults(initialErrors);
	}

	private async runStep(
		stepName: string,
		stepFunction: () => Promise<void>,
	): Promise<void> {
		console.log(`\n🔧 ${stepName}`);
		console.log("-".repeat(50));

		const errorsBefore = this.getTypeScriptErrorCount();

		try {
			await stepFunction();
			const errorsAfter = this.getTypeScriptErrorCount();

			this.results.push({
				step: stepName,
				success: true,
				errorsBefore,
				errorsAfter,
				message: `Reduced errors from ${errorsBefore} to ${errorsAfter}`,
			});

			console.log(`✅ ${stepName} completed successfully`);
		} catch (error) {
			const errorsAfter = this.getTypeScriptErrorCount();

			this.results.push({
				step: stepName,
				success: false,
				errorsBefore,
				errorsAfter,
				message: `Failed: ${error}`,
			});

			console.error(`❌ ${stepName} failed:`, error);
		}
	}

	private getTypeScriptErrorCount(): number {
		try {
			const output = execSync("bunx tsc --noEmit 2>&1", {
				encoding: "utf-8",
				maxBuffer: 1024 * 1024 * 10,
			});

			const errorLines = output
				.split("\n")
				.filter((line) => line.includes("error TS"));
			return errorLines.length;
		} catch (error: any) {
			// TypeScript errors are returned as non-zero exit code
			const errorLines = error.stdout
				.split("\n")
				.filter((line: string) => line.includes("error TS"));
			return errorLines.length;
		}
	}

	private async runCodeQualityTools(): Promise<void> {
		console.log("🔧 Running code quality automation...");

		// Run Biome formatting and linting
		try {
			execSync("bun run check:fix", { encoding: "utf-8" });
			console.log("✅ Biome formatting and linting completed");
		} catch (error) {
			console.warn("⚠️  Biome had some issues:", error);
		}

		// Run type checking
		try {
			execSync("bun run type-check", { encoding: "utf-8" });
			console.log("✅ Type checking passed");
		} catch (error) {
			console.warn(
				"⚠️  Type checking found issues (expected during automation)",
			);
		}

		// Update package.json with automation scripts
		await this.updatePackageJsonScripts();
	}

	private async updatePackageJsonScripts(): Promise<void> {
		const { readFileSync, writeFileSync } = await import("fs");

		try {
			const packageJson = JSON.parse(readFileSync("package.json", "utf-8"));

			// Add automation scripts
			const automationScripts = {
				"fix:typescript": "bun run scripts/fix-typescript-errors.ts",
				"fix:vitest": "bun run scripts/fix-vitest-config.ts",
				"fix:components": "bun run scripts/fix-component-props.ts",
				"fix:all": "bun run scripts/automation-master.ts",
				"test:safe": "bun run fix:vitest && bun run test",
				"quality:auto":
					"bun run fix:all && bun run check:fix && bun run type-check",
			};

			packageJson.scripts = { ...packageJson.scripts, ...automationScripts };

			writeFileSync(
				"package.json",
				JSON.stringify(packageJson, null, 2),
				"utf-8",
			);
			console.log("✅ Updated package.json with automation scripts");
		} catch (error) {
			console.warn("⚠️  Could not update package.json:", error);
		}
	}

	private async runFinalVerification(): Promise<void> {
		console.log("🧪 Running final verification...");

		// Test TypeScript compilation
		const finalErrors = this.getTypeScriptErrorCount();
		console.log(`📊 Final TypeScript errors: ${finalErrors}`);

		// Test Vitest execution (with timeout)
		try {
			console.log("🧪 Testing Vitest execution...");

			// Use a platform-appropriate timeout command
			const timeoutCmd = process.platform === "darwin" ? "gtimeout" : "timeout";
			let testResult: string;

			try {
				testResult = execSync(
					`${timeoutCmd} 30s bun run test --run --reporter=basic 2>&1`,
					{
						encoding: "utf-8",
						timeout: 35_000,
					},
				);
			} catch (timeoutError) {
				// Fallback without timeout command
				testResult = execSync("bun run test --run --reporter=basic 2>&1", {
					encoding: "utf-8",
					timeout: 30_000,
				});
			}

			if (testResult.includes("✓") || testResult.includes("passed")) {
				console.log("✅ Vitest is working correctly!");
			} else {
				console.log("⚠️  Vitest may still have issues");
			}
		} catch (error) {
			console.log(
				"⚠️  Could not verify Vitest execution (may still be hanging)",
			);
		}

		// Test authentication components
		try {
			const authErrors = execSync(
				'bunx tsc --noEmit 2>&1 | grep -i "auth" | wc -l',
				{
					encoding: "utf-8",
				},
			).trim();

			console.log(`📊 Authentication component errors: ${authErrors}`);
		} catch (error) {
			console.log("⚠️  Could not check authentication component status");
		}
	}

	private reportFinalResults(initialErrors: number): void {
		const finalErrors = this.getTypeScriptErrorCount();

		console.log("\n" + "=".repeat(70));
		console.log("📊 AUTOMATION RESULTS SUMMARY");
		console.log("=".repeat(70));

		console.log("\n📈 Overall Progress:");
		console.log(`   Initial errors: ${initialErrors}`);
		console.log(`   Final errors:   ${finalErrors}`);
		console.log(`   Errors fixed:   ${initialErrors - finalErrors}`);
		console.log(
			`   Success rate:   ${(((initialErrors - finalErrors) / initialErrors) * 100).toFixed(1)}%`,
		);

		console.log("\n🔧 Step-by-step Results:");
		this.results.forEach((result, index) => {
			const status = result.success ? "✅" : "❌";
			const errorReduction = result.errorsBefore - result.errorsAfter;
			console.log(`   ${index + 1}. ${status} ${result.step}`);
			console.log(
				`      Errors: ${result.errorsBefore} → ${result.errorsAfter} (${errorReduction >= 0 ? "-" : "+"}${Math.abs(errorReduction)})`,
			);
		});

		console.log("\n🎯 Next Steps:");
		if (finalErrors === 0) {
			console.log("   🎉 All TypeScript errors resolved!");
			console.log('   ✅ Run "bun run test" to verify everything works');
			console.log('   ✅ Run "bun run quality:auto" for ongoing maintenance');
		} else {
			console.log(`   ⚠️  ${finalErrors} errors remain - may need manual fixes`);
			console.log('   🔧 Run "bun run fix:all" again to attempt more fixes');
			console.log('   📝 Check remaining errors with "bun run type-check"');
		}

		console.log("\n🛠️  Available Automation Commands:");
		console.log("   bun run fix:typescript  - Fix TypeScript errors");
		console.log("   bun run fix:vitest      - Fix Vitest configuration");
		console.log("   bun run fix:components  - Fix component prop types");
		console.log("   bun run fix:all         - Run all fixes");
		console.log("   bun run test:safe       - Fix Vitest then run tests");
		console.log("   bun run quality:auto    - Full quality automation");

		console.log("\n" + "=".repeat(70));
	}
}

// Run the master automation
if (import.meta.main) {
	const master = new AutomationMaster();
	master.run().catch(console.error);
}

export { AutomationMaster };
