#!/usr/bin/env bun
/**
 * Safe Test Runner
 *
 * Runs tests with automatic recovery from hanging and other issues
 */

import { execSync, spawn } from "child_process";
import { existsSync } from "fs";

interface TestOptions {
	config?: string;
	watch?: boolean;
	coverage?: boolean;
	ui?: boolean;
	pattern?: string;
	timeout?: number;
	retry?: number;
}

class SafeTestRunner {
	private options: TestOptions;
	private attempt = 0;

	constructor(options: TestOptions = {}) {
		this.options = {
			config: "vitest.config.working.ts",
			timeout: 60000, // 1 minute default timeout
			retry: 3,
			...options,
		};
	}

	async run(): Promise<boolean> {
		console.log("🧪 Safe Test Runner\n");

		// Pre-flight checks
		await this.preFlightChecks();

		// Run tests with retry logic
		for (this.attempt = 1; this.attempt <= this.options.retry!; this.attempt++) {
			console.log(`\n🚀 Test run attempt ${this.attempt}/${this.options.retry}`);

			const success = await this.runTests();

			if (success) {
				console.log("\n✅ Tests completed successfully!");
				return true;
			}

			if (this.attempt < this.options.retry!) {
				console.log("\n⚠️  Test run failed or timed out. Cleaning up before retry...");
				await this.cleanup();
				await this.sleep(2000); // Wait 2 seconds before retry
			}
		}

		console.log("\n❌ Tests failed after all retry attempts.");
		console.log("Run 'bun test:troubleshoot:fix' to diagnose issues.");
		return false;
	}

	private async preFlightChecks() {
		console.log("🔍 Running pre-flight checks...");

		// Check if config exists
		if (!existsSync(this.options.config!)) {
			console.error(`❌ Config file not found: ${this.options.config}`);
			console.log("Run 'bun run scripts/use-new-test-config.ts' to set up configurations.");
			process.exit(1);
		}

		// Clear any stale processes
		try {
			execSync("pkill -f vitest || true", { stdio: "ignore" });
		} catch {
			// Ignore errors
		}

		// Clear cache
		if (existsSync(".vitest")) {
			console.log("🧹 Clearing Vitest cache...");
			execSync("rm -rf .vitest", { stdio: "ignore" });
		}

		console.log("✅ Pre-flight checks passed");
	}

	private runTests(): Promise<boolean> {
		return new Promise((resolve) => {
			const args = ["vitest", "run"];

			// Add config
			args.push("--config", this.options.config!);

			// Add options
			if (this.options.watch) {
				args[1] = ""; // Remove 'run' for watch mode
			}
			if (this.options.coverage) {
				args.push("--coverage");
			}
			if (this.options.ui) {
				args.push("--ui");
			}
			if (this.options.pattern) {
				args.push(this.options.pattern);
			}

			// Add safety flags
			args.push("--no-file-parallelism");
			args.push("--max-workers=1");
			args.push("--reporter=verbose");

			console.log(`\n📋 Running: npx ${args.join(" ")}`);

			const child = spawn("npx", args, {
				stdio: "inherit",
				env: {
					...process.env,
					NODE_ENV: "test",
					FORCE_COLOR: "1",
				},
			});

			let killed = false;

			// Set up timeout
			const timeout = setTimeout(() => {
				if (!killed) {
					console.log("\n⏱️  Test run timed out. Killing process...");
					killed = true;
					child.kill("SIGTERM");
					setTimeout(() => {
						if (child.exitCode === null) {
							child.kill("SIGKILL");
						}
					}, 5000);
				}
			}, this.options.timeout!);

			// Handle process events
			child.on("exit", (code) => {
				clearTimeout(timeout);
				resolve(code === 0 && !killed);
			});

			child.on("error", (error) => {
				clearTimeout(timeout);
				console.error("❌ Process error:", error);
				resolve(false);
			});

			// Handle Ctrl+C
			process.on("SIGINT", () => {
				console.log("\n🛑 Interrupted by user");
				child.kill("SIGTERM");
				process.exit(130);
			});
		});
	}

	private async cleanup() {
		console.log("🧹 Cleaning up...");

		// Kill any hanging processes
		try {
			execSync("pkill -f vitest || true", { stdio: "ignore" });
		} catch {
			// Ignore
		}

		// Clear caches
		const cacheDirs = [".vitest", "node_modules/.vitest", "node_modules/.vite"];
		for (const dir of cacheDirs) {
			if (existsSync(dir)) {
				execSync(`rm -rf ${dir}`, { stdio: "ignore" });
			}
		}

		// Clear any lock files
		try {
			execSync(
				"find . -name '*.lock' -path './node_modules/.vitest/*' -delete 2>/dev/null || true",
				{
					stdio: "ignore",
				}
			);
		} catch {
			// Ignore
		}
	}

	private sleep(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}
}

// Parse CLI arguments
const args = process.argv.slice(2);
const options: TestOptions = {};

// Parse options
for (let i = 0; i < args.length; i++) {
	const arg = args[i];

	switch (arg) {
		case "--config":
		case "-c":
			options.config = args[++i];
			break;
		case "--watch":
		case "-w":
			options.watch = true;
			break;
		case "--coverage":
			options.coverage = true;
			break;
		case "--ui":
			options.ui = true;
			break;
		case "--timeout":
			options.timeout = Number.parseInt(args[++i]) * 1000;
			break;
		case "--retry":
			options.retry = Number.parseInt(args[++i]);
			break;
		default:
			if (!arg.startsWith("-")) {
				options.pattern = arg;
			}
	}
}

// Run tests
const runner = new SafeTestRunner(options);
runner.run().then((success) => {
	process.exit(success ? 0 : 1);
});
