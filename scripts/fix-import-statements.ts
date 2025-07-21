#!/usr/bin/env bun
import { readdir, readFile, writeFile } from "fs/promises";
join } from "path";

/**
 * Fix broken import statements where the import keyword is missing
 */

async function fixBrokenImports(content: string): Promise<string> {
	// Fix patterns like "} from" that should be "... } from"
	const lines = content.split("\n");
	const result: string[] = [];

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		const trimmedLine = line.trim();

		// Check if line starts with closing brace and contains "from"
		if (trimmedLine.match(/^[\s\t]*\}[\s\t]+from[\s\t]+['"]/)) {
			// Look backwards to find the opening of this import
			let j = i - 1;
			let foundImport = false;

			while (j >= 0) {
				const prevLine = lines[j].trim();
				if (prevLine.includes("import")) {
					foundImport = true;
					break;
				}
				if (prevLine === "" || prevLine.match(/^\/\//)) {
					// Empty line or comment, continue searching
					j--;
					continue;
				}
				if (prevLine.match(/[\{\};\(\)]/) && !prevLine.includes(",")) {
					// Found a statement boundary without import
					break;
				}
				j--;
			}

			if (!foundImport) {
				// Need to add import keyword
				// Find the indentation
				const indentMatch = line.match(/^[\s\t]*/);
				const indent = indentMatch ? indentMatch[0] : "";

				// Look for the start of this import block
				let importStart = i;
				for (let k = i - 1; k >= 0; k--) {
					const checkLine = lines[k];
					if (checkLine.trim() === "" || checkLine.includes("//")) {
						continue;
					}
					if (checkLine.includes(",") || checkLine.match(/^[\s\t]*[A-Za-z]/)) {
						importStart = k;
					} else {
						break;
					}
				}

				// Add import to the first line of the import block
				if (importStart < i) {
					lines[importStart] = "import " + lines[importStart].trimStart();
				}
			}
		}

		result.push(line);
	}

	return result.join("\n");
}

async function processFile(filePath: string): Promise<void> {
	try {
		let content = await readFile(filePath, "utf-8");
		const originalContent = content;

		// Apply fixes
		content = await fixBrokenImports(content);

		// Only write if content changed
		if (content !== originalContent) {
			await writeFile(filePath, content);
			console.log(`✅ Fixed: ${filePath}`);
		}
	} catch (error) {
		console.error(`❌ Error processing ${filePath}:`, error);
	}
}

async function findFiles(dir: string, extensions: string[]): Promise<string[]> {
	const files: string[] = [];

	async function walk(currentDir: string) {
		const entries = await readdir(currentDir, { withFileTypes: true });

		for (const entry of entries) {
			const fullPath = join(currentDir, entry.name);

			if (entry.isDirectory()) {
				// Skip node_modules and other build directories
				if (
					!["node_modules", ".next", "coverage", "dist", ".git"].includes(
						entry.name,
					)
				) {
					await walk(fullPath);
				}
			} else if (entry.isFile()) {
				if (extensions.some((ext) => entry.name.endsWith(ext))) {
					files.push(fullPath);
				}
			}
		}
	}

	await walk(dir);
	return files;
}

async function main() {
	console.log("🔧 Fixing broken import statements...");

	const projectRoot = process.cwd();
	const files = await findFiles(projectRoot, [".ts", ".tsx"]);

	console.log(`Found ${files.length} TypeScript files to process`);

	// Process files in parallel batches
	const batchSize = 10;
	for (let i = 0; i < files.length; i += batchSize) {
		const batch = files.slice(i, i + batchSize);
		await Promise.all(batch.map(processFile));
	}

	console.log("✨ Done!");
}

main().catch(console.error);
