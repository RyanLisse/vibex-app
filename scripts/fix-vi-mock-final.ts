#!/usr/bin/env bun

/**
 * Final Vi.Mock Fix for Bun Compatibility
 *
 * This script properly transforms all vi.mock calls to jest.mock
 * which works better with Bun.
 */

import { mkdir, readdir, readFile, writeFile } from "fs/promises";
import { dirname, join } from "path";

const TEST_FILE_PATTERN = /\.(test|spec)\.(ts|tsx|js|jsx)$/;

async function findTestFiles(dir: string): Promise<string[]> {
	const files: string[] = [];

	async function walk(currentDir: string) {
		try {
			const entries = await readdir(currentDir, { withFileTypes: true });

			for (const entry of entries) {
				const fullPath = join(currentDir, entry.name);

				if (
					entry.isDirectory() &&
					!entry.name.startsWith(".") &&
					entry.name !== "node_modules" &&
					entry.name !== "dist" &&
					entry.name !== ".next" &&
					entry.name !== "tests-backup*"
				) {
					await walk(fullPath);
				} else if (entry.isFile() && TEST_FILE_PATTERN.test(entry.name)) {
					files.push(fullPath);
				}
			}
		} catch (err) {
			// Skip directories we can't read
		}
	}

	await walk(dir);
	return files;
}

