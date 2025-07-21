#!/usr/bin/env bun

import fs from "fs/promises";
import { glob } from "glob";
import path from "path";

async function fixSpecificImports() {
	console.log("🔧 Fixing specific import patterns...");

	// Specific files that need fixing
	const specificFiles = [
		"app/environments/_components/environments-list.tsx",
		"app/task/[id]/_components/shell-output.tsx",
		"app/voice-brainstorm/page.tsx",
		"components/navigation/navbar.tsx",
		"app/ai-audio/page.tsx",
		"app/ambient-agents/page.tsx",
		"app/api/agent-memory/[id]/route.ts",
	];

	let totalFixed = 0;

	for (const file of specificFiles) {
		const filePath = path.resolve(file);
		try {
			const content = await fs.readFile(filePath, "utf-8");
			let newContent = content;
			let modified = false;

			// Fix lines that have imports without "import {" at the beginning
			// Pattern for lines that start with identifiers and should be imports
			const lines = newContent.split("\n");
			const fixedLines = [];

			for (let i = 0; i < lines.length; i++) {
				const line = lines[i];
				const trimmed = line.trim();

				// Check if line looks like an incomplete import
				if (
					trimmed &&
					!trimmed.startsWith("import") &&
					!trimmed.startsWith("//") &&
					!trimmed.startsWith("*")
				) {
					// Check if it ends with a comma or starts with a capital letter
					if (
						trimmed.match(/^[A-Z][a-zA-Z0-9_]*,?$/) ||
						trimmed.match(/^[a-z][a-zA-Z0-9_]*\s*}\s*from/) ||
						(trimmed.match(/^type\s+[A-Z][a-zA-Z0-9_]*/) &&
							!trimmed.includes("interface") &&
							!trimmed.includes("="))
					) {
						// Look ahead to see if there's a } from pattern
						let foundImportPattern = false;
						for (let j = i; j < Math.min(i + 5, lines.length); j++) {
							if (lines[j].includes("} from")) {
								foundImportPattern = true;
								break;
							}
						}

						if (foundImportPattern) {
							modified = true;
							totalFixed++;
							fixedLines.push(line.replace(trimmed, `import { ${trimmed}`));
							continue;
						}
					}
				}

				fixedLines.push(line);
			}

			if (modified) {
				newContent = fixedLines.join("\n");
				await fs.writeFile(filePath, newContent, "utf-8");
				console.log(`✅ Fixed imports in: ${file}`);
			}
		} catch (error) {
			console.error(`❌ Error processing ${file}:`, error);
		}
	}

	console.log(`\n🎉 Fixed ${totalFixed} import issues!`);
}

// Run the fix
fixSpecificImports().catch(console.error);
