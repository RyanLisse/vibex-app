#!/usr/bin/env bun

import fs from "fs/promises";
import { glob } from "glob";
import path from "path";

async function fixApiImports() {
	console.log("🔧 Fixing API route import errors...");

	// Find all API route files
	const files = await glob("app/api/**/*.{ts,tsx}", {
		ignore: ["node_modules/**", ".next/**"],
	});

	let filesFixed = 0;

	for (const file of files) {
		const filePath = path.resolve(file);
		const content = await fs.readFile(filePath, "utf-8");
		let newContent = content;
		let modified = false;

		// Fix pattern where we have missing "import {" before createApiErrorResponse
		newContent = newContent.replace(
			/^(\s*)createApiErrorResponse,\s*$/gm,
			"$1import { createApiErrorResponse,"
		);
		newContent = newContent.replace(
			/^(\s*)createApiSuccessResponse,?\s*$/gm,
			"$1createApiSuccessResponse,"
		);

		// Fix cases where import statement is split incorrectly
		newContent = newContent.replace(
			/;\s*\n\s*(createApiErrorResponse|createApiSuccessResponse|validateApiRequest),/gm,
			";\nimport { $1,"
		);

		// Fix standalone lines that should be part of import
		const lines = newContent.split("\n");
		const fixedLines = [];

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];
			const trimmed = line.trim();

			// Check if this line looks like it should be part of an import
			if (trimmed.match(/^(createApi|validateApi)/)) {
				// Look back to see if previous line ends with semicolon
				if (i > 0 && lines[i - 1].trim().endsWith(";")) {
					fixedLines.push(line.replace(trimmed, `import { ${trimmed}`));
					modified = true;
					continue;
				}
			}

			fixedLines.push(line);
		}

		if (newContent !== content || fixedLines.join("\n") !== content) {
			modified = true;
			newContent = fixedLines.join("\n");
			await fs.writeFile(filePath, newContent, "utf-8");
			filesFixed++;
			console.log(`✅ Fixed imports in: ${file}`);
		}
	}

	console.log(`\n🎉 Fixed imports in ${filesFixed} API route files!`);
}

// Run the fix
fixApiImports().catch(console.error);
