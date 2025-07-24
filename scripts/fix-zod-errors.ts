#!/usr/bin/env bun

/**
 * Script to fix common Zod-related TypeScript errors
 */

import { readFileSync, writeFileSync } from "fs";
import { glob } from "glob";

interface Fix {
	pattern: RegExp;
	replacement: string;
	description: string;
}

const fixes: Fix[] = [
	// Fix z.record() calls that need two arguments
	{
		pattern: /z\.record\(z\.any\(\)\)/g,
		replacement: "z.record(z.string(), z.any())",
		description: "Fix z.record(z.any()) to z.record(z.string(), z.any())",
	},
	{
		pattern: /z\.record\(z\.unknown\(\)\)/g,
		replacement: "z.record(z.string(), z.unknown())",
		description: "Fix z.record(z.unknown()) to z.record(z.string(), z.unknown())",
	},
	{
		pattern: /z\.record\(z\.string\(\)\)(?!\s*,)/g,
		replacement: "z.record(z.string(), z.string())",
		description: "Fix z.record(z.string()) to z.record(z.string(), z.string())",
	},

	// Fix ZodError.errors to ZodError.issues
	{
		pattern: /error\.errors/g,
		replacement: "error.issues",
		description: "Fix error.errors to error.issues for ZodError",
	},

	// Fix common API route parameter issues
	{
		pattern: /details: error\.issues,/g,
		replacement:
			'details: error.issues.map(issue => ({ field: issue.path.join("."), message: issue.message })),',
		description: "Fix error details mapping for API responses",
	},
];

async function fixFile(filePath: string): Promise<number> {
	try {
		let content = readFileSync(filePath, "utf-8");
		let fixCount = 0;

		for (const fix of fixes) {
			const matches = content.match(fix.pattern);
			if (matches) {
				content = content.replace(fix.pattern, fix.replacement);
				fixCount += matches.length;
				console.log(`  ✓ ${fix.description} (${matches.length} fixes)`);
			}
		}

		if (fixCount > 0) {
			writeFileSync(filePath, content, "utf-8");
		}

		return fixCount;
	} catch (error) {
		console.error(`Error fixing ${filePath}:`, error);
		return 0;
	}
}

async function main() {
	console.log("🔧 Fixing Zod-related TypeScript errors...\n");

	// Find all TypeScript files in API routes and lib directories
	const patterns = ["app/api/**/*.ts", "lib/**/*.ts", "src/**/*.ts"];

	let totalFiles = 0;
	let totalFixes = 0;

	for (const pattern of patterns) {
		const files = await glob(pattern, {
			ignore: ["**/*.test.ts", "**/*.spec.ts", "**/node_modules/**"],
		});

		for (const file of files) {
			const fixes = await fixFile(file);
			if (fixes > 0) {
				console.log(`📝 Fixed ${file} (${fixes} fixes)`);
				totalFiles++;
				totalFixes += fixes;
			}
		}
	}

	console.log(`\n✅ Fixed ${totalFixes} issues across ${totalFiles} files`);
}

if (import.meta.main) {
	main().catch(console.error);
}
