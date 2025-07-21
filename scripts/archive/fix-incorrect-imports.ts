#!/usr/bin/env bun

import { promises as fs } from "fs";
import { glob } from "glob";
import path from "path";

async function fixIncorrectImports() {
	console.log("Fixing incorrect import statements...");

	const files = await glob("**/*.{ts,tsx,js,jsx}", {
		ignore: ["node_modules/**", ".next/**", "dist/**", "build/**"],
		absolute: true,
		cwd: process.cwd(),
	});

	let fixedCount = 0;

	for (const file of files) {
		try {
			const content = await fs.readFile(file, "utf-8");
			let modified = false;
			let newContent = content;

			// Pattern 1: Fix "" appearing in JSX text content
			newContent = newContent.replace(/>\s*import\s*{\s*([^<]+)</gm, ">$1<");

			// Pattern 2: Fix duplicate "" statements
			newContent = newContent.replace(/import\s*{\s*import\s*{/gm, "");

			// Pattern 3: Fix "" in the middle of string literals
			newContent = newContent.replace(
				/"([^"]*?)import\s*{\s*([^"]*?)"/gm,
				'"$1$2"',
			);
			newContent = newContent.replace(
				/'([^']*?)import\s*{\s*([^']*?)'/gm,
				"'$1$2'",
			);

			// Pattern 4: Fix imports with "No newline at end of file" message
			newContent = newContent.replace(
				/}\s*from\s*["'][^"']+["'];\s*\n\s*No newline at end of file\s*\n/gm,
				"} from $&\n",
			);

			// Pattern 5: Clean up "No newline at end of file" messages
			newContent = newContent.replace(
				/\n\s*No newline at end of file\s*\n/gm,
				"\n",
			);

			// Pattern 6: Fix broken type imports
			newContent = newContent.replace(
				/^export type {\s*import\s*{/gm,
				"export type {",
			);

			// Pattern 7: Fix multiple "" on the same line
			newContent = newContent.replace(/import\s*{\s*(import\s*{\s*)+/gm, "");

			if (newContent !== content) {
				modified = true;
				await fs.writeFile(file, newContent, "utf-8");
				console.log(
					`✅ Fixed imports in: ${path.relative(process.cwd(), file)}`,
				);
				fixedCount++;
			}
		} catch (error) {
			console.error(`❌ Error processing ${file}:`, error);
		}
	}

	console.log(`\n✨ Fixed ${fixedCount} files`);
}

// Run the fix
fixIncorrectImports().catch(console.error);
