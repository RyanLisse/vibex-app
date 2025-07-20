#!/usr/bin/env bun

import { existsSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";

const files = [
	"lib/logging/health-monitor.ts",
	"lib/logging/index.ts",
	"lib/logging/logger-factory.test.ts",
	"lib/logging/middleware.ts",
	"lib/logging/specialized-loggers.ts",
];

let totalFixes = 0;

for (const file of files) {
	const filePath = join(process.cwd(), file);
	if (existsSync(filePath)) {
		let content = readFileSync(filePath, "utf-8");
		let fixCount = 0;

		// First, restore the import if it was removed
		if (
			!(
				content.includes("import { createDefaultLoggingConfig") ||
				content.includes("import { ComponentLogger")
			)
		) {
			// Find the import from './config' and add createDefaultLoggingConfig
			content = content.replace(
				/import\s*{\s*([^}]+)\s*}\s*from\s*['"]\.\/config['"]/g,
				(match, imports) => {
					const importList = imports
						.split(",")
						.map((i) => i.trim())
						.filter(Boolean);
					if (!importList.includes("createDefaultLoggingConfig")) {
						importList.unshift("createDefaultLoggingConfig");
					}
					return `import { ${importList.join(", ")} } from './config'`;
				},
			);

			// If no import from config exists, add it
			if (!content.includes("from './config'")) {
				const firstImportMatch = content.match(/^import/m);
				if (firstImportMatch) {
					const insertPos = content.indexOf(firstImportMatch[0]);
					content =
						content.slice(0, insertPos) +
						"import { createDefaultLoggingConfig } from './config'\n" +
						content.slice(insertPos);
				}
			}
		}

		// Replace the inline object with function call
		content = content.replace(
			/{\s*level:\s*"info",\s*format:\s*"json"\s*}/g,
			() => {
				fixCount++;
				return "createDefaultLoggingConfig()";
			},
		);

		if (fixCount > 0) {
			writeFileSync(filePath, content);
			console.log(`✅ Fixed ${fixCount} occurrences in ${file}`);
			totalFixes += fixCount;
		}
	}
}

console.log(`\n✨ Total fixes applied: ${totalFixes}`);
