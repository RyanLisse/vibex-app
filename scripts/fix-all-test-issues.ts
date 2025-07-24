#!/usr/bin/env bun

import { readFile, writeFile } from "fs/promises";
import { glob } from "glob";
import path from "path";

async function fixAllTestIssues() {
	console.log("🔧 Fixing all test issues...");

	// 1. Fix import paths in test files
	await fixImportPaths();

	// 2. Fix mock issues in test files
	await fixMockIssues();

	// 3. Fix test timeouts
	await fixTestTimeouts();

	console.log("✨ All test fixes complete!");
}

async function fixImportPaths() {
	console.log("\n📦 Fixing import paths...");

	const testFiles = await glob("**/*.test.{ts,tsx,js,jsx}", {
		ignore: ["node_modules/**", ".next/**", "dist/**", "coverage/**"],
		absolute: true,
	});

	let fixedCount = 0;

	for (const file of testFiles) {
		try {
			let content = await readFile(file, "utf-8");
			let updated = false;

			// Fix imports from lib when inside lib directory
			if (file.includes("/lib/") && content.includes("from '@/lib/")) {
				const relativePath = path.relative(path.dirname(file), path.join(process.cwd(), "lib"));
				content = content.replace(/from\s+['"]@\/lib\/([^'"]+)['"]/g, (match, importPath) => {
					const parts = importPath.split("/");
					const currentDir = path.dirname(file);
					const targetPath = path.join(process.cwd(), "lib", importPath);
					let relPath = path.relative(currentDir, targetPath);

					// Ensure relative path starts with ./
					if (!relPath.startsWith(".")) {
						relPath = "./" + relPath;
					}

					// Remove .ts extension if present
					relPath = relPath.replace(/\.ts$/, "");

					return `from '${relPath}'`;
				});
				updated = true;
			}

			// Fix imports from components when inside components directory
			if (file.includes("/components/") && content.includes("from '@/components/")) {
				content = content.replace(
					/from\s+['"]@\/components\/([^'"]+)['"]/g,
					(match, importPath) => {
						const currentDir = path.dirname(file);
						const targetPath = path.join(process.cwd(), "components", importPath);
						let relPath = path.relative(currentDir, targetPath);

						if (!relPath.startsWith(".")) {
							relPath = "./" + relPath;
						}

						relPath = relPath.replace(/\.tsx?$/, "");

						return `from '${relPath}'`;
					}
				);
				updated = true;
			}

			// Fix imports from hooks when inside hooks directory
			if (file.includes("/hooks/") && content.includes("from '@/hooks/")) {
				content = content.replace(/from\s+['"]@\/hooks\/([^'"]+)['"]/g, (match, importPath) => {
					const currentDir = path.dirname(file);
					const targetPath = path.join(process.cwd(), "hooks", importPath);
					let relPath = path.relative(currentDir, targetPath);

					if (!relPath.startsWith(".")) {
						relPath = "./" + relPath;
					}

					relPath = relPath.replace(/\.ts$/, "");

					return `from '${relPath}'`;
				});
				updated = true;
			}

			// Fix imports from app when inside app directory
			if (file.includes("/app/") && content.includes("from '@/app/")) {
				content = content.replace(/from\s+['"]@\/app\/([^'"]+)['"]/g, (match, importPath) => {
					const currentDir = path.dirname(file);
					const targetPath = path.join(process.cwd(), "app", importPath);
					let relPath = path.relative(currentDir, targetPath);

					if (!relPath.startsWith(".")) {
						relPath = "./" + relPath;
					}

					relPath = relPath.replace(/\.tsx?$/, "");

					return `from '${relPath}'`;
				});
				updated = true;
			}

			if (updated) {
				await writeFile(file, content, "utf-8");
				fixedCount++;
				console.log(`✅ Fixed imports in: ${path.relative(process.cwd(), file)}`);
			}
		} catch (error) {
			console.error(`❌ Error processing ${file}:`, error);
		}
	}

	console.log(`📦 Fixed imports in ${fixedCount} files`);
}

async function fixMockIssues() {
	console.log("\n🎭 Fixing mock issues...");

	const testFiles = await glob("**/*.test.{ts,tsx,js,jsx}", {
		ignore: ["node_modules/**", ".next/**", "dist/**", "coverage/**"],
		absolute: true,
	});

	let fixedCount = 0;

	for (const file of testFiles) {
		try {
			let content = await readFile(file, "utf-8");
			let updated = false;

			// Add vi import if using mocks but not imported
			if (
				content.includes("vi.fn(") &&
				!content.includes("import { vi }") &&
				!content.includes("{ vi,")
			) {
				content = content.replace(
					/import\s*{\s*([^}]+)\s*}\s*from\s*['"]vitest['"]/,
					(match, imports) => {
						const importList = imports.split(",").map((i) => i.trim());
						if (!importList.includes("vi")) {
							importList.push("vi");
						}
						return `import { ${importList.join(", ")} } from 'vitest'`;
					}
				);
				updated = true;
			}

			// Fix React component mocks
			if (
				content.includes("React.createElement") &&
				!content.includes("import React from 'react'") &&
				!content.includes("import * as React")
			) {
				const importMatch = content.match(/import\s*{[^}]+}\s*from\s*['"]react['"]/);
				if (importMatch) {
					content = content.replace(
						importMatch[0],
						"import React, " + importMatch[0].replace("import", "")
					);
				} else if (!content.includes("from 'react'") && !content.includes('from "react"')) {
					// Add React import at the top after vitest imports
					content = content.replace(
						/(import\s*{[^}]+}\s*from\s*['"]vitest['"])/,
						"$1\nimport React from 'react'"
					);
				}
				updated = true;
			}

			if (updated) {
				await writeFile(file, content, "utf-8");
				fixedCount++;
				console.log(`✅ Fixed mocks in: ${path.relative(process.cwd(), file)}`);
			}
		} catch (error) {
			console.error(`❌ Error processing ${file}:`, error);
		}
	}

	console.log(`🎭 Fixed mocks in ${fixedCount} files`);
}

async function fixTestTimeouts() {
	console.log("\n⏱️ Fixing test timeouts...");

	// Update vitest configs to increase timeouts for integration tests
	const configFiles = [
		"vitest.config.ts",
		"vitest.integration.config.ts",
		"vitest.browser.config.ts",
	];

	for (const configFile of configFiles) {
		try {
			const filePath = path.join(process.cwd(), configFile);
			let content = await readFile(filePath, "utf-8");

			// Increase test timeout for integration tests
			if (configFile.includes("integration")) {
				content = content.replace(/testTimeout:\s*\d+_?\d*/g, "testTimeout: 60_000");
				content = content.replace(/hookTimeout:\s*\d+_?\d*/g, "hookTimeout: 30_000");
			}

			await writeFile(filePath, content, "utf-8");
			console.log(`✅ Updated timeouts in: ${configFile}`);
		} catch (error) {
			console.error(`❌ Error updating ${configFile}:`, error);
		}
	}
}

// Run the script
fixAllTestIssues().catch(console.error);
