#!/usr/bin/env bun

import { readdir, readFile, writeFile } from "fs/promises";
import { join } from "path";

const testFileExtensions = [
	".test.ts",
	".test.tsx",
	".test.js",
	".test.jsx",
	".spec.ts",
	".spec.tsx",
	".spec.js",
	".spec.jsx",
];

async function getAllTestFiles(dir: string): Promise<string[]> {
	const files: string[] = [];

	async function walk(currentDir: string) {
		const entries = await readdir(currentDir, { withFileTypes: true });

		for (const entry of entries) {
			const fullPath = join(currentDir, entry.name);

			if (entry.isDirectory() && !entry.name.startsWith(".") && entry.name !== "node_modules") {
				await walk(fullPath);
			} else if (entry.isFile() && testFileExtensions.some((ext) => entry.name.endsWith(ext))) {
				files.push(fullPath);
			}
		}
	}

	await walk(dir);
	return files;
}

function fixJestReferences(content: string): { fixed: string; changes: number } {
	let fixed = content;
	let changes = 0;

	// Track if we have both vi and jest imports from vitest
	const hasViImport = /import\s+{[^}]*\bvi\b[^}]*}\s+from\s+['"]vitest['"]/.test(fixed);
	const hasJestImport = /import\s+{[^}]*\bjest\b[^}]*}\s+from\s+['"]vitest['"]/.test(fixed);

	// Replace jest.fn() with vi.fn()
	const jestFnRegex = /\bjest\.fn\(/g;
	fixed = fixed.replace(jestFnRegex, (match) => {
		changes++;
		return "vi.fn(";
	});

	// Replace jest.spyOn() with vi.spyOn()
	const jestSpyOnRegex = /\bjest\.spyOn\(/g;
	fixed = fixed.replace(jestSpyOnRegex, (match) => {
		changes++;
		return "vi.spyOn(";
	});

	// Replace jest.mock() with vi.mock()
	const jestMockRegex = /\bjest\.mock\(/g;
	fixed = fixed.replace(jestMockRegex, (match) => {
		changes++;
		return "vi.mock(";
	});

	// Replace jest.doMock() with vi.doMock()
	const jestDoMockRegex = /\bjest\.doMock\(/g;
	fixed = fixed.replace(jestDoMockRegex, (match) => {
		changes++;
		return "vi.doMock(";
	});

	// Replace jest.unmock() with vi.unmock()
	const jestUnmockRegex = /\bjest\.unmock\(/g;
	fixed = fixed.replace(jestUnmockRegex, (match) => {
		changes++;
		return "vi.unmock(";
	});

	// Replace jest.clearAllMocks() with vi.clearAllMocks()
	const jestClearAllMocksRegex = /\bjest\.clearAllMocks\(/g;
	fixed = fixed.replace(jestClearAllMocksRegex, (match) => {
		changes++;
		return "vi.clearAllMocks(";
	});

	// Replace jest.resetAllMocks() with vi.resetAllMocks()
	const jestResetAllMocksRegex = /\bjest\.resetAllMocks\(/g;
	fixed = fixed.replace(jestResetAllMocksRegex, (match) => {
		changes++;
		return "vi.resetAllMocks(";
	});

	// Replace jest.restoreAllMocks() with vi.restoreAllMocks()
	const jestRestoreAllMocksRegex = /\bjest\.restoreAllMocks\(/g;
	fixed = fixed.replace(jestRestoreAllMocksRegex, (match) => {
		changes++;
		return "vi.restoreAllMocks(";
	});

	// Replace jest.mocked() with vi.mocked()
	const jestMockedRegex = /\bjest\.mocked\(/g;
	fixed = fixed.replace(jestMockedRegex, (match) => {
		changes++;
		return "vi.mocked(";
	});

	// Replace jest.requireActual() with vi.importActual()
	const jestRequireActualRegex = /\bjest\.requireActual\(/g;
	fixed = fixed.replace(jestRequireActualRegex, (match) => {
		changes++;
		return "vi.importActual(";
	});

	// Replace jest.resetModules() with vi.resetModules()
	const jestResetModulesRegex = /\bjest\.resetModules\(/g;
	fixed = fixed.replace(jestResetModulesRegex, (match) => {
		changes++;
		return "vi.resetModules(";
	});

	// Replace jest.isolateModules() with vi.isolateModules()
	const jestIsolateModulesRegex = /\bjest\.isolateModules\(/g;
	fixed = fixed.replace(jestIsolateModulesRegex, (match) => {
		changes++;
		return "vi.isolateModules(";
	});

	// Replace timer-related methods
	fixed = fixed.replace(/\bjest\.useFakeTimers\(/g, () => {
		changes++;
		return "vi.useFakeTimers(";
	});
	fixed = fixed.replace(/\bjest\.useRealTimers\(/g, () => {
		changes++;
		return "vi.useRealTimers(";
	});
	fixed = fixed.replace(/\bjest\.runAllTicks\(/g, () => {
		changes++;
		return "vi.runAllTicks(";
	});
	fixed = fixed.replace(/\bjest\.runAllTimers\(/g, () => {
		changes++;
		return "vi.runAllTimers(";
	});
	fixed = fixed.replace(/\bjest\.runOnlyPendingTimers\(/g, () => {
		changes++;
		return "vi.runOnlyPendingTimers(";
	});
	fixed = fixed.replace(/\bjest\.advanceTimersByTime\(/g, () => {
		changes++;
		return "vi.advanceTimersByTime(";
	});
	fixed = fixed.replace(/\bjest\.setSystemTime\(/g, () => {
		changes++;
		return "vi.setSystemTime(";
	});
	fixed = fixed.replace(/\bjest\.getRealSystemTime\(/g, () => {
		changes++;
		return "vi.getRealSystemTime(";
	});
	fixed = fixed.replace(/\bjest\.clearAllTimers\(/g, () => {
		changes++;
		return "vi.clearAllTimers(";
	});
	fixed = fixed.replace(/\bjest\.getTimerCount\(/g, () => {
		changes++;
		return "vi.getTimerCount(";
	});
	fixed = fixed.replace(/\bjest\.now\(/g, () => {
		changes++;
		return "vi.now(";
	});

	// If we made changes and had jest import but not vi import, we need to handle imports
	if (changes > 0 && hasJestImport && !hasViImport) {
		// Update the import to include vi if it only had jest
		fixed = fixed.replace(
			/import\s+{([^}]*\bjest\b[^}]*)}\s+from\s+['"]vitest['"]/,
			(match, imports) => {
				// Remove jest from imports and add vi
				const importList = imports
					.split(",")
					.map((s: string) => s.trim())
					.filter((s: string) => s !== "jest");
				importList.push("vi");
				return `import { ${importList.join(", ")} } from "vitest"`;
			}
		);
	} else if (changes > 0 && hasJestImport && hasViImport) {
		// If we have both, just remove jest from the imports
		fixed = fixed.replace(/import\s+{([^}]*)}\s+from\s+['"]vitest['"]/g, (match, imports) => {
			const importList = imports
				.split(",")
				.map((s: string) => s.trim())
				.filter((s: string) => s !== "jest");
			return `import { ${importList.join(", ")} } from "vitest"`;
		});
	}

	// Handle cases where jest is imported but not used (remove it from imports)
	if (!fixed.includes("jest.") && hasJestImport) {
		fixed = fixed.replace(/import\s+{([^}]*)}\s+from\s+['"]vitest['"]/g, (match, imports) => {
			const importList = imports
				.split(",")
				.map((s: string) => s.trim())
				.filter((s: string) => s !== "jest");
			return `import { ${importList.join(", ")} } from "vitest"`;
		});
	}

	return { fixed, changes };
}

async function processFile(filePath: string): Promise<boolean> {
	try {
		const content = await readFile(filePath, "utf-8");
		const { fixed, changes } = fixJestReferences(content);

		if (changes > 0) {
			await writeFile(filePath, fixed, "utf-8");
			console.log(`✅ Fixed ${changes} Jest references in: ${filePath}`);
			return true;
		}

		return false;
	} catch (error) {
		console.error(`❌ Error processing ${filePath}:`, error);
		return false;
	}
}

async function main() {
	console.log("🔍 Searching for test files with Jest references...\n");

	const testFiles = await getAllTestFiles(process.cwd());
	console.log(`Found ${testFiles.length} test files to check.\n`);

	let filesFixed = 0;
	let totalFiles = 0;

	for (const file of testFiles) {
		// Only process files that might contain jest references
		const content = await readFile(file, "utf-8");
		if (content.includes("jest.")) {
			totalFiles++;
			const fixed = await processFile(file);
			if (fixed) filesFixed++;
		}
	}

	console.log("\n✨ Migration complete!");
	console.log(`📊 Fixed ${filesFixed} out of ${totalFiles} files containing Jest references.`);
}

main().catch(console.error);
