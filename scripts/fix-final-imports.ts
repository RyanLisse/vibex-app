#!/usr/bin/env bun

import { glob } from "glob";
import fs from "fs/promises";
import path from "path";

async function fixRemainingImports() {
	console.log("🔧 Fixing all remaining import issues comprehensively...");

	// Find all TypeScript/JavaScript files
	const files = await glob("**/*.{ts,tsx,js,jsx}", {
		ignore: [
			"node_modules/**",
			".next/**",
			"dist/**",
			"build/**",
			".git/**",
			"scripts/fix-*.ts",
		],
	});

	let totalFixed = 0;
	let filesFixed = 0;

	for (const file of files) {
		const filePath = path.resolve(file);
		const content = await fs.readFile(filePath, "utf-8");
		let newContent = content;
		let modified = false;

		// Fix lines that look like incomplete imports
		const lines = newContent.split("\n");
		const fixedLines = [];
		let inImportBlock = false;
		let importBuffer = [];

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];
			const trimmed = line.trim();
			const nextLine = i + 1 < lines.length ? lines[i + 1].trim() : "";

			// Check if we're starting an import block
			if (trimmed.match(/^import\s*{/) || trimmed.match(/^import\s+type\s*{/)) {
				inImportBlock = true;
				importBuffer = [line];
				continue;
			}

			// If we're in an import block, collect lines until we find the closing
			if (inImportBlock) {
				importBuffer.push(line);
				if (line.includes("} from")) {
					inImportBlock = false;
					fixedLines.push(...importBuffer);
					importBuffer = [];
				}
				continue;
			}

			// Fix standalone identifiers that should be imports
			if (
				trimmed &&
				!trimmed.startsWith("//") &&
				!trimmed.startsWith("*") &&
				!trimmed.startsWith("import")
			) {
				// Pattern 1: Single identifier followed by comma
				if (trimmed.match(/^[A-Za-z][a-zA-Z0-9_]*,?$/)) {
					// Look ahead for import pattern
					let foundImportPattern = false;
					let distance = 0;
					for (let j = i + 1; j < Math.min(i + 10, lines.length); j++) {
						if (lines[j].includes("} from") || lines[j].includes("import {")) {
							foundImportPattern = true;
							distance = j - i;
							break;
						}
					}

					if (foundImportPattern && distance <= 5) {
						modified = true;
						totalFixed++;
						fixedLines.push(line.replace(trimmed, `import { ${trimmed}`));
						continue;
					}
				}

				// Pattern 2: Line ending with } from pattern
				if (trimmed.match(/}\s*from\s*["']/)) {
					// This line needs "import {" at the beginning
					const match = trimmed.match(/^([^}]+)}\s*from/);
					if (match && !trimmed.startsWith("import")) {
						modified = true;
						totalFixed++;
						fixedLines.push(line.replace(trimmed, `import { ${trimmed}`));
						continue;
					}
				}

				// Pattern 3: Type imports missing import keyword
				if (trimmed.match(/^type\s+[A-Za-z]/) && nextLine.includes("} from")) {
					modified = true;
					totalFixed++;
					fixedLines.push(line.replace(trimmed, `import { ${trimmed}`));
					continue;
				}
			}

			fixedLines.push(line);
		}

		// Additional fix for specific patterns
		newContent = fixedLines.join("\n");

		// Fix broken Button components
		newContent = newContent.replace(
			/(<Button[^>]*variant="outline"\s*)(\n\s*)(>?\s*)(\n\s*)([A-Z][a-zA-Z]*)\s*$/gm,
			"$1$3>$5",
		);

		// Fix other broken JSX elements
		newContent = newContent.replace(
			/(<Button[^>]*)\n\s*([A-Z][a-zA-Z]*)\s*(<\/Button>)/gm,
			"$1>$2$3",
		);

		if (newContent !== content) {
			modified = true;
			await fs.writeFile(filePath, newContent, "utf-8");
			filesFixed++;
			console.log(`✅ Fixed imports in: ${file}`);
		}
	}

	console.log(`\n🎉 Fixed ${totalFixed} imports across ${filesFixed} files!`);
}

// Run the fix
fixRemainingImports().catch(console.error);
