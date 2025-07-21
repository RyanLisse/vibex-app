import { promises as fs } from "fs";
import { glob } from "glob";
import path from "path";

async function fixBrokenImports() {
	console.log(
		"Searching for TypeScript/JavaScript files with broken imports...",
	);

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

			// Pattern 1: Fix lines starting with } from "..." that should be end of import
			// but have content after them without proper import statement
			newContent = newContent.replace(
				/^}\s*from\s*["'][^"']+["'];\s*\n\s*([A-Z][a-zA-Z0-9_]*,)/gm,
				(match, nextLine) => {
					modified = true;
					return match.replace(/;\s*$/, ";\n" + nextLine);
				},
			);

			// Pattern 2: Fix orphaned import items (lines starting with identifiers and commas)
			// that should be part of an import statement
			newContent = newContent.replace(
				/^([A-Z][a-zA-Z0-9_]*(?:,\s*[A-Z][a-zA-Z0-9_]*)*,?)\s*\n\s*}\s*from\s*["'][^"']+["'];/gm,
				(match, imports) => {
					modified = true;
					return `\n\t${imports}\n} from ${match.substring(match.indexOf("} from") + 7)}`;
				},
			);

			// Pattern 3: Fix lines starting with ,-> or other weird syntax
			newContent = newContent.replace(
				/^[,\->\s]+([A-Z][a-zA-Z0-9_]*)/gm,
				(match, identifier) => {
					modified = true;
					return `${identifier}`;
				},
			);

			// Pattern 4: Fix incomplete type imports
			newContent = newContent.replace(
				/^(\s*type\s+[A-Z][a-zA-Z0-9_]*,?)\s*\n\s*}\s*from\s*["'][^"']+["'];/gm,
				(match, typeImport) => {
					modified = true;
					return `\n${typeImport}\n} from ${match.substring(match.indexOf("} from") + 7)}`;
				},
			);

			// Pattern 5: Fix trailing commas in imports followed by } from
			newContent = newContent.replace(/,\s*\n\s*}\s*from/gm, "\n} from");

			if (modified && newContent !== content) {
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

	console.log(`\n✨ Fixed ${fixedCount} files with broken imports`);
}

// Run the fix
fixBrokenImports().catch(console.error);
