#!/usr/bin/env bun

/**
 * Comprehensive Vi.Mock Fix for Bun Compatibility
 *
 * This script provides a complete solution for transforming vi.mock calls
 * to Bun-compatible patterns, including:
 * - Manual mock implementations
 * - __mocks__ directory creation
 * - jest.mock as fallback
 * - Common module patterns
 */

import { mkdir, readdir, readFile, stat, writeFile } from "fs/promises";
import { basename, dirname, join } from "path";

const TEST_FILE_PATTERN = /\.(test|spec)\.(ts|tsx|js|jsx)$/;

// Common mocked modules and their implementations
const COMMON_MOCKS = {
	"next/navigation": `{
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
  }`,

	"next/link": `{
    default: ({ children, href, ...props }: any) => 
      React.createElement('a', { href, ...props }, children)
  }`,

	"next/font/google": `{
    Inter: () => ({ className: 'font-inter' }),
    Roboto: () => ({ className: 'font-roboto' }),
  }`,

	"lucide-react": `{
    // Mock all icons as simple divs
    ...new Proxy({}, {
      get: (target, prop) => {
        if (typeof prop === 'string' && prop[0] === prop[0].toUpperCase()) {
          return ({ className, ...props }: any) => 
            React.createElement('div', { className, 'data-testid': \`\${prop.toLowerCase()}-icon\`, ...props });
        }
        return undefined;
      }
    })
  }`,

	"@/components/ui/theme-toggle": `{
    ThemeToggle: () => React.createElement('div', { 'data-testid': 'theme-toggle' }, 'Theme Toggle')
  }`,

	react: `{
    ...jest.requireActual('react'),
    // Add any React mocks here
  }`,

	// CSS imports
	"*.css": "{}",
	"*.scss": "{}",
	"*.module.css": "{}",
};

interface MockInfo {
	moduleName: string;
	mockImpl?: string;
	isDefault?: boolean;
	isCSS?: boolean;
}

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
					entry.name !== ".next"
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

function extractMocks(content: string): MockInfo[] {
	const mocks: MockInfo[] = [];

	// Pattern 1: vi.mock with implementation
	const mockWithImplPattern = /vi\.mock\(["']([^"']+)["'],\s*\(\)\s*=>\s*(\{[\s\S]*?\})\)/gm;
	let match;

	while ((match = mockWithImplPattern.exec(content)) !== null) {
		mocks.push({
			moduleName: match[1],
			mockImpl: match[2],
			isCSS: match[1].endsWith(".css") || match[1].endsWith(".scss"),
		});
	}

	// Pattern 2: vi.mock without implementation
	const simpleMockPattern = /vi\.mock\(["']([^"']+)["']\)/gm;

	while ((match = simpleMockPattern.exec(content)) !== null) {
		if (!mocks.find((m) => m.moduleName === match[1])) {
			mocks.push({
				moduleName: match[1],
				isCSS: match[1].endsWith(".css") || match[1].endsWith(".scss"),
			});
		}
	}

	return mocks;
}

function generateMockImplementation(moduleName: string): string {
	// Check if we have a common mock for this module
	for (const [pattern, impl] of Object.entries(COMMON_MOCKS)) {
		if (pattern.includes("*")) {
			const regex = new RegExp(pattern.replace("*", ".*"));
			if (regex.test(moduleName)) {
				return impl;
			}
		} else if (moduleName === pattern) {
			return impl;
		}
	}

	// Generate a default mock based on the module name
	const moduleParts = moduleName.split("/");
	const lastName = moduleParts[moduleParts.length - 1];
	const componentName = lastName.replace(/[^a-zA-Z0-9]/g, "");

	if (moduleName.includes("component") || moduleName.includes("ui")) {
		return `{
      default: () => React.createElement('div', { 'data-testid': '${componentName.toLowerCase()}' }, 'Mock ${componentName}'),
      ${componentName}: () => React.createElement('div', { 'data-testid': '${componentName.toLowerCase()}' }, 'Mock ${componentName}')
    }`;
	}

	if (moduleName.includes("hook") || moduleName.includes("use")) {
		return `{
      default: jest.fn(() => ({ data: null, loading: false, error: null })),
      ${lastName}: jest.fn(() => ({ data: null, loading: false, error: null }))
    }`;
	}

	return `{
    default: jest.fn(),
    ...jest.requireActual('${moduleName}')
  }`;
}

