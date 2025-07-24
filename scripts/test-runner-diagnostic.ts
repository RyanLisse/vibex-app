#!/usr/bin/env bun

/**
 * Test Runner Diagnostic Tool
 *
 * Helps diagnose why tests are hanging and provides solutions
 */

import { execSync, spawn } from "child_process";
import { existsSync } from "fs";

console.log("🔍 Test Runner Diagnostic Tool");
console.log("============================\n");

async function diagnose() {
	// Check 1: Bun version
	console.log("1️⃣ Checking Bun version...");
	try {
		const bunVersion = execSync("bun --version").toString().trim();
		console.log(`   ✅ Bun version: ${bunVersion}`);
	} catch (e) {
		console.log("   ❌ Bun not found");
	}

	// Check 2: Node version
	console.log("\n2️⃣ Checking Node version...");
	try {
		const nodeVersion = execSync("node --version").toString().trim();
		console.log(`   ✅ Node version: ${nodeVersion}`);
	} catch (e) {
		console.log("   ❌ Node not found");
	}

	// Check 3: Test simple Vitest run
	console.log("\n3️⃣ Testing Vitest with a simple file...");
	const testFile = "lib/auth.test.ts";
	if (existsSync(testFile)) {
		try {
			const result = await runWithTimeout(
				`npx vitest run --config=vitest.config.ts ${testFile}`,
				10000
			);
			if (result.success) {
				console.log("   ✅ Single file test works");
			} else {
				console.log("   ❌ Single file test failed or timed out");
				console.log(`   Error: ${result.error}`);
			}
		} catch (e) {
			console.log("   ❌ Error running test:", e);
		}
	}

	// Check 4: ESBuild issue
	console.log("\n4️⃣ Checking for ESBuild issues...");
	try {
		execSync("npx esbuild --version", { stdio: "pipe" });
		console.log("   ✅ ESBuild is installed");

		// Try to transform a simple file
		const testTransform = `
      import { test } from 'vitest';
      test('simple', () => {
        expect(1).toBe(1);
      });
    `;

		try {
			execSync(`echo "${testTransform}" | npx esbuild --format=esm --platform=node`, {
				stdio: "pipe",
			});
			console.log("   ✅ ESBuild transformation works");
		} catch {
			console.log("   ❌ ESBuild transformation fails");
		}
	} catch {
		console.log("   ❌ ESBuild not found or has issues");
	}

	// Check 5: Memory usage
	console.log("\n5️⃣ Checking system resources...");
	try {
		const memInfo = execSync("free -h || vm_stat").toString();
		console.log("   Memory info:");
		console.log(
			memInfo
				.split("\n")
				.slice(0, 3)
				.map((l) => `   ${l}`)
				.join("\n")
		);
	} catch {
		console.log("   ⚠️  Could not check memory");
	}

	// Check 6: Process limits
	console.log("\n6️⃣ Checking process limits...");
	try {
		const ulimit = execSync("ulimit -a").toString();
		const relevantLimits = ulimit
			.split("\n")
			.filter((l) => l.includes("processes") || l.includes("open files") || l.includes("memory"));
		relevantLimits.forEach((l) => console.log(`   ${l.trim()}`));
	} catch {
		console.log("   ⚠️  Could not check process limits");
	}

	// Recommendations
	console.log("\n📋 Recommendations based on diagnosis:");
	console.log("\n1. Quick fixes to try:");
	console.log("   - Clear cache: rm -rf node_modules/.vite .vitest");
	console.log("   - Reinstall deps: rm -rf node_modules && bun install");
	console.log("   - Use fixed config: bun run scripts/fix-vitest-hanging.ts 1");

	console.log("\n2. Environment variables to try:");
	console.log("   - NODE_OPTIONS='--max-old-space-size=8192' npm test");
	console.log("   - DEBUG='vite:*,vitest:*' npm test");
	console.log("   - VITEST_POOL_FORK=1 npm test");

	console.log("\n3. Alternative test runners:");
	console.log("   - Pure Bun tests: bun test");
	console.log("   - Jest fallback: bun run scripts/fix-vitest-hanging.ts 4");
	console.log("   - Vitest with threads: VITEST_POOL=threads npm test");
}

function runWithTimeout(
	command: string,
	timeout: number
): Promise<{ success: boolean; error?: string }> {
	return new Promise((resolve) => {
		const child = spawn("bash", ["-c", command], {
			stdio: "pipe",
		});

		let output = "";
		let error = "";

		child.stdout.on("data", (data) => {
			output += data.toString();
		});

		child.stderr.on("data", (data) => {
			error += data.toString();
		});

		const timer = setTimeout(() => {
			child.kill("SIGTERM");
			resolve({ success: false, error: "Timeout" });
		}, timeout);

		child.on("exit", (code) => {
			clearTimeout(timer);
			resolve({
				success: code === 0,
				error: code !== 0 ? error || output : undefined,
			});
		});
	});
}

// Run diagnosis
diagnose().catch(console.error);