function transformViMockToJestMock(content: string, filePath: string): string {
	let transformed = content;
	let hasReactMocks = false;

	// Check if file contains React/JSX
	const isReactFile =
		filePath.endsWith(".tsx") ||
		filePath.endsWith(".jsx") ||
		content.includes("React.") ||
		content.includes("<") ||
		content.includes("/>");

	// Replace vi.mock with jest.mock
	transformed = transformed.replace(/\bvi\.mock\(/g, "jest.mock(");

	// Check if we need React import for JSX in mocks
	if (
		isReactFile &&
		!transformed.includes("import React") &&
		!transformed.includes("import * as React")
	) {
		// Check if any mock contains JSX
		const mockPattern = /jest\.mock\([^)]+,\s*\(\)\s*=>\s*\([^)]*<[^>]+>/;
		if (mockPattern.test(transformed)) {
			hasReactMocks = true;
		}
	}

	// Replace other vi methods with jest equivalents
	transformed = transformed.replace(/\bvi\.fn\(/g, "jest.fn(");
	transformed = transformed.replace(/\bvi\.spyOn\(/g, "jest.spyOn(");
	transformed = transformed.replace(/\bvi\.clearAllMocks\(/g, "jest.clearAllMocks(");
	transformed = transformed.replace(/\bvi\.resetAllMocks\(/g, "jest.resetAllMocks(");
	transformed = transformed.replace(/\bvi\.restoreAllMocks\(/g, "jest.restoreAllMocks(");
	transformed = transformed.replace(/\bvi\.mocked\(/g, "jest.mocked(");
	transformed = transformed.replace(/\bvi\.unmock\(/g, "jest.unmock(");
	transformed = transformed.replace(/\bvi\.doMock\(/g, "jest.doMock(");
	transformed = transformed.replace(/\bvi\.dontMock\(/g, "jest.dontMock(");
	transformed = transformed.replace(/\bvi\.requireActual\(/g, "jest.requireActual(");
	transformed = transformed.replace(/\bvi\.requireMock\(/g, "jest.requireMock(");

	// Also replace mock.fn, mock.spyOn etc.
	transformed = transformed.replace(/\bmock\.fn\(/g, "jest.fn(");
	transformed = transformed.replace(/\bmock\.spyOn\(/g, "jest.spyOn(");

	// Update imports
	if (
		transformed.includes("jest.") &&
		!transformed.includes("import { jest }") &&
		!transformed.includes("import jest")
	) {
		// Check if we're importing from vitest
		const vitestImportMatch = transformed.match(/import\s*{([^}]+)}\s*from\s*["']vitest["']/);
		if (vitestImportMatch) {
			const imports = vitestImportMatch[1].split(",").map((i) => i.trim());
			const hasJest = imports.includes("jest");
			const hasVi = imports.includes("vi");

			if (!hasJest) {
				imports.push("jest");
			}

			// Remove vi if it's no longer used
			if (hasVi && !transformed.includes("vi.") && transformed !== content) {
				const viIndex = imports.indexOf("vi");
				if (viIndex > -1) {
					imports.splice(viIndex, 1);
				}
			}

			transformed = transformed.replace(
				vitestImportMatch[0],
				`import { ${imports.join(", ")} } from "vitest"`
			);
		} else {
			// Add jest import
			const firstImport = transformed.match(/^import\s+/m);
			if (firstImport) {
				transformed = transformed.replace(
					firstImport[0],
					`import { jest } from "vitest";\n${firstImport[0]}`
				);
			} else {
				transformed = `import { jest } from "vitest";\n${transformed}`;
			}
		}
	}

	// Add React import if needed
	if (hasReactMocks) {
		const firstImport = transformed.match(/^import\s+/m);
		if (firstImport) {
			transformed = transformed.replace(
				firstImport[0],
				`import React from "react";\n${firstImport[0]}`
			);
		} else {
			transformed = `import React from "react";\n${transformed}`;
		}
	}

	return transformed;
}

async function createGlobalMocks() {
	const mocksDir = join(process.cwd(), "__mocks__");

	// Create next/navigation mock
	const nextNavigationMock = `module.exports = {
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    pathname: '/',
    query: {},
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
};`;

	// Create next/link mock
	const nextLinkMock = `const React = require('react');

module.exports = {
  __esModule: true,
  default: ({ children, href, ...props }) => 
    React.createElement('a', { href, ...props }, children)
};`;

	// Create next/font/google mock
	const nextFontMock = `module.exports = {
  Inter: () => ({ className: 'font-inter', style: { fontFamily: 'Inter' } }),
  Roboto: () => ({ className: 'font-roboto', style: { fontFamily: 'Roboto' } }),
  Roboto_Mono: () => ({ className: 'font-roboto-mono', style: { fontFamily: 'Roboto Mono' } }),
};`;

	// Create lucide-react mock
	const lucideReactMock = `const React = require('react');

// Create a proxy that returns mock components for any icon
const handler = {
  get(target, prop) {
    if (typeof prop === 'string' && prop[0] === prop[0].toUpperCase()) {
      return ({ className, ...props }) => 
        React.createElement('svg', { 
          className, 
          'data-testid': \`\${prop.toLowerCase()}-icon\`,
          ...props 
        });
    }
    return undefined;
  }
};

module.exports = new Proxy({}, handler);`;

	try {
		// Create __mocks__ directory
		await mkdir(mocksDir, { recursive: true });

		// Create subdirectories for scoped packages
		await mkdir(join(mocksDir, "next"), { recursive: true });
		await mkdir(join(mocksDir, "next", "font"), { recursive: true });

		// Write mock files
		await writeFile(join(mocksDir, "next", "navigation.js"), nextNavigationMock);
		await writeFile(join(mocksDir, "next", "link.js"), nextLinkMock);
		await writeFile(join(mocksDir, "next", "font", "google.js"), nextFontMock);
		await writeFile(join(mocksDir, "lucide-react.js"), lucideReactMock);

		console.log("✅ Created global __mocks__ directory with common mocks");
	} catch (error) {
		console.error("Error creating global mocks:", error);
	}
}

async function fixTestFile(filePath: string): Promise<boolean> {
	try {
		const content = await readFile(filePath, "utf-8");

		// Check if file uses vi.mock or other vi methods
		if (!content.includes("vi.")) {
			return false;
		}

		const transformed = transformViMockToJestMock(content, filePath);

		if (transformed !== content) {
			await writeFile(filePath, transformed);
			console.log(`✅ Fixed: ${filePath}`);
			return true;
		}

		return false;
	} catch (error) {
		console.error(`❌ Error processing ${filePath}:`, error);
		return false;
	}
}

async function main() {
	console.log("🔧 Final Vi.Mock Fix for Bun Compatibility");
	console.log("=========================================\n");

	// Create global mocks first
	await createGlobalMocks();

	console.log("\n🔎 Searching for test files...");

	const testFiles = await findTestFiles(process.cwd());
	console.log(`Found ${testFiles.length} test files\n`);

	let fixedCount = 0;
	let processedCount = 0;

	for (const file of testFiles) {
		processedCount++;
		if (processedCount % 50 === 0) {
			console.log(`Progress: ${processedCount}/${testFiles.length} files processed...`);
		}

		if (await fixTestFile(file)) {
			fixedCount++;
		}
	}

	console.log("\n✨ Summary:");
	console.log(`   - Processed ${testFiles.length} test files`);
	console.log(`   - Fixed ${fixedCount} files`);
	console.log("   - Replaced vi.mock with jest.mock");
	console.log("   - Created global __mocks__ directory");

	console.log("\n📋 Next steps:");
	console.log("1. Run 'bun test' to verify the fixes");
	console.log("2. Check for any remaining test failures");
	console.log("3. The __mocks__ directory contains common mocks");
}

main().catch(console.error);
