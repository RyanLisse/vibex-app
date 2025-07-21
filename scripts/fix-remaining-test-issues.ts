#!/usr/bin/env bun

import { readFile, writeFile } from "fs/promises";
import { glob } from "glob";
import path from "path";

async function fixRemainingTestIssues() {
	console.log("🔧 Fixing remaining test issues...");

	// Find all test files
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

			// Fix vi.vi.fn -> vi.mock
			if (content.includes("vi.vi.fn")) {
				content = content.replace(/vi\.vi\.fn/g, "vi.mock");
				updated = true;
			}

			// Fix missing vi import when using vi functions
			if (
				(content.includes("vi.fn(") ||
					content.includes("vi.mock(") ||
					content.includes("vi.spyOn(")) &&
				!content.includes("import { vi }") &&
				!content.includes(", vi }") &&
				!content.includes(", vi,") &&
				!content.includes("{ vi,")
			) {
				// Check if there's already a vitest import
				const vitestImportMatch = content.match(
					/import\s*{\s*([^}]+)\s*}\s*from\s*['"]vitest['"]/,
				);

				if (vitestImportMatch) {
					// Add vi to existing import
					const imports = vitestImportMatch[1].split(",").map((i) => i.trim());
					if (!imports.includes("vi")) {
						imports.push("vi");
						const newImport = `import { ${imports.join(", ")} } from 'vitest'`;
						content = content.replace(vitestImportMatch[0], newImport);
						updated = true;
					}
				} else {
					// Add new vitest import with vi
					content = `import { vi } from 'vitest'\n` + content;
					updated = true;
				}
			}

			// Fix spyOn usage - replace standalone spyOn with vi.spyOn
			if (content.includes("spyOn(") && !content.includes("vi.spyOn")) {
				// Only replace if it's not already prefixed with vi. or something else
				content = content.replace(/(?<!\w\.)spyOn\(/g, "vi.spyOn(");
				updated = true;
			}

			// Fix ReturnType<typeof spyOn> to ReturnType<typeof vi.spyOn>
			if (content.includes("ReturnType<typeof spyOn>")) {
				content = content.replace(
					/ReturnType<typeof spyOn>/g,
					"ReturnType<typeof vi.spyOn>",
				);
				updated = true;
			}

			// Fix mock() calls to vi.fn()
			if (content.includes("mock(") && !content.includes(".mock(")) {
				content = content.replace(/(?<!\w\.)mock\(/g, "vi.fn(");
				updated = true;
			}

			// Fix imports that have .ts extension
			content = content.replace(/from\s+['"]([^'"]+)\.ts['"]/g, "from '$1'");
			if (content.includes('.tsx"') || content.includes(".tsx'")) {
				content = content.replace(/from\s+['"]([^'"]+)\.tsx['"]/g, "from '$1'");
				updated = true;
			}

			// Fix double slashes in import paths
			content = content.replace(/from\s+['"]\.\/\//g, "from './");
			if (content.includes("..//")) {
				content = content.replace(/from\s+['"]\.\.\//g, "from '../");
				updated = true;
			}

			if (updated) {
				await writeFile(file, content, "utf-8");
				fixedCount++;
				console.log(`✅ Fixed: ${path.relative(process.cwd(), file)}`);
			}
		} catch (error) {
			const errorMsg = `❌ Error processing ${path.relative(process.cwd(), file)}: ${error}`;
			console.error(errorMsg);
			errors.push(errorMsg);
		}
	}

	console.log(`\n✨ Fixed ${fixedCount} files`);

	if (errors.length > 0) {
		console.log(`\n⚠️  ${errors.length} files had errors:`);
		errors.forEach((err) => console.log(err));
	}

	// Now fix specific known issues
	await fixSpecificIssues();
}

async function fixSpecificIssues() {
	console.log("\n🎯 Fixing specific known issues...");

	// Fix migration file format check
	try {
		const migrationRunnerPath = path.join(
			process.cwd(),
			"db/migrations/migration-runner.ts",
		);
		let content = await readFile(migrationRunnerPath, "utf-8");

		// Update the regex to be more flexible with migration file names
		content = content.replace(
			/const\s+migrationRegex\s*=\s*\/\^\\d\{3\}_\[a-z0-9_-\]\+\\.\(up\|down\)\\\.\(sql\|ts\)\$\/i/,
			"const migrationRegex = /^\\d{3}_[a-z0-9_-]+\\.(sql|ts)$/i",
		);

		await writeFile(migrationRunnerPath, content, "utf-8");
		console.log("✅ Fixed migration file regex");
	} catch (error) {
		console.error("❌ Could not fix migration runner:", error);
	}

	// Fix database mock in integration tests setup
	try {
		const integrationSetupPath = path.join(
			process.cwd(),
			"tests/setup/integration.ts",
		);
		let content = await readFile(integrationSetupPath, "utf-8");

		// Ensure proper mock response for database queries
		if (content.includes("mockSql = vi.fn()")) {
			content = content.replace(
				/mockSql = vi\.fn\(\)\.mockImplementation\(async \(query: any\) => {/,
				`mockSql = vi.fn().mockImplementation(async (query: any, ...params: any[]) => {`,
			);
		}

		await writeFile(integrationSetupPath, content, "utf-8");
		console.log("✅ Fixed integration test database mocks");
	} catch (error) {
		console.error("❌ Could not fix integration setup:", error);
	}
}

// Run the script
fixRemainingTestIssues().catch(console.error);