async function createMocksDirectory(testFilePath: string): Promise<string> {
	const testDir = dirname(testFilePath);
	const mocksDir = join(testDir, "__mocks__");

	try {
		await mkdir(mocksDir, { recursive: true });
	} catch (err) {
		// Directory might already exist
	}

	return mocksDir;
}

async function createMockFile(
	mocksDir: string,
	moduleName: string,
	mockImpl: string
): Promise<void> {
	// Handle scoped packages and nested paths
	const parts = moduleName.split("/");
	let mockFileName: string;
	let mockFilePath: string;

	if (moduleName.startsWith("@")) {
		// Scoped package: @scope/package -> @scope__package.js
		mockFileName = parts.slice(0, 2).join("__") + ".js";
		mockFilePath = join(mocksDir, mockFileName);
	} else if (parts.length > 1) {
		// Nested path: create subdirectories
		const dirs = parts.slice(0, -1);
		const fileName = parts[parts.length - 1] + ".js";
		const subDir = join(mocksDir, ...dirs);
		await mkdir(subDir, { recursive: true });
		mockFilePath = join(subDir, fileName);
	} else {
		// Simple module
		mockFileName = moduleName + ".js";
		mockFilePath = join(mocksDir, mockFileName);
	}

	const mockContent = `// Auto-generated mock for ${moduleName}
module.exports = ${mockImpl};
`;

	await writeFile(mockFilePath, mockContent);
}

