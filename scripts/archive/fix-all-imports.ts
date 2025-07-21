#!/usr/bin/env bun

import fs from "fs/promises";
import { glob } from "glob";
import path from "path";

async function fixImports() {
	console.log("🔧 Fixing all broken imports...");

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

		// Fix missing "import {" at the beginning of import statements
		// Pattern 1: Lines that start with a capital letter or lowercase followed by } from
		newContent = newContent.replace(
			/^([A-Za-z][a-zA-Z0-9_]*(?:,\s*[A-Za-z][a-zA-Z0-9_]*)*)\s*}\s*from\s*["'][^"']+["'];?$/gm,
			(match, imports) => {
				modified = true;
				totalFixed++;
				return `import { ${imports} } from ${match.substring(match.indexOf("} from") + 7)}`;
			},
		);

		// Pattern 2: Lines that have standalone identifiers followed by a comma on next line with import
		newContent = newContent.replace(
			/^([A-Za-z][a-zA-Z0-9_]*),?\s*$/gm,
			(match, identifier, offset, str) => {
				// Look ahead to see if next line has "import {"
				const nextLineMatch = str
					.substring(offset + match.length)
					.match(/^\s*import\s*{\s*/);
				if (nextLineMatch) {
					// This is likely part of a broken multi-line import
					return match;
				}

				// Look for } from pattern within next few lines
				const lookAhead = str.substring(
					offset + match.length,
					offset + match.length + 200,
				);
				if (
					lookAhead.match(/^\s*(?:[A-Za-z][a-zA-Z0-9_]*(?:,\s*)?)*\s*}\s*from/m)
				) {
					modified = true;
					totalFixed++;
					return `import { ${identifier},`;
				}

				return match;
			},
		);

		// Pattern 3: Fix cases where we have type imports missing "import"
		newContent = newContent.replace(
			/^type\s+([A-Za-z][a-zA-Z0-9_]*(?:,\s*[A-Za-z][a-zA-Z0-9_]*)*)\s*}\s*from\s*["'][^"']+["'];?$/gm,
			(match, types) => {
				modified = true;
				totalFixed++;
				return `import { type ${types} } from ${match.substring(match.indexOf("} from") + 7)}`;
			},
		);

		// Pattern 4: Fix destructured imports missing "import {"
		newContent = newContent.replace(
			/^([A-Za-z][a-zA-Z0-9_]*(?:\s+as\s+[A-Za-z][a-zA-Z0-9_]*)?(?:,\s*[A-Za-z][a-zA-Z0-9_]*(?:\s+as\s+[A-Za-z][a-zA-Z0-9_]*)?)*)\s*}\s*from\s*["'][^"']+["'];?$/gm,
			(match, imports) => {
				// Skip if it already has import
				if (match.includes("import {")) return match;

				modified = true;
				totalFixed++;
				return `import { ${imports} } from ${match.substring(match.indexOf("} from") + 7)}`;
			},
		);

		if (modified) {
			await fs.writeFile(filePath, newContent, "utf-8");
			filesFixed++;
			console.log(`✅ Fixed imports in: ${file}`);
		}
	}

	console.log(`\n🎉 Fixed ${totalFixed} imports across ${filesFixed} files!`);
}

// Run the fix
fixImports().catch(console.error);
