#!/usr/bin/env bun

/**
 * Transform Mock Imports for Bun
 *
 * This script transforms jest.mock calls to direct imports from mock files
 */

import { readFile, writeFile } from "fs/promises";
import { join } from "path";

const mockMappings: Record<string, string> = {
	"next/navigation": "./node_modules/next/navigation.mock.js",
	"next/link": "./node_modules/next/link.mock.js",
	"next/font/google": "./node_modules/next/font/google.mock.js",
	"lucide-react": "./node_modules/lucide-react.mock.js",
};

async function transformTestFile(filePath: string): Promise<boolean> {
	try {
		const content = await readFile(filePath, "utf-8");
		let transformed = content;
		let hasChanges = false;

		// Find all jest.mock calls
		const mockPattern = /jest\.mock\(['"]([^'"]+)['"]/g;
		const mocks = [...content.matchAll(mockPattern)];

		for (const match of mocks) {
			const moduleName = match[1];
			const mockPath = mockMappings[moduleName];

			if (mockPath) {
				// Comment out the jest.mock call
				transformed = transformed.replace(
					new RegExp(
						`jest\\.mock\\(['"]${moduleName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}['"][^)]*\\);?`,
						"g"
					),
					`// jest.mock('${moduleName}') - Using direct import instead`
				);

				// Add import alias at the top of the file
				const importAlias = moduleName.replace(/[^a-zA-Z0-9]/g, "_");
				const importStatement = `import * as ${importAlias}_mock from '${mockPath}';\n`;

				// Find where to insert the import (after other imports)
				const lastImportMatch = [...transformed.matchAll(/^import\s+.*$/gm)].pop();
				if (lastImportMatch && lastImportMatch.index !== undefined) {
					const insertPosition = lastImportMatch.index + lastImportMatch[0].length;
					transformed =
						transformed.slice(0, insertPosition) +
						"\n" +
						importStatement +
						transformed.slice(insertPosition);
				} else {
					// No imports found, add at the beginning
					transformed = importStatement + transformed;
				}

				hasChanges = true;
			}
		}

		// Also transform CSS mocks
		transformed = transformed.replace(
			/jest\.mock\(['"][^'"]+\.css['"]\s*,\s*\(\)\s*=>\s*\(\s*\{\s*\}\s*\)\)/g,
			"// CSS mock - handled by Bun"
		);

		if (hasChanges && transformed !== content) {
			await writeFile(filePath, transformed);
			console.log(`✅ Transformed: ${filePath}`);
			return true;
		}

		return false;
	} catch (error) {
		console.error(`❌ Error transforming ${filePath}:`, error);
		return false;
	}
}

async function transformExampleFile() {
	// Create an example of how to write Bun-compatible tests
	const exampleTest = `import { describe, expect, it, beforeEach } from "bun:test";
import { render, screen } from "@testing-library/react";
import React from "react";

// Import mocks directly
import * as nextNavigation from './node_modules/next/navigation.mock.js';
import * as nextLink from './node_modules/next/link.mock.js';
import * as nextFont from './node_modules/next/font/google.mock.js';
import * as lucideReact from './node_modules/lucide-react.mock.js';

// Example component test
import MyComponent from "./MyComponent";

describe("MyComponent", () => {
  beforeEach(() => {
    // Reset any mocks if needed
  });

  it("should render correctly", () => {
    render(<MyComponent />);
    
    const element = screen.getByText("Hello");
    expect(element).toBeInTheDocument();
  });
  
  it("should use mocked navigation", () => {
    const { useRouter } = nextNavigation;
    const router = useRouter();
    
    // Use the mock
    router.push('/test');
    
    // Assertions...
  });
});`;

	await writeFile(join(process.cwd(), "example-bun-test.test.tsx"), exampleTest);
	console.log("✅ Created example test file: example-bun-test.test.tsx");
}

async function main() {
	console.log("🔄 Transforming Mock Imports for Bun");
	console.log("===================================\n");

	// Get all test files from command line args or use defaults
	const testFiles = process.argv.slice(2);

	if (testFiles.length === 0) {
		console.log("Usage: bun run transform-mocks-for-bun.ts <test-file-paths>");
		console.log("\nCreating example file instead...");
		await transformExampleFile();
		return;
	}

	let transformedCount = 0;

	for (const file of testFiles) {
		if (await transformTestFile(file)) {
			transformedCount++;
		}
	}

	console.log(`\n✨ Transformed ${transformedCount} test files`);
	console.log("\n📋 Next steps:");
	console.log("1. Review the transformed files");
	console.log("2. Run tests with: bun test <file>");
	console.log("3. Mocks are imported directly from node_modules/*.mock.js");
}

main().catch(console.error);
