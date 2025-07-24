#!/usr/bin/env bun

/**
 * Fix Vitest Hanging Issue
 *
 * This script provides multiple strategies to fix the ESBuild hanging issue
 * when running Vitest tests.
 */

import { execSync } from "child_process";
import { existsSync, readFileSync, writeFileSync } from "fs";
import path from "path";

const strategies = {
	1: "Use fixed configuration without ESBuild",
	2: "Use SWC-based configuration",
	3: "Use Bun-optimized configuration",
	4: "Use Jest as fallback",
	5: "Disable problematic optimizations",
};

console.log("🔧 Vitest Hanging Fix Tool");
console.log("========================\n");

console.log("Available strategies:");
Object.entries(strategies).forEach(([num, desc]) => {
	console.log(`  ${num}. ${desc}`);
});

const strategy = process.argv[2] || "1";

switch (strategy) {
	case "1":
		fixWithoutESBuild();
		break;
	case "2":
		fixWithSWC();
		break;
	case "3":
		fixWithBunOptimized();
		break;
	case "4":
		useJestFallback();
		break;
	case "5":
		disableOptimizations();
		break;
	default:
		console.error("❌ Invalid strategy. Use 1-5.");
		process.exit(1);
}

function fixWithoutESBuild() {
	console.log("\n📋 Strategy 1: Using configuration without ESBuild...");

	// Backup current config
	if (existsSync("vitest.config.ts")) {
		execSync("cp vitest.config.ts vitest.config.ts.backup");
		console.log("✅ Backed up current config");
	}

	// Use the fixed config
	execSync("cp vitest.config.fixed.ts vitest.config.ts");
	console.log("✅ Applied fixed configuration");

	// Update package.json test scripts
	updateTestScripts("vitest run --config=vitest.config.ts");

	console.log("\n✨ Configuration updated! Try running: npm test");
}

function fixWithSWC() {
	console.log("\n📋 Strategy 2: Using SWC configuration...");

	// Check if SWC is installed
	try {
		require.resolve("@vitejs/plugin-react-swc");
	} catch {
		console.log("📦 Installing @vitejs/plugin-react-swc...");
		execSync("bun add -D @vitejs/plugin-react-swc");
	}

	// Update the SWC config to use the plugin
	const swcConfig = readFileSync("vitest.config.swc.ts", "utf-8");
	const updatedConfig = swcConfig.replace(
		'import react from "@vitejs/plugin-react";',
		'import react from "@vitejs/plugin-react-swc";'
	);
	writeFileSync("vitest.config.swc.ts", updatedConfig);

	// Use the SWC config
	execSync("cp vitest.config.swc.ts vitest.config.ts");
	console.log("✅ Applied SWC configuration");

	updateTestScripts("vitest run --config=vitest.config.ts");

	console.log("\n✨ SWC configuration applied! Try running: npm test");
}

function fixWithBunOptimized() {
	console.log("\n📋 Strategy 3: Using Bun-optimized configuration...");

	// Use the Bun config
	execSync("cp vitest.config.bun.ts vitest.config.ts");
	console.log("✅ Applied Bun-optimized configuration");

	updateTestScripts("vitest run --config=vitest.config.ts");

	console.log("\n✨ Bun configuration applied! Try running: npm test");
}

function useJestFallback() {
	console.log("\n📋 Strategy 4: Using Jest as fallback...");

	// Check if Jest dependencies are installed
	const deps = [
		"jest",
		"@types/jest",
		"babel-jest",
		"@babel/preset-env",
		"@babel/preset-typescript",
		"@babel/preset-react",
	];
	const missing = deps.filter((dep) => {
		try {
			require.resolve(dep);
			return false;
		} catch {
			return true;
		}
	});

	if (missing.length > 0) {
		console.log(`📦 Installing missing dependencies: ${missing.join(", ")}...`);
		execSync(`bun add -D ${missing.join(" ")}`);
	}

	// Update test scripts to use Jest
	updateTestScripts("jest --config=jest.config.fallback.js");

	console.log("\n✨ Jest fallback configured! Try running: npm test");
}

function disableOptimizations() {
	console.log("\n📋 Strategy 5: Disabling problematic optimizations...");

	const configPath = "vitest.config.ts";
	let config = readFileSync(configPath, "utf-8");

	// Disable ESBuild
	config = config.replace(/esbuild:\s*{[^}]*}/g, "esbuild: false");

	// Disable optimizeDeps
	if (!config.includes("optimizeDeps")) {
		config = config.replace(
			"export default defineConfig({",
			`export default defineConfig({
  optimizeDeps: {
    disabled: true,
  },`
		);
	}

	// Change pool to forks
	config = config.replace(/pool:\s*"threads"/g, 'pool: "forks"');

	// Disable inline deps
	config = config.replace(/inline:\s*\[[^\]]*\]/g, "inline: false");

	writeFileSync(configPath, config);
	console.log("✅ Disabled problematic optimizations");

	console.log("\n✨ Optimizations disabled! Try running: npm test");
}

function updateTestScripts(command: string) {
	const packagePath = "package.json";
	const pkg = JSON.parse(readFileSync(packagePath, "utf-8"));

	// Update component test scripts
	pkg.scripts["test:unit:components"] = command;
	pkg.scripts["test:unit:components:watch"] = command.replace("run", "") + " --watch";
	pkg.scripts["test:unit:components:coverage"] = command + " --coverage";

	writeFileSync(packagePath, JSON.stringify(pkg, null, 2));
	console.log("✅ Updated package.json test scripts");
}

console.log("\n💡 Additional tips:");
console.log("- If tests still hang, try: NODE_OPTIONS='--max-old-space-size=8192' npm test");
console.log("- Clear cache: rm -rf node_modules/.vite");
console.log("- For debugging: DEBUG=vite:* npm test");
console.log("- Check for circular dependencies: npx madge --circular lib/");