function transformContent(content: string, mocks: MockInfo[]): string {
	let transformed = content;

	// Remove all vi.mock calls
	transformed = transformed.replace(
		/vi\.mock\(["'][^"']+["'](?:,\s*\(\)\s*=>\s*\{[\s\S]*?\})?\);?\s*/gm,
		""
	);

	// Add jest.mock calls instead
	const mockCalls: string[] = [];
	const imports: Set<string> = new Set();

	// Check if we need React
	if (mocks.some((m) => generateMockImplementation(m.moduleName).includes("React"))) {
		imports.add("React");
	}

	for (const mock of mocks) {
		if (mock.isCSS) {
			// CSS files don't need mocking with jest
			continue;
		}

		const impl = mock.mockImpl || generateMockImplementation(mock.moduleName);
		mockCalls.push(`jest.mock('${mock.moduleName}', () => (${impl}));`);
	}

	// Add imports at the top
	let importStatements = "";
	if (
		imports.has("React") &&
		!transformed.includes("import React") &&
		!transformed.includes("import * as React")
	) {
		importStatements += `import React from 'react';\n`;
	}

	// Ensure we have jest available
	if (!transformed.includes("import { jest }") && !transformed.includes("import jest")) {
		// Check if we're already importing from vitest
		if (transformed.match(/import\s*{([^}]+)}\s*from\s*["']vitest["']/)) {
			transformed = transformed.replace(
				/import\s*{([^}]+)}\s*from\s*["']vitest["']/,
				(match, imports) => {
					const importList = imports.split(",").map((i: string) => i.trim());
					if (!importList.includes("jest")) {
						importList.push("jest");
					}
					return `import { ${importList.join(", ")} } from "vitest"`;
				}
			);
		} else {
			importStatements += `import { jest } from '@jest/globals';\n`;
		}
	}

	// Find the right place to insert mocks (after imports)
	const importEndMatch = transformed.match(/(?:^|\n)((?:import[^;]+;\s*\n?)*)/);
	if (importEndMatch) {
		const importsEnd = importEndMatch.index! + importEndMatch[0].length;
		transformed =
			transformed.slice(0, importsEnd) +
			"\n" +
			mockCalls.join("\n") +
			"\n\n" +
			transformed.slice(importsEnd);
	} else {
		// No imports found, add at the beginning
		transformed = importStatements + mockCalls.join("\n") + "\n\n" + transformed;
	}

	// If we added import statements, prepend them
	if (importStatements) {
		transformed = importStatements + transformed;
	}

	// Fix any remaining vi references that should be jest
	transformed = transformed.replace(/\bvi\.(fn|spyOn|clearAllMocks|resetAllMocks)\(/g, "jest.$1(");

	// Fix mock.spyOn to jest.spyOn
	transformed = transformed.replace(/\bmock\.spyOn\(/g, "jest.spyOn(");

	return transformed;
}

async function fixTestFile(filePath: string): Promise<boolean> {
	try {
		const content = await readFile(filePath, "utf-8");

		// Check if file uses vi.mock
		if (!content.includes("vi.mock")) {
			return false;
		}

		console.log(`\n📝 Processing: ${filePath}`);

		// Extract all mocks
		const mocks = extractMocks(content);
		console.log(`   Found ${mocks.length} vi.mock calls`);

		// Transform the content
		const transformed = transformContent(content, mocks);

		// Write the transformed file
		await writeFile(filePath, transformed);
		console.log("   ✅ Transformed test file");

		// Create __mocks__ directory for frequently used mocks
		const frequentlyMocked = ["next/navigation", "next/link", "next/font/google"];
		const mocksToCreate = mocks.filter((m) => frequentlyMocked.includes(m.moduleName));

		if (mocksToCreate.length > 0) {
			const mocksDir = await createMocksDirectory(filePath);
			for (const mock of mocksToCreate) {
				const impl = mock.mockImpl || generateMockImplementation(mock.moduleName);
				await createMockFile(mocksDir, mock.moduleName, impl);
				console.log(`   📁 Created mock file for ${mock.moduleName}`);
			}
		}

		return true;
	} catch (error) {
		console.error(`❌ Error processing ${filePath}:`, error);
		return false;
	}
}

async function createGlobalMocks() {
	console.log("\n🌍 Creating global __mocks__ directory...");

	const globalMocksDir = join(process.cwd(), "__mocks__");
	await mkdir(globalMocksDir, { recursive: true });

	// Create commonly used mocks
	const globalMocks = [
		{ name: "next/navigation", impl: COMMON_MOCKS["next/navigation"] },
		{ name: "next/link", impl: COMMON_MOCKS["next/link"] },
		{ name: "next/font/google", impl: COMMON_MOCKS["next/font/google"] },
		{ name: "lucide-react", impl: COMMON_MOCKS["lucide-react"] },
	];

	for (const mock of globalMocks) {
		await createMockFile(globalMocksDir, mock.name, mock.impl);
		console.log(`   ✅ Created global mock for ${mock.name}`);
	}
}

async function main() {
	console.log("🔍 Comprehensive Vi.Mock Fix for Bun Compatibility");
	console.log("================================================\n");

	// Create global mocks first
	await createGlobalMocks();

	console.log("\n🔎 Searching for test files with vi.mock issues...");

	const testFiles = await findTestFiles(process.cwd());
	console.log(`Found ${testFiles.length} test files`);

	let fixedCount = 0;

	for (const file of testFiles) {
		if (await fixTestFile(file)) {
			fixedCount++;
		}
	}

	console.log(`\n✨ Fixed ${fixedCount} test files`);
	console.log("\n📋 Summary:");
	console.log("1. Replaced vi.mock with jest.mock");
	console.log("2. Created __mocks__ directories for common modules");
	console.log("3. Generated mock implementations for all modules");
	console.log("\n🚀 Next steps:");
	console.log("1. Run 'bun test' to verify the fixes");
	console.log("2. Adjust any custom mock implementations as needed");
	console.log("3. Check the __mocks__ directories for generated mocks");
}

main().catch(console.error);
