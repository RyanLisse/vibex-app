#!/usr/bin/env bun

/**
 * Fix Vitest Mocks for Bun Compatibility
 *
 * This script transforms test files to use Bun-compatible mocking patterns
 * instead of vi.mock which causes issues with Bun's module loading.
 */

import { readdir, readFile, writeFile } from "fs/promises";
import { join } from "path";

const TEST_FILE_PATTERN = /\.(test|spec)\.(ts|tsx)$/;

async function findTestFiles(dir: string): Promise<string[]> {
	const files: string[] = [];

	async function walk(currentDir: string) {
		const entries = await readdir(currentDir, { withFileTypes: true });

		for (const entry of entries) {
			const fullPath = join(currentDir, entry.name);

			if (entry.isDirectory() && !entry.name.startsWith(".") && entry.name !== "node_modules") {
				await walk(fullPath);
			} else if (entry.isFile() && TEST_FILE_PATTERN.test(entry.name)) {
				files.push(fullPath);
			}
		}
	}

	await walk(dir);
	return files;
}

function transformViMockToBunCompatible(content: string): string {
	let transformed = content;

	// Pattern 1: Transform hoisted vi.mock calls
	// vi.mock("module", () => ({ ... })) -> manual mock setup
	transformed = transformed.replace(
		/vi\.mock\(["']([^"']+)["'],\s*\(\)\s*=>\s*\(({[\s\S]*?})\)\)/gm,
		(match, moduleName, mockImplementation) => {
			return `// Manual mock for ${moduleName}
const ${moduleName
				.split("/")
				.pop()
				?.replace(/[^a-zA-Z0-9]/g, "_")}Mock = ${mockImplementation};`;
		}
	);

	// Pattern 2: Simple vi.mock without implementation
	transformed = transformed.replace(/vi\.mock\(["']([^"']+)["']\);?\s*$/gm, (match, moduleName) => {
		return `// TODO: Add manual mock for ${moduleName}`;
	});

	// Pattern 3: Add vi import if missing but vi is used
	if (transformed.includes("vi.") && !transformed.includes("import { vi }")) {
		transformed = `import { vi } from "vitest";\n${transformed}`;
	}

	return transformed;
}

async function fixTestFile(filePath: string): Promise<boolean> {
	try {
		const content = await readFile(filePath, "utf-8");

		// Check if file uses vi.mock
		if (!content.includes("vi.mock")) {
			return false;
		}

		const transformed = transformViMockToBunCompatible(content);

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
	console.log("🔍 Searching for test files with vi.mock issues...\n");

	const testFiles = await findTestFiles(process.cwd());
	console.log(`Found ${testFiles.length} test files\n`);

	let fixedCount = 0;

	for (const file of testFiles) {
		if (await fixTestFile(file)) {
			fixedCount++;
		}
	}

	console.log(`\n✨ Fixed ${fixedCount} test files`);
	console.log("\n📝 Next steps:");
	console.log("1. Review the transformed test files");
	console.log("2. Update any manual mocks as needed");
	console.log("3. Run 'bun test' to verify the fixes");
}

main().catch(console.error);
