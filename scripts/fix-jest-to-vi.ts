#!/usr/bin/env bun
/**
 * Fix jest.fn() to vi.fn() in test files
 */

import { readFileSync, writeFileSync } from "fs";
import { glob } from "glob";

async function fixJestToVi() {
	console.log("🔄 Converting jest.fn() to vi.fn() in test files...\n");

	// Find all test files
	const testFiles = await glob("**/*.test.{ts,tsx}", {
		ignore: ["node_modules/**", "dist/**", ".next/**"],
	});

	let fixedCount = 0;

	for (const file of testFiles) {
		try {
			const content = readFileSync(file, "utf-8");

			// Check if file uses jest.fn()
			if (content.includes("jest.fn()")) {
				// Replace jest.fn() with vi.fn()
				const updatedContent = content.replace(/jest\.fn\(\)/g, "vi.fn()");

				// Ensure vi is imported if not already
				if (!updatedContent.includes("import { vi }") && !updatedContent.includes("import {vi}")) {
					// Add vi import after the first import statement
					const firstImportMatch = updatedContent.match(/^import .* from .*;$/m);
					if (firstImportMatch) {
						const insertPosition = firstImportMatch.index! + firstImportMatch[0].length;
						const beforeImport = updatedContent.slice(0, insertPosition);
						const afterImport = updatedContent.slice(insertPosition);

						const finalContent = `${beforeImport}\nimport { vi } from "vitest";${afterImport}`;
						writeFileSync(file, finalContent);
					} else {
						// No imports found, add at the beginning
						writeFileSync(file, `import { vi } from "vitest";\n\n${updatedContent}`);
					}
				} else {
					writeFileSync(file, updatedContent);
				}

				console.log(`✅ Fixed: ${file}`);
				fixedCount++;
			}
		} catch (error) {
			console.error(`❌ Error processing ${file}:`, error);
		}
	}

	console.log(`\n✨ Fixed ${fixedCount} file(s)`);
}

fixJestToVi().catch(console.error);
