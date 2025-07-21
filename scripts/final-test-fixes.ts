#!/usr/bin/env bun

import { readFile, writeFile } from "fs/promises";
import { glob } from "glob";
import path from "path";

async function finalTestFixes() {
	console.log("🔧 Final comprehensive test fixes...");

	const testFiles = await glob("**/*.test.{ts,tsx,js,jsx}", {
		ignore: ["node_modules/**", ".next/**", "dist/**", "coverage/**"],
		absolute: true,
	});

	let fixedCount = 0;
	const errors: string[] = [];

	for (const file of testFiles) {
		try {
			let content = await readFile(file, "utf-8");
			let updated = false;

			// Fix all @/ imports in test files to use relative paths
			const fileDir = path.dirname(file);
			const rootDir = process.cwd();

			// Replace @/components imports
			content = content.replace(
				/from\s+['"]@\/components\/([^'"]+)['"]/g,
				(match, importPath) => {
					const targetPath = path.join(rootDir, "components", importPath);
					let relPath = path.relative(fileDir, targetPath);
					if (!relPath.startsWith(".")) {
						relPath = "./" + relPath;
					}
					relPath = relPath.replace(/\.(tsx?|jsx?)$/, "");
					return `from '${relPath}'`;
				},
			);

			// Replace @/lib imports
			content = content.replace(
				/from\s+['"]@\/lib\/([^'"]+)['"]/g,
				(match, importPath) => {
					const targetPath = path.join(rootDir, "lib", importPath);
					let relPath = path.relative(fileDir, targetPath);
					if (!relPath.startsWith(".")) {
						relPath = "./" + relPath;
					}
					relPath = relPath.replace(/\.(tsx?|jsx?)$/, "");
					return `from '${relPath}'`;
				},
			);

			// Replace @/hooks imports
			content = content.replace(
				/from\s+['"]@\/hooks\/([^'"]+)['"]/g,
				(match, importPath) => {
					const targetPath = path.join(rootDir, "hooks", importPath);
					let relPath = path.relative(fileDir, targetPath);
					if (!relPath.startsWith(".")) {
						relPath = "./" + relPath;
					}
					relPath = relPath.replace(/\.(tsx?|jsx?)$/, "");
					return `from '${relPath}'`;
				},
			);

			// Replace @/app imports
			content = content.replace(
				/from\s+['"]@\/app\/([^'"]+)['"]/g,
				(match, importPath) => {
					const targetPath = path.join(rootDir, "app", importPath);
					let relPath = path.relative(fileDir, targetPath);
					if (!relPath.startsWith(".")) {
						relPath = "./" + relPath;
					}
					relPath = relPath.replace(/\.(tsx?|jsx?)$/, "");
					return `from '${relPath}'`;
				},
			);

			// Replace @/src imports
			content = content.replace(
				/from\s+['"]@\/src\/([^'"]+)['"]/g,
				(match, importPath) => {
					const targetPath = path.join(rootDir, "src", importPath);
					let relPath = path.relative(fileDir, targetPath);
					if (!relPath.startsWith(".")) {
						relPath = "./" + relPath;
					}
					relPath = relPath.replace(/\.(tsx?|jsx?)$/, "");
					return `from '${relPath}'`;
				},
			);

			// Replace @/stores imports
			content = content.replace(
				/from\s+['"]@\/stores\/([^'"]+)['"]/g,
				(match, importPath) => {
					const targetPath = path.join(rootDir, "stores", importPath);
					let relPath = path.relative(fileDir, targetPath);
					if (!relPath.startsWith(".")) {
						relPath = "./" + relPath;
					}
					relPath = relPath.replace(/\.(tsx?|jsx?)$/, "");
					return `from '${relPath}'`;
				},
			);

			// Replace @/db imports
			content = content.replace(
				/from\s+['"]@\/db\/([^'"]+)['"]/g,
				(match, importPath) => {
					const targetPath = path.join(rootDir, "db", importPath);
					let relPath = path.relative(fileDir, targetPath);
					if (!relPath.startsWith(".")) {
						relPath = "./" + relPath;
					}
					relPath = relPath.replace(/\.(tsx?|jsx?)$/, "");
					return `from '${relPath}'`;
				},
			);

			// Replace @/test and @/tests imports
			content = content.replace(
				/from\s+['"]@\/(test|tests|fixtures|mocks)\/([^'"]+)['"]/g,
				(match, folder, importPath) => {
					const targetPath = path.join(
						rootDir,
						"tests",
						folder === "test" ? "" : folder,
						importPath,
					);
					let relPath = path.relative(fileDir, targetPath);
					if (!relPath.startsWith(".")) {
						relPath = "./" + relPath;
					}
					relPath = relPath.replace(/\.(tsx?|jsx?)$/, "");
					return `from '${relPath}'`;
				},
			);

			// Replace @/features imports
			content = content.replace(
				/from\s+['"]@\/features\/([^'"]+)['"]/g,
				(match, importPath) => {
					const targetPath = path.join(rootDir, "src/features", importPath);
					let relPath = path.relative(fileDir, targetPath);
					if (!relPath.startsWith(".")) {
						relPath = "./" + relPath;
					}
					relPath = relPath.replace(/\.(tsx?|jsx?)$/, "");
					return `from '${relPath}'`;
				},
			);

			// Replace @/shared imports
			content = content.replace(
				/from\s+['"]@\/shared\/([^'"]+)['"]/g,
				(match, importPath) => {
					const targetPath = path.join(rootDir, "src/shared", importPath);
					let relPath = path.relative(fileDir, targetPath);
					if (!relPath.startsWith(".")) {
						relPath = "./" + relPath;
					}
					relPath = relPath.replace(/\.(tsx?|jsx?)$/, "");
					return `from '${relPath}'`;
				},
			);

			// Fix any remaining @ imports (root imports)
			content = content.replace(
				/from\s+['"]@\/([^'"]+)['"]/g,
				(match, importPath) => {
					const targetPath = path.join(rootDir, importPath);
					let relPath = path.relative(fileDir, targetPath);
					if (!relPath.startsWith(".")) {
						relPath = "./" + relPath;
					}
					relPath = relPath.replace(/\.(tsx?|jsx?)$/, "");
					return `from '${relPath}'`;
				},
			);

			// Check if content was changed
			if (content !== (await readFile(file, "utf-8"))) {
				await writeFile(file, content, "utf-8");
				fixedCount++;
				console.log(`✅ Fixed: ${path.relative(rootDir, file)}`);
			}
		} catch (error) {
			const errorMsg = `❌ Error processing ${path.relative(process.cwd(), file)}: ${error}`;
			console.error(errorMsg);
			errors.push(errorMsg);
		}
	}

	console.log(`\n✨ Fixed ${fixedCount} files`);

	if (errors.length > 0) {
		console.log(`\n⚠️  ${errors.length} files had errors`);
	}
}

// Run the script
finalTestFixes().catch(console.error);
